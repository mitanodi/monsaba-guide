(() => {
  const buttons = [...document.querySelectorAll('[data-beginner-choice]')];
  const cards = [...document.querySelectorAll('[data-beginner-modes]')];
  const status = document.querySelector('#beginner-choice-status');
  if (!buttons.length || !cards.length) return;
  for (const button of buttons) button.addEventListener('click', () => {
    const choice = button.dataset.beginnerChoice; let visible = 0;
    for (const item of buttons) item.classList.toggle('is-active', item === button);
    for (const card of cards) { const show = card.dataset.beginnerModes.split(' ').includes(choice); card.hidden = !show; if (show) visible += 1; }
    if (status) status.textContent = `${visible}件の確認済み候補を表示しています。`;
  });
})();
