const fs = require('fs').promises;
const path = require('path');
const { Op } = require('sequelize');
const VerifyCode = require('../models/VerifyCode');
const HealthRecord = require('../models/HealthRecord');
const logger = require('./logger');

const STORAGE_DIR = path.join(__dirname, '../../storage/reports');

const parseImages = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
        return [val];
    }
};

const cleanupVerifyCodes = async (days) => {
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 3600 * 1000);

    const deleted = await VerifyCode.destroy({
        where: {
            [Op.or]: [
                { expireAt: { [Op.lt]: now } },
                { used: true, createdAt: { [Op.lt]: cutoff } }
            ]
        }
    });

    if (deleted > 0) {
        logger.info(`清理验证码：已删除 ${deleted} 条过期/已用记录`);
    }
};

const cleanupOrphanFiles = async (ttlDays) => {
    try {
        const stat = await fs.stat(STORAGE_DIR).catch(() => null);
        if (!stat) return;

        const records = await HealthRecord.findAll({
            attributes: ['reportImage', 'ultrasoundImage']
        });

        const referenced = new Set();
        for (const r of records) {
            const imgs = [
                ...parseImages(r.reportImage),
                ...parseImages(r.ultrasoundImage)
            ];
            imgs.forEach((p) => {
                if (!p) return;
                const filename = p.split('/').pop();
                if (filename) referenced.add(filename);
            });
        }

        const files = await fs.readdir(STORAGE_DIR);
        const now = Date.now();
        const ttlMs = ttlDays * 24 * 3600 * 1000;
        let removed = 0;

        for (const file of files) {
            const filePath = path.join(STORAGE_DIR, file);
            const fstat = await fs.stat(filePath).catch(() => null);
            if (!fstat || !fstat.isFile()) continue;

            const isOrphan = !referenced.has(file);
            const isExpired = now - fstat.mtimeMs > ttlMs;
            if (isOrphan && isExpired) {
                await fs.unlink(filePath).catch(() => null);
                removed += 1;
            }
        }

        if (removed > 0) {
            logger.info(`清理孤儿文件：已删除 ${removed} 个过期文件`);
        }
    } catch (err) {
        logger.warn('清理孤儿文件失败', { message: err.message });
    }
};

const startCleanupJobs = () => {
    const enabled = process.env.CLEANUP_ENABLE === 'true';
    if (!enabled) {
        logger.info('清理任务未启用（CLEANUP_ENABLE=false）');
        return;
    }

    const intervalHours = parseInt(process.env.CLEANUP_INTERVAL_HOURS || '6', 10);
    const verifyCodeDays = parseInt(process.env.VERIFY_CODE_CLEANUP_DAYS || '1', 10);
    const orphanDays = parseInt(process.env.ORPHAN_FILE_TTL_DAYS || '7', 10);

    const run = async () => {
        await cleanupVerifyCodes(verifyCodeDays);
        await cleanupOrphanFiles(orphanDays);
    };

    run().catch(() => null);
    setInterval(run, intervalHours * 3600 * 1000);
    logger.info(`清理任务已启动：每 ${intervalHours} 小时执行一次`);
};

module.exports = { startCleanupJobs };
