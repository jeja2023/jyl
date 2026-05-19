# 甲友乐 JYL

甲友乐是一款面向甲状腺病友的指标管理与健康监测工具，帮助用户记录检查指标、观察趋势、管理用药、复查提醒、家庭成员档案和健康资料分享。

重要声明：本项目不是医疗器械，不提供医疗诊断或治疗建议。应用内的百科、提示、趋势分析和建议仅用于健康管理参考，任何医疗决策都应咨询专业医生。

## 当前版本

当前版本：`1.8.0`

本版本重点完成 Android APK 首包发布与后续热更新链路，适用于“不上架应用商店，直接让用户下载安装 APK”的场景。

- Android 正式打包：支持 HBuilderX 云打包与 Linux HBuilderX CLI，已纳入 DCloud AppID、正式包名、自有签名证书和 `arm64-v8a` 发布流程。
- 生产接口地址：App 构建使用 `https://jyl.880301.xyz`，避免移动端误连 `localhost:3000`。
- 一次安装，后续热更新：新增 wgt 更新检查、下载、安装和重启机制；普通前端更新无需重新安装 APK。
- APK 下载入口：H5 登录页提供“下载安卓版”，默认下载 `/storage/app-releases/jyl.apk`。
- 打包稳定性：生成标准 Android PNG 图标，移除中文文件名静态资源，修复 HBuilderX 图标与文件名校验问题。
- 发布文档：详见 `ANDROID_APK_BUILD.md` 和 `APP_RELEASE_CHECKLIST.md`。

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
versionName: 1.8.0
versionCode: 180
生产 API: https://jyl.880301.xyz
```

APK 首次安装包通过 HBuilderX 或 Linux HBuilderX CLI 打包。正式发布必须使用自有签名证书，不使用测试证书。

登录页 APK 下载入口默认指向：

```text
/storage/app-releases/jyl.apk
```

本地测试时会使用当前本地域名，例如：

```text
http://localhost:3000/storage/app-releases/jyl.apk
```

生产环境默认使用同源路径。如果需要使用 CDN 或对象存储，可在后端环境变量中设置：

```text
APK_DOWNLOAD_URL=https://your-domain/path/to/jyl.apk
```

## App 热更新

普通前端资源更新优先发布 wgt 热更新包，用户安装 APK 后不需要重复下载安装。

发布 wgt 示例：

```bash
cd server
npm run app:update:publish -- ..\client\dist\release\jyl-1.8.0-180.wgt 1.8.0 180 "发布说明"
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
