import { View } from '@tarojs/components';

export default function AuthRoleRedirectPage() {
  return (
    <View className='sl-page'>
      <View className='sl-card' style={{ padding: '32rpx' }}>
        <View className='sl-section-title'>角色分流准备中</View>
        <View className='sl-section-desc' style={{ marginTop: '12rpx' }}>
          当前阶段已预留分流页路径，后续会在登录完成后按 `VOLUNTEER / FAMILY` 自动跳转。
        </View>
      </View>
    </View>
  );
}
