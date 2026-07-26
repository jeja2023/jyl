const test = require('node:test');
const assert = require('node:assert/strict');
const { isTokenRevoked } = require('../middlewares/auth');

/**
 * JWT 的 iat 只有秒精度，失效基线是毫秒时间戳。
 * 这里锁住边界行为：基线之后签发的令牌必须继续可用，
 * 基线之前签发的必须被拒。
 */

const secondsOf = (ms) => Math.floor(ms / 1000);

test('未设置失效基线时，任何令牌都不算作废', () => {
    const user = { tokenInvalidBefore: null };
    assert.equal(isTokenRevoked({ iat: 1000 }, user), false);
});

test('基线之前签发的令牌被判作废', () => {
    const invalidBefore = 1_700_000_000_000;
    const user = { tokenInvalidBefore: invalidBefore };
    const oldToken = { iat: secondsOf(invalidBefore) - 1 };
    assert.equal(isTokenRevoked(oldToken, user), true);
});

test('基线之后签发的令牌仍然有效', () => {
    const invalidBefore = 1_700_000_000_000;
    const user = { tokenInvalidBefore: invalidBefore };
    const newToken = { iat: secondsOf(invalidBefore) + 1 };
    assert.equal(isTokenRevoked(newToken, user), false);
});

test('老令牌（无 iatMs）同一秒内不被误杀', () => {
    // 改密时间落在这一秒的中间，老令牌 iat 取的是同一秒
    const invalidBefore = 1_700_000_000_500;
    const user = { tokenInvalidBefore: invalidBefore };
    const freshToken = { iat: secondsOf(invalidBefore) };
    assert.equal(isTokenRevoked(freshToken, user), false);
});

test('缺少 iat 的令牌不做作废判断', () => {
    const user = { tokenInvalidBefore: 1_700_000_000_000 };
    assert.equal(isTokenRevoked({}, user), false);
});

test('iatMs 优先于 iat：同一秒内登出也能判出失效', () => {
    // 登录 → 200ms 后登出，两者 iat 相同，只有毫秒戳能区分
    const loginMs = 1_700_000_000_100;
    const logoutMs = 1_700_000_000_300;
    const user = { tokenInvalidBefore: logoutMs };
    const token = { iat: secondsOf(loginMs), iatMs: loginMs };

    assert.equal(isTokenRevoked(token, user), true, '登出前签发的令牌必须失效');
});

test('iatMs：改密后下发的新令牌仍然可用', () => {
    const changeMs = 1_700_000_000_300;
    const user = { tokenInvalidBefore: changeMs };
    // 新令牌在写入基线之后签发，毫秒戳更大
    const newToken = { iat: secondsOf(changeMs), iatMs: changeMs + 5 };

    assert.equal(isTokenRevoked(newToken, user), false);
});

test('iatMs 与基线完全相等时不判失效，避免临界误杀', () => {
    const ms = 1_700_000_000_300;
    const user = { tokenInvalidBefore: ms };
    assert.equal(isTokenRevoked({ iat: secondsOf(ms), iatMs: ms }, user), false);
});
