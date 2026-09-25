const imobileTags = {
  tier: {
    pc: `<div id="im-7e3ba0c55f8843139c3146cee377f750">
  <script async src="https://imp-adedge.i-mobile.co.jp/script/v1/spot.js?20220104"></script>
  <script>(window.adsbyimobile=window.adsbyimobile||[]).push({pid:85460,mid:596516,asid:1945861,type:"banner",display:"inline",elementid:"im-7e3ba0c55f8843139c3146cee377f750"})</script>
</div>`,
    sp: `<div id="im-b78f7a84f7b04029aab9c679261b995f">
  <script async src="https://imp-adedge.i-mobile.co.jp/script/v1/spot.js?20220104"></script>
  <script>(window.adsbyimobile=window.adsbyimobile||[]).push({pid:85460,mid:596517,asid:1945863,type:"banner",display:"inline",elementid:"im-b78f7a84f7b04029aab9c679261b995f"})</script>
</div>`
  },
  gaoden: {
    pc: `<div id="im-e346a7ea51a34ffb80d09c58b022e0b0">
  <script async src="https://imp-adedge.i-mobile.co.jp/script/v1/spot.js?20220104"></script>
  <script>(window.adsbyimobile=window.adsbyimobile||[]).push({pid:85460,mid:596516,asid:1945862,type:"banner",display:"inline",elementid:"im-e346a7ea51a34ffb80d09c58b022e0b0"})</script>
</div>`,
    sp: `<div id="im-1191bf9c9abe4475b0cc1a65202c13dc">
      <script async src="https://imp-adedge.i-mobile.co.jp/script/v1/spot.js?20220104"></script>
      <script>(window.adsbyimobile=window.adsbyimobile||[]).push({pid:85460,mid:596517,asid:1945864,type:"banner",display:"inline",elementid:"im-1191bf9c9abe4475b0cc1a65202c13dc"})</script>
</div>`
  },
  top: {
    pc: `<div id="im-b2de40dd24624feda7c4073e66f4d66a">
  <script async src="https://imp-adedge.i-mobile.co.jp/script/v1/spot.js?20220104"></script>
  <script>(window.adsbyimobile=window.adsbyimobile||[]).push({pid:85460,mid:596516,asid:1945881,type:"banner",display:"inline",elementid:"im-b2de40dd24624feda7c4073e66f4d66a"})</script>
</div>`,
    sp: `<div id="im-f8fdf05c186048d481bc8410676ec3bb">
  <script async src="https://imp-adedge.i-mobile.co.jp/script/v1/spot.js?20220104"></script>
  <script>(window.adsbyimobile=window.adsbyimobile||[]).push({pid:85460,mid:596517,asid:1945884,type:"banner",display:"inline",elementid:"im-f8fdf05c186048d481bc8410676ec3bb"})</script>
</div>`
  },
  mid: {
    pc: `<div id="im-1cc6715adbfb47e4934239edee8089e0">
  <script async src="https://imp-adedge.i-mobile.co.jp/script/v1/spot.js?20220104"></script>
  <script>(window.adsbyimobile=window.adsbyimobile||[]).push({pid:85460,mid:596516,asid:1945882,type:"banner",display:"inline",elementid:"im-1cc6715adbfb47e4934239edee8089e0"})</script>
</div>`,
    sp: `<div id="im-b5fcec5cb3e0465bbc985844b6cde5a6">
  <script async src="https://imp-adedge.i-mobile.co.jp/script/v1/spot.js?20220104"></script>
  <script>(window.adsbyimobile=window.adsbyimobile||[]).push({pid:85460,mid:596517,asid:1945885,type:"banner",display:"inline",elementid:"im-b5fcec5cb3e0465bbc985844b6cde5a6"})</script>
</div>`
  },
  bottom: {
    pc: `<div id="im-67f6a025c53b41889d4730e577d5b9b8">
  <script async src="https://imp-adedge.i-mobile.co.jp/script/v1/spot.js?20220104"></script>
  <script>(window.adsbyimobile=window.adsbyimobile||[]).push({pid:85460,mid:596516,asid:1945883,type:"banner",display:"inline",elementid:"im-67f6a025c53b41889d4730e577d5b9b8"})</script>
</div>`,
    sp: `<div id="im-7b9dfd40b6774cf8bc19d10eb1ed44ea">
  <script async src="https://imp-adedge.i-mobile.co.jp/script/v1/spot.js?20220104"></script>
  <script>(window.adsbyimobile=window.adsbyimobile||[]).push({pid:85460,mid:596517,asid:1945886,type:"banner",display:"inline",elementid:"im-7b9dfd40b6774cf8bc19d10eb1ed44ea"})</script>
</div>`
  }
};

const loader = document.currentScript;
const slot = loader?.dataset.imobileSlot;
const device = window.matchMedia('(max-width: 820px)').matches ? 'sp' : 'pc';
const officialTag = imobileTags[slot]?.[device];
if (officialTag) document.write(officialTag);
