/**
 * 家庭成员作用域的统一解析。
 *
 * 修的是这样一个问题：HealthRecords.memberId 为空表示"本人"，
 * 而洞察 / 复查建议 / 监测方案的查询过去都写成"memberId 有值才加过滤"，
 * 于是"看本人"实际等于"看全家"——取到家人的化验单，却套账号主人的
 * patientType 和参考范围去判异常，异常标记、趋势和复查建议全是错的。
 * 更糟的是当时连"只看本人"都表达不出来：不传、传 null、传空串都落到同一分支。
 *
 * 这里把参数收敛成三种明确语义：
 *  - self（缺省）：只看本人，memberId IS NULL
 *  - member：只看指定家庭成员
 *  - all：显式要求跨成员汇总（列表类接口才用）
 *
 * 关键约定：缺省必须是 self。分析类接口宁可少算也不能把不同人的指标混在一起。
 */

const SELF = 'self';
const MEMBER = 'member';
const ALL = 'all';

const SELF_ALIASES = new Set(['self', 'me', '0', 'null', 'none', '本人']);
const ALL_ALIASES = new Set(['all', '*', 'family', '全部']);

/**
 * 解析请求里的 memberId 参数。
 *
 * @param {*} raw 原始参数（通常来自 ctx.query.memberId 或请求体）
 * @param {object} [options]
 * @param {'self'|'all'} [options.defaultMode='self'] 参数缺省时的语义
 * @returns {{ mode: 'self'|'member'|'all', memberId: number|null, valid: boolean }}
 *          valid 为 false 表示传了无法识别的值，此时按 defaultMode 兜底，
 *          调用方可以据此决定是否返回 400。
 */
const resolveMemberScope = (raw, { defaultMode = SELF } = {}) => {
    const fallback = defaultMode === ALL
        ? { mode: ALL, memberId: null, valid: true }
        : { mode: SELF, memberId: null, valid: true };

    if (raw === undefined || raw === null || raw === '') return fallback;

    const text = String(raw).trim().toLowerCase();
    if (text === '') return fallback;
    if (SELF_ALIASES.has(text)) return { mode: SELF, memberId: null, valid: true };
    if (ALL_ALIASES.has(text)) return { mode: ALL, memberId: null, valid: true };

    const parsed = Number(text);
    // 只认纯数字：Number() 会把 '1e3' 当成 1000、把 '0x10' 当成 16，
    // 这类写法不该被接受成家庭成员 ID
    if (/^\d+$/.test(text) && Number.isInteger(parsed) && parsed > 0) {
        return { mode: MEMBER, memberId: parsed, valid: true };
    }

    // 无法识别的值不能静默当成"全部"，否则又回到混算的老路
    return { ...fallback, valid: false };
};

/**
 * 把作用域翻译成 Sequelize where 片段（需与 UserId 条件合并使用）。
 * self 会显式加 memberId: null，这正是过去缺失的那一半条件。
 */
const buildMemberWhere = (scope) => {
    if (!scope || scope.mode === ALL) return {};
    if (scope.mode === MEMBER) return { memberId: scope.memberId };
    return { memberId: null };
};

/** 便捷写法：直接从原始参数得到 where 片段 */
const memberWhereFrom = (raw, options) => buildMemberWhere(resolveMemberScope(raw, options));

module.exports = {
    SELF,
    MEMBER,
    ALL,
    resolveMemberScope,
    buildMemberWhere,
    memberWhereFrom
};
