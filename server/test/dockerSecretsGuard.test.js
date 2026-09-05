const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

/**
 * 构建上下文的密钥外泄守卫。
 *
 * 背景：仓库此前没有任何 .dockerignore，docker/Dockerfile 的
 * `COPY server/ ./server/` 会把 server/.env 一起复制并固化进镜像层——
 * JWT_SECRET、数据库密码、ADMIN_PASS、腾讯云与 SMTP 凭据随镜像分发，
 * 运行时用 env_file 覆盖也删不掉已经写进层里的那一份。
 *
 * 这里既校验排除清单本身，也真的把某一条排除项拿掉、确认 release-check
 * 会失败——否则这个守卫哪天被改成只打印警告，谁也不会发现。
 */

const rootDir = path.join(__dirname, '../..');
const dockerignorePath = path.join(rootDir, '.dockerignore');
const dockerfilePath = path.join(rootDir, 'docker/Dockerfile');
const releaseCheckPath = path.join(__dirname, '../scripts/release-check.js');

const readLines = (file) => fs.readFileSync(file, 'utf8').split(/\r?\n/).map((line) => line.trim());

test('.dockerignore 存在且排除全部密钥与依赖目录', () => {
    assert.ok(fs.existsSync(dockerignorePath), '构建上下文根目录必须有 .dockerignore');

    const lines = readLines(dockerignorePath);
    const required = ['server/.env', 'docker/.env_docker', 'certs/', '**/node_modules', 'storage/'];
    required.forEach((entry) => {
        assert.ok(
            lines.includes(entry),
            `.dockerignore 必须排除 ${entry}`
        );
    });
});

test('.dockerignore 不会误排除前端构建需要的文件', () => {
    const lines = readLines(dockerignorePath);
    // client/.env.production 只含公开域名，前端 build:h5 要读它；
    // *.example 是给运维照抄的模板，都不能被无脑的 **/.env* 规则扫掉
    assert.ok(!lines.includes('**/.env*'), '不要用过宽的通配，会把 .env.production 与 .example 一起排除');
    assert.ok(!lines.includes('client/.env.production'));
});

test('Dockerfile 用 npm ci 且源码 COPY 在依赖 COPY 之前', () => {
    const content = fs.readFileSync(dockerfilePath, 'utf8');

    assert.ok(/npm ci/.test(content), '依赖安装必须用 npm ci，保证构建可复现');
    assert.ok(!/npm\s+i\s*$/m.test(content), '不应残留 npm i');

    // 顺序很重要：宿主机是 Windows，node_modules 一旦被 COPY 覆盖进 alpine，
    // 带原生绑定的包会直接跑不起来
    const srcCopy = content.indexOf('COPY server/ ./server/');
    const depsCopy = content.indexOf('COPY --from=server-deps');
    assert.ok(srcCopy > -1 && depsCopy > -1, 'Dockerfile 应同时包含源码与依赖的 COPY');
    assert.ok(srcCopy < depsCopy, '源码 COPY 必须在依赖 COPY 之前，否则上下文里的依赖会覆盖容器内依赖');

    assert.ok(/HEALTHCHECK/.test(content), '运行镜像应带 HEALTHCHECK');
});

test('release-check 在 .dockerignore 缺少密钥排除项时必须失败', () => {
    const original = fs.readFileSync(dockerignorePath, 'utf8');
    const weakened = original
        .split(/\r?\n/)
        .filter((line) => line.trim() !== 'server/.env')
        .join('\n');

    let exitCode = 0;
    let output = '';
    try {
        fs.writeFileSync(dockerignorePath, weakened);
        execFileSync(process.execPath, [releaseCheckPath], { encoding: 'utf8', stdio: 'pipe' });
    } catch (err) {
        exitCode = err.status ?? 1;
        output = `${err.stdout || ''}${err.stderr || ''}`;
    } finally {
        fs.writeFileSync(dockerignorePath, original);
    }

    assert.equal(exitCode, 1, '缺少 server/.env 排除项时发布自检必须以非零码退出');
    assert.match(output, /server\/\.env/, '失败信息要点明是哪一条排除项缺了');
});

test('release-check 在完整配置下通过', () => {
    const result = execFileSync(process.execPath, [releaseCheckPath], { encoding: 'utf8', stdio: 'pipe' });
    assert.match(result, /发布自检通过/);
});
