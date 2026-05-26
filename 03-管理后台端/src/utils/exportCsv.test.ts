import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportToCsv } from './exportCsv';

describe('exportToCsv', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('does nothing for empty rows', () => {
    const createElement = vi.spyOn(document, 'createElement');
    exportToCsv('empty.csv', []);
    expect(createElement).not.toHaveBeenCalled();
  });

  it('creates a csv download and escapes cells', async () => {
    const createdUrls: string[] = [];
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => {
        createdUrls.push('blob:test');
        return 'blob:test';
      }),
      revokeObjectURL: vi.fn(),
    });
    const click = vi.fn();
    const createElement = vi.spyOn(document, 'createElement');
    createElement.mockImplementation((tagName: string) => {
      const element = Document.prototype.createElement.call(document, tagName) as HTMLAnchorElement;
      if (tagName === 'a') {
        element.click = click;
      }
      return element;
    });

    exportToCsv('logs.csv', [{ name: '王,芳', note: '他说"好"' }]);

    expect(createdUrls).toEqual(['blob:test']);
    expect(click).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});
