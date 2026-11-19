/* =========================================================
   Cafe S21 — Interactions & Animations
   Performance notes:
   - scroll / mousemove work is batched into one requestAnimationFrame
   - infinite hero/marquee animations pause when off-screen
   - only transform/opacity are animated
   ========================================================= */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Preloader: hide as soon as the DOM + hero image are ready ---------- */
  document.body.classList.add('loading');
  let preloaderDone = false;
  const hidePreloader = () => {
    if (preloaderDone) return;
    preloaderDone = true;
    $('#preloader')?.classList.add('hide');
    document.body.classList.remove('loading');
  };
  const heroImg = new Image();
  heroImg.onload = heroImg.onerror = () => setTimeout(hidePreloader, 300);
  heroImg.src = 'images/hero-bg.jpg';
  setTimeout(hidePreloader, 2000); // never block longer than this

  /* ---------- Header + back-to-top (rAF-throttled, only toggles when state changes) ---------- */
  const navbar = $('#navbar');
  const toTop = $('#toTop');
  let scrolled = null, showTop = null, scrollTicking = false;
  const onScrollFrame = () => {
    const y = window.scrollY;
    const s = y > 40, t = y > 600;
    if (s !== scrolled) { navbar.classList.toggle('scrolled', s); scrolled = s; }
    if (t !== showTop) { toTop.classList.toggle('show', t); showTop = t; }
    scrollTicking = false;
  };
  window.addEventListener('scroll', () => {
    if (!scrollTicking) { scrollTicking = true; requestAnimationFrame(onScrollFrame); }
  }, { passive: true });
  onScrollFrame();

  /* ---------- Mobile menu ---------- */
  const hamburger = $('#hamburger');
  const navLinks = $('#navLinks');
  const closeMenu = () => {
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');
    document.body.style.overflow = '';
  };
  hamburger.addEventListener('click', () => {
    const open = !navLinks.classList.contains('open');
    hamburger.classList.toggle('open', open);
    navLinks.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('a', navLinks).forEach(a => a.addEventListener('click', closeMenu));

  /* ---------- Active link on scroll ---------- */
  const navAnchors = $$('.nav-links a');
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      navAnchors.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('section[id]').forEach(s => spy.observe(s));

  /* ---------- Pause looping animations when off-screen ---------- */
  const pauser = new IntersectionObserver(entries => {
    entries.forEach(e => e.target.classList.toggle('paused', !e.isIntersecting));
  });
  [$('.hero'), $('.marquee')].forEach(el => el && pauser.observe(el));

  /* ---------- Scroll reveal ---------- */
  const revealer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in-view');
      revealer.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal, .reveal-left, .reveal-right').forEach(el => revealer.observe(el));

  /* ---------- Counters ---------- */
  const counter = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const end = +el.dataset.count;
      counter.unobserve(el);
      if (reduceMotion) { el.textContent = end; return; }
      const start = performance.now();
      const tick = now => {
        const p = Math.min((now - start) / 1400, 1);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(el => counter.observe(el));

  /* ---------- Menu filter with sliding indicator ---------- */
  const tabs = $$('.tab');
  const indicator = $('.tab-indicator');
  const cards = $$('.menu-card');
  const moveIndicator = tab => {
    indicator.style.transform = `translateX(${tab.offsetLeft}px)`;
    indicator.style.width = tab.offsetWidth + 'px';
  };
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.toggle('active', t === tab));
    moveIndicator(tab);
    const f = tab.dataset.filter;
    let n = 0;
    cards.forEach(card => {
      const show = f === 'all' || card.dataset.cat === f;
      card.classList.toggle('is-hidden', !show);
      card.classList.remove('pop');
      if (show) {
        card.classList.add('in-view');
        card.style.animationDelay = (n++ % 3) * 0.07 + 's';
      }
    });
    void document.body.offsetWidth; // one reflow for all cards, then restart animation
    cards.forEach(card => { if (!card.classList.contains('is-hidden')) card.classList.add('pop'); });
  }));
  const syncIndicator = () => moveIndicator($('.tab.active'));
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(syncIndicator, 120); });
  document.fonts?.ready.then(syncIndicator);
  syncIndicator();

  /* ---------- Hero parallax (desktop mouse only, rAF-throttled) ---------- */
  const heroVisual = $('#heroVisual');
  if (canHover && !reduceMotion) {
    let mx = 0, my = 0, mTicking = false;
    $('.hero').addEventListener('mousemove', e => {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
      if (!mTicking) {
        mTicking = true;
        requestAnimationFrame(() => {
          heroVisual.style.translate = `${mx * -22}px ${my * -22}px`;
          mTicking = false;
        });
      }
    }, { passive: true });
  }

  /* ---------- Lightbox (gallery + full menu card) ---------- */
  const lightbox = $('#lightbox');
  const lbImg = $('.lb-img', lightbox);
  const openLb = (src, alt = '') => {
    lbImg.src = src;
    lbImg.alt = alt;
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };
  const closeLb = () => {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };
  $$('.g-item').forEach(item => item.addEventListener('click', () => {
    const img = $('img', item);
    openLb(img.currentSrc || img.src, img.alt);
  }));
  $$('[data-lightbox]').forEach(btn => btn.addEventListener('click', () => openLb(btn.dataset.lightbox, 'Cafe S21 menu card')));
  lightbox.addEventListener('click', e => { if (e.target !== lbImg) closeLb(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeLb(); closeMenu(); } });

  /* ---------- Booking form → WhatsApp ---------- */
  const CAFE_WHATSAPP = '919657572141';
  $('#date').min = new Date().toISOString().split('T')[0];
  $('#bookingForm').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#name').value.trim();
    const phone = $('#phone').value.trim();
    const dateVal = $('#date').value;
    const timeVal = $('#time').value;
    const guests = $('#guests').selectedOptions[0].text;

    const date = new Date(dateVal + 'T00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const [h, m] = timeVal.split(':').map(Number);
    const time = `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;

    const text =
      `Hi Cafe S21! I'd like to reserve a table.\n\n` +
      `Name: ${name}\nPhone: ${phone}\nDate: ${date}\nTime: ${time}\nGuests: ${guests}`;
    window.open(`https://wa.me/${CAFE_WHATSAPP}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');

    const msg = $('#formMsg');
    msg.textContent = `Thanks ${name.split(' ')[0]}! Just hit "Send" in WhatsApp to confirm your booking.`;
    msg.classList.remove('show'); void msg.offsetWidth; msg.classList.add('show');
    e.target.reset();
  });

  /* ---------- Footer year ---------- */
  $('#year').textContent = new Date().getFullYear();
})();
