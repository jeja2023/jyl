const User = require('../models/User');
const FamilyMember = require('../models/FamilyMember');
const { MEMBER } = require('../utils/memberScope');

/**
 * "指标解读对象"的档案加载。
 *
 * 必须一次把 referenceRanges 取全。之前 InsightService / CheckupService /
 * MonitoringPlanService 的本人分支都只查了 ['id','patientType']，
 * 随后却去读 owner.referenceRanges —— 恒为 undefined，
 * 于是本人的自定义参考范围在首页、复查建议、监测方案里全部静默失效，
 * 只有家庭成员那条分支（取的是整行）才生效。
 */

const USER_PROFILE_ATTRIBUTES = [
    'id', 'nickname', 'gender', 'birthDate',
    'patientType', 'treatmentStage', 'trendIndicators', 'referenceRanges'
];

const MEMBER_PROFILE_ATTRIBUTES = [
    'id', 'name', 'relation', 'gender', 'birthDate',
    'patientType', 'treatmentStage', 'referenceRanges', 'checkupIntervalDays'
];

/**
 * 统一取出普通对象形态的档案。
 * Sequelize 实例要走 toJSON()，但测试与部分调用方传的是普通对象，
 * 这里两种都兼容，避免"能跑通业务却在替换模型时炸掉"的脆弱耦合。
 */
const toPlain = (row) => {
    if (!row) return null;
    return typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
};

const toSelfProfile = (user) => {
    const plain = toPlain(user);
    return plain ? { ...plain, ownerType: 'self', memberId: null } : null;
};

const toMemberProfile = (member) => {
    const plain = toPlain(member);
    return plain ? { ...plain, ownerType: 'member', memberId: plain.id } : null;
};

/** 档案在记录集合里的归属键：本人是 'self'，家庭成员是 memberId 的字符串 */
const ownerKeyOf = (memberId) => (memberId === null || memberId === undefined ? 'self' : String(memberId));

/**
 * 取单个作用域对应的档案。
 * @param {number} userId 账号 ID
 * @param {{mode: string, memberId: number|null}} scope resolveMemberScope 的结果
 */
const loadOwnerProfile = async (userId, scope) => {
    if (scope?.mode === MEMBER && scope.memberId) {
        const member = await FamilyMember.findOne({
            where: { id: scope.memberId, UserId: userId },
            attributes: MEMBER_PROFILE_ATTRIBUTES
        });
        return toMemberProfile(member);
    }

    const user = await User.findByPk(userId, { attributes: USER_PROFILE_ATTRIBUTES });
    return toSelfProfile(user);
};

/**
 * 取本人 + 全部家庭成员的档案索引，供跨成员汇总时逐条记录按归属取档案。
 * 这样即使显式请求 all，异常判定用的也是每条记录自己主人的病种和参考范围，
 * 而不是拿账号主人的标准去套家人的化验单。
 * @returns {Promise<Map<string, object>>} 键为 ownerKeyOf(memberId)
 */
const loadOwnerProfileMap = async (userId) => {
    const [user, members] = await Promise.all([
        User.findByPk(userId, { attributes: USER_PROFILE_ATTRIBUTES }),
        FamilyMember.findAll({ where: { UserId: userId }, attributes: MEMBER_PROFILE_ATTRIBUTES })
    ]);

    const map = new Map();
    const self = toSelfProfile(user);
    if (self) map.set('self', self);
    members.forEach((member) => {
        const profile = toMemberProfile(member);
        if (profile) map.set(ownerKeyOf(member.id), profile);
    });

    return map;
};

module.exports = {
    loadOwnerProfile,
    loadOwnerProfileMap,
    ownerKeyOf,
    USER_PROFILE_ATTRIBUTES,
    MEMBER_PROFILE_ATTRIBUTES
};
