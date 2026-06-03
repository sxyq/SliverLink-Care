export default {
  pages: ['pages/home/index', 'pages/auth/login', 'pages/auth-role-redirect/index'],
  subpackages: [
    {
      root: 'subpackages/scan',
      pages: ['landing/index', 'verify/index', 'archive/index', 'medications/index', 'scales/index', 'nameplate/index'],
    },
    {
      root: 'subpackages/workbench',
      pages: ['elder-list/index', 'elder-detail/index', 'basic/index', 'medication/index', 'scale/index', 'qrcode/index'],
    },
  ],
  window: {
    navigationBarTitleText: '智联名牌',
    navigationBarBackgroundColor: '#edf6fb',
    navigationBarTextStyle: 'black',
    backgroundTextStyle: 'light',
    backgroundColor: '#f4f8fb',
  },
  networkTimeout: {
    request: 15000,
    downloadFile: 20000,
  },
};
