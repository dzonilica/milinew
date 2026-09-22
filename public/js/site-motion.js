(function () {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  let revealObserver = null;

  function markReveal(element, direction, delay) {
    if (!element) return;
    if (element.dataset.motionBound !== 'true') {
      element.dataset.motionBound = 'true';
      element.dataset.reveal = direction || 'up';
      element.style.setProperty('--reveal-delay', (delay || 0) + 'ms');
    }

    if (reduceMotion.matches || !revealObserver) {
      element.classList.add('is-visible');
      return;
    }

    const rect = element.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < window.innerHeight * 1.04) {
      requestAnimationFrame(function () { element.classList.add('is-visible'); });
      revealObserver.unobserve(element);
      return;
    }

    revealObserver.observe(element);
  }

  function bindPointerSurface(element) {
    if (!canHover.matches || reduceMotion.matches || element.dataset.pointerBound === 'true') return;
    element.dataset.pointerBound = 'true';

    element.addEventListener('pointermove', function (event) {
      const rect = element.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      element.style.setProperty('--pointer-x', x.toFixed(2) + '%');
      element.style.setProperty('--pointer-y', y.toFixed(2) + '%');
    }, { passive: true });

    element.addEventListener('pointerleave', function () {
      element.style.setProperty('--pointer-x', '50%');
      element.style.setProperty('--pointer-y', '50%');
    }, { passive: true });
  }

  function bindMagneticControl(element) {
    if (!canHover.matches || reduceMotion.matches || element.dataset.magneticBound === 'true') return;
    element.dataset.magneticBound = 'true';

    element.addEventListener('pointermove', function (event) {
      const rect = element.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - .5) * 6;
      const y = ((event.clientY - rect.top) / rect.height - .5) * 6;
      element.style.setProperty('--mag-x', x.toFixed(2) + 'px');
      element.style.setProperty('--mag-y', y.toFixed(2) + 'px');
    }, { passive: true });

    element.addEventListener('pointerleave', function () {
      element.style.setProperty('--mag-x', '0px');
      element.style.setProperty('--mag-y', '0px');
    }, { passive: true });
  }

  function enhance(scope) {
    const context = scope && scope.querySelectorAll ? scope : document;
    const one = function (selector) {
      return context.matches && context.matches(selector) ? context : context.querySelector(selector);
    };
    const all = function (selector) {
      const results = Array.from(context.querySelectorAll(selector));
      if (context.matches && context.matches(selector)) results.unshift(context);
      return results;
    };

    markReveal(one('.hero-featured'), 'left', 40);
    all('.hero-sidebar-item').forEach(function (element, index) {
      markReveal(element, 'right', 120 + index * 90);
    });
    all('.section-heading').forEach(function (element) {
      markReveal(element, 'up', 0);
    });
    all('.news-card').forEach(function (element, index) {
      markReveal(element, 'up', Math.min((index % 4) * 70, 210));
    });
    all('.article-wrap > *, .privacy-wrap > *, .contact-hero > *, .contact-info > *, .auth-card').forEach(function (element, index) {
      markReveal(element, 'up', Math.min(index * 55, 220));
    });
    all('.comment-item, .comment-form, .comment-login-prompt, .comments-empty').forEach(function (element, index) {
      markReveal(element, 'up', Math.min(index * 55, 165));
    });

    all('.news-card, .hero-sidebar-item').forEach(bindPointerSurface);
    all('.btn, .btn-auth-login, .search-btn, .mobile-menu-btn, .footer-socials a').forEach(bindMagneticControl);
  }

  function createRipple(event) {
    if (reduceMotion.matches || event.button !== 0) return;
    const control = event.target.closest('.btn, .btn-auth-login, .search-btn, .mobile-menu-btn, .footer-socials a');
    if (!control) return;

    const rect = control.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'tap-ripple';
    ripple.style.left = (event.clientX - rect.left) + 'px';
    ripple.style.top = (event.clientY - rect.top) + 'px';
    control.appendChild(ripple);
    ripple.addEventListener('animationend', function () { ripple.remove(); }, { once: true });
  }

  function improveSearchKeyboardAccess() {
    const input = document.getElementById('searchInput');
    const clear = document.getElementById('searchClearBtn');
    if (!input || !clear) return;

    const update = function () {
      clear.tabIndex = input.value.trim() ? 0 : -1;
    };
    input.addEventListener('input', update);
    update();
  }

  function markCurrentCategory() {
    const active = document.querySelector('.cat-nav-link.active');
    if (active) active.setAttribute('aria-current', 'page');
  }

  function improveLightboxFocus() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    let returnFocus = null;
    document.addEventListener('click', function (event) {
      const opener = event.target.closest('#articleMainImg, .gallery-thumb');
      if (opener) returnFocus = opener;
    });

    const stateObserver = new MutationObserver(function () {
      if (lightbox.classList.contains('is-open')) {
        document.getElementById('lbClose')?.focus({ preventScroll: true });
      } else if (returnFocus && document.contains(returnFocus)) {
        returnFocus.focus({ preventScroll: true });
      }
    });
    stateObserver.observe(lightbox, { attributes: true, attributeFilter: ['class'] });

    lightbox.addEventListener('keydown', function (event) {
      if (event.key !== 'Tab' || !lightbox.classList.contains('is-open')) return;
      const controls = Array.from(lightbox.querySelectorAll('button:not([disabled])'));
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  function initialize() {
    if (!reduceMotion.matches) root.classList.add('motion-ready');

    revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -7% 0px', threshold: .08 });

    enhance(document);
    improveSearchKeyboardAccess();
    markCurrentCategory();
    improveLightboxFocus();
    document.addEventListener('pointerdown', createRipple);

    const contentObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType === Node.ELEMENT_NODE) enhance(node);
        });
      });
      enhance(document);
      markCurrentCategory();
    });

    contentObserver.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
