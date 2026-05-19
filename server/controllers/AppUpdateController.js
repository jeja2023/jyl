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

const normalizeUrl = (ctx, url) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;

    const publicBase = process.env.APP_PUBLIC_BASE_URL || process.env.PUBLIC_BASE_URL;
    if (publicBase) {
        return new URL(url, publicBase).toString();
    }

    return new URL(url, ctx.origin).toString();
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
