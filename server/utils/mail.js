const nodemailer = require('nodemailer');

/**
 * 邮件发送服务
 * 用于发送注册/登录验证码
 */
class MailService {
    static get transporter() {
        if (!this._transporter) {
            const port = parseInt(process.env.SMTP_PORT) || 465;
            this._transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.qq.com',
                port: port,
                secure: port === 465, // 465 端口使用 SSL (true)，其他端口（如 587）使用 STARTTLS (false)
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                },
                // 提高 Gmail 等服务的兼容性
                tls: {
                    rejectUnauthorized: false
                }
            });
        }
        return this._transporter;
    }

    /**
     * 发送验证码邮件
     * @param {string} to - 接收方邮箱
     * @param {string} code - 验证码
     * @returns {Promise<boolean>}
     */
    static async sendCode(to, code) {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.warn('[邮件] 未配置SMTP服务，跳过发送', { to, code });
            return true; // 开发模式假设成功
        }

        const mailOptions = {
            from: `"甲友乐" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to: to,
            subject: '【甲友乐】注册与登录注册验证码',
            html: `
                <div style="padding: 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                    <h2 style="color: #3E7BFF;">你好，甲友！</h2>
                    <p style="font-size: 16px; color: #333;">您正在登录/注册"甲友乐"平台，您的验证码为：</p>
                    <div style="background: #F2F7FF; padding: 20px; text-align: center; border-radius: 8px;">
                        <span style="font-size: 32px; font-weight: bold; color: #3E7BFF; letter-spacing: 5px;">${code}</span>
                    </div>
                    <p style="font-size: 14px; color: #666; margin-top: 20px;">
                        提示：验证码在 5 分钟内有效，请勿泄露给他人。
                    </p>
                    <hr style="border: none; border-top: 1px solid #EEE; margin: 30px 0;">
                    <p style="font-size: 12px; color: #999;">
                        此邮件由系统自动发出，请勿直接回复。
                    </p>
                </div>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`[邮件] 验证码已成功发送至: ${to}`);
            return true;
        } catch (error) {
            console.error('[邮件] 发送失败:', error.message);
            throw new Error('邮件发送失败');
        }
    }

    /**
     * 生成随机验证码
     * @param {number} length - 验证码长度
     * @returns {string}
     */
    static generateCode(length = 6) {
        let code = '';
        const charset = '0123456789';
        for (let i = 0; i < length; i++) {
            code += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return code;
    }
}

module.exports = MailService;
