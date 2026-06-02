import { Button, Text, View } from '@tarojs/components';
import { useRouter } from '@tarojs/taro';

import { parseQueryParams } from '@/utils/routeParams';

export default function ScanVerifyPage() {
  const router = useRouter();
  const params = parseQueryParams(router.params || {});

  return (
    <View className='sl-page'>
      <View className='sl-card' style={{ padding: '32rpx', display: 'flex', flexDirection: 'column', gap: '18rpx' }}>
        <View className='sl-section-title'>访问验证</View>
        <View className='sl-section-desc'>
          第 1 批先完成扫码页与验证页的可编译链路，真实短信验证和身份登记验证会在下一批继续接入后端。
        </View>

        <View>
          <Text>elderId：</Text>
          <Text>{params.elderId || '未识别到'}</Text>
        </View>
        <View>
          <Text>source：</Text>
          <Text>{params.source || '未识别到'}</Text>
        </View>

        <Button className='sl-primary-button' disabled>
          短信验证能力开发中
        </Button>
        <Button className='sl-secondary-button' disabled>
          身份登记验证开发中
        </Button>
      </View>
    </View>
  );
}
