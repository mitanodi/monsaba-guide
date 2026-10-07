import { load } from 'cheerio';

// Slice source ranges rather than serialize the parsed tree: this preserves
// formatting, ads and nested elements while honoring translate="no".
export function protectLocalizedHtml(source) {
  const $ = load(source, { sourceCodeLocationInfo: true });
  const ranges = $('[translate="no"]').toArray().map(node => node.sourceCodeLocation)
    .filter(location => location && Number.isInteger(location.startOffset) && Number.isInteger(location.endOffset))
    .sort((a,b) => a.startOffset - b.startOffset || b.endOffset - a.endOffset);
  const outer = [];
  for (const range of ranges)
    if (!outer.some(parent => range.startOffset >= parent.startOffset && range.endOffset <= parent.endOffset)) outer.push(range);
  const blocks = outer.map(range => source.slice(range.startOffset, range.endOffset));
  let html = source;
  for (let i=outer.length-1;i>=0;i--) html = html.slice(0,outer[i].startOffset)+`<native-locale-block data-index="${i}"></native-locale-block>`+html.slice(outer[i].endOffset);
  return { html, restore(value) {
    for(let i=0;i<blocks.length;i++) value=value.replace(`<native-locale-block data-index="${i}"></native-locale-block>`,blocks[i]);
    return value;
  } };
}
