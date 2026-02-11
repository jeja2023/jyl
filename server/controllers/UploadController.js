const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const Response = require('../utils/response');
const logger = require('../utils/logger');

// 存储目录
const STORAGE_DIR = path.join(__dirname, '../../storage/reports');

// 允许的图片格式
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

// 最大文件大小 (Base64 约比原图大 33%, 10MB Base64 ≈ 7.5MB 原图)
const MAX_SIZE = 10 * 1024 * 1024;

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
            return Response.error(ctx, '请上传图片');
        }

        // 检查大小
        if (image.length > MAX_SIZE) {
            return Response.error(ctx, '图片文件太大，请上传10MB以下的图片');
        }

        // 校验类型参数
        if (!['lab', 'ultrasound'].includes(type)) {
            return Response.error(ctx, '无效的上传类型');
        }

        // 解析base64数据
        const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
            return Response.error(ctx, '无效的图片格式');
        }

        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        // 后缀白名单过滤
        if (!ALLOWED_EXTENSIONS.includes(ext.toLowerCase())) {
            return Response.error(ctx, '只支持上传 jpg/png/webp 格式的图片');
        }

        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        // 生成文件名：用户ID_类型_时间戳.扩展名
        const timestamp = Date.now();
        const filename = `${userId}_${type}_${timestamp}.${ext}`;
        const filepath = path.join(STORAGE_DIR, filename);

        // 使用异步写入，避免阻塞事件循环
        await fsPromises.writeFile(filepath, buffer);

        // 返回相对路径（用于数据库存储）
        const relativePath = `/storage/reports/${filename}`;

        logger.info(`用户${userId}上传了${type}报告: ${filename}`);

        Response.success(ctx, {
            path: relativePath,
            filename: filename
        }, '上传成功');
    }
}

module.exports = UploadController;
