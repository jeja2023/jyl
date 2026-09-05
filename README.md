# 甲友乐 JYL

甲友乐是一款面向甲状腺病友的指标管理与健康监测工具，帮助用户记录检查指标、观察趋势、管理用药、复查提醒、家庭成员档案和健康资料分享。

重要声明：本项目不是医疗器械，不提供医疗诊断或治疗建议。应用内的百科、提示、趋势分析和建议仅用于健康管理参考，任何医疗决策都应咨询专业医生。

## 当前版本

当前版本：`1.8.13`

本版本集中修复全面检查列出的 9 项问题：Docker 镜像携带本地密钥、本人与家庭成员健康记录混合分析、账号注销未真正删除数据、限流与审计 IP 可被转发头伪造、迁移自检漏掉关键字段、生产依赖命中高危公告、用药依从率失真、服务在数据库就绪前监听、测试与工程守卫不足。

本次为前端与后端联合更新，且**必须后端先行**：新增了 `TRUST_PROXY`、`APP_PUBLIC_BASE_URL` 环境变量并需要重建 Docker 镜像。因此 `jyl-1.8.13-193.wgt` 虽已打包，但 `storage/app-updates/manifest.json` 的 `enabled` 暂置为 `false`，后端部署完成后再开闸下发。

- 密钥外泄：新增根目录 `.dockerignore`，阻断 `server/.env`、`docker/.env_docker`、`certs/` 进入构建上下文。**已构建过旧镜像的部署必须轮换全部凭据。**
- 数据归属：首页、洞察、复查建议、监测方案默认只统计本人数据，跨成员汇总需显式传 `memberId=all`；本人的自定义参考范围恢复生效。
- 账号注销：新增 `POST /api/auth/account/delete`，在事务内删除全部个人健康数据与上传图片，百科与操作日志按隐私政策做匿名化。此前设置页只是本地提示、服务端不做任何删除。
- 来源 IP：`TRUST_PROXY` 默认关闭，只认可信代理追加的最后 N 跳；审计日志不再直接读 `x-real-ip` / `x-forwarded-for`。
- 依从率：按计划归属逐日核算，停用或改规则不再返回 200% / 300%，并做 100% 上限截断。
- 健康检查：`/api/health` 在数据库断连时返回 **503**，服务改为等数据库就绪后才监听端口。
- 依赖安全：koa / sequelize / mysql2 / nodemailer / uuid 全部升级，`npm audit` 由 12 high + 4 moderate 降至 **0 vulnerabilities**；Docker 基础镜像升到 `node:24-alpine`。
- 工程守卫：新增前后端 ESLint、GitHub Actions CI，发布自检会在 `.dockerignore` 缺少密钥排除项时直接失败。测试从 75 个增加到 116 个。
- 自动更新：`client/src/manifest.json` 已同步为 `1.8.13 / 193`，`storage/app-updates/manifest.json` 已指向 `jyl-1.8.13-193.wgt`（默认未开启下发）。
- 发布文档：详见 `更新日志.md`、`部署说明.md`、`ANDROID_APK_BUILD.md` 和 `APP_RELEASE_CHECKLIST.md`。

升级提示：必须补充 `TRUST_PROXY`、`TRUST_PROXY_HOPS`、`APP_PUBLIC_BASE_URL` 三个环境变量；`npm run migrate:check` 已改为按模型定义全量比对，可能报出此前从未发现的缺列，请补迁移后再上线。完整顺序见 `部署说明.md`。

## 核心功能

- 指标记录：支持甲状腺相关化验指标、超声、体征和备注记录。
- 趋势分析：按指标查看历史趋势、异常状态和变化方向。
- 检查记录：集中管理历史检查记录，支持详情查看和导出。
- OCR 识别与复核：检查报告识别后进入复核流程，确认后再入库。
- 用药管理：记录用药计划、服药打卡、漏服和补签。
- 复查提醒：根据记录和管理计划生成复查提醒。
- 家庭成员：支持为家庭成员建立独立健康档案。
- 分享管理：支持面向医生或家属的记录分享、撤销和访问控制。
- 百科交流：支持甲状腺相关知识内容浏览与投稿。
- 管理后台：支持用户、日志、百科审核等后台管理能力。

## 项目结构

```text
jyl/
├─ client/                    # 前端，uni-app + Vue 3
│  ├─ src/
│  │  ├─ pages/               # 页面
│  │  ├─ components/          # 组件
│  │  ├─ config/              # 前端业务配置
│  │  ├─ store/               # Pinia 状态
│  │  ├─ static/              # 静态资源
│  │  └─ utils/               # 工具方法
│  ├─ scripts/                # App 图标、App 构建、wgt 构建脚本
│  └─ package.json
├─ server/                    # 后端，Koa + Sequelize
│  ├─ controllers/            # 控制器
│  ├─ models/                 # 数据模型
│  ├─ routes/                 # 路由
│  ├─ scripts/                # 运维与热更新发布脚本
│  ├─ services/               # 服务层
│  ├─ test/                   # 后端测试
│  ├─ utils/                  # 工具方法
│  └─ package.json
├─ storage/                   # 运行期文件，报告、日志、App 更新包、APK
├─ docker/                    # Docker 部署配置
├─ ANDROID_APK_BUILD.md       # Android APK 与热更新发布指南
├─ APP_RELEASE_CHECKLIST.md   # App 发布检查清单
├─ 部署说明.md                # 生产部署说明
└─ 更新日志.md                # 更新日志
```

