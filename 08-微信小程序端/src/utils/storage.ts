import Taro from '@tarojs/taro';

export function getStorageValue<T>(key: string, fallback: T): T {
  try {
    const value = Taro.getStorageSync<T>(key);
    return value === '' || value == null ? fallback : value;
  } catch {
    return fallback;
  }
}

export function setStorageValue<T>(key: string, value: T) {
  Taro.setStorageSync(key, value);
}

export function removeStorageValue(key: string) {
  Taro.removeStorageSync(key);
}

export async function getStorageValueAsync<T>(key: string, fallback: T): Promise<T> {
  try {
    const result = await Taro.getStorage<T>({ key });
    return result.data ?? fallback;
  } catch {
    return fallback;
  }
}

export async function setStorageValueAsync<T>(key: string, value: T) {
  await Taro.setStorage({ key, data: value });
}
