/**
 * 手机号脱敏工具
 * 将 11 位手机号中间 4 位替换为 *
 * 例：13812345678 -> 138****5678
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length !== 11) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

/**
 * 身份证号脱敏
 * 保留前 3 位和后 4 位
 */
export function maskIdCard(idCard: string): string {
  if (!idCard || idCard.length < 8) return idCard;
  return idCard.replace(/(.{3}).*(.{4})/, '$1********$2');
}

/**
 * 姓名脱敏
 * 保留姓，名替换为 *
 */
export function maskName(name: string): string {
  if (!name || name.length === 0) return name;
  if (name.length === 1) return name;
  if (name.length === 2) return name[0] + '*';
  return name[0] + '*'.repeat(name.length - 1);
}
