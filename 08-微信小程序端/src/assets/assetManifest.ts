export type AssetCategory = 'brand' | 'home' | 'empty' | 'scan' | 'review';
export type AssetDeliveryStatus = 'pending' | 'reusable' | 'ready';

export interface AssetManifestItem {
  key: string;
  category: AssetCategory;
  relativePath: string;
  requiredForRelease: boolean;
  requiredForReview: boolean;
  deliveryStatus: AssetDeliveryStatus;
  source: string;
  usage: string;
}

export const assetManifest: AssetManifestItem[] = [
  {
    key: 'brand-logo-square',
    category: 'brand',
    relativePath: 'brand/logo-square.png',
    requiredForRelease: true,
    requiredForReview: true,
    deliveryStatus: 'pending',
    source: '需要使用最终确定的小程序头像素材导出为 144x144 以上正方形 PNG。',
    usage: '小程序头像、启动页与品牌角标。',
  },
  {
    key: 'home-hero-elder-care',
    category: 'home',
    relativePath: 'home/hero-elder-care.png',
    requiredForRelease: false,
    requiredForReview: false,
    deliveryStatus: 'pending',
    source: '可复用现有 H5 首页视觉方向，重新导出适配小程序的头图素材。',
    usage: '首页头图区，用于强化扫码查看与家属协同的双入口定位。',
  },
  {
    key: 'empty-no-record',
    category: 'empty',
    relativePath: 'empty/no-record.png',
    requiredForRelease: false,
    requiredForReview: false,
    deliveryStatus: 'reusable',
    source: '可沿用现有空态图标语义，也可先用纯文案空态占位。',
    usage: '老人档案、用药或量表暂无数据时的空态插图。',
  },
  {
    key: 'scan-card-preview',
    category: 'scan',
    relativePath: 'scan/card-preview.png',
    requiredForRelease: false,
    requiredForReview: true,
    deliveryStatus: 'pending',
    source: '建议从现有实体卡设计稿导出一张预览图，用于审核说明与页面示意。',
    usage: '扫码落地页或名牌页展示实体卡示意图。',
  },
  {
    key: 'review-default-avatar',
    category: 'review',
    relativePath: 'review/default-avatar.png',
    requiredForRelease: false,
    requiredForReview: true,
    deliveryStatus: 'pending',
    source: '审核演示资料使用，若没有真实人物头像可使用统一的默认示意头像。',
    usage: '提审演示账号、审核截图与帮助说明中的默认人物头像。',
  },
  {
    key: 'review-flow-cover',
    category: 'review',
    relativePath: 'review/flow-cover.png',
    requiredForRelease: false,
    requiredForReview: true,
    deliveryStatus: 'pending',
    source: '建议制作一张首页双入口与老人详情能力的审核说明封面图。',
    usage: '审核材料、版本说明或内部联调用的流程概览图。',
  },
];

export function getRequiredReleaseAssets() {
  return assetManifest.filter((item) => item.requiredForRelease);
}

export function getRequiredReviewAssets() {
  return assetManifest.filter((item) => item.requiredForReview);
}

export function getAssetsByCategory(category: AssetCategory) {
  return assetManifest.filter((item) => item.category === category);
}

export function getPendingAssets() {
  return assetManifest.filter((item) => item.deliveryStatus === 'pending');
}
