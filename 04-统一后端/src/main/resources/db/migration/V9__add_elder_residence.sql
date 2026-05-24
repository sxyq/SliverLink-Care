SET @add_residence_column = IF (
  EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'elder'
      AND COLUMN_NAME = 'residence_enc'
  ),
  'SELECT 1',
  'ALTER TABLE elder ADD COLUMN residence_enc TEXT AFTER age'
);

PREPARE add_residence_column_stmt FROM @add_residence_column;
EXECUTE add_residence_column_stmt;
DEALLOCATE PREPARE add_residence_column_stmt;

UPDATE elder
SET residence_enc = '滨江社区 1 栋 1 单元'
WHERE id = 'elder-001' AND (residence_enc IS NULL OR residence_enc = '');

UPDATE elder
SET residence_enc = '滨江社区 2 栋 3 单元'
WHERE id = 'elder-002' AND (residence_enc IS NULL OR residence_enc = '');
