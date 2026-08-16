import { API_BASE_URL } from '../config/env';
import { i18nRuntime } from '../i18n';
import { ApiMessageError, resolveApiMessage } from '@shared-i18n/messages';

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

export async function httpClient<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...((options?.headers as Record<string, string>) || {}),
    },
  });

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
