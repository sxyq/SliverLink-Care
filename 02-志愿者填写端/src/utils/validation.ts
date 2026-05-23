export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

export function isNotEmpty(value: string): boolean {
  return value.trim().length > 0;
}
