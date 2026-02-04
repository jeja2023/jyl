const https = require('https');

/**
 * 微信小程序服务
 * 用于微信登录
 */
class WechatService {
    /**
     * 通过code获取微信用户openid和session_key
     * @param {string} code - wx.login获取的code
     * @returns {Promise<{openid: string, session_key: string, unionid?: string}>}
     */
    static async code2Session(code) {
        const appId = process.env.WX_APP_ID;
        const appSecret = process.env.WX_APP_SECRET;

        if (!appId || !appSecret) {
            throw new Error('未配置微信小程序AppID或AppSecret');
        }

        const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;

        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        console.log('[微信] code2Session结果:', JSON.stringify(result));

                        if (result.errcode) {
                            console.error('[微信] 登录失败:', result.errmsg);
                            reject(new Error(result.errmsg || '微信登录失败'));
                        } else {
                            resolve({
                                openid: result.openid,
                                session_key: result.session_key,
                                unionid: result.unionid
                            });
                        }
                    } catch (e) {
                        reject(new Error('解析微信响应失败'));
                    }
                });
            }).on('error', (e) => {
                reject(new Error(`网络请求失败: ${e.message}`));
            });
        });
    }

    /**
     * 获取微信手机号（需要用户授权）
     * 注意：此接口需要用户在小程序中点击获取手机号按钮
     * @param {string} code - getPhoneNumber获取的code
     * @returns {Promise<{phoneNumber: string, purePhoneNumber: string}>}
     */
    static async getPhoneNumber(code) {
        const appId = process.env.WX_APP_ID;
        const appSecret = process.env.WX_APP_SECRET;

        if (!appId || !appSecret) {
            throw new Error('未配置微信小程序AppID或AppSecret');
        }

        // 先获取access_token
        const accessToken = await this.getAccessToken();

        const url = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`;

        return new Promise((resolve, reject) => {
            const postData = JSON.stringify({ code });

            const req = https.request(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        console.log('[微信] 获取手机号结果:', JSON.stringify(result));

                        if (result.errcode !== 0) {
                            reject(new Error(result.errmsg || '获取手机号失败'));
                        } else {
                            resolve({
                                phoneNumber: result.phone_info.phoneNumber,
                                purePhoneNumber: result.phone_info.purePhoneNumber,
                                countryCode: result.phone_info.countryCode
                            });
                        }
                    } catch (e) {
                        reject(new Error('解析微信响应失败'));
                    }
                });
            });

            req.on('error', (e) => reject(new Error(`网络请求失败: ${e.message}`)));
            req.write(postData);
            req.end();
        });
    }

    /**
     * 获取微信小程序access_token
     * @returns {Promise<string>}
     */
    static async getAccessToken() {
        const appId = process.env.WX_APP_ID;
        const appSecret = process.env.WX_APP_SECRET;

        const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;

        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        if (result.errcode) {
                            reject(new Error(result.errmsg));
                        } else {
                            resolve(result.access_token);
                        }
                    } catch (e) {
                        reject(new Error('解析微信响应失败'));
                    }
                });
            }).on('error', (e) => {
                reject(new Error(`网络请求失败: ${e.message}`));
            });
        });
    }
}

module.exports = WechatService;
