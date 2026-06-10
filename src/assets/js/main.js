// Nav scroll border
const nav = document.getElementById('site-nav');
if (nav) {
  addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });
}

// Menu hambúrguer (mobile)
const navToggle = document.getElementById('nav-toggle');
const navLinks = document.getElementById('nav-links');
if (navToggle && navLinks) {
  const setOpen = (open) => {
    navLinks.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    navToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  };
  navToggle.addEventListener('click', () => {
    setOpen(!navLinks.classList.contains('open'));
  });
  navLinks.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => setOpen(false));
  });
  document.addEventListener('click', (e) => {
    if (navLinks.classList.contains('open') && !nav.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
}

// Lightbox das galerias: amplia a foto e mostra nome, descrição e crédito
// (lidos de data-caption / data-desc / data-credit, com fallback no alt).
document.querySelectorAll('.tile img').forEach((img) => {
  img.style.cursor = 'zoom-in';
  img.addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.className = 'lightbox';

    const fig = document.createElement('figure');
    fig.className = 'lightbox-figure';
    const big = document.createElement('img');
    big.className = 'lightbox-img';
    big.src = img.src;
    big.alt = img.alt || '';
    fig.appendChild(big);

    const caption = (img.dataset.caption || '').trim();
    const desc = (img.dataset.desc || img.alt || '').trim();
    const credit = (img.dataset.credit || '').trim();
    if (caption || desc || credit) {
      const info = document.createElement('figcaption');
      info.className = 'lightbox-info';
      if (caption) {
        const el = document.createElement('strong');
        el.className = 'lightbox-caption';
        el.textContent = caption;
        info.appendChild(el);
      }
      if (desc && desc !== caption) {
        const el = document.createElement('p');
        el.className = 'lightbox-desc';
        el.textContent = desc;
        info.appendChild(el);
      }
      if (credit) {
        const el = document.createElement('p');
        el.className = 'lightbox-credit';
        el.textContent = 'Crédito: ' + credit;
        info.appendChild(el);
      }
      fig.appendChild(info);
    }

    overlay.appendChild(fig);
    const close = () => {
      overlay.remove();
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    document.body.appendChild(overlay);
  });
});
