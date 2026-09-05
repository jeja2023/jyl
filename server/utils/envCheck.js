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
    { key: 'SHARE_EXPIRE', description: '分享链接有效期', default: '7d' },
    { key: 'SHARE_LEGACY_JWT_ENABLED', description: '兼容旧版 JWT 分享链接(无法撤销，仅存量过渡期开启)', default: 'false' },
    { key: 'USER_CACHE_TTL_MS', description: '认证用户信息缓存时长(毫秒)', default: '30000' },
    { key: 'USER_CACHE_MAX', description: '认证用户缓存条目上限', default: '5000' },
    { key: 'APK_URL_CACHE_TTL_MS', description: 'APK 下载地址扫描结果缓存时长(毫秒)', default: '60000' },
    { key: 'EXPORT_MAX_ROWS', description: '单次导出最大记录数', default: '5000' },
    { key: 'CLEANUP_SCAN_BATCH', description: '清理任务扫描批大小', default: '500' },
    { key: 'REDIS_URL', description: '限流共享计数(多实例部署时配置，需 npm i ioredis)', default: '未配置，使用单进程内存限流' },
    { key: 'AUTH_RATE_LIMIT', description: '登录/注册类接口限流(每分钟)', default: '10' },
    { key: 'SMS_RATE_LIMIT', description: '验证码发送限流(每分钟)', default: '3' },
    { key: 'RATE_LIMIT_SWEEP_MS', description: '内存限流过期条目清理间隔(毫秒)', default: '60000' },
    { key: 'TRUST_PROXY', description: '是否信任反向代理的 X-Forwarded-* 头(仅在确实有代理时开启，否则限流与审计 IP 可被伪造)', default: 'false' },
    { key: 'TRUST_PROXY_HOPS', description: '服务端前面的可信代理层数，只认最后 N 跳转发头', default: '1' },
    { key: 'APP_PUBLIC_BASE_URL', description: 'App 安装包/热更新包的公开访问域名(生产环境建议必填，否则回退相对路径)', default: '未配置，返回相对路径由客户端拼接' }
];

/**
 * 生产环境下应当显式配置、否则会退化为不安全或不完整行为的变量。
 * 只告警不阻断启动：缺了仍能跑，但必须让运维看见。
 */
const productionAdvisoryVars = [
    { key: 'CORS_ORIGINS', reason: '未配置将拒绝所有带 Origin 的跨域请求' },
    { key: 'TRUST_PROXY', reason: '部署在 Nginx/网关后面时必须设为 true，否则限流与审计记录到的都是代理 IP' },
    { key: 'APP_PUBLIC_BASE_URL', reason: '未配置时热更新包地址只能返回相对路径' }
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
    for (const { key, default: defaultValue } of optionalEnvVars) {
        if (!process.env[key]) {
            console.log(`  ℹ️  ${key} 未设置，使用默认值: ${defaultValue}`);
        }
    }

    if (process.env.NODE_ENV === 'production') {
        const advisories = productionAdvisoryVars.filter(({ key }) => !process.env[key]);
        if (advisories.length > 0) {
            console.warn('');
            console.warn('⚠️  生产环境建议显式配置以下变量:');
            advisories.forEach(({ key, reason }) => console.warn(`  - ${key}: ${reason}`));
            console.warn('');
        }
    }

    console.log('✅ 环境变量检查通过');
    return true;
};

module.exports = { validateEnv, requiredEnvVars, optionalEnvVars, productionAdvisoryVars };
