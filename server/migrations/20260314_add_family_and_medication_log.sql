-- 迁移：新增家庭成员、服药打卡记录、成员关联字段

-- 执行
CREATE TABLE IF NOT EXISTS FamilyMembers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  relation VARCHAR(255),
  gender ENUM('男','女'),
  birthDate DATE,
  patientType ENUM('甲减','甲亢','甲状腺结节','甲癌术后','桥本氏甲状腺炎','其他') DEFAULT '其他',
  note VARCHAR(255),
  UserId INT,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);

ALTER TABLE HealthRecords
  ADD COLUMN IF NOT EXISTS memberId INT NULL;

CREATE TABLE IF NOT EXISTS MedicationLogs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  takenAt DATETIME NOT NULL,
  UserId INT,
  MedicationPlanId INT,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);

-- 回滚（如需）
-- DROP TABLE IF EXISTS MedicationLogs;
-- ALTER TABLE HealthRecords DROP COLUMN memberId;
-- DROP TABLE IF EXISTS FamilyMembers;
