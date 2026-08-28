const API_URL = '/api/board';
const THREAD_TOKENS_KEY = 'monsabaBoardThreadTokens:v1';
const ANSWER_TOKENS_KEY = 'monsabaBoardAnswerTokens:v1';

export function characterCount(value) { return [...String(value || '')].length; }
export function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
export function relativeTime(isoTime, currentTime = Date.now()) {
  const timestamp = Date.parse(isoTime);
  if (!Number.isFinite(timestamp)) return '';
  const seconds = Math.max(0, Math.floor((currentTime - timestamp) / 1000));
  if (seconds < 60) return 'たった今';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(new Date(timestamp));
}

function absoluteTime(isoTime) {
  try { return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(isoTime)); }
  catch { return ''; }
}
function loadTokens(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { localStorage.removeItem(key); return {}; }
}
function saveTokens(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 一覧・閲覧は継続できる */ } }
async function request(url, options) {
  const response = await fetch(url, options);
  let payload;
  try { payload = await response.json(); } catch { throw new Error('掲示板から正しい応答を受け取れませんでした。'); }
  if (!response.ok || !payload.ok) throw new Error(payload.error?.message || '操作に失敗しました。');
  return payload;
}
function jsonOptions(body, method = 'POST') {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
function setMessage(node, message, error = false) {
  if (!node) return;
  node.textContent = message;
  node.classList.toggle('is-error', error);
}
function track(event, properties = {}) { window.MONSABA_TRACK?.event(event, properties); }
function timeNode(value, prefix = '') {
  const node = element('time', '', `${prefix}${relativeTime(value)}`);
  node.dateTime = value;
  node.title = absoluteTime(value);
  return node;
}
function excerpt(value, length = 150) {
  const normalized = String(value || '').replace(/\s+/gu, ' ').trim();
  return characterCount(normalized) > length ? `${[...normalized].slice(0, length).join('')}…` : normalized;
}

function setupCounters(root = document) {
  for (const [name, outputId, max] of [['title', 'board-title-count', 80], ['content', root.querySelector('#board-answer-count') ? 'board-answer-count' : 'board-content-count', root.querySelector('#board-answer-count') ? 1200 : 1600]]) {
    const input = root.querySelector(`[name="${name}"]`);
    const output = root.querySelector(`#${outputId}`);
    if (!input || !output) continue;
    const update = () => { output.textContent = `${characterCount(input.value)}/${max}文字`; };
    input.addEventListener('input', update); update();
  }
}

function setupReportDialog() {
  const dialog = document.querySelector('#board-report-dialog');
  const form = document.querySelector('#board-report-form');
  if (!dialog || !form) return () => {};
  const message = document.querySelector('#board-report-message');
  document.querySelector('[data-dialog-close]')?.addEventListener('click', () => dialog.close());
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    setMessage(message, '通報を送信しています…');
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      await request(API_URL, jsonOptions({ action: 'report', ...data }));
      track('board_report', { target_type: data.targetType, reason: data.reason });
      setMessage(message, '通報を受け付けました。管理者が確認します。');
      setTimeout(() => dialog.close(), 900);
    } catch (error) { setMessage(message, error.message, true); }
    finally { submit.disabled = false; }
  });
  return (targetType, targetId) => {
    form.reset();
    form.elements.targetType.value = targetType;
    form.elements.targetId.value = targetId;
    setMessage(message, '');
    dialog.showModal();
  };
}

function reportButton(openReport, type, id) {
  const button = element('button', 'board-text-button', '通報');
  button.type = 'button';
  button.addEventListener('click', () => openReport(type, id));
  return button;
}

