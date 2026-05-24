UPDATE elder
SET residence_enc = CONCAT(
  '滨江社区 ',
  MOD(CRC32(id), 8) + 1,
  ' 栋 ',
  MOD(CRC32(archive_no), 4) + 1,
  ' 单元 ',
  LPAD(MOD(CRC32(CONCAT(id, archive_no)), 18) + 101, 3, '0'),
  ' 室'
)
WHERE residence_enc IS NULL OR residence_enc = '';
