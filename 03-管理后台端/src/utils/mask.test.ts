import { describe, expect, it } from 'vitest';
import { maskIdCard, maskName, maskPhone } from './mask';

describe('admin mask utilities', () => {
  it('masks valid phone numbers only', () => {
    expect(maskPhone('13812345678')).toBe('138****5678');
    expect(maskPhone('123')).toBe('123');
  });

  it('masks id cards with prefix and suffix', () => {
    expect(maskIdCard('500102200212180836')).toBe('500********0836');
    expect(maskIdCard('1234567')).toBe('1234567');
  });

  it('masks names according to length', () => {
    expect(maskName('王')).toBe('王');
    expect(maskName('王芳')).toBe('王*');
    expect(maskName('王桂兰')).toBe('王**');
  });
});
