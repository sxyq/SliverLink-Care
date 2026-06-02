export default {
  pages: ['pages/home/index', 'pages/auth/login', 'pages/auth-role-redirect/index'],
  subpackages: [
    {
      root: 'subpackages/scan',
      pages: ['landing/index', 'verify/index'],
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
