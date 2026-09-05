const js = require('@eslint/js');
const pluginVue = require('eslint-plugin-vue');

/**
 * 前端 ESLint 配置（flat config，CommonJS 写法）。
 *
 * client/package.json 没有声明 "type": "module"，所以配置文件必须是 CommonJS；
 * vite.config.js 能用 import 是因为它由 Vite 自己转译，不走 Node 的加载器。
 *
 * uni-app 项目里 uni / plus / wx 这些是运行时注入的全局对象，
 * 不声明的话 no-undef 会把它们全报成错。
 *
 * 规则只开"能指出缺陷"的部分：模板里写错的变量名、未使用的 import、
 * v-for 缺 key 这类问题在 2000 行的单文件组件里靠人眼几乎不可能稳定发现。
 */

const uniGlobals = {
    uni: 'readonly',
    plus: 'readonly',
    wx: 'readonly',
    getApp: 'readonly',
    getCurrentPages: 'readonly',
    __APP_VERSION__: 'readonly',
    console: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
    setInterval: 'readonly',
    clearInterval: 'readonly',
    document: 'readonly',
    window: 'readonly',
    navigator: 'readonly',
    location: 'readonly',
    URL: 'readonly',
    URLSearchParams: 'readonly',
    Blob: 'readonly',
    FileReader: 'readonly',
    fetch: 'readonly',
    atob: 'readonly',
    btoa: 'readonly',
    // H5 端跑在浏览器里没有 Buffer，代码里是先判存在再用作 atob 的兜底
    Buffer: 'readonly',
    process: 'readonly'
};

module.exports = [
    {
        ignores: [
            'node_modules/**',
            'dist/**',
            'unpackage/**',
            'src/uni_modules/**',
            'scripts/**',
            'eslint.config.js',
            'vite.config.js'
        ]
    },
    js.configs.recommended,
    ...pluginVue.configs['flat/recommended'],
    {
        files: ['**/*.{js,vue}'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: uniGlobals
        },
        rules: {
            'no-unused-vars': ['error', {
                args: 'none',
                caughtErrors: 'none',
                varsIgnorePattern: '^_'
            }],
            'no-constant-binary-expression': 'error',
            'no-self-compare': 'error',
            'no-unreachable-loop': 'error',
            // uni-app 的条件编译注释（// #ifdef H5 ... // #endif）在构建时才被裁剪，
            // ESLint 看到的是两个分支同时存在，会把第二个 return 报成不可达，全是误报
            'no-unreachable': 'off',
            // 字符类里多写的反斜杠无害，保留为提示以免掩盖真正写错的转义
            'no-useless-escape': 'warn',
            // 空的 catch 块在"失败也无所谓"的路径上是常见写法，降级为提示
            'no-empty': ['warn', { allowEmptyCatch: true }],
            eqeqeq: ['warn', 'smart'],

            // uni-app 的页面组件按路由目录命名，不强制多词组件名
            'vue/multi-word-component-names': 'off',
            // 模板格式类规则一律关掉，避免大量存量文件刷屏掩盖真问题
            'vue/max-attributes-per-line': 'off',
            'vue/singleline-html-element-content-newline': 'off',
            'vue/html-self-closing': 'off',
            'vue/html-indent': 'off',
            'vue/html-closing-bracket-newline': 'off',
            'vue/attributes-order': 'off',
            'vue/first-attribute-linebreak': 'off',
            'vue/attribute-hyphenation': 'off',
            'vue/v-on-event-hyphenation': 'off',
            // 这几条是真会出 bug 的
            'vue/require-v-for-key': 'error',
            'vue/no-use-v-if-with-v-for': 'error',
            'vue/no-mutating-props': 'error',
            'vue/no-template-shadow': 'warn'
        }
    }
];
