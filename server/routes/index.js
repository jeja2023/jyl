const Router = require('koa-router');
const { createRateLimiter } = require('../utils/rateLimiter');
const { koaBody } = require('koa-body');
const AuthController = require('../controllers/AuthController');
const RecordController = require('../controllers/RecordController');
const MedicationController = require('../controllers/MedicationController');
const CheckupController = require('../controllers/CheckupController');
const HealthTipController = require('../controllers/HealthTipController');
const OcrController = require('../controllers/OcrController');
const UploadController = require('../controllers/UploadController');
const AdminController = require('../controllers/AdminController');
const FamilyController = require('../controllers/FamilyController');
const ShareController = require('../controllers/ShareController');
const AssessController = require('../controllers/AssessController');
const NotificationController = require('../controllers/NotificationController');
const WikiController = require('../controllers/WikiController');
const InsightController = require('../controllers/InsightController');
const OcrReviewController = require('../controllers/OcrReviewController');
const AppUpdateController = require('../controllers/AppUpdateController');
const ReportImageController = require('../controllers/ReportImageController');
const auth = require('../middlewares/auth');
const admin = require('../middlewares/auth').admin;
const optional = require('../middlewares/auth').optional;

const router = new Router({ prefix: '/api' });

const apiLimiter = createRateLimiter({
    duration: 60000,
    max: parseInt(process.env.API_RATE_LIMIT || '120', 10),
    errorMessage: '请求太频繁，请稍后再试'
});
router.use(apiLimiter);

const authLimiter = createRateLimiter({
    duration: 60000,
    max: parseInt(process.env.AUTH_RATE_LIMIT || '10', 10),
    errorMessage: '请求太频繁，请稍后再试'
});

const smsLimiter = createRateLimiter({
    duration: 60000,
    max: parseInt(process.env.SMS_RATE_LIMIT || '3', 10),
    errorMessage: '验证码请求太频繁，请稍后再试'
});

router.post('/auth/register', authLimiter, AuthController.register);
router.post('/auth/login', authLimiter, AuthController.login);
// 该接口能判断用户名是否存在，不限流会被用来批量枚举账号
router.get('/auth/check-username', authLimiter, AuthController.checkUsername);
router.post('/auth/email/send', smsLimiter, AuthController.sendEmailCode);
router.post('/auth/email/register', authLimiter, AuthController.emailRegister);
router.post('/auth/sms/send', smsLimiter, AuthController.sendSmsCode);
router.post('/auth/sms/register', authLimiter, AuthController.smsRegister);
router.post('/auth/sms/login', authLimiter, AuthController.smsLogin);
router.get('/common/config', AuthController.getPublicConfig);
router.get('/app/update/check', AppUpdateController.check);

router.get('/auth/stats', auth, AuthController.stats);
router.get('/auth/profile', auth, AuthController.profile);
router.post('/auth/profile/update', auth, AuthController.updateProfile);
router.post('/auth/setPassword', auth, AuthController.setPassword);
router.post('/auth/logout', auth, AuthController.logout);
router.post('/auth/bindPhone', auth, AuthController.bindPhone);
// 注销账号：不可逆且会删库，套上认证类限流，避免被拿去暴力猜密码/验证码
router.post('/auth/account/delete', auth, authLimiter, AuthController.deleteAccount);

router.post('/record/add', auth, RecordController.create);
router.get('/record/list', auth, RecordController.list);
router.get('/record/trend', auth, RecordController.trend);
router.get('/record/export', auth, RecordController.export);
router.post('/record/import', auth, RecordController.import);
router.get('/record/:id', auth, RecordController.detail);
router.put('/record/:id', auth, RecordController.update);
router.delete('/record/:id', auth, RecordController.delete);

router.post('/medication/add', auth, MedicationController.create);
router.get('/medication/list', auth, MedicationController.list);
router.post('/medication/update', auth, MedicationController.update);
router.post('/medication/toggle', auth, MedicationController.toggle);
router.post('/medication/take', auth, MedicationController.take);
router.post('/medication/makeup', auth, MedicationController.makeup);
router.get('/medication/stats', auth, MedicationController.stats);
router.get('/medication/adjustments', auth, MedicationController.adjustments);
router.get('/medication/logs', auth, MedicationController.logs);
router.delete('/medication/delete', auth, MedicationController.delete);

