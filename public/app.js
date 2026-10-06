const $ = (sel) => document.querySelector(sel);

const state = {
  sort: 'latest',
  photos: [],
  current: -1,       // index of photo open in lightbox
  editing: null,     // photo being edited (null = new upload)
  file: null,
  password: sessionStorageGet('pw'),
};

// ---------- utils ----------
function sessionStorageGet(key) {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function sessionStorageSet(key, value) {
  try { value == null ? sessionStorage.removeItem(key) : sessionStorage.setItem(key, value); } catch {}
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatViews(n) {
  const v = n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : n;
  return `${v} view${n === 1 ? '' : 's'}`;
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2600);
}

async function api(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (state.password) headers['x-admin-password'] = state.password;
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) logout();
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}

// ---------- gallery ----------
const EYE = '<svg viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';

async function loadPhotos() {
  try {
    state.photos = await api(`/api/photos?sort=${state.sort}`);
  } catch (e) {
    toast(e.message);
    state.photos = [];
  }
  renderGallery();
}

function columnCount() {
  const w = window.innerWidth;
  return w >= 1100 ? 3 : 2;
}

function renderGallery() {
  const gallery = $('#gallery');
  const cols = Array.from({ length: columnCount() }, () => {
    const col = document.createElement('div');
    col.className = 'gallery-col';
    return col;
  });
  gallery.replaceChildren(...cols);
  $('#empty').hidden = state.photos.length > 0;

  state.photos.forEach((photo, i) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.tabIndex = 0;
    card.style.animationDelay = `${Math.min(i, 12) * 50}ms`;

    const img = document.createElement('img');
    img.src = photo.file;
    img.alt = photo.title || 'Photo';
    img.loading = 'lazy';
    card.append(img);

    if (state.sort === 'popular' && i < 3 && photo.views > 0) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = `#${i + 1}`;
      card.append(badge);
    }

    const overlay = document.createElement('div');
    overlay.className = 'card-overlay';
    if (photo.title) {
      const h = document.createElement('h3');
      h.className = 'card-title';
      h.textContent = photo.title;
      overlay.append(h);
    }
    const meta = document.createElement('div');
    meta.className = 'card-meta';
    const date = document.createElement('span');
    date.textContent = formatDate(photo.createdAt);
    const views = document.createElement('span');
    views.innerHTML = EYE;
    views.append(formatViews(photo.views));
    meta.append(date, views);
    overlay.append(meta);
    card.append(overlay);

    card.addEventListener('click', () => openLightbox(i));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter') openLightbox(i); });
    cols[i % cols.length].append(card);
  });
}

// tabs
function moveIndicator() {
  const active = $('.tab.active');
  const ind = $('.tab-indicator');
  ind.style.width = active.offsetWidth + 'px';
  ind.style.transform = `translateX(${active.offsetLeft}px)`;
}
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    if (tab.dataset.sort === state.sort) return;
    document.querySelectorAll('.tab').forEach((t) => {
      t.classList.toggle('active', t === tab);
      t.setAttribute('aria-selected', t === tab);
    });
    state.sort = tab.dataset.sort;
    moveIndicator();
    loadPhotos();
  });
});
let lastCols = columnCount();
window.addEventListener('resize', () => {
  moveIndicator();
  if (columnCount() !== lastCols) {
    lastCols = columnCount();
    renderGallery();
  }
});
window.addEventListener('scroll', () => {
  $('.site-header').classList.toggle('scrolled', window.scrollY > 10);
});

// ---------- lightbox ----------
async function countView(photo) {
  // Count each photo once per browser session.
  const key = 'seen:' + photo.id;
  if (sessionStorageGet(key)) return;
  sessionStorageSet(key, '1');
  try {
    const { views } = await api(`/api/photos/${photo.id}/view`, { method: 'POST' });
    photo.views = views;
    if (state.photos[state.current] === photo) $('#lbViews').textContent = formatViews(views);
  } catch {}
}

function showPhoto(i) {
  const photo = state.photos[i];
  if (!photo) return;
  state.current = i;
  $('#lbImg').src = photo.file;
  $('#lbImg').alt = photo.title || 'Photo';
  $('#lbTitle').textContent = photo.title || 'Untitled';
  $('#lbDate').textContent = formatDate(photo.createdAt);
  $('#lbViews').textContent = formatViews(photo.views);
  const desc = $('#lbDesc');
  desc.textContent = photo.description || 'No description.';
  desc.classList.toggle('placeholder', !photo.description);
  $('#lbAdmin').hidden = !state.password;
  $('.lb-prev').hidden = i === 0;
  $('.lb-next').hidden = i === state.photos.length - 1;
  countView(photo);
}

function openLightbox(i) {
  $('#lightbox').hidden = false;
  document.body.style.overflow = 'hidden';
  showPhoto(i);
}
function closeLightbox() {
  $('#lightbox').hidden = true;
  document.body.style.overflow = '';
  state.current = -1;
  renderGallery(); // refresh view counts
}

$('.lb-close').addEventListener('click', closeLightbox);
$('.lb-prev').addEventListener('click', () => showPhoto(state.current - 1));
$('.lb-next').addEventListener('click', () => showPhoto(state.current + 1));
$('#lightbox').addEventListener('click', (e) => {
  if (e.target.classList.contains('lb-image-wrap')) closeLightbox();
});

