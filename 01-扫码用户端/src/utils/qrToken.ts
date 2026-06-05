export function readQrToken(): string | null {
  const path = window.location.pathname;
  const match = path.match(/\/s\/([^/]+)/);
  if (match) return decodeURIComponent(match[1]).trim().replace(/\s+/g, '+');

  const params = new URLSearchParams(window.location.search);
  const value = params.get('token') || params.get('qr') || null;
  return value ? value.trim().replace(/\s+/g, '+') : null;
}

export function isValidQrToken(token: string): boolean {
  return typeof token === 'string' && token.length >= 8;
}
