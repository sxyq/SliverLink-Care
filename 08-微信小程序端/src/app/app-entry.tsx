import type { PropsWithChildren } from 'react';
import { useDidHide, useDidShow, useLaunch } from '@tarojs/taro';

import { createLaunchContext, persistLaunchContext } from './app.lifecycle';

export default function App({ children }: PropsWithChildren) {
  useLaunch((options) => {
    persistLaunchContext(createLaunchContext(options?.query));
  });

  useDidShow(() => {
    // 预留登录态恢复与会话保鲜逻辑。
  });

  useDidHide(() => {
    // 预留短时敏感态清理逻辑。
  });

  return children;
}
