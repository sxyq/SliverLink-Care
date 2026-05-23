interface VerificationState {
  phone: string;
  maskedPhone: string;
  countdown: number;
  canResend: boolean;
  backupPhone: string | null;
  backupCountdown: number;
  canSwitchBackup: boolean;
  verified: boolean;
}

let state: VerificationState = {
  phone: '',
  maskedPhone: '',
  countdown: 60,
  canResend: false,
  backupPhone: null,
  backupCountdown: 120,
  canSwitchBackup: false,
  verified: false,
};

type Listener = () => void;
const listeners: Listener[] = [];

function notify() {
  listeners.forEach((l) => l());
}

let countdownTimer: ReturnType<typeof setInterval> | null = null;
let backupCountdownTimer: ReturnType<typeof setInterval> | null = null;

export function subscribe(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

export function getVerificationState(): VerificationState {
  return state;
}

function maskPhone(phone: string): string {
  if (phone.length === 11) {
    return phone.slice(0, 3) + '****' + phone.slice(-4);
  }
  return phone;
}

export function initVerification(phone: string, backupPhone?: string) {
  if (countdownTimer) clearInterval(countdownTimer);
  if (backupCountdownTimer) clearInterval(backupCountdownTimer);

  state = {
    phone,
    maskedPhone: maskPhone(phone),
    countdown: 60,
    canResend: false,
    backupPhone: backupPhone || null,
    backupCountdown: 120,
    canSwitchBackup: false,
    verified: false,
  };
  notify();

  countdownTimer = setInterval(() => {
    if (state.countdown > 0) {
      state = { ...state, countdown: state.countdown - 1 };
      notify();
    } else {
      state = { ...state, canResend: true };
      if (countdownTimer) clearInterval(countdownTimer);
      notify();
    }
  }, 1000);

  backupCountdownTimer = setInterval(() => {
    if (state.backupCountdown > 0) {
      state = { ...state, backupCountdown: state.backupCountdown - 1 };
      notify();
    } else {
      state = { ...state, canSwitchBackup: true };
      if (backupCountdownTimer) clearInterval(backupCountdownTimer);
      notify();
    }
  }, 1000);
}

export function resetCountdown() {
  state = { ...state, countdown: 60, canResend: false };
  notify();

  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    if (state.countdown > 0) {
      state = { ...state, countdown: state.countdown - 1 };
      notify();
    } else {
      state = { ...state, canResend: true };
      if (countdownTimer) clearInterval(countdownTimer);
      notify();
    }
  }, 1000);
}

export function switchToBackup() {
  if (state.backupPhone && state.canSwitchBackup) {
    state = {
      ...state,
      phone: state.backupPhone,
      maskedPhone: maskPhone(state.backupPhone),
      countdown: 60,
      canResend: false,
      canSwitchBackup: false,
      backupCountdown: 0,
    };
    notify();

    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      if (state.countdown > 0) {
        state = { ...state, countdown: state.countdown - 1 };
        notify();
      } else {
        state = { ...state, canResend: true };
        if (countdownTimer) clearInterval(countdownTimer);
        notify();
      }
    }, 1000);
  }
}

export function setVerified(verified: boolean) {
  state = { ...state, verified };
  notify();
}

export function resetVerificationState() {
  if (countdownTimer) clearInterval(countdownTimer);
  if (backupCountdownTimer) clearInterval(backupCountdownTimer);
  state = {
    phone: '',
    maskedPhone: '',
    countdown: 60,
    canResend: false,
    backupPhone: null,
    backupCountdown: 120,
    canSwitchBackup: false,
    verified: false,
  };
  notify();
}
