# Android APK 与热更新发布指南

当前版本：`1.8.10`（`versionCode: 190`）

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
- 不涉及原生壳的安全访问策略调整，例如报告图片改为后端鉴权接口

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
- `versionName` 为 `1.8.9`
- `versionCode` 为 `189`
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

- 将正式 APK 同步到 `storage/app-releases/jyl-1.8.10.apk`
- 登录页 H5 会显示“下载安卓版”，用户可直接下载安装包
- 如果使用独立 CDN 或对象存储，可通过 `APK_DOWNLOAD_URL` 环境变量覆盖下载地址

7. 真机验收：

- 登录/退出登录
- 指标录入、历史记录、趋势图
- 图片上传、OCR、OCR 复核
- 分享、家庭成员、用药提醒
- `/api/app/update/check` 热更新检查

## 1.8.10 自动更新设置

本次 `1.8.10 / 190` 只修改前端页面显示、参考范围判定和样式，不涉及原生权限、模块、插件、包名、证书、图标、启动图或生产 API 地址，因此可走 WGT 热更新，不需要重新打 APK。

自动更新必须同时满足：

- `client/src/manifest.json` 已更新为 `versionName: 1.8.10`、`versionCode: 190`
- 发布后的 `storage/app-updates/manifest.json` 同样为 `1.8.10 / 190`
- manifest 中 `wgtUrl` 指向 `/storage/app-updates/jyl-1.8.10-190.wgt`
- 从已安装 `1.8.9 / 189` 的 Android App 发起检查时，后端返回 `hasUpdate: true`

注意：后端更新检查会阻止 `versionCode` 倒退或同版本覆盖。若只是覆盖 `jyl-1.8.9-189.wgt`，已装 `1.8.9 / 189` 的用户不会收到这次修复。

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
client/dist/release/jyl-1.8.10-190.wgt
client/dist/release/jyl-1.8.10-190.wgt.json
```

3. 发布到后端：

```bash
cd server
npm run app:update:publish -- ..\client\dist\release\jyl-1.8.10-190.wgt 1.8.10 190 "修复记录详情参考范围显示并优化趋势页单位字号"
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
- 通过受限的 `/storage/app-updates` 静态服务提供下载

4. 发布自检：

```bash
cd server
npm run release:check
```

发布自检会检查：

- `server/package.json`、`client/package.json` 与 `client/src/manifest.json` 版本一致
- `storage/app-updates/manifest.json` 存在且版本号正确
- manifest 指向的 wgt 包真实存在
- 依赖版本未使用容易漂移的 `latest`

## 存储与隐私边界

后端只允许公开以下运行期目录：

- `/storage/app-updates`：wgt 热更新包与 manifest
- `/storage/app-releases`：APK 首次安装包

以下目录不得通过静态服务、Nginx、CDN 或对象存储直接公开：

- `storage/reports`：用户上传的化验单、B 超等健康报告图片
- `storage/logs`：服务端运行日志

报告图片统一通过后端鉴权接口访问：

```text
GET /api/report/image/:filename
```

登录用户访问时需要本人 token；分享页访问时需要有效分享 token，且分享未过期、未撤销、未隐藏图片。

## 热更新用户体验

App 启动后会请求：

```text
GET /api/app/update/check?platform=android&versionName=1.8.9&versionCode=189
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
- wgt 热更新包通过后端 `/storage/app-updates` 静态服务分发
- 报告图片不再通过 `/storage/reports` 直接分发，必须走 `/api/report/image/:filename`
