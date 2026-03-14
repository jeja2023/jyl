const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const Response = require('../utils/response');
const logger = require('../utils/logger');
const { logAction } = require('../utils/actionLog');

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
        const { image, type = 'lab' } = ctx.request.body || {};
        const userId = ctx.state.user.id;
        const files = ctx.request.files || {};
        const uploadFile = files.file || files.image;

        const allowedTypes = new Set(['lab', 'ultrasound']);
        if (!allowedTypes.has(type)) {
            throw new Error('无效的报告类型');
        }

        // 处理 multipart/form-data 上传
        if (uploadFile) {
            const file = Array.isArray(uploadFile) ? uploadFile[0] : uploadFile;
            const tempPath = file.filepath || file.path;
            const originalName = file.originalFilename || file.name || '';
            const mime = file.mimetype || '';
            const size = file.size || 0;

            if (!tempPath) {
                throw new Error('上传文件读取失败');
            }

            if (!mime.startsWith('image/')) {
                throw new Error('仅支持上传图片文件');
            }

            if (size > 10 * 1024 * 1024) {
                throw new Error('图片文件太大，请上传10MB以下的图片');
            }

            let ext = path.extname(originalName).toLowerCase().replace('.', '');
            if (!ext && mime) {
                ext = mime.split('/')[1] || '';
            }

            if (ext === 'jpeg') ext = 'jpg';
            if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
                throw new Error('只支持上传 jpg/png/webp 格式的图片');
            }

            const timestamp = Date.now();
            const filename = `${userId}_${type}_${timestamp}.${ext}`;
            const targetPath = path.join(STORAGE_DIR, filename);

            try {
                await fsPromises.rename(tempPath, targetPath);
            } catch (e) {
                await fsPromises.copyFile(tempPath, targetPath);
                await fsPromises.unlink(tempPath);
            }

            const relativePath = `/storage/reports/${filename}`;

            logger.info(`用户${userId}上传了${type}报告: ${filename}`);
            Response.success(ctx, { path: relativePath, filename }, '上传成功');
            logAction(ctx, '文件上传', '系统管理', `用户上传了${type === 'lab' ? '化验单' : 'B超'}图片: ${filename}`);
            return;
        }

        if (!image) {
            throw new Error('请上传图片');
        }

        // 检查大小 (Base64 大约比原图大 33%, 10MB Base64 约 7.5MB 原图)
        if (image.length > 10 * 1024 * 1024) {
            throw new Error('图片文件太大，请上传10MB以下的图片');
        }

        // 解析base64数据
        const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
            throw new Error('无效的图片格式');
        }

        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        // 简单后缀白名单过滤
        if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext.toLowerCase())) {
            throw new Error('只支持上传 jpg/png/webp 格式的图片');
        }

        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        if (buffer.length > 7.5 * 1024 * 1024) {
            throw new Error('图片文件太大，请上传10MB以下的图片');
        }

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
        logAction(ctx, '文件上传', '系统管理', `用户上传了${type === 'lab' ? '化验单' : 'B超'}图片: ${filename}`);
    }
}

module.exports = UploadController;
