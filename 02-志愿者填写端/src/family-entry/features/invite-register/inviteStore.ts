import type { InvitationPreview } from '../../types';

interface InviteState {
  invitation: InvitationPreview | null;
  loading: boolean;
  error: string | null;
}

let state: InviteState = {
  invitation: null,
  loading: false,
  error: null,
};

type Listener = () => void;
const listeners: Listener[] = [];

function notify() {
  listeners.forEach((l) => l());
}

export function subscribe(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

export function getInviteState(): InviteState {
  return state;
}

export function setInviteLoading(loading: boolean) {
  state = { ...state, loading };
  notify();
}

export function setInviteData(invitation: InvitationPreview) {
  state = { ...state, invitation, loading: false, error: null };
  notify();
}

export function setInviteError(error: string) {
  state = { ...state, error, loading: false };
  notify();
}

export function resetInviteState() {
  state = { invitation: null, loading: false, error: null };
  notify();
}
