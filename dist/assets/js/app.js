/* ============================================================
   MultiMediaManager - 流集
   ============================================================ */

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

/* ---------- state ---------- */
const state = {
  theme: 'dark',
  audioDir: '',
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

/* ---------- navigation ---------- */
function showScreen(id) {
  $$('.screen').forEach((s) => { s.classList.add('hidden'); s.classList.remove('fade-in'); });
  const target = $(`#${id}`);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('fade-in');
  }
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

/* ---------- cover SVG ---------- */
function genCoverSVG(title, artist) {
  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0; return Math.abs(h); };
  const h = hash((title || '') + (artist || ''));
  const hue = h % 360;
  const hue2 = (hue + 40) % 360;
  const sat = 55 + (h % 25);
  const light = 35 + (h % 20);
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="hsl(${hue},${sat}%,${light}%)"/><stop offset="100%" stop-color="hsl(${hue2},${sat}%,${light + 10}%)"/></linearGradient></defs>
      <rect width="100" height="100" rx="8" fill="url(#g)"/>
      <circle cx="50" cy="50" r="22" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1.5" stroke-dasharray="4 4"/>
      <circle cx="50" cy="50" r="8" fill="rgba(255,255,255,.55)"/>
      <circle cx="50" cy="50" r="3" fill="rgba(0,0,0,.3)"/>
    </svg>`
  )}`;
}

/* ---------- home: load system status ---------- */
async function loadHomeStatus() {
  try {
    const cfg = await apiGet('/config');
    if (cfg.code === 0 && cfg.data) {
      state.audioDir = cfg.data.audio_dir || '';
      if (state.audioDir) {
        $('#audioStatus').textContent = '已就绪';
        $('#audioStatus').classList.remove('warn');
        $('#audioStatus').classList.add('ok');
        $('#audioMeta').classList.remove('hidden');
      }
    }

    const res = await apiGet('/audio/search', { page: 1, page_size: 1 });
    if (res.code === 0 && res.data && res.data.pagination) {
      const total = res.data.pagination.total || 0;
      $('#amCount').textContent = total;
    }

    if (state.audioDir && res.data && res.data.audio_list && res.data.audio_list.length > 0) {
      const statsRes = await apiGet('/audio/search', { page: 1, page_size: 1, sort_by: 'artist', sort_order: 'desc' });
      if (statsRes.code === 0 && statsRes.data && statsRes.data.pagination) {
        const t = statsRes.data.pagination.total || 0;
        if (t > 0) {
          const allRes = await apiGet('/audio/search', { page: 1, page_size: Math.min(t, 1000) });
          if (allRes.code === 0 && allRes.data && allRes.data.audio_list) {
            let totalSize = 0;
            allRes.data.audio_list.forEach((a) => {
              totalSize += (a.file_size || 0);
            });
            $('#amSize').textContent = (totalSize / 1e9).toFixed(2) + ' GB';
          }
        }
      }
    }
  } catch (e) {
    $('#audioStatus').textContent = '未连接';
    $('#audioStatus').classList.remove('ok');
    $('#audioStatus').classList.add('warn');
  }
}

/* ---------- setup: directory selection ---------- */
function initSetup() {
  const dirInput = $('#dirInput');
  const btnStart = $('#btnStart');
  const dirNote = $('#dirNote');

  async function checkDir(path) {
    if (!path) return;
    state.audioDir = path;
    try {
      const cfg = await apiGet('/config');
      dirNote.classList.remove('hidden');
      if (cfg.data && cfg.data.audio_dir === path) {
        dirNote.innerHTML = '<span style="color:var(--green)">&#10003; 该目录已配置，可直接进入管理</span>';
        btnStart.disabled = false;
      } else {
        dirNote.innerHTML = '<span style="color:var(--amber)">&#9888; 将设置为新的音频目录</span>';
        btnStart.disabled = false;
      }
    } catch (e) {
      dirNote.classList.remove('hidden');
      dirNote.innerHTML = '<span style="color:var(--amber)">&#9888; 无法连接后端，请确认服务已启动</span>';
      btnStart.disabled = true;
    }
  }

  dirInput.addEventListener('input', () => {
    const v = dirInput.value.trim();
    if (v) checkDir(v);
    else { btnStart.disabled = true; dirNote.classList.add('hidden'); }
  });

  btnStart.addEventListener('click', startScan);

  if (dirInput.value.trim()) checkDir(dirInput.value.trim());
}

