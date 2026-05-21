# App 发布检查清单

当前版本：`1.8.2`（`versionCode: 182`）

## 首次 APK

- 后端已部署到 `https://jyl.880301.xyz`
- `client/.env.production` 已配置正式 `VITE_API_BASE`
- `client/src/manifest.json` 已配置 DCloud AppID
- Android 包名已确定且不会随意变更
- `versionName` / `versionCode` 已递增到 `1.8.2 / 182`
- Android 签名证书已备份
- 权限列表已按最小权限原则检查
- Android 图标均为英文文件名 PNG
- `npm run build:app` 构建成功
- HBuilderX 或 Linux HBuilderX CLI 正式 APK 打包成功
- APK 已上传或同步到 `storage/app-releases/jyl-1.8.2.apk`
- 登录页“下载安卓版”入口可访问并能下载 APK
- 真机完成核心流程验收
- 热更新检查接口可访问

## wgt 热更新

- 本次更新不涉及原生权限、模块、插件、包名、证书、图标、启动图、生产 API 地址
- `client/src/manifest.json` 的 `versionCode` 已递增
- `npm run release:app` 构建成功
- `client/dist/release/*.wgt.json` 中 size、md5、sha256 已生成
- `npm run app:update:publish` 发布成功
- `storage/app-updates/manifest.json` 的版本号正确
- 真机验证可发现更新、下载、安装并重启
- 强制更新仅用于兼容性或安全修复

## 1.8.2 发布重点

- 用药提醒晚于计划时间且未打卡时持续提醒，早于计划时间不提醒
- 同一种药支持按周剂量配置不同服药日和不同剂量
- 新增服药计划弹窗长内容可滚动
- 拍照上传先保存图片再执行 OCR，识别失败不再导致图片丢失
- 已执行数据库迁移并通过 `npm run migrate:check`
