/**
 * 后台菜单配置，与 RBAC 权限码对应
 */

import type { NavItem } from '../types';

export const menuConfig: NavItem[] = [
  { label: '首页概览', path: '/' },
  { label: '老人档案', path: '/elders' },
  { label: '二维码管理', path: '/qrcodes' },
  { label: '志愿者管理', path: '/volunteers' },
  { label: '邀请码管理', path: '/invitations' },
  { label: '家属绑定', path: '/family-bindings' },
  { label: '角色权限', path: '/rbac' },
  { label: '安全策略', path: '/security' },
  { label: '操作日志', path: '/audit' },
];