/* ---------- scanning ---------- */
async function startScan() {
  const dir = state.audioDir;
  if (!dir) return;

  showScreen('screenSetup');
  const scanPanel = $('#scanPanel');
  scanPanel.classList.remove('hidden');
  scanPanel.classList.add('reveal');

  $('#step1').classList.remove('on');
  $('#step1').classList.add('done');
  $('#step2').classList.add('on');

  $('#scanDirLabel').textContent = dir;
  const log = $('#scanLog');
  log.innerHTML = '';

  function addLog(msg, cls = '') {
    const div = document.createElement('div');
    div.className = `ln ${cls}`;
    div.textContent = msg;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }

  addLog('正在连接后端服务...', 'info');
  addLog(`目标目录: ${dir}`, 'dim');

  try {
    const cfgRes = await apiPost('/config', { audio_dir: dir });
    if (cfgRes.code !== 0) {
      addLog('配置目录失败: ' + (cfgRes.message || '未知错误'), 'warn');
      return;
    }
    addLog('目录配置已保存', 'ok');

    addLog('开始扫描音频文件...', 'info');
    const startTime = Date.now();

    state.scanTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      $('#scanPct').textContent = elapsed + 's';
    }, 1000);

    $('#scanCur').textContent = '扫描中...';

    const scanRes = await apiGet('/audio/scan');
    clearInterval(state.scanTimer);

    if (scanRes.code === 0) {
      addLog('扫描完成！', 'ok');
      const totalSec = Math.floor((Date.now() - startTime) / 1000);
      $('#scanCur').textContent = '扫描完成';
      $('#scanPct').textContent = totalSec + 's';
      $('#step2').classList.remove('on');
      $('#step2').classList.add('done');
      $('#step3').classList.add('on');
      showToast('扫描完成，曲库已更新');
      setTimeout(() => {
        showScreen('screenLib');
        loadLibrary();
      }, 1500);
    } else {
      addLog('扫描失败: ' + (scanRes.message || '未知错误'), 'warn');
    }
  } catch (e) {
    clearInterval(state.scanTimer);
    addLog('连接失败: ' + e.message, 'warn');
    addLog('请确认后端服务已启动', 'dim');
  }
}

/* ---------- library ---------- */
async function loadLibrary() {
  const tab = state.currentTab;
  const params = {
    page: state.page,
    page_size: state.pageSize,
    sort_by: state.sortBy,
    sort_order: state.sortOrder,
  };

  if (state.searchTerm) {
    if (state.scope === 'all' || state.scope === 'title') params.title = state.searchTerm;
    if (state.scope === 'all' || state.scope === 'artist') params.artist = state.searchTerm;
    if (state.scope === 'all' || state.scope === 'album') params.album = state.searchTerm;
  }

  $('#tbody').innerHTML = '<tr class="loading"><td colspan="8" class="load-cell"><span class="spin"></span>加载中...</td></tr>';

  try {
    let res;
    if (tab === 'bin') {
      res = await apiGet('/audio/recyclebin', params);
    } else {
      res = await apiGet('/audio/search', params);
    }

    if (res.code !== 0) {
      $('#tbody').innerHTML = '<tr><td colspan="8" class="load-cell">加载失败</td></tr>';
      return;
    }

    const data = res.data;
    const list = data.audio_list || [];
    const pag = data.pagination || {};

    renderTable(list, pag, tab === 'bin');

    updateStats();
    updatePager(pag);
    updateStatusBar();
    if (tab !== 'bin') {
      $('#cntLib').textContent = pag.total || 0;
    }
  } catch (e) {
    $('#tbody').innerHTML = '<tr><td colspan="9" class="load-cell">无法连接后端</td></tr>';
  }
}

