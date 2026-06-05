import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * 防抖节流工具
 * 用于优化高频触发的事件（搜索输入、滚动、窗口调整等）
 */

/**
 * 防抖函数
 * 延迟执行，如果在延迟期间再次触发，则重新计时
 * 适用于：搜索输入、表单验证、按钮点击
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number = 300,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return function (this: unknown, ...args: Parameters<T>) {
    const callNow = immediate && !timer;

    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      timer = null;
      if (!immediate) {
        fn.apply(this, args);
      }
    }, delay);

    if (callNow) {
      fn.apply(this, args);
    }
  };
}

/**
 * 节流函数
 * 固定时间间隔内只执行一次
 * 适用于：滚动事件、窗口调整、列表加载更多
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  interval: number = 300
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now();

    if (now - lastTime >= interval) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastTime = now;
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        lastTime = Date.now();
        timer = null;
        fn.apply(this, args);
      }, interval - (now - lastTime));
    }
  };
}

/**
 * 带取消功能的防抖
 * 适用于需要在组件卸载时取消的场景
 */
export function debounceWithCancel<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number = 300
): {
  call: (...args: Parameters<T>) => void;
  cancel: () => void;
} {
  let timer: ReturnType<typeof setTimeout> | null = null;

  function call(this: unknown, ...args: Parameters<T>) {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, delay);
  }

  function cancel() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  return { call, cancel };
}

/**
 * 搜索防抖 hook 辅助函数
 * 返回 [实时值, 防抖值, 设置函数]
 */
export function useDebouncedSearch<T>(initialValue: T, delay: number = 300): [T, T, (value: T) => void] {
  const [value, setValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setDebounced = useCallback((newValue: T) => {
    setValue(newValue);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setDebouncedValue(newValue);
    }, delay);
  }, [delay]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return [value, debouncedValue, setDebounced];
}

/**
 * 请求去重
 * 相同 key 的请求在 pending 状态下只发送一次，共享结果
 * 适用于：重复点击、快速切换 tab
 */
export function createDeduplicationRequest() {
  const pending = new Map<string, Promise<unknown>>();

  return async function dedupRequest<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    if (pending.has(key)) {
      return pending.get(key) as Promise<T>;
    }

    const promise = requestFn().finally(() => {
      pending.delete(key);
    });

    pending.set(key, promise);
    return promise;
  };
}

// 全局请求去重实例
export const globalDeduplication = createDeduplicationRequest();
