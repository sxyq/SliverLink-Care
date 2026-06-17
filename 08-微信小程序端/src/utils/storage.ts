import Taro from '@tarojs/taro';

const EXPIRATION_SUFFIX = '__exp__';

function getExpirationKey(key: string): string {
  return `${key}${EXPIRATION_SUFFIX}`;
}

export function getStorageValue<T>(key: string, fallback: T): T {
  try {
    const expiredAt = Taro.getStorageSync<number | null>(getExpirationKey(key));
    if (expiredAt && Date.now() > expiredAt) {
      removeStorageValue(key);
      removeStorageValue(getExpirationKey(key));
      return fallback;
    }

    const value = Taro.getStorageSync<T>(key);
    return value === '' || value == null ? fallback : value;
  } catch {
    return fallback;
  }
}

export function setStorageValue<T>(key: string, value: T, ttlMs?: number) {
  Taro.setStorageSync(key, value);
  if (ttlMs && ttlMs > 0) {
    Taro.setStorageSync(getExpirationKey(key), Date.now() + ttlMs);
  }
}

export function removeStorageValue(key: string) {
  Taro.removeStorageSync(key);
  Taro.removeStorageSync(getExpirationKey(key));
}

export function removeStorageValuesByPrefix(prefixes: string[]) {
  try {
    const keys = Taro.getStorageInfoSync().keys || [];
    for (const key of keys) {
      if (prefixes.some((prefix) => key.startsWith(prefix))) {
        removeStorageValue(key);
      }
    }
  } catch {
    // 静默处理，不影响登出或 401 主流程。
  }
}

export async function getStorageValueAsync<T>(key: string, fallback: T): Promise<T> {
  try {
    let expiredAt: number | null = null;
    try {
      const expiredAtResult = await Taro.getStorage<number | null>({ key: getExpirationKey(key) });
      expiredAt = expiredAtResult.data;
    } catch {
      expiredAt = null;
    }

    if (expiredAt && Date.now() > expiredAt) {
      await Taro.removeStorage({ key });
      await Taro.removeStorage({ key: getExpirationKey(key) });
      return fallback;
    }

    const result = await Taro.getStorage<T>({ key });
    return result.data ?? fallback;
  } catch {
    return fallback;
  }
}

export async function setStorageValueAsync<T>(key: string, value: T, ttlMs?: number) {
  await Taro.setStorage({ key, data: value });
  if (ttlMs && ttlMs > 0) {
    await Taro.setStorage({ key: getExpirationKey(key), data: Date.now() + ttlMs });
  }
}

/**
 * 清理所有过期的存储项
 */
export function cleanupExpiredStorage(): void {
  try {
    const keys = Taro.getStorageInfoSync().keys || [];
    const now = Date.now();
    for (const key of keys) {
      if (key.endsWith(EXPIRATION_SUFFIX)) {
        const expiredAt = Taro.getStorageSync<number>(key);
        if (expiredAt && now > expiredAt) {
          const originalKey = key.slice(0, -EXPIRATION_SUFFIX.length);
          Taro.removeStorageSync(originalKey);
          Taro.removeStorageSync(key);
        }
      }
    }
  } catch {
    // 静默处理，不影响主流程
  }
}
