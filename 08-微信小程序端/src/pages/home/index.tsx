import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';

import { APP_ROUTES } from '@/app/app.constants';
import { useAppLaunch } from '@/hooks/useAppLaunch';
import { useScanEntry } from '@/hooks/useScanEntry';

import './index.scss';

const TRUST_POINTS = [
  { value: '扫码即达', label: '救助信息快速查看' },
  { value: '统一入口', label: '志愿者与家属共用登录' },
  { value: '安全核验', label: '敏感信息按需授权访问' },
];

export default function HomePage() {
  const openScan = useScanEntry();
  const { isScanLaunch, scanLandingUrl } = useAppLaunch();

  return (
    <View className='sl-stage'>
      <View className='sl-app-shell'>
        <View className='sl-phone-shell'>
          <View className='sl-phone-content'>
            <View className='sl-page home-page'>
              <View className='home-login-shell'>
                <View className='home-login-shell__inner'>
                  <View className='home-login-content'>
                    <View className='home-login-hero'>
                      <View className='home-login-brand'>
                        <Text className='home-login-brand__eyebrow'>SilverLink Care</Text>
                        <View className='home-login-icon'>SL</View>
                        <View className='home-login-title'>智联名牌</View>
                        <Text className='home-login-subtitle'>用心守护 温暖相伴</Text>
                        <Text className='home-login-description'>连接扫码救助、家属协同与志愿照护，让社区守护更及时也更安心。</Text>
                      </View>

                      <View className='home-login-trustbar'>
                        {TRUST_POINTS.map((item) => (
                          <View key={item.value} className='home-login-trustbar__item'>
                            <Text className='home-login-trustbar__value'>{item.value}</Text>
                            <Text className='home-login-trustbar__label'>{item.label}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    <View className='home-login-panel'>
                      <View className='home-login-panel__header'>
                        <View className='home-login-panel__heading'>
                          <Text className='home-login-panel__eyebrow'>统一入口</Text>
                          <View className='home-login-panel__title'>选择本次进入方式</View>
                        </View>

                        <View className='home-login-panel__scan' onClick={openScan}>
                          <View className='home-login-panel__scan-icon'>
                            <View className='home-login-panel__scan-corner home-login-panel__scan-corner--tl' />
                            <View className='home-login-panel__scan-corner home-login-panel__scan-corner--tr' />
                            <View className='home-login-panel__scan-corner home-login-panel__scan-corner--bl' />
                            <View className='home-login-panel__scan-corner home-login-panel__scan-corner--br' />
                            <View className='home-login-panel__scan-center' />
                          </View>
                        </View>
                      </View>

                      <Text className='home-login-panel__summary'>首页优先突出两个最常用流程，减少首次进入时的判断成本。</Text>

                      <View className='home-login-actions'>
                        <View className='home-login-entry home-login-entry--primary' onClick={openScan}>
                          <View className='home-login-entry__body'>
                            <Text className='home-login-entry__eyebrow'>扫码访客</Text>
                            <Text className='home-login-entry__title'>查看公开信息</Text>
                            <Text className='home-login-entry__description'>适合紧急协助与身份确认，优先进入扫码救助流程。</Text>
                          </View>
                          <View className='home-login-entry__suffix'>
                            <Text className='home-login-entry__action'>立即扫码</Text>
                            <Text className='home-login-entry__arrow'>→</Text>
                          </View>
                        </View>

                        <View className='home-login-entry home-login-entry--secondary' onClick={() => Taro.navigateTo({ url: APP_ROUTES.login })}>
                          <View className='home-login-entry__body'>
                            <Text className='home-login-entry__eyebrow'>工作台登录</Text>
                            <Text className='home-login-entry__title'>进入统一登录</Text>
                            <Text className='home-login-entry__description'>志愿者、家属使用同一入口登录，系统会自动分流到对应工作台。</Text>
                          </View>
                          <View className='home-login-entry__suffix'>
                            <Text className='home-login-entry__action'>进入登录</Text>
                            <Text className='home-login-entry__arrow'>→</Text>
                          </View>
                        </View>

                        {isScanLaunch ? (
                          <View className='home-login-entry home-login-entry--ghost' onClick={() => Taro.navigateTo({ url: scanLandingUrl })}>
                            <View className='home-login-entry__body'>
                              <Text className='home-login-entry__eyebrow'>当前会话</Text>
                              <Text className='home-login-entry__title'>继续当前扫码入口</Text>
                              <Text className='home-login-entry__description'>保留本次扫码上下文，直接回到当前访问中的老人信息页。</Text>
                            </View>
                            <View className='home-login-entry__suffix'>
                              <Text className='home-login-entry__action'>继续访问</Text>
                              <Text className='home-login-entry__arrow'>→</Text>
                            </View>
                          </View>
                        ) : null}
                      </View>

                      <View className='home-login-notes'>
                        <View className='home-login-note'>
                          <Text className='home-login-note__title'>适合谁使用</Text>
                          <Text className='home-login-note__text'>扫码访客可快速查看公开救助信息；志愿者与家属从统一登录进入自己的工作台。</Text>
                        </View>
                        <View className='home-login-note'>
                          <Text className='home-login-note__title'>信息如何保护</Text>
                          <Text className='home-login-note__text'>公开信息默认可见，健康档案等敏感内容会在验证后按授权范围开放。</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
