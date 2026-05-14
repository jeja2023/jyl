const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const Response = require('../utils/response');
const logger = require('../utils/logger');
const { logAction } = require('../utils/actionLog');
const { normalizeExt, parseBase64Image, validateImageBuffer } = require('../utils/imageValidation');

const STORAGE_DIR = path.join(__dirname, '../../storage/reports');

if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

class UploadController {
    static async uploadReport(ctx) {
        const { image, type = 'lab' } = ctx.request.body || {};
        const userId = ctx.state.user.id;
        const files = ctx.request.files || {};
        const uploadFile = files.file || files.image;

        const allowedTypes = new Set(['lab', 'ultrasound']);
        if (!allowedTypes.has(type)) {
            return Response.error(ctx, '无效的报告类型', 400);
        }

        if (uploadFile) {
            const file = Array.isArray(uploadFile) ? uploadFile[0] : uploadFile;
            const tempPath = file.filepath || file.path;
            const originalName = file.originalFilename || file.name || '';
            const mime = file.mimetype || '';
            const size = file.size || 0;

            if (!tempPath) {
                return Response.error(ctx, '上传文件读取失败', 400);
            }

            if (!mime.startsWith('image/')) {
                return Response.error(ctx, '仅支持上传图片文件', 400);
            }

            if (size > 10 * 1024 * 1024) {
                return Response.error(ctx, '图片文件太大，请上传10MB以下的图片', 400);
            }

            let ext = normalizeExt(path.extname(originalName).replace('.', '') || mime.split('/')[1]);
            if (!['jpg', 'png', 'webp'].includes(ext)) {
                return Response.error(ctx, '只支持上传jpg/png/webp格式的图片', 400);
            }

            const fileBuffer = await fsPromises.readFile(tempPath);
            const detected = validateImageBuffer(fileBuffer, ext);
            ext = detected.ext;

            const { filename, relativePath, filepath } = UploadController.buildFileTarget(userId, type, ext);
            await fsPromises.writeFile(filepath, fileBuffer);
            await fsPromises.unlink(tempPath).catch(() => null);

            logger.info('用户上传报告图片', { userId, type, filename, bytes: fileBuffer.length });
            Response.success(ctx, { path: relativePath, filename }, '上传成功');
            logAction(ctx, '文件上传', '健康记录', `用户上传了${type === 'lab' ? '化验单' : 'B超'}图片: ${filename}`);
            return;
        }

        if (!image) {
            return Response.error(ctx, '请上传图片', 400);
        }

        if (String(image).length > 10 * 1024 * 1024) {
            return Response.error(ctx, '图片文件太大，请上传10MB以下的图片', 400);
        }

        const { buffer, ext } = parseBase64Image(image);
        const { filename, relativePath, filepath } = UploadController.buildFileTarget(userId, type, ext);

        await fsPromises.writeFile(filepath, buffer);

        logger.info('用户上传报告图片', { userId, type, filename, bytes: buffer.length });
        Response.success(ctx, { path: relativePath, filename }, '上传成功');
        logAction(ctx, '文件上传', '健康记录', `用户上传了${type === 'lab' ? '化验单' : 'B超'}图片: ${filename}`);
    }

    static buildFileTarget(userId, type, ext) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).slice(2, 8);
        const filename = `${userId}_${type}_${timestamp}_${random}.${ext}`;
        return {
            filename,
            relativePath: `/storage/reports/${filename}`,
            filepath: path.join(STORAGE_DIR, filename)
        };
    }
}

module.exports = UploadController;
