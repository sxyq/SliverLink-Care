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

function inferContactSuffix(relationship: string): string {
  const normalized = (relationship || '').trim();
  if (!normalized) return '家属';

  const femaleHints = ['女', '母', '妻', '姐', '妹', '姨', '姑', '奶', '姥'];
  if (femaleHints.some((hint) => normalized.includes(hint))) {
    return '女士';
  }

  const maleHints = ['男', '父', '夫', '哥', '弟', '叔', '伯', '爷', '舅'];
  if (maleHints.some((hint) => normalized.includes(hint))) {
    return '男士';
  }

  return '家属';
}

function inferContactSurname(name: string): string {
  const normalized = (name || '').trim();
  if (!normalized) return '某';
  return normalized[0] || '某';
}

export function formatMaskedContact(name: string, relationship: string): string {
  const surname = inferContactSurname(name);
  const suffix = inferContactSuffix(relationship);
  return `${surname}${suffix}`;
}