function renderTable(list, pag, isBin = false) {
  const tbody = $('#tbody');
  if (list.length === 0) {
    const emptyBox = $('#emptyBox');
    emptyBox.classList.remove('hidden');
    emptyBox.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
      <h3>${isBin ? '回收站是空的' : '没有找到歌曲'}</h3>
      <p>${isBin ? '暂无已删除的歌曲' : '请先初始化曲库或调整搜索条件'}</p>`;
    tbody.innerHTML = '';
    return;
  }
  $('#emptyBox').classList.add('hidden');

  tbody.innerHTML = list.map((a, i) => {
    const idx = (state.page - 1) * state.pageSize + i + 1;
    const title = a.title || '未知歌曲';
    const artist = a.artist || '未知歌手';
    const album = a.album || '—';
    const ext = (a.file_ext || '').toUpperCase();
    const size = formatSize(a.file_size || 0);
    const fname = basename(a.file_path || '');
    const md5 = (a.file_md5 || '').substring(0, 8);
    const extClass = getExtClass(ext);
    const id = a.id || 0;

    return `
    <tr class="song-row" data-id="${id}" style="--d:${i * 30}">
      <td class="c-idx"><span class="idx">${idx}</span></td>
      <td>
        <div class="tt-cell">
          <div class="tt-txt"><div class="tt">${esc(title)}</div><div class="tp">${esc(artist)}</div></div>
        </div>
      </td>
      <td class="c-artist">${esc(artist)}</td>
      <td class="c-album">${esc(album)}</td>
      <td class="c-fmt"><span class="badge ${extClass}">${ext || '—'}</span></td>
      <td class="c-size">${size}</td>
      <td class="c-fname" title="${esc(a.file_path || '')}">${esc(fname)}</td>
      <td class="c-md5"><code>${md5 || '—'}</code></td>
      <td class="c-act">
        ${isBin ? `
          <button class="act-btn a-restore" data-action="restore" data-id="${id}" title="恢复"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3-7.7L3 8"/><path d="M3 3v5h5"/></svg></button>
          <button class="act-btn a-purge" data-action="purge" data-id="${id}" title="永久删除"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14"/></svg></button>
        ` : `
          <button class="act-btn a-edit" data-action="edit" data-id="${id}" title="编辑"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>
          <button class="act-btn a-del" data-action="delete" data-id="${id}" title="删除"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M16 6v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg></button>
        `}
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('.act-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const id = parseInt(btn.dataset.id);
      if (action === 'edit') openEdit(id);
      else if (action === 'delete') confirmAction('delete', id);
      else if (action === 'restore') confirmAction('restore', id);
      else if (action === 'purge') confirmAction('purge', id);
    });
  });
}

function getExtClass(ext) {
  const m = {
    'FLAC': 'f-flac', 'MP3': 'f-mp3', 'OGG': 'f-ogg',
    'WAV': 'f-wav', 'M4A': 'f-m4a', 'AAC': 'f-m4a',
  };
  return m[ext] || '';
}

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
}

function esc(s) {
  if (!s) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function basename(path) {
  if (!path) return '';
  return path.replace(/\\/g, '/').split('/').pop() || '';
}

async function updateStats() {
  try {
    const libRes = await apiGet('/audio/search', { page: 1, page_size: 1 });
    const binRes = await apiGet('/audio/recyclebin', { page: 1, page_size: 1 });
    if (libRes.code !== 0) return;

    const libTotal = libRes.data.pagination.total || 0;
    const binTotal = binRes.code === 0 ? (binRes.data.pagination.total || 0) : 0;

    const allRes = await apiGet('/audio/search', { page: 1, page_size: Math.min(libTotal, 1000) });
    if (allRes.code !== 0) return;
    const list = allRes.data.audio_list || [];
    const albums = new Set();
    let totalSize = 0;
    list.forEach((a) => { if (a.album) albums.add(a.album); totalSize += (a.file_size || 0); });

    $('#stCount').textContent = libTotal;
    $('#stSize').textContent = (totalSize / 1e9).toFixed(2);
    $('#stAlbum').textContent = albums.size;
    $('#stBin').textContent = binTotal;
    $('#cntBin').textContent = binTotal;
  } catch (e) {}
}

function updatePager(pag) {
  const total = pag.total || 0;
  const pages = pag.total_pages || 1;
  const cur = state.page;

  $('#pgCount').innerHTML = `<b>${total}</b> 条`;

  const nums = $('#pgNums');
  nums.innerHTML = '';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'pg-btn nav';
  prevBtn.disabled = cur <= 1;
  prevBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg> 上一页';
  prevBtn.addEventListener('click', () => { state.page = cur - 1; loadLibrary(); });
  nums.appendChild(prevBtn);

  const items = paginateNums(cur, pages);
  items.forEach(item => {
    if (item === '...') {
      const g = document.createElement('span');
      g.className = 'pg-gap';
      g.textContent = '…';
      nums.appendChild(g);
    } else {
      nums.appendChild(createPgBtn(item));
    }
  });

  const nextBtn = document.createElement('button');
  nextBtn.className = 'pg-btn nav';
  nextBtn.disabled = cur >= pages;
  nextBtn.innerHTML = '下一页 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
  nextBtn.addEventListener('click', () => { state.page = cur + 1; loadLibrary(); });
  nums.appendChild(nextBtn);

  const jumpInput = $('#pgJump');
  if (jumpInput) {
    jumpInput.value = '';
    jumpInput.max = pages;
    jumpInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        const n = parseInt(jumpInput.value);
        if (n >= 1 && n <= pages) { state.page = n; loadLibrary(); }
      }
    };
  }
}

