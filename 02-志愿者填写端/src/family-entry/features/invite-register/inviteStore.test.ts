import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getInviteState,
  resetInviteState,
  setInviteData,
  setInviteError,
  setInviteLoading,
  subscribe,
} from './inviteStore';

describe('inviteStore', () => {
  beforeEach(() => {
    resetInviteState();
  });

  it('notifies subscribers and supports unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    setInviteLoading(true);
    expect(getInviteState()).toMatchObject({ loading: true, error: null });
    expect(listener).toHaveBeenCalledTimes(1);

    setInviteData({ code: 'INVITE', elderName: '老人', archiveNo: 'A001', relationship: '女儿' });
    expect(getInviteState()).toMatchObject({ loading: false, invitation: { code: 'INVITE' } });
    expect(listener).toHaveBeenCalledTimes(2);

    setInviteError('邀请码无效');
    expect(getInviteState()).toMatchObject({ loading: false, error: '邀请码无效' });
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    resetInviteState();
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
