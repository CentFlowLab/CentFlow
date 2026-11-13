// miven.pt: menu, cabeçalho ao rolar, revelações suaves, plataforma recomendada e cópia da fonte
// do SideStore. Sem bibliotecas nem pedidos externos. Sem JavaScript o conteúdo aparece todo.
(function () {
  const header = document.querySelector('.site-header');
  const nav = document.querySelector('#site-nav');
  const toggle = document.querySelector('#nav-toggle');

  // Cabeçalho: linha inferior só depois de rolar.
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Menu do telemóvel.
  function setMenu(open, restoreFocus) {
    if (!nav || !toggle) return;
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.querySelector('.visually-hidden').textContent = open ? 'Fechar menu' : 'Menu';
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
    document.addEventListener('click', (event) => {
      if (toggle.getAttribute('aria-expanded') !== 'true') return;
      if (event.target instanceof Element && !event.target.closest('.site-header')) {
        setMenu(false, false);
      }
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', (event) => {
      if (event.matches) setMenu(false, false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false, true);
      }
    });
  }

  // Revelações ao rolar (o CSS desliga-as com prefers-reduced-motion).
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.1 },
    );
    reveals.forEach((element) => observer.observe(element));
  } else {
    reveals.forEach((element) => element.classList.add('is-visible'));
  }

  // Escolha de plataforma: destaca a do aparelho, sem esconder as outras nem redirecionar.
  const cards = document.querySelectorAll('.platform-card[data-platform]');
  if (cards.length > 0) {
    const ua = navigator.userAgent || '';
    const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    const detected =
      /iPhone|iPad|iPod/.test(ua) || iPadOS ? 'ios' : /Android/.test(ua) ? 'android' : 'web';
    const names = { ios: 'iPhone', android: 'Android', web: 'computador' };
    cards.forEach((card) => {
      if (card.getAttribute('data-platform') !== detected) return;
      card.classList.add('is-recommended');
      const label = card.querySelector('.recommended');
      if (label) label.hidden = false;
    });
    const hint = document.querySelector('#install-hint');
    if (hint) {
      hint.textContent =
        detected === 'web'
          ? 'Neste computador, recomendamos a aplicação web. As outras opções continuam abaixo.'
          : 'Parece que estás num ' + names[detected] + '. Destacámos a opção indicada.';
      hint.hidden = false;
    }
  }

  // Copiar o endereço da fonte do SideStore.
  const copy = document.querySelector('#copy-source');
  const source = document.querySelector('#sidestore-source');
  const copyStatus = document.querySelector('#copy-status');
  if (!copy || !source) return;
  copy.addEventListener('click', async () => {
    const url = source.textContent.trim();
    let label = 'Copiado';
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      label = 'Seleciona e copia';
      const range = document.createRange();
      range.selectNodeContents(source);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
    copy.textContent = label;
    if (copyStatus) copyStatus.textContent = label === 'Copiado' ? 'Endereço copiado.' : label;
    window.setTimeout(() => {
      copy.textContent = 'Copiar';
      if (copyStatus) copyStatus.textContent = '';
    }, 2000);
  });
})();
