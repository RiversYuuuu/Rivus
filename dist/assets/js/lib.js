/* ============================================================
   Rivus - 流集 · 音频管理
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

    Batch.refreshAfterLoad(pag.total || 0);
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
    <tr class="song-row" data-id="${id}" data-lyric="${a.lyric_path ? '1' : '0'}" data-ext="${a.file_ext || ''}" style="--d:${i * 30}">
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
          <div class="act-dropdown">
            <button class="act-btn a-download" data-id="${id}" title="下载"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
            <div class="dropdown-menu">
              <button class="dropdown-item" data-action="download-audio" data-id="${id}" data-title="${esc(title)}" data-ext="${a.file_ext || ''}"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>下载音频</button>
              <button class="dropdown-item${a.lyric_path ? '' : ' disabled'}" data-action="download-lyric" data-id="${id}" data-title="${esc(title)}"${a.lyric_path ? '' : ' disabled'}><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>下载歌词</button>
            </div>
          </div>
          <div class="act-dropdown">
            <button class="act-btn a-edit" data-id="${id}" title="编辑"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>
            <div class="dropdown-menu">
              <button class="dropdown-item" data-action="upload-lyric" data-id="${id}"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>歌词管理</button>
              <button class="dropdown-item" data-action="edit" data-id="${id}"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>编辑元信息</button>
            </div>
          </div>
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
      else if (action === 'download-audio') downloadSong(id, btn.dataset.title, btn.dataset.ext);
      else if (action === 'download-lyric') downloadLyric(id, btn.dataset.title);
      else if (action === 'upload-lyric') uploadLyric(id);
    });
  });

  tbody.querySelectorAll('.act-dropdown').forEach((dd) => {
    const menu = dd.querySelector('.dropdown-menu');
    const row = dd.closest('.song-row');
    dd.addEventListener('mouseenter', () => {
      document.querySelectorAll('.dropdown-menu.open').forEach((m) => { if (m !== menu) { m.classList.remove('open'); m.closest('.song-row')?.classList.remove('dropdown-active'); } });
      menu.classList.add('open');
      row?.classList.add('dropdown-active');
    });
    dd.addEventListener('mouseleave', () => {
      menu.classList.remove('open');
      row?.classList.remove('dropdown-active');
    });
  });

  tbody.querySelectorAll('.dropdown-item').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const id = parseInt(btn.dataset.id);
      document.querySelectorAll('.dropdown-menu.open').forEach((m) => { m.classList.remove('open'); m.closest('.song-row')?.classList.remove('dropdown-active'); });
      if (action === 'edit') openEdit(id);
      else if (action === 'download-audio') downloadSong(id, btn.dataset.title, btn.dataset.ext);
      else if (action === 'download-lyric') downloadLyric(id, btn.dataset.title);
      else if (action === 'upload-lyric') uploadLyric(id);
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

function downloadLyric(id, title) {
  const filename = title ? `${title}.lrc` : `lyric_${id}.lrc`;
  const a = document.createElement('a');
  a.href = `/audio/lyric/source?id=${id}`;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function uploadLyric(id) {
  openLyricModal(id);
}

let lyricModalId = null;

function openLyricModal(id) {
  lyricModalId = id;
  const row = document.querySelector(`.song-row[data-id="${id}"]`);
  const title = row ? (row.querySelector('.tt')?.textContent || '') : '';
  const hasLyric = row ? row.dataset.lyric === '1' : false;
  $('#lyricSongName').textContent = title || `ID: ${id}`;
  showLyricActions(hasLyric);
  $('#ovLyric').classList.add('show');
}

function closeLyricModal() {
  $('#ovLyric').classList.remove('show');
  lyricModalId = null;
}

function showLyricActions(hasLyric) {
  $('#lyricActions').classList.remove('hidden');
  $('#lyricPreview').classList.add('hidden');
  $('#btnLyricConfirm').classList.add('hidden');
  if (hasLyric) {
    $('#btnLyricEdit').classList.remove('hidden');
  } else {
    $('#btnLyricEdit').classList.add('hidden');
  }
}

function showLyricPreview(text) {
  $('#lyricActions').classList.add('hidden');
  $('#lyricPreviewText').value = text;
  $('#lyricPreview').classList.remove('hidden');
  $('#btnLyricConfirm').classList.remove('hidden');
}

function doUploadLyric(id) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.lrc';
  input.style.display = 'none';
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('id', id);
      fd.append('file', file);
      const res = await fetch('/audio/lyric/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.code === 0) { showToast('歌词上传成功'); closeLyricModal(); }
      else showToast(data.message || '歌词上传失败', 'warn');
    } catch (e) {
      showToast('歌词上传失败: ' + e.message, 'err');
    }
    document.body.removeChild(input);
  });
  document.body.appendChild(input);
  input.click();
}

async function doFetchLyric(id) {
  const btn = $('#btnLyricFetch');
  const origHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spin" style="width:16px;height:16px;border-width:2px"></span> 搜索中…';
  try {
    const res = await apiGet('/audio/lyric/fetch', { id: id });
    if (res.code === 0 && res.data && res.data.synced_lyrics) {
      showLyricPreview(res.data.synced_lyrics);
    } else {
      showToast(res.message || '未找到歌词', 'warn');
    }
  } catch (e) {
    showToast('歌词搜索失败: ' + e.message, 'err');
  } finally {
    btn.disabled = false;
    btn.innerHTML = origHTML;
  }
}

async function doEditLyric(id) {
  const btn = $('#btnLyricEdit');
  const origHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spin" style="width:16px;height:16px;border-width:2px"></span> 加载中…';
  try {
    const res = await fetch(`/audio/lyric/source?id=${id}`);
    if (!res.ok) {
      showToast('加载歌词失败', 'warn');
      return;
    }
    const text = await res.text();
    showLyricPreview(text);
  } catch (e) {
    showToast('加载歌词失败: ' + e.message, 'err');
  } finally {
    btn.disabled = false;
    btn.innerHTML = origHTML;
  }
}

async function doConfirmLyric(id) {
  const editedText = $('#lyricPreviewText').value.trim();
  if (!editedText) return;
  const btn = $('#btnLyricConfirm');
  btn.disabled = true;
  btn.textContent = '上传中…';
  try {
    const blob = new Blob([editedText], { type: 'text/plain' });
    const file = new File([blob], 'lyric.lrc', { type: 'text/plain' });
    const fd = new FormData();
    fd.append('id', id);
    fd.append('file', file);
    const res = await fetch('/audio/lyric/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.code === 0) { showToast('歌词上传成功'); closeLyricModal(); }
    else showToast(data.message || '歌词上传失败', 'warn');
  } catch (e) {
    showToast('歌词上传失败: ' + e.message, 'err');
  } finally {
    btn.disabled = false;
    btn.textContent = '确认上传';
  }
}

/* ---------- keyboard shortcuts ---------- */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeEdit();
    closeLyricModal();
    closeConfirm();
    closeSyncModal();
    closeBatchResult();
    if ($('#ovBatchLyric').classList.contains('show')) {
      BatchLyricSearch._cancelAll();
    }
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
    leavePage('/audiopage/setting');
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

  $('#btnScrape').addEventListener('click', async () => {
    if (!editingId) return;
    const btn = $('#btnScrape');
    const origHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spin" style="width:16px;height:16px;border-width:2px"></span> 识别中…';
    try {
      const res = await apiGet('/audio/scrape', { id: editingId });
      if (res.code === 0 && res.data) {
        if (res.data.title) $('#eTitle').value = res.data.title;
        if (res.data.artist) $('#eArtist').value = res.data.artist;
        if (res.data.album) $('#eAlbum').value = res.data.album;
        showToast('智能识别成功');
      } else {
        showToast(res.message || '智能识别失败', 'warn');
      }
    } catch (e) {
      showToast('智能识别失败: ' + e.message, 'err');
    } finally {
      btn.disabled = false;
      btn.innerHTML = origHTML;
    }
  });

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

  $('#btnLyricCancel').addEventListener('click', closeLyricModal);
  $('#ovLyric').addEventListener('click', (e) => { if (e.target === $('#ovLyric')) closeLyricModal(); });
  $('#btnLyricUpload').addEventListener('click', () => { if (lyricModalId) doUploadLyric(lyricModalId); });
  $('#btnLyricFetch').addEventListener('click', () => { if (lyricModalId) doFetchLyric(lyricModalId); });
  $('#btnLyricEdit').addEventListener('click', () => { if (lyricModalId) doEditLyric(lyricModalId); });
  $('#btnLyricConfirm').addEventListener('click', () => { if (lyricModalId) doConfirmLyric(lyricModalId); });

  $$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach((t) => t.classList.remove('on'));
      tab.classList.add('on');
      state.currentTab = tab.dataset.tab;
      state.page = 1;
      if (Batch.active) Batch.exit();
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

