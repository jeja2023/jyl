/**
 * 请求来源 IP 的唯一取值口径。
 *
 * 只能用 ctx.ip：它由 index.js 里的 app.proxy / app.maxIpsCount 统一裁决——
 * 未开启 TRUST_PROXY 时取 socket 地址，开启时只认可信代理追加的最后 N 跳。
 *
 * 反面教材是直接读 x-real-ip / x-forwarded-for：这两个头任何客户端都能随便填，
 * 用它做限流 key 等于让对方自己发号，用它写审计日志等于让对方决定日志内容。
 */

/** IPv4-mapped IPv6（::ffff:1.2.3.4）统一还原成 IPv4，避免同一来源写出两种格式 */
const normalizeIp = (value) => {
    const ip = String(value || '').trim();
    if (!ip) return '';
    const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
    return mapped ? mapped[1] : ip;
};

/**
 * @param {object} ctx Koa 上下文
 * @returns {string} 归一化后的来源 IP，取不到时返回 'unknown'
 */
const getClientIp = (ctx) => normalizeIp(ctx?.ip || ctx?.socket?.remoteAddress) || 'unknown';

module.exports = { getClientIp, normalizeIp };
