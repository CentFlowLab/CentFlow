// Página de apresentação. O menu e a janela do SideStore não dependem de bibliotecas.
(function () {
  const nav = document.querySelector('#site-nav');
  const toggle = document.querySelector('#nav-toggle');
  const dialog = document.querySelector('#install');
  const openInstall = document.querySelector('[data-open="install"]');
  const copy = document.querySelector('#copy-source');
  const source = document.querySelector('#sidestore-source');
  const copyStatus = document.querySelector('#copy-status');

  function setMenu(open, restoreFocus) {
    if (!nav || !toggle) return;
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      const first = nav.querySelector('a');
      if (first) first.focus();
    } else if (restoreFocus) {
      toggle.focus();
    }
  }

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true', false);
    });
    nav.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('a')) setMenu(false, false);
    });
    const desktop = window.matchMedia('(min-width: 800px)');
    desktop.addEventListener('change', (event) => {
      if (event.matches) setMenu(false, false);
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (toggle && toggle.getAttribute('aria-expanded') === 'true') setMenu(false, true);
  });

  if (dialog && openInstall) {
    openInstall.addEventListener('click', () => dialog.showModal());
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  }

  if (!copy || !source) return;
  copy.addEventListener('click', async () => {
    const url = source.textContent.trim();
    let label = 'Seleciona e copia';
    try {
      await navigator.clipboard.writeText(url);
      label = 'Copiado';
    } catch {
      label = 'Seleciona e copia';
    }
    copy.textContent = label;
    if (copyStatus) copyStatus.textContent = label;
    window.setTimeout(() => {
      copy.textContent = 'Copiar';
      if (copyStatus) copyStatus.textContent = '';
    }, 2000);
  });
})();