/* ---------- sync modal ---------- */
const syncState = {
  step: 1,
  connected: false,
  ip: '',
  port: 2121,
  username: '',
  password: '',
  directory: '/',
  dirHistory: ['/'],
  allDirs: [],
  toUpload: [],
  toDownload: [],
  selectedUpload: new Set(),
  selectedDownload: new Set(),
  activeTab: 'upload',
  compareType: 'audio',
};

function openSyncModal(compareType) {
  syncState.step = 1;
  syncState.connected = false;
  syncState.directory = '/';
  syncState.dirHistory = ['/'];
  syncState.toUpload = [];
  syncState.toDownload = [];
  syncState.selectedUpload = new Set();
  syncState.selectedDownload = new Set();
  syncState.activeTab = 'upload';
  syncState.compareType = compareType || 'audio';
  $('#ovSync').classList.add('show');
  $('#syncIp').value = '';
  $('#syncPort').value = '2121';
  $('#syncUser').value = 'Admin';
  $('#syncPass').value = '';
  $('#syncConnStatus').textContent = '';
  $('#syncConnStatus').className = 'sync-conn-status';
  $('#syncSubtitle').textContent = syncState.compareType === 'image'
    ? '连接远程 FTP 服务器，同步图片文件'
    : '连接远程 FTP 服务器，同步音频文件';
  renderSyncStep();
}

function closeSyncModal() {
  $('#ovSync').classList.remove('show');
}

function renderSyncStep() {
  const step = syncState.step;

  for (let i = 1; i <= 4; i++) {
    const el = $(`#syncStep${i}`);
    el.classList.remove('active', 'done');
    if (i < step) el.classList.add('done');
    if (i === step) el.classList.add('active');
  }

  for (let i = 1; i <= 4; i++) {
    $(`#syncPanel${i}`).classList.toggle('hidden', i !== step);
  }

  $('#btnSyncTest').classList.toggle('hidden', step !== 1);
  $('#btnSyncPrev').classList.toggle('hidden', step === 1);
  $('#btnSyncNext').classList.toggle('hidden', step !== 2);
  $('#btnSyncCompare').classList.toggle('hidden', step !== 3);
  $('#btnSyncExecute').classList.toggle('hidden', step !== 3);
  $('#btnSyncDone').classList.toggle('hidden', step !== 4);

  const subtitles = {
    1: '连接远程 FTP 服务器，同步音频文件',
    2: '选择远程 FTP 上的音频目录',
    3: '对比本地与远程文件差异',
    4: '执行文件同步操作',
  };
  $('#syncSubtitle').textContent = subtitles[step] || '';

  if (step === 2) {
    loadSyncDirs(syncState.directory);
  }
}

