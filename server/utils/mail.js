const nodemailer = require('nodemailer');
const logger = require('./logger');

/**
 * 邮件发送服务
 * 用于发送注册/登录验证码
 */
class MailService {
    static getFromAddress() {
        const from = process.env.SMTP_FROM || '';
        const user = process.env.SMTP_USER;

        if (from.includes('<') || from.includes('@')) {
            return from;
        }

        return `"${from || '甲友乐'}" <${user}>`;
    }

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
                tls: {
                    rejectUnauthorized: process.env.NODE_ENV === 'production'
                        ? true
                        : process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false'
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
            logger.warn('未配置SMTP服务，跳过邮件验证码发送', { email: to });
            return true; // 开发模式假设成功
        }

        const mailOptions = {
            from: this.getFromAddress(),
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
            logger.info('邮件验证码发送成功', { email: to });
            return true;
        } catch (error) {
            logger.error('邮件验证码发送失败', { message: error.message });
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
