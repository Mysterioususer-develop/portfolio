/* Shared, progressively enhanced interactions for Larzy's portfolio. */
document.documentElement.classList.add('js');
document.addEventListener('DOMContentLoaded', async () => {
  if ('BroadcastChannel' in window && /^(?:localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    const previewChannel = new BroadcastChannel('larzy-preview');
    previewChannel.onmessage = event => { if (event.data === 'content-saved') location.reload(); };
  }
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  const menuButton = document.querySelector('.menu-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  const closeMenu = () => { if (!menuButton || !mobileNav) return; mobileNav.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Open menu'); };
  menuButton?.addEventListener('click', () => {
    const open = mobileNav.hidden;
    mobileNav.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  mobileNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

  const projectDialog = document.createElement('dialog');
  projectDialog.id = 'project-dialog';
  projectDialog.className = 'project-dialog';
  projectDialog.setAttribute('aria-labelledby', 'project-title');
  projectDialog.innerHTML = `
    <div class="project-dialog-head"><div><p class="eyebrow">Let's collaborate</p><h2 id="project-title">Start a project<span class="accent">.</span></h2></div><button class="dialog-close" type="button" aria-label="Close project brief">×</button></div>
    <p class="dialog-intro">Tell me about your channel and what you're making. I'll email your brief when you submit.</p>
    <form id="brief-form" class="form-grid">
      <div class="field"><label for="channel">YouTube channel <span aria-hidden="true">*</span></label><input id="channel" name="channel" placeholder="Channel name or URL" required maxlength="160"></div>
      <div class="field"><label for="channel-size">Channel size <span aria-hidden="true">*</span></label><select id="channel-size" name="channelSize" required><option value="">Select a range</option><option>Under 10K subscribers</option><option>10K–100K subscribers</option><option>100K–1M subscribers</option><option>1M+ subscribers</option></select></div>
      <div class="field"><label for="handle">Discord or X handle <span aria-hidden="true">*</span></label><input id="handle" name="handle" placeholder="@yourhandle" required maxlength="80"></div>
      <div class="field"><label for="deadline">Deadline</label><input id="deadline" name="deadline" placeholder="When do you need it?" maxlength="80"></div>
      <div class="field span-2"><label for="details">Project details <span aria-hidden="true">*</span></label><textarea id="details" name="details" rows="4" placeholder="Video idea, style, references, and anything else I should know…" required maxlength="3000"></textarea></div>
      <div class="field brief-honeypot" aria-hidden="true"><label for="brief-website">Website</label><input id="brief-website" name="website" tabindex="-1" autocomplete="off"></div>
      <div class="form-actions"><button class="button button-light" type="submit">Submit project brief ↗</button><button class="text-link reset-button" type="reset">Clear form</button></div>
      <p class="form-status span-2" id="form-status" role="status" aria-live="polite">Your brief will be emailed to Larzy when you submit.</p>
    </form>
    <div class="dialog-contact"><span>Or reach out directly:</span><a id="discord-contact" href="https://discordapp.com/users/1025435990506090548" target="_blank" rel="noopener noreferrer">Discord ↗</a><a href="https://x.com/larzyfx" target="_blank" rel="noopener noreferrer">X @larzyfx ↗</a></div>`;
  document.body.append(projectDialog);
  const openProject = () => { closeMenu(); if (!projectDialog.open) projectDialog.showModal(); projectDialog.querySelector('#channel').focus(); };
  document.querySelectorAll('a[href="contact.html"]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); openProject(); }));
  projectDialog.querySelector('.dialog-close').addEventListener('click', () => projectDialog.close());
  projectDialog.addEventListener('click', event => { if (event.target === projectDialog) projectDialog.close(); });
  if (new URLSearchParams(location.search).has('project')) openProject();

  function renderHeroWall(items, selected) {
    const columns = [...document.querySelectorAll('.hero-art-column')];
    if (!columns.length) return;
    if (items?.length) {
      const bySource = new Map(items.filter(item => item.src).map(item => [item.src, item]));
      const chosen = Array.isArray(selected) && selected.length ? selected.map(src => bySource.get(src) || { src, label: 'Larzy' }) : items;
      const unique = [...new Map(chosen.filter(item => item.src).map(item => [item.src, item])).values()].slice(0, 30);
      columns.forEach((column, col) => {
        column.replaceChildren(...unique.filter((_, i) => i % 3 === col).map(item => {
          const image = document.createElement('img'); image.src = item.src;
          image.alt = `Minecraft thumbnail artwork for ${item.label || 'Larzy'}`;
          image.width = 1920; image.height = 1080; image.loading = 'lazy'; image.decoding = 'async'; return image;
        }));
      });
    }
    columns.forEach(column => [...column.children].forEach(image => {
      const duplicate = image.cloneNode(true); duplicate.alt = ''; duplicate.setAttribute('aria-hidden', 'true');
      duplicate.removeAttribute('fetchpriority'); column.append(duplicate);
    }));
  }

  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: .08 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  } else document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));

  let content;
  try {
    const response = await fetch('data/content.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Content unavailable');
    content = await response.json();
  } catch (_) { content = null; }
  if (content) {
    const heroText = document.querySelector('[data-content="heroDescription"]');
    if (heroText && content.home?.heroDescription) heroText.textContent = content.home.heroDescription;
    const aboutTagline = document.querySelector('[data-content="aboutTagline"]');
    if (aboutTagline && content.about?.tagline) aboutTagline.textContent = content.about.tagline;
    document.querySelectorAll('[data-about]').forEach(el => {
      const section = content.about?.sections?.find(item => item.title === el.dataset.about);
      if (section?.body) el.textContent = section.body;
    });
    applyContent(content);
    renderWork(content.work || []);
    renderHeroWall(content.work || [], content.home?.heroImages);
    renderClients(content.clients || []);
    renderReviews(content.reviews || []);
    renderProcess(content.home?.process);
  } else renderHeroWall();

  function assetPath(path) { return typeof path === 'string' && !/^\s*(?:javascript:|data:)/i.test(path) ? path : ''; }
  function applyContent(data) {
    const setText = (selector, value) => { const el = document.querySelector(selector); if (el && typeof value === 'string') el.textContent = value; };
    const setImage = (selector, src, alt) => { const el = document.querySelector(selector); if (el && src) { el.src = assetPath(src); if (typeof alt === 'string') el.alt = alt; } };
    const setHeading = (selector, lead, accent, lineBreak = false) => {
      const el = document.querySelector(selector); if (!el || !lead || !accent) return;
      const em = document.createElement('em'); em.textContent = accent;
      el.replaceChildren(document.createTextNode(lead), lineBreak ? document.createElement('br') : document.createTextNode(' '), em);
    };
    const home = data.home || {};
    setText('.hero .eyebrow', home.heroTag);
    if (document.body.dataset.page === 'home' && home.heroTitleLine1) {
      const h1 = document.querySelector('.hero h1');
      if (h1) {
        const em = document.createElement('em'); em.textContent = home.heroTitleAccent || 'Attract';
        const dot = document.createElement('span'); dot.className = 'accent'; dot.textContent = '.';
        h1.replaceChildren(document.createTextNode(home.heroTitleLine1), document.createElement('br'), document.createTextNode(`${home.heroTitleLine2 || 'That'} `), em, document.createElement('br'), document.createTextNode(home.heroTitleLine3 || 'Viewers'), dot);
      }
    }
    setText('.hero-description', home.heroDescription);
    setText('.hero-actions .button', home.primaryCta ? `${home.primaryCta} ↗` : null);
    setText('.hero-actions .text-link', home.secondaryCta ? `${home.secondaryCta} ↗` : null);
    for (const [key, selector] of Object.entries({ work: '.work-section', clients: '.clients-section', reviews: '.reviews-section', process: '.process-section', contact: 'body[data-page="home"] .contact-section' })) {
      const section = home.sections?.[key]; if (!section) continue;
      setText(`${selector} .eyebrow`, section.eyebrow);
      setHeading(`${selector} h2`, section.title, section.accent, key === 'contact');
      setText(key === 'contact' ? `${selector} .contact-bottom > p` : `${selector} .section-heading > p`, section.description);
      if (key === 'contact' && section.availability) {
        const availability = document.querySelector(`${selector} .availability`);
        if (availability) { const dot = document.createElement('span'); dot.className = 'status-dot'; availability.replaceChildren(dot, document.createTextNode(` ${section.availability}`)); }
      }
    }
    const about = data.about || {};
    setText('.about-section + .philosophy-section [data-about="Process"]', about.sections?.find(x => x.title === 'Process')?.body);
    setText('body[data-page="about"] .page-intro .eyebrow', about.eyebrow);
    setHeading('body[data-page="about"] .page-intro h1', about.title, about.accent, true);
    setText('[data-content="aboutTagline"]', about.tagline);
    setImage('.about-image img', about.image, about.imageAlt);
    setText('.about-image figcaption', about.imageCaption);
    setHeading('.about-copy h2', about.artistTitle, about.artistAccent, true);
    setHeading('.philosophy-section h2', about.philosophyTitle, about.philosophyAccent);
    setHeading('body[data-page="about"] .contact-section h2', about.contactTitle, about.contactAccent, true);
    setText('body[data-page="about"] .contact-bottom > p', about.contactDescription);
    const portfolio = data.portfolio || {};
    setText('body[data-page="portfolio"] .page-intro .eyebrow', portfolio.eyebrow);
    setHeading('body[data-page="portfolio"] .page-intro h1', portfolio.title, portfolio.accent, true);
    setText('body[data-page="portfolio"] .intro-bottom > p', portfolio.description);
    setText('body[data-page="portfolio"] .contact-section .eyebrow', portfolio.contactEyebrow);
    setHeading('body[data-page="portfolio"] .contact-section h2', portfolio.contactTitle, portfolio.contactAccent, true);
    setText('body[data-page="portfolio"] .contact-bottom > p', portfolio.contactDescription);
    const contact = data.contact || {};
    if (contact.dialogTitle) {
      const title = projectDialog.querySelector('#project-title');
      const dot = document.createElement('span'); dot.className = 'accent'; dot.textContent = '.';
      title.replaceChildren(document.createTextNode(contact.dialogTitle.replace(/\.$/, '')), dot);
    }
    setText('.dialog-intro', contact.dialogIntro);
    const discordUrl = /^https:\/\/(?:discordapp|discord)\.com\/users\/\d+\/?$/.test(contact.discordUrl || '') ? contact.discordUrl : 'https://discordapp.com/users/1025435990506090548';
    projectDialog.querySelector('#discord-contact').href = discordUrl;
    const xUrl = /^https:\/\/x\.com\/[\w]+\/?$/.test(contact.xUrl || '') ? contact.xUrl : 'https://x.com/larzyfx';
    document.querySelectorAll('a[href="https://x.com/larzyfx"]').forEach(a => { a.href = xUrl; });
    const xContact = projectDialog.querySelector('.dialog-contact a[href^="https://x.com/"]');
    if (xContact) xContact.textContent = `X @${xUrl.split('/').filter(Boolean).at(-1)} ↗`;
    const logo = assetPath(data.brand?.logo);
    if (logo) { document.querySelectorAll('.brand img').forEach(img => { img.src = logo; }); const icon = document.querySelector('link[rel="icon"]'); if (icon) icon.href = logo; }
  }
  function renderProcess(steps) {
    const list = document.querySelector('.process-list'); if (!list || !Array.isArray(steps)) return;
    list.replaceChildren(...steps.map(step => {
      const li = document.createElement('li'), copy = document.createElement('div'), label = document.createElement('span'), title = document.createElement('h3'), body = document.createElement('p'), img = document.createElement('img');
      const hasConversation = Array.isArray(step.conversation);
      const showImage = !hasConversation || (step.showImage !== false && !!step.image);
      copy.className = 'process-copy'; label.textContent = step.label || ''; title.textContent = step.title || ''; body.textContent = step.body || '';
      if (showImage) img.src = assetPath(step.image);
      img.alt = step.alt || `Minecraft artwork for ${step.title || 'the process'}`; img.width = 1920; img.height = 1080; img.loading = 'lazy';
      copy.append(label, title, body);
      if (hasConversation) {
        const demo = document.createElement('div');
        demo.className = `brief-demo${showImage ? '' : ' brief-demo-no-image'}`;
        demo.setAttribute('role', 'group');
        demo.setAttribute('aria-label', 'Example project brief conversation');
        demo.innerHTML = '<div class="brief-demo-header"><span>Example conversation</span><span>Brief / 01</span></div>';
        let delay = .12;
        step.conversation.forEach((line, index) => {
          if (index) delay += .8;
          if (line.speaker === 'Larzy' && index && step.conversation[index - 1]?.speaker !== 'Larzy') {
            const typing = document.createElement('div');
            typing.className = 'brief-typing'; typing.setAttribute('aria-hidden', 'true');
            typing.style.setProperty('--brief-typing-delay', `${delay - .35}s`);
            typing.innerHTML = '<i></i><i></i><i></i>';
            demo.append(typing);
            delay += .65;
          }
          const message = document.createElement('div');
          message.className = `brief-message brief-message-${line.speaker === 'Larzy' ? 'larzy' : 'creator'}`;
          message.style.setProperty('--brief-delay', `${delay}s`);
          const speaker = document.createElement('span'); speaker.className = 'brief-speaker'; speaker.textContent = line.speaker;
          const text = document.createElement('p'); text.textContent = line.text || '';
          message.append(speaker, text);
          if (showImage && index === step.conversation.length - 1) {
            const attachment = document.createElement('figure'); attachment.className = 'brief-attachment';
            if (step.conversationCaption) {
              const caption = document.createElement('figcaption'); caption.textContent = step.conversationCaption;
              attachment.append(caption);
            }
            attachment.append(img); message.append(attachment);
          }
          demo.append(message);
        });
        li.append(copy, demo);
      } else li.append(copy, img);
      return li;
    }));
    const demo = list.querySelector('.brief-demo');
    if (demo && !reducedMotion.matches && 'IntersectionObserver' in window) {
      demo.dataset.animate = 'true';
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) { demo.classList.add('is-playing'); observer.disconnect(); }
      }, { threshold: .25 });
      observer.observe(demo);
    }
  }
  function renderWork(items) {
    const grid = document.getElementById('work-grid');
    if (!grid) return;
    grid.replaceChildren(...items.map((item, index) => {
      const article = document.createElement('article'); article.className = 'work-card';
      const button = document.createElement('button'); button.className = 'work-open'; button.type = 'button';
      const creator = item.label || 'Larzy'; button.setAttribute('aria-label', `View thumbnail for ${creator}`);
      const img = document.createElement('img'); img.src = assetPath(item.src); img.alt = item.alt && !/^Minecraft thumbnail \d+$/i.test(item.alt) ? item.alt : `Minecraft thumbnail artwork for ${creator}`;
      img.width = 1920; img.height = 1080; img.loading = index < 2 ? 'eager' : 'lazy'; img.decoding = 'async';
      button.append(img);
      const meta = document.createElement('div'); meta.className = 'work-meta';
      const name = document.createElement('span'); name.textContent = `${String(index + 1).padStart(2, '0')} / ${creator}`;
      const arrow = document.createElement('span'); arrow.textContent = '↗'; meta.append(name, arrow);
      article.append(button, meta); return article;
    }));
    const count = document.getElementById('work-count'); if (count) count.textContent = items.length;
    const showMore = document.getElementById('show-more');
    if (showMore) {
      const limit = Number(grid.dataset.limit) || 9;
      let expanded = false;
      const update = () => { grid.querySelectorAll('.work-card').forEach((card, i) => { card.hidden = !expanded && i >= limit; }); showMore.hidden = items.length <= limit; showMore.setAttribute('aria-expanded', String(expanded)); showMore.textContent = expanded ? 'Show less work ↑' : 'Show more work ↓'; };
      showMore.addEventListener('click', () => { expanded = !expanded; update(); }); update();
    }
  }
  function renderClients(items) {
    const grid = document.getElementById('clients-grid'); if (!grid) return;
    grid.replaceChildren(...items.map(item => {
      const card = document.createElement('article'); card.className = 'client-card';
      const image = document.createElement('img'); image.src = assetPath(item.avatar); image.alt = ''; image.width = 56; image.height = 56; image.loading = 'lazy'; image.decoding = 'async';
      const text = document.createElement('div'); const name = document.createElement('strong'); name.textContent = item.handle || 'Creator'; const subs = document.createElement('span'); subs.textContent = item.subs || ''; text.append(name, subs); card.append(image, text); return card;
    }));
    const more = document.getElementById('clients-more');
    if (!more) return;
    let expanded = false;
    const update = () => {
      const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length || 1;
      const visible = columns * 3;
      [...grid.children].forEach((card, index) => { card.hidden = !expanded && index >= visible; });
      more.hidden = items.length <= visible;
      more.setAttribute('aria-expanded', String(expanded));
      more.textContent = expanded ? 'Show fewer creators ↑' : 'Show more creators ↓';
    };
    more.addEventListener('click', () => { expanded = !expanded; update(); });
    window.addEventListener('resize', update); update();
  }
  function renderReviews(items) {
    const track = document.getElementById('reviews-track'); if (!track) return;
    if (!items.length) { track.replaceChildren(); const controls = document.querySelector('.review-controls'); if (controls) controls.hidden = true; return; }
    track.replaceChildren(...items.map(item => {
      const quote = document.createElement('blockquote'); quote.className = 'review-card';
      if ((item.quote || '').length > 220) quote.classList.add('review-card-long');
      const body = document.createElement('p'); body.textContent = `“${String(item.quote || '').replace(/^[“"]|[”"]$/g, '')}”`;
      const author = document.createElement('div'); author.className = 'review-author';
      if (item.avatar) { const image = document.createElement('img'); image.src = assetPath(item.avatar); image.alt = ''; image.width = 44; image.height = 44; author.append(image); }
      const byline = document.createElement('div'); const name = document.createElement('strong'); name.textContent = item.name || 'Client'; const role = document.createElement('span'); role.textContent = item.role || ''; byline.append(name, role); author.append(byline); quote.append(body, author); return quote;
    }));
    const originals = [...track.children];
    originals.forEach(card => { const duplicate = card.cloneNode(true); duplicate.setAttribute('aria-hidden', 'true'); track.append(duplicate); });
    const count = document.getElementById('review-count');
    const step = () => originals[0].offsetWidth + 16;
    const loopWidth = () => step() * originals.length;
    const updateCount = () => { const index = Math.round((track.scrollLeft % loopWidth()) / step()) % originals.length; if (count) count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`; };
    let paused = false, dragging = false, pauseUntil = 0, lastFrame = 0, startX = 0, startScroll = 0;
    const go = direction => {
      if (direction < 0 && track.scrollLeft < step()) track.scrollLeft += loopWidth();
      pauseUntil = performance.now() + 3500;
      track.scrollBy({ left: direction * step(), behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    };
    document.getElementById('reviews-prev')?.addEventListener('click', () => go(-1));
    document.getElementById('reviews-next')?.addEventListener('click', () => go(1));
    track.addEventListener('pointerenter', () => { paused = true; });
    track.addEventListener('pointerleave', () => { paused = false; dragging = false; });
    track.addEventListener('focusin', () => { paused = true; });
    track.addEventListener('focusout', () => { paused = false; });
    track.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'mouse') return;
      dragging = true; startX = event.clientX; startScroll = track.scrollLeft;
      track.setPointerCapture(event.pointerId); track.classList.add('is-dragging');
    });
    track.addEventListener('pointermove', event => { if (dragging) track.scrollLeft = startScroll - (event.clientX - startX); });
    const stopDrag = () => { dragging = false; track.classList.remove('is-dragging'); pauseUntil = performance.now() + 3500; };
    track.addEventListener('pointerup', stopDrag); track.addEventListener('pointercancel', stopDrag);
    track.addEventListener('scroll', updateCount, { passive: true }); updateCount();
    const tick = now => {
      if (track.isConnected) {
        if (!reducedMotion.matches && !document.hidden && !paused && !dragging && now > pauseUntil && lastFrame) track.scrollLeft += Math.min(now - lastFrame, 50) * .032;
        if (track.scrollLeft >= loopWidth()) track.scrollLeft -= loopWidth();
        lastFrame = now; requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }

  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    lightbox.innerHTML = '<button class="lightbox-close" type="button" aria-label="Close artwork preview">×</button><button class="lightbox-arrow lightbox-prev" type="button" aria-label="Previous artwork">←</button><figure><img alt=""><figcaption></figcaption></figure><button class="lightbox-arrow lightbox-next" type="button" aria-label="Next artwork">→</button>';
    const grid = document.getElementById('work-grid'); let current = 0;
    const workButtons = () => [...grid.querySelectorAll('.work-open')];
    const showArtwork = () => {
      const source = workButtons()[current]; if (!source) return;
      const original = source.querySelector('img'); const preview = lightbox.querySelector('img');
      preview.src = original.currentSrc || original.src; preview.alt = original.alt;
      lightbox.querySelector('figcaption').textContent = `${current + 1} / ${workButtons().length} · ${source.nextElementSibling?.firstElementChild?.textContent || ''}`;
    };
    const move = direction => { current = (current + direction + workButtons().length) % workButtons().length; showArtwork(); };
    grid?.addEventListener('click', event => {
      const button = event.target.closest('.work-open'); if (!button || !lightbox.showModal) return;
      current = workButtons().indexOf(button); showArtwork(); lightbox.showModal(); lightbox.querySelector('.lightbox-close').focus();
    });
    lightbox.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
    lightbox.querySelector('.lightbox-prev').addEventListener('click', () => move(-1));
    lightbox.querySelector('.lightbox-next').addEventListener('click', () => move(1));
    lightbox.addEventListener('click', event => { if (event.target === lightbox) lightbox.close(); });
    lightbox.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
    });
  }

  const status = document.getElementById('form-status');
  const form = document.getElementById('brief-form');
  form?.addEventListener('submit', async event => {
    event.preventDefault(); if (!form.reportValidity()) return;
    const submitButton = form.querySelector('button[type="submit"]');
    const values = Object.fromEntries(new FormData(form));
    submitButton.disabled = true;
    status.textContent = 'Sending your brief…';
    try {
      const response = await fetch('/api/brief', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Your brief could not be sent. Please try again.');
      form.reset();
      status.textContent = 'Thanks — your brief was sent. I’ll be in touch using the handle you provided.';
    } catch (error) {
      status.textContent = error instanceof TypeError ? 'Could not reach the form service. Please try again or use Discord or X below.' : error.message;
    } finally { submitButton.disabled = false; }
  });
  form?.querySelector('button[type="reset"]')?.addEventListener('click', () => { status.textContent = 'Your brief will be emailed to Larzy when you submit.'; });
});