function getSyncCreds() {
  return {
    ip: $('#syncIp').value.trim(),
    port: parseInt($('#syncPort').value) || 2121,
    username: $('#syncUser').value.trim(),
    password: $('#syncPass').value,
  };
}

async function testSyncConnection() {
  const { ip, port, username, password } = getSyncCreds();
  if (!ip) {
    showToast('请填写 FTP 地址', 'warn');
    return;
  }

  const btn = $('#btnSyncTest');
  const origHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spin" style="width:14px;height:14px;border-width:2px"></span> 连接中…';

  try {
    const res = await apiPost('/sync/test-connection', { ip, port, username, password });
    if (res.code === 0) {
      syncState.connected = true;
      syncState.ip = ip;
      syncState.port = port;
      syncState.username = username;
      syncState.password = password;
      $('#syncConnStatus').textContent = '✓ 连接成功';
      $('#syncConnStatus').className = 'sync-conn-status ok';
      showToast('FTP 连接成功');
      syncState.step = 2;
      renderSyncStep();
    } else {
      syncState.connected = false;
      $('#syncConnStatus').textContent = '✗ 连接失败: ' + (res.message || '未知错误');
      $('#syncConnStatus').className = 'sync-conn-status fail';
    }
  } catch (e) {
    syncState.connected = false;
    $('#syncConnStatus').textContent = '✗ 连接失败: ' + e.message;
    $('#syncConnStatus').className = 'sync-conn-status fail';
  } finally {
    btn.disabled = false;
    btn.innerHTML = origHTML;
  }
}

function renderSyncBreadcrumb(directory) {
  const bc = $('#syncBreadcrumb');
  const segments = directory === '/' ? [''] : directory.split('/');
  const MAX_SHOW = 4;

  let html = '';
  const len = segments.length;

  if (len <= MAX_SHOW) {
    segments.forEach((seg, i) => {
      const path = i === 0 ? '/' : segments.slice(0, i + 1).join('/');
      const label = i === 0 ? '/' : seg;
      const isCurrent = i === len - 1;
      if (i > 0) html += '<span class="sync-bc-sep">›</span>';
      html += `<span class="sync-bc-item${isCurrent ? ' current' : ''}" data-path="${esc(path)}">${esc(label)}</span>`;
    });
  } else {
    const firstPath = '/';
    html += `<span class="sync-bc-item" data-path="/">/</span>`;
    html += '<span class="sync-bc-sep">›</span>';
    html += '<span class="sync-bc-ellipsis" title="展开中间路径">…</span>';
    html += '<span class="sync-bc-sep">›</span>';
    const lastSeg = segments[len - 1];
    html += `<span class="sync-bc-item current" data-path="${esc(directory)}">${esc(lastSeg)}</span>`;
  }

  bc.innerHTML = html;

  bc.querySelectorAll('.sync-bc-item:not(.current)').forEach(item => {
    item.addEventListener('click', () => {
      const path = item.dataset.path;
      const idx = syncState.dirHistory.indexOf(path);
      if (idx >= 0) {
        syncState.dirHistory = syncState.dirHistory.slice(0, idx + 1);
      } else {
        syncState.dirHistory.push(path);
      }
      loadSyncDirs(path);
    });
  });

  const ellipsis = bc.querySelector('.sync-bc-ellipsis');
  if (ellipsis) {
    ellipsis.addEventListener('click', () => {
      let fullHtml = '';
      segments.forEach((seg, i) => {
        const path = i === 0 ? '/' : segments.slice(0, i + 1).join('/');
        const label = i === 0 ? '/' : seg;
        const isCurrent = i === len - 1;
        if (i > 0) fullHtml += '<span class="sync-bc-sep">›</span>';
        fullHtml += `<span class="sync-bc-item${isCurrent ? ' current' : ''}" data-path="${esc(path)}">${esc(label)}</span>`;
      });
      bc.innerHTML = fullHtml;
      bc.querySelectorAll('.sync-bc-item:not(.current)').forEach(item => {
        item.addEventListener('click', () => {
          const path = item.dataset.path;
          const idx = syncState.dirHistory.indexOf(path);
          if (idx >= 0) {
            syncState.dirHistory = syncState.dirHistory.slice(0, idx + 1);
          } else {
            syncState.dirHistory.push(path);
          }
          loadSyncDirs(path);
        });
      });
    });
  }
}

async function loadSyncDirs(directory) {
  syncState.directory = directory;
  renderSyncBreadcrumb(directory);
  $('#syncDirFilter').value = '';
  const list = $('#syncDirList');
  list.innerHTML = '<div class="sync-dir-loading"><span class="spin" style="width:14px;height:14px;border-width:2px"></span> 加载中...</div>';

  try {
    const res = await apiGet('/sync/browse', {
      directory,
      ip: syncState.ip,
      port: syncState.port,
      username: syncState.username,
      password: syncState.password,
    });

    if (res.code === 0 && res.data && res.data.dirs) {
      syncState.allDirs = res.data.dirs;
      renderSyncDirList('');
    } else {
      syncState.allDirs = [];
      list.innerHTML = '<div class="sync-dir-empty">加载失败: ' + (res.message || '未知错误') + '</div>';
    }
  } catch (e) {
    syncState.allDirs = [];
    list.innerHTML = '<div class="sync-dir-empty">加载失败: ' + e.message + '</div>';
  }
}

