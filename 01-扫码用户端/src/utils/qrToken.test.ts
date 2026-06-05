import { describe, expect, it } from 'vitest';
import { isValidQrToken, readQrToken } from './qrToken';

function setLocation(url: string) {
  window.history.pushState({}, '', url);
}

describe('qr token utilities', () => {
  it('reads path tokens before query tokens', () => {
    setLocation('/silverlink/scan/s/path-token?token=query-token');
    expect(readQrToken()).toBe('path-token');
  });

  it('reads token and qr query aliases', () => {
    setLocation('/silverlink/scan/?token=query-token');
    expect(readQrToken()).toBe('query-token');
    setLocation('/silverlink/scan/?qr=qr-token');
    expect(readQrToken()).toBe('qr-token');
  });

  it('normalizes legacy query tokens whose plus signs became spaces', () => {
    setLocation('/silverlink/scan/?token=a%20b%20c');
    expect(readQrToken()).toBe('a+b+c');
  });

  it('validates minimum token length', () => {
    expect(isValidQrToken('12345678')).toBe(true);
    expect(isValidQrToken('short')).toBe(false);
  });
});
