const test = require('node:test');
const assert = require('node:assert/strict');

const AuthController = require('../controllers/AuthController');
const AccountDeletionService = require('../services/AccountDeletionService');
const User = require('../models/User');
const VerifyCode = require('../models/VerifyCode');
const ActionLog = require('../models/ActionLog');
const sequelize = require('../db');

/**
 * 注销账号的回归测试。
 *
 * 原来的实现是前端一行 `// TODO: 调用注销接口` 加一句「账号已注销」的提示，
 * 服务端连自助注销路由都没有。这里锁死三件事：
 *  1. 必须真的调用服务端删除逻辑，不能只是提示；
 *  2. 确认短语和二次身份校验（密码 / 验证码）任一不过就不许删；
 *  3. 校验失败时删除逻辑一次都不能被触发。
 */

const originals = {
    transaction: sequelize.transaction,
    userFindByPk: User.findByPk,
    verifyFindOne: VerifyCode.findOne,
    actionLogCreate: ActionLog.create,
    deleteAccount: AccountDeletionService.deleteAccount
};

let deleteCalls = [];
let auditLogs = [];

const stubDeletion = () => {
    deleteCalls = [];
    AccountDeletionService.deleteAccount = async (userId) => {
        deleteCalls.push(userId);
        return {
            identity: { username: 'tester', phone: null, email: null },
            summary: { healthRecords: 3, user: 1 }
        };
    };
};

const makeCtx = (body) => ({
    state: { user: { id: 42 } },
    request: { body },
    header: {},
    ip: '203.0.113.9',
    socket: { remoteAddress: '203.0.113.9' }
});

test.beforeEach(() => {
    stubDeletion();
    auditLogs = [];
    // 审计日志落库会真的去连数据库，测试里换成内存收集
    ActionLog.create = async (row) => {
        auditLogs.push(row);
        return row;
    };
    sequelize.transaction = async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } });
});

test.afterEach(() => {
    sequelize.transaction = originals.transaction;
    User.findByPk = originals.userFindByPk;
    VerifyCode.findOne = originals.verifyFindOne;
    ActionLog.create = originals.actionLogCreate;
    AccountDeletionService.deleteAccount = originals.deleteAccount;
});

test('确认短语不对时拒绝注销，且不触发任何删除', async () => {
    User.findByPk = async () => ({ id: 42, password: 'hash', comparePassword: async () => true });

    const ctx = makeCtx({ confirmText: '删了吧', password: 'secret123' });
    await AuthController.deleteAccount(ctx);

    assert.equal(ctx.status, 400);
    assert.match(ctx.body.message, /确认注销/);
    assert.deepEqual(deleteCalls, [], '确认短语不对时绝不能删数据');
});

test('有密码的账号必须输密码，缺失时拒绝', async () => {
    User.findByPk = async () => ({ id: 42, password: 'hash', comparePassword: async () => true });

    const ctx = makeCtx({ confirmText: '确认注销' });
    await AuthController.deleteAccount(ctx);

    assert.equal(ctx.status, 400);
    assert.match(ctx.body.message, /登录密码/);
    assert.deepEqual(deleteCalls, []);
});

test('密码错误时拒绝且不删数据（用 400 而非 401，避免被前端当成会话失效强制登出）', async () => {
    User.findByPk = async () => ({ id: 42, password: 'hash', comparePassword: async () => false });

    const ctx = makeCtx({ confirmText: '确认注销', password: 'wrong-password' });
    await AuthController.deleteAccount(ctx);

    assert.equal(ctx.status, 400);
    assert.match(ctx.body.message, /密码错误/);
    assert.deepEqual(deleteCalls, [], '仅凭有效令牌不足以删库');
});

