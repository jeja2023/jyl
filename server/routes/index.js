const Router = require('koa-router');
const ratelimit = require('koa-ratelimit');
const AuthController = require('../controllers/AuthController');
const RecordController = require('../controllers/RecordController');
const MedicationController = require('../controllers/MedicationController');
const CheckupController = require('../controllers/CheckupController');
const HealthTipController = require('../controllers/HealthTipController');
const OcrController = require('../controllers/OcrController');
const UploadController = require('../controllers/UploadController');
const auth = require('../middlewares/auth');

const router = new Router({ prefix: '/api' });

// 速率限制器
const authLimiter = ratelimit({
    driver: 'memory',
    db: new Map(),
    duration: 60000,
    errorMessage: '请求太频繁，请稍后再试',
    id: (ctx) => ctx.ip,
    max: 10, // 1分钟内最多10次尝试
    disableHeader: false
});

const smsLimiter = ratelimit({
    driver: 'memory',
    db: new Map(),
    duration: 60000,
    errorMessage: '验证码请求太频繁，请稍后再试',
    id: (ctx) => ctx.ip,
    max: 3 // 1分钟内最多3次验证码请求
});

// --- 公开路由（无需登录）---
// 传统用户名密码
router.post('/auth/register', authLimiter, AuthController.register);
router.post('/auth/login', authLimiter, AuthController.login);

// 邮箱验证码与注册
router.post('/auth/email/send', smsLimiter, AuthController.sendEmailCode);
router.post('/auth/email/register', authLimiter, AuthController.emailRegister);

// 手机号验证码登录 (保留备份，但由前端控制开关)
router.post('/auth/sms/send', smsLimiter, AuthController.sendSmsCode);
router.post('/auth/sms/register', authLimiter, AuthController.smsRegister);
router.post('/auth/sms/login', authLimiter, AuthController.smsLogin);

// 微信小程序登录
router.post('/auth/wechat/login', AuthController.wechatLogin);
router.post('/auth/wechat/phone', AuthController.wechatPhoneLogin);

// --- 需登录路由 ---
// 用户信息
router.get('/auth/stats', auth, AuthController.stats);
router.get('/auth/profile', auth, AuthController.profile);
router.post('/auth/profile/update', auth, AuthController.updateProfile);
router.post('/auth/setPassword', auth, AuthController.setPassword);
router.post('/auth/bindPhone', auth, AuthController.bindPhone);

// 健康记录相关
router.post('/record/add', auth, RecordController.create);
router.get('/record/list', auth, RecordController.list);
router.get('/record/trend', auth, RecordController.trend);
router.get('/record/:id', auth, RecordController.detail);
router.put('/record/:id', auth, RecordController.update);
router.delete('/record/:id', auth, RecordController.delete);

// 服药计划相关
router.post('/medication/add', auth, MedicationController.create);
router.get('/medication/list', auth, MedicationController.list);
router.post('/medication/update', auth, MedicationController.update);
router.post('/medication/toggle', auth, MedicationController.toggle);
router.post('/medication/take', auth, MedicationController.take); // 服药打卡
router.delete('/medication/delete', auth, MedicationController.delete);

// 复查提醒相关
router.post('/checkup/add', auth, CheckupController.create);
router.get('/checkup/list', auth, CheckupController.list);
router.post('/checkup/complete', auth, CheckupController.complete);
router.delete('/checkup/delete', auth, CheckupController.delete);

// 健康贴士
router.get('/tip/random', auth, HealthTipController.random);
router.post('/tip/seed', auth, HealthTipController.seed); // 方便初始化

// OCR识别（化验单/B超报告自动识别）
router.post('/ocr/recognize', auth, OcrController.recognize);

// 消息中心
const NotificationController = require('../controllers/NotificationController');
router.get('/notification/list', auth, NotificationController.list);
router.post('/notification/read', auth, NotificationController.markRead);
router.delete('/notification/delete', auth, NotificationController.delete);

// 文件上传（保存报告原件）
router.post('/upload/report', auth, UploadController.uploadReport);

// 百科文章
const WikiController = require('../controllers/WikiController');
const admin = require('../middlewares/auth').admin;

// 公开接口 (非通配符)
router.get('/wiki/list', WikiController.list); // 公开：列表
router.post('/wiki/init', WikiController.initData); // 初始化数据

// 用户投稿接口（需登录）
router.post('/wiki/submit', auth, WikiController.submit); // 用户投稿
router.get('/wiki/mine', auth, WikiController.myArticles); // 我的投稿
router.post('/wiki/edit', auth, WikiController.editMyArticle); // 编辑投稿
router.post('/wiki/remove', auth, WikiController.removeMyArticle); // 删除投稿

// 管理员审核接口
router.get('/wiki/pending', auth, admin, WikiController.pendingList); // 待审核列表
router.post('/wiki/approve', auth, admin, WikiController.approve); // 审核通过
router.post('/wiki/reject', auth, admin, WikiController.reject); // 审核拒绝
router.post('/wiki/create', auth, admin, WikiController.create); // 直接发布
router.post('/wiki/update', auth, admin, WikiController.update); // 更新文章
router.post('/wiki/delete', auth, admin, WikiController.delete); // 删除文章

// 公开接口 (通配符 - 必须放最后)
const optional = require('../middlewares/auth').optional;
router.get('/wiki/:id', optional, WikiController.detail); // 公开：详情 (带可选认证)

module.exports = router;

