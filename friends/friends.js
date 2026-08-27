const API_URL = '/api/friends';
const TOKEN_STORAGE_KEY = 'monsabaFriendPostTokens:v1';

export function relativeTime(isoTime, currentTime = Date.now()) {
  const timestamp = Date.parse(isoTime);
  if (!Number.isFinite(timestamp)) return '';
  const seconds = Math.max(0, Math.floor((currentTime - timestamp) / 1000));
  if (seconds < 60) return 'たった今';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  if (hours < 48) return '昨日';
  return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(new Date(timestamp));
}

export async function copyUid(uid, clipboard = globalThis.navigator?.clipboard, selectFallback = () => {}) {
  try {
    if (!clipboard?.writeText) throw new Error('Clipboard API unavailable');
    await clipboard.writeText(uid);
    return true;
  } catch {
    selectFallback();
    return false;
  }
}

function loadOwnedTokens() {
  try {
    const value = JSON.parse(localStorage.getItem(TOKEN_STORAGE_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    return {};
  }
}

function saveOwnedTokens(tokens) {
  try { localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens)); }
  catch { /* 保存できない場合も投稿一覧は利用可能 */ }
}

function absoluteTime(isoTime) {
  return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(isoTime));
}

function selectUid(element) {
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);
  element.focus();
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function request(url, options) {
  const response = await fetch(url, options);
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error('掲示板から正しい応答を受け取れませんでした。'); }
  if (!response.ok || !payload.ok) throw new Error(payload.error?.message || '操作に失敗しました。');
  return payload;
}

function boot() {
  const form = document.querySelector('#friend-form');
  if (!form) return;
  const list = document.querySelector('#friends-list');
  const moreButton = document.querySelector('#friends-more');
  const reloadButton = document.querySelector('#friends-reload');
  const live = document.querySelector('#friends-live');
  const formMessage = document.querySelector('#friend-form-message');
  const submitButton = document.querySelector('#friend-submit');
  const comment = document.querySelector('#friend-comment');
  const commentCount = document.querySelector('#comment-count');
  let nextCursor = null;
  let ownedTokens = loadOwnedTokens();

  function showEmpty() {
    list.replaceChildren(element('p', 'friends-empty', 'まだ募集はありません。最初のフレンド募集を投稿してみましょう。'));
  }

  function createCard(post) {
    const card = element('article', 'friend-card');
    card.dataset.postId = post.id;
    const head = element('div', 'friend-card-head');
    const identity = element('div', 'friend-identity');
    if (post.username) identity.appendChild(element('h3', '', post.username));
    if (post.tataLevel) identity.appendChild(element('span', 'friend-level', `タタレベル ${post.tataLevel}`));
    if (!post.username && !post.tataLevel) identity.appendChild(element('span', 'friend-anonymous', '名前未設定'));
    const time = element('time', 'friend-time', relativeTime(post.createdAt));
    time.dateTime = post.createdAt;
    time.title = absoluteTime(post.createdAt);
    head.append(identity, time);

    const uidRow = element('div', 'friend-uid-row');
    const uidLabel = element('span', 'friend-uid-label', 'UID');
    const uid = element('code', 'friend-uid', post.uid);
    uid.tabIndex = 0;
    const copyButton = element('button', 'ghost-button compact-button', 'UIDをコピー');
    copyButton.type = 'button';
    copyButton.addEventListener('click', async () => {
      const copied = await copyUid(post.uid, navigator.clipboard, () => selectUid(uid));
      live.textContent = copied ? 'コピーしました' : 'UIDを選択しました。手動でコピーしてください。';
      window.MONSABA_TRACK?.event('friend_uid_copy', { result: copied ? 'copied' : 'selected' });
    });
    uidRow.append(uidLabel, uid, copyButton);
    card.append(head, uidRow);
    if (post.comment) card.appendChild(element('p', 'friend-comment', post.comment));

    const actions = element('div', 'friend-card-actions');
    const report = element('a', 'friend-report-link', '問題投稿を連絡');
    report.href = '#friends-report';
    actions.appendChild(report);
    if (ownedTokens[post.id]) {
      const removeButton = element('button', 'text-button friend-delete', '投稿を削除');
      removeButton.type = 'button';
      removeButton.addEventListener('click', async () => {
        if (!window.confirm('この投稿を削除しますか？')) return;
        removeButton.disabled = true;
        try {
          await request(`${API_URL}?id=${encodeURIComponent(post.id)}`, {
            method: 'DELETE', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: post.id, deleteToken: ownedTokens[post.id] })
          });
          delete ownedTokens[post.id];
          saveOwnedTokens(ownedTokens);
          card.remove();
          if (!list.querySelector('.friend-card')) showEmpty();
          live.textContent = '投稿を削除しました。';
        } catch (error) {
          live.textContent = error.message;
          removeButton.disabled = false;
        }
      });
      actions.appendChild(removeButton);
    }
    card.appendChild(actions);
    return card;
  }

  async function loadPosts({ reset = false } = {}) {
    if (reset) {
      nextCursor = null;
      list.setAttribute('aria-busy', 'true');
      list.replaceChildren(element('p', 'friends-loading', '読み込み中です…'));
    }
    moreButton.disabled = true;
    try {
      const url = nextCursor ? `${API_URL}?cursor=${encodeURIComponent(nextCursor)}` : API_URL;
      const payload = await request(url);
      if (reset) list.replaceChildren();
      for (const post of payload.posts) list.appendChild(createCard(post));
      nextCursor = payload.nextCursor;
      moreButton.hidden = !nextCursor;
      if (!list.querySelector('.friend-card')) showEmpty();
      live.textContent = '';
    } catch {
      if (reset) list.replaceChildren(element('p', 'error-message', '現在掲示板データを読み込めません。時間をおいて再読み込みしてください。'));
      live.textContent = '掲示板データの読み込みに失敗しました。';
    } finally {
      list.setAttribute('aria-busy', 'false');
      moreButton.disabled = false;
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submitButton.disabled = true;
    formMessage.textContent = '投稿しています…';
    const data = new FormData(form);
    const body = Object.fromEntries(data.entries());
    try {
      const payload = await request(API_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      ownedTokens[payload.post.id] = payload.deleteToken;
      saveOwnedTokens(ownedTokens);
      form.reset();
      commentCount.textContent = '0';
      formMessage.textContent = 'フレンド募集を投稿しました。';
      await loadPosts({ reset: true });
      document.querySelector('#friends-list-title').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      formMessage.textContent = error.message;
    } finally {
      submitButton.disabled = false;
    }
  });
  comment.addEventListener('input', () => { commentCount.textContent = String([...comment.value].length); });
  reloadButton.addEventListener('click', () => loadPosts({ reset: true }));
  moreButton.addEventListener('click', () => loadPosts());
  setInterval(() => {
    document.querySelectorAll('.friend-time').forEach((time) => { time.textContent = relativeTime(time.dateTime); });
  }, 60_000);
  loadPosts({ reset: true });
}

if (typeof document !== 'undefined') boot();
