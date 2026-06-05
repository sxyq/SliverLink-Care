import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getVerificationState,
  initVerification,
  resetCountdown,
  resetVerificationState,
  setVerified,
  subscribe,
  switchToBackup,
} from './verificationStore';

describe('family verification store', () => {
  afterEach(() => {
    resetVerificationState();
    vi.useRealTimers();
  });

  it('subscribes, initializes masked phones and ticks both countdowns', () => {
    vi.useFakeTimers();
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    initVerification('13800006666', '13900007777');
    expect(getVerificationState()).toMatchObject({
      phone: '13800006666',
      maskedPhone: '138****6666',
      backupPhone: '13900007777',
      countdown: 60,
      backupCountdown: 120,
    });
    expect(listener).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    expect(getVerificationState().countdown).toBe(59);
    expect(getVerificationState().backupCountdown).toBe(119);
    unsubscribe();
    vi.advanceTimersByTime(1000);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('enables resend and backup switch when countdowns finish', () => {
    vi.useFakeTimers();
    initVerification('12345', '13900007777');

    vi.advanceTimersByTime(121000);
    expect(getVerificationState()).toMatchObject({
      maskedPhone: '12345',
      canResend: true,
      canSwitchBackup: true,
    });

    switchToBackup();
    expect(getVerificationState()).toMatchObject({
      phone: '13900007777',
      maskedPhone: '139****7777',
      countdown: 60,
      canResend: false,
      canSwitchBackup: false,
      backupCountdown: 0,
    });
  });

  it('resets countdown and verification state', () => {
    vi.useFakeTimers();
    initVerification('13800006666');
    setVerified(true);
    expect(getVerificationState().verified).toBe(true);

    resetCountdown();
    expect(getVerificationState()).toMatchObject({ countdown: 60, canResend: false });

    resetVerificationState();
    expect(getVerificationState()).toMatchObject({
      phone: '',
      maskedPhone: '',
      verified: false,
      backupPhone: null,
    });
  });

  it('does not switch to backup when canSwitchBackup is false', () => {
    vi.useFakeTimers();
    initVerification('13800006666', '13900007777');

    expect(getVerificationState().canSwitchBackup).toBe(false);
    switchToBackup();
    expect(getVerificationState().phone).toBe('13800006666');
  });

  it('does not switch to backup when backupPhone is null', () => {
    vi.useFakeTimers();
    initVerification('13800006666');

    vi.advanceTimersByTime(121000);
    expect(getVerificationState().canSwitchBackup).toBe(true);
    switchToBackup();
    expect(getVerificationState().phone).toBe('13800006666');
  });

  it('masks short phone numbers without asterisks', () => {
    initVerification('123');
    expect(getVerificationState().maskedPhone).toBe('123');
  });

  it('unsubscribe removes listener from future notifications', () => {
    vi.useFakeTimers();
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    initVerification('13800006666');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    setVerified(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('countdown timer ticks down to zero and enables resend', () => {
    vi.useFakeTimers();
    initVerification('13800006666');

    for (let i = 0; i < 61; i++) {
      vi.advanceTimersByTime(1000);
    }
    expect(getVerificationState().countdown).toBe(0);
    expect(getVerificationState().canResend).toBe(true);
    vi.useRealTimers();
  });

  it('backup countdown timer ticks down and canSwitchBackup becomes true', () => {
    vi.useFakeTimers();
    initVerification('13800006666', '13900007777');

    for (let i = 0; i < 121; i++) {
      vi.advanceTimersByTime(1000);
    }
    expect(getVerificationState().backupCountdown).toBe(0);
    expect(getVerificationState().canSwitchBackup).toBe(true);
    vi.useRealTimers();
  });

  it('resetCountdown restarts the countdown timer', () => {
    vi.useFakeTimers();
    initVerification('13800006666');

    vi.advanceTimersByTime(30000);
    expect(getVerificationState().countdown).toBe(30);

    resetCountdown();
    expect(getVerificationState().countdown).toBe(60);
    expect(getVerificationState().canResend).toBe(false);

    vi.advanceTimersByTime(1000);
    expect(getVerificationState().countdown).toBe(59);
  });

  it('initVerification clears previous timers', () => {
    vi.useFakeTimers();
    initVerification('13800006666');

    vi.advanceTimersByTime(30000);
    expect(getVerificationState().countdown).toBe(30);

    initVerification('13900007777');
    expect(getVerificationState().countdown).toBe(60);
    expect(getVerificationState().phone).toBe('13900007777');
  });

  it('setVerified updates verified state', () => {
    initVerification('13800006666');
    expect(getVerificationState().verified).toBe(false);

    setVerified(true);
    expect(getVerificationState().verified).toBe(true);

    setVerified(false);
    expect(getVerificationState().verified).toBe(false);
  });

  it('initVerification without backup phone sets backupPhone to null', () => {
    initVerification('13800006666');
    expect(getVerificationState().backupPhone).toBeNull();
    expect(getVerificationState().backupCountdown).toBe(120);
  });

  it('switchToBackup resets countdown and disables resend', () => {
    vi.useFakeTimers();
    initVerification('13800006666', '13900007777');

    vi.advanceTimersByTime(121000);
    expect(getVerificationState().canSwitchBackup).toBe(true);

    switchToBackup();
    expect(getVerificationState().countdown).toBe(60);
    expect(getVerificationState().canResend).toBe(false);
    expect(getVerificationState().canSwitchBackup).toBe(false);
    expect(getVerificationState().backupCountdown).toBe(0);
  });

  it('resetCountdown countdown timer ticks down after reset', () => {
    vi.useFakeTimers();
    initVerification('13800006666');

    for (let i = 0; i < 61; i++) {
      vi.advanceTimersByTime(1000);
    }
    expect(getVerificationState().canResend).toBe(true);

    resetCountdown();
    for (let i = 0; i < 61; i++) {
      vi.advanceTimersByTime(1000);
    }
    expect(getVerificationState().countdown).toBe(0);
    expect(getVerificationState().canResend).toBe(true);
    vi.useRealTimers();
  });

  it('multiple subscribers all receive notifications', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    subscribe(listener1);
    subscribe(listener2);

    initVerification('13800006666');
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);

    setVerified(true);
    expect(listener1).toHaveBeenCalledTimes(2);
    expect(listener2).toHaveBeenCalledTimes(2);
  });

  it('initVerification masks 11-digit phone', () => {
    initVerification('13812345678');
    expect(getVerificationState().maskedPhone).toBe('138****5678');
  });

  it('backup countdown timer stops at zero', () => {
    vi.useFakeTimers();
    initVerification('13800006666', '13900007777');

    for (let i = 0; i < 122; i++) {
      vi.advanceTimersByTime(1000);
    }
    expect(getVerificationState().backupCountdown).toBe(0);
    expect(getVerificationState().canSwitchBackup).toBe(true);
  });

  it('preserves resend state while backup timer continues ticking', () => {
    vi.useFakeTimers();
    initVerification('13800006666', '13900007777');

    for (let i = 0; i < 61; i++) {
      vi.advanceTimersByTime(1000);
    }
    expect(getVerificationState().canResend).toBe(true);
    expect(getVerificationState().backupCountdown).toBe(59);

    vi.advanceTimersByTime(1000);
    expect(getVerificationState().canResend).toBe(true);
    expect(getVerificationState().backupCountdown).toBe(58);
  });
});