function bootList() {
  const list = document.querySelector('#board-list');
  if (!list) return;
  const openButton = document.querySelector('#board-open-form');
  const closeButton = document.querySelector('#board-close-form');
  const panel = document.querySelector('#board-question-panel');
  const form = document.querySelector('#board-question-form');
  const filterForm = document.querySelector('#board-filter-form');
  const more = document.querySelector('#board-more');
  const reload = document.querySelector('#board-reload');
  const listMessage = document.querySelector('#board-list-message');
  const formMessage = document.querySelector('#board-question-message');
  const openReport = setupReportDialog();
  let nextCursor = null;
  let threadTokens = loadTokens(THREAD_TOKENS_KEY);

  function toggleForm(show) {
    panel.hidden = !show;
    openButton.setAttribute('aria-expanded', String(show));
    if (show) { panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); form.elements.title.focus({ preventScroll: true }); }
  }
  openButton.addEventListener('click', () => toggleForm(panel.hidden));
  closeButton.addEventListener('click', () => toggleForm(false));

  function createThreadCard(thread) {
    const card = element('article', 'board-card');
    const title = element('h3', 'board-card-title');
    const link = element('a', '', thread.title);
    link.href = `/board/thread/?id=${encodeURIComponent(thread.id)}`;
    title.appendChild(link);
    const meta = element('div', 'board-meta');
    meta.append(element('span', 'board-badge', thread.category));
    meta.append(element('span', `board-badge ${thread.resolved ? 'is-resolved' : thread.answerCount ? '' : 'is-open'}`, thread.resolved ? '解決済み' : thread.answerCount ? '回答あり' : '未回答'));
    meta.append(timeNode(thread.createdAt, '投稿日 '));
    meta.append(element('span', '', `回答 ${thread.answerCount}件`));
    if (thread.latestAnswerAt) meta.append(timeNode(thread.latestAnswerAt, '最新回答 '));
    card.append(title, meta, element('p', 'board-excerpt', excerpt(thread.content)));
    const actions = element('div', 'board-actions');
    actions.appendChild(reportButton(openReport, 'thread', thread.id));
    card.appendChild(actions);
    return card;
  }

  function params(cursor = '') {
    const data = new FormData(filterForm);
    const query = new URLSearchParams();
    for (const key of ['q', 'category', 'sort']) if (data.get(key)) query.set(key, data.get(key));
    if (data.get('unanswered')) query.set('unanswered', '1');
    if (cursor) query.set('cursor', cursor);
    return query;
  }
  async function load({ reset = false } = {}) {
    if (reset) { nextCursor = null; list.replaceChildren(element('p', '', '読み込み中です…')); list.setAttribute('aria-busy', 'true'); }
    more.disabled = true;
    try {
      const query = params(nextCursor);
      const payload = await request(`${API_URL}${query.size ? `?${query}` : ''}`);
      if (reset) list.replaceChildren();
      payload.threads.forEach((thread) => list.appendChild(createThreadCard(thread)));
      nextCursor = payload.nextCursor;
      more.hidden = !nextCursor;
      if (!list.querySelector('.board-card')) list.replaceChildren(element('p', '', 'まだ質問はありません。最初の質問を投稿してみましょう。'));
      setMessage(listMessage, '');
    } catch (error) { if (reset) list.replaceChildren(); setMessage(listMessage, error.message, true); }
    finally { list.setAttribute('aria-busy', 'false'); more.disabled = false; }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = document.querySelector('#board-question-submit');
    submit.disabled = true;
    setMessage(formMessage, '質問を投稿しています…');
    const body = Object.fromEntries(new FormData(form).entries());
    try {
      const payload = await request(API_URL, jsonOptions({ action: 'create_thread', ...body }));
      threadTokens[payload.thread.id] = payload.deleteToken;
      saveTokens(THREAD_TOKENS_KEY, threadTokens);
      track('board_question_submit', { category: payload.thread.category });
      location.assign(`/board/thread/?id=${encodeURIComponent(payload.thread.id)}`);
    } catch (error) { setMessage(formMessage, error.message, true); submit.disabled = false; }
  });
  filterForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(filterForm);
    track('board_filter_use', { category: data.get('category') || 'all', sort: data.get('sort') || 'new', unanswered: Boolean(data.get('unanswered')) });
    load({ reset: true });
  });
  reload.addEventListener('click', () => load({ reset: true }));
  more.addEventListener('click', () => load());
  setupCounters(form);
  track('board_view', { view: 'list' });
  load({ reset: true });
}

