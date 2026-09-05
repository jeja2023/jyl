# App 发布检查清单

当前版本：`1.8.13`（`versionCode: 193`）

## 首次 APK

- 后端已部署到 `https://jyl.880301.xyz`
- `client/.env.production` 已配置正式 `VITE_API_BASE`
- `client/src/manifest.json` 已配置 DCloud AppID
- Android 包名已确定且不会随意变更
- `versionName` / `versionCode` 已递增到 `1.8.13 / 193`
- Android 签名证书已备份
- 权限列表已按最小权限原则检查
- Android 图标均为英文文件名 PNG
- `npm run build:app` 构建成功
- HBuilderX 或 Linux HBuilderX CLI 正式 APK 打包成功
- APK 已上传或同步到 `storage/app-releases/jyl-<版本号>.apk`
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
- `storage/app-updates/manifest.json` 已指向 `jyl-1.8.13-193.wgt`
- 从 `1.8.12 / 192` 真机检查更新时可发现 `1.8.13 / 193`
- `npm run release:check` 发布自检通过
- 真机验证可发现更新、下载、安装并重启
- 强制更新仅用于兼容性或安全修复
- **后端接口有变更时，必须确认后端已先行部署，再把 `manifest.json` 的 `enabled` 置为 `true`**

## 安全发布检查

- 根目录 `.dockerignore` 存在，且排除 `server/.env`、`docker/.env_docker`、`certs/`、`node_modules`（`npm run release:check` 会硬校验，缺失即失败）
- 构建过旧镜像的部署已轮换 `JWT_SECRET`、数据库密码、`ADMIN_PASS` 及第三方凭据，并删除旧镜像与远端历史 tag
- `/storage` 仅公开 `app-updates` 与 `app-releases`，不公开 `reports` 与 `logs`
- 报告图片通过 `/api/report/image/:filename` 鉴权访问
- 分享页图片访问必须校验有效分享 token，撤销/过期/隐藏图片时不可访问
- 请求日志不记录 `authToken`、`shareToken`、`token` 查询参数
- 生产环境已配置 `CORS_ORIGINS`，或明确接受拒绝带 Origin 的跨域请求
- 生产环境已按实际拓扑设置 `TRUST_PROXY`：有反向代理时为 `true`，端口直接暴露时必须为 `false`
- 生产环境已配置 `APP_PUBLIC_BASE_URL`，避免热更新地址回退到相对路径
- 生产环境未通过 Nginx、CDN 或对象存储额外公开 `storage/logs` 与 `storage/reports`
- `npm run audit:prod` 无 high/critical 公告

## 1.8.13 发布重点

- 本次是安全与数据正确性集中修复，覆盖全面检查列出的 9 项问题
- **必须后端先行**：新增 `TRUST_PROXY`、`TRUST_PROXY_HOPS`、`APP_PUBLIC_BASE_URL` 环境变量，且需要重建 Docker 镜像
- 因此 `jyl-1.8.13-193.wgt` 已打包但 `manifest.json` 的 `enabled` 为 `false`，后端部署完成后再开闸
- App 先于后端热更会出问题：`memberId=self` 会被旧后端当成家庭成员 ID，账号注销接口不存在
- 镜像密钥外泄已修复（新增 `.dockerignore`），已构建旧镜像的部署必须轮换全部凭据
- 首页、洞察、复查建议、监测方案不再混入家庭成员数据，展示的异常数与复查日期会变化
- 服药依从率按计划归属逐日核算，不再出现 200% / 300%，数值可能低于升级前
- `/api/health` 在数据库断连时返回 503，监控按状态码判活现在才有效
- 依赖升级后 `npm audit` 为 0 vulnerabilities，Docker 基础镜像升到 `node:24-alpine`
- 新增账号注销接口，设置页的"注销账号"从此真正删除服务端数据

## 1.8.10 发布重点

- 记录详情页指标卡片会显示本人或家庭成员自定义参考范围
- 详情页颜色、上下箭头和指标建议统一使用有效参考范围，避免显示范围和判定范围不一致
- 指标单位优先使用自定义单位，其次使用报告原始单位，最后回退系统默认单位
- 趋势页相关记录中的指标单位字号缩小，改善截图中单位文字过大的问题
- 本次是前端显示修复，不涉及原生权限、模块、包名、证书或生产 API 地址，可通过 WGT 热更新发布，无需重新打 APK
- App 热更新版本升级为 `1.8.10 / 190`，发布包名为 `jyl-1.8.10-190.wgt`
- 后端更新接口不会下发小于或等于当前 `versionCode` 的更新，因此不能复用 `1.8.9 / 189`

## 1.8.9 发布重点

- 重新发布 Android wgt 热更新包，版本递增到 `1.8.9 / 189`
- 修复热更新清单仍指向旧 wgt 包导致安卓端无法收到新修改的问题
- 本次包包含趋势页参考范围与单位设置、OCR 复核台入口移除等更新
- 趋势页新增当前指标参考范围和单位编辑入口
- 本人档案新增 `referenceRanges`，家庭成员范围随记录带回并优先参与趋势判定
- 趋势图参考带、最新值异常状态和相关记录状态统一优先使用自定义范围
- 首页移除独立 OCR 复核台入口，保留录入页内 OCR 识别与复核闭环
- App 热更新版本升级为 `1.8.9 / 189`

## 1.8.7 发布重点

- 后台操作日志页滚动容器启用增强滚动并固定剩余高度，改善下滑后再上滑吃力的问题
- 操作日志分页增加请求并发保护，避免重复触底时列表重复拼接或页码错乱
- 底部加载状态改为按实际分页结果显示“继续上滑加载”“正在加载日志”“没有更多日志”，不足一页或无数据时不再误导继续加载
- App 热更新版本升级为 `1.8.7 / 187`，用于发布后台日志页体验修复

## 1.8.6 发布重点

- 重新打包 APK 并将默认下载路径更新为 `jyl-1.8.6.apk`，彻底打破 URL 兼容性错误引起的热更新死锁问题
- App 热更新已发布 `jyl-1.8.6-186.wgt`
- 已执行后端单元测试和 H5 页面构建验证，且已全部通过

## 1.8.5 发布重点

- OCR 改为优先识别服务端已保存图片，修复部分手机上传成功但 OCR 失败
- 报告图片改为鉴权访问，`storage/reports` 不再直接公开
- 新增 `npm run release:check`，发布前校验版本号、manifest 与 wgt 包一致性
- `uview-plus` 锁定为 `3.6.29`，避免依赖漂移
- App 热更新已发布 `jyl-1.8.5-185.wgt`
- 已执行后端完整测试、迁移自检、前端 H5 构建和发布自检

## 1.8.4 发布重点

- 用药计划支持开始日期，开始日期前不计漏服
- 支持“每 N 天一次”的间隔服药规则
- 新增服药计划弹窗独立滚动，滑动时不带动下层页面
- 已发布 `jyl-1.8.4-184.wgt` 修复 App 重复导航栏未触发更新问题
- 已执行数据库迁移并通过 `npm run migrate:check`

## 1.8.2 发布重点

- 用药提醒晚于计划时间且未打卡时持续提醒，早于计划时间不提醒
- 同一种药支持按周剂量配置不同服药日和不同剂量
- 新增服药计划弹窗长内容可滚动
- 拍照上传先保存图片再执行 OCR，识别失败不再导致图片丢失
- 已执行数据库迁移并通过 `npm run migrate:check`
