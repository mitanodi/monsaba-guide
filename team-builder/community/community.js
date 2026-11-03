import { decodeTeam, stageImageFor, FREE_SLOT_KIND, boardColumns, boardSlotCount } from '../team-core.js';

const $ = (selector) => document.querySelector(selector);
const locale = document.body.dataset.locale || 'ja';
const prefix = locale === 'en' ? '/en' : locale === 'zh-CN' ? '/zh-cn' : '';
const TAGS = ['初心者向け', '安定重視', '火力重視', '耐久重視', '低育成', '高育成', 'T4少なめ', 'オート', '手動', '検証中'];
const TAG_LABELS = {
  en: [
    'Beginner-friendly',
    'Stability',
    'Damage',
    'Durability',
    'Low investment',
    'High investment',
    'Few T4',
    'Auto',
    'Manual',
    'Testing'
  ],
  'zh-CN': ['适合新手', '稳定优先', '火力优先', '耐久优先', '低养成', '高养成', '少量T4', '自动', '手动', '验证中']
};
const tagLabel = (tag) => {
  const index = TAGS.indexOf(tag);
  return locale === 'ja' || index < 0 ? tag : TAG_LABELS[locale][index]
};
const DRAFT_KEY = 'monsabaCommunityDraft:v1';
const isChapterPage = location.pathname.includes('/community/chapters/');
const isDojoPage = location.pathname.includes('/community/dojo/');
const isScopedPage = isChapterPage || isDojoPage;
let activeDojoAttribute = 'fire';
let activeFloor = 1;
const DOJO_ATTRIBUTES = ['fire', 'grass', 'water', 'thunder', 'rock'];
const dojoAttributeLabel = (attribute) => ({ ja: ['炎道場', '草道場', '水道場', '雷道場', '岩道場'], en: ['Fire Dojo', 'Grass Dojo', 'Water Dojo', 'Thunder Dojo', 'Rock Dojo'], 'zh-CN': ['火道场', '草道场', '水道场', '雷道场', '岩道场'] }[locale] || [])[DOJO_ATTRIBUTES.indexOf(attribute)] || attribute;
const floorLabel = (floor) => locale === 'en' ? `Floor ${floor}` : `${floor}${locale === 'zh-CN' ? '层' : '階'}`;
const dojoRoute = (attribute = activeDojoAttribute, floor = activeFloor) => `${prefix}/team-builder/community/dojo/?attribute=${attribute}&floor=${floor}`;
let activeChapter = 1;
const chapterLabel = (chapter) => `${locale === 'ja' ? 'チャプター' : locale === 'en' ? 'Chapter' : '章节'} ${chapter}`;
const isNormal = (build) => build.mode === 'normal';
const isDojo = (build) => build.mode === 'dojo';
const isSinglePlayer = (build) => isNormal(build) || isDojo(build);
const buildListRoute = (build) => isNormal(build) ? chapterRoute(build.chapter) : isDojo(build) ? dojoRoute(build.dojoAttribute, build.floor) : `${prefix}/team-builder/community/`;
const chapterRoute = (chapter = activeChapter) => `${prefix}/team-builder/community/chapters/?chapter=${chapter}`;
const currentStageFilter = () => chapterNumber($('#community-filters')?.elements.stage?.value);
const withStageFilter = (route) => {
  const stage = currentStageFilter();
  return stage ? `${route}&stage=${stage}` : route;
};
const builderRoute = () => isChapterPage ? withStageFilter(`${prefix}/team-builder/?mode=normal&chapter=${activeChapter}`) : isDojoPage ? withStageFilter(`${prefix}/team-builder/?mode=dojo&attribute=${activeDojoAttribute}&floor=${activeFloor}`) : `${prefix}/team-builder/`;
const refreshBuilderLinks = () => document.querySelectorAll('[data-chapter-builder]').forEach((link) => { link.href = builderRoute() });
function syncBoardUrl() {
  if (!isScopedPage)
    return;
  const url = new URL(isDojoPage ? dojoRoute() : chapterRoute(), location.origin);
  const stage = currentStageFilter();
  if (stage)
    url.searchParams.set('stage', String(stage));
  history.replaceState(null, '', url);
  refreshBuilderLinks();
}
const chapterNumber = (value) => /^\d+$/.test(String(value || '')) && Number(value) >= 1 && Number(value) <= 9999 ? Number(value) : null;
const stageLabel = (build) => isDojo(build) ? `${dojoAttributeLabel(build.dojoAttribute)} · ${floorLabel(build.floor)}${build.stageFrom ? ` · ${build.stageFrom}${build.stageTo && build.stageTo !== build.stageFrom ? `〜${build.stageTo}` : ''}` : ''}` : build.stageFrom ? `${build.chapter}-${build.stageFrom}${build.stageTo && build.stageTo !== build.stageFrom ? `〜${build.chapter}-${build.stageTo}` : ''}` : chapterLabel(build.chapter);

