const fs = require('fs').promises;
const path = require('path');
const { Op } = require('sequelize');
const sequelize = require('../db');
const User = require('../models/User');
const HealthRecord = require('../models/HealthRecord');
const FamilyMember = require('../models/FamilyMember');
const MedicationPlan = require('../models/MedicationPlan');
const MedicationLog = require('../models/MedicationLog');
const MedicationAdjustment = require('../models/MedicationAdjustment');
const CheckupReminder = require('../models/CheckupReminder');
const Notification = require('../models/Notification');
const SymptomAssessment = require('../models/SymptomAssessment');
const ShareLink = require('../models/ShareLink');
const VerifyCode = require('../models/VerifyCode');
const WikiArticle = require('../models/WikiArticle');
const ActionLog = require('../models/ActionLog');
const logger = require('../utils/logger');

/**
 * 账号注销。
 *
 * 修的是这样一个问题：前端"注销账号"走完两次确认、要求手输"确认注销"之后，
 * 代码里只有一行 `// TODO: 调用注销接口`，紧接着就 toast「账号已注销」并清本地状态。
 * 服务端从来没有自助注销入口，账号和全部健康数据完好无损，
 * 而隐私政策和设置页都明确写着"所有数据将被永久删除"。
 *
 * 处置口径按隐私政策的"删除或匿名化"执行：
 *  - 个人健康数据（记录、家庭成员、用药、复查、评估、通知、分享链接）直接删除；
 *  - 上传的化验单/B超图片从磁盘删除；
 *  - 已发布的百科文章属于公共内容，只摘掉作者身份做匿名化，未发布的草稿直接删；
 *  - 操作日志属于审计记录，做匿名化保留，并补一条注销事件。
 */

const ANONYMOUS_NAME = '已注销用户';
const REPORT_STORAGE_DIR = path.resolve(__dirname, '../../storage/reports');
const WIKI_DRAFT_STATUSES = ['draft', 'pending', 'rejected'];

const parseImages = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
        return [value];
    }
};

/**
 * 收集该账号名下的报告图片文件名。
 *
 * 上传时文件名固定是 `${userId}_${type}_${时间戳}_${随机}.${ext}`，
 * 所以既按记录里的引用收集，也按 userId 前缀兜底扫一遍目录，
 * 顺带清掉上传成功但没保存进记录的孤儿文件。
 */
const collectUserReportFiles = async (userId) => {
    const names = new Set();

    const records = await HealthRecord.findAll({
        where: { UserId: userId },
        attributes: ['reportImage', 'ultrasoundImage']
    });
    for (const record of records) {
        const images = [...parseImages(record.reportImage), ...parseImages(record.ultrasoundImage)];
        for (const image of images) {
            const name = path.basename(String(image || '').split('?')[0]);
            if (name) names.add(name);
        }
    }

    const entries = await fs.readdir(REPORT_STORAGE_DIR).catch(() => []);
    entries.filter((name) => name.startsWith(`${userId}_`)).forEach((name) => names.add(name));

    return [...names];
};

/** 删除报告图片。逐个校验解析后的路径仍在 storage/reports 内，杜绝路径穿越 */
const removeReportFiles = async (filenames) => {
    let removed = 0;
    for (const filename of filenames) {
        if (!filename || !/^[a-zA-Z0-9_.-]+$/.test(filename)) continue;

        const filepath = path.resolve(REPORT_STORAGE_DIR, filename);
        if (!filepath.startsWith(`${REPORT_STORAGE_DIR}${path.sep}`)) continue;

        const ok = await fs.unlink(filepath).then(() => true).catch(() => false);
        if (ok) removed += 1;
    }
    return removed;
};

/**
 * 执行注销。调用方负责先完成身份二次校验。
 *
 * @param {number} userId
 * @returns {Promise<object>} 各项数据的处理条数，用于写审计日志
 */
const deleteAccount = async (userId) => {
    const user = await User.findByPk(userId);
    if (!user) return null;

    const identity = {
        username: user.username || null,
        phone: user.phone || null,
        email: user.email || null
    };

    // 文件路径必须在事务之前收集：事务里记录已被删掉就再也查不到引用了
    const reportFiles = await collectUserReportFiles(userId);

    const summary = await sequelize.transaction(async (transaction) => {
        const result = {};

        // 先子表后父表，避免外键约束报错
        result.medicationLogs = await MedicationLog.destroy({ where: { UserId: userId }, transaction });
        result.medicationAdjustments = await MedicationAdjustment.destroy({ where: { UserId: userId }, transaction });
        result.medicationPlans = await MedicationPlan.destroy({ where: { UserId: userId }, transaction });
        result.shareLinks = await ShareLink.destroy({ where: { UserId: userId }, transaction });
        // HealthRecord 通过 memberId 引用 FamilyMember，必须先删记录
        result.healthRecords = await HealthRecord.destroy({ where: { UserId: userId }, transaction });
        result.familyMembers = await FamilyMember.destroy({ where: { UserId: userId }, transaction });
        result.checkupReminders = await CheckupReminder.destroy({ where: { UserId: userId }, transaction });
        result.notifications = await Notification.destroy({ where: { UserId: userId }, transaction });
        result.symptomAssessments = await SymptomAssessment.destroy({ where: { UserId: userId }, transaction });

        // 验证码按发送目标存储，没有 UserId，按手机号/邮箱清
        const verifyTargets = [identity.phone, identity.email].filter(Boolean);
        result.verifyCodes = verifyTargets.length
            ? await VerifyCode.destroy({ where: { target: { [Op.in]: verifyTargets } }, transaction })
            : 0;

        // 未发布的投稿是私有内容，直接删
        result.wikiDraftsDeleted = await WikiArticle.destroy({
            where: { authorId: userId, status: { [Op.in]: WIKI_DRAFT_STATUSES } },
            transaction
        });
        // 已发布/已归档的百科是公共内容，只摘掉作者身份
        const [wikiAnonymized] = await WikiArticle.update(
            { authorId: null, authorName: ANONYMOUS_NAME },
            { where: { authorId: userId }, transaction }
        );
        result.wikiAnonymized = wikiAnonymized;

        // 操作日志保留但匿名化，符合"删除或匿名化处理"的承诺，也保住审计链
        const [logsAnonymized] = await ActionLog.update(
            { userId: null, username: ANONYMOUS_NAME },
            { where: { userId }, transaction }
        );
        result.actionLogsAnonymized = logsAnonymized;

        result.user = await User.destroy({ where: { id: userId }, transaction });
        return result;
    });

    // 事务提交后再动磁盘：中途回滚的话文件不能已经被删掉
    summary.reportFilesRemoved = await removeReportFiles(reportFiles);

    logger.info('账号注销完成', { userId, summary });
    return { identity, summary };
};

module.exports = {
    deleteAccount,
    collectUserReportFiles,
    removeReportFiles,
    ANONYMOUS_NAME,
    WIKI_DRAFT_STATUSES,
    REPORT_STORAGE_DIR
};
