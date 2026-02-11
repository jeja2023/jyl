const Router = require('koa-router');
const ratelimit = require('koa-ratelimit');
const AuthController = require('../controllers/AuthController');
const RecordController = require('../controllers/RecordController');
const MedicationController = require('../controllers/MedicationController');
const CheckupController = require('../controllers/CheckupController');
const HealthTipController = require('../controllers/HealthTipController');
const OcrController = require('../controllers/OcrController');
const UploadController = require('../controllers/UploadController');
const NotificationController = require('../controllers/NotificationController');
const WikiController = require('../controllers/WikiController');
const auth = require('../middlewares/auth');
const admin = require('../middlewares/auth').admin;
const optional = require('../middlewares/auth').optional;

const router = new Router({ prefix: '/api' });

// ==================== 速率限制器 ====================

const authLimiter = ratelimit({
    driver: 'memory',
    db: new Map(),
    duration: 60000,
    errorMessage: '请求太频繁，请稍后再试',
    id: (ctx) => ctx.ip,
    max: 10,
    disableHeader: false
});

const smsLimiter = ratelimit({
    driver: 'memory',
    db: new Map(),
    duration: 60000,
    errorMessage: '验证码请求太频繁，请稍后再试',
    id: (ctx) => ctx.ip,
    max: 5
});

// ==================== 公开路由 ====================

router.post('/auth/register', authLimiter, AuthController.register);
router.post('/auth/login', authLimiter, AuthController.login);
router.post('/auth/sms/send', smsLimiter, AuthController.sendSmsCode);
router.post('/auth/sms/register', authLimiter, AuthController.smsRegister);
router.post('/auth/sms/login', authLimiter, AuthController.smsLogin);
router.post('/auth/wechat/login', AuthController.wechatLogin);
router.post('/auth/wechat/phone', AuthController.wechatPhoneLogin);

// ==================== 需登录路由 ====================

router.get('/auth/stats', auth, AuthController.stats);
router.get('/auth/profile', auth, AuthController.profile);
router.post('/auth/profile/update', auth, AuthController.updateProfile);
router.post('/auth/setPassword', auth, AuthController.setPassword);
router.post('/auth/bindPhone', auth, AuthController.bindPhone);

// 记录 (完全 RESTful)
router.post('/record/add', auth, RecordController.create);
router.get('/record/list', auth, RecordController.list);
router.get('/record/trend', auth, RecordController.trend);
router.get('/record/:id', auth, RecordController.detail);
router.put('/record/:id', auth, RecordController.update);
router.delete('/record/:id', auth, RecordController.delete);

// 服药计划 (优化为 RESTful)
router.post('/medication/add', auth, MedicationController.create);
router.get('/medication/list', auth, MedicationController.list);
router.put('/medication/:id', auth, MedicationController.update);
router.delete('/medication/:id', auth, MedicationController.delete);
router.post('/medication/toggle', auth, MedicationController.toggle); // toggle属于原子操作，保留POST
router.post('/medication/take', auth, MedicationController.take);     // 打卡属于原子操作，保留POST

// 复查提醒 (优化为 RESTful)
router.post('/checkup/add', auth, CheckupController.create);
router.get('/checkup/list', auth, CheckupController.list);
router.delete('/checkup/:id', auth, CheckupController.delete);

// 其他功能
router.get('/tip/random', auth, HealthTipController.random);
router.post('/tip/seed', auth, HealthTipController.seed);
router.post('/ocr/recognize', auth, OcrController.recognize);
router.get('/notification/list', auth, NotificationController.list);
router.post('/upload/report', auth, UploadController.uploadReport);

// ==================== 百科文章 ====================

router.get('/wiki/list', WikiController.list);
router.post('/wiki/submit', auth, WikiController.submit);
router.get('/wiki/mine', auth, WikiController.myArticles);
router.post('/wiki/edit', auth, WikiController.editMyArticle);
router.post('/wiki/remove', auth, WikiController.removeMyArticle);

// 管理员接口 (优化为 RESTful)
router.get('/wiki/pending', auth, admin, WikiController.pendingList);
router.post('/wiki/approve', auth, admin, WikiController.approve);
router.post('/wiki/reject', auth, admin, WikiController.reject);
router.post('/wiki/create', auth, admin, WikiController.create);
router.put('/wiki/:id', auth, admin, WikiController.update);
router.delete('/wiki/:id', auth, admin, WikiController.delete);
router.post('/wiki/init', auth, admin, WikiController.initData);

// 公开接口 (通配符 - 必须放最后)
router.get('/wiki/:id', optional, WikiController.detail);

module.exports = router;
