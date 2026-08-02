/* ============================================================
   MultiMediaManager - 流集 · 音频管理
   ============================================================ */

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
      <td class="c-idx"><span class="idx">${idx}</span><button class="idx-play" data-action="play" data-id="${id}" title="播放"><svg class="ic" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 20,12 6,21"/></svg></button><span class="play-bars"><span></span><span></span><span></span></span></td>
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
          <button class="act-btn a-purge" data-action="purge" data-id="${id}" title="彻底删除"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14"/></svg></button>
        ` : `
          <button class="act-btn a-download" data-action="download" data-id="${id}" data-title="${esc(title)}" data-ext="${a.file_ext || ''}" title="下载"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
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
      else if (action === 'download') downloadSong(id, btn.dataset.title, btn.dataset.ext);
    });
  });

  tbody.querySelectorAll('.idx-play').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      if (Player.state.currentAudio && Player.state.currentAudio.id === id) {
        Player.toggle();
        return;
      }
      const songs = await fetchAllSongs();
      const idx = songs.findIndex((s) => s.id === id);
      if (idx >= 0) {
        Player.setPlaylist(songs, idx);
      }
    });
  });
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

/* ---------- confirm modal ---------- */
let confirmCb = null;

function confirmAction(action, id) {
  const titles = { delete: '删除歌曲', restore: '恢复歌曲', purge: '彻底删除' };
  const msgs = { delete: '确定要将此歌曲移至回收站吗？', restore: '确定要恢复此歌曲吗？', purge: '此操作不可撤销，确定要彻底删除吗？' };
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
        const res = await apiDelete('/audio/delete', { ids: [id], hard: true });
        if (res.code === 0) { showToast('已彻底删除'); loadLibrary(); }
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

/* ---------- navigation ---------- */
async function navigateToSong(songId) {
  try {
    const list = await _fetchAllRaw();
    const idx = list.findIndex((a) => a.id === songId);
    if (idx < 0) return;
    const page = Math.floor(idx / state.pageSize) + 1;
    state.page = page;
    state.currentTab = 'lib';
    $$('.tab').forEach((t) => {
      t.classList.toggle('on', t.dataset.tab === 'lib');
    });
    await loadLibrary();
    if (typeof Player !== 'undefined' && Player.highlightCurrent) {
      Player.highlightCurrent();
    }
  } catch (e) {}
}

function collectCurrentSongs() {
  const rows = $$('#tbody .song-row');
  const songs = [];
  rows.forEach((row) => {
    const id = parseInt(row.dataset.id);
    const title = row.querySelector('.tt')?.textContent || '';
    const artist = row.querySelector('.c-artist')?.textContent || '';
    songs.push({ id, title, artist });
  });
  return songs;
}

function downloadSong(id, title, ext) {
  const filename = title ? `${title}.${ext || 'mp3'}` : `song_${id}.${ext || 'mp3'}`;
  const a = document.createElement('a');
  a.href = `/audio/source?id=${id}`;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ---------- keyboard shortcuts ---------- */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeEdit();
    closeConfirm();
  }
  if (e.key === '/' && document.activeElement === document.body) {
    e.preventDefault();
    const si = $('#searchInput');
    if (si) si.focus();
  }
});

/* ---------- event bindings ---------- */
function bindEvents() {
  bindThemeButtons();

  /* ----- leave page guard ----- */
  let pendingLeaveUrl = null;

  function leavePage(url) {
    if (Player && Player.state && Player.state.playing) {
      pendingLeaveUrl = url;
      $('#cTitle').textContent = '正在播放中';
      $('#cMsg').textContent = '当前有歌曲正在播放，离开页面将暂停播放。确定要离开吗？';
      confirmCb = () => {
        Player.pause();
        closeConfirm();
        window.location.href = pendingLeaveUrl;
      };
      $('#ovConfirm').classList.add('show');
      return;
    }
    window.location.href = url;
  }

  window.addEventListener('beforeunload', (e) => {
    if (Player && Player.state && Player.state.playing) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  $('#btnHome').addEventListener('click', () => {
    leavePage('/');
  });

  $('#btnRescan').addEventListener('click', () => {
    leavePage('/audiopage/init');
  });

  $('#btnUpload').addEventListener('click', () => {
    $('#fileUpload').click();
  });

  $('#fileUpload').addEventListener('change', async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let success = 0;
    let skip = 0;
    let fail = 0;

    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/audio/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.code === 0 && data.message === 'success') success++;
        else if (data.code === 1) skip++;
        else fail++;
      } catch (err) {
        fail++;
      }
    }

    if (success > 0) showToast(`成功上传 ${success} 首歌曲`);
    if (skip > 0) showToast(`${skip} 首歌曲已存在，已跳过`, 'warn');
    if (fail > 0) showToast(`${fail} 首歌曲上传失败`, 'err');

    e.target.value = '';
    if (success > 0) loadLibrary();
  });

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

  $('#btnConfirmCancel').addEventListener('click', closeConfirm);
  $('#btnConfirmOk').addEventListener('click', () => { if (confirmCb) confirmCb(); });
  $('#ovConfirm').addEventListener('click', (e) => { if (e.target === $('#ovConfirm')) closeConfirm(); });

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
}

function init() {
  initTheme();
  Player.init();
  bindEvents();
  loadLibrary();
}

document.addEventListener('DOMContentLoaded', init);