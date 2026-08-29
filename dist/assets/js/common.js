/* ============================================================
   MultiMediaManager - 流集 · 公共模块
   ============================================================ */

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

/* ---------- state ---------- */
const state = {
  theme: 'dark',
  audioDir: '',
  acoustidApiKey: '',
  configSaved: false,
  currentTab: 'lib',
  page: 1,
  pageSize: 10,
  sortBy: 'title',
  sortOrder: 'asc',
  scope: 'all',
  searchTerm: '',
  scanTimer: null,
};

/* ---------- API helpers ---------- */
const API_BASE = '';

async function apiGet(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${API_BASE}${path}${qs ? '?' + qs : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiPost(path, body = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiPostQuery(path, params = {}, body = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((x) => qs.append(k, x));
    else qs.append(k, v);
  }
  const url = `${API_BASE}${path}?${qs.toString()}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiDelete(path, body = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ---------- theme ---------- */
function initTheme() {
  const saved = localStorage.getItem('mmm-theme');
  if (saved === 'light' || saved === 'dark') state.theme = saved;
  applyTheme();
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('mmm-theme', state.theme);
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
}

/* ---------- toast ---------- */
function showToast(msg, type = 'ok') {
  const container = $('#toasts');
  const t = document.createElement('div');
  t.className = `toast ${type === 'warn' ? 't-warn' : type === 'err' ? 't-err' : ''}`;
  const icons = {
    ok: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="m8 12 3 3 6-6"/></svg>',
    warn: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
    err: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6m0-6 6 6"/></svg>',
  };
  t.innerHTML = `<span class="t-ic">${icons[type] || icons.ok}</span><span>${msg}</span>`;
  container.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 400);
  }, 2800);
}

/* ---------- utils ---------- */
function esc(s) {
  if (!s) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
}

function basename(path) {
  if (!path) return '';
  return path.replace(/\\/g, '/').split('/').pop() || '';
}

function getExtClass(ext) {
  const m = {
    'FLAC': 'f-flac', 'MP3': 'f-mp3', 'OGG': 'f-ogg',
    'WAV': 'f-wav', 'M4A': 'f-m4a', 'AAC': 'f-m4a',
  };
  return m[ext] || '';
}

/* ---------- song data helpers ---------- */
async function _fetchAllRaw(searchParams) {
  const baseParams = {
    page: 1, page_size: 1,
    sort_by: state.sortBy, sort_order: state.sortOrder,
  };
  const countParams = { ...baseParams, ...searchParams };
  const countRes = await apiGet('/audio/search', countParams);
  if (countRes.code !== 0) return [];
  const total = countRes.data.pagination.total || 0;
  if (total === 0) return [];
  const res = await apiGet('/audio/search', { ...countParams, page_size: total });
  if (res.code !== 0) return [];
  return res.data.audio_list || [];
}

async function fetchAllSongs() {
  try {
    const list = await _fetchAllRaw();
    return list.map((a) => ({
      id: a.id,
      title: a.title || '未知歌曲',
      artist: a.artist || '未知歌手',
      lyric_path: a.lyric_path || '',
    }));
  } catch (e) {
    return [];
  }
}

/* ---------- theme bindings ---------- */
function bindThemeButtons() {
  $$('.js-theme').forEach((btn) => {
    btn.addEventListener('click', toggleTheme);
  });
}