function renderSyncDirList(filter) {
  const list = $('#syncDirList');
  const directory = syncState.directory;
  const keyword = filter.toLowerCase();
  const dirs = keyword ? syncState.allDirs.filter(d => d.toLowerCase().includes(keyword)) : syncState.allDirs;

  if (dirs.length === 0) {
    list.innerHTML = '<div class="sync-dir-empty">' + (keyword ? '无匹配目录' : '该目录下无子目录') + '</div>';
    return;
  }

  list.innerHTML = dirs.map(d => `
    <div class="sync-dir-item" data-dir="${esc(d)}">
      <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
      ${esc(d)}
    </div>
  `).join('');

  list.querySelectorAll('.sync-dir-item').forEach(item => {
    item.addEventListener('click', () => {
      const dir = item.dataset.dir;
      const newPath = directory === '/' ? '/' + dir : directory + '/' + dir;
      syncState.dirHistory.push(newPath);
      loadSyncDirs(newPath);
    });
  });
}

async function doSyncCompare() {
  $('#syncCompareLoading').classList.remove('hidden');
  $('#syncCompareResult').classList.add('hidden');
  syncState.step = 3;
  renderSyncStep();

  try {
    const res = await apiPost('/sync/compare', {
      ip: syncState.ip,
      port: syncState.port,
      username: syncState.username,
      password: syncState.password,
      directory: syncState.directory,
      compare_type: syncState.compareType,
    });

    $('#syncCompareLoading').classList.add('hidden');

    if (res.code === 0 && res.data) {
      const data = res.data;
      const toUpload = data.to_upload || [];
      const toDownload = data.to_download || [];
      const unchanged = data.unchanged || 0;

      syncState.toUpload = toUpload;
      syncState.toDownload = toDownload;
      syncState.selectedUpload = new Set();
      syncState.selectedDownload = new Set();
      syncState.activeTab = 'upload';

      $('#syncUploadCount').textContent = toUpload.length;
      $('#syncDownloadCount').textContent = toDownload.length;
      $('#syncUnchangedCount').textContent = unchanged;

      syncState.activeTab = 'upload';
      updateSyncDir();
      renderSyncTable();
      $('#syncDirToggle').onclick = toggleSyncDirection;

      $('#syncCompareResult').classList.remove('hidden');

      if (toUpload.length === 0 && toDownload.length === 0) {
        showToast('本地与远程完全一致，无需同步', 'ok');
      }
    } else {
      showToast('对比失败: ' + (res.message || '未知错误'), 'warn');
      syncState.step = 2;
      renderSyncStep();
    }
  } catch (e) {
    $('#syncCompareLoading').classList.add('hidden');
    showToast('对比失败: ' + e.message, 'err');
    syncState.step = 2;
    renderSyncStep();
  }
}

function toggleSyncDirection() {
  syncState.activeTab = syncState.activeTab === 'upload' ? 'download' : 'upload';
  updateSyncDir();
  renderSyncTable();
}

function updateSyncDir() {
  const isUpload = syncState.activeTab === 'upload';
  const left = $('#syncDirLeft');
  const right = $('#syncDirRight');

  const pcSvg = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>';
  const serverSvg = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>';

  left.innerHTML = (isUpload ? pcSvg : serverSvg) + (isUpload ? '本地' : 'FTP服务器');
  right.innerHTML = (isUpload ? serverSvg : pcSvg) + (isUpload ? 'FTP服务器' : '本地');
  left.classList.add('active');
  right.classList.remove('active');
}

function renderSyncTable() {
  const type = syncState.activeTab;
  const files = type === 'upload' ? syncState.toUpload : syncState.toDownload;
  const selectedSet = type === 'upload' ? syncState.selectedUpload : syncState.selectedDownload;
  const items = $('#syncFileItems');
  const checkAllBtn = $('#syncCheckAll');

  if (files.length === 0) {
    items.innerHTML = '<div class="sync-file-empty">暂无文件</div>';
    checkAllBtn.dataset.state = 'none';
    $('#syncSelectedHint').innerHTML = '已选 <b>0</b> / <b>0</b>';
    return;
  }

  items.innerHTML = files.map((f) => {
    const displayName = f.split(/[/\\]/).pop();
    const isChecked = selectedSet.has(f);
    return `
      <label class="sync-file-item">
        <button class="sync-row-check${isChecked ? ' checked' : ''}" data-path="${esc(f)}" type="button">
          <svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3.5 8 6.5 11 12.5 5"/></svg>
        </button>
        <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        <span class="sync-file-name" title="${esc(f)}">${esc(displayName)}</span>
      </label>
    `;
  }).join('');

  updateSyncCheckAllState();

  checkAllBtn.onclick = function () {
    const state = this.dataset.state;
    if (state === 'all') {
      selectedSet.clear();
    } else {
      selectedSet.clear();
      files.forEach(f => selectedSet.add(f));
    }
    items.querySelectorAll('.sync-row-check').forEach(btn => {
      btn.classList.toggle('checked', selectedSet.has(btn.dataset.path));
    });
    updateSyncCheckAllState();
  };

  items.querySelectorAll('.sync-row-check').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const path = btn.dataset.path;
      if (selectedSet.has(path)) {
        selectedSet.delete(path);
        btn.classList.remove('checked');
      } else {
        selectedSet.add(path);
        btn.classList.add('checked');
      }
      updateSyncCheckAllState();
    });
  });
}

