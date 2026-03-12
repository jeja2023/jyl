const Sequelize = require('sequelize');
require('dotenv').config();

/**
 * 数据库连接配置
 * 使用连接池管理数据库连接，提高性能
 */
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: process.env.DB_LOGGING === 'true' ? (msg) => console.log(`[SQL] ${msg}`) : false, // 允许通过环境变量开启 SQL 打印
        timezone: '+08:00', // 中国标准时间
        pool: {
            max: 10,      // 连接池最大连接数
            min: 2,       // 连接池最小连接数
            acquire: 30000, // 获取连接的超时时间（毫秒）
            idle: 10000   // 连接空闲超时时间（毫秒）
        }
    }
);

module.exports = sequelize;
