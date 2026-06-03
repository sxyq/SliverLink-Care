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

function buildDirectParamsFromSearchParams(params: URLSearchParams) {
  return {
    qrToken: normalizeValue(params.get('qrToken') || params.get('token') || params.get('qr')),
    elderId: normalizeValue(params.get('elderId')),
    archiveNo: normalizeValue(params.get('archiveNo')),
    inviteCode: normalizeValue(params.get('inviteCode')),
    source: normalizeValue(params.get('source')),
    rawScene: normalizeValue(params.get('scene')),
  } satisfies LaunchRouteParams;
}

function extractPathQrToken(pathname: string) {
  const match = pathname.match(/\/s\/([^/?#]+)/);
  return normalizeValue(match?.[1] || '');
}

export function parseSceneString(scene?: string) {
  if (!scene) {
    return {};
  }

  const decoded = decodeURIComponent(scene);
  const params = buildDirectParamsFromSearchParams(new URLSearchParams(decoded));

  return {
    ...params,
    rawScene: decoded,
  } satisfies LaunchRouteParams;
}

export function parseQueryParams(query: Record<string, unknown> = {}) {
  const directParams = {
    qrToken: normalizeValue(String(query.qrToken ?? query.token ?? '')),
    elderId: normalizeValue(String(query.elderId ?? '')),
    archiveNo: normalizeValue(String(query.archiveNo ?? '')),
    inviteCode: normalizeValue(String(query.inviteCode ?? '')),
    source: normalizeValue(String(query.source ?? '')),
    rawScene: normalizeValue(String(query.scene ?? '')),
  } satisfies LaunchRouteParams;

  return mergeLaunchRouteParams(directParams, parseSceneString(directParams.rawScene));
}

export function parseRouteText(rawText?: string): LaunchRouteParams {
  const text = String(rawText || '').trim();

  if (!text) {
    return {};
  }

  if (!text.includes('/') && !text.includes('?') && !text.includes('=') && !text.includes('&') && !text.includes('#')) {
    return {
      qrToken: normalizeValue(text),
    } satisfies LaunchRouteParams;
  }

  if (!text.includes('/') && (text.includes('=') || text.includes('&'))) {
    return parseSceneString(text);
  }

  try {
    const url = new URL(text, 'https://silverlink.local');
    const directParams = buildDirectParamsFromSearchParams(url.searchParams);
    const sceneParams = parseSceneString(directParams.rawScene);
    const pathQrToken = extractPathQrToken(url.pathname);

    return mergeLaunchRouteParams(
      directParams,
      sceneParams,
      pathQrToken
        ? {
            qrToken: pathQrToken,
          }
        : undefined,
    );
  } catch {
    return {};
  }
}

export function mergeLaunchRouteParams(...parts: Array<LaunchRouteParams | undefined>): LaunchRouteParams {
  return parts.reduce<LaunchRouteParams>((acc, part) => ({ ...acc, ...part }), {});
}

export function hasScanContext(params: LaunchRouteParams) {
  return Boolean(params.qrToken || params.elderId || params.archiveNo);
}