function updateSyncCheckAllState() {
  const type = syncState.activeTab;
  const files = type === 'upload' ? syncState.toUpload : syncState.toDownload;
  const selectedSet = type === 'upload' ? syncState.selectedUpload : syncState.selectedDownload;
  const checkAllBtn = $('#syncCheckAll');
  const hint = $('#syncSelectedHint');
  const checkedCount = selectedSet.size;

  if (checkedCount === 0) {
    checkAllBtn.dataset.state = 'none';
  } else if (checkedCount === files.length) {
    checkAllBtn.dataset.state = 'all';
  } else {
    checkAllBtn.dataset.state = 'some';
  }
  hint.innerHTML = '已选 <b>' + checkedCount + '</b> / <b>' + files.length + '</b>';
}

async function doSyncExecute() {
  const selectedUpload = Array.from(syncState.selectedUpload);
  const selectedDownload = Array.from(syncState.selectedDownload);

  if (selectedUpload.length === 0 && selectedDownload.length === 0) {
    showToast('请至少选择一个文件进行同步', 'warn');
    return;
  }

  const btn = $('#btnSyncExecute');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin" style="width:14px;height:14px;border-width:2px"></span> 执行中…';

  syncState.step = 4;
  renderSyncStep();
  $('#syncExecuteStatus').classList.remove('hidden');
  $('#syncExecuteDone').classList.add('hidden');

  try {
    const res = await apiPost('/sync/execute', {
      ip: syncState.ip,
      port: syncState.port,
      username: syncState.username,
      password: syncState.password,
      directory: syncState.directory,
      compare_type: syncState.compareType,
      to_upload: selectedUpload,
      to_download: selectedDownload,
    });

    $('#syncExecuteStatus').classList.add('hidden');
    $('#syncExecuteDone').classList.remove('hidden');

    if (res.code === 0) {
      const upCount = selectedUpload.length;
      const dlCount = selectedDownload.length;
      $('#syncExecuteSummary').textContent = `已上传 ${upCount} 个文件，下载 ${dlCount} 个文件`;
      showToast('同步完成');

      if (syncState.compareType === 'image' && typeof loadImages === 'function') {
        if (dlCount > 0) {
          await apiGet('/image/scan');
        }
        loadImages();
      } else if (typeof loadLibrary === 'function') {
        if (dlCount > 0) {
          await apiGet('/audio/scan');
        }
        loadLibrary();
      }
    } else {
      $('#syncExecuteSummary').textContent = '同步失败: ' + (res.message || '未知错误');
      showToast('同步失败: ' + (res.message || '未知错误'), 'warn');
    }
  } catch (e) {
    $('#syncExecuteStatus').classList.add('hidden');
    $('#syncExecuteDone').classList.remove('hidden');
    $('#syncExecuteSummary').textContent = '同步失败: ' + e.message;
    showToast('同步失败: ' + e.message, 'err');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '执行同步';
  }
}

function bindSyncEvents() {
  const btnSync = $('#btnSync');
  if (btnSync) btnSync.addEventListener('click', () => openSyncModal('audio'));
  $('#btnSyncClose').addEventListener('click', closeSyncModal);
  $('#ovSync').addEventListener('click', (e) => { if (e.target === $('#ovSync')) closeSyncModal(); });

  $('#btnSyncTest').addEventListener('click', testSyncConnection);
  $('#btnSyncPrev').addEventListener('click', () => {
    if (syncState.step > 1) {
      syncState.step--;
      renderSyncStep();
    }
  });
  $('#btnSyncNext').addEventListener('click', () => {
    syncState.step = 3;
    doSyncCompare();
  });
  $('#btnSyncCompare').addEventListener('click', doSyncCompare);
  $('#btnSyncExecute').addEventListener('click', doSyncExecute);
  $('#btnSyncDone').addEventListener('click', () => {
    closeSyncModal();
    if (syncState.compareType === 'image' && typeof loadImages === 'function') {
      loadImages();
    } else if (typeof loadLibrary === 'function') {
      loadLibrary();
    }
  });

  let syncDirFilterTimer;
  $('#syncDirFilter').addEventListener('input', () => {
    clearTimeout(syncDirFilterTimer);
    syncDirFilterTimer = setTimeout(() => {
      renderSyncDirList($('#syncDirFilter').value.trim());
    }, 150);
  });
}