test('确认短语 + 正确密码时真正执行服务端删除', async () => {
    User.findByPk = async () => ({ id: 42, password: 'hash', comparePassword: async () => true });

    const ctx = makeCtx({ confirmText: '确认注销', password: 'secret123' });
    await AuthController.deleteAccount(ctx);

    assert.equal(ctx.status, 200);
    assert.equal(ctx.body.code, 200);
    assert.deepEqual(deleteCalls, [42], '必须真的调用删除逻辑');
    assert.deepEqual(ctx.body.data.deleted, { healthRecords: 3, user: 1 });

    // 账号行已删除，审计日志必须留痕且不再挂在被删的 userId 上
    // 审计日志是 fire-and-forget 写入，让出一个微任务再断言
    await new Promise((resolve) => { setImmediate(resolve); });

    const audit = auditLogs.find((row) => row.action === '注销账号');
    assert.ok(audit, '注销事件必须写入操作日志');
    assert.equal(audit.userId, null);
    assert.equal(audit.username, '已注销用户');
});

test('无密码账号走验证码：验证码错误时拒绝', async () => {
    User.findByPk = async () => ({ id: 42, password: null, phone: '13800000000' });
    VerifyCode.findOne = async () => null;

    const ctx = makeCtx({ confirmText: '确认注销', code: '123456' });
    await AuthController.deleteAccount(ctx);

    assert.equal(ctx.status, 400);
    assert.match(ctx.body.message, /验证码错误或已过期/);
    assert.deepEqual(deleteCalls, []);
});

test('无密码账号走验证码：验证码正确时删除并消费该验证码', async () => {
    User.findByPk = async () => ({ id: 42, password: null, phone: '13800000000' });

    let consumed = false;
    VerifyCode.findOne = async (options) => {
        assert.equal(options.where.target, '13800000000', '验证码目标必须是账号自己绑定的手机');
        assert.equal(options.where.targetType, 'sms');
        assert.equal(options.where.used, false);
        return { update: async ({ used }) => { consumed = used; } };
    };

    const ctx = makeCtx({ confirmText: '确认注销', code: '123456' });
    await AuthController.deleteAccount(ctx);

    assert.equal(ctx.status, 200);
    assert.equal(consumed, true, '验证码必须被标记为已使用，避免重复利用');
    assert.deepEqual(deleteCalls, [42]);
});

test('无密码账号必须提供 6 位验证码', async () => {
    User.findByPk = async () => ({ id: 42, password: null, phone: '13800000000' });

    const ctx = makeCtx({ confirmText: '确认注销', code: '12' });
    await AuthController.deleteAccount(ctx);

    assert.equal(ctx.status, 400);
    assert.deepEqual(deleteCalls, []);
});

test('既无密码也未绑定手机/邮箱时引导先设密码，不做删除', async () => {
    User.findByPk = async () => ({ id: 42, password: null, phone: null, email: null });

    const ctx = makeCtx({ confirmText: '确认注销', code: '123456' });
    await AuthController.deleteAccount(ctx);

    assert.equal(ctx.status, 400);
    assert.match(ctx.body.message, /先设置密码/);
    assert.deepEqual(deleteCalls, []);
});

test('删除范围覆盖全部个人数据表，且百科与操作日志走匿名化', () => {
    // 用源码级断言守住覆盖面：漏掉任何一张个人数据表都意味着"注销了但没删干净"
    const source = require('node:fs').readFileSync(
        require('node:path').join(__dirname, '../services/AccountDeletionService.js'),
        'utf8'
    );

    const mustDestroy = [
        'MedicationLog', 'MedicationAdjustment', 'MedicationPlan', 'ShareLink',
        'HealthRecord', 'FamilyMember', 'CheckupReminder', 'Notification',
        'SymptomAssessment', 'VerifyCode', 'User'
    ];
    mustDestroy.forEach((model) => {
        assert.ok(
            new RegExp(`${model}\\.destroy`).test(source),
            `${model} 的数据必须在注销时删除`
        );
    });

    assert.ok(/WikiArticle\.update/.test(source), '已发布百科应匿名化而非删除');
    assert.ok(/ActionLog\.update/.test(source), '操作日志应匿名化保留以维持审计链');
    assert.equal(AccountDeletionService.ANONYMOUS_NAME, '已注销用户');
});
