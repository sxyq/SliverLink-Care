import { memo } from 'react';
import { Button, Swiper, SwiperItem, Text, View } from '@tarojs/components';
import { useI18n } from '@/i18n';

export interface ArchiveCarouselItem {
  id: string;
  name: string;
  archiveNo: string;
  gender: string;
  age: string;
  residence: string;
  status: string;
  contactName: string;
  contactPhone: string;
  bloodOrAllergyLabel: string;
  bloodOrAllergyValue: string;
}

interface ArchiveCarouselProps {
  items: ArchiveCarouselItem[];
  activeIndex: number;
  onChange: (nextIndex: number) => void;
  onOpen: (item: ArchiveCarouselItem) => void;
}

export const ArchiveCarousel = memo(function ArchiveCarousel({ items, activeIndex, onChange, onOpen }: ArchiveCarouselProps) {
  const { t } = useI18n();
  const safeIndex = Math.min(Math.max(activeIndex, 0), Math.max(items.length - 1, 0));
  const activeItem = items[safeIndex];
  const hasMultipleItems = items.length > 1;

  return (
    <View className='sl-archive-layout'>
      <View className='sl-archive-overview'>
        <View className='sl-archive-overview-copy'>
          <Text className='sl-overview-kicker'>{t('workbench.elderArchives')}</Text>
          <View className='sl-archive-overview-copy__title'>{items.length > 1 ? t('workbench.swipeToSwitch') : t('workbench.currentElderArchive')}</View>
          <Text className='sl-archive-overview-copy__desc'>
            {t('common.currentCount', { count: items.length })}{items.length > 1 ? t('common.currentPosition', { position: safeIndex + 1 }) : ''}
          </Text>
        </View>

        {hasMultipleItems ? (
          <View className='sl-carousel-nav'>
            <Button className={safeIndex === 0 ? 'sl-carousel-btn is-disabled' : 'sl-carousel-btn'} disabled={safeIndex === 0} onClick={() => onChange(safeIndex - 1)}>
              <Text className='sl-directional-icon'>←</Text>
            </Button>
            <Button
              className={safeIndex >= items.length - 1 ? 'sl-carousel-btn is-disabled' : 'sl-carousel-btn'}
              disabled={safeIndex >= items.length - 1}
              onClick={() => onChange(safeIndex + 1)}
            >
              <Text className='sl-directional-icon'>→</Text>
            </Button>
          </View>
        ) : null}
      </View>

      <Swiper
        className={hasMultipleItems ? 'sl-archive-swiper is-multi' : 'sl-archive-swiper'}
        current={safeIndex}
        circular={false}
        easingFunction='easeOutCubic'
        duration={360}
        skipHiddenItemLayout
        previousMargin={hasMultipleItems ? '26rpx' : '0rpx'}
        nextMargin={hasMultipleItems ? '26rpx' : '0rpx'}
        onChange={(event) => onChange(event.detail.current)}
      >
        {items.map((item) => (
          <SwiperItem key={item.id} className='sl-archive-swiper__item'>
            <View className={item.id === activeItem?.id ? 'sl-archive-card is-active' : 'sl-archive-card'}>
              <View className='sl-archive-card-top'>
                <View className='sl-elder-avatar-xl'>
                  <View className='sl-avatar-user'>
                    <View className='sl-avatar-user__head' />
                    <View className='sl-avatar-user__body' />
                  </View>
                </View>
                <View className='sl-archive-card-copy'>
                  <View className='sl-archive-card-name sl-auto-data' {...{ dir: 'auto' }}>{item.name}</View>
                  <Text className='sl-archive-card-subtitle'>
                    {t('common.archiveNumber')} <Text className='sl-ltr-data'>{item.archiveNo || t('common.generatedPending')}</Text> {item.gender === '男' ? t('common.male') : item.gender === '女' ? t('common.female') : item.gender || t('common.pendingSupplement')} <Text className='sl-auto-data' {...{ dir: 'auto' }}>{item.age || t('common.agePending')}</Text>
                  </Text>
                  <View className='sl-archive-card-subtitle sl-archive-card-residence'>
                    <Text>{t('workbench.residence')} <Text className='sl-auto-data' {...{ dir: 'auto' }}>{item.residence || t('common.pendingSupplement')}</Text></Text>
                  </View>
                </View>
              </View>

              <View className='sl-archive-card-grid'>
                <View className='sl-archive-data-pill'>
                  <Text className='sl-archive-data-pill__label'>{t('common.status')}</Text>
                  <Text className='sl-archive-data-pill__value'>{item.status}</Text>
                </View>
                <View className='sl-archive-data-pill'>
                  <Text className='sl-archive-data-pill__label'>{t('common.contact')}</Text>
                  <Text className='sl-archive-data-pill__value sl-auto-data' {...{ dir: 'auto' }}>{item.contactName}</Text>
                </View>
                <View className='sl-archive-data-pill'>
                  <Text className='sl-archive-data-pill__label'>{t('common.contactPhone')}</Text>
                  <Text className='sl-archive-data-pill__value sl-ltr-data'>{item.contactPhone}</Text>
                </View>
                <View className='sl-archive-data-pill'>
                  <Text className='sl-archive-data-pill__label'>{item.bloodOrAllergyLabel}</Text>
                  <Text className='sl-archive-data-pill__value sl-auto-data' {...{ dir: 'auto' }}>{item.bloodOrAllergyValue}</Text>
                </View>
              </View>

              <View className='sl-archive-card-footer'>
                <Button className='sl-archive-inline-action' onClick={() => onOpen(item)}>
                  {t('workbench.enterArchive')} <Text className='sl-directional-icon'>→</Text>
                </Button>
              </View>
            </View>
          </SwiperItem>
        ))}
      </Swiper>

      <View className='sl-carousel-dots'>
        {items.map((item, index) => (
          <View key={item.id} className={index === safeIndex ? 'sl-carousel-dot is-active' : 'sl-carousel-dot'} />
        ))}
      </View>

      {activeItem ? <View className='sl-carousel-active-sr sl-auto-data' {...{ dir: 'auto' }}>{activeItem.name}</View> : null}
    </View>
  );
});

export default ArchiveCarousel;
