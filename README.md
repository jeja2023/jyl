# 甲友乐 JYL

甲友乐是一款面向甲状腺病友的指标管理与健康监测工具，帮助用户记录检查指标、观察趋势、管理用药、复查提醒、家庭成员档案和健康资料分享。

重要声明：本项目不是医疗器械，不提供医疗诊断或治疗建议。应用内的百科、提示、趋势分析和建议仅用于健康管理参考，任何医疗决策都应咨询专业医生。

## 当前版本

当前版本：`1.8.12`

本版本修复健康记录归属越权、OCR 指标误识别与化验空值统计问题，并补充登录状态失效机制。

本次为前端与后端联合更新，Android 使用 `jyl-1.8.12-192.wgt` 热更新下发；由于后端按 `versionCode` 判断是否需要更新，已安装 `1.8.11 / 191` 的用户必须收到新的 `1.8.12 / 192` 包，不能复用旧 WGT。

- 记录归属：更新健康记录改为按字段白名单取值，请求体无法再篡改记录所属账号。
- OCR 识别：指标别名统一加词边界，修复「总蛋白 TP」被误识别为血磷等问题，并标记明显异常的读数供复核。
- 登录状态：新增退出登录接口，登出与修改密码后此前签发的令牌立即失效。
- 数据统计：化验份数、`hasLab` 过滤与趋势查询不再把空字符串当作有效值。
- 分享链接：旧版 JWT 分享链接默认关闭，可通过 `SHARE_LEGACY_JWT_ENABLED` 临时兼容存量。
- 自动更新：`client/src/manifest.json` 已同步为 `1.8.12 / 192`，`storage/app-updates/manifest.json` 已指向 `jyl-1.8.12-192.wgt`。
- 发布文档：详见 `更新日志.md`、`ANDROID_APK_BUILD.md` 和 `APP_RELEASE_CHECKLIST.md`。

升级提示：本版本新增 `Users.tokenInvalidBefore` 字段，部署前必须先执行 `npm run migrate`，否则服务会因缺少该列而报错。

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

- Node.js 16 或更高版本
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
versionName: 1.8.12
versionCode: 192
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
npm run app:update:publish -- ..\client\dist\release\jyl-1.8.12-192.wgt 1.8.12 192 "修复记录归属越权与OCR指标误识别"
```

发布前自检：

```bash
cd server
npm run release:check
```

以下变更需要重新打 APK：

- Android 权限变化
- 原生模块或原生插件变化
- 包名、证书、DCloud AppID 变化
- App 图标、启动图等原生资源变化
- 生产 API 地址变化
- 首包版本过旧，无法兼容新的 wgt 资源

详细流程见 `ANDROID_APK_BUILD.md`。

## 测试与校验

后端测试：

```bash
cd server
npm test
```

数据库迁移自检：

```bash
cd server
npm run migrate:check
```

发布自检：

```bash
cd server
npm run release:check
```

前端构建校验：

```bash
cd client
npm run build:h5
```

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
