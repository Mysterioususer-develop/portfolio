(() => {
  const state = { token: sessionStorage.getItem('larzyAdminToken') || '', content: null, dirty: false };
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
    ['Discord profile URL', 'contact.discordUrl'], ['X profile URL', 'contact.xUrl'], ['Brand logo path', 'brand.logo', 'image']
  ];

  function markDirty() { state.dirty = true; $('#save-state').textContent = 'Unsaved changes'; $('#save-state').classList.add('dirty'); }
  function markSaved() { state.dirty = false; $('#save-state').textContent = 'All changes saved'; $('#save-state').classList.remove('dirty'); }
  function toast(message, error = false) {
    const el = $('#toast'); el.textContent = message; el.classList.toggle('error-toast', error); el.classList.add('show');
    clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), error ? 12000 : 7000);
  }
  async function request(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    let response;
    try { response = await fetch(url, { ...options, headers }); }
    catch { throw new Error('The local editor is offline. Start it with start-admin.bat, then reload this page.'); }
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 && url !== '/api/login') signOut();
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
    return data;
  }
  function showEditor() { $('#login-screen').hidden = true; $('#app').hidden = false; }
  function signOut() { state.token = ''; sessionStorage.removeItem('larzyAdminToken'); $('#app').hidden = true; $('#login-screen').hidden = false; }
  async function load() {
    const data = await request('/api/content');
    state.content = data.content;
    $('#btn-publish').disabled = false;
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
      return `<div class="entry hero-entry" data-list="heroImages" data-index="${index}">${sortMarker('heroImages', index)}<img src="${escape(imageURL(src))}" alt="Hero image ${index + 1}" data-drag-target draggable="false" loading="lazy"><label class="field"><span>${column} column / row ${Math.floor(index / 3) + 1}</span><select data-hero-index="${index}">${extra}${options}</select></label>${controls(index, state.content.home.heroImages.length)}</div>`;
    }).join('');
  }
  function sortMarker(kind, index) {
    const name = kind === 'work' ? 'thumbnail' : 'hero image';
    return `<div class="entry-sort"><button type="button" class="drag-handle" data-drag-target aria-label="Reorder ${name} ${index + 1}; press Up or Down to move" title="Drag to reorder"><span aria-hidden="true">⋮⋮</span></button><span class="entry-number">${String(index + 1).padStart(2, '0')}</span></div>`;
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
  function conversationEditor(item) {
    if (!Array.isArray(item.conversation)) return '';
    return `<div class="conversation-editor"><div class="conversation-heading"><div><h4>Brief conversation</h4><p>Messages play in this order. You can hide the artwork attached to the final message.</p></div><button class="button button-outline" type="button" data-message-action="add" ${item.conversation.length >= 12 ? 'disabled' : ''}>Add message +</button></div><label class="conversation-toggle"><input type="checkbox" data-show-image ${item.showImage === false ? '' : 'checked'}><span>Show artwork with the final message</span></label><label class="field conversation-caption" ${item.showImage === false ? 'hidden' : ''}><span>Artwork caption</span><input data-conversation-caption value="${escape(item.conversationCaption || '')}"></label><div class="conversation-list">${item.conversation.map((message, index) => `<div class="conversation-entry" data-message-index="${index}"><span class="entry-number">${String(index + 1).padStart(2, '0')}</span><label class="field"><span>Speaker</span><select data-message-field="speaker"><option value="Creator" ${message.speaker === 'Creator' ? 'selected' : ''}>Creator</option><option value="Larzy" ${message.speaker === 'Larzy' ? 'selected' : ''}>Larzy</option></select></label><label class="field conversation-text"><span>Message</span><textarea data-message-field="text" rows="2">${escape(message.text || '')}</textarea></label><div class="conversation-controls"><button type="button" data-message-action="up" aria-label="Move message ${index + 1} up" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" data-message-action="down" aria-label="Move message ${index + 1} down" ${index === item.conversation.length - 1 ? 'disabled' : ''}>↓</button><button type="button" data-message-action="remove" aria-label="Remove message ${index + 1}" ${item.conversation.length === 1 ? 'disabled' : ''}>×</button></div></div>`).join('')}</div></div>`;
  }
  function renderList(kind) {
    const list = listPath(kind);
    $(`#${kind}-list`).innerHTML = list.map((item, index) => {
      const src = imageFor(item, kind);
      const summary = kind === 'reviews' ? item.quote : kind === 'process' ? item.body : kind === 'clients' ? item.subs : item.src;
      return `<article class="entry" data-list="${kind}" data-index="${index}">${kind === 'work' ? sortMarker(kind, index) : `<span class="entry-number">${String(index + 1).padStart(2, '0')}</span>`}<img class="entry-image ${kind === 'work' || kind === 'process' ? 'wide' : ''} ${kind === 'process' && item.showImage === false ? 'image-not-shown' : ''}" src="${escape(imageURL(src))}" alt="${escape(labelFor(item, kind) || 'Image preview')}" ${kind === 'work' ? 'data-drag-target draggable="false"' : ''} ${kind === 'process' && item.showImage === false ? 'title="Hidden on the site"' : ''} loading="lazy"><div class="entry-info"><strong>${escape(labelFor(item, kind) || 'New item')}</strong><span>${escape(summary || 'Add details below')}</span></div>${controls(index, list.length)}<details><summary>Edit details</summary><div class="field-grid">${fieldsByList[kind].map(([label, key, type]) => `<label class="field ${type === 'long' ? 'span-all' : ''}"><span>${escape(label)}</span>${type === 'long' ? `<textarea data-field="${key}" rows="4">${escape(item[key] || '')}</textarea>` : `<input data-field="${key}" value="${escape(item[key] || '')}">`}</label>`).join('')}<div class="entry-detail-actions"><button class="button button-outline" type="button" data-action="upload">Upload / replace image</button></div>${kind === 'process' ? conversationEditor(item) : ''}</div></details></article>`;
    }).join('');
  }
  function render() {
    document.querySelectorAll('#home [data-bind]').forEach(input => { input.value = get(input.dataset.bind) ?? ''; });
    renderHero(); for (const kind of Object.keys(fieldsByList)) renderList(kind); renderCopy();
  }
  function renderOne(kind) { if (kind === 'heroImages') renderHero(); else renderList(kind); }
  function renderConversation(index, focusIndex) {
    renderList('process');
    const entry = $(`#process-list .entry[data-index="${index}"]`);
    entry?.querySelector('details')?.setAttribute('open', '');
    entry?.querySelector(`.conversation-entry[data-message-index="${focusIndex}"] textarea`)?.focus();
  }
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
  function changeOrder(kind, index, direction, focusHandle = false) {
    const list = kind === 'heroImages' ? state.content.home.heroImages : listPath(kind);
    const other = index + direction;
    if (other < 0 || other >= list.length) return;
    [list[index], list[other]] = [list[other], list[index]];
    markDirty(); renderOne(kind);
    const moved = $(`#${kind === 'heroImages' ? 'hero' : kind}-list .entry[data-index="${other}"]`);
    moved?.querySelector(focusHandle ? '.drag-handle' : `[data-action="${direction < 0 ? 'down' : 'up'}"]`)?.focus();
  }
  function reorder(kind, from, to) {
    if (from === to) return;
    const list = kind === 'heroImages' ? state.content.home.heroImages : listPath(kind);
    list.splice(to, 0, list.splice(from, 1)[0]);
    markDirty(); renderOne(kind);
    if (kind === 'work') renderHero();
  }
  let dragState = null;
  function dragList(kind) { return $(`#${kind === 'heroImages' ? 'hero' : kind}-list`); }
  function clearDropMarker() { dragList(dragState.kind)?.querySelectorAll('.drop-before,.drop-after').forEach(entry => entry.classList.remove('drop-before', 'drop-after')); }
  function updateDropMarker() {
    const drag = dragState, list = dragList(drag.kind), entries = [...list.querySelectorAll(':scope > .entry')];
    clearDropMarker();
    const bounds = list.getBoundingClientRect();
    if (drag.x < bounds.left - 30 || drag.x > bounds.right + 30) { drag.position = null; return; }
    let position = entries.findIndex(entry => drag.y < entry.getBoundingClientRect().top + entry.getBoundingClientRect().height / 2);
    if (position < 0) position = entries.length;
    drag.position = position;
    const marker = entries[Math.min(position, entries.length - 1)];
    marker?.classList.add(position === entries.length ? 'drop-after' : 'drop-before');
  }
  function autoScrollDrag() {
    if (!dragState?.active) return;
    const margin = 90;
    if (dragState.y < margin) window.scrollBy({ top: -10, behavior: 'instant' });
    else if (dragState.y > innerHeight - margin) window.scrollBy({ top: 10, behavior: 'instant' });
    updateDropMarker();
    dragState.frame = requestAnimationFrame(autoScrollDrag);
  }
  function finishDrag(commit) {
    const drag = dragState; if (!drag) return;
    cancelAnimationFrame(drag.frame);
    if (drag.target.hasPointerCapture?.(drag.pointerId)) drag.target.releasePointerCapture(drag.pointerId);
    drag.source.classList.remove('is-dragging');
    drag.preview?.remove();
    clearDropMarker(); document.body.classList.remove('is-sorting');
    dragState = null;
    if (commit && drag.active && drag.position != null) {
      const to = drag.position > drag.from ? drag.position - 1 : drag.position;
      reorder(drag.kind, drag.from, to);
    }
  }
  document.addEventListener('pointerdown', event => {
    const target = event.target.closest('[data-drag-target]');
    const source = target?.closest('.entry');
    const kind = source?.dataset.list;
    if (dragState || !['work', 'heroImages'].includes(kind) || (event.pointerType === 'mouse' && event.button !== 0)) return;
    dragState = { kind, from: Number(source.dataset.index), pointerId: event.pointerId, target, source, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, position: null, active: false, frame: 0, preview: null };
    target.setPointerCapture?.(event.pointerId);
  });
  document.addEventListener('pointermove', event => {
    const drag = dragState; if (!drag || event.pointerId !== drag.pointerId) return;
    drag.x = event.clientX; drag.y = event.clientY;
    if (!drag.active && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < 6) return;
    if (!drag.active) {
      drag.active = true; drag.source.classList.add('is-dragging'); document.body.classList.add('is-sorting');
      const preview = document.createElement('div'); preview.className = 'drag-preview';
      const image = drag.source.querySelector('img'); if (image?.src) { const thumb = image.cloneNode(); thumb.alt = ''; preview.append(thumb); }
      const label = document.createElement('span'); label.textContent = drag.kind === 'work' ? drag.source.querySelector('.entry-info strong')?.textContent || 'Thumbnail' : `Hero image ${drag.from + 1}`;
      preview.append(label); document.body.append(preview); drag.preview = preview;
      drag.frame = requestAnimationFrame(autoScrollDrag);
    }
    drag.preview.style.left = `${drag.x + 14}px`; drag.preview.style.top = `${drag.y + 14}px`;
    updateDropMarker();
  });
  document.addEventListener('pointerup', event => { if (dragState && event.pointerId === dragState.pointerId) finishDrag(true); });
  document.addEventListener('pointercancel', event => { if (dragState && event.pointerId === dragState.pointerId) finishDrag(false); });
  window.addEventListener('blur', () => finishDrag(false));
  document.addEventListener('keydown', event => {
    const handle = event.target.closest('.drag-handle');
    if (!handle || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const entry = handle.closest('.entry');
    changeOrder(entry.dataset.list, Number(entry.dataset.index), event.key === 'ArrowUp' ? -1 : 1, true);
  });
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
    if (state.content.home.process.some(item => !item.title || (!item.image && (!Array.isArray(item.conversation) || item.showImage !== false)))) return 'Every approach step needs a title and an image unless Brief artwork is hidden.';
    if (state.content.home.process.some(item => Array.isArray(item.conversation) && (!item.conversation.length || item.conversation.length > 12 || (item.conversationCaption || '').length > 160 || item.conversation.some(message => !message.text.trim() || message.text.length > 1000)))) return 'The Brief conversation needs 1–12 messages, each under 1,000 characters, and a short artwork caption.';
    if (state.content.home.heroImages.length < 3) return 'Choose at least three hero images.';
    return '';
  }
  async function save() {
    const problem = validate(); if (problem) { toast(problem, true); return false; }
    try {
      await request('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: state.content }) });
      markSaved();
      if ('BroadcastChannel' in window) { const channel = new BroadcastChannel('larzy-preview'); channel.postMessage('content-saved'); channel.close(); }
      toast('Saved on this computer. The local preview will refresh; click Publish to update the live site.'); return true;
    } catch (error) { $('#save-state').textContent = 'Local save failed'; toast(error.message, true); return false; }
  }
  async function publish() {
    if (state.dirty && !(await save())) return;
    $('#btn-publish').disabled = true; $('#save-state').textContent = 'Publishing…';
    try { const result = await request('/api/publish', { method: 'POST' }); toast(result.message); $('#save-state').textContent = result.pushed ? 'Pushed to GitHub — Vercel deploying' : 'GitHub is up to date'; }
    catch (error) { toast(error.message, true); $('#save-state').textContent = 'Publish failed — see message'; }
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
    if (input.dataset.messageField === 'text') {
      const entry = input.closest('.entry'), messageIndex = Number(input.closest('.conversation-entry').dataset.messageIndex);
      state.content.home.process[Number(entry.dataset.index)].conversation[messageIndex].text = input.value; markDirty();
    }
    if (input.hasAttribute('data-conversation-caption')) {
      state.content.home.process[Number(input.closest('.entry').dataset.index)].conversationCaption = input.value; markDirty();
    }
  });
  document.addEventListener('change', event => {
    if (event.target.hasAttribute('data-show-image')) {
      const input = event.target, entry = input.closest('.entry');
      state.content.home.process[Number(entry.dataset.index)].showImage = input.checked;
      entry.querySelector('.conversation-caption').hidden = !input.checked;
      entry.querySelector('.entry-image').classList.toggle('image-not-shown', !input.checked);
      entry.querySelector('.entry-image').title = input.checked ? '' : 'Hidden on the site';
      markDirty();
    }
    if (event.target.dataset.messageField === 'speaker') {
      const input = event.target, entry = input.closest('.entry'), messageIndex = Number(input.closest('.conversation-entry').dataset.messageIndex);
      state.content.home.process[Number(entry.dataset.index)].conversation[messageIndex].speaker = input.value; markDirty();
    }
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
    const messageButton = event.target.closest('[data-message-action]');
    if (messageButton) {
      const stepIndex = Number(messageButton.closest('.entry').dataset.index);
      const messages = state.content.home.process[stepIndex].conversation;
      const action = messageButton.dataset.messageAction;
      const index = Number(messageButton.closest('.conversation-entry')?.dataset.messageIndex);
      if (action === 'add' && messages.length < 12) { messages.push({ speaker: 'Creator', text: '' }); markDirty(); renderConversation(stepIndex, messages.length - 1); }
      if (action === 'remove' && messages.length > 1) { messages.splice(index, 1); markDirty(); renderConversation(stepIndex, Math.min(index, messages.length - 1)); }
      if ((action === 'up' && index > 0) || (action === 'down' && index < messages.length - 1)) {
        const next = index + (action === 'up' ? -1 : 1);
        [messages[index], messages[next]] = [messages[next], messages[index]];
        markDirty(); renderConversation(stepIndex, next);
      }
      return;
    }
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
  if (state.token) load().catch(error => { signOut(); $('#login-error').textContent = error.message; });
})();
