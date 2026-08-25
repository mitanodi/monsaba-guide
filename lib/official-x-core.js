export const OFFICIAL_X_CONFIG = Object.freeze({
  username: 'monsaba_jp',
  postCount: 5,
  cacheSeconds: 60 * 60,
});

export class OfficialXError extends Error {
  constructor(code, message, status = 503, diagnostics = null) {
    super(message);
    this.name = 'OfficialXError';
    this.code = code;
    this.status = status;
    this.diagnostics = diagnostics ? Object.freeze({ ...diagnostics }) : null;
  }
}

const USER_ID_PATTERN = /^\d+$/;
const SAFE_MEDIA_HOST = /(^|\.)twimg\.com$/i;
const SAFE_DIAGNOSTIC_CODE = /^[A-Za-z0-9._-]{1,64}$/;

function endpointName(url) {
  return url.pathname.includes('/by/username/') ? 'user_lookup' : 'user_timeline';
}

function upstreamCode(payload) {
  const candidates = [payload?.reason, payload?.title, payload?.errors?.[0]?.code];
  return candidates.map((value) => String(value ?? '')).find((value) => SAFE_DIAGNOSTIC_CODE.test(value)) || 'unknown';
}

function safeMediaUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' && SAFE_MEDIA_HOST.test(url.hostname) ? url.href : '';
  } catch {
    return '';
  }
}

async function requestXApi(url, bearerToken, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        Accept: 'application/json',
        'User-Agent': 'monsaba-guide-official-x/1.0',
      },
    });
  } catch {
    throw new OfficialXError('X_API_UNAVAILABLE', 'X APIへ接続できませんでした。', 502, {
      endpoint: endpointName(url),
      upstreamStatus: 0,
      upstreamCode: 'network_error',
    });
  }

  let payload;
  try { payload = await response.json(); }
  catch { payload = null; }
  if (!response.ok || !payload) throw new OfficialXError('X_API_UNAVAILABLE', 'X APIから投稿を取得できませんでした。', 502, {
    endpoint: endpointName(url),
    upstreamStatus: Number.isInteger(response.status) ? response.status : 0,
    upstreamCode: payload ? upstreamCode(payload) : 'invalid_json',
  });
  return payload;
}

async function resolveUserId({ bearerToken, configuredUserId, fetchImpl }) {
  if (configuredUserId) {
    if (!USER_ID_PATTERN.test(configuredUserId)) throw new OfficialXError('X_API_CONFIG_INVALID', '公式XのUser ID設定が正しくありません。');
    return configuredUserId;
  }

  const lookupUrl = new URL(`https://api.x.com/2/users/by/username/${OFFICIAL_X_CONFIG.username}`);
  const payload = await requestXApi(lookupUrl, bearerToken, fetchImpl);
  const userId = String(payload.data?.id || '');
  if (!USER_ID_PATTERN.test(userId)) throw new OfficialXError('X_ACCOUNT_NOT_FOUND', '公式Xアカウントを確認できませんでした。', 502);
  return userId;
}

function normalizePosts(payload) {
  const mediaByKey = new Map((payload.includes?.media || []).map((media) => [media.media_key, media]));
  return (payload.data || []).slice(0, OFFICIAL_X_CONFIG.postCount).flatMap((post) => {
    const id = String(post.id || '');
    const text = post.note_tweet?.text ?? post.text;
    if (!USER_ID_PATTERN.test(id) || typeof text !== 'string' || !text.trim() || Number.isNaN(Date.parse(post.created_at))) return [];
    const media = (post.attachments?.media_keys || []).flatMap((key) => {
      const item = mediaByKey.get(key);
      if (!item) return [];
      const url = safeMediaUrl(item.type === 'photo' ? item.url : item.preview_image_url);
      if (!url) return [];
      return [{
        type: item.type === 'photo' ? 'photo' : 'preview',
        url,
        altText: typeof item.alt_text === 'string' ? item.alt_text : '',
        width: Number.isInteger(item.width) ? item.width : null,
        height: Number.isInteger(item.height) ? item.height : null,
      }];
    });
    return [{
      id,
      text,
      createdAt: new Date(post.created_at).toISOString(),
      url: `https://x.com/${OFFICIAL_X_CONFIG.username}/status/${id}`,
      media,
    }];
  });
}

export async function fetchOfficialXPosts({
  bearerToken,
  configuredUserId = '',
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!bearerToken) throw new OfficialXError('X_API_NOT_CONFIGURED', '公式X投稿の取得設定が完了していません。');
  if (typeof fetchImpl !== 'function') throw new OfficialXError('X_API_UNAVAILABLE', 'X APIへ接続できませんでした。', 502);

  const userId = await resolveUserId({ bearerToken, configuredUserId, fetchImpl });
  const timelineUrl = new URL(`https://api.x.com/2/users/${userId}/tweets`);
  timelineUrl.searchParams.set('max_results', String(OFFICIAL_X_CONFIG.postCount));
  timelineUrl.searchParams.set('exclude', 'replies,retweets');
  timelineUrl.searchParams.set('tweet.fields', 'created_at,attachments,note_tweet');
  timelineUrl.searchParams.set('expansions', 'attachments.media_keys');
  timelineUrl.searchParams.set('media.fields', 'media_key,type,url,preview_image_url,alt_text,width,height');
  const payload = await requestXApi(timelineUrl, bearerToken, fetchImpl);

  return {
    account: {
      id: userId,
      username: OFFICIAL_X_CONFIG.username,
      url: `https://x.com/${OFFICIAL_X_CONFIG.username}`,
    },
    posts: normalizePosts(payload),
  };
}
