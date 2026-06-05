export interface ApiEnvelope<T> {
  code?: number;
  message?: string;
  data?: T;
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  /** 是否使用请求队列（默认 true） */
  useQueue?: boolean;
  /** 请求优先级（数字越大优先级越高） */
  priority?: number;
  /** 最大重试次数（默认 2） */
  maxRetries?: number;
  /** 请求去重 key */
  dedupKey?: string;
  /** 缓存 TTL（毫秒），仅对 GET 请求生效 */
  cacheTtl?: number;
}

export interface DownloadResult {
  tempFilePath: string;
  statusCode: number;
}