/* ---------- batch operations ---------- */
const Batch = {
  active: false,
  selected: new Set(),
  allItems: [],
  allSongsMap: new Map(),
  totalCount: 0,

  enter() {
    this.active = true;
    this.selected.clear();
    this.allItems = [];
    this.allSongsMap.clear();
    this.totalCount = 0;
    $('#batchBar').classList.remove('hidden');
    $('#thChk').classList.remove('hidden');
    $$('#modeSeg button').forEach((b) => {
      b.classList.toggle('on', b.dataset.mode === 'batch');
    });
    this._collectItems();
    this._renderCheckboxes();
    this._updateUI();
  },

  exit() {
    this.active = false;
    this.selected.clear();
    this.allItems = [];
    this.allSongsMap.clear();
    this.totalCount = 0;
    $('#batchBar').classList.add('hidden');
    $('#thChk').classList.add('hidden');
    $$('.row-check-cell').forEach((cb) => {
      cb.classList.remove('checked');
      cb.closest('td')?.remove();
    });
    this._updateCheckAllBtn(0, 0);
    $$('#modeSeg button').forEach((b) => {
      b.classList.toggle('on', b.dataset.mode === 'play');
    });
  },

  toggleItem(id) {
    if (this.selected.has(id)) {
      this.selected.delete(id);
    } else {
      this.selected.add(id);
    }
    this._updateUI();
  },

  togglePageAll() {
    const pageAllSelected = this.allItems.every((item) => this.selected.has(item.id));
    if (pageAllSelected) {
      this.allItems.forEach((item) => this.selected.delete(item.id));
    } else {
      this.allItems.forEach((item) => this.selected.add(item.id));
    }
    this._updateUI();
  },

  async toggleAll() {
    if (this.selected.size > 0 && this.selected.size === this.totalCount && this.totalCount > 0) {
      this.selected.clear();
      this._updateUI();
      return;
    }

    const btn = $('#btnBatchCheckAll');
    btn.disabled = true;

    try {
      const searchParams = {};
      if (state.searchTerm) {
        if (state.scope === 'all' || state.scope === 'title') searchParams.title = state.searchTerm;
        if (state.scope === 'all' || state.scope === 'artist') searchParams.artist = state.searchTerm;
        if (state.scope === 'all' || state.scope === 'album') searchParams.album = state.searchTerm;
      }
      const list = await _fetchAllRaw(searchParams);
      this.allSongsMap.clear();
      this.totalCount = list.length;
      list.forEach((a) => {
        const item = {
          id: a.id,
          title: a.title || '未知歌曲',
          artist: a.artist || '未知歌手',
          ext: (a.file_ext || '').toUpperCase(),
          hasLyric: !!a.lyric_path,
        };
        this.allSongsMap.set(a.id, item);
        this.selected.add(a.id);
      });
      this._updateUI();
    } catch (e) {
      showToast('获取歌曲列表失败', 'err');
    } finally {
      btn.disabled = false;
    }
  },

  _getSearchHint() {
    if (!state.searchTerm) return '全选所有';
    const scopeNames = { all: '全部', title: '歌名', artist: '歌手', album: '专辑' };
    return `全选「${scopeNames[state.scope] || '全部'}」含"${state.searchTerm}"`;
  },

  _collectItems() {
    const rows = $$('#tbody .song-row');
    this.allItems = [];
    rows.forEach((row) => {
      const id = parseInt(row.dataset.id);
      const title = row.querySelector('.tt')?.textContent || '';
      const artist = row.querySelector('.c-artist')?.textContent || '';
      const ext = row.dataset.ext || '';
      const hasLyric = row.dataset.lyric === '1';
      this.allItems.push({ id, title, artist, ext, hasLyric });
    });
    if (this.totalCount === 0) {
      this.totalCount = this.allItems.length;
    }
  },

  _renderCheckboxes() {
    const rows = $$('#tbody .song-row');
    rows.forEach((row) => {
      const existing = row.querySelector('.c-chk-cell');
      if (existing) return;
      const td = document.createElement('td');
      td.className = 'c-chk-cell';
      const id = parseInt(row.dataset.id);
      const checked = this.selected.has(id);
      td.innerHTML = `<button class="row-check-cell${checked ? ' checked' : ''}" data-id="${id}">
        <svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3.5 8 6.5 11 12.5 5"/></svg>
      </button>`;
      row.insertBefore(td, row.firstChild);
      td.querySelector('.row-check-cell').addEventListener('click', () => {
        this.toggleItem(id);
      });
    });
  },

  _updateUI() {
    const count = this.selected.size;
    const pageSelectedCount = this.allItems.filter((item) => this.selected.has(item.id)).length;
    const pageTotal = this.allItems.length;

    $$('.row-check-cell').forEach((cb) => {
      const id = parseInt(cb.dataset.id);
      cb.classList.toggle('checked', this.selected.has(id));
    });

    this._updateCheckAllBtn(pageSelectedCount, pageTotal);

    $('#batchCount').innerHTML = `已选 <b>${count}</b> 首`;

    const hintEl = document.querySelector('.batch-hint');
    if (hintEl) hintEl.textContent = this._getSearchHint();

    const barBtn = $('#btnBatchCheckAll');
    if (count === 0) barBtn.dataset.state = 'none';
    else if (count === this.totalCount && this.totalCount > 0) barBtn.dataset.state = 'all';
    else barBtn.dataset.state = 'some';

    const hasSelection = count > 0;
    $('#btnBatchDlSong').disabled = !hasSelection;
    $('#btnBatchDlLyric').disabled = !hasSelection;
    $('#btnBatchSearchLyric').disabled = !hasSelection;
    $('#btnBatchDelete').disabled = !hasSelection;
  },

  _updateCheckAllBtn(pageSelectedCount, pageTotal) {
    const btn = $('#btnCheckAll');
    if (!btn) return;
    if (pageTotal === 0 || pageSelectedCount === 0) {
      btn.dataset.state = 'none';
    } else if (pageSelectedCount === pageTotal) {
      btn.dataset.state = 'all';
    } else {
      btn.dataset.state = 'some';
    }
  },

  getSelectedItems() {
    if (this.allSongsMap.size > 0) {
      return [...this.selected].map((id) => this.allSongsMap.get(id)).filter(Boolean);
    }
    return this.allItems.filter((item) => this.selected.has(item.id));
  },

  refreshAfterLoad(apiTotal) {
    if (!this.active) return;
    this._collectItems();
    if (apiTotal > 0) this.totalCount = apiTotal;
    this._syncCurrentPageToMap();
    this._renderCheckboxes();
    this._updateUI();
  },

  _syncCurrentPageToMap() {
    this.allItems.forEach((item) => {
      if (!this.allSongsMap.has(item.id)) {
        this.allSongsMap.set(item.id, item);
      }
    });
  },
};