function paginateNums(cur, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items = [1];
  let last = 1;
  const range = (s, e) => { const a = []; for (let i = s; i <= e; i++) a.push(i); return a; };
  if (cur <= 4) {
    items.push(...range(2, 5));
    last = 5;
  } else if (cur >= total - 3) {
    items.push('...');
    items.push(...range(total - 4, total));
    last = total;
  } else {
    items.push('...');
    items.push(...range(cur - 1, cur + 1));
    last = cur + 1;
  }
  if (last < total) { items.push('...'); items.push(total); }
  return items;
}

function createPgBtn(n) {
  const btn = document.createElement('button');
  btn.className = `pg-btn${n === state.page ? ' on' : ''}`;
  btn.textContent = n;
  btn.addEventListener('click', () => { state.page = n; loadLibrary(); });
  return btn;
}

function updateStatusBar() {
  const now = new Date();
  $('#sbTime').textContent = now.toLocaleString('zh-CN');
  $('#sbCount').textContent = `共 ${$('#stCount').textContent} 首`;
  $('#sbDir').textContent = state.audioDir || '未设置目录';
}

/* ---------- edit modal ---------- */
let editingId = null;

function openEdit(id) {
  editingId = id;
  $('#ovEdit').classList.add('show');
  $('#eTitle').value = '';
  $('#eArtist').value = '';
  $('#eAlbum').value = '';
  $('#editPath').textContent = '';

  apiGet('/audio/search', { page: 1, page_size: 1000 }).then((res) => {
    if (res.code === 0 && res.data && res.data.audio_list) {
      const item = res.data.audio_list.find((a) => a.id === id);
      if (item) {
        $('#eTitle').value = item.title || '';
        $('#eArtist').value = item.artist || '';
        $('#eAlbum').value = item.album || '';
        $('#editPath').textContent = item.file_path || '';
      }
    }
  }).catch(() => {});
}

function closeEdit() {
  $('#ovEdit').classList.remove('show');
  editingId = null;
}

$('#btnEditCancel').addEventListener('click', closeEdit);
$('#ovEdit').addEventListener('click', (e) => { if (e.target === $('#ovEdit')) closeEdit(); });

$('#editForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = $('#eTitle').value.trim();
  if (!title) { $('#eTitle').classList.add('shake'); setTimeout(() => $('#eTitle').classList.remove('shake'), 600); return; }

  try {
    const res = await apiPost('/audio/update', {
      id: editingId,
      title: title,
      artist: $('#eArtist').value.trim(),
      album: $('#eAlbum').value.trim(),
    });
    if (res.code === 0) {
      showToast('保存成功');
      closeEdit();
      loadLibrary();
    } else {
      showToast(res.message || '保存失败', 'warn');
    }
  } catch (e) {
    showToast('保存失败: ' + e.message, 'err');
  }
});

/* ---------- confirm modal ---------- */
let confirmCb = null;

