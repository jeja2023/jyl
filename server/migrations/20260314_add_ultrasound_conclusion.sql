-- 迁移：新增超声提示/结论字段

ALTER TABLE HealthRecords
  ADD COLUMN IF NOT EXISTS conclusion TEXT COMMENT '超声提示/结论';

-- 回滚（如需）
-- ALTER TABLE HealthRecords DROP COLUMN conclusion;
