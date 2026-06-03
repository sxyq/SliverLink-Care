const FALLBACK_API_BASE_URL = 'https://sxyq27.online/silverlink-api';
declare const TARO_APP_API_BASE_URL: string | undefined;

export type AppEnvName = 'development' | 'production';

export function getAppEnvName(): AppEnvName {
  if (typeof __APP_ENV__ !== 'undefined') {
    return __APP_ENV__;
  }

  return 'development';
}

export function getApiBaseUrl() {
  if (typeof TARO_APP_API_BASE_URL !== 'undefined' && TARO_APP_API_BASE_URL) {
    return TARO_APP_API_BASE_URL;
  }

  return FALLBACK_API_BASE_URL;
}

export function isDevelopmentEnv() {
  return getAppEnvName() === 'development';
}

export function getEnvConfig() {
  return {
    appEnv: getAppEnvName(),
    apiBaseUrl: getApiBaseUrl(),
    debugEnabled: isDevelopmentEnv(),
  };
}
