const root = document.querySelector('[data-article-comments]');
if (root) {
  const articleId = root.dataset.articleComments;
  const list = root.querySelector('[data-comment-list]');
  const form = root.querySelector('form');
  const status = root.querySelector('[data-comment-status]');
  const lang = document.documentElement.lang;
  const copy = lang === 'en' ? { loading:'Loading comments…', empty:'No comments yet.', anonymous:'Anonymous', send:'Posting…', done:'Your comment was posted.', fail:'Comments could not be loaded.', remove:'Delete', confirm:'Delete this comment?' } : lang === 'zh-CN' ? { loading:'正在加载评论…', empty:'暂无评论。', anonymous:'匿名', send:'正在发布…', done:'评论已发布。', fail:'无法加载评论。', remove:'删除', confirm:'要删除这条评论吗？' } : { loading:'コメントを読み込んでいます…', empty:'まだコメントはありません。', anonymous:'匿名', send:'投稿しています…', done:'コメントを投稿しました。', fail:'コメントを読み込めませんでした。', remove:'削除', confirm:'このコメントを削除しますか？' };
  const storageKey = `monsabaArticleCommentTokens:${articleId}:v1`;
  const tokens = (() => { try { const value = JSON.parse(localStorage.getItem(storageKey) || '{}'); return value && typeof value === 'object' ? value : {}; } catch { return {}; } })();
  const save = () => localStorage.setItem(storageKey, JSON.stringify(tokens));
  const el = (tag, cls, value) => { const node = document.createElement(tag); if (cls) node.className = cls; if (value !== undefined) node.textContent = value; return node; };
  const request = async (url, options) => { const response = await fetch(url, options); const payload = await response.json().catch(() => null); if (!response.ok || !payload?.ok) throw new Error(payload?.error?.message || copy.fail); return payload; };
  const render = (comments) => {
    list.replaceChildren();
    if (!comments.length) return list.append(el('p', 'article-comments-empty', copy.empty));
    for (const comment of comments) {
      const card = el('article', 'article-comment');
      const head = el('div', 'article-comment-head');
      head.append(el('strong', '', comment.name || copy.anonymous));
      const time = el('time', '', new Intl.DateTimeFormat(lang === 'zh-CN' ? 'zh-CN' : lang === 'en' ? 'en' : 'ja-JP', { dateStyle:'medium', timeStyle:'short' }).format(new Date(comment.createdAt)));
      time.dateTime = comment.createdAt; head.append(time);
      card.append(head, el('p', '', comment.content));
      if (tokens[comment.id]) {
        const button = el('button', 'board-text-button', copy.remove); button.type = 'button';
        button.addEventListener('click', async () => { if (!confirm(copy.confirm)) return; button.disabled = true; try { await request('/api/article-comments', { method:'DELETE', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ articleId, id:comment.id, deleteToken:tokens[comment.id] }) }); delete tokens[comment.id]; save(); await load(); } catch (error) { status.textContent = error.message; button.disabled = false; } });
        card.append(button);
      }
      list.append(card);
    }
  };
  const load = async () => { list.setAttribute('aria-busy', 'true'); list.textContent = copy.loading; try { const payload = await request(`/api/article-comments?article=${encodeURIComponent(articleId)}`); render(payload.comments); } catch { list.textContent = copy.fail; } finally { list.removeAttribute('aria-busy'); } };
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); const button = form.querySelector('[type=submit]'); button.disabled = true; status.textContent = copy.send;
    try { const payload = await request('/api/article-comments', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ articleId, ...Object.fromEntries(new FormData(form).entries()) }) }); tokens[payload.comment.id] = payload.deleteToken; save(); form.reset(); status.textContent = copy.done; await load(); }
    catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
  });
  load();
}
