export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

export function maskName(name: string): string {
  if (!name || name.length <= 1) return name;
  return name[0] + '*'.repeat(name.length - 1);
}

export function maskArchiveNo(no: string): string {
  if (!no || no.length <= 6) return no;
  return no.slice(0, 3) + '****' + no.slice(-3);
}
