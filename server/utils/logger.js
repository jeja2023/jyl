const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;
const SENSITIVE_KEY_RE = /(password|token|secret|authorization|phone|email|image|base64|rawText|ocr|code)/i;

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
            console.log(formatMessage('DEBUG', message, meta));
        }
    },

    info: (message, meta) => {
        if (currentLevel <= LOG_LEVELS.INFO) {
            console.log(formatMessage('INFO', message, meta));
        }
    },

    warn: (message, meta) => {
        if (currentLevel <= LOG_LEVELS.WARN) {
            console.warn(formatMessage('WARN', message, meta));
        }
    },

    error: (message, meta) => {
        if (currentLevel <= LOG_LEVELS.ERROR) {
            console.error(formatMessage('ERROR', message, meta));
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
