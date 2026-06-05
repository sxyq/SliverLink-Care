import { memo } from 'react';
import { Button, Swiper, SwiperItem, Text, View } from '@tarojs/components';

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
  const safeIndex = Math.min(Math.max(activeIndex, 0), Math.max(items.length - 1, 0));
  const activeItem = items[safeIndex];
  const hasMultipleItems = items.length > 1;

  return (
    <View className='sl-archive-layout'>
      <View className='sl-archive-overview'>
        <View className='sl-archive-overview-copy'>
          <Text className='sl-overview-kicker'>老人档案</Text>
          <View className='sl-archive-overview-copy__title'>{items.length > 1 ? '左右滑动切换档案' : '当前负责老人档案'}</View>
          <Text className='sl-archive-overview-copy__desc'>
            当前共 {items.length} 位老人{items.length > 1 ? `，正在查看第 ${safeIndex + 1} 位` : ''}
          </Text>
        </View>

        {hasMultipleItems ? (
          <View className='sl-carousel-nav'>
            <Button className={safeIndex === 0 ? 'sl-carousel-btn is-disabled' : 'sl-carousel-btn'} disabled={safeIndex === 0} onClick={() => onChange(safeIndex - 1)}>
              ←
            </Button>
            <Button
              className={safeIndex >= items.length - 1 ? 'sl-carousel-btn is-disabled' : 'sl-carousel-btn'}
              disabled={safeIndex >= items.length - 1}
              onClick={() => onChange(safeIndex + 1)}
            >
              →
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
                  <View className='sl-archive-card-name'>{item.name}</View>
                  <Text className='sl-archive-card-subtitle'>
                    档案编号 {item.archiveNo || '待生成'} {item.gender || '待补充'} {item.age || '年龄待补充'}
                  </Text>
                  <View className='sl-archive-card-subtitle sl-archive-card-residence'>
                    <Text>住址 {item.residence || '待补充'}</Text>
                  </View>
                </View>
              </View>

              <View className='sl-archive-card-grid'>
                <View className='sl-archive-data-pill'>
                  <Text className='sl-archive-data-pill__label'>状态</Text>
                  <Text className='sl-archive-data-pill__value'>{item.status}</Text>
                </View>
                <View className='sl-archive-data-pill'>
                  <Text className='sl-archive-data-pill__label'>联系人</Text>
                  <Text className='sl-archive-data-pill__value'>{item.contactName}</Text>
                </View>
                <View className='sl-archive-data-pill'>
                  <Text className='sl-archive-data-pill__label'>联系电话</Text>
                  <Text className='sl-archive-data-pill__value'>{item.contactPhone}</Text>
                </View>
                <View className='sl-archive-data-pill'>
                  <Text className='sl-archive-data-pill__label'>{item.bloodOrAllergyLabel}</Text>
                  <Text className='sl-archive-data-pill__value'>{item.bloodOrAllergyValue}</Text>
                </View>
              </View>

              <View className='sl-archive-card-footer'>
                <Button className='sl-archive-inline-action' onClick={() => onOpen(item)}>
                  进入档案 →
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

      {activeItem ? <View className='sl-carousel-active-sr'>{activeItem.name}</View> : null}
    </View>
  );
});

export default ArchiveCarousel;
