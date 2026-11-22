import { load } from 'cheerio';

const normalize = text => text.replace(/\s+/g, ' ').trim();
const citationHeading = /^(?:出典|参考情報|参考と更新方針|情報の扱い|掲載データについて|一次証拠とデータ方針|情報源と反映方針|情報源と確認状態|情報源と確認状況|根拠と確認状態|参考と確認状態|参考資料|Sources?|References?(?: information)?|Primary evidence and data policy|Evidence and legacy separation|信息来源|来源|参考信息|第一手证据与数据方针|一次证据与数据方针)$/i;
// Editorial provenance belongs in the data/evidence files, not the play guide.
// These patterns intentionally do not match factual conditions or numeric caveats.
const editorial = [
  /通常スキルとは別のゾンビラッシュ専用データです|おすすめTierは実戦根拠が不足するため作成していません/,
  /当サイトで一次証拠と外部情報を区別して独自に整理した内容です/,
  /^(?:タタDB、当サイト|確認済みDBと当サイト|ゲーム内資料と外部攻略資料を区別|公開攻略情報と(?:、)?当サイト|公開攻略で(?:明記|挙げ)|タタ名・進化・スキル数値は|系統名・役割ラベル|個別ページは、失敗原因|現在はデータ構造のみ|既存DBで根拠が揃った候補|画像編成からタタを推測|回答は data\/|国内外の公開資料と報酬画像|公開日、更新日、データ確認日)/,
  /(?:当サイト|各ページ).*(?:独自に(?:整理|要約)|(?:情報|データ|資料|評価)を(?:区別|分けて)|データを分けて整理|確認できない内容は推測|推測していません|独自整理です|公式ランキングではありません)/,
  /(?:公開攻略|外部攻略|ゲーム内スクリーンショット|確認済みデータ).*(?:整理しています|分けて掲載|分けて表示|対応付けています|を合わせて整理|転載せず|を基にした当サイト)/,
  /^(?:参考情報[：:]|公開資料確認[：:]|資料のスキル名[：:]|資料の技能名[：:]|最終(?:更新|確認日)[ ：:0-9]|データ更新方針|更新・確認方針)/,
  /(?:実戦根拠|根拠が薄い|根拠が不足|順位を付けるだけの情報が不足).*(?:Tier|評価|順位|作成|掲載)/,
  /^(?:評価保留は弱い|未掲載の数値は推測|確認できない名称・効果・数値|不明な内容は推測|根拠が揃った|外部サイトのコード・HTML・CSS)/,
  /^(?:出典[：、]|参照ページ[：:]|参考[：:]|資料確認日[：:]|運営者と、情報を整理|タタ名・進化・スキルは、ゲーム内スクリーンショット|誤情報を確認した場合|公開攻略の属性別例|ユーザー提供のゲーム内スクリーンショット.*PDF|ゲーム内PDFを一次証拠|国内外Tier差分監査|実戦記録の根拠が十分|名称・条件は日本語資料を掲載|本番ゲーム内・公式告知で確認できた時点|編成・結果・コメントはcommunity_user)/,
  /^(?:.*本文・画像・表は転載せず|.*外部資料から補完。画像・矛盾する数値は|.*実照合し、全系統の進化条件|確認済みのTier DBにある役割ラベル|系統名・役割ラベル・各用途Tier)/,
  /^(?:Skill names? (?:in|from) the source|Source[：:]|We will introduce you to the operator|When an error is found|Tatari names, evolutions and skill|Published data and |The primary evidence is |Data source[：:]|Reference page[：:]|Source checked[：:]|The sources are|Names and conditions are shown from Japanese)/i,
  /^(?:出处[：:]|来源[：:]|参照页面[：:]|参考页面[：:]|参考[：:]|资料确认日[：:]|我们将向您介绍运营|发现错误时|运营者与|用户提供.*PDF|第一手证据为|编队、结果.*community_user)/,
  /^(?:通常スキルとは別データです|情報の整理方針|データの区分|掲載データについて)/,
  /^(?:This database is separate from normal Tatari skills|We are not publishing a chip tier list|Chip images and effects[：:]|本数据库与塔塔普通技能分开保存|实战证据不足，因此不制作芯片Tier|图片与效果[：:])/,
  /\bactualTier\b.*\bresult\b/,
  /^(?:運営者とサイト全体の作成方針は|The operator and the overall site creation policy are|运营商和总体站点创建政策是)/i,
  /^(?:This (?:site|page) (?:independently|separates)|Independently organized with primary evidence|Tatari DB, provisional|Public strategy information and data|Published strategy sources are clearly separated|Examples listed in public walkthroughs|Using only confirmed data, we|We (?:will (?:separate|organize the attributes)|have organized (?:the names|public strategy information)|have not given|don't make assumptions|do not speculate)|The primary evidence is a|Community strategy source|Japanese strategy source|Domestic strategy wiki evolution|Candidates with sufficient evidence|Names, (?:evolution|evolutions)|Create answers in the following ranges|Handling of sources, pending evaluation)/i,
  /(?:organize[ds]? (?:separately|independently)|separat(?:e[ds]?|ed) (?:from|with) (?:this site|primary evidence|external)|independently summarized|source table and images were not copied|not copied from external sites|source images, tables or article copy|why.*not.*(?:rank|Tier)|insufficient (?:evidence|information) to rank|no recommended Tier.*(?:evidence|data))/i,
  /^(?:Source skill name|Source names?|Reference information[：:]|Last (?:checked|updated)[：:]|Data update policy|Pending evaluation does not mean|Verified data and this site)/i,
  /(?:本站|本网站|我们).*(?:区分第一手证据|区分.*外部信息|独立整理|独立摘要|单独整理公共策略信息|从游戏内的截图中总结|不会对.*做出假设|不会填写虚构信息|整理了来自该站点的公共策略信息|并未基于薄弱的证据|未创建.*排名)/,
  /^(?:Tatari 的名字、进化以及技能值|在以下范围内创建答案|国内攻略Wiki进化条件一览|社区攻略来源|日本攻略资料于|仅保留资料画面中可读|资料画面中的“距离进化|目前只准备了数据结构|已核对国内外列表|公开资料核对[：:]|出处[：:]|资料的技能名[：:]|参考信息[：:])/,
  /^(?:这是与普通技能分开的|这是独立于普通技能|此为.*僵尸突袭专用数据|由于实战依据不足.*Tier|因实战证据不足.*Tier)/,
  /(?:recommended Tier|recommended tier list).*(?:insufficient|lack of|not enough).*evidence/i,
  /(?:Zombie Rush-specific data|Zombie Rush-only data).*(?:separate from|different from) (?:normal|regular) skills/i
];
const pureCitationUrl = /^https?:\/\/(?:w\.atwiki\.jp\/monstersurvival|img\.atwiki\.jp\/monstersurvival|monster-survival\.games-wiki\.com|clashofcritters\.wiki\.gg|clashcritters\.com|nekonokyositu\.com\/monsaba|tatacalc\.shop)/i;
const shortUncertainty = {
  ja: '最新のゲーム内数値は未確認。',
  en: 'Current in-game values are unconfirmed.',
  'zh-CN': '当前游戏内数值待确认。'
};

export function playerFacingHtml(source, file = '') {
  // Privacy/analytics/advertising notices and all footer rights notices are protected.
  if (/(?:^|\/)privacy\//.test(file)) return source;
  const $ = load(source);
  const locale = $('html').attr('lang') || 'ja';
  const lang = locale === 'en' ? 'en' : locale === 'zh-CN' ? 'zh-CN' : 'ja';
  const touched = new Set();
  const remove = node => { const el = $(node); for (const parent of el.parents().toArray()) touched.add(parent); el.remove(); };
  const protectedNode = node => $(node).closest('footer,.footer-disclosures,.article-byline,.tier-contributor,[data-imobile-placement],[data-admax-slot],.ad-slot,.affiliate-slot').length > 0;

  $('main .page-freshness,main .source-list,main .sources,main .evidence-image-note,main .official-x-source-note,main .tier-source-note,main .astra-schedule-source,main .zr-schedule-source,main .chip-supplement-note,main .name-catalog-note,main .prediction-accuracy-note,main .i18n-locale-notice,main #referenceSources').each((_, node) => remove(node));
  $('main .prediction-hero > div > p,main .prediction-disclaimer > p').each((_,node)=>remove(node));
  $('main .source-details').each((_, node) => {
    const el = $(node), summary = el.children('summary');
    if (/参照スクショ|Screenshots?|截图来源|参考截图/i.test(summary.text())) { remove(node); return; }
    summary.text(lang === 'en' ? 'Effect values' : lang === 'zh-CN' ? '效果数值' : '効果数値');
  });
  $('main a').each((_, node) => {
    if (protectedNode(node)) return;
    const el = $(node), href = el.attr('href') || '';
    if (pureCitationUrl.test(href) || /^(?:\/(?:en\/|zh-cn\/)?about-data\/)(?:#.*)?$/.test(href)) remove(node);
  });
  $('main .trust-label.is-verified,main .trust-label.is-external,main .trust-label.is-independent').each((_, node) => { if (!protectedNode(node)) remove(node); });
  $('main .visible-kicker').each((_, node) => {
    if (/外部資料照合|外部资料|source.(?:check|review)|externally.checked/i.test($(node).text())) remove(node);
  });

  // Retain the actual floor subdivision and the pending maximum, without a source box.
  $('main .community-dojo-sources').each((_, node) => {
    $(node).empty().append(`<p>${lang === 'en' ? 'Each floor has 10 stages. The maximum floor is unconfirmed; you can enter a number directly.' : lang === 'zh-CN' ? '每层有10个关卡。最高层数待确认，可直接输入编号。' : '1階は10ステージ。最大階数は未確認のため、番号を直接指定できます。'}</p>`);
    $(node).removeClass('source-note community-dojo-sources').addClass('community-dojo-note');
  });

  $('main p,main small,main li,main figcaption').each((_, node) => {
    if (protectedNode(node) || $(node).find('script,input,button,select,.imobile-ad-slot,.ninja-admax-slot').length) return;
    const el = $(node), text = normalize(el.text());
    if (!text) return;
    if (/community_user/.test(text) && /Analytics/i.test(text)) {
      el.text(lang === 'en' ? 'Post text and formation contents are not sent to Analytics.' : lang === 'zh-CN' ? '不会将帖子正文或阵容内容发送至Analytics。' : '投稿本文や編成内容をAnalyticsへ送信しません。');
      return;
    }
    if (/^日本語名と進化画像.*画像の権利は各権利者に帰属します。/.test(text)) {
      el.text(lang === 'en' ? 'Image rights belong to their respective owners. Skills, evolution conditions, ratings and localized names are unconfirmed.' : lang === 'zh-CN' ? '图片权利归各权利人所有。技能、进化条件、评级及本地化名称待确认。' : '画像の権利は各権利者に帰属します。スキル・進化条件・評価・外国語名は未確認です。');
      return;
    }
    if (/^2026-10-07・外部資料での確認です。ゲーム内最新値との実物照合は未完了。$/.test(text)) { el.text(shortUncertainty[lang]); return; }
    if (/^(?:資料のスキル名：|Source skill name:|资料的技能名：)/i.test(text)) { remove(node); return; }
    if (/^効果数値は資料に未掲載。$|^数値付き効果ポップアップは資料に未掲載。$/.test(text)) { el.text(lang === 'en' ? 'Effect values are unconfirmed.' : lang === 'zh-CN' ? '效果数值待确认。' : '効果数値は未確認。'); return; }
    if (editorial.some(pattern => pattern.test(text))) {
      remove(node);
    }
  });
  $('main h2,main h3,main strong').each((_, node) => {
    if (!protectedNode(node) && citationHeading.test(normalize($(node).text()))) remove(node);
    else if (normalize($(node).text()) === 'Human Verification') remove(node);
  });
  $('main a[href="#sources"]').each((_,node)=>remove(node));
  $('main #sources > p').each((_,node)=>{if (/^[\s·・\d:/-]+$/.test($(node).text())) remove(node);});

  // The former editorial-policy page keeps its material credit/legal information and contact.
  if (/(?:^|\/)about-data\/index\.html$/.test(file)) {
    const materialTitle = lang === 'en' ? 'Game materials' : lang === 'zh-CN' ? '游戏素材' : 'ゲーム素材';
    $('main h1').text(materialTitle);
    $('main .breadcrumbs span').last().text(materialTitle);
    $('main .prose-page').children().each((_, node) => {
      const el = $(node);
      if (el.is('aside') || el.find('a[href*="/about/#contact"]').length) return;
      remove(node);
    });
    $('main .source-note').each((_, node) => { if (!$(node).find('a[href*="/about/"]').length) remove(node); });
  }

  // Remove empty source frames/headings while retaining their ad placements and real content.
  $('main .source-note').each((_, node) => {
    const el = $(node);
    el.children('h2,strong').each((_, heading) => { if (!$(heading).find('a').length) remove(heading); });
    el.removeClass('source-note');
    touched.add(node);
  });
  for (let pass = 0; pass < 3; pass++) {
    for (const node of touched) {
      const el = $(node);
      if (!el.parent().length || el.is('html,body,main') || protectedNode(node) || el.attr('id')) continue;
      if (!normalize(el.text()) && !el.find('img,script,input,button,select,textarea,iframe,svg,[data-imobile-placement],[data-admax-slot]').length) remove(node);
      else if (el.is('section,aside,div') && el.children().length && el.children().toArray().every(child => /h[2-6]/.test(child.tagName))) remove(node);
    }
  }
  $('main .prose-page > h2,main .static-section > h2').each((_,node)=>{
    const el=$(node),next=el.next();
    if (!el.attr('id') && (!next.length || next.is('h2'))) remove(node);
  });
  // Direct selection is first in DOM order; desktop CSS keeps the board on the left.
  if (/(?:^|\/)team-builder\/index\.html$/.test(file)) {
    const workspace = $('.formation-workspace'), picker = workspace.children('.formation-picker'), board = workspace.children('.formation-board-panel');
    if (picker.length && board.length) board.before(picker);
    $('[data-team-picker-open],[data-team-board-focus]').remove();
    if (board.length && !board.find('[data-team-picker-return]').length)
      board.find('.formation-primary-actions').append(`<button type="button" class="ghost-button" data-team-picker-return>${lang === 'en' ? 'Tata list' : lang === 'zh-CN' ? '塔塔列表' : 'タタ一覧'}</button>`);
  }
  if (/^0\s*\//.test(normalize($('#predictionJudged').text()))) $('#predictionExactRate,#predictionWithinOneRate').text('—');
  // Leave head/navigation/footer and inline scripts outside main byte-for-byte intact.
  return source.replace(/<main\b[^>]*>[\s\S]*?<\/main>/i, () => $.html($('main')).replace(/[ \t]+(?=\r?\n)/g, ''))
    .replace(/\s(selected|disabled|checked|defer|async|hidden|open|multiple|autofocus|required|nomodule)=""/g, ' $1');
}
