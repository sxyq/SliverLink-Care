const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';

let token = localStorage.getItem('sl_token') || '';

interface ApiEnvelope<T> {
  code?: number;
  message?: string;
  data?: T;
}

export function setAuthToken(t: string) {
  token = t;
  localStorage.setItem('sl_token', t);
}

export function getAuthToken() {
  return token;
}

export function clearAuthToken() {
  token = '';
  localStorage.removeItem('sl_token');
}

export async function http<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  });
  if (res.status === 401) {
    clearAuthToken();
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '请求失败');
    throw new Error(text);
  }
  const json = (await res.json()) as ApiEnvelope<T> | T;
  if (json && typeof json === 'object' && 'code' in json && 'data' in json) {
    const envelope = json as ApiEnvelope<T>;
    if (envelope.code && envelope.code >= 400) {
      throw new Error(envelope.message || `API ${envelope.code}`);
    }
    return envelope.data as T;
  }
  return json as T;
}
