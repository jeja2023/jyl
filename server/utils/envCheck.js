/**
 * 环境变量校验工具
 * 在服务启动时检查必要的环境变量是否已配置
 */

const requiredEnvVars = [
    { key: 'JWT_SECRET', description: 'JWT 签名密钥' },
    { key: 'DB_NAME', description: '数据库名称' },
    { key: 'DB_USER', description: '数据库用户名' },
    { key: 'DB_PASS', description: '数据库密码' },
    { key: 'DB_HOST', description: '数据库主机地址' }
];

const optionalEnvVars = [
    { key: 'PORT', description: '服务端口', default: '3000' },
    { key: 'DB_PORT', description: '数据库端口', default: '3306' },
    { key: 'JWT_EXPIRE', description: 'JWT 过期时间', default: '7d' },
    { key: 'LOG_LEVEL', description: '日志级别', default: 'INFO' },
    { key: 'DB_SYNC_ALTER', description: '开发环境自动同步表结构', default: 'true(仅开发环境)' },
    { key: 'API_RATE_LIMIT', description: 'API 全局限流 (每分钟)', default: '120' },
    { key: 'CORS_ORIGINS', description: '生产环境允许的跨域来源(逗号分隔)', default: '未配置' },
    { key: 'OCR_TIMEOUT_MS', description: 'OCR 请求超时(毫秒)', default: '10000' },
    { key: 'LOGIN_FAIL_MAX', description: '登录失败阈值', default: '5' },
    { key: 'LOGIN_LOCK_MINUTES', description: '登录锁定时长(分钟)', default: '15' },
    { key: 'CLEANUP_ENABLE', description: '是否启用清理任务', default: 'false' },
    { key: 'CLEANUP_INTERVAL_HOURS', description: '清理任务执行间隔(小时)', default: '6' },
    { key: 'VERIFY_CODE_CLEANUP_DAYS', description: '验证码清理天数(已使用)', default: '1' },
    { key: 'ORPHAN_FILE_TTL_DAYS', description: '孤儿文件清理阈值(天)', default: '7' },
    { key: 'SHARE_EXPIRE', description: '分享链接有效期', default: '7d' }
];

/**
 * 检查环境变量配置
 * @returns {boolean} 是否通过检查
 */
const validateEnv = () => {
    console.log('🔍 正在检查环境变量配置...');
    const missing = [];

    for (const { key, description } of requiredEnvVars) {
        if (!process.env[key]) {
            missing.push(`  ❌ ${key} (${description})`);
        }
    }

    if (missing.length > 0) {
        console.error('');
        console.error('⚠️  缺少以下必要的环境变量:');
        missing.forEach(m => console.error(m));
        console.error('');
        console.error('请在 .env 文件中配置上述变量后重新启动服务。');
        console.error('');
        return false;
    }

    // 提示可选变量使用默认值
    for (const { key, description, default: defaultValue } of optionalEnvVars) {
        if (!process.env[key]) {
            console.log(`  ℹ️  ${key} 未设置，使用默认值: ${defaultValue}`);
        }
    }

    console.log('✅ 环境变量检查通过');
    return true;
};

module.exports = { validateEnv };