router.post('/checkup/add', auth, CheckupController.create);
router.get('/checkup/list', auth, CheckupController.list);
router.get('/checkup/suggest', auth, CheckupController.suggest);
router.post('/checkup/generate', auth, CheckupController.generate);
router.post('/checkup/complete', auth, CheckupController.complete);
router.delete('/checkup/delete', auth, CheckupController.delete);

router.get('/tip/random', auth, HealthTipController.random);
router.post('/tip/seed', auth, admin, HealthTipController.seed);

const ocrBody = koaBody({
    multipart: false,
    json: true,
    urlencoded: true,
    jsonLimit: '12mb',
    formLimit: '12mb'
});
router.post('/ocr/recognize', auth, ocrBody, OcrController.recognize);
router.get('/ocr/review/list', auth, OcrReviewController.list);
router.post('/ocr/review/confirm', auth, OcrReviewController.confirm);

router.get('/insight/dashboard', auth, InsightController.dashboard);
router.get('/insight/monthly', auth, InsightController.monthly);
router.get('/insight/record/:id', auth, InsightController.analyzeRecord);

router.get('/notification/list', auth, NotificationController.list);
router.post('/notification/read', auth, NotificationController.markRead);
router.delete('/notification/delete', auth, NotificationController.delete);

const uploadBody = koaBody({
    multipart: true,
    json: true,
    urlencoded: true,
    jsonLimit: '12mb',
    formLimit: '12mb',
    formidable: {
        maxFileSize: 10 * 1024 * 1024
    }
});
router.post('/upload/report', auth, uploadBody, UploadController.uploadReport);

router.post('/share/record', auth, ShareController.createRecordShare);
router.get('/share/record/list', auth, ShareController.listRecordShares);
router.post('/share/record/revoke', auth, ShareController.revokeRecordShare);

router.get('/family/list', auth, FamilyController.list);
router.get('/family/ranges', auth, FamilyController.ranges);
router.post('/family/add', auth, FamilyController.create);
router.post('/family/update', auth, FamilyController.update);
router.post('/family/delete', auth, FamilyController.delete);

router.get('/assess/history', auth, AssessController.getHistory);
router.post('/assess/save', auth, AssessController.saveAssessment);
router.get('/assess/:id', auth, AssessController.getDetail);
router.delete('/assess/:id', auth, AssessController.deleteAssessment);

router.get('/wiki/list', WikiController.list);
if (process.env.NODE_ENV === 'development') {
    router.post('/wiki/init', WikiController.initData);
} else {
    router.post('/wiki/init', auth, admin, WikiController.initData);
}
router.post('/wiki/submit', auth, WikiController.submit);
router.get('/wiki/mine', auth, WikiController.myArticles);
router.post('/wiki/edit', auth, WikiController.editMyArticle);
router.post('/wiki/remove', auth, WikiController.removeMyArticle);
router.get('/wiki/pending', auth, admin, WikiController.pendingList);
router.post('/wiki/approve', auth, admin, WikiController.approve);
router.post('/wiki/reject', auth, admin, WikiController.reject);
router.post('/wiki/create', auth, admin, WikiController.create);
router.post('/wiki/update', auth, admin, WikiController.update);
router.post('/wiki/delete', auth, admin, WikiController.delete);

router.get('/admin/users', auth, admin, AdminController.listUsers);
router.post('/admin/users/:id/update', auth, admin, AdminController.updateUser);
router.delete('/admin/users/:id', auth, admin, AdminController.deleteUser);
router.get('/admin/logs', auth, admin, AdminController.listLogs);

router.get('/wiki/:id', optional, WikiController.detail);
router.get('/share/record/:token', ShareController.getRecordShare);
router.get('/report/image/:filename', ReportImageController.serve);

module.exports = router;
