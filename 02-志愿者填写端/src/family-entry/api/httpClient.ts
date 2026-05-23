const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

interface RequestConfig {
  headers?: Record<string, string>;
}

interface ApiEnvelope<T> {
  code?: number;
  message?: string;
  data?: T;
}

function getToken(): string | null {
  return localStorage.getItem('family_token');
}

export function setToken(token: string): void {
  localStorage.setItem('family_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('family_token');
}

async function request<T>(method: string, url: string, body?: unknown, config?: RequestConfig): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(config?.headers || {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (res.status === 401) clearToken();
  if (!res.ok) throw new Error(await res.text().catch(() => '请求失败'));
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
