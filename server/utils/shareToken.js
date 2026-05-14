const crypto = require('crypto');

const DEFAULT_SHARE_DAYS = 7;

const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

const generateToken = () => crypto.randomBytes(32).toString('base64url');

const parseDurationMs = (value, fallbackDays = DEFAULT_SHARE_DAYS) => {
    if (!value) return fallbackDays * 24 * 3600 * 1000;
    if (typeof value === 'number') return value;

    const match = String(value).trim().match(/^(\d+)\s*([smhd])?$/i);
    if (!match) return fallbackDays * 24 * 3600 * 1000;

    const amount = parseInt(match[1], 10);
    const unit = (match[2] || 'd').toLowerCase();
    const multipliers = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000
    };

    return amount * multipliers[unit];
};

const buildExpiresAt = (duration = process.env.SHARE_EXPIRE) => {
    return new Date(Date.now() + parseDurationMs(duration));
};

module.exports = {
    buildExpiresAt,
    generateToken,
    hashToken,
    parseDurationMs
};
