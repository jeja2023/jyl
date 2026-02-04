const crypto = require('crypto');
const https = require('https');
const Response = require('../utils/response');

/**
 * OCR控制器 - 用于化验单图片识别
 * 使用腾讯云通用印刷体识别API
 */
class OcrController {
    /**
     * 识别化验单/B超报告图片
     * POST /api/ocr/recognize
     * Body: { image: base64图片数据, type: 'lab'|'ultrasound' }
     */
    static async recognize(ctx) {
        const { image, type = 'lab' } = ctx.request.body;

        if (!image) {
            throw new Error('请上传报告图片');
        }

        // 调用腾讯云OCR
        const ocrResult = await OcrController.callTencentOCR(image);

        // 根据类型解析OCR结果
        let result;
        if (type === 'ultrasound') {
            result = OcrController.parseUltrasound(ocrResult);
        } else {
            result = OcrController.parseIndicators(ocrResult);
        }

        Response.success(ctx, result, '识别成功');
    }

    /**
     * 调用腾讯云通用印刷体识别API
     */
    static async callTencentOCR(imageBase64) {
        const secretId = process.env.TENCENT_SECRET_ID;
        const secretKey = process.env.TENCENT_SECRET_KEY;

        if (!secretId || !secretKey) {
            throw new Error('未配置腾讯云API密钥，请联系管理员');
        }

        // 移除base64前缀（如果有）
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const host = 'ocr.tencentcloudapi.com';
        const service = 'ocr';
        const action = 'GeneralAccurateOCR';  // 通用印刷体识别（高精度版）
        const version = '2018-11-19';
        const region = 'ap-guangzhou';
        const timestamp = Math.floor(Date.now() / 1000);
        const date = new Date(timestamp * 1000).toISOString().split('T')[0];

        // 请求体
        const payload = JSON.stringify({
            ImageBase64: base64Data
        });

        // 生成签名
        const hashedPayload = crypto.createHash('sha256').update(payload).digest('hex');
        const httpRequestMethod = 'POST';
        const canonicalUri = '/';
        const canonicalQueryString = '';
        const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`;
        const signedHeaders = 'content-type;host;x-tc-action';

        const canonicalRequest = [
            httpRequestMethod,
            canonicalUri,
            canonicalQueryString,
            canonicalHeaders,
            signedHeaders,
            hashedPayload
        ].join('\n');

        const algorithm = 'TC3-HMAC-SHA256';
        const credentialScope = `${date}/${service}/tc3_request`;
        const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
        const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;

        // 计算签名
        const secretDate = crypto.createHmac('sha256', `TC3${secretKey}`).update(date).digest();
        const secretService = crypto.createHmac('sha256', secretDate).update(service).digest();
        const secretSigning = crypto.createHmac('sha256', secretService).update('tc3_request').digest();
        const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex');

        const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

        // 发起请求
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
     * 从OCR结果中解析甲功指标
     * 支持的指标: TSH, FT3, FT4, T3, T4, TPOAb, TGAb, TRAb, Tg, 降钙素, 血钙, 血镁, 血磷, PTH
     */
    static parseIndicators(textDetections) {
        // 合并所有识别文本
        const allText = textDetections.map(item => item.DetectedText).join(' ');

        console.log('[OCR] 识别原文:', allText);

        const result = {};

        // 匹配日期 (202x-xx-xx)
        // 支持: 采样时间、报告日期、核收日期、送检日期00等
        const dateMatch = allText.match(/(?:日期|时间|采样|送检|报告|核收|发布)[^0-9]*([2][0][2][0-9][\.\-\/\年][0-1]?[0-9][\.\-\/\月][0-3]?[0-9][日]?)/);
        if (dateMatch) {
            let dateStr = dateMatch[1].replace(/[年月日\.]/g, '-');
            const parts = dateStr.split(/[-/]/);
            if (parts.length === 3) {
                const y = parts[0];
                const m = parts[1].padStart(2, '0');
                const d = parts[2].padStart(2, '0');
                result.recordDate = `${y}-${m}-${d}`;
            }
        }

        // 指标匹配规则：指标名 + 可选空格/符号 + 数值
        // Helper: 允许中文关键词中间出现空格
        const k = (str) => str.split('').join('\\s*');

        // 指标匹配规则：指标名 + 可选空格/符号 + 数值
        const patterns = [
            // TSH (促甲状腺激素)
            { key: 'TSH', regex: new RegExp(`(?:TSH|${k('促甲状腺激素')}|${k('促甲状腺素')})[:：\\s]*([0-9]+\\.?[0-9]*)`, 'i') },

            // FT3 (游离三碘甲状腺原氨酸)
            { key: 'FT3', regex: new RegExp(`(?:FT3|${k('游离T3')}|${k('游离三碘')}|${k('游离三碘甲状原氨')})[:：\\s]*([0-9]+\\.?[0-9]*)`, 'i') },

            // FT4 (游离甲状腺素)
            { key: 'FT4', regex: new RegExp(`(?:FT4|${k('游离T4')}|${k('游离甲状腺素')})[:：\\s]*([0-9]+\\.?[0-9]*)`, 'i') },

            // T3 (三碘甲状腺原氨酸) - 排除 "游离"
            { key: 'T3', regex: new RegExp(`(?:(?<!游离|Free\\s*)${k('T3')}|(?<!游离|Free\\s*)${k('三碘甲状腺原氨酸')}|${k('总T3')})[:：\\s]*([0-9]+\\.?[0-9]*)`, 'i') },

            // T4 (甲状腺素) - 排除 "游离"
            { key: 'T4', regex: new RegExp(`(?:(?<!游离|Free\\s*)${k('T4')}|(?<!游离|Free\\s*)${k('甲状腺素')}|${k('总T4')})[:：\\s]*([0-9]+\\.?[0-9]*)`, 'i') },

            // TPOAb (甲状腺过氧化物酶抗体) - 支持 TPO-Ab, 抗甲状腺过氧化物酶抗体
            { key: 'TPOAb', regex: new RegExp(`(?:TPO-?Ab|${k('TPO抗体')}|${k('抗甲状腺过氧化物')}|${k('甲状腺过氧化物')})[:：\\s]*([0-9]+\\.?[0-9]*)`, 'i') },

            // TGAb (甲状腺球蛋白抗体) - 支持 A-TG, TGAb, 抗甲状腺球蛋白抗体
            { key: 'TGAb', regex: new RegExp(`(?:TGAb|A-TG|${k('TG抗体')}|${k('抗甲状腺球蛋白')}|${k('甲状腺球蛋白抗')})[:：\\s]*([0-9]+\\.?[0-9]*)`, 'i') },

            // TRAb (促甲状腺激素受体抗体)
            { key: 'TRAb', regex: new RegExp(`(?:TRAb|${k('TR抗体')}|${k('促甲状腺激素受体')}|${k('促甲状腺素受体')})[:：\\s]*([0-9]+\\.?[0-9]*)`, 'i') },

            // Tg (甲状腺球蛋白) - 排除 "抗"
            { key: 'Tg', regex: new RegExp(`(?:(?<!抗|Anti\\s*|A-)${k('Tg')}|(?<!抗|Anti\\s*)${k('甲状腺球蛋白')})(?!抗)[:：\\s]*([0-9]+\\.?[0-9]*)`, 'i') },

            // 降钙素
            { key: 'Calcitonin', regex: new RegExp(`(?:${k('降钙素')}|CT|Calcitonin)[:：\\s]*([0-9]+\\.?[0-9]*)`, 'i') },

            // 血钙 - Ca
            { key: 'Calcium', regex: new RegExp(`(?:${k('血钙')}|(?<!降)钙|Ca)[:：\\s]*([0-9]+\\.?[0-9]*)`, 'i') },

            // 血镁 - Mg
            { key: 'Magnesium', regex: new RegExp(`(?:${k('血镁')}|镁|Mg)[:：\\s]*([0-9]+\\.?[0-9]*)`, 'i') },

            // 血磷 - P
            { key: 'Phosphorus', regex: new RegExp(`(?:${k('血磷')}|磷|P)[:：\\s]*([0-9]+\\.?[0-9]*)`, 'i') },

            // PTH (甲状旁腺激素)
            { key: 'PTH', regex: new RegExp(`(?:PTH|${k('甲状旁腺激素')}|${k('甲状旁腺素')})[:：\\s]*([0-9]+\\.?[0-9]*)`, 'i') }
        ];

        // 逐个匹配
        for (const { key, regex } of patterns) {
            const match = allText.match(regex);
            if (match && match[1]) {
                result[key] = match[1];
                console.log(`[OCR] 匹配到 ${key}: ${match[1]}`);
            }
        }

        // 返回识别结果统计
        const recognizedCount = Object.keys(result).length;
        console.log(`[OCR] 共识别到 ${recognizedCount} 个指标`);

        return {
            indicators: result,
            count: recognizedCount,
            rawText: allText.substring(0, 500) // 返回部分原文用于调试
        };
    }

    /**
     * 从OCR结果中解析B超报告信息
     * 支持: 甲状腺大小、结节信息、TI-RADS分级等
     */
    static parseUltrasound(textDetections) {
        let allText = textDetections.map(item => item.DetectedText).join(' ');
        // 预处理：统一全角字符，替换单位
        allText = allText.replace(/（/g, '(').replace(/）/g, ')').replace(/：/g, ':').replace(/，/g, ',');

        console.log('[OCR-B超临床加固解析] 识别原文:', allText);

        const result = {
            ultrasoundNote: allText
        };

        // --- 1. 状态识别 (切除/缺如) ---
        if (allText.includes('切除') || allText.includes('未见显示') || allText.includes('缺如') || allText.includes('未见确切')) {
            if (allText.match(/右[侧叶][^左]*?(?:已切除|未见显示|缺如)/)) result.thyroidRight = '已切除';
            if (allText.match(/左[侧叶][^右]*?(?:已切除|未见显示|缺如)/)) result.thyroidLeft = '已切除';
            if (allText.match(/峡部[^]*?(?:已切除|未见显示|缺如)/)) result.isthmus = '0 (已切除)';
        }

        // --- 2. 段落分块逻辑 (辅助定位) ---
        const leftPart = allText.match(/左[侧叶][^右峡结论提示]+/) || [''];
        const rightPart = allText.match(/右[侧叶][^左峡结论提示]+/) || [''];
        const conclPart = allText.match(/(?:提示|结论|诊断|意见):?([^]*)$/) || [allText, ''];

        // --- 0. 日期提取 ---
        // 匹配 202x-xx-xx 或 202x年xx月xx日
        const dateMatch = allText.match(/(?:日期|时间)[:：\s]*([2][0][2][0-9][\.\-\/\年][0-1]?[0-9][\.\-\/\月][0-3]?[0-9][日]?)/);
        if (dateMatch) {
            let dateStr = dateMatch[1].replace(/[年月日\.]/g, '-');
            // 规范化: 2025-7-3 -> 2025-07-03
            const parts = dateStr.split(/[-/]/);
            if (parts.length === 3) {
                const y = parts[0];
                const m = parts[1].padStart(2, '0');
                const d = parts[2].padStart(2, '0');
                result.ultrasoundDate = `${y}-${m}-${d}`;
            }
        }

        const parseSize = (text) => {
            if (!text) return null;
            const match = text.match(/([0-9]+\.?[0-9]*)[\s]*[×*xX][\s]*([0-9]+\.?[0-9]*)[\s]*(?:[×*xX][\s]*([0-9]+\.?[0-9]*))?[\s]*(mm|cm|毫米|厘米)?/i);
            if (match) {
                let [_, l, w, h, unit] = match;
                const isCm = unit === 'cm' || unit === '厘米';
                const conv = (n) => isCm ? parseFloat((n * 10).toFixed(1)) : parseFloat(n);
                return `${conv(l)}×${conv(w)}${h ? '×' + conv(h) : ''}mm`;
            }
            return null;
        };

        if (!result.thyroidLeft) result.thyroidLeft = parseSize(leftPart[0]);
        if (!result.thyroidRight) result.thyroidRight = parseSize(rightPart[0]);

        // 峡部厚度
        if (!result.isthmus) {
            const isthMatch = allText.match(/峡部[厚度约:：\s]*([0-9]+\.?[0-9]*)[\s]*(mm|cm|毫米|厘米)?/i);
            if (isthMatch) {
                let val = parseFloat(isthMatch[1]);
                if (isthMatch[2] === 'cm' || isthMatch[2] === '厘米') val *= 10;
                result.isthmus = val.toFixed(1);
            }
        }

        // --- 3. 结节核心逻辑 ---
        // 数量统计
        if (allText.includes('多发') || allText.includes('多个')) {
            result.noduleCount = '多发';
        } else {
            const countMatch = allText.match(/(?:见|发现|可见|枚)([一二三四五六七八九十0-9]+)个?(?:低|高|等|混合|实性)?回声?结节/i);
            if (countMatch) {
                const numMap = { '一': 1, '二': 2, '三': 3 };
                result.noduleCount = numMap[countMatch[1]] || countMatch[1];
            }
        }

        // TI-RADS分级 (支持 C-TIRADS 并取最高级)
        const tiradsLevels = allText.match(/[C-]?TI[-]?RADS\s*[:：\s]*([\dIVⅠⅡⅢⅣⅤ1-5]+[abc]?)/gi);
        if (tiradsLevels) {
            const sortedLevels = tiradsLevels.map(l => l.match(/([\d]+[abc]?)/i)?.[1].toUpperCase()).filter(Boolean)
                .sort((a, b) => b.localeCompare(a));
            result.tiradsLevel = sortedLevels[0];
        }

        // 结节位置 (优先最大者所在位置)
        const locMatch = allText.match(/((?:左|右)叶(?:上|中|下|背|前|后)?[极部侧]?|峡部)[内见可]*[^，。]*(?:较大|最大|大者)/i)
            || allText.match(/((?:左|右)叶(?:上|中|下|背|前|后)?[极部侧]?|峡部)[内见可]*(?:低|高|等|混合|无)?回声?结节/i);
        if (locMatch) result.noduleLocation = locMatch[1];

        // 最大尺寸 (区分结节和淋巴结)
        const noduleSizeText = allText.match(/结节[^]*?大小[^]*?([0-9]+\.?[0-9]*[×*xX][0-9]+\.?[0-9]*)/i)
            || allText.match(/([0-9]+\.?[0-9]*[×*xX][0-9]+\.?[0-9]*)[^]*?结节/i);
        result.noduleMaxSize = parseSize(noduleSizeText ? noduleSizeText[0] : allText.match(/(?:最大|较大|大者)[约大小：:\s]*(?:[^，。]*?)([0-9]+\.?[0-9]*[\s]*[×*xX][\s]*[0-9]+\.?[0-9]*)/i)?.[0]);

        // --- 4. 结构化特征提取 ---
        const features = [];
        const echoMatch = allText.match(/([低高等混合无]+回声)/);
        if (echoMatch) features.push(echoMatch[1]);
        if (allText.includes('边界不清') || allText.includes('边缘模糊')) features.push('边界不清');
        else if (allText.includes('边界清晰') || allText.includes('包膜完整') || allText.includes('边缘清')) features.push('边界清晰');
        if (allText.includes('形态不规则') || allText.includes('欠规则')) features.push('形态不规则');
        else if (allText.includes('形态规则')) features.push('形态规则');
        if (allText.match(/[微点簇]状强回声|钙化/)) {
            const calc = allText.match(/([微点簇]状强回声|强回声点|点状钙化|微钙化|粗大钙化)/);
            features.push(calc ? calc[1] : '见钙化');
        }
        if (allText.includes('纵横比>1') || allText.includes('立位生长')) features.push('纵横比>1');
        result.noduleFeatures = features.slice(0, 4).join('、');

        // 5. 淋巴结识别
        const lymphMatch = allText.match(/(?:颈部|双侧)?淋巴结[：: ]*([^，。]+(?:见|未见|多发|肿大)[^，。]+)/)
            || allText.match(/(?:显示|可见)(?:[^，。]*?)(淋巴结(?:显示|可见|未见|多发|肿大)[^，。]*?)/);
        if (lymphMatch) {
            const lText = lymphMatch[0];
            const lSize = parseSize(lText);
            result.lymphNode = (allText.includes('肿大') ? '肿大 ' : '') + (lSize ? `较大者${lSize}` : '见多发淋巴结');
        }

        console.log('[OCR-B超临床加固解析] 结果:', result);

        return {
            indicators: result,
            count: Object.keys(result).length - 1,
            rawText: allText.substring(0, 500)
        };
    }
}

module.exports = OcrController;
