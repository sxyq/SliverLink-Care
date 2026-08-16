import { i18nRuntime } from '../i18n';
import { ApiMessageError, resolveApiMessage } from '@shared-i18n/messages';

function resolveBaseUrl() {
  const configured = (import.meta as any).env?.VITE_API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }
  return '/silverlink-api';
}

const BASE_URL = resolveBaseUrl();
const TOKEN_STORAGE_KEY = 'sl_volunteer_web_token';

let token = '';

interface ApiEnvelope<T> {
  code?: number;
  message?: string;
  messageKey?: string;
  data?: T;
}

function buildApiError(payload: unknown): ApiMessageError {
  const resolved = resolveApiMessage(payload, i18nRuntime.t);
  return new ApiMessageError(resolved.message, resolved.messageKey);
}

export function setAuthToken(t: string) {
  token = t;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, t);
  }
}

export function getAuthToken() {
  if (!token && typeof window !== 'undefined') {
    token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
  }
  return token;
}

export function clearAuthToken() {
  token = '';
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export async function http<T>(path: string, options?: RequestInit): Promise<T> {
  const authToken = getAuthToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options?.headers || {}),
    },
  });
  if (res.status === 401 || res.status === 403) {
    clearAuthToken();
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw buildApiError(text);
  }
  const json = (await res.json()) as ApiEnvelope<T> | T;
  if (json && typeof json === 'object' && 'code' in json && 'data' in json) {
    const envelope = json as ApiEnvelope<T>;
    if (envelope.code && envelope.code >= 400) {
      throw buildApiError(envelope);
    }
    return envelope.data as T;
  }
  return json as T;
}
