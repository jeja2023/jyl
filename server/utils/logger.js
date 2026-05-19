const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;
const SENSITIVE_KEY_RE = /(password|token|secret|authorization|phone|email|image|base64|rawText|ocr|code)/i;

const fs = require('fs');
const path = require('path');

// 确保日志持久化存储的目录存在，并创建写入流
const logDir = path.join(__dirname, '../../storage/logs');
let logStream = null;

if (process.env.WRITE_LOG_FILE === 'true' || process.env.NODE_ENV === 'production') {
    try {
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        const logPath = path.join(logDir, 'app.log');
        logStream = fs.createWriteStream(logPath, { flags: 'a', encoding: 'utf8' });
        logStream.on('error', (err) => {
            console.error('[logger] File logging disabled:', err.message);
            logStream = null;
        });
    } catch (err) {
        console.error('[日志系统] 无法初始化日志文件流:', err.message);
    }
}

// 异步流式写入日志到文件
const writeToFile = (msg) => {
    if (logStream) {
        try {
            logStream.write(msg + '\n');
        } catch (err) {
            console.error('[logger] File logging disabled:', err.message);
            logStream = null;
        }
    }
};

const maskString = (value) => {
    if (!value) return value;
    const str = String(value);
    if (str.length <= 8) return '***';
    return `${str.slice(0, 3)}***${str.slice(-3)}`;
};

const sanitizeMeta = (value, depth = 0) => {
    if (depth > 4) return '[Truncated]';
    if (Array.isArray(value)) return value.slice(0, 20).map(item => sanitizeMeta(item, depth + 1));
    if (!value || typeof value !== 'object') return value;

    const output = {};
    for (const [key, val] of Object.entries(value)) {
        if (SENSITIVE_KEY_RE.test(key)) {
            output[key] = maskString(val);
        } else if (typeof val === 'object') {
            output[key] = sanitizeMeta(val, depth + 1);
        } else {
            output[key] = val;
        }
    }
    return output;
};

const formatMessage = (level, message, meta = {}) => {
    const timestamp = new Date().toLocaleString('zh-CN', { hour12: false });
    const safeMeta = sanitizeMeta(meta);
    const metaStr = Object.keys(safeMeta || {}).length > 0 ? ` ${JSON.stringify(safeMeta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
};

const logger = {
    debug: (message, meta) => {
        if (currentLevel <= LOG_LEVELS.DEBUG) {
            const formatted = formatMessage('DEBUG', message, meta);
            console.log(formatted);
            writeToFile(formatted);
        }
    },

    info: (message, meta) => {
        if (currentLevel <= LOG_LEVELS.INFO) {
            const formatted = formatMessage('INFO', message, meta);
            console.log(formatted);
            writeToFile(formatted);
        }
    },

    warn: (message, meta) => {
        if (currentLevel <= LOG_LEVELS.WARN) {
            const formatted = formatMessage('WARN', message, meta);
            console.warn(formatted);
            writeToFile(formatted);
        }
    },

    error: (message, meta) => {
        if (currentLevel <= LOG_LEVELS.ERROR) {
            const formatted = formatMessage('ERROR', message, meta);
            console.error(formatted);
            writeToFile(formatted);
        }
    },

    request: (ctx, duration) => {
        const { method, url, status } = ctx;
        const requestId = ctx.state?.requestId;
        const userId = ctx.state?.user?.id;
        logger.info(`${method} ${url} ${status || 200} - ${duration}ms`, { requestId, userId });
    },

    sanitizeMeta
};

module.exports = logger;
