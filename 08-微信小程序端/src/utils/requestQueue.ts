/**
 * 请求队列与并发控制
 * 限制同时进行的请求数量，避免小程序并发请求过多导致性能问题
 */

interface QueuedRequest<T> {
  id: string;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  priority: number;
  retryCount: number;
  maxRetries: number;
}

interface RequestQueueConfig {
  maxConcurrent?: number;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

const DEFAULT_CONFIG: Required<RequestQueueConfig> = {
  maxConcurrent: 5,
  maxRetries: 2,
  retryDelay: 1000,
  timeout: 15000,
};

class RequestQueue {
  private queue: QueuedRequest<unknown>[] = [];
  private running = new Set<string>();
  private config: Required<RequestQueueConfig>;
  private requestId = 0;

  constructor(config: RequestQueueConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 添加请求到队列
   */
  enqueue<T>(
    execute: () => Promise<T>,
    options: { priority?: number; maxRetries?: number } = {}
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = `req_${++this.requestId}`;
      const request: QueuedRequest<T> = {
        id,
        execute,
        resolve,
        reject,
        priority: options.priority ?? 0,
        retryCount: 0,
        maxRetries: options.maxRetries ?? this.config.maxRetries,
      };

      // 按优先级插入队列（高优先级在前）
      const insertIndex = this.queue.findIndex((r) => r.priority < request.priority);
      if (insertIndex === -1) {
        this.queue.push(request as QueuedRequest<unknown>);
      } else {
        this.queue.splice(insertIndex, 0, request as QueuedRequest<unknown>);
      }

      this.processQueue();
    });
  }

  /**
   * 处理队列中的请求
   */
  private processQueue(): void {
    while (this.running.size < this.config.maxConcurrent && this.queue.length > 0) {
      const request = this.queue.shift();
      if (!request) break;

      this.running.add(request.id);
      this.executeRequest(request);
    }
  }

  /**
   * 执行单个请求（带重试）
   */
  private async executeRequest<T>(request: QueuedRequest<T>): Promise<void> {
    try {
      const result = await this.runWithTimeout(request.execute);
      this.running.delete(request.id);
      request.resolve(result);
    } catch (error) {
      if (request.retryCount < request.maxRetries && this.isRetryableError(error)) {
        request.retryCount++;
        await this.delay(this.config.retryDelay * request.retryCount);
        // 重新加入队列头部（优先重试）
        this.queue.unshift(request as QueuedRequest<unknown>);
      } else {
        this.running.delete(request.id);
        request.reject(error);
      }
    } finally {
      // 继续处理队列
      this.processQueue();
    }
  }

  /**
   * 带超时的执行
   */
  private runWithTimeout<T>(execute: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(i18nRuntime.t('errors.requestTimeout')));
      }, this.config.timeout);

      execute()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * 判断错误是否可重试
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      // 网络错误、超时错误可重试
      if (error.message.includes('超时') || error.message.includes('timeout')) {
        return true;
      }
      // 5xx 服务器错误可重试
      if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
        return true;
      }
    }
    return false;
  }

  /**
   * 延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 获取当前状态
   */
  getStatus(): { running: number; queued: number } {
    return {
      running: this.running.size,
      queued: this.queue.length,
    };
  }

  /**
   * 清空队列
   */
  clear(): void {
    const pending = [...this.queue];
    this.queue = [];
    pending.forEach((req) => req.reject(new Error(i18nRuntime.t('errors.requestCancelled'))));
  }
}

// 全局请求队列实例
export const globalRequestQueue = new RequestQueue();

// 便捷函数：使用队列执行请求
export function queueRequest<T>(
  execute: () => Promise<T>,
  options?: { priority?: number; maxRetries?: number }
): Promise<T> {
  return globalRequestQueue.enqueue(execute, options);
}

// 批量请求控制（限制并发数）
export async function batchRequests<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: { maxConcurrent?: number; retryCount?: number } = {}
): Promise<R[]> {
  const { maxConcurrent = 3 } = options;
  const queue = new RequestQueue({ maxConcurrent });

  const promises = items.map((item) =>
    queue.enqueue(() => processor(item), { priority: 0 })
  );

  return Promise.all(promises);
}
import { i18nRuntime } from '@/i18n';
