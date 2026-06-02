import { Button, Input, Text, View } from '@tarojs/components';

export default function LoginPage() {
  return (
    <View className='sl-page'>
      <View className='sl-card' style={{ padding: '32rpx' }}>
        <View className='sl-section-title'>统一登录</View>
        <View className='sl-section-desc' style={{ marginTop: '12rpx' }}>
          第 1 批先接入工程底座与页面骨架，真实登录联调将在后续批次接入。
        </View>

        <View style={{ marginTop: '28rpx', display: 'flex', flexDirection: 'column', gap: '20rpx' }}>
          <Input placeholder='账号' disabled />
          <Input placeholder='密码' password disabled />
          <Button className='sl-primary-button' disabled>
            登录能力开发中
          </Button>
        </View>

        <Text style={{ marginTop: '20rpx', display: 'block', fontSize: '24rpx', color: 'var(--sl-color-text-secondary)' }}>
          后续这里会接入志愿者 / 家属统一账号登录与角色分流。
        </Text>
      </View>
    </View>
  );
}
