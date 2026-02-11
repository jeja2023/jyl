const crypto = require('crypto');
const https = require('https');

/**
 * 腾讯云短信服务
 * 用于发送手机验证码
 */
class SmsService {
    /**
     * 发送短信验证码
     * @param {string} phone - 手机号码
     * @param {string} code - 验证码
     * @returns {Promise<boolean>}
     */
    static async sendCode(phone, code) {
        const secretId = process.env.TENCENT_SECRET_ID;
        const secretKey = process.env.TENCENT_SECRET_KEY;
        const smsAppId = process.env.SMS_APP_ID;
        const smsSignName = process.env.SMS_SIGN_NAME || '甲友乐';
        const smsTemplateId = process.env.SMS_TEMPLATE_ID;

        // 检查配置
        if (!secretId || !secretKey) {
            console.error('[短信] 未配置腾讯云密钥');
            throw new Error('短信服务未配置');
        }

        if (!smsAppId || !smsTemplateId) {
            console.error('[短信] 未配置短信应用ID或模板ID');
            throw new Error('短信服务未配置');
        }

        const host = 'sms.tencentcloudapi.com';
        const service = 'sms';
        const action = 'SendSms';
        const version = '2021-01-11';
        const region = 'ap-guangzhou';
        const timestamp = Math.floor(Date.now() / 1000);
        const date = new Date(timestamp * 1000).toISOString().split('T')[0];

        // 请求体
        const payload = JSON.stringify({
            PhoneNumberSet: [`+86${phone}`],
            SmsSdkAppId: smsAppId,
            SignName: smsSignName,
            TemplateId: smsTemplateId,
            TemplateParamSet: [code, '5']  // 验证码和有效期（分钟）
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
                        console.log('[短信] 发送结果:', JSON.stringify(result));

                        if (result.Response && result.Response.Error) {
                            console.error('[短信] 发送失败:', result.Response.Error.Message);
                            reject(new Error(result.Response.Error.Message));
                        } else if (result.Response && result.Response.SendStatusSet) {
                            const status = result.Response.SendStatusSet[0];
                            if (status.Code === 'Ok') {
                                console.log(`[短信] 验证码已发送至 ${phone}`);
                                resolve(true);
                            } else {
                                console.error('[短信] 发送失败:', status.Message);
                                reject(new Error(status.Message));
                            }
                        } else {
                            reject(new Error('短信发送结果异常'));
                        }
                    } catch (e) {
                        reject(new Error('解析短信响应失败'));
                    }
                });
            });

            req.on('error', (e) => reject(new Error(`网络请求失败: ${e.message}`)));
            req.write(payload);
            req.end();
        });
    }

    /**
     * 生成随机验证码
     * @param {number} length - 验证码长度
     * @returns {string}
     */
    static generateCode(length = 6) {
        let code = '';
        for (let i = 0; i < length; i++) {
            code += Math.floor(Math.random() * 10);
        }
        return code;
    }
}

module.exports = SmsService;
