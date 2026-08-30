export const PDF_EVIDENCE = Object.freeze({
  fileName: '写真.pdf',
  totalPages: 91,
  physicalPages: 92,
  excludedFrontMatterPages: 1,
  knownRanges: Object.freeze({
    attributes: Object.freeze([1, 5]),
    pakumaFamily: Object.freeze([6, 10]),
    pakumaFishToss: Object.freeze([11, 14]),
    kumashFishShot: Object.freeze([15, 18]),
    marineBearFishCrunch: Object.freeze([19, 22]),
    blizzlyFishBonanza: Object.freeze([23, 27]),
    namuamidaija: Object.freeze([28, 33]),
    roadpass: Object.freeze([34, 37]),
    accountScreens: Object.freeze([38, 39]),
    chipIndex: Object.freeze([40, 42]),
    chipDetails: Object.freeze([43, 91])
  })
});

export const pagesInRange = ([start, end]) => Array.from({ length: end - start + 1 }, (_, index) => start + index);

export function isValidPdfPage(page) {
  return Number.isInteger(page) && page >= 1 && page <= PDF_EVIDENCE.totalPages;
}

export function assertPdfPage(page, label = 'PDF page') {
  if (!isValidPdfPage(page)) throw new Error(`${label} must be an integer from 1 to ${PDF_EVIDENCE.totalPages}: ${page}`);
}

export function assertPdfRange(start, end, label = 'PDF page range') {
  assertPdfPage(start, `${label} start`);
  assertPdfPage(end, `${label} end`);
  if (start > end) throw new Error(`${label} start must not exceed end: ${start}-${end}`);
}
