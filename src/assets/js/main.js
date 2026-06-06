// Nav scroll border
const nav = document.getElementById('site-nav');
if (nav) {
  addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });
}

// Simple lightbox for gallery tiles
document.querySelectorAll('.tile img').forEach((img) => {
  img.style.cursor = 'zoom-in';
  img.addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.9);display:flex;align-items:center;justify-content:center;cursor:zoom-out';
    const big = img.cloneNode();
    big.style.cssText = 'max-width:90vw;max-height:90vh;width:auto;height:auto;object-fit:contain';
    overlay.appendChild(big);
    overlay.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
  });
});
