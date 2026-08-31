import '../../family-display.js';

const {
  normalizeLocale,
  getTataDisplayName
} = globalThis.MONSABA_FAMILY;

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function createTataHtmlLocalizer(tatari) {
  const forms = (tatari?.families || []).flatMap((family) => family.evolutions || []);
  const japaneseNames = [...new Set(forms.map((form) => form.name))]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const namePattern = new RegExp(japaneseNames.map(escapeRegExp).join('|'), 'g');
  const byJapanese = new Map(forms.map((form) => [form.name, form]));
  const tokenByJapanese = new Map(japaneseNames.map((name, index) => [name, `MONSABA_TATA_NAME_${String(index).padStart(3, '0')}`]));
  const formByToken = new Map(japaneseNames.map((name) => [tokenByJapanese.get(name), byJapanese.get(name)]));

  const replaceOutsideAllowedJapanese = (source, replacer) => {
    const protectedBlocks = [];
    let html = source.replace(
      /<([a-z][\w:-]*)\b[^>]*class="[^"]*(?:localized-original-name|tata-i18n-names)[^"]*"[^>]*>[\s\S]*?<\/\1>|"alternateName"\s*:\s*\[[\s\S]*?\]|<script\b(?![^>]*application\/ld\+json)[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/gi,
      (block) => {
        const token = `<tata-localization-block data-index="${protectedBlocks.length}"></tata-localization-block>`;
        protectedBlocks.push(block);
        return token;
      }
    );
    html = replacer(html);
    protectedBlocks.forEach((block, index) => {
      html = html.replace(`<tata-localization-block data-index="${index}"></tata-localization-block>`, block);
    });
    return html;
  };

  const protect = (source) => replaceOutsideAllowedJapanese(source, (html) => {
    let result = html.replace(/>([^<>]+)</g, (match, text) => {
      const name = text.trim();
      return tokenByJapanese.has(name) ? `>${text.replace(name, tokenByJapanese.get(name))}<` : match;
    });
    result = result.replace(/="([^"]+)"/g, (match, value) => tokenByJapanese.has(value) ? `="${tokenByJapanese.get(value)}"` : match);
    return result;
  });

  const localize = (source, locale) => {
    const normalized = normalizeLocale(locale);
    if (normalized === 'ja') return source;

    let html = replaceOutsideAllowedJapanese(source, (value) => {
      let result = value.replace(/MONSABA_TATA_NAME_\d{3}/g, (token) => getTataDisplayName(formByToken.get(token), normalized));
      result = result.replace(namePattern, (japaneseName) => getTataDisplayName(byJapanese.get(japaneseName), normalized));
      return result;
    });

    if (normalized === 'en') {
      const localizedFamilyNames = [...new Set(forms.map((form) => form.nameEn).filter(Boolean))]
        .sort((a, b) => b.length - a.length)
        .map(escapeRegExp)
        .join('|');
      html = html.replace(new RegExp(`\\b(${localizedFamilyNames}) family\\b`, 'g'), '$1 Family');
      html = html.replace(new RegExp(`(${localizedFamilyNames})系`, 'g'), '$1 Family');
      html = html.replace(new RegExp(`(${localizedFamilyNames})セット`, 'g'), '$1 Set');
    } else {
      html = html.replace(/\s+系列/g, '系列');
      const localizedFamilyNames = [...new Set(forms.map((form) => form.nameZhHans).filter(Boolean))]
        .sort((a, b) => b.length - a.length)
        .map(escapeRegExp)
        .join('|');
      html = html.replace(new RegExp(`(${localizedFamilyNames})系(?!列)`, 'g'), '$1系列');
      html = html.replace(new RegExp(`(${localizedFamilyNames})セット`, 'g'), '$1套组');
    }

    return html;
  };

  localize.protect = protect;
  return localize;
}
