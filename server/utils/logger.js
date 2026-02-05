/**
 * 日志工具类
 * 统一日志格式，便于追踪和调试
 */

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

// 从环境变量获取日志级别，默认 INFO
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

/**
 * 格式化日志消息
 */
const formatMessage = (level, message, meta = {}) => {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
};

const logger = {
    debug: (message, meta) => {
        if (currentLevel <= LOG_LEVELS.DEBUG) {
            console.log(formatMessage('DEBUG', message, meta));
        }
    },

    info: (message, meta) => {
        if (currentLevel <= LOG_LEVELS.INFO) {
            console.log(formatMessage('信息', message, meta));
        }
    },

    warn: (message, meta) => {
        if (currentLevel <= LOG_LEVELS.WARN) {
            console.warn(formatMessage('警告', message, meta));
        }
    },

    error: (message, meta) => {
        if (currentLevel <= LOG_LEVELS.ERROR) {
            console.error(formatMessage('错误', message, meta));
        }
    },

    // 请求日志 (简化版)
    request: (ctx, duration) => {
        const { method, url, status } = ctx;
        logger.info(`${method} ${url} ${status || 200} - ${duration}ms`);
    }
};

module.exports = logger;
