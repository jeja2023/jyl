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

## v1.7.0 迁移补充（2026-05-14）

发布 v1.7.0 前请先备份数据库，并在 `server/` 目录执行：

```bash
npm run migrate
```

本次新增迁移文件：
- `20260514_add_share_links.js`：新增 `ShareLinks` 表，用于医生/家属分享链接治理，包含 token 哈希、分享类型、有效期、撤销状态、访问次数、最后访问时间、最后访问 IP 和字段脱敏选项。
- `20260514_add_expansion_fields.js`：新增或补充扩展字段，包括家庭成员独立参考范围、复查周期、OCR/洞察/分享相关配置字段。
- `20260514_add_user_trend_indicators.js`：新增 `Users.trendIndicators`，保存用户自定义趋势指标。
- `20260514_expand_patient_types_and_lab_fields.js`：将用户/家庭成员病种字段扩展为字符串，并为 `HealthRecords` 增加 TSI、TBAb、CEA、25-OH-D、白蛋白、ALP、肝功能、血常规、血脂、炎症等扩展指标字段。
- `20260515_add_treatment_stage_and_medication_adjustments.js`：新增个人/家庭成员治疗阶段字段，并新增 `MedicationAdjustments` 用药剂量调整历史表。
- `20260515_expand_medication_logs_for_makeup.js`：扩展 `MedicationLogs`，新增补签来源、备注、药名快照和剂量快照，支持服药补签与历史记录追踪。

迁移后可执行结构自检：

```bash
npm run migrate:check
```

生产环境建议设置 `DB_SYNC_ALTER=false`，不要依赖自动同步改表；结构变更统一通过迁移完成。迁移完成后再重启后端服务。
