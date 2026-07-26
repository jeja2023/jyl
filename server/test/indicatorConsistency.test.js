const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DEFAULT_RANGES, DISEASE_INDICATOR_PROFILES } = require('../utils/indicatorAnalysis');

/**
 * 参考范围和病种档案在前端 client/src/utils/thyroidIndicators.js 里另有一份，
 * 靠人工同步。历史上降钙素上限就出现过两边不一致（9.52 / 10）。
 * 这里直接解析前端源文件做断言，任何一边改了忘了同步另一边，测试会立刻失败。
 */

const FRONTEND_FILE = path.join(__dirname, '../../client/src/utils/thyroidIndicators.js');

const readFrontendSource = () => {
    if (!fs.existsSync(FRONTEND_FILE)) return null;
    return fs.readFileSync(FRONTEND_FILE, 'utf8');
};

/** 把前端的 ref 字符串（'0.27 - 4.2' / '< 34' / '> 1.0'）解析成 { min, max } */
const parseRefString = (ref) => {
    const text = String(ref || '').trim();
    if (!text) return {};

    const rangeMatch = text.match(/^([\d.]+)\s*-\s*([\d.]+)$/);
    if (rangeMatch) {
        return { min: Number(rangeMatch[1]), max: Number(rangeMatch[2]) };
    }

    const lessMatch = text.match(/^<\s*([\d.]+)$/);
    if (lessMatch) return { max: Number(lessMatch[1]) };

    const greaterMatch = text.match(/^>\s*([\d.]+)$/);
    if (greaterMatch) return { min: Number(greaterMatch[1]) };

    return {};
};

const parseFrontendIndicators = (source) => {
    const result = {};
    const itemRe = /\{\s*key:\s*'([^']+)'[^}]*?unit:\s*'([^']*)'[^}]*?ref:\s*'([^']*)'/g;
    let match;
    while ((match = itemRe.exec(source)) !== null) {
        const [, key, unit, ref] = match;
        if (result[key]) continue; // TREND_INDICATORS 会再展开一次 ALL_INDICATORS
        result[key] = { unit, ...parseRefString(ref) };
    }
    return result;
};

const parseFrontendProfiles = (source) => {
    const start = source.indexOf('DISEASE_INDICATOR_PROFILES');
    if (start < 0) return {};
    const segment = source.slice(start);
    const result = {};
    const re = /\n\s+([一-龥A-Za-z0-9]+):\s*\{\s*\n\s*core:\s*\[([^\]]*)\],\s*\n\s*recommended:\s*\[([^\]]*)\]/g;
    let match;
    while ((match = re.exec(segment)) !== null) {
        const toList = (raw) => raw.replace(/['\s]/g, '').split(',').filter(Boolean);
        result[match[1]] = { core: toList(match[2]), recommended: toList(match[3]) };
    }
    return result;
};

test('前端参考范围与后端 DEFAULT_RANGES 完全一致', () => {
    const source = readFrontendSource();
    assert.ok(source, `找不到前端指标定义文件: ${FRONTEND_FILE}`);

    const frontend = parseFrontendIndicators(source);
    const backendKeys = Object.keys(DEFAULT_RANGES);

    assert.ok(backendKeys.length > 0, '后端 DEFAULT_RANGES 为空');

    for (const key of backendKeys) {
        const back = DEFAULT_RANGES[key];
        const front = frontend[key];

        assert.ok(front, `前端缺少指标 ${key}`);
        assert.equal(front.unit, back.unit, `${key} 单位不一致`);
        assert.equal(front.min, back.min, `${key} 下限不一致（后端 ${back.min} / 前端 ${front.min}）`);
        assert.equal(front.max, back.max, `${key} 上限不一致（后端 ${back.max} / 前端 ${front.max}）`);
    }

    const extraKeys = Object.keys(frontend).filter(
        (key) => !backendKeys.includes(key) && !['weight', 'heartRate'].includes(key)
    );
    assert.deepEqual(extraKeys, [], `前端存在后端没有的指标: ${extraKeys.join(', ')}`);
});

test('前端病种指标档案与后端一致', () => {
    const source = readFrontendSource();
    assert.ok(source, `找不到前端指标定义文件: ${FRONTEND_FILE}`);

    const frontend = parseFrontendProfiles(source);
    const backendTypes = Object.keys(DISEASE_INDICATOR_PROFILES);

    assert.ok(backendTypes.length > 0, '后端病种档案为空');
    assert.equal(
        Object.keys(frontend).length,
        backendTypes.length,
        `病种数量不一致（后端 ${backendTypes.length} / 前端 ${Object.keys(frontend).length}）`
    );

    for (const type of backendTypes) {
        const back = DISEASE_INDICATOR_PROFILES[type];
        const front = frontend[type];

        assert.ok(front, `前端缺少病种 ${type}`);
        assert.deepEqual(front.core, back.core, `${type} 的 core 指标不一致`);
        assert.deepEqual(front.recommended, back.recommended, `${type} 的 recommended 指标不一致`);
    }
});

test('前端已移除重复的 INDICATOR_REFS 副本', () => {
    const indicatorFile = path.join(__dirname, '../../client/src/utils/indicator.js');
    if (!fs.existsSync(indicatorFile)) return;

    const source = fs.readFileSync(indicatorFile, 'utf8');
    assert.ok(
        !/export const INDICATOR_REFS/.test(source),
        'client/src/utils/indicator.js 又出现了第二份参考范围定义，请统一到 thyroidIndicators.js'
    );
});
