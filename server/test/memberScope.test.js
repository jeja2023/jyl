const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveMemberScope, buildMemberWhere, memberWhereFrom, SELF, MEMBER, ALL } = require('../utils/memberScope');

/**
 * 这组用例锁死一个曾经出过事的约定：缺省作用域必须是"本人"。
 *
 * 出事的写法是 `if (memberId) where.memberId = memberId`——不传、null、空串
 * 全都落到"不加成员条件"的分支，于是本人的洞察/复查建议/监测方案
 * 实际把全家的化验记录混在一起算，还套账号主人的参考范围判异常。
 */

test('不传成员参数时作用域是本人，且会显式限定 memberId IS NULL', () => {
    for (const raw of [undefined, null, '', '   ']) {
        const scope = resolveMemberScope(raw);
        assert.equal(scope.mode, SELF, `${JSON.stringify(raw)} 必须解析成本人`);
        assert.equal(scope.memberId, null);
        assert.deepEqual(buildMemberWhere(scope), { memberId: null }, '本人必须带 memberId: null 条件');
    }
});

test('self 系列别名都解析成本人', () => {
    for (const raw of ['self', 'SELF', 'me', '0', 'null', 'none', '本人']) {
        assert.equal(resolveMemberScope(raw).mode, SELF, `${raw} 应解析成本人`);
    }
});

test('传家庭成员 ID 时只查该成员', () => {
    const scope = resolveMemberScope('7');
    assert.equal(scope.mode, MEMBER);
    assert.equal(scope.memberId, 7);
    assert.deepEqual(buildMemberWhere(scope), { memberId: 7 });

    assert.equal(resolveMemberScope(12).memberId, 12, '数字类型也要支持');
});

test('只有显式 all 才跨成员汇总，此时不加成员条件', () => {
    for (const raw of ['all', 'ALL', '*', 'family', '全部']) {
        const scope = resolveMemberScope(raw);
        assert.equal(scope.mode, ALL, `${raw} 应解析成全部`);
        assert.deepEqual(buildMemberWhere(scope), {});
    }
});

test('无法识别的取值退回缺省作用域并标记 invalid，不会静默变成"全部"', () => {
    const scope = resolveMemberScope('; DROP TABLE');
    assert.equal(scope.mode, SELF, '垃圾值必须退回本人，不能放开成跨成员');
    assert.equal(scope.valid, false, '调用方要能据此返回 400');

    for (const raw of ['-1', '1.5', 'abc', '1e3']) {
        const parsed = resolveMemberScope(raw);
        assert.equal(parsed.mode, SELF, `${raw} 不是合法成员 ID`);
        assert.equal(parsed.valid, false);
    }
});

test('清单类接口可以把缺省改成全部，但本人语义仍能显式表达', () => {
    assert.deepEqual(memberWhereFrom(undefined, { defaultMode: ALL }), {}, '列表缺省保持跨成员');
    assert.deepEqual(memberWhereFrom('self', { defaultMode: ALL }), { memberId: null }, 'memberId=self 必须能收窄到本人');
    assert.deepEqual(memberWhereFrom('3', { defaultMode: ALL }), { memberId: 3 });
});

test('buildMemberWhere 对空作用域按不过滤处理，不会抛错', () => {
    assert.deepEqual(buildMemberWhere(null), {});
    assert.deepEqual(buildMemberWhere(undefined), {});
});
