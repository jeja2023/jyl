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
    { key: 'LOG_LEVEL', description: '日志级别', default: 'INFO' }
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
