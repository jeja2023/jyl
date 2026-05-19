const test = require('node:test');
const assert = require('node:assert/strict');

const AuthController = require('../controllers/AuthController');
const MailService = require('../utils/mail');
const VerifyCode = require('../models/VerifyCode');
const VerifySendLock = require('../models/VerifySendLock');
const User = require('../models/User');
const sequelize = require('../db');

const originals = {
  transaction: sequelize.transaction,
  verifyFindOne: VerifyCode.findOne,
  verifyCreate: VerifyCode.create,
  lockFindOrCreate: VerifySendLock.findOrCreate,
  lockFindByPk: VerifySendLock.findByPk,
  userFindOne: User.findOne,
  sendCode: MailService.sendCode
};

test.afterEach(() => {
  sequelize.transaction = originals.transaction;
  VerifyCode.findOne = originals.verifyFindOne;
  VerifyCode.create = originals.verifyCreate;
  VerifySendLock.findOrCreate = originals.lockFindOrCreate;
  VerifySendLock.findByPk = originals.lockFindByPk;
  User.findOne = originals.userFindOne;
  MailService.sendCode = originals.sendCode;
});

test('sendEmailCode does not create verify code when mail send fails', async () => {
  let verifyCreated = false;

  sequelize.transaction = async (callback) => callback({
    LOCK: { UPDATE: 'UPDATE' }
  });
  VerifySendLock.findOrCreate = async () => [{ targetKey: 'email:test@example.com' }, true];
  VerifySendLock.findByPk = async () => ({ targetKey: 'email:test@example.com' });
  VerifyCode.findOne = async () => null;
  VerifyCode.create = async () => {
    verifyCreated = true;
  };
  User.findOne = async () => null;
  MailService.sendCode = async () => {
    throw new Error('smtp timeout');
  };

  const ctx = {
    request: {
      body: {
        email: 'test@example.com',
        username: 'testuser',
        type: 'register'
      }
    }
  };

  await AuthController.sendEmailCode(ctx);

  assert.equal(ctx.status, 400);
  assert.equal(ctx.body.message, '验证码发送失败，请稍后重试');
  assert.equal(verifyCreated, false);
});
