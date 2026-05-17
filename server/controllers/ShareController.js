const jwt = require('jsonwebtoken');
const HealthRecord = require('../models/HealthRecord');
const FamilyMember = require('../models/FamilyMember');
const ShareLink = require('../models/ShareLink');
const Response = require('../utils/response');
const { buildExpiresAt, generateToken, hashToken } = require('../utils/shareToken');
const { logAction } = require('../utils/actionLog');
const { DEFAULT_RANGES } = require('../utils/indicatorAnalysis');

const LAB_KEYS = Object.keys(DEFAULT_RANGES);

class ShareController {
    static async createRecordShare(ctx) {
        const { id, options = null } = ctx.request.body || {};
        const userId = ctx.state.user.id;

        if (!id) return Response.error(ctx, '缺少记录ID', 400);

        const record = await HealthRecord.findOne({ where: { id, UserId: userId } });
        if (!record) return Response.error(ctx, '记录不存在', 404);

        const token = generateToken();
        const expiresAt = buildExpiresAt();

        await ShareLink.create({
            tokenHash: hashToken(token),
            type: 'record',
            resourceId: record.id,
            expiresAt,
            options: options ? JSON.stringify(options) : null,
            UserId: userId
        });

        Response.success(ctx, { token, expiresAt }, '分享链接已生成');
        logAction(ctx, '创建分享链接', '健康记录', `用户创建了记录 ${record.id} 的分享链接`);
    }

    static async listRecordShares(ctx) {
        const userId = ctx.state.user.id;
        const { id } = ctx.query;
        const where = { UserId: userId, type: 'record' };
        if (id) where.resourceId = id;

        const list = await ShareLink.findAll({
            where,
            include: [{
                model: HealthRecord,
                attributes: ['recordDate'],
                required: false,
                include: [{ model: FamilyMember, attributes: ['name'], required: false }]
            }],
            order: [['createdAt', 'DESC']],
            attributes: ['id', 'type', 'resourceId', 'expiresAt', 'revokedAt', 'accessCount', 'lastAccessAt', 'createdAt']
        });

        Response.success(ctx, list);
    }

    static async revokeRecordShare(ctx) {
        const userId = ctx.state.user.id;
        const { id } = ctx.request.body || {};

        if (!id) return Response.error(ctx, '缺少分享ID', 400);

        const share = await ShareLink.findOne({ where: { id, UserId: userId, type: 'record' } });
        if (!share) return Response.error(ctx, '分享链接不存在', 404);

        if (!share.revokedAt) {
            await share.update({ revokedAt: new Date() });
        }

        Response.success(ctx, null, '分享链接已撤销');
        logAction(ctx, '撤销分享链接', '健康记录', `用户撤销了分享链接 ${share.id}`);
    }

    static async getRecordShare(ctx) {
        const token = ShareController.normalizeToken(ctx.params.token || ctx.query.token);
        if (!token) return Response.error(ctx, '缺少分享令牌', 400);

        const handled = await ShareController.resolveStoredShare(ctx, token);
        if (handled) return;

        if (ShareController.isLegacyJwtToken(token)) {
            return ShareController.resolveLegacyJwtShare(ctx, token);
        }

        return Response.error(ctx, '分享链接已失效或不可用', 401);
    }

    static async resolveStoredShare(ctx, token) {
        const share = await ShareLink.findOne({
            where: {
                tokenHash: hashToken(token),
                type: 'record'
            }
        });

        if (!share) return false;

        if (share.revokedAt) {
            Response.error(ctx, '分享链接已失效或不可用', 401);
            return true;
        }
        if (share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now()) {
            Response.error(ctx, '分享链接已失效或不可用', 401);
            return true;
        }

        const record = await HealthRecord.findOne({
            where: { id: share.resourceId, UserId: share.UserId },
            include: [{ model: FamilyMember, attributes: ['id', 'name', 'relation'] }]
        });

        if (!record) {
            Response.error(ctx, '记录不存在', 404);
            return true;
        }

        await share.update({
            accessCount: Number(share.accessCount || 0) + 1,
            lastAccessAt: new Date(),
            lastAccessIp: ctx.ip
        });

        Response.success(ctx, ShareController.publicRecord(record, ShareController.parseOptions(share.options)));
        return true;
    }

    static normalizeToken(value) {
        const raw = Array.isArray(value) ? value[0] : value;
        if (!raw) return '';

        const token = String(raw).trim();
        try {
            return decodeURIComponent(token).replace(/ /g, '+');
        } catch (e) {
            return token.replace(/ /g, '+');
        }
    }

    static isLegacyJwtToken(token) {
        return typeof token === 'string' && token.split('.').length === 3;
    }

    static async resolveLegacyJwtShare(ctx, token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.type !== 'record') return Response.error(ctx, '无效分享令牌', 400);

            const record = await HealthRecord.findByPk(decoded.id, {
                include: [{ model: FamilyMember, attributes: ['id', 'name', 'relation'] }]
            });
            if (!record) return Response.error(ctx, '记录不存在', 404);

            return Response.success(ctx, ShareController.publicRecord(record));
        } catch (e) {
            return Response.error(ctx, '分享链接已失效或不可用', 401);
        }
    }

    static parseOptions(value) {
        if (!value) return {};
        if (typeof value === 'object') return value;

        try {
            return JSON.parse(value);
        } catch (e) {
            return {};
        }
    }

    static publicRecord(record, options = {}) {
        const RecordController = require('./RecordController');
        const row = record.toJSON();

        row.reportImage = RecordController.parseImages(row.reportImage);
        row.ultrasoundImage = RecordController.parseImages(row.ultrasoundImage);
        row.indicatorUnits = RecordController.parseJson(row.indicatorUnits);

        const defaultKeys = [
            'id',
            'recordDate',
            ...LAB_KEYS,
            'thyroidLeft',
            'thyroidRight',
            'isthmus',
            'noduleCount',
            'noduleMaxSize',
            'noduleLocation',
            'tiradsLevel',
            'noduleFeatures',
            'lymphNode',
            'ultrasoundNote',
            'conclusion',
            'ultrasoundDate',
            'reportImage',
            'ultrasoundImage',
            'indicatorUnits',
            'FamilyMember'
        ];

        const allowedFields = Array.isArray(options.fields) && options.fields.length ? options.fields : null;
        const allowedKeys = allowedFields
            ? ['id', 'recordDate', ...allowedFields, 'FamilyMember']
            : defaultKeys;

        const result = {};
        allowedKeys.forEach((key) => {
            if (row[key] !== undefined) result[key] = row[key];
        });

        if (options.maskMember && result.FamilyMember) {
            result.FamilyMember = {
                ...result.FamilyMember,
                name: result.FamilyMember.name ? `${String(result.FamilyMember.name).slice(0, 1)}**` : ''
            };
        }

        if (options.hideImages) {
            delete result.reportImage;
            delete result.ultrasoundImage;
        }

        return result;
    }
}

module.exports = ShareController;
