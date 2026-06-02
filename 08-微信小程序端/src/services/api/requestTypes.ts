export interface ApiEnvelope<T> {
  code?: number;
  message?: string;
  data?: T;
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: Record<string, unknown> | string;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface DownloadResult {
  tempFilePath: string;
  statusCode: number;
}
