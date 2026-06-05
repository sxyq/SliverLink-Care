function resolveBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }
  return '/silverlink-api';
}

const API_BASE_URL = resolveBaseUrl();
const TOKEN_STORAGE_KEY = 'sl_family_web_token';
let familyToken = '';

interface RequestConfig {
  headers?: Record<string, string>;
}

interface ApiEnvelope<T> {
  code?: number;
  message?: string;
  data?: T;
}

function normalizeErrorMessage(raw: string) {
  if (!raw) return '请求失败';
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as ApiEnvelope<unknown> & { error?: string };
      if (parsed.message) return parsed.message;
      if (parsed.error) return parsed.error;
      if (parsed.data && typeof parsed.data === 'object' && 'message' in parsed.data) {
        return String((parsed.data as { message?: string }).message || '请求失败');
      }
    } catch {
      return '请求失败';
    }
    return '请求失败';
  }
  return raw;
}

export function getToken(): string {
  if (!familyToken && typeof window !== 'undefined') {
    familyToken = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
  }
  return familyToken;
}

export function setToken(nextToken: string): void {
  familyToken = nextToken;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
  }
}

export function clearToken(): void {
  familyToken = '';
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

async function request<T>(method: string, url: string, body?: unknown, config?: RequestConfig): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${url}`, {
    method,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(config?.headers || {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (res.status === 401 || res.status === 403) clearToken();
  if (!res.ok) {
    const text = await res.text().catch(() => '请求失败');
    throw new Error(normalizeErrorMessage(text));
  }
  const json = (await res.json()) as ApiEnvelope<T> | T;
  if (json && typeof json === 'object' && 'code' in json && 'data' in json) {
    const envelope = json as ApiEnvelope<T>;
    if (envelope.code && envelope.code >= 400) throw new Error(envelope.message || `API ${envelope.code}`);
    return envelope.data as T;
  }
  return json as T;
}

export function get<T>(url: string, config?: RequestConfig): Promise<T> {
  return request<T>('GET', url, undefined, config);
}

export function post<T>(url: string, body?: unknown, config?: RequestConfig): Promise<T> {
  return request<T>('POST', url, body, config);
}

export function put<T>(url: string, body?: unknown, config?: RequestConfig): Promise<T> {
  return request<T>('PUT', url, body, config);
}

export function del<T>(url: string, config?: RequestConfig): Promise<T> {
  return request<T>('DELETE', url, undefined, config);
}
