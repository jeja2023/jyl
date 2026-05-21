const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const Response = require('../utils/response');
const HealthRecord = require('../models/HealthRecord');
const ShareLink = require('../models/ShareLink');
const { hashToken } = require('../utils/shareToken');

const REPORT_STORAGE_DIR = path.join(__dirname, '../../storage/reports');
const IMAGE_MIME = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp'
};

const parseImages = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
        return [value];
    }
};

const imageListContains = (record, filename) => {
    const images = [
        ...parseImages(record.reportImage),
        ...parseImages(record.ultrasoundImage)
    ];
    return images.some(item => path.basename(String(item || '').split('?')[0]) === filename);
};

const verifyUserToken = (ctx) => {
    const authHeader = ctx.header.authorization || '';
    const [scheme, credentials] = authHeader.split(' ');
    const token = /^Bearer$/i.test(scheme) ? credentials : (ctx.query.authToken || '');
    if (!token) return null;

    try {
        return jwt.verify(String(token), process.env.JWT_SECRET);
    } catch (e) {
        return null;
    }
};

class ReportImageController {
    static async serve(ctx) {
        const filename = path.basename(String(ctx.params.filename || ''));
        const ext = path.extname(filename).replace('.', '').toLowerCase();

        if (!filename || !/^[a-zA-Z0-9_.-]+$/.test(filename) || !IMAGE_MIME[ext]) {
            return Response.error(ctx, '无效的图片路径', 400);
        }

        const filepath = path.resolve(REPORT_STORAGE_DIR, filename);
        const storageRoot = path.resolve(REPORT_STORAGE_DIR);
        if (!filepath.startsWith(`${storageRoot}${path.sep}`)) {
            return Response.error(ctx, '无效的图片路径', 400);
        }

        const allowed = await ReportImageController.canAccess(ctx, filename);
        if (!allowed) {
            return Response.error(ctx, '无权访问该图片', 403);
        }

        const stat = await fsPromises.stat(filepath).catch(() => null);
        if (!stat || !stat.isFile()) {
            return Response.error(ctx, '图片不存在', 404);
        }

        ctx.status = 200;
        ctx.type = IMAGE_MIME[ext];
        ctx.length = stat.size;
        ctx.set('Cache-Control', 'private, max-age=300');
        ctx.body = fs.createReadStream(filepath);
    }

    static async canAccess(ctx, filename) {
        const decoded = verifyUserToken(ctx);
        if (decoded?.id && filename.startsWith(`${decoded.id}_`)) {
            return true;
        }

        const shareToken = ctx.query.shareToken;
        if (!shareToken) return false;

        const share = await ShareLink.findOne({
            where: {
                tokenHash: hashToken(String(shareToken)),
                type: 'record',
                revokedAt: { [Op.is]: null }
            }
        });
        if (!share) return false;
        if (share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now()) {
            return false;
        }

        let options = {};
        try {
            options = share.options ? JSON.parse(share.options) : {};
        } catch (e) {
            options = {};
        }
        if (options.hideImages) return false;

        const record = await HealthRecord.findOne({
            where: { id: share.resourceId, UserId: share.UserId },
            attributes: ['reportImage', 'ultrasoundImage']
        });
        return record ? imageListContains(record, filename) : false;
    }
}

module.exports = ReportImageController;
