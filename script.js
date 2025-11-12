// Register GSAP + ScrollTrigger
window.addEventListener('DOMContentLoaded', () => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Smooth-ish anchor scroll for browsers without native smooth
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length > 1) {
        e.preventDefault();
        document.querySelector(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  if (prefersReduced) {
    document.querySelectorAll('.reveal').forEach(el => el.style.opacity = 1);
    return;
  }

  // Text & section reveals (avoid transform on tilt cards to prevent jitter)
  const reveals = gsap.utils.toArray('.reveal');
  reveals.forEach((el, i) => {
    const isTilt = el.classList.contains('tilt-card') || (el.closest && el.closest('#work .tilt-card'));
    const tween = {
      opacity: 1,
      duration: 0.8,
      ease: 'power2.out',
      delay: i * 0.03,
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
      }
    };
    if (!isTilt) tween.y = 0; // only non-tilt cards animate translateY
    gsap.to(el, tween);
  });

  // Parallax elements (skip work grid cards to keep alignment)
  gsap.utils.toArray('[data-parallax]')
    .forEach(el => {
      if (el.closest && el.closest('#work .grid')) return; // do not parallax thumbnails grid
      const speed = parseFloat(el.getAttribute('data-parallax')) || 0.2;
      gsap.to(el, {
        yPercent: speed * -20,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        }
      });
    });

  // Hero orbs subtle motion
  const orbs = document.querySelectorAll('.orb');
  orbs.forEach((o, i) => {
    gsap.to(o, { y: 8, repeat: -1, yoyo: true, duration: 2 + i, ease: 'sine.inOut', delay: i * 0.2 });
  });

  // Tilt cards
  const cards = document.querySelectorAll('.tilt-card');
  const constrain = 12;
  cards.forEach(card => {
    const shine = card.querySelector('.shine');
    function handleMove(e) {
      const rect = card.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width; // 0..1
      const my = (e.clientY - rect.top) / rect.height; // 0..1
      const rx = (0.5 - my) * constrain;
      const ry = (mx - 0.5) * constrain;
      card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      if (shine) {
        shine.style.setProperty('--mx', `${mx * 100}%`);
        shine.style.setProperty('--my', `${my * 100}%`);
      }
    }
    function reset() { card.style.transform = 'perspective(800px) rotateX(0) rotateY(0)'; }
    card.addEventListener('mousemove', handleMove);
    card.addEventListener('mouseleave', reset);
  });

  // Marquee: ensure continuous loop by duplicating items to 2x width
  const marquee = document.querySelector('.marquee');
  const track = document.querySelector('.marquee-track');
  if (marquee && track) {
    const ensureFill = () => {
      let loops = 0;
      while (track.scrollWidth < marquee.clientWidth * 2 && loops < 10) {
        track.innerHTML += track.innerHTML; // duplicate items
        loops++;
      }
    };
    ensureFill();
    window.addEventListener('resize', ensureFill);
  }

  // Clients: render from JSON for easy updates
  const clientsContainer = document.querySelector('.clients[data-source]');
  
  function renderClients(list) {
    if (!clientsContainer || !Array.isArray(list)) return;
    clientsContainer.innerHTML = '';
    const frag = document.createDocumentFragment();
    list.forEach(c => {
      const handle = c.handle || c.name || 'Client';
      const subs = c.subs || c.subscribers || '';
      const avatar = c.avatar || 'https://placehold.co/96x96/png';
      // platform removed for simplified display (avatar, handle, subs only)
      const card = document.createElement('article');
      card.className = 'client-card reveal';
      card.innerHTML = `
        <img class="avatar" src="${avatar}" alt="${handle} avatar" loading="lazy" decoding="async" width="84" height="84"/>
        <div class="meta">
          <h3>${handle}</h3>
          <div class="subs">${subs}</div>
        </div>`;
      frag.appendChild(card);
    });
    clientsContainer.appendChild(frag);
    // Hook new elements into reveal animations if GSAP is available
    if (window.gsap && window.ScrollTrigger) {
      clientsContainer.querySelectorAll('.reveal').forEach((el, i) => {
        gsap.to(el, {
          opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', delay: i * 0.03,
          scrollTrigger: { trigger: el, start: 'top 85%' }
        });
      });
    } else {
      // Fallback: just show them
      clientsContainer.querySelectorAll('.reveal').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
    }
  }

  async function loadClients() {
    if (!clientsContainer) return;
    const src = clientsContainer.getAttribute('data-source');
    try {
      const res = await fetch(src, { cache: 'no-store' });
      if (res.ok) {
        let data = await res.json();
        data = await enrichAndSortClients(data);
        renderClients(data);
        return;
      }
    } catch (e) { /* ignore and try inline fallback */ }
    const inline = document.getElementById('clients-data');
    if (inline && inline.textContent) {
      try {
        let data = JSON.parse(inline.textContent);
        data = await enrichAndSortClients(data);
        renderClients(data);
      } catch (e) {}
    }
  }
  loadClients();

  function parseSubsToNumber(text) {
    if (!text) return 0;
    const t = String(text).replace(/[,'\s]/g, '').toUpperCase();
    const m = t.match(/([\d.]+)([MK]?)/);
    if (!m) return 0;
    const num = parseFloat(m[1]);
    const suf = m[2];
    if (suf === 'M') return Math.round(num * 1_000_000);
    if (suf === 'K') return Math.round(num * 1_000);
    return Math.round(num);
  }

  async function enrichAndSortClients(list) {
    const needs = list.some(c => (!c.subs || !c.avatar) && c.url);
    if (needs) {
      await Promise.allSettled(list.map(async c => {
        if (!c.url || (c.subs && c.avatar)) return;
        try {
          const proxied = 'https://r.jina.ai/http://' + c.url.replace(/^https?:\/\//,'');
          const resp = await fetch(proxied, { cache: 'no-store' });
          if (!resp.ok) return;
          const txt = await resp.text();
          if (!c.subs) {
            let m = txt.match(/subscriberCountText\"\s*:\s*\{\s*\"simpleText\"\s*:\s*\"([^\"]+)/i);
            if (!m) m = txt.match(/subscriberCountText[^}]*?\"text\"\s*:\s*\"([^\"]+)/i);
            if (m) c.subs = m[1].replace(/subscribers?/i,'Subs').trim();
          }
          if (!c.avatar) {
            const am = txt.match(/\"avatar\"\s*:\s*\{\s*\"thumbnails\"\s*:\s*\[\{\s*\"url\"\s*:\s*\"(https?:[^\"\\]+)/i);
            if (am) c.avatar = am[1].replace(/\\\//g,'/').replace(/\u0026/g,'&');
          }
        } catch(_) {}
      }));
    }
    return [...list].sort((a,b) => parseSubsToNumber(b.subs) - parseSubsToNumber(a.subs));
  }

  // Reviews slider (center active, sides faded)
  const rvViewport = document.querySelector('.reviews-viewport');
  const rvTrack = document.getElementById('reviews-track');
  const btnPrev = document.getElementById('reviews-prev');
  const btnNext = document.getElementById('reviews-next');
  let rvIndex = 0;
  function rvCards() { return rvTrack ? Array.from(rvTrack.querySelectorAll('.review-card')) : []; }
  function rvUpdateClasses(cards) {
    cards.forEach((c,i) => {
      c.classList.remove('is-active','is-prev','is-next');
      if (i === rvIndex) c.classList.add('is-active');
      else if (i === (rvIndex - 1 + cards.length) % cards.length) c.classList.add('is-prev');
      else if (i === (rvIndex + 1) % cards.length) c.classList.add('is-next');
    });
  }
  function rvSnapToCurrent() {
    if (!rvTrack || !rvViewport) return;
    const cards = rvCards();
    if (!cards[rvIndex]) return;
    const active = cards[rvIndex];
    const left = active.offsetLeft;
    const w = active.offsetWidth;
    const x = -(left - (rvViewport.clientWidth/2 - w/2));
    rvTrack.style.transform = `translateX(${x}px)`;
    rvUpdateClasses(cards);
  }
  function rvGo(dir) { const cards = rvCards(); if (!cards.length) return; rvIndex = (rvIndex + dir + cards.length) % cards.length; rvSnapToCurrent(); }
  btnPrev?.addEventListener('click', () => rvGo(-1));
  btnNext?.addEventListener('click', () => rvGo(1));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') rvGo(-1);
    if (e.key === 'ArrowRight') rvGo(1);
  });
  window.addEventListener('resize', rvSnapToCurrent);
  // Initialize after layout: start centered so both sides show
  setTimeout(() => {
    const n = rvCards().length;
    if (n) rvIndex = Math.floor(n / 2);
    rvSnapToCurrent();
  }, 50);

  // Commission: copy Discord tag
  document.getElementById('copy-discord')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText('larzyfx');
      const prev = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = prev, 1200);
    } catch (err) {
      alert('Discord tag: larzyfx');
    }
  });

  // Contact page: Copy brief to clipboard
  const briefForm = document.getElementById('brief-form');
  if (briefForm) {
    briefForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = briefForm.querySelector('#name')?.value?.trim() || '';
      const handle = briefForm.querySelector('#handle')?.value?.trim() || '';
      const project = briefForm.querySelector('#project')?.value || '';
      const budget = briefForm.querySelector('#budget')?.value || '';
      const details = briefForm.querySelector('#details')?.value?.trim() || '';
      const lines = [
        `New Project Inquiry`,
        `Name: ${name}`,
        `Handle: ${handle}`,
        `Project: ${project}`,
        `Budget: ${budget}`,
        `Details: ${details}`
      ];
      const text = lines.join('\n');
      try {
        await navigator.clipboard.writeText(text);
        alert('Brief copied. Paste into a Discord DM.');
      } catch (_) {
        // Fallback: show the text in an alert if clipboard fails
        alert('Copy this and paste into Discord:\n\n' + text);
      }
    });
  }

  // Show More / Show Less with smooth height + fade transitions
  (function setupShowMore() {
    const grid = document.getElementById('work-grid');
    const btn = document.getElementById('show-more');
    if (!grid || !btn) return;

    const items = Array.from(grid.querySelectorAll('.card'));
    const INITIAL_ROWS = 4; // rows visible initially
    const HEIGHT_MS = 300;  // grid height animation
    const FADE_MS = 180;    // item fade duration
    let expanded = false;
    let animating = false;

    const getCols = () => {
      const cols = getComputedStyle(grid).gridTemplateColumns;
      return (!cols || cols === 'none') ? 1 : cols.split(' ').filter(Boolean).length;
    };
    const initialCount = () => Math.min(items.length, getCols() * INITIAL_ROWS);

    const updateButton = () => {
      btn.textContent = expanded ? 'Show Less' : 'Show More';
      btn.setAttribute('aria-expanded', expanded.toString());
      btn.hidden = items.length <= initialCount();
    };

    // Set initial collapsed state
    const init = () => {
      const keep = initialCount();
      items.forEach((it, idx) => {
        const hide = idx >= keep;
        it.classList.toggle('hidden-item', hide);
        if (hide) {
          // Ensure base .reveal style doesn't force opacity back to 0
          it.classList.remove('reveal');
          it.style.transition = '';
          it.style.opacity = '';
        }
      });
      updateButton();
    };

    const animateGridHeight = (from, to) => {
      grid.style.maxHeight = from + 'px';
      grid.style.overflow = 'hidden';
      grid.style.transition = 'max-height ' + HEIGHT_MS + 'ms cubic-bezier(.2,.7,.3,1)';
      // force reflow
      void grid.offsetHeight;
      grid.style.maxHeight = to + 'px';
      window.setTimeout(() => {
        grid.style.transition = '';
        grid.style.maxHeight = '';
        grid.style.overflow = '';
      }, HEIGHT_MS + 20);
    };

    const expand = () => {
      if (animating) return; animating = true;
      const before = grid.getBoundingClientRect().height;
      const toShow = items.filter(it => it.classList.contains('hidden-item'));
      toShow.forEach(it => {
        it.classList.remove('hidden-item');
        it.classList.remove('reveal'); // prevent CSS from resetting opacity to 0
        it.style.opacity = '0';
      });
      // measure after height
      const after = grid.getBoundingClientRect().height;
      animateGridHeight(before, after);
      // fade in newly shown items
      window.requestAnimationFrame(() => {
        toShow.forEach(it => { it.style.transition = 'opacity ' + FADE_MS + 'ms ease'; it.style.opacity = '1'; });
      });
      window.setTimeout(() => {
        toShow.forEach(it => { it.style.transition = ''; it.style.opacity = ''; });
        expanded = true; updateButton(); animating = false;
      }, Math.max(HEIGHT_MS, FADE_MS) + 30);
    };

    const collapse = () => {
      if (animating) return; animating = true;
      const before = grid.getBoundingClientRect().height;
      const keep = initialCount();
      const toHide = items.filter((_, idx) => idx >= keep && !items[idx].classList.contains('hidden-item'));
      // fade out items first
      toHide.forEach(it => { it.style.transition = 'opacity ' + FADE_MS + 'ms ease'; it.style.opacity = '0'; });
      // start height animation after short fade
      window.setTimeout(() => {
        toHide.forEach(it => { it.classList.add('hidden-item'); it.style.transition = ''; it.style.opacity = ''; });
        const after = grid.getBoundingClientRect().height;
        animateGridHeight(before, after);
        window.setTimeout(() => { expanded = false; updateButton(); animating = false; }, HEIGHT_MS + 30);
      }, FADE_MS);
    };

    init();
    window.addEventListener('resize', () => { if (!animating) { expanded ? expand() : init(); } });
    btn.addEventListener('click', () => { expanded ? collapse() : expand(); });
  })();

  // Lightbox for work thumbnails
  (function setupLightbox() {
    const thumbs = document.querySelectorAll('#work .card .thumb');
    if (!thumbs.length) return;
    const overlay = document.createElement('div');
    overlay.className = 'lightbox';
    overlay.innerHTML = '<div class="backdrop"></div><img alt=""><button class="close" aria-label="Close" title="Close">&times;</button>';
    document.body.appendChild(overlay);
    const imgEl = overlay.querySelector('img');
    const closeBtn = overlay.querySelector('.close');
    const close = () => overlay.classList.remove('is-open');
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.classList.contains('backdrop') || e.target === closeBtn) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) close();
    });
    thumbs.forEach(t => {
      t.addEventListener('click', () => {
        imgEl.src = t.currentSrc || t.src;
        imgEl.alt = t.alt || 'Thumbnail';
        overlay.classList.add('is-open');
      });
    });
  })();

});