function bootThread() {
  const container = document.querySelector('#board-thread');
  if (!container) return;
  const id = new URLSearchParams(location.search).get('id') || '';
  const message = document.querySelector('#board-thread-message');
  const answerSection = document.querySelector('#board-answer-section');
  const answerPanel = document.querySelector('#board-answer-panel');
  const answers = document.querySelector('#board-answers');
  const more = document.querySelector('#board-answers-more');
  const answerForm = document.querySelector('#board-answer-form');
  const answerMessage = document.querySelector('#board-answer-message');
  const openReport = setupReportDialog();
  let nextCursor = null;
  let thread = null;
  let threadTokens = loadTokens(THREAD_TOKENS_KEY);
  let answerTokens = loadTokens(ANSWER_TOKENS_KEY);

  async function removePost(type, postId, token, node) {
    if (!confirm(type === 'thread' ? 'この質問と回答を削除しますか？' : 'この回答を削除しますか？')) return;
    try {
      await request(`${API_URL}?type=${type}&id=${encodeURIComponent(postId)}`, jsonOptions({ type, id: postId, deleteToken: token }, 'DELETE'));
      if (type === 'thread') { delete threadTokens[postId]; saveTokens(THREAD_TOKENS_KEY, threadTokens); location.assign('/board/'); }
      else { delete answerTokens[postId]; saveTokens(ANSWER_TOKENS_KEY, answerTokens); node.remove(); setMessage(message, '回答を削除しました。'); }
    } catch (error) { setMessage(message, error.message, true); }
  }
  function actionsFor(type, postId, node) {
    const actions = element('div', 'board-actions');
    actions.appendChild(reportButton(openReport, type, postId));
    const token = type === 'thread' ? threadTokens[postId] : answerTokens[postId];
    if (token) {
      const remove = element('button', 'board-text-button board-danger', type === 'thread' ? '質問を削除' : '回答を削除');
      remove.type = 'button'; remove.addEventListener('click', () => removePost(type, postId, token, node)); actions.appendChild(remove);
    }
    return actions;
  }
  function renderQuestion(value) {
    container.replaceChildren(); container.className = 'board-panel board-question-detail';
    const meta = element('div', 'board-meta');
    meta.append(element('span', 'board-badge', value.category));
    meta.append(element('span', `board-badge ${value.resolved ? 'is-resolved' : value.answerCount ? '' : 'is-open'}`, value.resolved ? '解決済み' : value.answerCount ? '回答あり' : '未回答'));
    meta.append(timeNode(value.createdAt, '投稿日 '));
    if (value.name) meta.append(element('span', '', `投稿者 ${value.name}`));
    const title = element('h2', '', value.title); title.id = 'board-thread-title';
    container.append(title, meta);
    if (value.context) container.appendChild(element('p', 'board-context', `使用タタ・レベルなど：${value.context}`));
    container.appendChild(element('p', 'board-question-body', value.content));
    const actions = actionsFor('thread', value.id, container);
    if (threadTokens[value.id]) {
      const resolve = element('button', 'ghost-button', value.resolved ? '未解決に戻す' : '解決済みにする');
      resolve.type = 'button'; resolve.addEventListener('click', async () => {
        resolve.disabled = true;
        try {
          const payload = await request(API_URL, jsonOptions({ action: 'resolve', threadId: value.id, resolved: !value.resolved, deleteToken: threadTokens[value.id] }));
          thread = payload.thread; renderQuestion(thread); track('board_resolved', { resolved: thread.resolved });
        } catch (error) { setMessage(message, error.message, true); resolve.disabled = false; }
      });
      actions.prepend(resolve);
    }
    container.appendChild(actions); container.setAttribute('aria-busy', 'false');
  }
  function renderAnswer(value) {
    const card = element('article', 'board-answer-card');
    const meta = element('div', 'board-meta');
    meta.append(element('strong', '', value.name || '名前未設定'), timeNode(value.createdAt, '投稿日 '));
    card.append(meta, element('p', 'board-answer-body', value.content), actionsFor('answer', value.id, card));
    return card;
  }
  async function loadThread({ answersOnly = false } = {}) {
    if (!id) { container.replaceChildren(element('p', '', '質問IDが指定されていません。')); container.setAttribute('aria-busy', 'false'); return; }
    try {
      const query = new URLSearchParams({ thread: id }); if (answersOnly && nextCursor) query.set('cursor', nextCursor);
      const payload = await request(`${API_URL}?${query}`);
      thread = payload.thread;
      if (!answersOnly) { renderQuestion(thread); answers.replaceChildren(); answerSection.hidden = false; answerPanel.hidden = false; }
      payload.answers.forEach((answer) => answers.appendChild(renderAnswer(answer)));
      nextCursor = payload.nextCursor; more.hidden = !nextCursor;
      document.querySelector('#board-answer-summary').textContent = `${thread.answerCount}件の回答`;
      if (!answers.querySelector('.board-answer-card')) answers.replaceChildren(element('p', '', 'まだ回答はありません。分かる方は回答してみましょう。'));
    } catch (error) { container.replaceChildren(element('p', '', '質問を読み込めませんでした。削除済みの可能性があります。')); container.setAttribute('aria-busy', 'false'); setMessage(message, error.message, true); }
  }
  answerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = document.querySelector('#board-answer-submit'); submit.disabled = true; setMessage(answerMessage, '回答を投稿しています…');
    const body = Object.fromEntries(new FormData(answerForm).entries());
    try {
      const payload = await request(API_URL, jsonOptions({ action: 'create_answer', threadId: id, ...body }));
      answerTokens[payload.answer.id] = payload.deleteToken; saveTokens(ANSWER_TOKENS_KEY, answerTokens);
      track('board_answer_submit', { category: thread?.category || 'unknown' });
      answerForm.reset(); setupCounters(answerForm); setMessage(answerMessage, '回答を投稿しました。');
      nextCursor = null; await loadThread();
    } catch (error) { setMessage(answerMessage, error.message, true); }
    finally { submit.disabled = false; }
  });
  more.addEventListener('click', () => loadThread({ answersOnly: true }));
  setupCounters(answerForm); track('board_view', { view: 'thread' }); loadThread();
}

if (typeof document !== 'undefined') { bootList(); bootThread(); }