const OWNER_KEY = 'monsabaCommunityOwners:v1';
const COPY = {
  ja: {
    empty: 'まだ編成が投稿されていません。最初の編成を共有してみませんか？',
    create: '編成を作る',
    load: 'この編成を読み込む',
    copy: 'コピーして編集',
    helpful: '参考になった',
    trial: '試行報告',
    clear: 'クリア報告',
    round: '最高Round',
    p: '配置',
    reported: '投稿者申告',
    confirm: '現在の編成を置き換えますか？',
    api: '読み込みに失敗しました。時間を空けてお試しください。',
    published: '編成を投稿しました。',
    deleted: '投稿を削除しました。',
    commented: 'コメントを投稿しました。',
    trialed: '結果を報告しました。',
    helped: '参考になったを記録しました。',
    edit: '編集',
    remove: '削除',
    report: '通報',
    updated: '更新しました。'
  },
  en: {
    empty: 'No builds have been posted yet. Share the first formation.',
    create: 'Build a formation',
    load: 'Load this build',
    copy: 'Copy and edit',
    helpful: 'Helpful',
    trial: 'Trial reports',
    clear: 'Clear reports',
    round: 'Best round',
    p: 'Placed',
    reported: 'Player-reported',
    confirm: 'Replace your current formation?',
    api: 'Could not load the community database. Try again later.',
    published: 'Build published.',
    deleted: 'Post deleted.',
    commented: 'Comment posted.',
    trialed: 'Trial report submitted.',
    helped: 'Helpful vote recorded.',
    edit: 'Edit',
    remove: 'Delete',
    report: 'Report',
    updated: 'Updated.'
  },
  'zh-CN': {
    empty: '暂无阵容投稿，欢迎分享第一个阵容。',
    create: '创建阵容',
    load: '载入此阵容',
    copy: '复制并编辑',
    helpful: '有帮助',
    trial: '试用报告',
    clear: '通关报告',
    round: '最高回合',
    p: '上阵',
    reported: '玩家申报',
    confirm: '要替换当前阵容吗？',
    api: '无法读取社区数据库，请稍后重试。',
    published: '阵容已发布。',
    deleted: '投稿已删除。',
    commented: '评论已发布。',
    trialed: '结果已提交。',
    helped: '已记录有帮助。',
    edit: '编辑',
    remove: '删除',
    report: '举报',
    updated: '已更新。'
  }
}[locale];
let families = [];
let chips = [];
let images = new Map();
let nextCursor = null;
let listRequest = 0;
let currentBuild = null;
const owners = () => {
  try {
    return JSON.parse(localStorage.getItem(OWNER_KEY) || '{}')
  } catch {
    return {}
  }
};
const saveOwner = (id, token) => {
  const value = owners();
  value[id] = token;
  localStorage.setItem(OWNER_KEY, JSON.stringify(value));
};
const removeOwner = (id) => {
  const value = owners();
  delete value[id];
  localStorage.setItem(OWNER_KEY, JSON.stringify(value));
};
const track = (name) => window.MONSABA_TRACK?.event(name);
async function api(query = '', options = {}) {
  const response = await fetch(`/api/community${query}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok)
    throw new Error(data.error?.message || COPY.api);
  return data;
}
function node(tag, className, text) {
  const item = document.createElement(tag);
  if (className)
    item.className = className;
  if (text !== undefined)
    item.textContent = TAGS.includes(text) ? tagLabel(text) : text;
  return item;
}
function formatDate(value) {
  try {
    return new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : locale, { dateStyle: 'medium' }).format(new Date(value))
  } catch {
    return value
  }
}
function resultLabel(build) {
  if (build.resultStatus === 'cleared')
    return locale === 'en' ? 'Clear (reported)' : locale === 'zh-CN' ? '通关（申报）' : 'クリア（投稿者申告）';
  if (build.resultStatus === 'round')
    return `${COPY.round} ${build.highestRound}`;
  if (build.resultStatus === 'challenging')
    return locale === 'en' ? 'In progress' : locale === 'zh-CN' ? '挑战中' : '挑戦中';
  return locale === 'en' ? 'Untested' : locale === 'zh-CN' ? '未验证' : '未検証';
}
function boardPreview(code, large = false) {
  const board = node('div', `community-board${large ? ' community-board-large' : ''}`);
  let team;
  try {
    team = decodeTeam(code, families, chips)
  } catch {
    board.textContent = COPY.api;
    return board
  }
  board.style.gridTemplateColumns = `repeat(${boardColumns(team)},minmax(0,1fr))`;
  board.classList.toggle('is-normal', team.mode !== 'zombie');
  for (const slot of team.slots.slice(0, boardSlotCount(team))) {
    const cell = node('div', `community-cell${slot ? ` is-p${slot.playerId}` : ''}${slot?.kind === FREE_SLOT_KIND ? ' is-flex' : ''}`);
    if (slot?.kind === FREE_SLOT_KIND) {
      cell.append(node('strong', 'flex-symbol', '?'), node('small', 'flex-label', locale === 'en' ? 'Flex slot' : locale === 'zh-CN' ? '自由位置' : '自由枠'), node('span', 'p', `P${slot.playerId}`));
      cell.setAttribute('aria-label', `${locale === 'en' ? 'Flex slot' : locale === 'zh-CN' ? '自由位置' : '自由枠'} P${slot.playerId}`)
    } else if (slot) {
      const family = families.find((item) => item.id === slot.familyId);
      const image = stageImageFor(family, slot.stage, images);
      if (image) {
        const img = document.createElement('img');
        img.src = image.src;
        img.width = image.width;
        img.height = image.height;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.alt = '';
        cell.append(img)
      }
      for (const [className, value] of team.mode === 'zombie' ? [['p', `P${slot.playerId}`], ['lv', `Lv${slot.level}`], ['tier', `T${slot.stage}`]] : [['tier', `T${slot.stage}`]])
        cell.append(node('span', className, value));
      cell.setAttribute('aria-label', `${family?.evolutions?.find((item) => Number(item.stage) === Number(slot.stage))?.name || slot.familyId} T${slot.stage}${team.mode === 'zombie' ? ` P${slot.playerId} Lv${slot.level}` : ''}`)
    } else cell.setAttribute('aria-label', locale === 'en' ? 'Empty' : locale === 'zh-CN' ? '空位' : '空き');
    cell.setAttribute('role', 'img');
    board.append(cell)
  }
  return board;
}
function loadBuild(build, copy = false) {
  if (localStorage.getItem('monsabaFormationDraft:v2') && !confirm(COPY.confirm))
    return;
  track(copy ? 'formation_copy' : 'formation_load');
  location.href = `${prefix}/team-builder/#build=${build.formationCode}`;
}
function buildCard(build) {
  const card = node('article', 'community-card');
  const head = node('div', 'community-card-head');
  const title = node('h3', '', build.title);
  const link = document.createElement('a');
  link.href = `${prefix}/team-builder/community/detail/?id=${encodeURIComponent(build.id)}`;
  link.append(title);
  head.append(link, node('time', '', formatDate(build.createdAt)));
  card.append(head);
  const meta = node('div', 'community-meta');
  for (const value of [
    ...(isSinglePlayer(build) ? [stageLabel(build)] : [`Season 1`, `${locale === 'en' ? 'Difficulty' : locale === 'zh-CN' ? '难度' : '難易度'} ${build.difficulty}`]),
    resultLabel(build),
    COPY.reported
  ])
    meta.append(node('span', '', value));
  card.append(meta);
  card.append(boardPreview(build.formationCode));
  const counts = node('div', 'community-counts');
  for (const value of [
    isSinglePlayer(build) ? `${COPY.p} ${build.playerCounts[1]} / ${isDojo(build) ? 5 : 15}` : `P1 ${build.playerCounts[1]} / P2 ${build.playerCounts[2]}`,
    `${COPY.helpful} ${build.helpfulCount}`,
    `${COPY.trial} ${build.trialCount}`,
    `${COPY.clear} ${build.clearReportCount}`
  ])
    counts.append(node('span', '', value));
  card.append(counts);
  if (build.tags?.length) {
    const tags = node('div', 'community-meta');
    build.tags.forEach((tag) => tags.append(node('span', 'community-tag', tag)));
    card.append(tags)
  }
  const by = node('p', '', build.authorDisplayName);
  card.append(by);
  if (build.note)
    card.append(node('p', 'community-note', build.note));
  const actions = node('div', 'community-actions');
  const load = node('button', 'button', COPY.load);
  load.type = 'button';
  load.addEventListener('click', () => loadBuild(build));
  const open = document.createElement('a');
  open.className = 'ghost-button';
  open.href = link.href;
  open.textContent = locale === 'en' ? 'View details' : locale === 'zh-CN' ? '查看详情' : '詳細を見る';
  actions.append(load, open);
  card.append(actions);
  return card;
}
function filterQuery(cursor = '') {
  const form = $('#community-filters');
  const params = new URLSearchParams(form ? new FormData(form) : undefined);
  for (const [key, value] of [...params])
    if (!value)
      params.delete(key);
  if (isChapterPage) {
    params.set('mode', 'normal');
    params.set('chapter', String(activeChapter));
  }
  if (isDojoPage) {
    params.set('mode', 'dojo');
    params.set('dojoAttribute', activeDojoAttribute);
    params.set('floor', String(activeFloor));
  }
  if (cursor)
    params.set('cursor', cursor);
  const value = params.toString();
  return value ? `?${value}` : '';
}
async function loadList(append = false) {
  const request = ++listRequest;
  const list = $('#community-list');
  const more = $('#community-more');
  more.disabled = true;
  if (!append)
    list.replaceChildren(node('p', '', locale === 'en' ? 'Loading…' : locale === 'zh-CN' ? '读取中…' : '読み込み中…'));
  try {
    const data = await api(filterQuery(append ? nextCursor : ''));
    if (request !== listRequest)
      return;
    if (!append)
      list.replaceChildren();
    if (!data.builds.length && !append) {
      const empty = node('div', 'community-empty');
      empty.append(node('p', '', data.nextCursor ? (locale === 'en' ? 'Load more to continue searching for matching builds.' : locale === 'zh-CN' ? '请继续加载以查找符合条件的阵容。' : 'さらに読み込んで、条件に合う編成を続けて探せます。') : COPY.empty));
      const link = document.createElement('a');
      link.className = 'button';
      link.href = builderRoute();
      link.textContent = COPY.create;
      empty.append(link);
      list.append(empty)
    } else {
      if (data.builds.length)
        list.querySelector('.community-empty')?.remove();
      data.builds.forEach((build) => list.append(buildCard(build)));
      if (!data.nextCursor && !list.querySelector('.community-card')) {
        const message = list.querySelector('.community-empty p');
        if (message) message.textContent = COPY.empty;
      }
    }
    nextCursor = data.nextCursor;
    $('#community-more').hidden = !nextCursor
  } catch (error) {
    if (request === listRequest)
      list.replaceChildren(node('p', 'tool-status is-error', error.message));
  } finally {
    if (request === listRequest)
      more.disabled = false;
  }
}
function setupDojo() {
  const params = new URL(location.href).searchParams;
  let draftContext = {};
  let draftAttribute = '';
  try {
    const draft = decodeTeam(localStorage.getItem(DRAFT_KEY) || '', families, chips);
    if (draft.mode === 'dojo') {
      draftAttribute = draft.context.dojoAttribute;
      draftContext = draft.context;
    }
  } catch { }
  activeDojoAttribute = [params.get('attribute'), draftContext.dojoAttribute, draftAttribute].find((value) => DOJO_ATTRIBUTES.includes(value)) || 'fire';
  activeFloor = chapterNumber(params.get('floor')) || chapterNumber(draftContext.dojoFloor) || 1;
  const form = $('#community-chapter-form');
  form.elements.floor.value = activeFloor;
  form.elements.attribute.value = activeDojoAttribute;
  $('#community-chapter-title').textContent = `${dojoAttributeLabel(activeDojoAttribute)} · ${floorLabel(activeFloor)}`;
  $('#community-list-title').textContent = `${dojoAttributeLabel(activeDojoAttribute)} · ${floorLabel(activeFloor)} · ${locale === 'en' ? 'Player builds' : locale === 'zh-CN' ? '玩家阵容' : '投稿された編成'}`;
  $('#community-chapter-prev').href = dojoRoute(activeDojoAttribute, Math.max(1, activeFloor - 1));
  $('#community-chapter-prev').hidden = activeFloor === 1;
  $('#community-chapter-next').href = dojoRoute(activeDojoAttribute, Math.min(9999, activeFloor + 1));
  $('#community-chapter-next').hidden = activeFloor === 9999;
  refreshBuilderLinks();
  const tabs = $('#community-dojo-attributes');
  DOJO_ATTRIBUTES.forEach((attribute) => {
    const link = document.createElement('a');
    link.href = dojoRoute(attribute, activeFloor);
    link.textContent = dojoAttributeLabel(attribute);
    if (attribute === activeDojoAttribute)
      link.setAttribute('aria-current', 'page');
    tabs.append(link);
  });
  const publish = $('#community-publish-form');
  publish.elements.dojoAttribute.value = activeDojoAttribute;
  publish.elements.floor.value = activeFloor;
  const sameDraftScope = draftContext.dojoAttribute === activeDojoAttribute && chapterNumber(draftContext.dojoFloor) === activeFloor;
  const stage = chapterNumber(params.get('stage')) || (sameDraftScope ? chapterNumber(draftContext.dojoStage) : null);
  if (stage) {
    $('#community-filters').elements.stage.value = stage;
    publish.elements.stageFrom.value = stage;
    publish.elements.stageTo.value = stage;
  }
  refreshBuilderLinks();
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const floor = chapterNumber(form.elements.floor.value);
    const attribute = form.elements.attribute.value;
    if (floor && DOJO_ATTRIBUTES.includes(attribute))
      location.href = dojoRoute(attribute, floor);
  });
  $('#community-chapter-copy').addEventListener('click', async () => {
    const status = $('#community-chapter-share-status');
    try {
      await navigator.clipboard.writeText(new URL(withStageFilter(dojoRoute()), location.origin).href);
      status.textContent = locale === 'en' ? 'Dojo URL copied.' : locale === 'zh-CN' ? '已复制道场链接。' : 'この道場のURLをコピーしました。';
    } catch {
      status.textContent = locale === 'en' ? 'Copy the URL from the address bar.' : locale === 'zh-CN' ? '请从地址栏复制链接。' : 'アドレスバーからURLをコピーしてください。';
    }
  });
}
function setupChapters() {
  if (!isChapterPage)
    return;
  const params = new URL(location.href).searchParams;
  let draftChapter = null;
  try {
    const draft = decodeTeam(localStorage.getItem(DRAFT_KEY) || '', families, chips);
    if (draft.mode === 'normal')
      draftChapter = chapterNumber(draft.context.normalStage.match(/^(\d+)/)?.[1]);
  } catch { }
  activeChapter = chapterNumber(params.get('chapter')) || draftChapter || 1;
  const chapterForm = $('#community-chapter-form');
  chapterForm.elements.chapter.value = activeChapter;
  $('#community-chapter-title').textContent = chapterLabel(activeChapter);
  $('#community-list-title').textContent = `${chapterLabel(activeChapter)} · ${locale === 'en' ? 'Player builds' : locale === 'zh-CN' ? '玩家阵容' : '投稿された編成'}`;
  $('#community-chapter-prev').href = chapterRoute(Math.max(1, activeChapter - 1));
  $('#community-chapter-prev').hidden = activeChapter === 1;
  $('#community-chapter-next').href = chapterRoute(Math.min(9999, activeChapter + 1));
  $('#community-chapter-next').hidden = activeChapter === 9999;
  refreshBuilderLinks();
  const publishForm = $('#community-publish-form');
  publishForm.elements.chapter.value = activeChapter;
  const filterStage = chapterNumber(params.get('stage'));
  if (filterStage)
    $('#community-filters').elements.stage.value = filterStage;
  refreshBuilderLinks();
  chapterForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const chapter = chapterNumber(chapterForm.elements.chapter.value);
    if (chapter)
      location.href = chapterRoute(chapter);
  });
  $('#community-chapter-copy').addEventListener('click', async () => {
    const status = $('#community-chapter-share-status');
    try {
      await navigator.clipboard.writeText(new URL(withStageFilter(chapterRoute()), location.origin).href);
      status.textContent = locale === 'en' ? 'Chapter URL copied.' : locale === 'zh-CN' ? '已复制章节链接。' : 'このチャプターのURLをコピーしました。';
    } catch {
      status.textContent = locale === 'en' ? 'Copy the URL from the address bar.' : locale === 'zh-CN' ? '请从地址栏复制链接。' : 'アドレスバーからURLをコピーしてください。';
    }
  });
}
function setupPublish() {
  const toggle = $('#community-publish-toggle');
  const form = $('#community-publish-form');
  let draft = '';
  let draftTeam = null;
  try {
    const code = localStorage.getItem(DRAFT_KEY) || '';
    const team = decodeTeam(code, families, chips);
    if (team.mode === (isChapterPage ? 'normal' : isDojoPage ? 'dojo' : 'zombie')) {
      draft = code;
      draftTeam = team;
    }
  } catch { }
  if (draft) {
    const preview = node('div', 'community-publish-preview');
    preview.id = 'community-publish-preview';
    preview.setAttribute('aria-label', locale === 'en' ? 'Formation preview' : locale === 'zh-CN' ? '阵容预览' : '投稿前の編成プレビュー');
    preview.append(boardPreview(draft, true));
    form.before(preview);
  }
  if (isChapterPage && draftTeam) {
    const match = draftTeam.context.normalStage.match(/^(\d+)-(\d+)(?:[〜~–-](?:\d+-)?(\d+))?$/);
    if (match && Number(match[1]) === activeChapter) {
      form.elements.stageFrom.value = match[2];
      form.elements.stageTo.value = match[3] || match[2];
    }
  }
  $('#community-draft-status').textContent = draft ? (locale === 'en' ? 'A formation is ready to publish. Check the preview below.' : locale === 'zh-CN' ? '已有可发布的阵容，请确认下方预览。' : '投稿できる編成を読み込み済みです。下のプレビューを確認してください。') : isDojoPage ? (locale === 'en' ? 'Create a Badge Dojo formation in Team Builder, then choose Publish.' : locale === 'zh-CN' ? '请在阵容制作器中创建徽章道场阵容，然后选择发布。' : '編成メーカーでバッジ道場編成を作り、「編成を投稿」から戻ってきてください。') : isChapterPage ? (locale === 'en' ? 'Create a Normal formation in Team Builder, then choose Publish.' : locale === 'zh-CN' ? '请在阵容制作器中创建普通阵容，然后选择发布。' : '編成メーカーで通常編成を作り、「編成を投稿」から戻ってきてください。') : (locale === 'en' ? 'Create a Zombie Rush formation first.' : locale === 'zh-CN' ? '请先创建Zombie Rush阵容。' : '先に編成メーカーでゾンビラッシュ編成を作成してください。');
  toggle.disabled = !draft;
  toggle.addEventListener('click', () => {
    form.hidden = !form.hidden;
    if (!form.hidden)
      form.querySelector('[name=title]')?.focus();
  });
  if (new URL(location.href).searchParams.get('publish') === '1' && draft) {
    document.querySelector('[data-community-view=publish]')?.click();
    form.hidden = false;
    form.querySelector('[name=title]')?.focus();
  }
  const tags = $('#community-tag-options');
  const filter = $('#community-tag-filter');
  TAGS.forEach((tag) => {
    const label = node('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'tags';
    input.value = tag;
    label.append(input, document.createTextNode(tag));
    tags.append(label);
    const option = document.createElement('option');
    option.value = tag;
    option.textContent = tag;
    filter.append(option);
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    data.tags = [...form.querySelectorAll('[name=tags]:checked')].map((item) => item.value);
    data.action = 'create';
    data.formationCode = draft;
    if (isScopedPage) {
      data.mode = isDojoPage ? 'dojo' : 'normal';
      if (isDojoPage) {
        data.dojoAttribute = activeDojoAttribute;
        data.floor = activeFloor;
      } else data.chapter = activeChapter;
      data.stageFrom = data.stageFrom ? Number(data.stageFrom) : null;
      data.stageTo = data.stageTo ? Number(data.stageTo) : null;
    } else {
      data.difficulty = Number(data.difficulty);
      data.highestRound = Number(data.highestRound);
    }
    const submit = form.querySelector('[type=submit]');
    submit.disabled = true;
    try {
      const result = await api('', { method: 'POST', body: JSON.stringify(data) });
      saveOwner(result.build.id, result.ownerToken);
      if (localStorage.getItem(DRAFT_KEY) === draft)
        localStorage.removeItem(DRAFT_KEY);
      track('formation_publish');
      $('#community-publish-status').textContent = COPY.published;
      location.href = `${prefix}/team-builder/community/detail/?id=${encodeURIComponent(result.build.id)}`;
    } catch (error) {
      $('#community-publish-status').textContent = error.message;
      $('#community-publish-status').classList.add('is-error');
      submit.disabled = false;
    }
  });
  $('#community-filters').addEventListener('submit', (event) => {
    event.preventDefault();
    syncBoardUrl();
    loadList(false);
  });
  $('#community-more').addEventListener('click', () => loadList(true));
  loadList(false);
}
function metadata(build) {
  const wrap = node('div', 'community-meta');
  for (const value of [
    ...(isSinglePlayer(build) ? [stageLabel(build)] : [`Season 1`, `${locale === 'en' ? 'Difficulty' : locale === 'zh-CN' ? '难度' : '難易度'} ${build.difficulty}`, `${COPY.round} ${build.reportedBestRound || 0}`]),
    resultLabel(build),
    COPY.reported
  ])
    wrap.append(node('span', '', value));
  return wrap;
}
async function postAction(action, payload, status) {
  try {
    const result = await api('', { method: 'POST', body: JSON.stringify({ action, ...payload }) });
    if (status)
      status.textContent = action === 'helpful' ? COPY.helped : action === 'trial' ? COPY.trialed : action === 'comment' ? COPY.commented : COPY.updated;
    return result
  } catch (error) {
    if (status) {
      status.textContent = error.message;
      status.classList.add('is-error')
    }
    throw error
  }
}
function renderComments(comments) {
  const wrap = $('#community-comments');
  wrap.replaceChildren();
  if (!comments.length)
    wrap.append(node('p', '', locale === 'en' ? 'No comments yet.' : locale === 'zh-CN' ? '暂无评论。' : 'コメントはまだありません。'));
  for (const comment of comments) {
    const item = node('article', 'community-comment');
    item.append(node('strong', '', comment.name), node('time', '', formatDate(comment.createdAt)), node('p', '', comment.content));
    wrap.append(item)
  }
}
function addShareActions(build) {
  const card = $('.community-detail-card');
  if (!card || $('#community-share-actions'))
    return;
  const wrap = node('div', 'community-share-panel');
  wrap.id = 'community-share-actions';
  wrap.append(node('strong', '', locale === 'en' ? 'Share this build' : locale === 'zh-CN' ? '分享此阵容' : 'この編成を共有'));
  const actions = node('div', 'community-actions');
  const pageUrl = new URL(location.href);
  pageUrl.hash = '';
  const shareUrl = pageUrl.href;
  const genericText = isSinglePlayer(build) ? `${stageLabel(build)} · ${resultLabel(build)}` : locale === 'en' ? `Zombie Rush build: Difficulty ${build.difficulty}, ${resultLabel(build)}` : locale === 'zh-CN' ? `Zombie Rush阵容：难度${build.difficulty}、${resultLabel(build)}` : `ゾンビラッシュ編成：難易度${build.difficulty}・${resultLabel(build)}`;
  const x = document.createElement('a');
  x.id = 'community-share-x';
  x.className = 'ghost-button';
  x.href = `https://x.com/intent/post?text=${encodeURIComponent(genericText)}&url=${encodeURIComponent(shareUrl)}`;
  x.target = '_blank';
  x.rel = 'noopener noreferrer';
  x.textContent = 'X';
  const discord = node('button', 'ghost-button', 'Discord');
  discord.id = 'community-share-discord';
  discord.type = 'button';
  discord.addEventListener('click', async () => {
    await navigator.clipboard.writeText(`**${genericText}**\n${shareUrl}`).catch(() => { });
    $('#community-action-status').textContent = locale === 'en' ? 'Discord-ready text copied.' : locale === 'zh-CN' ? '已复制Discord分享文本。' : 'Discord向けテキストをコピーしました。'
  });
  const copy = node('button', 'ghost-button', locale === 'en' ? 'Copy URL' : locale === 'zh-CN' ? '复制URL' : 'URLをコピー');
  copy.id = 'community-copy-url';
  copy.type = 'button';
  copy.addEventListener('click', async () => {
    await navigator.clipboard.writeText(shareUrl).catch(() => { });
    $('#community-action-status').textContent = locale === 'en' ? 'URL copied.' : locale === 'zh-CN' ? '已复制URL。' : 'URLをコピーしました。'
  });
  actions.append(x, discord, copy);
  wrap.append(actions, node('small', '', locale === 'en' ? 'The share text contains no author name or post body.' : locale === 'zh-CN' ? '分享文本不含作者名及正文。' : '共有文には投稿者名・本文を含めません。'));
  card.append(wrap)
}
function setupDetail(build, comments) {
  currentBuild = build;
  const detail = $('#community-detail');
  detail.replaceChildren();
  const card = node('article', 'community-detail-card');
  card.append(node('h2', '', build.title), metadata(build), boardPreview(build.formationCode, true));
  const counts = node('div', 'community-counts');
  for (const value of [
    isSinglePlayer(build) ? `${COPY.p} ${build.playerCounts[1]} / ${isDojo(build) ? 5 : 15}` : `P1 ${build.playerCounts[1]} / P2 ${build.playerCounts[2]}`,
    `${COPY.helpful} ${build.helpfulCount}`,
    `${COPY.trial} ${build.trialCount}`,
    `${COPY.clear} ${build.clearReportCount}`
  ])
    counts.append(node('span', '', value));
  card.append(counts, node('p', '', build.authorDisplayName));
  if (build.note)
    card.append(node('p', 'community-note', build.note));
  const actions = node('div', 'community-actions');
  for (const [label, className] of [[COPY.load, 'button'], [COPY.copy, 'ghost-button']]) {
    const button = node('button', className, label);
    button.type = 'button';
    button.addEventListener('click', () => {
      if (localStorage.getItem('monsabaFormationDraft:v2') && !confirm(COPY.confirm))
        return;track(label===COPY.load?'formation_load':'formation_copy');location.href=`${prefix}/team-builder/#build=${build.formationCode}`});actions.append(button)}const helpful=node('button','ghost-button',`${COPY.helpful} ${build.helpfulCount}`);helpful.type='button';helpful.addEventListener('click',async()=>{try{const result=await postAction('helpful',{id:build.id},$('#community-action-status'));helpful.textContent=`${COPY.helpful} ${result.helpfulCount}`;helpful.disabled=true;track('formation_helpful')}catch{}});actions.append(helpful);card.append(actions);const status=node('p','tool-status');status.id='community-action-status';status.setAttribute('role','status');card.append(status);const token=owners()[build.id];if(token){const owner=node('div','community-owner-actions');const edit=node('button','ghost-button',COPY.edit);edit.type='button';edit.addEventListener('click',async()=>{const title=prompt(locale==='en'?'Title':locale==='zh-CN'?'标题':'タイトル',build.title);if(!title)return;const note=prompt(locale==='en'?'Note':locale==='zh-CN'?'补充':'補足',build.note||'');if(note===null)return;try{const result=await postAction('edit',{...build,title,note,id:build.id,ownerToken:token},status);setupDetail(result.build,comments)}catch{}});const remove=node('button','ghost-button danger-button',COPY.remove);remove.type='button';remove.addEventListener('click',async()=>{if(!confirm(locale==='en'?'Delete this post?':locale==='zh-CN'?'删除此投稿？':'この投稿を削除しますか？'))return;try{await api('',{method:'DELETE',body:JSON.stringify({id:build.id,ownerToken:token})});removeOwner(build.id);status.textContent=COPY.deleted;location.href=buildListRoute(build)}catch(error){status.textContent=error.message}});owner.append(edit,remove);card.append(owner)}const report=node('button','ghost-button',COPY.report);report.type='button';report.addEventListener('click',async()=>{const reason=prompt(locale==='en'?'Report reason':locale==='zh-CN'?'举报理由':'通報理由','不適切内容');if(!reason)return;try{await postAction('report',{targetType:'build',targetId: build.id, reason }, status);
      report.disabled = true
    } catch { }
  });
  card.append(report);
  detail.append(card);
  $('#community-trial-panel').hidden = false;
  $('#community-comments-panel').hidden = false;
  renderComments(comments);
  const trial = $('#community-trial-form');
  trial.querySelectorAll('[name=difficulty],[name=highestRound]').forEach((input) => {
    input.closest('label').hidden = isSinglePlayer(build);
    input.disabled = isSinglePlayer(build);
  });
  const resultSelect = trial.elements.resultStatus;
  resultSelect.replaceChildren();
  for (const [value, label] of isSinglePlayer(build) ? [['cleared', locale === 'en' ? 'Clear (reported)' : locale === 'zh-CN' ? '通关（申报）' : 'クリア（自己申告）'], ['challenging', locale === 'en' ? 'In progress' : locale === 'zh-CN' ? '挑战中' : '挑戦中']] : [['round', COPY.round], ['cleared', locale === 'en' ? 'Clear (reported)' : locale === 'zh-CN' ? '通关（申报）' : 'クリア（自己申告）']]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    resultSelect.append(option);
  }
  if (isSinglePlayer(build)) {
    const back = document.querySelector('.attribute-guide-nav a[href$="/team-builder/community/"]');
    if (back) {
      back.href = buildListRoute(build);
      back.textContent = isDojo(build) ? `${dojoAttributeLabel(build.dojoAttribute)} · ${floorLabel(build.floor)}` : chapterLabel(build.chapter);
    }
  }
  trial.onsubmit = async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(trial));
    data.id = build.id;
    if (!isSinglePlayer(build)) {
      data.seasonId = build.seasonId;
      data.difficulty = Number(data.difficulty);
      data.highestRound = Number(data.highestRound);
    }
    data.changed = data.changed === 'on';
    try {
      await postAction('trial', data, $('#community-trial-status'));
      track('formation_trial_report')
    } catch { }
  };
  const comment = $('#community-comment-form');
  comment.onsubmit = async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(comment));
    data.id = build.id;
    try {
      const result = await postAction('comment', data, $('#community-comment-status'));
      saveOwner(result.comment.id, result.ownerToken);
      comments.push(result.comment);
      renderComments(comments);
      comment.reset()
    } catch { }
  };
}
async function loadDetail() {
  const id = new URL(location.href).searchParams.get('id');
  if (!id) {
    $('#community-detail').replaceChildren(node('p', 'tool-status is-error', COPY.api));
    return
  }
  try {
    const data = await api(`?id=${encodeURIComponent(id)}`);
    setupDetail(data.build, data.comments);
    addShareActions(data.build);
    track('community_open')
  } catch (error) {
    $('#community-detail').replaceChildren(node('p', 'tool-status is-error', error.message))
  }
}
function localizeTagControls() {
  document.querySelectorAll('[name="tags"]').forEach((input) => {
    const label = input.closest('label');
    if (label)
      label.lastChild.textContent = tagLabel(input.value)
  });
  document.querySelectorAll('#community-tag-filter option').forEach((option) => {
    if (option.value)
      option.textContent = tagLabel(option.value)
  })
}
async function init() {
  try {
    const [tata, chipData, imageData] = await Promise.all(['/data/tatari.json', '/data/zombie-rush/chips.json', '/data/tata-images.json'].map((url) => fetch(url).then((response) => response.json())));
    families = tata.families;
    chips = chipData.chips;
    images = new Map(imageData.families.map((item) => [item.familyId, item]));
    if ($('#community-list')) {
      if (isDojoPage) setupDojo();
      else setupChapters();
      setupPublish();
      localizeTagControls()
    }
    if ($('#community-detail'))
      loadDetail()
  } catch {
    $('#community-list, #community-detail')?.replaceChildren(node('p', 'tool-status is-error', COPY.api))
  }
}
init();
