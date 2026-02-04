const fs = require('fs');
const path = require('path');
const Response = require('../utils/response');

// 存储目录
const STORAGE_DIR = path.join(__dirname, '../../storage/reports');

// 确保存储目录存在
if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

/**
 * 上传控制器 - 处理图片上传
 */
class UploadController {
    /**
     * 上传报告图片
     * POST /api/upload/report
     * Body: { image: base64图片数据, type: 'lab'|'ultrasound' }
     */
    static async uploadReport(ctx) {
        const { image, type = 'lab' } = ctx.request.body;
        const userId = ctx.state.user.id;

        if (!image) {
            throw new Error('请上传图片');
        }

        // 解析base64数据
        const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
            throw new Error('无效的图片格式');
        }

        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        // 生成文件名：用户ID_类型_时间戳.扩展名
        const timestamp = Date.now();
        const filename = `${userId}_${type}_${timestamp}.${ext}`;
        const filepath = path.join(STORAGE_DIR, filename);

        // 保存文件
        fs.writeFileSync(filepath, buffer);

        // 返回相对路径（用于数据库存储）
        const relativePath = `/storage/reports/${filename}`;

        console.log(`[上传] 用户${userId}上传了${type}报告: ${filename}`);

        Response.success(ctx, {
            path: relativePath,
            filename: filename
        }, '上传成功');
    }

    /**
     * 获取报告图片
     * GET /api/upload/report/:filename
     */
    static async getReport(ctx) {
        const { filename } = ctx.params;
        const filepath = path.join(STORAGE_DIR, filename);

        if (!fs.existsSync(filepath)) {
            throw new Error('文件不存在');
        }

        // 获取文件扩展名确定Content-Type
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        };

        ctx.type = mimeTypes[ext] || 'application/octet-stream';
        ctx.body = fs.createReadStream(filepath);
    }
}

module.exports = UploadController;
