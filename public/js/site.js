/* Kragujevac Sport - zajednički JS za javne stranice.
   Učitava se sinhrono u <head> da bi tema bila postavljena pre iscrtavanja;
   sve što dira DOM čeka DOMContentLoaded. */
(function () {
  'use strict';

  var root = document.documentElement;

  // ─── TEMA ────────────────────────────────────────────────────────────────
  try {
    if (localStorage.getItem('theme') === 'dark') root.setAttribute('data-theme', 'dark');
  } catch (_) {}

  function syncThemeColor() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = root.getAttribute('data-theme') === 'dark' ? '#131313' : '#edeeee';
  }

  function toggleTheme() {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (_) {}
    syncThemeColor();
  }

  // ─── BOJE KATEGORIJA ─────────────────────────────────────────────────────
  var TONES = {
    fudbal: 'green',
    kosarka: 'orange',
    rukomet: 'red',
    odbojka: 'yellow',
    vaterpolo: 'blue',
    atletika: 'red',
    tenis: 'green',
    ostalo: 'blue'
  };
  var PALETTE = ['red', 'yellow', 'blue', 'green', 'orange'];

  function normalize(s) {
    return String(s || '').toLowerCase().replace(/đ/g, 'dj')
      .normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }

  function tone(category) {
    return TONES[normalize(category)] || 'yellow';
  }

  // Stabilna boja za proizvoljan tekst (npr. avatar korisnika)
  function toneFor(text) {
    var h = 0, s = String(text || '');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return PALETTE[Math.abs(h) % PALETTE.length];
  }

  // Slika vesti nije učitana: prikaži blok u boji kategorije
  function imgFail(img) {
    img.hidden = true;
    var ph = img.nextElementSibling;
    if (ph) ph.hidden = false;
    if (img.parentNode) img.parentNode.classList.add('is-ph');
  }

  // ─── POJAVLJIVANJE PRI SKROLU ────────────────────────────────────────────
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var observer = null;
  var pending = [];

  function show(el) { el.classList.add('is-visible'); }

  function observe(el) {
    if (!observer) return show(el);
    observer.observe(el);
  }

  function reveal(scope) {
    var ctx = scope && scope.querySelectorAll ? scope : document;
    var items = Array.prototype.slice.call(ctx.querySelectorAll('[data-reveal]:not(.is-visible)'));
    items.forEach(function (el, i) {
      if (!el.style.getPropertyValue('--reveal-delay')) {
        el.style.setProperty('--reveal-delay', Math.min((i % 3) * 80, 160) + 'ms');
      }
      // Dok je uvodna stranica otvorena, animacije čekaju ulazak na sajt
      if (root.classList.contains('splash-on')) pending.push(el);
      else observe(el);
    });
  }

  document.addEventListener('ks:site-enter', function () {
    pending.splice(0).forEach(observe);
  });

  // ─── LIGHTBOX FOKUS ──────────────────────────────────────────────────────
  function lightboxFocus() {
    var lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    var returnFocus = null;
    document.addEventListener('click', function (event) {
      var opener = event.target.closest('#articleMainImg, .gallery-thumb');
      if (opener) returnFocus = opener;
    });

    new MutationObserver(function () {
      if (lightbox.classList.contains('is-open')) {
        var close = document.getElementById('lbClose');
        if (close) close.focus({ preventScroll: true });
      } else if (returnFocus && document.contains(returnFocus)) {
        returnFocus.focus({ preventScroll: true });
      }
    }).observe(lightbox, { attributes: true, attributeFilter: ['class'] });

    lightbox.addEventListener('keydown', function (event) {
      if (event.key !== 'Tab' || !lightbox.classList.contains('is-open')) return;
      var controls = lightbox.querySelectorAll('button:not([disabled])');
      if (!controls.length) return;
      var first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  }

  function searchClearTabIndex() {
    var input = document.getElementById('searchInput');
    var clear = document.getElementById('searchClearBtn');
    if (!input || !clear) return;
    var update = function () { clear.tabIndex = input.value.trim() ? 0 : -1; };
    input.addEventListener('input', update);
    update();
  }

  function init() {
    syncThemeColor();
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', toggleTheme);
    });
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
    document.querySelectorAll('.cat-link.active').forEach(function (el) {
      el.setAttribute('aria-current', 'page');
    });

    if (!reduceMotion.matches && 'IntersectionObserver' in window) {
      root.classList.add('motion-ready');
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          show(entry.target);
          observer.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: .08 });
    }

    reveal(document);
    lightboxFocus();
    searchClearTabIndex();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  window.KS = { tone: tone, toneFor: toneFor, imgFail: imgFail, reveal: reveal };
})();