async function batchDownloadSongs() {
  const items = Batch.getSelectedItems();
  if (items.length === 0) return;

  let success = 0;
  let fail = 0;

  for (const item of items) {
    try {
      const filename = item.title ? `${item.title}.${item.ext || 'mp3'}` : `song_${item.id}.${item.ext || 'mp3'}`;
      const a = document.createElement('a');
      a.href = `/audio/source?id=${item.id}`;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      success++;
    } catch (e) {
      fail++;
    }
  }

  showBatchResult('下载歌曲完成', `共处理 ${items.length} 首歌曲`, {
    ok: success,
    skip: 0,
    fail: fail,
  });
}

async function batchDownloadLyrics() {
  const items = Batch.getSelectedItems();
  if (items.length === 0) return;

  let success = 0;
  let skip = 0;
  let fail = 0;

  for (const item of items) {
    if (!item.hasLyric) {
      skip++;
      continue;
    }
    try {
      const filename = item.title ? `${item.title}.lrc` : `lyric_${item.id}.lrc`;
      const a = document.createElement('a');
      a.href = `/audio/lyric/source?id=${item.id}`;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      success++;
    } catch (e) {
      fail++;
    }
  }

  showBatchResult('下载歌词完成', `共处理 ${items.length} 首歌曲`, {
    ok: success,
    skip: skip,
    fail: fail,
  });
}

async function batchDeleteSongs() {
  const items = Batch.getSelectedItems();
  if (items.length === 0) return;

  $('#cTitle').textContent = '批量删除';
  $('#cMsg').textContent = `确定要将 ${items.length} 首歌曲移至回收站吗？`;

  confirmCb = async () => {
    closeConfirm();
    const ids = items.map((item) => item.id);
    try {
      const res = await apiDelete('/audio/delete', { ids: ids });
      if (res.code === 0) {
        showBatchResult('删除完成', `共处理 ${items.length} 首歌曲`, {
          ok: items.length,
          skip: 0,
          fail: 0,
        });
        Batch.selected.clear();
        loadLibrary();
      } else {
        showToast(res.message || '删除失败', 'warn');
      }
    } catch (e) {
      showToast('删除失败: ' + e.message, 'err');
    }
  };

  $('#ovConfirm').classList.add('show');
}

const BatchLyricSearch = {
  items: [],
  currentIndex: 0,
  cancelled: false,
  stats: { ok: 0, skip: 0, fail: 0, skippedExisting: 0 },

  async start(items) {
    this.items = items;
    this.currentIndex = 0;
    this.cancelled = false;
    this.stats = { ok: 0, skip: 0, fail: 0, skippedExisting: 0 };

    const needSearch = items.filter((it) => !it.hasLyric).length;
    const alreadyHave = items.length - needSearch;

    $('#ovBatchLyric').classList.add('show');
    if (alreadyHave > 0) {
      $('#batchLyricSubtitle').textContent = `共 ${items.length} 首，其中 ${alreadyHave} 首已有歌词将跳过`;
    } else {
      $('#batchLyricSubtitle').textContent = `共 ${items.length} 首，逐首搜索并选择歌词`;
    }

    await this._processCurrent();
  },

  async _processCurrent() {
    if (this.cancelled) return;
    if (this.currentIndex >= this.items.length) {
      this._showDone();
      return;
    }

    const item = this.items[this.currentIndex];

    this._updateProgress();

    if (item.hasLyric) {
      this.stats.skippedExisting++;
      this.currentIndex++;
      await this._processCurrent();
      return;
    }

    $('#blSongTitle').textContent = item.title || '未知歌曲';
    $('#blSongArtist').textContent = item.artist || '未知歌手';

    $('#blLoading').classList.remove('hidden');
    $('#blNoResult').classList.add('hidden');
    $('#blPreview').classList.add('hidden');
    $('#btnBlApply').classList.add('hidden');
    $('#btnBlNext').classList.add('hidden');
    $('#btnBlDone').classList.add('hidden');
    $('#btnBlSkip').classList.remove('hidden');
    $('#btnBlCancel').classList.remove('hidden');

    try {
      const res = await apiGet('/audio/lyric/fetch', { id: item.id });
      $('#blLoading').classList.add('hidden');

      if (res.code === 0 && res.data && res.data.synced_lyrics) {
        $('#blPreviewText').value = res.data.synced_lyrics;
        $('#blPreview').classList.remove('hidden');
        $('#btnBlApply').classList.remove('hidden');
      } else {
        $('#blNoResult').classList.remove('hidden');
        this.stats.fail++;
        this._scheduleAutoNext();
        return;
      }
    } catch (e) {
      $('#blLoading').classList.add('hidden');
      $('#blNoResult').classList.remove('hidden');
      this.stats.fail++;
      this._scheduleAutoNext();
      return;
    }

    $('#btnBlNext').classList.remove('hidden');
  },

  async _applyCurrent() {
    const item = this.items[this.currentIndex];
    const editedText = $('#blPreviewText').value.trim();
    if (!editedText) {
      this.stats.fail++;
      this.currentIndex++;
      await this._processCurrent();
      return;
    }

    try {
      const blob = new Blob([editedText], { type: 'text/plain' });
      const file = new File([blob], 'lyric.lrc', { type: 'text/plain' });
      const fd = new FormData();
      fd.append('id', item.id);
      fd.append('file', file);
      const res = await fetch('/audio/lyric/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.code === 0) {
        this.stats.ok++;
      } else {
        this.stats.fail++;
      }
    } catch (e) {
      this.stats.fail++;
    }

    this.currentIndex++;
    await this._processCurrent();
  },

  _skipCurrent() {
    clearTimeout(this._autoNextTimer);
    this.stats.skip++;
    this.currentIndex++;
    this._processCurrent();
  },

  _cancelAll() {
    this.cancelled = true;
    clearTimeout(this._autoNextTimer);
    closeBatchLyricModal();
    showToast('已取消批量歌词搜索', 'warn');
  },

  _next() {
    clearTimeout(this._autoNextTimer);
    this.currentIndex++;
    this._processCurrent();
  },

  _scheduleAutoNext() {
    this._autoNextTimer = setTimeout(() => {
      if (this.cancelled) return;
      this.currentIndex++;
      this._processCurrent();
    }, 800);
  },

  _updateProgress() {
    const total = this.items.length;
    const cur = this.currentIndex + 1;
    const pct = (this.currentIndex / total) * 100;
    $('#blProgressFill').style.width = pct + '%';
    $('#blProgressText').textContent = `${cur} / ${total}`;
  },

  _showDone() {
    const total = this.items.length;
    $('#blProgressFill').style.width = '100%';
    $('#blProgressText').textContent = `${total} / ${total}`;

    $('#blSongInfo').innerHTML = '';
    $('#blOptions').innerHTML = '';

    $('#btnBlSkip').classList.add('hidden');
    $('#btnBlCancel').classList.add('hidden');
    $('#btnBlApply').classList.add('hidden');
    $('#btnBlNext').classList.add('hidden');
    $('#btnBlDone').classList.remove('hidden');

    $('#batchLyricSubtitle').textContent = '搜索完成';
  },

  close() {
    this.cancelled = true;
    clearTimeout(this._autoNextTimer);
    $('#ovBatchLyric').classList.remove('show');

    if (this.stats.ok > 0 || this.stats.skip > 0 || this.stats.fail > 0 || this.stats.skippedExisting > 0) {
      const total = this.items.length;
      showBatchResult('批量歌词搜索完成', `共处理 ${total} 首歌曲`, {
        ok: this.stats.ok,
        skip: this.stats.skip + this.stats.skippedExisting,
        fail: this.stats.fail,
      });
      loadLibrary();
    }
  },
};

