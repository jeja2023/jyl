const test = require('node:test');
const assert = require('node:assert/strict');
const { getClientIp, normalizeIp } = require('../utils/clientIp');
const { defaultRateLimitId } = require('../utils/rateLimiter');

/**
 * 来源 IP 只能取 ctx.ip —— 它由 index.js 的 app.proxy / app.maxIpsCount 裁决。
 * 之前 actionLog 直接读 x-real-ip / x-forwarded-for，限流 key 也等价于取转发头首段，
 * 结果任何客户端都能换头拿到新的限流额度、并往审计日志里写任意来源地址。
 */

const makeCtx = ({ ip, headers = {}, remoteAddress } = {}) => ({
    ip,
    header: headers,
    headers,
    get: (name) => headers[String(name).toLowerCase()] || '',
    socket: { remoteAddress }
});

test('getClientIp 取 ctx.ip，忽略伪造的转发头', () => {
    const ctx = makeCtx({
        ip: '203.0.113.9',
        headers: {
            'x-forwarded-for': '1.2.3.4, 5.6.7.8',
            'x-real-ip': '9.9.9.9'
        },
        remoteAddress: '203.0.113.9'
    });

    assert.equal(getClientIp(ctx), '203.0.113.9');
});

test('getClientIp 在 ctx.ip 为空时退回 socket 地址', () => {
    assert.equal(getClientIp(makeCtx({ ip: '', remoteAddress: '198.51.100.7' })), '198.51.100.7');
});

test('getClientIp 完全取不到时返回 unknown，不返回空串', () => {
    assert.equal(getClientIp(makeCtx({})), 'unknown');
    assert.equal(getClientIp(undefined), 'unknown');
});

test('IPv4-mapped IPv6 统一还原成 IPv4，避免同一来源出现两种写法', () => {
    assert.equal(normalizeIp('::ffff:203.0.113.9'), '203.0.113.9');
    assert.equal(normalizeIp('::1'), '::1');
    assert.equal(normalizeIp('  203.0.113.9  '), '203.0.113.9');
    assert.equal(normalizeIp(''), '');
});

test('限流默认 key 与 getClientIp 一致：换转发头拿不到新额度', () => {
    const headers = { 'x-forwarded-for': '1.2.3.4' };
    const first = defaultRateLimitId(makeCtx({ ip: '203.0.113.9', headers, remoteAddress: '203.0.113.9' }));
    const second = defaultRateLimitId(makeCtx({
        ip: '203.0.113.9',
        headers: { 'x-forwarded-for': '8.8.8.8', 'x-real-ip': '7.7.7.7' },
        remoteAddress: '203.0.113.9'
    }));

    assert.equal(first, '203.0.113.9');
    assert.equal(second, first, '同一 socket 来源换任何转发头都必须落在同一个计数桶');
});