## 技术栈

前端：

- Vue 3
- uni-app
- uview-plus
- Pinia
- luch-request
- Vite

后端：

- Node.js
- Koa
- Sequelize
- MySQL
- JWT
- node:test

## 本地开发

### 环境要求

- Node.js 22 或更高版本（Node 20 已于 2026-04-30 结束维护，Docker 镜像使用 `node:24-alpine`）
- MySQL 5.7 或更高版本，推荐 MySQL 8
- npm

### 安装依赖

```bash
cd server
npm install

cd ../client
npm install
```

### 配置后端环境变量

在 `server` 目录准备 `.env` 文件，至少需要配置：

```text
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=your_database
DB_USER=your_user
DB_PASS=your_password
JWT_SECRET=your_jwt_secret
```

更多部署配置请参考 `部署说明.md`。

### 启动后端

```bash
cd server
npm run start
```

开发时也可以使用：

```bash
cd server
npm run dev
```

如果 Windows 本地环境运行 `nodemon` 出现 `spawn EPERM`，可临时使用 `npm run start`。

### 启动前端 H5

```bash
cd client
npm run dev:h5
```

本地访问：

```text
http://localhost:5173
```

如果使用后端托管后的 H5 构建产物，则访问：

```text
http://localhost:3000
```

## 构建

### 构建 H5

```bash
cd client
npm run build:h5
```

构建产物：

```text
client/dist/build/h5
```

后端会在生产模式下托管该目录。

### 构建 App 离线资源

```bash
cd client
npm run build:app
```

### 生成 wgt 热更新包

```bash
cd client
npm run build:wgt
```

或一次性执行：

```bash
cd client
npm run release:app
```

## Android APK 发布

当前 Android 包信息：

```text
AppID: __UNI__F18FC4D
包名: com.jiayoule.app
versionName: 1.8.13
versionCode: 193
生产 API: https://jyl.880301.xyz
```

APK 首次安装包通过 HBuilderX 或 Linux HBuilderX CLI 打包。正式发布必须使用自有签名证书，不使用测试证书。

登录页 APK 下载入口不写死版本号：未配置 `APK_DOWNLOAD_URL` 时，后端扫描 `storage/app-releases` 目录，取其中版本号最高的 APK，例如：

```text
/storage/app-releases/jyl-<版本号>.apk
```

因此新打的 APK 放进该目录即可生效，不需要改代码。目录为空时会回退到内置的默认地址。

本地测试时会使用当前本地域名，例如：

```text
http://localhost:3000/storage/app-releases/jyl-1.8.6.apk
```

生产环境默认使用同源路径。如果需要使用 CDN 或对象存储，可在后端环境变量中设置：

```text
APK_DOWNLOAD_URL=https://your-domain/path/to/jyl-1.8.12.apk
```

## App 热更新

普通前端资源更新优先发布 wgt 热更新包，用户安装 APK 后不需要重复下载安装。

发布 wgt 示例：

```bash
cd server
npm run app:update:publish -- ..\client\dist\release\jyl-1.8.13-193.wgt 1.8.13 193 "修复健康数据混算、账号注销与来源IP伪造"
```

需要"先打包但暂不下发"时加 `--disabled`（写入 `enabled: false`），后端部署完成后把 `storage/app-updates/manifest.json` 的 `enabled` 改为 `true` 即开闸。1.8.13 就是这样发布的：改动依赖新环境变量与重建镜像，App 不能先于后端更新。

发布前自检：

```bash
cd server
npm run release:check
```

自检会校验三处版本号一致性、热更新包存在性，以及 `.dockerignore` 是否排除了 `server/.env` 等密钥文件——最后这条缺失时直接失败，不是警告。

以下变更需要重新打 APK：

- Android 权限变化
- 原生模块或原生插件变化
- 包名、证书、DCloud AppID 变化
- App 图标、启动图等原生资源变化
- 生产 API 地址变化
- 首包版本过旧，无法兼容新的 wgt 资源

详细流程见 `ANDROID_APK_BUILD.md`。

## 测试与校验

后端一键校验（lint + 单元测试 + 生产依赖高危审计）：

```bash
cd server
npm run verify
```

也可以分开执行：

```bash
cd server
npm test           # 116 个单元测试
npm run lint       # ESLint
npm run audit:prod # 生产依赖出现 high/critical 即失败
```

数据库迁移自检（按模型定义全量比对，缺任何字段都会失败）：

```bash
cd server
npm run migrate:check
```

发布自检（版本号一致性 + 热更新包 + `.dockerignore` 密钥守卫）：

```bash
cd server
npm run release:check
```

前端校验：

```bash
cd client
npm run lint
npm run build:h5
```

上述检查同时由 GitHub Actions 在 push / PR 时执行，定义见 `.github/workflows/ci.yml`。

App 发布前建议同时检查：

- `APP_RELEASE_CHECKLIST.md`
- `ANDROID_APK_BUILD.md`
- `更新日志.md`

## 生产部署

生产部署主要流程：

1. 拉取最新代码。
2. 安装前后端依赖。
3. 配置后端 `.env`。
4. 执行数据库迁移。
5. 构建 H5。
6. 启动后端服务。
7. 配置 Nginx、HTTPS、域名和进程守护。

详细步骤见 `部署说明.md`。

## 许可证

MIT License
