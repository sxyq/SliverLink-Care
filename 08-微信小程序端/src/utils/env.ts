const FALLBACK_API_BASE_URL = 'https://sxyq27.online/silverlink-api';

export type AppEnvName = 'development' | 'production';

export function getAppEnvName(): AppEnvName {
  if (typeof __APP_ENV__ !== 'undefined') {
    return __APP_ENV__;
  }

  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}

export function getApiBaseUrl() {
  return process.env.TARO_APP_API_BASE_URL || FALLBACK_API_BASE_URL;
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
