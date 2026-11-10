// Página de apresentação: a instalação no iPhone abre uma janela, não desce a página.
(function () {
  const dialog = document.querySelector('#install');
  const open = document.querySelector('[data-open="install"]');
  const copy = document.querySelector('#copy-source');
  const source = document.querySelector('#sidestore-source');
  if (!dialog || !open || !copy || !source) return;

  open.addEventListener('click', () => dialog.showModal());

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  copy.addEventListener('click', async () => {
    const url = source.textContent.trim();
    try {
      await navigator.clipboard.writeText(url);
      copy.textContent = 'Copiado';
    } catch {
      copy.textContent = 'Seleciona e copia';
    }
    window.setTimeout(() => {
      copy.textContent = 'Copiar';
    }, 2000);
  });
})();
