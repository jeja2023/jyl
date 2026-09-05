const fs = require('fs');
const path = require('path');
const Response = require('../utils/response');
const logger = require('../utils/logger');

const updateDir = path.join(__dirname, '../../storage/app-updates');
const manifestPath = path.join(updateDir, 'manifest.json');

const toInt = (value, fallback = 0) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * 把 manifest 里的包地址补成客户端可用的地址。
 *
 * 安全要点：绝不能用请求头拼绝对地址。x-forwarded-host 和 Host（ctx.host）
 * 在没有可信代理的部署里都由客户端完全控制（对应 Koa 3 的 Host 头注入公告），
 * 一旦被污染，客户端拿到的 downloadUrl 就落在攻击者域名下，
 * 而热更新包会被直接安装。
 *
 * 取值顺序：
 *  1. manifest 里本身就是绝对地址 → 原样返回；
 *  2. 配置了公开域名 → 用配置值（唯一推荐的生产做法）；
 *  3. 明确开启了 TRUST_PROXY → 才允许用代理写入的转发头；
 *  4. 其余情况 → 返回相对路径，交给客户端用自己的 baseURL 解析。
 *     相对路径天然同源，伪造不了。
 */
const normalizeUrl = (ctx, url) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;

    const publicBase = process.env.APP_PUBLIC_BASE_URL
        || process.env.PUBLIC_BASE_URL
        || (process.env.NODE_ENV === 'production' ? process.env.VITE_API_BASE : '');
    if (publicBase) {
        return new URL(url, publicBase).toString();
    }

    if (process.env.TRUST_PROXY !== 'true') {
        return url;
    }

    const forwardedProto = String(ctx.get?.('x-forwarded-proto') || '').split(',').pop().trim();
    const forwardedHost = String(ctx.get?.('x-forwarded-host') || '').split(',').pop().trim();
    const host = forwardedHost || ctx.host;
    if (!host) return url;

    const isLocalHost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[?::1\]?)($|:)/i.test(host);
    const protocol = forwardedProto || (process.env.NODE_ENV === 'production' && !isLocalHost ? 'https' : ctx.protocol) || 'http';
    return new URL(url, `${protocol}://${host}`).toString();
};


const readManifest = () => {
    if (!fs.existsSync(manifestPath)) {
        return null;
    }

    const raw = fs.readFileSync(manifestPath, 'utf8');
    return JSON.parse(raw);
};

class AppUpdateController {
    static async check(ctx) {
        const platform = String(ctx.query.platform || 'android').toLowerCase();
        const currentVersionCode = toInt(ctx.query.versionCode, 0);
        const currentVersionName = String(ctx.query.versionName || '');

        let manifest;
        try {
            manifest = readManifest();
        } catch (err) {
            logger.error('App update manifest read failed', { error: err.message });
            return Response.success(ctx, {
                hasUpdate: false,
                reason: 'manifest_invalid'
            });
        }

        if (!manifest || manifest.enabled === false) {
            return Response.success(ctx, {
                hasUpdate: false,
                reason: manifest ? 'disabled' : 'manifest_missing'
            });
        }

        const latestVersionCode = toInt(manifest.versionCode, 0);
        const minVersionCode = toInt(manifest.minVersionCode, 0);
        const supportedPlatforms = Array.isArray(manifest.platforms)
            ? manifest.platforms.map(item => String(item).toLowerCase())
            : ['android'];

        if (!supportedPlatforms.includes(platform)) {
            return Response.success(ctx, {
                hasUpdate: false,
                reason: 'platform_unsupported'
            });
        }

        if (!latestVersionCode || latestVersionCode <= currentVersionCode) {
            return Response.success(ctx, {
                hasUpdate: false,
                currentVersionCode,
                currentVersionName,
                latestVersionCode
            });
        }

        const packageUrl = manifest.wgtUrl || manifest.packageUrl;
        if (!packageUrl) {
            logger.warn('App update manifest has no package url', { latestVersionCode });
            return Response.success(ctx, {
                hasUpdate: false,
                reason: 'package_missing'
            });
        }

        return Response.success(ctx, {
            hasUpdate: true,
            force: Boolean(manifest.force || (minVersionCode && currentVersionCode < minVersionCode)),
            versionName: String(manifest.versionName || latestVersionCode),
            versionCode: latestVersionCode,
            minVersionCode,
            downloadUrl: normalizeUrl(ctx, packageUrl),
            sha256: manifest.sha256 || '',
            size: toInt(manifest.size, 0),
            releaseNotes: Array.isArray(manifest.releaseNotes) ? manifest.releaseNotes : [],
            publishedAt: manifest.publishedAt || ''
        });
    }
}

module.exports = AppUpdateController;
