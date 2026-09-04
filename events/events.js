(() => {
  const buttons = [...document.querySelectorAll('[data-event-filter]')]; const cards = [...document.querySelectorAll('[data-event-status]')]; const count = document.querySelector('[data-event-count]');
  for (const button of buttons) button.addEventListener('click', () => { let visible = 0; const filter = button.dataset.eventFilter; buttons.forEach((item) => item.classList.toggle('is-active', item === button)); cards.forEach((card) => { const show = filter === 'all' || card.dataset.eventStatus.replace('-', '_') === filter; card.hidden = !show; if (show) visible += 1; }); if (count) count.textContent = `${visible}件`; });
})();
