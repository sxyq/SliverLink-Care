import Taro from '@tarojs/taro';
import { Button, Text, View } from '@tarojs/components';

import { APP_ROUTES } from '@/app/app.constants';
import { useAppLaunch } from '@/hooks/useAppLaunch';
import { useScanEntry } from '@/hooks/useScanEntry';

import './index.scss';

export default function HomePage() {
  const openScan = useScanEntry();
  const { isScanLaunch, scanLandingUrl } = useAppLaunch();

  return (
    <View className='sl-page home-page'>
      <View className='sl-card home-hero'>
        <Text className='home-hero__eyebrow'>SILVERLINK CARE</Text>
        <View className='home-hero__title'>智联名牌</View>
        <View className='home-hero__desc'>
          一个小程序承载扫码查看与志愿者 / 家属协同工作台。当前先开放首页基础入口与扫码主链路底座。
        </View>
      </View>

      <View className='home-actions'>
        {isScanLaunch ? (
          <View className='sl-card home-action-card'>
            <View className='home-action-card__title'>继续扫码入口</View>
            <View className='home-action-card__desc'>检测到当前启动带有扫码参数，可直接回到对应落地页继续查看。</View>
            <Button
              className='sl-secondary-button home-action-card__button'
              onClick={() => Taro.navigateTo({ url: scanLandingUrl })}
            >
              回到扫码落地页
            </Button>
          </View>
        ) : null}

        <View className='sl-card home-action-card'>
          <View className='home-action-card__title'>扫码查看</View>
          <View className='home-action-card__desc'>适用于实体名牌、小程序码与微信扫一扫进入后的信息查看入口。</View>
          <Button className='sl-primary-button home-action-card__button' onClick={openScan}>
            立即扫码
          </Button>
        </View>

        <View className='sl-card home-action-card'>
          <View className='home-action-card__title'>志愿者 / 家属登录</View>
          <View className='home-action-card__desc'>统一登录后按角色分流进入不同权限范围的工作台。</View>
          <Button
            className='sl-secondary-button home-action-card__button'
            onClick={() => Taro.navigateTo({ url: APP_ROUTES.login })}
          >
            前往登录
          </Button>
        </View>
      </View>

      <View className='home-footer'>
        <View>当前阶段：已接入小程序工程底座。</View>
        <View>下一阶段：继续补扫码落地、验证与工作台主链路。</View>
      </View>
    </View>
  );
}
