import Taro from '@tarojs/taro';

import { STORAGE_KEYS } from '@/app/app.constants';
import { getApiBaseUrl } from '@/utils/env';
import { clearAuthSession } from '@/store/auth/authStore';
import { getStorageValue, removeStorageValue, setStorageValue } from '@/utils/storage';
import { globalDeduplication } from '@/utils/throttleDebounce';
import { queueRequest } from '@/utils/requestQueue';
import type { ApiEnvelope, ApiRequestOptions, DownloadResult } from './requestTypes';
import { i18nRuntime } from '@/i18n';
import { ApiMessageError, resolveApiMessage } from '@shared-i18n/messages';

const CACHE_PREFIX = 'api_cache__';

function buildCacheKey(path: string, data?: unknown): string {
  if (!data) {
    return `${CACHE_PREFIX}${path}`;
  }
  try {
    const dataHash = typeof data === 'string' ? data : JSON.stringify(data);
    return `${CACHE_PREFIX}${path}__${dataHash}`;
  } catch {
    return `${CACHE_PREFIX}${path}`;
  }
}

function normalizeErrorMessage(payload: unknown, statusCode?: number): ApiMessageError {
  const resolved = resolveApiMessage(payload, i18nRuntime.t);
  const hasRegisteredMessageKey = Boolean(
    resolved.messageKey && i18nRuntime.t(resolved.messageKey) !== resolved.messageKey,
  );
  const shouldHideServerFailure = (statusCode || 0) >= 500 && !hasRegisteredMessageKey;

  if (shouldHideServerFailure) {
    return new ApiMessageError(i18nRuntime.t('errors.requestFailed'), 'errors.requestFailed');
  }

  return new ApiMessageError(resolved.message, resolved.messageKey);
}

function buildHeaders(extraHeaders?: Record<string, string>) {
  const token = getStorageValue<string>(STORAGE_KEYS.authToken, '');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extraHeaders || {}),
  };
}

async function doRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const response = await Taro.request<ApiEnvelope<T> | T>({
    url: `${getApiBaseUrl()}${path}`,
    method: options.method || 'GET',
    data: options.data,
    header: buildHeaders(options.headers),
    timeout: options.timeout || 15000,
    enableCookie: true,
  } as Taro.request.Option<ApiEnvelope<T> | T> & { enableCookie: boolean });

  if (response.statusCode === 401) {
    clearAuthSession();
  }

  if (response.statusCode >= 400) {
    throw normalizeErrorMessage(response.data, response.statusCode);
  }

  const payload = response.data;

  if (payload && typeof payload === 'object' && ('code' in payload || 'data' in payload)) {
    const envelope = payload as ApiEnvelope<T>;
    if ((envelope.code || 0) >= 400) {
      throw normalizeErrorMessage(envelope, envelope.code);
    }
    return envelope.data as T;
  }

  return payload as T;
}

async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const useQueue = options.useQueue !== false;
  const dedupKey = options.dedupKey;
  const isGet = (options.method || 'GET') === 'GET';
  const cacheTtl = options.cacheTtl && options.cacheTtl > 0 ? options.cacheTtl : 0;

  // GET 请求且设置了缓存 TTL，先尝试读取缓存
  if (isGet && cacheTtl > 0) {
    const cacheKey = buildCacheKey(path, options.data);
    const cached = getStorageValue<{ data: T; cachedAt: number } | null>(cacheKey, null);
    if (cached && Date.now() - cached.cachedAt < cacheTtl) {
      return cached.data;
    }
  }

  const execute = async () => {
    try {
      const result = await doRequest<T>(path, options);

      // GET 请求成功且设置了缓存，写入缓存
      if (isGet && cacheTtl > 0) {
        const cacheKey = buildCacheKey(path, options.data);
        setStorageValue(cacheKey, { data: result, cachedAt: Date.now() }, cacheTtl);
      }

      return result;
    } catch (error) {
      // 请求失败时清除可能存在的旧缓存
      if (isGet && cacheTtl > 0) {
        const cacheKey = buildCacheKey(path, options.data);
        removeStorageValue(cacheKey);
      }
      if (error instanceof ApiMessageError) {
        throw error;
      }
      throw new ApiMessageError(i18nRuntime.t('errors.requestFailed'), 'errors.requestFailed');
    }
  };

  // 如果设置了去重 key，使用去重逻辑
  if (dedupKey) {
    return globalDeduplication(dedupKey, () =>
      useQueue
        ? queueRequest(execute, { priority: options.priority, maxRetries: options.maxRetries })
        : execute()
    );
  }

  // 使用请求队列控制并发
  if (useQueue) {
    return queueRequest(execute, { priority: options.priority, maxRetries: options.maxRetries });
  }

  return execute();
}

async function download(path: string): Promise<DownloadResult> {
  const result = await Taro.downloadFile({
    url: `${getApiBaseUrl()}${path}`,
    header: buildHeaders(),
    timeout: 20000,
    enableCookie: true,
  } as Taro.downloadFile.Option & { enableCookie: boolean });

  if (result.statusCode >= 400) {
    throw new ApiMessageError(i18nRuntime.t('errors.requestFailed'), 'errors.requestFailed');
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
