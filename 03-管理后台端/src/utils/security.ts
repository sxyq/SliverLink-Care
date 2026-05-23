/**
 * 安全策略展示格式化工具
 */

export type SecurityStatus = '已启用' | '未配置' | '已配置';

export function getSecurityStatusColor(status: SecurityStatus): string {
  switch (status) {
    case '已启用':
      return '#0a8067';
    case '已配置':
      return '#115f72';
    case '未配置':
      return '#687989';
    default:
      return '#687989';
  }
}

export function getSecurityStatusBg(status: SecurityStatus): string {
  switch (status) {
    case '已启用':
      return '#e6f5f1';
    case '已配置':
      return '#e6f0f5';
    case '未配置':
      return '#eef2f5';
    default:
      return '#eef2f5';
  }
}