function confirmAction(action, id) {
  const titles = { delete: '删除歌曲', restore: '恢复歌曲', purge: '永久删除' };
  const msgs = { delete: '确定要将此歌曲移至回收站吗？', restore: '确定要恢复此歌曲吗？', purge: '此操作不可撤销，确定要永久删除吗？' };
  $('#cTitle').textContent = titles[action] || '确认操作';
  $('#cMsg').textContent = msgs[action] || '';

  confirmCb = async () => {
    try {
      if (action === 'delete') {
        const res = await apiDelete('/audio/delete', { ids: [id] });
        if (res.code === 0) { showToast('已移至回收站'); loadLibrary(); }
        else showToast(res.message || '删除失败', 'warn');
      } else if (action === 'restore') {
        const res = await apiPost('/audio/restore', { ids: [id] });
        if (res.code === 0) { showToast('已恢复'); loadLibrary(); }
        else showToast(res.message || '恢复失败', 'warn');
      } else if (action === 'purge') {
        const res = await apiDelete('/audio/delete', { ids: [id] });
        if (res.code === 0) { showToast('已永久删除'); loadLibrary(); }
        else showToast(res.message || '删除失败', 'warn');
      }
    } catch (e) {
      showToast('操作失败: ' + e.message, 'err');
    }
    closeConfirm();
  };

  $('#ovConfirm').classList.add('show');
}

function closeConfirm() {
  $('#ovConfirm').classList.remove('show');
  confirmCb = null;
}

$('#btnConfirmCancel').addEventListener('click', closeConfirm);
$('#btnConfirmOk').addEventListener('click', () => { if (confirmCb) confirmCb(); });
$('#ovConfirm').addEventListener('click', (e) => { if (e.target === $('#ovConfirm')) closeConfirm(); });

/* ---------- keyboard shortcuts ---------- */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeEdit();
    closeConfirm();
  }
  if (e.key === '/' && document.activeElement === document.body) {
    e.preventDefault();
    const si = $('#searchInput');
    if (si && !$('#screenLib').classList.contains('hidden')) si.focus();
  }
});

/* ---------- event bindings ---------- */
function bindEvents() {
  $('#btnTheme').addEventListener('click', toggleTheme);
  $('#btnTheme2').addEventListener('click', toggleTheme);

  $('#cardAudio').addEventListener('click', () => {
    if (state.audioDir) {
      showScreen('screenLib');
      loadLibrary();
    } else {
      showScreen('screenSetup');
      initSetup();
    }
  });

  $('#btnSetupHome').addEventListener('click', () => { showScreen('screenHome'); loadHomeStatus(); });
  $('#btnHome').addEventListener('click', () => { showScreen('screenHome'); loadHomeStatus(); });

  $('#btnRescan').addEventListener('click', () => {
    showScreen('screenSetup');
    if (state.audioDir) {
      $('#dirInput').value = state.audioDir;
      $('#btnStart').disabled = false;
    }
    initSetup();
  });

  $('#sbDir').addEventListener('click', () => {
    showScreen('screenSetup');
    if (state.audioDir) $('#dirInput').value = state.audioDir;
    initSetup();
  });

  $$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach((t) => t.classList.remove('on'));
      tab.classList.add('on');
      state.currentTab = tab.dataset.tab;
      state.page = 1;
      loadLibrary();
    });
  });

  $('#pgSize').addEventListener('change', () => {
    state.pageSize = parseInt($('#pgSize').value);
    state.page = 1;
    loadLibrary();
  });

  $('#scopeSeg').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
      $$('#scopeSeg button').forEach((b) => b.classList.remove('on'));
      e.target.classList.add('on');
      state.scope = e.target.dataset.scope;
      state.page = 1;
      loadLibrary();
    }
  });

  let searchTimer;
  $('#searchInput').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.searchTerm = $('#searchInput').value.trim();
      state.page = 1;
      loadLibrary();
    }, 350);
  });

  $$('#thead th.sortable').forEach((th) => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (state.sortBy === field) {
        state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortBy = field;
        state.sortOrder = 'asc';
      }
      $$('#thead th').forEach((t) => { t.classList.remove('asc', 'desc'); });
      th.classList.add(state.sortOrder);
      state.page = 1;
      loadLibrary();
    });
  });

  $$('.mod-locked').forEach((card) => {
    card.addEventListener('click', () => {
      card.classList.add('shake');
      setTimeout(() => card.classList.remove('shake'), 350);
      showToast('该模块即将上线，敬请期待', 'warn');
    });
  });
}

/* ---------- init ---------- */
function init() {
  initTheme();
  bindEvents();
  loadHomeStatus();
}

document.addEventListener('DOMContentLoaded', init);