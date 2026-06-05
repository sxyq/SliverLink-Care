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

function patchState(patch: Partial<VerificationState>) {
  state = { ...state, ...patch };
  notify();
}

function stopCountdownTimer() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function stopBackupCountdownTimer() {
  if (backupCountdownTimer) {
    clearInterval(backupCountdownTimer);
    backupCountdownTimer = null;
  }
}

function startCountdownTimer() {
  stopCountdownTimer();
  countdownTimer = setInterval(() => {
    if (state.countdown > 0) {
      patchState({ countdown: state.countdown - 1 });
      return;
    }
    stopCountdownTimer();
    patchState({ canResend: true });
  }, 1000);
}

function startBackupCountdownTimer() {
  stopBackupCountdownTimer();
  backupCountdownTimer = setInterval(() => {
    if (state.backupCountdown > 0) {
      patchState({ backupCountdown: state.backupCountdown - 1 });
      return;
    }
    stopBackupCountdownTimer();
    patchState({ canSwitchBackup: true });
  }, 1000);
}

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
  stopCountdownTimer();
  stopBackupCountdownTimer();

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
  startCountdownTimer();
  startBackupCountdownTimer();
}

export function resetCountdown() {
  patchState({ countdown: 60, canResend: false });
  startCountdownTimer();
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
    stopBackupCountdownTimer();
    startCountdownTimer();
  }
}

export function setVerified(verified: boolean) {
  patchState({ verified });
}

export function resetVerificationState() {
  stopCountdownTimer();
  stopBackupCountdownTimer();
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
