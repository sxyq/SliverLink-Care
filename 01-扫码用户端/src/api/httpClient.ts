import { API_BASE_URL } from '../config/env';

interface ApiEnvelope<T> {
  code?: number;
  message?: string;
  data?: T;
}

export async function httpClient<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...((options?.headers as Record<string, string>) || {}),
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
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
