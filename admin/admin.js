(() => {
  const state = {
    token: sessionStorage.getItem('adminToken') || '',
    content: null,
    sortables: {},
    ui: loadUIState()
  };

  const els = {
    app: document.getElementById('app'),
    login: document.getElementById('login-screen'),
    loginForm: document.getElementById('login-form'),
    password: document.getElementById('admin-password'),
    loginError: document.getElementById('login-error'),
    toast: document.getElementById('toast'),
    btnSave: document.getElementById('btn-save'),
    btnPublish: document.getElementById('btn-publish'),
    btnLogout: document.getElementById('btn-logout'),
    btnRefresh: document.getElementById('btn-refresh'),
    panels: document.querySelectorAll('.panel'),
    navButtons: document.querySelectorAll('.nav-btn'),
    workList: document.getElementById('work-list'),
    clientsList: document.getElementById('clients-list'),
    reviewsList: document.getElementById('reviews-list'),
    aboutList: document.getElementById('about-list'),
    homeFields: {
      tag: document.getElementById('home-tag'),
      line1: document.getElementById('home-title-1'),
      line2: document.getElementById('home-title-2'),
      description: document.getElementById('home-description'),
      cta1: document.getElementById('home-cta-1'),
      cta2: document.getElementById('home-cta-2')
    },
    aboutTagline: document.getElementById('about-tagline'),
    add: {
      work: document.getElementById('add-work'),
      workRow: document.getElementById('add-work-row'),
      client: document.getElementById('add-client'),
      review: document.getElementById('add-review'),
      about: document.getElementById('add-about')
    }
  };

  const placeholders = {
    image: 'https://placehold.co/120x120/png',
    avatar: 'https://placehold.co/84x84/png'
  };

  function normalizeSrc(src, fallback) {
    if (!src) return fallback;
    if (/^https?:\/\//i.test(src)) return src;
    return src.startsWith('/') ? src : '/' + src.replace(/^\.?\//, '');
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    if (state.token) {
      showApp();
      loadContent();
    } else {
      showLogin();
    }
  });

  function bindEvents() {
    els.loginForm?.addEventListener('submit', onLogin);
    els.btnSave?.addEventListener('click', saveContent);
    els.btnPublish?.addEventListener('click', publishChanges);
    els.btnLogout?.addEventListener('click', logout);
    els.btnRefresh?.addEventListener('click', loadContent);

    Object.values(els.add).forEach(btn => btn?.addEventListener('click', () => handleAdd(btn.id)));

    els.navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        els.navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const target = document.getElementById(`panel-${btn.dataset.target}`);
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    els.panels.forEach(panel => {
      const toggle = panel.querySelector('.toggle');
      toggle?.addEventListener('click', () => togglePanel(panel));
      applyPanelState(panel);
    });

    bindListEvents('work', els.workList, ['label', 'src', 'alt']);
    bindListEvents('clients', els.clientsList, ['handle', 'subs', 'avatar']);
    bindListEvents('reviews', els.reviewsList, ['name', 'role', 'avatar', 'quote']);
    bindListEvents('about', els.aboutList, ['title', 'body']);

    Object.entries(els.homeFields).forEach(([key, input]) => {
      input?.addEventListener('input', () => {
        ensureContent();
        state.content.home[keyMap(key)] = input.value;
      });
    });

    els.aboutTagline?.addEventListener('input', () => {
      ensureContent();
      state.content.about.tagline = els.aboutTagline.value;
    });
  }

  function keyMap(key) {
    const map = { tag: 'heroTag', line1: 'heroTitleLine1', line2: 'heroTitleLine2', description: 'heroDescription', cta1: 'primaryCta', cta2: 'secondaryCta' };
    return map[key] || key;
  }

  function loadUIState() {
    try { return JSON.parse(localStorage.getItem('admin-ui-state') || '{}'); }
    catch (_) { return {}; }
  }

  function saveUIState() {
    localStorage.setItem('admin-ui-state', JSON.stringify(state.ui));
  }

  function togglePanel(panel) {
    panel.classList.toggle('collapsed');
    const section = panel.dataset.section;
    state.ui[section] = panel.classList.contains('collapsed');
    saveUIState();
  }

  function applyPanelState(panel) {
    const section = panel.dataset.section;
    if (state.ui[section]) panel.classList.add('collapsed');
  }

  function showApp() {
    els.login.classList.add('hidden');
    els.app.classList.remove('hidden');
    els.loginError.textContent = '';
  }

  function showLogin() {
    els.login.classList.remove('hidden');
    els.app.classList.add('hidden');
  }

  function normalizeContent(raw) {
    const content = raw || {};
    content.home = content.home || {};
    content.about = content.about || { sections: [] };
    content.work = Array.isArray(content.work) ? content.work : [];
    content.clients = Array.isArray(content.clients) ? content.clients : [];
    content.reviews = Array.isArray(content.reviews) ? content.reviews : [];
    if (!Array.isArray(content.about.sections)) content.about.sections = [];
    return content;
  }

  async function onLogin(e) {
    e.preventDefault();
    const password = els.password?.value?.trim();
    if (!password) return;
    try {
      const res = await api('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      state.token = res.token;
      sessionStorage.setItem('adminToken', state.token);
      showApp();
      await loadContent();
      toast('Logged in');
    } catch (err) {
      els.loginError.textContent = err.message || 'Login failed';
    }
  }

  function logout() {
    state.token = '';
    sessionStorage.removeItem('adminToken');
    showLogin();
  }

  async function loadContent() {
    try {
      const res = await api('/api/content', { method: 'GET' });
      state.content = normalizeContent(res.content || res);
      renderAll();
      toast('Content loaded');
    } catch (err) {
      toast(err.message || 'Failed to load content', true);
    }
  }

  async function saveContent() {
    try {
      ensureContent();
      await api('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: state.content, clients: state.content.clients })
      });
      toast('Saved!');
    } catch (err) {
      toast(err.message || 'Save failed', true);
    }
  }

  async function publishChanges() {
    try {
      await api('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Update content' })
      });
      await loadContent();
      toast('Publish request sent');
    } catch (err) {
      toast(err.message || 'Publish failed', true);
    }
  }

  function ensureContent() {
    if (!state.content) state.content = normalizeContent({});
  }

  function renderAll() {
    ensureContent();
    renderHome();
    renderAbout();
    renderList('work', els.workList);
    renderList('clients', els.clientsList);
    renderList('reviews', els.reviewsList);
    renderList('about', els.aboutList);
  }

  function renderHome() {
    const home = state.content.home || {};
    if (els.homeFields.tag) els.homeFields.tag.value = home.heroTag || '';
    if (els.homeFields.line1) els.homeFields.line1.value = home.heroTitleLine1 || '';
    if (els.homeFields.line2) els.homeFields.line2.value = home.heroTitleLine2 || '';
    if (els.homeFields.description) els.homeFields.description.value = home.heroDescription || '';
    if (els.homeFields.cta1) els.homeFields.cta1.value = home.primaryCta || '';
    if (els.homeFields.cta2) els.homeFields.cta2.value = home.secondaryCta || '';
  }

  function renderAbout() {
    const about = state.content.about || {};
    if (els.aboutTagline) els.aboutTagline.value = about.tagline || '';
  }

  function renderList(type, container) {
    if (!container) return;
    container.innerHTML = '';
    const list = type === 'about' ? (state.content.about?.sections || []) : (state.content[type] || []);
    list.forEach((item, idx) => {
      const card = buildCard(type, item, idx);
      container.appendChild(card);
    });
    makeSortable(type, container);
  }

  function buildCard(type, item, idx) {
    const hasImage = type === 'work' || type === 'clients' || type === 'reviews';
    const previewSrc = type === 'clients' || type === 'reviews'
      ? normalizeSrc(item.avatar, placeholders.avatar)
      : normalizeSrc(item.src, placeholders.image);

    if (type === 'work') {
      const card = document.createElement('div');
      card.className = 'item-card work-card';
      card.dataset.index = idx;
      card.innerHTML = `
        <div class="drag-handle" title="Drag to reorder">⋮⋮</div>
        <div class="card-inner">
          <button class="card-toggle" type="button" data-action="toggle-details">
            <img class="thumb" src="${previewSrc}" alt="preview" loading="lazy" />
            <div class="work-meta">
              <div class="label-line">${escapeHtml(item.label || 'Untitled')}</div>
              <div class="alt-line">${escapeHtml(item.alt || 'No alt text')}</div>
            </div>
            <span class="chevron">▾</span>
          </button>
          <div class="work-details">
            <label class="field"><span>Label</span><input data-field="label" type="text" value="${escapeAttr(item.label || '')}" /></label>
            <label class="field"><span>Alt Text</span><input data-field="alt" type="text" value="${escapeAttr(item.alt || '')}" /></label>
            <label class="field"><span>Image URL</span><input data-field="src" type="text" value="${escapeAttr(item.src || '')}" /></label>
            <div class="item-actions">
              <input type="file" accept="image/png,image/jpeg" class="file-input" hidden />
              <button class="btn" type="button" data-action="upload">Replace Image</button>
              <button class="btn ghost" type="button" data-action="remove">Remove</button>
            </div>
          </div>
        </div>
      `;
      return card;
    }

    const card = document.createElement('div');
    card.className = 'item-card';
    card.dataset.index = idx;
    const fields = [];
    if (type === 'clients') {
      fields.push(field('Handle', 'handle', item.handle));
      fields.push(field('Subscribers', 'subs', item.subs));
      fields.push(field('Avatar URL', 'avatar', item.avatar));
    } else if (type === 'reviews') {
      fields.push(field('Name', 'name', item.name));
      fields.push(field('Role', 'role', item.role));
      fields.push(field('Avatar URL', 'avatar', item.avatar));
      fields.push(field('Quote', 'quote', item.quote, true));
    } else if (type === 'about') {
      fields.push(field('Title', 'title', item.title));
      fields.push(field('Body', 'body', item.body, true));
    }

    card.innerHTML = `
      <div class="drag-handle" title="Drag to reorder">⋮⋮</div>
      <div class="item-fields">
        ${hasImage ? `<img class="thumb" src="${previewSrc}" alt="preview" loading="lazy" />` : ''}
        ${fields.join('')}
        <div class="item-actions">
          ${hasImage ? `<input type="file" accept="image/png,image/jpeg" class="file-input" hidden />
          <button class="btn" type="button" data-action="upload">Replace Image</button>` : ''}
          <button class="btn ghost" type="button" data-action="remove">Remove</button>
        </div>
      </div>
    `;
    return card;
  }

  function field(label, name, value, multiline = false) {
    if (multiline) {
      return `<label class="field"><span>${label}</span><textarea data-field="${name}" rows="3">${escapeHtml(value || '')}</textarea></label>`;
    }
    return `<label class="field"><span>${label}</span><input data-field="${name}" type="text" value="${escapeAttr(value || '')}" /></label>`;
  }

  function bindListEvents(type, container) {
    if (!container) return;
    container.addEventListener('input', (e) => {
      const target = e.target;
      const fieldName = target.dataset.field;
      if (!fieldName) return;
      const card = target.closest('.item-card');
      if (!card) return;
      const idx = Number(card.dataset.index);
      updateItem(type, idx, fieldName, target.value);
    });

    container.addEventListener('click', (e) => {
      const toggle = e.target.closest('[data-action="toggle-details"]');
      if (toggle && type === 'work') {
        const card = toggle.closest('.work-card');
        if (card) card.classList.toggle('open');
        return;
      }
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const card = btn.closest('.item-card');
      const idx = Number(card?.dataset.index);
      if (btn.dataset.action === 'remove') {
        const list = type === 'about' ? state.content.about.sections : state.content[type];
        list.splice(idx, 1);
        renderList(type, container);
      } else if (btn.dataset.action === 'upload') {
        card.querySelector('.file-input')?.click();
      }
    });

    container.addEventListener('change', async (e) => {
      if (!(e.target instanceof HTMLInputElement) || e.target.type !== 'file') return;
      const card = e.target.closest('.item-card');
      const idx = Number(card?.dataset.index);
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      await uploadAndSet(type, idx, file, container);
    });
  }

  async function uploadAndSet(type, idx, file, container) {
    try {
      const res = await uploadFile(file);
      const list = state.content[type];
      if (!list || !list[idx]) return;
      if (type === 'work') list[idx].src = res.path;
      else if (type === 'clients' || type === 'reviews') list[idx].avatar = res.path;
      renderList(type, container);
      toast('Image updated');
    } catch (err) {
      toast(err.message || 'Upload failed', true);
    }
  }

  function updateItem(type, idx, fieldName, value) {
    ensureContent();
    const list = type === 'about' ? state.content.about.sections : state.content[type];
    if (!list || !list[idx]) return;
    list[idx][fieldName] = value;
  }

  function handleAdd(id) {
    ensureContent();
    const map = {
      'add-work': () => ({ src: '', label: '', alt: '' }),
      'add-work-row': () => ({ src: '', label: '', alt: '' }),
      'add-client': () => ({ handle: '', subs: '', avatar: '' }),
      'add-review': () => ({ name: '', role: '', avatar: '', quote: '' }),
      'add-about': () => ({ title: '', body: '' })
    };
    const key = id.replace('add-', '');
    const builder = map[id];
    if (!builder) return;
    if (id === 'add-work-row') {
      state.content.work.push(builder(), builder(), builder());
    } else if (key === 'about') {
      state.content.about.sections.push(builder());
    } else {
      state.content[key].push(builder());
    }
    const containerId = key === 'work-row' ? 'work-list' : `${key}-list`;
    const container = document.getElementById(containerId);
    renderList(key === 'work-row' ? 'work' : key, container);
  }

  function makeSortable(type, el) {
    if (!window.Sortable || !el) return;
    if (state.sortables[type]) state.sortables[type].destroy();
    state.sortables[type] = new Sortable(el, {
      handle: '.drag-handle',
      animation: 140,
      onEnd: (evt) => {
        const list = type === 'about' ? state.content.about.sections : state.content[type];
        if (!list) return;
        const [moved] = list.splice(evt.oldIndex, 1);
        list.splice(evt.newIndex, 0, moved);
        renderList(type, el);
      }
    });
  }

  async function uploadFile(file) {
    if (!state.token) throw new Error('Login required before uploading');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${state.token}` },
      body: fd
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  }

  async function api(path, options = {}) {
    const headers = options.headers || {};
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    const res = await fetch(path, { ...options, headers });
    if (res.status === 401) {
      logout();
      throw new Error('Please login again');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  function toast(message, isError = false) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.style.borderColor = isError ? '#ff6b6b' : 'var(--border)';
    els.toast.classList.add('show');
    clearTimeout(els.toast._timer);
    els.toast._timer = setTimeout(() => els.toast.classList.remove('show'), 2600);
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
  }
  function escapeAttr(str) { return escapeHtml(str); }
})();
