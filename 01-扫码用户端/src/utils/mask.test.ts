import { describe, expect, it } from 'vitest';
import { formatMaskedContact, maskArchiveNo, maskName, maskPhone } from './mask';

describe('scan mask utilities', () => {
  it('masks phone numbers while preserving invalid short values', () => {
    expect(maskPhone('13812345678')).toBe('138****5678');
    expect(maskPhone('123456')).toBe('123456');
    expect(maskPhone('')).toBe('');
  });

  it('masks names and archive numbers', () => {
    expect(maskName('王桂兰')).toBe('王**');
    expect(maskName('王')).toBe('王');
    expect(maskName('')).toBe('');
    expect(maskArchiveNo('A1779472746389')).toBe('A17****389');
    expect(maskArchiveNo('A123')).toBe('A123');
    expect(maskArchiveNo('')).toBe('');
  });

  it('formats contact labels by surname and relationship hints', () => {
    expect(formatMaskedContact('赵家属', '女儿')).toBe('赵女士');
    expect(formatMaskedContact('李家属', '父亲')).toBe('李男士');
    expect(formatMaskedContact('', '')).toBe('某家属');
    expect(formatMaskedContact('张', '姐姐')).toBe('张女士');
    expect(formatMaskedContact('刘', '叔叔')).toBe('刘男士');
    expect(formatMaskedContact('陈', '朋友')).toBe('陈家属');
    expect(formatMaskedContact('', '女儿')).toBe('某女士');
  });
});
