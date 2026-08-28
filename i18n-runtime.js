(function () {
  const payload = window.__MONSABA_I18N__;
  if (!payload || payload.locale === 'ja') return;
  const translations = payload.translations || {};
  const phrases = payload.phrases || [];
  const properNames = payload.properNames || [];
  const localePrefix = payload.locale === 'en' ? '/en' : '/zh-cn';
  const excludedSelector = '.official-x-post-text,.friend-comment,.board-question-body,.board-answer-body,.board-reply-body,[data-ugc],#friendsList,#boardThreads,#boardThread';

  function translate(source) {
    const value = String(source || '');
    const trimmed = value.trim();
    if (!trimmed) return value;
    let translated = translations[trimmed];
    const familyCount = trimmed.match(/^(\d+)\s*\/\s*(\d+)系統を表示$/);
    if (!translated && familyCount) translated = payload.locale === 'en'
      ? `${familyCount[1]} / ${familyCount[2]} families shown`
      : `显示 ${familyCount[1]} / ${familyCount[2]} 个系列`;
    const selectedTotal = trimmed.match(/^合計[:：]\s*(\d+)個$/);
    if (!translated && selectedTotal) translated = payload.locale === 'en'
      ? `Total: ${selectedTotal[1]} selected`
      : `合计：${selectedTotal[1]} 个`;
    const currentInput = trimmed.match(/^現在[:：]\s*(.+?)を入力中$/);
    if (!translated && currentInput) translated = payload.locale === 'en'
      ? `Current input: ${translate(currentInput[1]).trim()}`
      : `当前输入：${translate(currentInput[1]).trim()}`;
    const standaloneFamilyCount = trimmed.match(/^(\d+)系統$/);
    if (!translated && standaloneFamilyCount) translated = payload.locale === 'en'
      ? `${standaloneFamilyCount[1]} families`
      : `${standaloneFamilyCount[1]} 个系列`;
    const standaloneSelectedCount = trimmed.match(/^(\d+)個$/);
    if (!translated && standaloneSelectedCount) translated = payload.locale === 'en'
      ? `${standaloneSelectedCount[1]} selected`
      : `${standaloneSelectedCount[1]} 个`;
    if (!translated && /[\u3040-\u30ff\u3400-\u9fff]/.test(trimmed)) {
      const protectedValues = [];
      translated = trimmed;
      properNames.forEach((name) => {
        if (!translated.includes(name)) return;
        const token = `__MNSB_NAME_${protectedValues.length}__`;
        protectedValues.push([token, name]);
        translated = translated.replaceAll(name, token);
      });
      const hasJapaneseFamilySuffix = /__MNSB_NAME_\d+__系(?!列)/.test(translated);
      if (payload.locale === 'zh-CN' && !/[\u3040-\u30ff]/.test(translated) && !hasJapaneseFamilySuffix) return value;
      for (const [from, to] of phrases) translated = translated.includes(from) ? translated.replaceAll(from, to) : translated;
      if (payload.locale === 'en') {
        translated = translated.replace(/(__MNSB_NAME_\d+__)系(?!列)/g, '$1 family').replace(/(\d+)個/g, '$1 selected');
      } else {
        translated = translated.replace(/(__MNSB_NAME_\d+__)系(?!列)/g, '$1系列').replace(/(\d+)個/g, '$1 个');
      }
      protectedValues.forEach(([token, name]) => { translated = translated.replaceAll(token, name); });
    }
    if (!translated || translated === trimmed) return value;
    return value.replace(trimmed, translated);
  }

  function localizeHref(anchor) {
    const raw = anchor.getAttribute('href');
    if (!raw || !raw.startsWith('/') || raw.startsWith('/api/') || raw.startsWith('/data/') || raw.startsWith('/assets/') || /^\/(?:en|zh-cn)(?:\/|$)/.test(raw) || /\.(?:css|js|json|xml|txt|webmanifest|ico|png|jpe?g|webp|svg)(?:[?#]|$)/i.test(raw)) return;
    anchor.setAttribute('href', raw === '/' ? `${localePrefix}/` : `${localePrefix}${raw}`);
  }

  function translateElement(root) {
    if (!(root instanceof Element) || root.closest(excludedSelector)) return;
    if (root.matches('a[href]')) localizeHref(root);
    root.querySelectorAll?.('a[href]').forEach(localizeHref);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest(excludedSelector) || /^(SCRIPT|STYLE|TEXTAREA)$/.test(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => { node.nodeValue = translate(node.nodeValue); });
    const elements = [root, ...root.querySelectorAll?.('[aria-label],[title],[placeholder],[alt]') || []];
    elements.forEach((element) => ['aria-label', 'title', 'placeholder', 'alt'].forEach((name) => {
      if (element.hasAttribute?.(name)) element.setAttribute(name, translate(element.getAttribute(name)));
    }));
  }

  function start() {
    if (!document.body) return;
    window.monsabaI18n = Object.freeze({ locale: payload.locale, translate });
    translateElement(document.body);
    new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) translateElement(node);
      else if (node.nodeType === Node.TEXT_NODE && node.parentElement && !node.parentElement.closest(excludedSelector)) node.nodeValue = translate(node.nodeValue);
    }))).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
