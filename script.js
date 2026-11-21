/* ============================================================
   The Reservation — interactions & scroll choreography
   ============================================================ */
(() => {
  'use strict';

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const inr = new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0
  });

  /* ----------------------------------------------------------
     Preloader
  ---------------------------------------------------------- */
  const preloader = $('#preloader');
  document.body.classList.add('is-locked');
  const startPage = () => {
    document.body.classList.remove('is-locked');
    document.body.classList.add('is-loaded');
    preloader?.classList.add('is-done');
    window.setTimeout(() => preloader?.remove(), 1500);
  };
  if (document.readyState === 'complete') {
    window.setTimeout(startPage, 500);
  } else {
    window.addEventListener('load', () => window.setTimeout(startPage, 420));
    // safety net if a remote font or image stalls
    window.setTimeout(startPage, 3400);
  }

  /* ----------------------------------------------------------
     Header, progress bar
  ---------------------------------------------------------- */
  const header = $('#header');
  const progressBar = $('#progressBar');

  /* ----------------------------------------------------------
     Mobile navigation
  ---------------------------------------------------------- */
  const burger = $('#burger');
  const mobileNav = $('#mobileNav');
  const setMobileNav = (open) => {
    if (!mobileNav) return;
    mobileNav.classList.toggle('is-open', open);
    mobileNav.setAttribute('aria-hidden', String(!open));
    burger?.classList.toggle('is-open', open);
    burger?.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('is-locked', open);
    $$('.mobile-nav__links a', mobileNav).forEach(a => { a.tabIndex = open ? 0 : -1; });
  };
  burger?.addEventListener('click', () => setMobileNav(!mobileNav.classList.contains('is-open')));
  $$('.mobile-nav__links a, .mobile-nav__foot a').forEach(a => {
    a.tabIndex = -1;
    a.addEventListener('click', () => setMobileNav(false));
  });

  /* ----------------------------------------------------------
     Smooth in-page navigation with header offset
  ---------------------------------------------------------- */
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 74;
      window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  /* ----------------------------------------------------------
     Reveal on scroll
  ---------------------------------------------------------- */
  const revealTargets = $$('.reveal, .reveal-img, [data-reveal-card]');
  revealTargets.forEach(el => {
    const d = el.dataset.d;
    if (d) el.style.setProperty('--d', `${d}ms`);
  });

  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
    revealTargets.forEach(el => io.observe(el));
  } else {
    revealTargets.forEach(el => el.classList.add('is-in'));
  }

  /* ----------------------------------------------------------
     Word-by-word statement lighting
  ---------------------------------------------------------- */
  const statement = $('[data-wordlight]');
  let statementWords = [];
  if (statement) {
    const words = statement.textContent.trim().split(/\s+/);
    statement.innerHTML = words
      .map(w => `<span class="w">${w.replace(/[<>&]/g, '')}</span>`)
      .join(' ');
    statementWords = $$('.w', statement);
  }

  /* ----------------------------------------------------------
     Counters
  ---------------------------------------------------------- */
  const counters = $$('[data-count]');
  const animateCount = (el) => {
    const target = Number(el.dataset.count) || 0;
    if (reduceMotion) { el.textContent = String(target); return; }
    const dur = 1500;
    const t0 = performance.now();
    const tick = (now) => {
      const p = clamp((now - t0) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(target * eased)).padStart(target > 9 ? 2 : 1, '0');
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { animateCount(e.target); cio.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(c => cio.observe(c));
  } else {
    counters.forEach(c => { c.textContent = c.dataset.count; });
  }

  /* ----------------------------------------------------------
     Experience crossfade
  ---------------------------------------------------------- */
  const expRows = $$('.exp__row');
  const expImgs = $$('.exp__img');
  const expCaption = $('#expCaption');
  const captions = [
    "The chef's table · eight seats at the pass",
    'Salon Privé · a room for six to fourteen',
    'The courtyard · beneath the mango tree',
    'The coffee counter · mornings only'
  ];
  const setExp = (i) => {
    expRows.forEach(r => r.classList.toggle('is-active', r.dataset.exp === String(i)));
    expImgs.forEach(im => im.classList.toggle('is-active', im.dataset.expImg === String(i)));
    if (expCaption) expCaption.textContent = captions[i] || '';
  };
  if ('IntersectionObserver' in window) {
    const eio = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) setExp(e.target.dataset.exp);
      });
    }, { threshold: 0.55, rootMargin: '-15% 0px -30% 0px' });
    expRows.forEach(r => eio.observe(r));
  }

  /* ----------------------------------------------------------
     Menu tabs
  ---------------------------------------------------------- */
  const tabs = $$('.tab');
  const ink = $('.tabs__ink');
  const panels = $$('.menu__panel');
  const menuCount = $('#menuCount');

  const moveInk = () => {
    const active = $('.tab.is-active');
    if (!active || !ink) return;
    ink.style.width = `${active.offsetWidth}px`;
    ink.style.transform = `translateX(${active.offsetLeft}px)`;
  };

  const selectTab = (tab) => {
    tabs.forEach(t => {
      const on = t === tab;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
    });
    panels.forEach(p => {
      const on = p.dataset.panel === tab.dataset.tab;
      p.classList.toggle('is-active', on);
      p.hidden = !on;
    });
    if (menuCount) {
      const n = $$('.menu__row', $(`.menu__panel[data-panel="${tab.dataset.tab}"]`)).length;
      menuCount.textContent = `${n} plates`;
    }
    moveInk();
  };
  tabs.forEach(t => t.addEventListener('click', () => selectTab(t)));
  window.addEventListener('resize', moveInk);
  window.addEventListener('load', moveInk);
  if (document.fonts?.ready) document.fonts.ready.then(moveInk);
  moveInk();

  /* ----------------------------------------------------------
     Quote slider
  ---------------------------------------------------------- */
  const quotes = $$('.quote');
  const dots = $$('.quote-dot');
  let quoteIndex = 0;
  let quoteTimer;
  const showQuote = (i) => {
    quoteIndex = (i + quotes.length) % quotes.length;
    quotes.forEach((q, n) => q.classList.toggle('is-active', n === quoteIndex));
    dots.forEach((d, n) => d.classList.toggle('is-active', n === quoteIndex));
  };
  const startQuotes = () => {
    if (reduceMotion || quotes.length < 2) return;
    clearInterval(quoteTimer);
    quoteTimer = setInterval(() => showQuote(quoteIndex + 1), 6800);
  };
  dots.forEach(d => d.addEventListener('click', () => {
    showQuote(Number(d.dataset.quote));
    startQuotes();
  }));
  startQuotes();

  /* ----------------------------------------------------------
     Cart
  ---------------------------------------------------------- */
  const cart = [];
  const cartEl = $('#cart');
  const scrim = $('#scrim');
  const cartItems = $('#cartItems');
  const cartEmpty = $('#cartEmpty');
  const cartCount = $('#cartCount');
  const cartToggle = $('#cartToggle');
  const toastEl = $('#toast');
  const toastText = $('#toastText');
  let toastTimer;

  const cartTotalQty = () => cart.reduce((sum, l) => sum + l.qty, 0);
  const subtotal = () => cart.reduce((sum, l) => sum + l.price * l.qty, 0);

  const renderCart = () => {
    if (!cartItems) return;
    cartItems.innerHTML = cart.map((line, i) => `
      <li class="cart__item">
        <div>
          <h4>${line.name}</h4>
          <p class="micro">${line.meta}</p>
        </div>
        <span class="cart__item-price">${inr.format(line.price * line.qty)}</span>
        <div class="cart__item-ctrl">
          <span class="qty">
            <button data-qty="-1" data-i="${i}" aria-label="Decrease quantity">−</button>
            <span>${line.qty}</span>
            <button data-qty="1" data-i="${i}" aria-label="Increase quantity">+</button>
          </span>
          <button class="cart__remove" data-remove="${i}">Remove</button>
        </div>
      </li>`).join('');

    cartEmpty.hidden = cart.length > 0;
    cartItems.hidden = cart.length === 0;

    const sub = subtotal();
    const service = Math.round(sub * 0.1);
    $('#cartSubtotal').textContent = inr.format(sub);
    $('#cartService').textContent = inr.format(service);
    $('#cartTotal').textContent = inr.format(sub + service);

    const qty = cartTotalQty();
    cartCount.textContent = String(qty);
    cartCount.classList.toggle('is-on', qty > 0);
  };

  const showToast = (message) => {
    if (!toastEl) return;
    toastText.textContent = message;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2600);
  };

  const openCart = () => {
    cartEl.classList.add('is-open');
    cartEl.setAttribute('aria-hidden', 'false');
    cartToggle?.setAttribute('aria-expanded', 'true');
    scrim.classList.add('is-on');
    document.body.classList.add('is-locked');
    setTimeout(() => $('#cartClose')?.focus(), 300);
  };
  const closeCart = () => {
    cartEl.classList.remove('is-open');
    cartEl.setAttribute('aria-hidden', 'true');
    cartToggle?.setAttribute('aria-expanded', 'false');
    scrim.classList.remove('is-on');
    document.body.classList.remove('is-locked');
  };

  const addToCart = (btn) => {
    const name = btn.dataset.name;
    const price = Number(btn.dataset.price);
    const meta = btn.dataset.meta || 'From the carte';
    const existing = cart.find(l => l.name === name);
    if (existing) existing.qty += 1;
    else cart.push({ name, price, meta, qty: 1 });
    renderCart();
    cartCount.classList.remove('is-bump');
    void cartCount.offsetWidth;
    cartCount.classList.add('is-bump');
    showToast(`${name} added — ${inr.format(price)}`);

    // brief button acknowledgement
    const original = btn.innerHTML;
    btn.classList.add('is-added');
    if (!btn.classList.contains('add--icon')) {
      btn.innerHTML = 'Added <i>✓</i>';
      setTimeout(() => { btn.innerHTML = original; btn.classList.remove('is-added'); }, 1300);
    }
  };

  $$('[data-add]').forEach(btn => btn.addEventListener('click', () => addToCart(btn)));

  cartItems?.addEventListener('click', (e) => {
    const qtyBtn = e.target.closest('[data-qty]');
    if (qtyBtn) {
      const i = Number(qtyBtn.dataset.i);
      cart[i].qty += Number(qtyBtn.dataset.qty);
      if (cart[i].qty < 1) cart.splice(i, 1);
      renderCart();
      return;
    }
    const rm = e.target.closest('[data-remove]');
    if (rm) {
      cart.splice(Number(rm.dataset.remove), 1);
      renderCart();
      showToast('Removed from your selection');
    }
  });

  cartToggle?.addEventListener('click', openCart);
  $('#cartClose')?.addEventListener('click', closeCart);
  scrim?.addEventListener('click', closeCart);
  $('#cartBrowse')?.addEventListener('click', () => {
    closeCart();
    document.querySelector('#menu')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  });
  $('#cartCheckout')?.addEventListener('click', () => {
    if (!cart.length) { showToast('Your selection is still empty'); return; }
    closeCart();
    showToast('Selection saved — request your table below');
    window.setTimeout(() => {
      document.querySelector('#reserve')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    }, 500);
  });
  renderCart();

  /* ----------------------------------------------------------
     Reservation form
  ---------------------------------------------------------- */
  const form = $('#reserveForm');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const phone = String(data.get('phone') || '').trim();
    if (name.length < 2) {
      form.querySelector('[name="name"]')?.focus();
      showToast('Please tell us your name');
      return;
    }
    if (phone.length < 6) {
      form.querySelector('[name="phone"]')?.focus();
      showToast('A phone number, so we may confirm');
      return;
    }
    showToast(`Thank you, ${name.split(' ')[0]} — our maître d' will call shortly`);
    form.reset();
  });

  /* ----------------------------------------------------------
     Magnetic buttons
  ---------------------------------------------------------- */
  if (window.matchMedia('(pointer: fine)').matches && !reduceMotion) {
    $$('.magnetic').forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.16;
        const y = (e.clientY - r.top - r.height / 2) * 0.22;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ----------------------------------------------------------
     Scroll-driven effects (header, progress, parallax, gallery, words)
  ---------------------------------------------------------- */
  const parallaxEls = $$('[data-parallax]').map(el => ({
    el, speed: Number(el.dataset.parallax) || 0.05
  }));
  const parallaxImgs = $$('[data-parallax-img]').map(el => ({
    el, speed: Number(el.dataset.parallaxImg) || 0.06
  }));
  const gallerySection = $('.gallery');
  const galleryTrack = $('#galleryTrack');
  let galleryMax = 0;

  const measure = () => {
    if (gallerySection && galleryTrack) {
      galleryTrack.style.transform = 'none';
      galleryMax = Math.max(0, galleryTrack.scrollWidth - gallerySection.clientWidth);
      galleryTrack.style.transform = '';
    }
    moveInk();
  };
  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);

  let ticking = false;
  const updateScroll = () => {
    const vh = window.innerHeight;
    const y = window.scrollY;
    const docH = document.documentElement.scrollHeight - vh;

    header?.classList.toggle('is-stuck', y > 40);

    if (progressBar) {
      progressBar.style.transform = `scaleX(${docH > 0 ? clamp(y / docH, 0, 1) : 0})`;
    }

    if (!reduceMotion) {
      parallaxEls.forEach(({ el, speed }) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const p = (vh / 2 - (r.top + r.height / 2)) / vh;
        el.style.translate = `0 ${(p * speed * vh).toFixed(2)}px`;
      });
      parallaxImgs.forEach(({ el, speed }) => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const p = (vh / 2 - (r.top + r.height / 2)) / vh;
        el.style.translate = `0 ${(p * speed * vh).toFixed(2)}px`;
      });

      if (statementWords.length) {
        const r = statement.getBoundingClientRect();
        const p = clamp((vh * 0.78 - r.top) / (r.height + vh * 0.28), 0, 1);
        const lit = Math.round(p * statementWords.length);
        statementWords.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
      }

      if (gallerySection && galleryTrack && window.innerWidth > 900) {
        const r = gallerySection.getBoundingClientRect();
        const p = clamp((vh * 0.92 - r.top) / (r.height + vh * 0.25), 0, 1);
        galleryTrack.style.transform = `translate3d(${(-p * galleryMax).toFixed(1)}px,0,0)`;
      }
    }
    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateScroll);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  updateScroll();

  /* ----------------------------------------------------------
     Keyboard
  ---------------------------------------------------------- */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (cartEl.classList.contains('is-open')) closeCart();
      if (mobileNav?.classList.contains('is-open')) setMobileNav(false);
    }
  });

  /* ----------------------------------------------------------
     Hero pointer drift (desktop only, very subtle)
  ---------------------------------------------------------- */
  const heroImg = $('[data-hero-img]');
  if (heroImg && window.matchMedia('(pointer: fine)').matches && !reduceMotion) {
    let hx = 0, hy = 0, cx = 0, cy = 0, raf;
    const hero = $('.hero');
    hero.addEventListener('mousemove', (e) => {
      const r = hero.getBoundingClientRect();
      hx = (e.clientX / r.width - 0.5) * 18;
      hy = (e.clientY / r.height - 0.5) * 12;
      if (!raf) loop();
    });
    const loop = () => {
      cx += (hx - cx) * 0.06;
      cy += (hy - cy) * 0.06;
      heroImg.style.transform = `scale(1.12) translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
      if (Math.abs(hx - cx) > 0.1 || Math.abs(hy - cy) > 0.1) {
        raf = requestAnimationFrame(loop);
      } else { raf = null; }
    };
  }
})();
