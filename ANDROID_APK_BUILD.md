# Android APK 与热更新发布指南

当前版本：`1.8.0`（`versionCode: 180`）

目标：用户首次安装 APK 后，后续普通前端更新通过 wgt 热更新完成，用户无需反复卸载或重新安装 APK。

## 生产地址

Android App 构建时读取：

```text
client/.env.production
```

当前生产 API 地址：

```bash
VITE_API_BASE=https://jyl.880301.xyz
```

不要在 App 包里使用 `localhost` 或 `127.0.0.1`，手机上的 localhost 指向手机本机。

## 发布边界

可以走 wgt 热更新：

- 前端页面、样式、交互逻辑
- JS 工具函数、接口调用逻辑
- 普通静态资源

必须重新发布 APK：

- Android 权限、原生模块、原生插件变化
- 包名、证书、DCloud AppID 变化
- App 图标、启动图等原生资源变化
- `manifest.json` 中影响原生壳的配置变化
- `VITE_API_BASE` 生产后端地址变化
- 首包版本过旧，无法兼容新的 wgt 资源

## 首次 APK 发布标准

1. 后端部署到正式 HTTPS 域名 `https://jyl.880301.xyz`。
2. 检查 `client/.env.production` 已配置正式 API 地址。
3. 检查 `client/src/manifest.json`：

- `appid` 已配置 DCloud AppID
- `name` 是正式应用名
- `versionName` 为 `1.8.0`
- `versionCode` 为 `180`
- Android 包名稳定，例如 `com.jiayoule.app`
- Android 只保留 `arm64-v8a`
- 权限只保留业务真实需要的最小集合
- Android 图标使用 `src/static/app-icons/*.png`

4. 构建 App 离线资源：

```bash
cd client
npm install
npm run build:app
```

5. 使用 HBuilderX 或 Linux HBuilderX CLI 打正式 APK：

- 使用正式 Android 签名证书
- 包名保持稳定
- 妥善备份 keystore、别名和密码

6. 发布 APK 下载入口：

- 将正式 APK 同步到 `storage/app-releases/jyl.apk`
- 登录页 H5 会显示“下载安卓版”，用户可直接下载安装包
- 如果使用独立 CDN 或对象存储，可通过 `APK_DOWNLOAD_URL` 环境变量覆盖下载地址

7. 真机验收：

- 登录/退出登录
- 指标录入、历史记录、趋势图
- 图片上传、OCR、OCR 复核
- 分享、家庭成员、用药提醒
- `/api/app/update/check` 热更新检查

## wgt 热更新发布

每次只改前端资源时，按下面流程发布 wgt。

1. 递增 `client/src/manifest.json` 的 `versionName` 和 `versionCode`。
2. 生成 App 资源和 wgt 包：

```bash
cd client
npm run release:app
```

输出文件示例：

```text
client/dist/release/jyl-1.8.0-180.wgt
client/dist/release/jyl-1.8.0-180.wgt.json
```

3. 发布到后端：

```bash
cd server
npm run app:update:publish -- ..\client\dist\release\jyl-1.8.0-180.wgt 1.8.0 180 "发布 Android APK 与热更新能力"
```

强制更新示例：

```bash
npm run app:update:publish -- ..\client\dist\release\jyl-1.8.1-181.wgt 1.8.1 181 "重要兼容性修复" --force --min-version-code 180
```

发布脚本会：

- 复制 wgt 到 `storage/app-updates/`
- 计算 size、md5、sha256
- 写入 `storage/app-updates/manifest.json`
- 阻止 `versionCode` 倒退或重复发布
- 通过现有 `/storage` 静态服务提供下载

## 热更新用户体验

App 启动后会请求：

```text
GET /api/app/update/check?platform=android&versionName=1.8.0&versionCode=180
```

客户端策略：

- 每 6 小时自动检查一次，避免频繁打扰
- 普通更新弹窗提示，用户可以稍后更新
- 强制更新必须更新后继续使用
- 下载时展示进度
- 安装完成后自动重启
- 下载地址必须是 HTTPS，或与 API 服务同源

## 生产部署影响

现有 H5/Web 生产部署不用改变：

- `npm run build:h5` 仍按原流程构建 Web
- 后端部署、Docker、数据库迁移流程保持不变
- `.env.production` 用于生产 App 构建
- wgt 热更新包通过后端现有 `/storage` 静态服务分发
