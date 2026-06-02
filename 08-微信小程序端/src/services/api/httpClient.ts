import Taro from '@tarojs/taro';

import { ERROR_MESSAGES, STORAGE_KEYS } from '@/app/app.constants';
import { getApiBaseUrl } from '@/utils/env';
import { getStorageValue, removeStorageValue } from '@/utils/storage';
import type { ApiEnvelope, ApiRequestOptions, DownloadResult } from './requestTypes';

function normalizeErrorMessage(payload: unknown, fallback: string) {
  if (!payload) {
    return fallback;
  }

  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload) as ApiEnvelope<unknown> & { error?: string };
      return parsed.message || parsed.error || fallback;
    } catch {
      return payload || fallback;
    }
  }

  if (typeof payload === 'object' && payload && 'message' in payload) {
    return String((payload as { message?: string }).message || fallback);
  }

  return fallback;
}

function buildHeaders(extraHeaders?: Record<string, string>) {
  const token = getStorageValue<string>(STORAGE_KEYS.authToken, '');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extraHeaders || {}),
  };
}

async function request<T>(path: string, options: ApiRequestOptions = {}) {
  const response = await Taro.request<ApiEnvelope<T> | T>({
    url: `${getApiBaseUrl()}${path}`,
    method: options.method || 'GET',
    data: options.data,
    header: buildHeaders(options.headers),
    timeout: options.timeout || 15000,
  });

  if (response.statusCode === 401) {
    removeStorageValue(STORAGE_KEYS.authToken);
  }

  if (response.statusCode >= 400) {
    throw new Error(normalizeErrorMessage(response.data, ERROR_MESSAGES.requestFailed));
  }

  const payload = response.data;

  if (payload && typeof payload === 'object' && 'data' in payload) {
    const envelope = payload as ApiEnvelope<T>;
    if ((envelope.code || 0) >= 400) {
      throw new Error(envelope.message || ERROR_MESSAGES.requestFailed);
    }
    return envelope.data as T;
  }

  return payload as T;
}

async function download(path: string): Promise<DownloadResult> {
  const result = await Taro.downloadFile({
    url: `${getApiBaseUrl()}${path}`,
    header: buildHeaders(),
    timeout: 20000,
  });

  if (result.statusCode >= 400) {
    throw new Error(ERROR_MESSAGES.requestFailed);
  }

  return {
    tempFilePath: result.tempFilePath,
    statusCode: result.statusCode,
  };
}

export const httpClient = {
  get: <T>(path: string, options?: Omit<ApiRequestOptions, 'method'>) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, data?: ApiRequestOptions['data'], options?: Omit<ApiRequestOptions, 'method' | 'data'>) =>
    request<T>(path, { ...options, method: 'POST', data }),
  put: <T>(path: string, data?: ApiRequestOptions['data'], options?: Omit<ApiRequestOptions, 'method' | 'data'>) =>
    request<T>(path, { ...options, method: 'PUT', data }),
  patch: <T>(path: string, data?: ApiRequestOptions['data'], options?: Omit<ApiRequestOptions, 'method' | 'data'>) =>
    request<T>(path, { ...options, method: 'PATCH', data }),
  delete: <T>(path: string, options?: Omit<ApiRequestOptions, 'method'>) => request<T>(path, { ...options, method: 'DELETE' }),
  download,
};
