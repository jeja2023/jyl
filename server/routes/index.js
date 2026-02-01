const Router = require('koa-router');
const AuthController = require('../controllers/AuthController');
const RecordController = require('../controllers/RecordController');
const MedicationController = require('../controllers/MedicationController');
const CheckupController = require('../controllers/CheckupController');
const HealthTipController = require('../controllers/HealthTipController');
const auth = require('../middlewares/auth');

const router = new Router({ prefix: '/api' });

// --- 公放路由 ---
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);

// --- 需登录路由 ---
// 用户信息
router.get('/auth/profile', auth, AuthController.profile);

// 健康记录相关
router.post('/record/add', auth, RecordController.create);
router.get('/record/list', auth, RecordController.list);
router.get('/record/trend', auth, RecordController.trend);

// 服药计划相关
router.post('/medication/add', auth, MedicationController.create);
router.get('/medication/list', auth, MedicationController.list);
router.post('/medication/update', auth, MedicationController.update);
router.post('/medication/toggle', auth, MedicationController.toggle);
router.delete('/medication/delete', auth, MedicationController.delete);

// 复查提醒相关
router.post('/checkup/add', auth, CheckupController.create);
router.get('/checkup/list', auth, CheckupController.list);
router.delete('/checkup/delete', auth, CheckupController.delete);

// 健康贴士
router.get('/tip/random', auth, HealthTipController.random);
router.post('/tip/seed', auth, HealthTipController.seed); // 方便初始化

module.exports = router;
