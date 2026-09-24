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
  }
};

const loader = document.currentScript;
const slot = loader?.dataset.imobileSlot;
const device = window.matchMedia('(max-width: 820px)').matches ? 'sp' : 'pc';
const officialTag = imobileTags[slot]?.[device];
if (officialTag) document.write(officialTag);
