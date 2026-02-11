const crypto = require('crypto');
const https = require('https');
const logger = require('../utils/logger');

/**
 * OCR 业务逻辑服务
 */
class OcrService {
    /**
     * 调用腾讯云通用印刷体识别API
     */
    static async callTencentOCR(imageBase64) {
        const secretId = process.env.TENCENT_SECRET_ID;
        const secretKey = process.env.TENCENT_SECRET_KEY;

        if (!secretId || !secretKey) {
            throw new Error('未配置腾讯云API密钥，请联系管理员');
        }

        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const host = 'ocr.tencentcloudapi.com';
        const service = 'ocr';
        const action = 'GeneralAccurateOCR';
        const version = '2018-11-19';
        const region = 'ap-guangzhou';
        const timestamp = Math.floor(Date.now() / 1000);
        const date = new Date(timestamp * 1000).toISOString().split('T')[0];

        const payload = JSON.stringify({ ImageBase64: base64Data });
        const hashedPayload = crypto.createHash('sha256').update(payload).digest('hex');
        const httpRequestMethod = 'POST';
        const canonicalUri = '/';
        const canonicalQueryString = '';
        const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`;
        const signedHeaders = 'content-type;host;x-tc-action';

        const canonicalRequest = [httpRequestMethod, canonicalUri, canonicalQueryString, canonicalHeaders, signedHeaders, hashedPayload].join('\n');
        const algorithm = 'TC3-HMAC-SHA256';
        const credentialScope = `${date}/${service}/tc3_request`;
        const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
        const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;

        const secretDate = crypto.createHmac('sha256', `TC3${secretKey}`).update(date).digest();
        const secretService = crypto.createHmac('sha256', secretDate).update(service).digest();
        const secretSigning = crypto.createHmac('sha256', secretService).update('tc3_request').digest();
        const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex');

        const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

        return new Promise((resolve, reject) => {
            const req = https.request({
                hostname: host,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Host': host,
                    'X-TC-Action': action,
                    'X-TC-Version': version,
                    'X-TC-Region': region,
                    'X-TC-Timestamp': timestamp.toString(),
                    'Authorization': authorization
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        if (result.Response && result.Response.Error) {
                            reject(new Error(`OCR识别失败: ${result.Response.Error.Message}`));
                        } else if (result.Response && result.Response.TextDetections) {
                            resolve(result.Response.TextDetections);
                        } else {
                            reject(new Error('OCR返回数据格式异常'));
                        }
                    } catch (e) {
                        reject(new Error('解析OCR响应失败'));
                    }
                });
            });

            req.on('error', (e) => reject(new Error(`网络请求失败: ${e.message}`)));
            req.write(payload);
            req.end();
        });
    }

    /**
     * 解析化验单指标
     */
    static parseIndicators(textDetections) {
        const allText = textDetections.map(item => item.DetectedText).join(' ');
        const result = {};

        // 日期提取
        const dateMatch = allText.match(/(?:日期|时间|采样|送检|报告|核收|发布)[^0-9]*([2][0][2][0-9][\.\-\/\年][0-1]?[0-9][\.\-\/\月][0-3]?[0-9][日]?)/);
        if (dateMatch) {
            let dateStr = dateMatch[1].replace(/[年月日\.]/g, '-');
            const parts = dateStr.split(/[-/]/);
            if (parts.length === 3) {
                result.recordDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            }
        }

        const k = (str) => str.split('').join('\\s*');
        const patterns = [
            { key: 'TSH', regex: new RegExp(`(?:TSH|${k('促甲状腺激素')}|${k('促甲状腺素')})[:：\\s]*([0-9]+\\.?[0-9]*)`, 'i') },
            { key: 'FT3', regex: new RegExp(`(?:FT3|${k('游离T3')}|${k('游离三碘')})[:：\\s]*([0-9]+\\.?[0-9]*)`, 'i') },
            { key: 'FT4', regex: new RegExp(`(?:FT4|${k('游离T4')}|${k('游离甲状腺素')})[:：\\s]*([0-9]+\\.?[0-9]*)`, 'i') },
            { key: 'T3', regex: new RegExp(`(?:(?<!游离|Free\\s*)${k('T3')}|${k('总T3')})[:：\\s]*([0-9]+\\.?[0-9]*)`, 'i') },
            { key: 'T4', regex: new RegExp(`(?:(?<!游离|Free\\s*)${k('T4')}|${k('总T4')})[:：\\s]*([0-9]+\\.?[0-9]*)`, 'i') },
            { key: 'TPOAb', regex: new RegExp(`(?:TPO-?Ab|${k('TPO抗体')}|${k('抗甲状腺过氧化物')})[:：\\s]*([0-9]+\\.?[0-9]*)`, 'i') },
            { key: 'TGAb', regex: new RegExp(`(?:TGAb|A-TG|${k('TG抗体')}|${k('抗甲状腺球蛋白')})[:：\\s]*([0-9]+\\.?[0-9]*)`, 'i') },
            { key: 'Tg', regex: new RegExp(`(?:(?<!抗|A-)${k('Tg')}|${k('甲状腺球蛋白')})(?!抗)[:：\\s]*([0-9]+\\.?[0-9]*)`, 'i') },
            { key: 'PTH', regex: new RegExp(`(?:PTH|${k('甲状旁腺激素')})[:：\\s]*([0-9]+\\.?[0-9]*)`, 'i') },
            { key: 'Calcium', regex: new RegExp(`(?:${k('血钙')}|Ca)[:：\\s]*([0-9]+\\.?[0-9]*)`, 'i') }
        ];

        for (const { key, regex } of patterns) {
            const match = allText.match(regex);
            if (match && match[1]) result[key] = match[1];
        }

        return { indicators: result, count: Object.keys(result).length, rawText: allText.substring(0, 500) };
    }

    /**
     * 解析B超报告
     */
    static parseUltrasound(textDetections) {
        let allText = textDetections.map(item => item.DetectedText).join(' ');
        allText = allText.replace(/（/g, '(').replace(/）/g, ')').replace(/：/g, ':').replace(/，/g, ',');

        const result = { ultrasoundNote: allText };

        const parseSize = (text) => {
            if (!text) return null;
            const match = text.match(/([0-9]+\.?[0-9]*)[\s]*[×*xX][\s]*([0-9]+\.?[0-9]*)[\s]*(?:[×*xX][\s]*([0-9]+\.?[0-9]*))?[\s]*(mm|cm|毫米|厘米)?/i);
            if (match) {
                let [_, l, w, h, unit] = match;
                const conv = (n) => (unit === 'cm' || unit === '厘米') ? parseFloat((n * 10).toFixed(1)) : parseFloat(n);
                return `${conv(l)}×${conv(w)}${h ? '×' + conv(h) : ''}mm`;
            }
            return null;
        };

        // 状态识别
        if (allText.match(/右[侧叶][^左]*?(?:已切除|未见显示|缺如)/)) result.thyroidRight = '已切除';
        if (allText.match(/左[侧叶][^右]*?(?:已切除|未见显示|缺如)/)) result.thyroidLeft = '已切除';

        // TI-RADS
        const tiradsMatch = allText.match(/[C-]?TI[-]?RADS\s*[:：\s]*([\dIVⅠⅡⅢⅣⅤ1-5]+[abc]?)/i);
        if (tiradsMatch) result.tiradsLevel = tiradsMatch[1].toUpperCase();

        // 结节数量
        if (allText.includes('多发') || allText.includes('多个')) result.noduleCount = '多发';

        return { indicators: result, count: Object.keys(result).length - 1, rawText: allText.substring(0, 500) };
    }
}

module.exports = OcrService;