function closeBatchLyricModal() {
  BatchLyricSearch.close();
}

function showBatchResult(title, msg, stats) {
  $('#batchResultTitle').textContent = title;
  $('#batchResultMsg').textContent = msg;

  const hasFail = stats.fail > 0;
  const iconEl = $('#batchResultIcon');
  iconEl.className = 'm-ic ' + (hasFail ? 'warn' : 'edit');

  let html = '';
  if (stats.ok > 0) {
    html += `<div class="batch-result-stat s-ok"><b>${stats.ok}</b><span>成功</span></div>`;
  }
  if (stats.skip > 0) {
    html += `<div class="batch-result-stat s-skip"><b>${stats.skip}</b><span>跳过</span></div>`;
  }
  if (stats.fail > 0) {
    html += `<div class="batch-result-stat s-fail"><b>${stats.fail}</b><span>失败</span></div>`;
  }
  if (!html) {
    html = `<div class="batch-result-stat s-skip"><b>${stats.ok + stats.skip + stats.fail}</b><span>无操作</span></div>`;
  }
  $('#batchResultStats').innerHTML = html;
  $('#ovBatchResult').classList.add('show');
}

function closeBatchResult() {
  $('#ovBatchResult').classList.remove('show');
}

function bindBatchEvents() {
  $$('#modeSeg button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      $$('#modeSeg button').forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      if (mode === 'batch') {
        Batch.enter();
      } else {
        Batch.exit();
      }
    });
  });

  $('#btnBatchCheckAll').addEventListener('click', () => Batch.toggleAll());
  $('#btnCheckAll').addEventListener('click', () => Batch.togglePageAll());

  $('#btnBatchDlSong').addEventListener('click', batchDownloadSongs);
  $('#btnBatchDlLyric').addEventListener('click', batchDownloadLyrics);
  $('#btnBatchDelete').addEventListener('click', batchDeleteSongs);

  $('#btnBatchSearchLyric').addEventListener('click', () => {
    const items = Batch.getSelectedItems();
    if (items.length === 0) return;
    BatchLyricSearch.start(items, true);
  });

  $('#btnBatchLyricClose').addEventListener('click', () => BatchLyricSearch._cancelAll());
  $('#ovBatchLyric').addEventListener('click', (e) => {
    if (e.target === $('#ovBatchLyric')) BatchLyricSearch._cancelAll();
  });

  $('#btnBlSkip').addEventListener('click', () => BatchLyricSearch._skipCurrent());
  $('#btnBlCancel').addEventListener('click', () => BatchLyricSearch._cancelAll());
  $('#btnBlApply').addEventListener('click', () => BatchLyricSearch._applyCurrent());
  $('#btnBlNext').addEventListener('click', () => BatchLyricSearch._next());
  $('#btnBlDone').addEventListener('click', () => closeBatchLyricModal());

  $('#btnBatchResultOk').addEventListener('click', closeBatchResult);
  $('#ovBatchResult').addEventListener('click', (e) => {
    if (e.target === $('#ovBatchResult')) closeBatchResult();
  });
}

function initLib() {
  initTheme();
  Player.init();
  bindEvents();
  bindSyncEvents();
  bindBatchEvents();
  loadLibrary();
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('screenLib')) {
    initLib();
  }
});