# Current Production UI audit — 2026-09-04

基準: https://monster-survival.com/ / HEAD 0e6c26042ed8409bdbd768d196ef6e1856588d55。

320 / 375 / 390 / 430 / 768 / 820 / 1024 / 1366 / 1440 / 1920 の10幅で、15 route、合計150表示をBrowser監査した。開始時点では horizontal overflow 0、H1異常0、主要8ページの壊れた画像0。Before画像はRepository外のCodex visualizationへ保存した。

| Page / area | Current problem | Severity | Proposed solution | Affected files | Risk | Expected UX impact |
|---|---|---:|---|---|---|---|
| Global header | Desktop linkが同じ強さで横並び | High | 5カテゴリdropdown、search、sticky compact | shared-layout.mjs, site.js, styles.css | 全ページ共通 | 認知負荷を下げる |
| TOP | Hero後の導線がサイト分類中心 | High | 6つの目的カード、3 primary CTA、注目攻略 | index.html | LCP | 初見の選択を早める |
| Search | 専用ページまで移動が必要 | High | 全ページsearch、Ctrl/Cmd+K、端末内履歴 | site.js | privacy | 横断探索を短縮 |
| Tata catalog | Card内の進化名・skillが密 | Medium | 画像・Family・属性・Tier・段階へ簡略化 | generate-core-pages.mjs, app.js | 情報欠落感 | 一覧性向上 |
| Tata filters | 属性単独 | Medium | 属性+T4の複合、active chips、全解除 | app.js | URL state | 探索条件を保持 |
| Tata detail | Heroが文字中心 | High | 公式T1 art、Tier/役割/段階、action bar | generate-tata-pages.mjs | 64ページ | 同定と次操作を早める |
| Evolution | 横スクロール依存 | Medium | PC timeline、mobile 2列 | Tata generator/CSS | pending images | 進化順を視覚化 |
| Skills | 長文と数値の視線移動 | Medium | 公式icon、2列cards、stat cells | Tata generator/CSS | density | 比較速度向上 |
| Tier | 本体より導入情報が先 | High | Tier DOMをintro直後へ、sticky mode/filter、URL hash | site.js, tata-tier.js | JS fallback | 結論到達を短縮 |
| Compare | mobileで上下になり差が追いにくい | Medium | 2列維持、sticky character head | CSS | narrow width | 差分比較を維持 |
| Team Builder | 記事型の周辺UIが盤面を圧迫 | High | app幅、focus mode、Esc、mobile picker sheet | site.js, CSS | fixed UI | 盤面操作へ集中 |
| Community | 投稿panelが一覧より先 | High | Explore/Post tabs、Explore default | site.js | APIなしでも動作 | 閲覧目的を優先 |
| Community cards | 情報は揃うが階層が弱い | Medium | board preview、meta/count badges、load CTAを保持 | community CSS/JS | load | 読み込み判断を早める |
| Events | 文字中心 | Medium | 既存公式optimized art、status filter、verified date | expansion generator/CSS | 日付の推測禁止 | 状態を一目で把握 |
| Long pages | 章へ直接移動しにくい | Medium | HTML headingsからanchor付きTOC | site.js, CSS | title重複 | 到達時間短縮 |
| Design system | radius/space/shadow/statusに揺れ | Medium | shared tokens、attribute/tier/source | styles.css | cascade | 全体の予測可能性向上 |

## 保護判断

- Tier変更履歴は既存履歴SSOTがないため創作しない。
- Event timelineは確実な日時がないカードへ表示しない。
- 「人気」はAnalytics根拠がないため使わず、「注目攻略」と明記する。
- Community backend、AdSense、ads.txt、A8、Creator Asset原本には変更を加えない。
