-- 迁移：新增登录锁定字段与 OCR 复核数据
-- 假设 MySQL 8.0+。如表名不同请先调整。

-- 执行
ALTER TABLE Users
  ADD COLUMN IF NOT EXISTS loginFailCount INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loginLockedUntil DATETIME NULL;

ALTER TABLE HealthRecords
  ADD COLUMN IF NOT EXISTS ocrReview TEXT NULL;

-- 回滚（如需）
-- ALTER TABLE Users
--   DROP COLUMN loginFailCount,
--   DROP COLUMN loginLockedUntil;
--
-- ALTER TABLE HealthRecords
--   DROP COLUMN ocrReview;
