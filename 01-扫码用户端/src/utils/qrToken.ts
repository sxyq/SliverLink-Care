export function readQrToken(): string | null {
  const path = window.location.pathname;
  const match = path.match(/\/s\/([^/]+)/);
  if (match) return match[1];

  const params = new URLSearchParams(window.location.search);
  return params.get('token') || params.get('qr') || null;
}

export function isValidQrToken(token: string): boolean {
  return typeof token === 'string' && token.length >= 8;
}
