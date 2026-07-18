export const ADMIN_NOTICE_EVENT = 'sl-admin-notice';

export function showAdminSuccess(message: string) {
  window.dispatchEvent(new CustomEvent<string>(ADMIN_NOTICE_EVENT, { detail: message }));
}
