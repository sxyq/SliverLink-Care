import { describe, it, expect } from 'vitest';
import { getSecurityStatusColor, getSecurityStatusBg } from './security';
import type { SecurityStatus } from './security';

describe('getSecurityStatusColor', () => {
  it('returns #0a8067 for 已启用', () => {
    expect(getSecurityStatusColor('已启用')).toBe('#0a8067');
  });

  it('returns #115f72 for 已配置', () => {
    expect(getSecurityStatusColor('已配置')).toBe('#115f72');
  });

  it('returns #687989 for 未配置', () => {
    expect(getSecurityStatusColor('未配置')).toBe('#687989');
  });

  it('returns #687989 for default case', () => {
    expect(getSecurityStatusColor('unknown' as SecurityStatus)).toBe('#687989');
  });
});

describe('getSecurityStatusBg', () => {
  it('returns #e6f5f1 for 已启用', () => {
    expect(getSecurityStatusBg('已启用')).toBe('#e6f5f1');
  });

  it('returns #e6f0f5 for 已配置', () => {
    expect(getSecurityStatusBg('已配置')).toBe('#e6f0f5');
  });

  it('returns #eef2f5 for 未配置', () => {
    expect(getSecurityStatusBg('未配置')).toBe('#eef2f5');
  });

  it('returns #eef2f5 for default case', () => {
    expect(getSecurityStatusBg('unknown' as SecurityStatus)).toBe('#eef2f5');
  });
});
