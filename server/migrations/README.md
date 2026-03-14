# 数据库迁移（Sequelize CLI）

## 前置条件
- 设置环境变量：`DB_HOST`、`DB_PORT`、`DB_NAME`、`DB_USER`、`DB_PASS`
- 在 `server/` 目录安装依赖：
  - `npm install`
  - 若服务器设置了 `NODE_ENV=production`，请使用 `npm install --include=dev` 以安装 `sequelize-cli`

## 执行迁移
在 `server/` 目录：

```bash
npm run migrate
```

## 回滚（仅回滚最近一次迁移）

```bash
npm run migrate:undo
```

## 常见问题
- 提示 `'sequelize-cli' 不是内部或外部命令`：
  - 先在 `server/` 目录执行 `npm install` 或 `npm install --include=dev`
  - 或直接使用 `npx sequelize-cli db:migrate`

## 注意事项
- 迁移脚本使用的表名是 `Users` 和 `HealthRecords`（Sequelize 默认复数表名）。
- 如果生产库表名不同，请先修改迁移文件再执行。

## 迁移文件说明
- `20260314_add_login_lock_and_ocr_review.js`：新增登录锁定字段与 OCR 复核字段
- `20260314_add_family_and_medication_log.js`：新增家庭成员、成员关联字段与服药打卡记录
- `20260314_add_ultrasound_conclusion.js`：新增超声提示/结论字段
