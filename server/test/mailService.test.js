const test = require('node:test');
const assert = require('node:assert/strict');

const MailService = require('../utils/mail');

const originalEnv = { ...process.env };

test.afterEach(() => {
  process.env = { ...originalEnv };
});

test('mail from display name uses smtp user as address', () => {
  process.env.SMTP_USER = 'notice@example.com';
  process.env.SMTP_FROM = '甲友乐';

  assert.equal(MailService.getFromAddress(), '"甲友乐" <notice@example.com>');
});

test('mail from keeps explicit address format', () => {
  process.env.SMTP_USER = 'notice@example.com';
  process.env.SMTP_FROM = '"甲友乐" <noreply@example.com>';

  assert.equal(MailService.getFromAddress(), '"甲友乐" <noreply@example.com>');
});