// swipe on touch devices
let touchX = null;
$('#lightbox').addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
$('#lightbox').addEventListener('touchend', (e) => {
  if (touchX == null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 50) showPhoto(state.current + (dx < 0 ? 1 : -1));
  touchX = null;
});

document.addEventListener('keydown', (e) => {
  if (!$('#uploadModal').hidden || !$('#loginModal').hidden) {
    if (e.key === 'Escape') closeModals();
    return;
  }
  if ($('#lightbox').hidden) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') showPhoto(state.current - 1);
  if (e.key === 'ArrowRight') showPhoto(state.current + 1);
});

// ---------- auth ----------
function logout() {
  state.password = null;
  sessionStorageSet('pw', null);
  $('#lbAdmin').hidden = true;
}

function closeModals() {
  $('#loginModal').hidden = true;
  $('#uploadModal').hidden = true;
}
document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeModals));
document.querySelectorAll('.modal').forEach((m) =>
  m.addEventListener('mousedown', (e) => { if (e.target === m) closeModals(); })
);

$('#uploadBtn').addEventListener('click', () => {
  if (state.password) openUpload(null);
  else openLogin();
});

function openLogin() {
  $('#loginError').textContent = '';
  $('#password').value = '';
  $('#loginModal').hidden = false;
  $('#password').focus();
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw = $('#password').value;
  try {
    const res = await fetch('/api/login', { method: 'POST', headers: { 'x-admin-password': pw } });
    if (!res.ok) throw new Error('Wrong password');
    state.password = pw;
    sessionStorageSet('pw', pw);
    $('#loginModal').hidden = true;
    openUpload(null);
  } catch (err) {
    $('#loginError').textContent = err.message;
  }
});

$('#logoutBtn').addEventListener('click', () => {
  logout();
  closeModals();
  toast('Logged out');
});

// ---------- upload / edit ----------
function setPreview(src) {
  $('#preview').src = src || '';
  $('#preview').hidden = !src;
  $('#dropText').hidden = !!src;
}

function openUpload(photo) {
  state.editing = photo;
  state.file = null;
  $('#fileInput').value = '';
  $('#uploadError').textContent = '';
  $('#uploadHeading').textContent = photo ? 'Edit photo' : 'Upload a photo';
  $('#submitBtn').textContent = photo ? 'Save' : 'Publish';
  $('#titleInput').value = photo ? photo.title : '';
  $('#descInput').value = photo ? photo.description : '';
  $('#dropzone').classList.toggle('locked', !!photo);
  setPreview(photo ? photo.file : null);
  $('#uploadModal').hidden = false;
}

function pickFile(file) {
  if (!file || state.editing) return;
  if (!file.type.startsWith('image/')) {
    $('#uploadError').textContent = 'Please choose an image file';
    return;
  }
  state.file = file;
  $('#uploadError').textContent = '';
  setPreview(URL.createObjectURL(file));
  if (!$('#titleInput').value) {
    $('#titleInput').value = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
  }
}

$('#dropzone').addEventListener('click', (e) => { if (state.editing) e.preventDefault(); });
$('#fileInput').addEventListener('change', (e) => pickFile(e.target.files[0]));
['dragenter', 'dragover'].forEach((ev) =>
  $('#dropzone').addEventListener(ev, (e) => { e.preventDefault(); if (!state.editing) $('#dropzone').classList.add('drag'); })
);
['dragleave', 'drop'].forEach((ev) =>
  $('#dropzone').addEventListener(ev, (e) => { e.preventDefault(); $('#dropzone').classList.remove('drag'); })
);
$('#dropzone').addEventListener('drop', (e) => pickFile(e.dataTransfer.files[0]));

$('#uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#submitBtn');
  const title = $('#titleInput').value;
  const description = $('#descInput').value;

  try {
    btn.disabled = true;
    if (state.editing) {
      const updated = await api(`/api/photos/${state.editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      Object.assign(state.editing, updated);
      closeModals();
      if (state.current >= 0) showPhoto(state.current);
      toast('Saved');
    } else {
      if (!state.file) throw new Error('Please choose an image');
      btn.textContent = 'Uploading…';
      const form = new FormData();
      form.append('image', state.file);
      form.append('title', title);
      form.append('description', description);
      await api('/api/photos', { method: 'POST', body: form });
      closeModals();
      toast('Photo published');
      if (state.sort !== 'latest') $('.tab[data-sort="latest"]').click();
      else loadPhotos();
    }
  } catch (err) {
    $('#uploadError').textContent = err.message;
    if (!state.password) { closeModals(); openLogin(); }
  } finally {
    btn.disabled = false;
    btn.textContent = state.editing ? 'Save' : 'Publish';
  }
});

$('#editBtn').addEventListener('click', () => openUpload(state.photos[state.current]));
$('#deleteBtn').addEventListener('click', async () => {
  const photo = state.photos[state.current];
  if (!photo || !confirm('Delete this photo permanently?')) return;
  try {
    await api(`/api/photos/${photo.id}`, { method: 'DELETE' });
    state.photos.splice(state.current, 1);
    closeLightbox();
    toast('Photo deleted');
  } catch (err) {
    toast(err.message);
  }
});

// ---------- init ----------
$('#year').textContent = new Date().getFullYear();
moveIndicator();
document.fonts?.ready.then(moveIndicator);
loadPhotos();
