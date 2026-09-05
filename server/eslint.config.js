const js = require('@eslint/js');

/**
 * 服务端 ESLint 配置（flat config）。
 *
 * 之前整个仓库没有任何 lint 配置，未使用的变量、写错的标识符、
 * 漏掉的 await 这类问题只能靠人眼看出来。这里的规则刻意收得克制：
 * 只开能真正指出缺陷的项，避免变成一堆格式噪音把有用的告警冲掉。
 */

const nodeGlobals = {
    require: 'readonly',
    module: 'writable',
    exports: 'writable',
    __dirname: 'readonly',
    __filename: 'readonly',
    process: 'readonly',
    console: 'readonly',
    Buffer: 'readonly',
    URL: 'readonly',
    URLSearchParams: 'readonly',
    TextEncoder: 'readonly',
    TextDecoder: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
    setInterval: 'readonly',
    clearInterval: 'readonly',
    setImmediate: 'readonly',
    queueMicrotask: 'readonly',
    structuredClone: 'readonly',
    fetch: 'readonly',
    AbortController: 'readonly',
    globalThis: 'readonly'
};

module.exports = [
    {
        ignores: ['node_modules/**', 'migrations/*.sql']
    },
    js.configs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'commonjs',
            globals: nodeGlobals
        },
        rules: {
            // 未使用的变量往往是重构残留或写错了名字
            'no-unused-vars': ['error', {
                args: 'none',
                caughtErrors: 'none',
                varsIgnorePattern: '^_'
            }],
            // Koa 的惯用写法就是 await next() 之后再写 ctx.status / ctx.body，
            // 这条规则会把每一处都报成竞态，全是误报，只能关掉
            'require-atomic-updates': 'off',
            'no-await-in-loop': 'off', // 迁移自检、注销清理都需要顺序执行
            'no-return-await': 'error',
            'no-throw-literal': 'error',
            'no-promise-executor-return': 'error',
            'no-constant-binary-expression': 'error',
            'no-self-compare': 'error',
            'no-unmodified-loop-condition': 'error',
            'no-unreachable-loop': 'error',
            'no-template-curly-in-string': 'warn',
            // 字符类里多写的反斜杠虽然无害，但会掩盖真正写错的转义，保留为提示
            'no-useless-escape': 'warn',
            eqeqeq: ['warn', 'smart'],
            'prefer-const': 'warn'
        }
    },
    {
        // 测试文件里 node:test 的钩子与断言
        files: ['test/**/*.js'],
        languageOptions: {
            globals: { ...nodeGlobals }
        }
    }
];
