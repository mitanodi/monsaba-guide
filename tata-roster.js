import { loadRoster, saveRoster } from './my-monsaba/roster-core.js';

const familyId = document.body.dataset.familyId;
const button = document.querySelector('.tata-roster-button');
const dialog = document.querySelector('#tata-roster-dialog');
const stageRoot = document.querySelector('#tata-roster-stages');
const message = document.querySelector('#tata-roster-message');

if (familyId && button && dialog && stageRoot) {
  const payload = await fetch('/data/tatari.json').then((response) => response.json());
  const families = payload.families || [];
  let roster = loadRoster(localStorage, families);
  const family = families.find((entry) => entry.id === familyId);
  const stageCount = Math.min(4, family?.evolutions?.length || 0);

  const updateButton = () => {
    const stage = roster.entries[familyId]?.stage || 0;
    button.textContent = stage ? `マイモンサバ：T${stage}` : 'マイモンサバへ登録';
  };

  const renderStages = () => {
    const current = roster.entries[familyId]?.stage || 0;
    stageRoot.replaceChildren();
    for (let stage = 0; stage <= stageCount; stage += 1) {
      const control = document.createElement('button');
      control.type = 'button';
      control.textContent = stage ? `T${stage}` : '未所持';
      control.setAttribute('aria-pressed', String(current === stage));
      control.addEventListener('click', () => {
        if (stage) roster.entries[familyId] = { ...(roster.entries[familyId] || {}), stage };
        else delete roster.entries[familyId];
        roster = saveRoster(localStorage, roster, families);
        renderStages();
        updateButton();
        message.textContent = stage ? `T${stage}として保存しました。` : '未所持として保存しました。';
        window.MONSABA_TRACK?.event('my_roster_update');
      });
      stageRoot.appendChild(control);
    }
  };

  button.addEventListener('click', () => {
    message.textContent = '';
    renderStages();
    dialog.showModal();
  });
  updateButton();
}
