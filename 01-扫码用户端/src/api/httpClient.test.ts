import { describe, expect, it, vi, beforeEach } from 'vitest';
import { httpClient } from './httpClient';
import { i18nRuntime } from '../i18n';

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('httpClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    i18nRuntime.setLocale('zh-CN');
  });

  it('merges json headers and returns envelope data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ code: 200, data: { ok: true } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(httpClient('/api/demo', { headers: { 'X-Test': '1' } })).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith('/silverlink-api/api/demo', expect.objectContaining({
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        'X-Test': '1',
      }),
    }));
  });

  it('returns plain json when backend does not use envelope format', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: true })));

    await expect(httpClient('/api/plain')).resolves.toEqual({ ok: true });
  });

  it('hides unregistered technical messages from server failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: 'no' }, { status: 500 })));

    await expect(httpClient('/api/fail')).rejects.toThrow('请求失败，请稍后重试');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>proxy request id=abc</html>', { status: 400 })));
    await expect(httpClient('/api/proxy-error')).rejects.toThrow('请求失败，请稍后重试');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('upstream connection reset', { status: 403 })));
    await expect(httpClient('/api/plain-technical-error')).rejects.toThrow('请求失败，请稍后重试');
  });

  it('keeps a registered key on server failures and hides transport errors', async () => {
    i18nRuntime.setLocale('ug-Arab-CN');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      message: '服务器异常',
      messageKey: 'errors.loginFailed',
    }, { status: 500 })));
    await expect(httpClient('/api/known-server-fail')).rejects.toThrow(i18nRuntime.t('errors.loginFailed'));

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network implementation detail')));
    await expect(httpClient('/api/network-fail')).rejects.toThrow(i18nRuntime.t('errors.requestFailed'));
  });

  it('throws envelope business errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ code: 400, message: '业务错误', data: null })));

    await expect(httpClient('/api/business-fail')).rejects.toThrow('业务错误');
  });

  it('localizes known message keys and preserves unknown or legacy messages', async () => {
    i18nRuntime.setLocale('ug-Arab-CN');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      code: 401,
      message: '账号或密码错误',
      messageKey: 'errors.loginFailed',
      data: null,
    })));
    await expect(httpClient('/api/known-key')).rejects.toThrow('ھېسابات ياكى پارول خاتا');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      code: 400,
      message: '服务端自定义提示',
      messageKey: 'errors.unknownKey',
      data: null,
    })));
    await expect(httpClient('/api/unknown-key')).rejects.toThrow('服务端自定义提示');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      code: 400,
      message: '旧接口中文提示',
      data: null,
    })));
    await expect(httpClient('/api/legacy')).rejects.toThrow('旧接口中文提示');

    i18nRuntime.setLocale('kk-Arab-CN');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      code: 401,
      message: '账号或密码错误',
      messageKey: 'errors.loginFailed',
      data: null,
    })));
    await expect(httpClient('/api/known-key-kk')).rejects.toThrow('ەسەپتىك جازبا نەمەسە قۇپياسوز دۇرىس ەمەس');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      code: 500,
      messageKey: 'errors.unknownKey',
      data: null,
    })));
    await expect(httpClient('/api/no-message')).rejects.toThrow('سۇراۋ ءساتسىز اياقتالدى, كەيىنىرەك قايتالاپ كورىڭىز');
  });
});
