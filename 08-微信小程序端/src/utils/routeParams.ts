export interface LaunchRouteParams {
  qrToken?: string;
  elderId?: string;
  archiveNo?: string;
  inviteCode?: string;
  source?: string;
  rawScene?: string;
}

function normalizeValue(value?: string | null) {
  return value == null || value === '' ? undefined : String(value);
}

export function parseSceneString(scene?: string) {
  if (!scene) {
    return {};
  }

  const decoded = decodeURIComponent(scene);
  const params = new URLSearchParams(decoded);

  return {
    qrToken: normalizeValue(params.get('qrToken') || params.get('token')),
    elderId: normalizeValue(params.get('elderId')),
    archiveNo: normalizeValue(params.get('archiveNo')),
    inviteCode: normalizeValue(params.get('inviteCode')),
    source: normalizeValue(params.get('source')),
    rawScene: decoded,
  } satisfies LaunchRouteParams;
}

export function parseQueryParams(query: Record<string, unknown> = {}) {
  return {
    qrToken: normalizeValue(String(query.qrToken ?? query.token ?? '')),
    elderId: normalizeValue(String(query.elderId ?? '')),
    archiveNo: normalizeValue(String(query.archiveNo ?? '')),
    inviteCode: normalizeValue(String(query.inviteCode ?? '')),
    source: normalizeValue(String(query.source ?? '')),
    rawScene: normalizeValue(String(query.scene ?? '')),
  } satisfies LaunchRouteParams;
}

export function mergeLaunchRouteParams(...parts: Array<LaunchRouteParams | undefined>): LaunchRouteParams {
  return parts.reduce<LaunchRouteParams>((acc, part) => ({ ...acc, ...part }), {});
}

export function hasScanContext(params: LaunchRouteParams) {
  return Boolean(params.qrToken || params.elderId || params.archiveNo);
}
