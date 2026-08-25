(() => {
  const section = document.querySelector('[data-official-x]');
  const feed = section?.querySelector('[data-x-feed]');
  if (!section || !feed) return;

  const status = feed.querySelector('.official-x-status');
  const list = feed.querySelector('.official-x-post-list');
  const fallback = feed.querySelector('.official-x-fallback');
  const REFRESH_INTERVAL = 60 * 60 * 1000;
  let started = false;
  let loading = false;
  let lastLoadedAt = 0;

  const setLinkSafety = (link) => {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  };

  const formatDate = (value) => new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Tokyo',
  }).format(new Date(value));

  const createMedia = (media, postUrl) => {
    const link = document.createElement('a');
    link.className = 'official-x-media-link';
    link.href = postUrl;
    setLinkSafety(link);
    const image = document.createElement('img');
    image.src = media.url;
    image.alt = media.altText || '公式X投稿の画像';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.referrerPolicy = 'no-referrer';
    if (media.width) image.width = media.width;
    if (media.height) image.height = media.height;
    link.append(image);
    return link;
  };

  const createPost = (post) => {
    const article = document.createElement('article');
    article.className = 'official-x-post';

    const header = document.createElement('header');
    const account = document.createElement('strong');
    account.textContent = 'モンスターサバイバル公式 @monsaba_jp';
    const time = document.createElement('time');
    time.dateTime = post.createdAt;
    time.textContent = formatDate(post.createdAt);
    header.append(account, time);

    const text = document.createElement('p');
    text.className = 'official-x-post-text';
    text.textContent = post.text;
    article.append(header, text);

    if (post.media.length) {
      const media = document.createElement('div');
      media.className = 'official-x-media';
      for (const item of post.media) media.append(createMedia(item, post.url));
      article.append(media);
    }

    const link = document.createElement('a');
    link.className = 'official-x-post-link';
    link.href = post.url;
    link.textContent = 'Xで投稿を見る';
    setLinkSafety(link);
    article.append(link);
    return article;
  };

  const showFallback = () => {
    feed.classList.add('is-unavailable');
    feed.setAttribute('aria-busy', 'false');
    if (status) status.hidden = true;
    if (list) list.hidden = true;
    if (fallback) fallback.hidden = false;
  };

  const isValidPost = (post) => post
    && /^\d+$/.test(String(post.id || ''))
    && typeof post.text === 'string'
    && !Number.isNaN(Date.parse(post.createdAt))
    && new RegExp('^https://x\\.com/monsaba_jp/status/' + post.id + '$').test(post.url)
    && Array.isArray(post.media);

  const loadPosts = async () => {
    if (loading) return;
    started = true;
    loading = true;
    const hasCurrentPosts = Boolean(list?.children.length);
    if (!hasCurrentPosts && status) status.textContent = '公式Xの最新投稿を読み込んでいます…';

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch('/api/official-x', {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      const payload = await response.json();
      const posts = Array.isArray(payload.posts) ? payload.posts.slice(0, 5) : [];
      if (!response.ok || !payload.ok || !posts.length || !posts.every(isValidPost)) throw new Error('Official X feed unavailable');
      const nextPosts = document.createDocumentFragment();
      for (const post of posts) nextPosts.append(createPost(post));
      list.replaceChildren(nextPosts);
      list.hidden = false;
      feed.classList.add('is-loaded');
      feed.classList.remove('is-unavailable');
      feed.setAttribute('aria-busy', 'false');
      if (status) status.hidden = true;
      if (fallback) fallback.hidden = true;
      lastLoadedAt = Date.now();
    } catch {
      if (!hasCurrentPosts) showFallback();
    } finally {
      loading = false;
      window.clearTimeout(timeout);
    }
  };

  window.setInterval(() => {
    if (started && document.visibilityState === 'visible') loadPosts();
  }, REFRESH_INTERVAL);

  document.addEventListener('visibilitychange', () => {
    if (started && document.visibilityState === 'visible' && Date.now() - lastLoadedAt >= REFRESH_INTERVAL) loadPosts();
  });

  window.addEventListener('online', () => {
    if (started && Date.now() - lastLoadedAt >= REFRESH_INTERVAL) loadPosts();
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      loadPosts();
    }, { rootMargin: '600px 0px' });
    observer.observe(section);
  } else {
    window.addEventListener('load', loadPosts, { once: true });
  }
})();
