(() => {
  const state = { token: sessionStorage.getItem('larzyAdminToken') || '', content: null, dirty: false, publishEnabled: false };
  const $ = selector => document.querySelector(selector);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const imageURL = src => !src ? '' : /^https:\/\//i.test(src) ? src : `../${src.replace(/^\//, '')}`;
  const listPath = name => name === 'process' ? state.content.home.process : state.content[name];
  const get = path => path.split('.').reduce((value, part) => value?.[part], state.content);
  const set = (path, value) => {
    const parts = path.split('.'); let node = state.content;
    for (const part of parts.slice(0, -1)) node = node[part] ||= {};
    node[parts.at(-1)] = value;
    markDirty();
  };
  const labelFor = (item, kind) => kind === 'work' ? item.label : kind === 'clients' ? item.handle : kind === 'reviews' ? item.name : item.title;
  const imageFor = (item, kind) => kind === 'work' ? item.src : kind === 'clients' || kind === 'reviews' ? item.avatar : item.image;

  const copyGroups = [
    ['Selected Work', 'home.sections.work', ['eyebrow', 'title', 'accent', 'description']],
    ['Trusted By', 'home.sections.clients', ['eyebrow', 'title', 'accent', 'description']],
    ['Reviews', 'home.sections.reviews', ['eyebrow', 'title', 'accent', 'description']],
    ['Approach', 'home.sections.process', ['eyebrow', 'title', 'accent', 'description']],
    ["Let's Collaborate", 'home.sections.contact', ['eyebrow', 'title', 'accent', 'description', 'availability']],
    ['Portfolio page', 'portfolio', ['eyebrow', 'title', 'accent', 'description', 'contactEyebrow', 'contactTitle', 'contactAccent', 'contactDescription']]
  ];
  const aboutFields = [
    ['Intro eyebrow', 'about.eyebrow'], ['Intro title', 'about.title'], ['Intro accent', 'about.accent'],
    ['Tagline', 'about.tagline'], ['Feature image', 'about.image', 'image'], ['Feature image alt text', 'about.imageAlt'],
    ['Feature caption', 'about.imageCaption'], ['Artist title', 'about.artistTitle'], ['Artist accent', 'about.artistAccent'],
    ['Bio', 'about.sections.0.body', 'long'], ['Philosophy title', 'about.philosophyTitle'],
    ['Philosophy accent', 'about.philosophyAccent'], ['Process paragraph', 'about.sections.1.body', 'long'],
    ['Tools paragraph', 'about.sections.2.body', 'long'], ['Contact title', 'about.contactTitle'],
    ['Contact accent', 'about.contactAccent'], ['Contact paragraph', 'about.contactDescription', 'long']
  ];
  const contactFields = [
    ['Project popup title', 'contact.dialogTitle'], ['Project popup introduction', 'contact.dialogIntro', 'long'],
    ['Discord handle', 'contact.discord'], ['X profile URL', 'contact.xUrl'], ['Brand logo path', 'brand.logo', 'image']
  ];

  function markDirty() { state.dirty = true; $('#save-state').textContent = 'Unsaved changes'; $('#save-state').classList.add('dirty'); }
  function markSaved() { state.dirty = false; $('#save-state').textContent = 'All changes saved'; $('#save-state').classList.remove('dirty'); }
  function toast(message, error = false) {
    const el = $('#toast'); el.textContent = message; el.classList.toggle('error-toast', error); el.classList.add('show');
    clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 5000);
  }
  async function request(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    const response = await fetch(url, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 && url !== '/api/login') signOut();
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
    return data;
  }
  function showEditor() { $('#login-screen').hidden = true; $('#app').hidden = false; }
  function signOut() { state.token = ''; sessionStorage.removeItem('larzyAdminToken'); $('#app').hidden = true; $('#login-screen').hidden = false; }
  async function load() {
    const data = await request('/api/content');
    state.content = data.content; state.publishEnabled = data.publishEnabled;
    $('#btn-publish').disabled = !data.publishEnabled;
    $('#btn-publish').title = data.publishEnabled ? 'Push saved content to GitHub' : 'Git publishing was disabled for this session';
    render(); markSaved(); showEditor();
  }
  function field(label, path, kind = '') {
    const value = get(path) ?? '';
    const id = `field-${path.replace(/[^\w]/g, '-')}`;
    const control = kind === 'long'
      ? `<textarea id="${id}" data-bind="${escape(path)}" rows="4">${escape(value)}</textarea>`
      : `<input id="${id}" data-bind="${escape(path)}" value="${escape(value)}" spellcheck="${kind === 'image' ? 'false' : 'true'}">`;
    const image = kind === 'image' ? `<div class="image-field"><img src="${escape(imageURL(value))}" alt="Current image preview" loading="lazy"><button class="button button-outline" type="button" data-upload-path="${escape(path)}">Upload image</button></div>` : '';
    return `<div class="field ${kind === 'long' ? 'span-all' : ''}"><label for="${id}">${escape(label)}</label>${control}${image}</div>`;
  }
  function renderCopy() {
    $('#copy-fields').innerHTML = copyGroups.map(([title, base, keys]) => `<div class="copy-group"><h3>${escape(title)}</h3><div class="field-grid">${keys.map(key => field(key.replace(/([A-Z])/g, ' $1').replace(/^./, x => x.toUpperCase()), `${base}.${key}`, key === 'description' || key === 'contactDescription' ? 'long' : '')).join('')}</div></div>`).join('');
    $('#about-fields').innerHTML = aboutFields.map(args => field(...args)).join('');
    $('#contact-fields').innerHTML = contactFields.map(args => field(...args)).join('');
  }
  function renderHero() {
    const choices = state.content.work.filter(item => item.src);
    $('#hero-list').innerHTML = state.content.home.heroImages.map((src, index) => {
      const options = choices.map(item => `<option value="${escape(item.src)}" ${item.src === src ? 'selected' : ''}>${escape(item.label || 'Untitled')} / ${escape(item.src.split('/').pop())}</option>`).join('');
      const extra = !choices.some(item => item.src === src) ? `<option value="${escape(src)}" selected>${escape(src || 'Choose artwork')}</option>` : '';
      const column = ['Left', 'Middle', 'Right'][index % 3];
      return `<div class="entry hero-entry" data-list="heroImages" data-index="${index}"><span class="entry-number">${String(index + 1).padStart(2, '0')}</span><img src="${escape(imageURL(src))}" alt="Hero image ${index + 1}" loading="lazy"><label class="field"><span>${column} column / row ${Math.floor(index / 3) + 1}</span><select data-hero-index="${index}">${extra}${options}</select></label>${controls(index, state.content.home.heroImages.length)}</div>`;
    }).join('');
  }
  function controls(index, length) {
    return `<div class="entry-controls"><button type="button" data-action="up" aria-label="Move item ${index + 1} up" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" data-action="down" aria-label="Move item ${index + 1} down" ${index === length - 1 ? 'disabled' : ''}>↓</button><button type="button" data-action="remove" aria-label="Remove item ${index + 1}">×</button></div>`;
  }
  const fieldsByList = {
    work: [['Creator label', 'label'], ['Image path', 'src', 'image'], ['Alt text', 'alt']],
    clients: [['Creator', 'handle'], ['Subscriber label', 'subs'], ['Avatar path', 'avatar', 'image']],
    reviews: [['Reviewer', 'name'], ['Role or channel size', 'role'], ['Avatar path', 'avatar', 'image'], ['Review quote', 'quote', 'long']],
    process: [['Small label', 'label'], ['Step title', 'title'], ['Description', 'body', 'long'], ['Image path', 'image', 'image'], ['Image alt text', 'alt']]
  };
  function renderList(kind) {
    const list = listPath(kind);
    $(`#${kind}-list`).innerHTML = list.map((item, index) => {
      const src = imageFor(item, kind);
      const summary = kind === 'reviews' ? item.quote : kind === 'process' ? item.body : kind === 'clients' ? item.subs : item.src;
      return `<article class="entry" data-list="${kind}" data-index="${index}"><span class="entry-number">${String(index + 1).padStart(2, '0')}</span><img class="entry-image ${kind === 'work' || kind === 'process' ? 'wide' : ''}" src="${escape(imageURL(src))}" alt="${escape(labelFor(item, kind) || 'Image preview')}" loading="lazy"><div class="entry-info"><strong>${escape(labelFor(item, kind) || 'New item')}</strong><span>${escape(summary || 'Add details below')}</span></div>${controls(index, list.length)}<details><summary>Edit details</summary><div class="field-grid">${fieldsByList[kind].map(([label, key, type]) => `<label class="field ${type === 'long' ? 'span-all' : ''}"><span>${escape(label)}</span>${type === 'long' ? `<textarea data-field="${key}" rows="4">${escape(item[key] || '')}</textarea>` : `<input data-field="${key}" value="${escape(item[key] || '')}">`}</label>`).join('')}<div class="entry-detail-actions"><button class="button button-outline" type="button" data-action="upload">Upload / replace image</button></div></div></details></article>`;
    }).join('');
  }
  function render() {
    document.querySelectorAll('#home [data-bind]').forEach(input => { input.value = get(input.dataset.bind) ?? ''; });
    renderHero(); for (const kind of Object.keys(fieldsByList)) renderList(kind); renderCopy();
  }
  function renderOne(kind) { if (kind === 'heroImages') renderHero(); else renderList(kind); }
  function replaceImageReferences(oldPath, newPath) {
    if (!oldPath || oldPath === newPath) return;
    state.content.home.heroImages = state.content.home.heroImages.map(path => path === oldPath ? newPath : path);
    state.content.home.process.forEach(step => { if (step.image === oldPath) step.image = newPath; });
    if (state.content.about.image === oldPath) state.content.about.image = newPath;
    renderHero(); renderList('process'); renderCopy();
  }
  function updateEntry(entry, key, value) {
    const kind = entry.dataset.list, index = Number(entry.dataset.index), item = listPath(kind)[index];
    const oldPath = kind === 'work' && key === 'src' ? item.src : '';
    item[key] = value; markDirty();
    entry.querySelector('.entry-info strong').textContent = labelFor(item, kind) || 'New item';
    entry.querySelector('.entry-info span').textContent = kind === 'reviews' ? item.quote : kind === 'process' ? item.body : kind === 'clients' ? item.subs : item.src;
    if (key === 'src' || key === 'avatar' || key === 'image') entry.querySelector('.entry-image').src = imageURL(value);
    if (oldPath) replaceImageReferences(oldPath, value);
  }
  function changeOrder(kind, index, direction) {
    const list = kind === 'heroImages' ? state.content.home.heroImages : listPath(kind);
    const other = index + direction;
    if (other < 0 || other >= list.length) return;
    [list[index], list[other]] = [list[other], list[index]];
    markDirty(); renderOne(kind);
    $(`#${kind === 'heroImages' ? 'hero' : kind}-list .entry[data-index="${other}"] [data-action="${direction < 0 ? 'down' : 'up'}"]`)?.focus();
  }
  function add(kind) {
    if (kind === 'heroImages') {
      const unused = state.content.work.find(item => item.src && !state.content.home.heroImages.includes(item.src));
      if (!unused) return toast('Add a thumbnail to Work first, or remove another hero image.', true);
      if (state.content.home.heroImages.length >= 30) return toast('The hero wall supports up to 30 images.', true);
      state.content.home.heroImages.push(unused.src);
    } else {
      const defaults = { work: { label: '', src: '', alt: '' }, clients: { handle: '', subs: '', avatar: '' }, reviews: { name: '', role: '', avatar: '', quote: '' }, process: { label: '', title: '', body: '', image: '', alt: '' } };
      listPath(kind).push(defaults[kind]);
    }
    markDirty(); renderOne(kind);
    const entry = $(`#${kind === 'heroImages' ? 'hero' : kind}-list .entry:last-child`);
    entry?.scrollIntoView({ block: 'center', behavior: 'smooth' }); entry?.querySelector('details')?.setAttribute('open', '');
  }
  async function uploadImage(file, path, entry) {
    const form = new FormData(); form.append('file', file);
    const result = await request('/api/upload', { method: 'POST', body: form });
    if (path) {
      set(path, result.path);
      const fieldInput = document.querySelector(`[data-bind="${path}"]`); if (fieldInput) fieldInput.value = result.path;
      const preview = fieldInput?.closest('.field')?.querySelector('img'); if (preview) preview.src = imageURL(result.path);
    } else if (entry) {
      const kind = entry.dataset.list;
      const key = kind === 'work' ? 'src' : kind === 'process' ? 'image' : 'avatar';
      updateEntry(entry, key, result.path);
      entry.querySelector(`[data-field="${key}"]`).value = result.path;
    }
    toast('Image uploaded. Save to use it on the site.');
  }
  function validate() {
    if (state.content.work.some(item => !item.src || !item.label)) return 'Every work item needs an image and creator label.';
    if (state.content.clients.some(item => !item.handle)) return 'Every client needs a creator name.';
    if (state.content.reviews.some(item => !item.name || !item.quote)) return 'Every review needs a name and quote.';
    if (state.content.home.process.some(item => !item.title || !item.image)) return 'Every approach step needs a title and image.';
    if (state.content.home.heroImages.length < 3) return 'Choose at least three hero images.';
    return '';
  }
  async function save() {
    const problem = validate(); if (problem) { toast(problem, true); return false; }
    try {
      await request('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: state.content }) });
      markSaved(); toast('Saved to data/content.json. Refresh the preview to see it.'); return true;
    } catch (error) { toast(error.message, true); return false; }
  }
  async function publish() {
    if (!state.publishEnabled) return;
    if (state.dirty && !(await save())) return;
    $('#btn-publish').disabled = true; $('#save-state').textContent = 'Publishing…';
    try { const result = await request('/api/publish', { method: 'POST' }); toast(result.message); $('#save-state').textContent = 'Published to GitHub'; }
    catch (error) { toast(error.message, true); $('#save-state').textContent = 'Publish needs attention'; }
    finally { $('#btn-publish').disabled = false; }
  }

  $('#login-form').addEventListener('submit', async event => {
    event.preventDefault(); $('#login-error').textContent = '';
    try {
      const result = await request('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: $('#admin-password').value }) });
      state.token = result.token; sessionStorage.setItem('larzyAdminToken', result.token); $('#admin-password').value = ''; await load();
    } catch (error) { $('#login-error').textContent = error.message; }
  });
  $('#btn-save').addEventListener('click', save);
  $('#btn-publish').addEventListener('click', publish);
  $('#btn-logout').addEventListener('click', signOut);
  document.addEventListener('input', event => {
    const input = event.target;
    if (input.dataset.bind) set(input.dataset.bind, input.value);
    if (input.dataset.field && !['src', 'avatar', 'image'].includes(input.dataset.field)) updateEntry(input.closest('.entry'), input.dataset.field, input.value);
  });
  document.addEventListener('change', event => {
    if (event.target.dataset.field && ['src', 'avatar', 'image'].includes(event.target.dataset.field)) updateEntry(event.target.closest('.entry'), event.target.dataset.field, event.target.value);
    if (event.target.dataset.heroIndex != null) {
      const index = Number(event.target.dataset.heroIndex);
      if (state.content.home.heroImages.some((src, position) => position !== index && src === event.target.value)) {
        toast('That artwork is already in the hero wall. Choose a different image.', true); renderHero(); return;
      }
      state.content.home.heroImages[index] = event.target.value; markDirty(); renderHero();
    }
  });
  document.addEventListener('click', async event => {
    const addButton = event.target.closest('[data-add]'); if (addButton) return add(addButton.dataset.add);
    const button = event.target.closest('[data-action], [data-upload-path]'); if (!button) return;
    if (button.dataset.uploadPath || button.dataset.action === 'upload') {
      const picker = document.createElement('input'); picker.type = 'file'; picker.accept = 'image/png,image/jpeg,image/webp';
      picker.onchange = async () => { if (!picker.files?.[0]) return; try { await uploadImage(picker.files[0], button.dataset.uploadPath, button.closest('.entry')); } catch (error) { toast(error.message, true); } };
      picker.click(); return;
    }
    const entry = button.closest('.entry'), kind = entry.dataset.list, index = Number(entry.dataset.index);
    if (button.dataset.action === 'up') changeOrder(kind, index, -1);
    if (button.dataset.action === 'down') changeOrder(kind, index, 1);
    if (button.dataset.action === 'remove') {
      const list = kind === 'heroImages' ? state.content.home.heroImages : listPath(kind);
      list.splice(index, 1); markDirty(); renderOne(kind);
    }
  });
  window.addEventListener('beforeunload', event => { if (state.dirty) { event.preventDefault(); event.returnValue = ''; } });
  if (state.token) load().catch(() => signOut());
})();
