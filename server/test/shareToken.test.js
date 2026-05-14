const test = require('node:test');
const assert = require('node:assert/strict');
const { buildExpiresAt, generateToken, hashToken, parseDurationMs } = require('../utils/shareToken');

test('generateToken creates non-empty opaque token', () => {
  const token = generateToken();
  assert.equal(typeof token, 'string');
  assert.ok(token.length >= 32);
});

test('hashToken creates stable sha256 hash', () => {
  assert.equal(hashToken('abc'), hashToken('abc'));
  assert.notEqual(hashToken('abc'), 'abc');
  assert.equal(hashToken('abc').length, 64);
});

test('parseDurationMs supports day and hour units', () => {
  assert.equal(parseDurationMs('7d'), 7 * 24 * 3600 * 1000);
  assert.equal(parseDurationMs('2h'), 2 * 3600 * 1000);
});

test('buildExpiresAt returns a future date', () => {
  const expiresAt = buildExpiresAt('1d');
  assert.ok(expiresAt instanceof Date);
  assert.ok(expiresAt.getTime() > Date.now());
});
