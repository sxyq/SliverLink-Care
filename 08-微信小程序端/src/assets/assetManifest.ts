export type AssetCategory = 'brand' | 'home' | 'empty' | 'scan' | 'review';

export interface AssetManifestItem {
  key: string;
  category: AssetCategory;
  relativePath: string;
  requiredForRelease: boolean;
  usage: string;
}

export const assetManifest: AssetManifestItem[] = [
  {
    key: 'brand-logo-square',
    category: 'brand',
    relativePath: 'brand/logo-square.png',
    requiredForRelease: true,
    usage: '小程序头像、启动页与品牌角标。',
  },
  {
    key: 'home-hero-elder-care',
    category: 'home',
    relativePath: 'home/hero-elder-care.png',
    requiredForRelease: false,
    usage: '首页头图区，用于强化扫码查看与家属协同的双入口定位。',
  },
  {
    key: 'empty-no-record',
    category: 'empty',
    relativePath: 'empty/no-record.png',
    requiredForRelease: false,
    usage: '老人档案、用药或量表暂无数据时的空态插图。',
  },
  {
    key: 'scan-card-preview',
    category: 'scan',
    relativePath: 'scan/card-preview.png',
    requiredForRelease: false,
    usage: '扫码落地页或名牌页展示实体卡示意图。',
  },
  {
    key: 'review-default-avatar',
    category: 'review',
    relativePath: 'review/default-avatar.png',
    requiredForRelease: false,
    usage: '提审演示账号、审核截图与帮助说明中的默认人物头像。',
  },
];

export function getRequiredReleaseAssets() {
  return assetManifest.filter((item) => item.requiredForRelease);
}

export function getAssetsByCategory(category: AssetCategory) {
  return assetManifest.filter((item) => item.category === category);
}
