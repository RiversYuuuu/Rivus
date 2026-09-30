/* ============================================================
   Rivus - 流集 · 视频管理
   ============================================================ */

const videoState = {
  videos: [],
  binVideos: [],
  filtered: [],
  selected: new Set(),
  batchMode: false,
  isBin: false,
  currentLbIndex: -1,
  sortBy: 'date',
  sortOrder: 'desc',
  binSortBy: 'shot_at',
  binSortOrder: 'desc',
  binPage: 1,
  binPageSize: 10,
  binTotal: 0,
};

const lazyLoader = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      const img = entry.target;
      const src = img.dataset.src;
      if (src) {
        img.src = src;
        img.removeAttribute('data-src');
      }
      lazyLoader.unobserve(img);
    }
  }
}, { rootMargin: '400px' });

function videoName(video) {
  return basename(video.file_path || '');
}

function videoDate(video) {
  return video.shot_at || video.create_time || '';
}

function videoInit() {
  initTheme();
  videoBindEvents();
  loadVideos();
  loadBinCount();
}

function videoBindEvents() {
  bindThemeButtons();

  $('#btnHome').addEventListener('click', () => {
    window.location.href = '/';
  });

  $('#btnVideoSetting').addEventListener('click', () => {
    window.location.href = '/videopage/setting';
  });

  if (typeof bindSyncEvents === 'function') bindSyncEvents();

  $('#btnVideoSync').addEventListener('click', () => {
    openSyncModal('video');
  });

  $('#sortTrigger').addEventListener('click', (e) => {
    e.stopPropagation();
    $('#sortMenu').classList.toggle('hidden');
  });

  $$('#sortMenu .sort-dropdown-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const field = item.dataset.field;
      if (videoState.sortBy === field) {
        videoState.sortOrder = videoState.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        videoState.sortBy = field;
        videoState.sortOrder = 'desc';
      }
      updateSortUI();
      applyFilter();
      $('#sortMenu').classList.add('hidden');
    });
  });

  document.addEventListener('click', () => {
    $('#sortMenu').classList.add('hidden');
  });

  // Tab switching
  $$('.img-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      $$('.img-tab').forEach((t) => t.classList.remove('on'));
      tab.classList.add('on');
      if (target === 'bin') {
        videoState.isBin = true;
        videoState.batchMode = false;
        videoState.selected.clear();
        $('#btnBatchMode').innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> 批量';
        $('#btnBatchMode').classList.remove('btn-outline');
        $('#videoBatchBar').classList.remove('show');
        $('#videoBinBatchBar').classList.remove('show');
        $('#videoContent').classList.remove('batch-mode');
        $$('.video-check').forEach((el) => {
          el.classList.remove('checked');
          el.style.opacity = '0';
        });
        loadRecycleBin();
      } else {
        videoState.isBin = false;
        videoState.batchMode = false;
        videoState.selected.clear();
        $('#btnBatchMode').innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> 批量';
        $('#btnBatchMode').classList.remove('btn-outline');
        $('#videoBatchBar').classList.remove('show');
        $('#videoBinBatchBar').classList.remove('show');
        $('#videoContent').classList.remove('batch-mode');
        $$('.video-check').forEach((el) => {
          el.classList.remove('checked');
          el.style.opacity = '0';
        });
        applyFilter();
      }
    });
  });

  $('#btnBatchMode').addEventListener('click', toggleBatchMode);
  $('#btnBatchCancel').addEventListener('click', exitBatchMode);
  $('#btnBatchCheckAll').addEventListener('click', toggleSelectAll);
  $('#btnBatchDelete').addEventListener('click', batchDelete);

  // Bin batch bar events
  $('#btnBinBatchCheckAll').addEventListener('click', toggleSelectAll);
  $('#btnBinBatchCancel').addEventListener('click', exitBinBatchMode);
  $('#btnBinBatchRestore').addEventListener('click', binBatchRestore);
  $('#btnBinBatchPurge').addEventListener('click', binBatchPurge);

  $('#lbClose').addEventListener('click', closeLightbox);
  $('#lbPrev').addEventListener('click', lbPrev);
  $('#lbNext').addEventListener('click', lbNext);
  $('#lbDetailBtn').addEventListener('click', toggleDetailPanel);

  document.addEventListener('keydown', (e) => {
    if (!$('#lightbox').classList.contains('show')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') lbPrev();
    if (e.key === 'ArrowRight') lbNext();
  });

  $('#lightbox').addEventListener('click', (e) => {
    if (e.target === $('#lightbox')) closeLightbox();
  });

  $('#btnConfirmOk').addEventListener('click', videoConfirmAction);
  $('#btnConfirmCancel').addEventListener('click', videoCloseConfirm);
  $('#ovConfirm').addEventListener('click', (e) => {
    if (e.target === $('#ovConfirm')) videoCloseConfirm();
  });
}

async function loadVideos() {
  try {
    const res = await apiGet('/video/search', { page: 1, page_size: 10000 });
    if (res.code === 0 && res.data && res.data.video_list) {
      videoState.videos = res.data.video_list;
    } else {
      videoState.videos = [];
    }
  } catch (e) {
    videoState.videos = [];
  }
  if (!videoState.isBin) applyFilter();
  updateStats();
}

async function loadBinCount() {
  try {
    const res = await apiGet('/video/recyclebin', { page: 1, page_size: 1 });
    if (res.code === 0 && res.data && res.data.pagination) {
      videoState.binTotal = res.data.pagination.total || 0;
      $('#cntBin').textContent = videoState.binTotal;
    }
  } catch (e) {
    $('#cntBin').textContent = '0';
  }
}

async function loadRecycleBin() {
  try {
    const res = await apiGet('/video/recyclebin', {
      page: videoState.binPage,
      page_size: videoState.binPageSize,
      sort_by: videoState.binSortBy,
      sort_order: videoState.binSortOrder,
    });
    if (res.code === 0 && res.data) {
      videoState.binVideos = res.data.video_list || [];
      if (res.data.pagination) {
        videoState.binTotal = res.data.pagination.total || 0;
        $('#cntBin').textContent = videoState.binTotal;
      }
    } else {
      videoState.binVideos = [];
    }
  } catch (e) {
    videoState.binVideos = [];
  }
  renderBinGrid();
}

function applyFilter() {
  let list = [...videoState.videos];

  const order = videoState.sortOrder === 'asc' ? 1 : -1;
  list.sort((a, b) => {
    switch (videoState.sortBy) {
      case 'date': return order * videoDate(a).localeCompare(videoDate(b));
      case 'size': return order * ((a.file_size || 0) - (b.file_size || 0));
      case 'name': return order * videoName(a).toLowerCase().localeCompare(videoName(b).toLowerCase());
      default: return 0;
    }
  });

  videoState.filtered = list;
  renderGrid();
}

function updateSortUI() {
  const labels = { date: '日期', size: '大小', name: '名称' };
  const label = labels[videoState.sortBy] || '日期';
  const arrow = videoState.sortOrder === 'asc' ? '↑' : '↓';
  $('#sortLabel').textContent = label;
  $('#sortArrow').textContent = arrow;
  $$('#sortMenu .sort-dropdown-item').forEach((item) => {
    const active = item.dataset.field === videoState.sortBy;
    item.classList.toggle('active', active);
    const itemLabels = { date: '日期', size: '大小', name: '名称' };
    item.textContent = active ? (itemLabels[item.dataset.field] || item.dataset.field) + ' ' + arrow : (itemLabels[item.dataset.field] || item.dataset.field);
  });
}

function renderGrid() {
  const content = $('#videoContent');
  const empty = $('#videoEmpty');
  const binEmpty = $('#videoBinEmpty');
  binEmpty.classList.add('hidden');

  if (videoState.filtered.length === 0) {
    content.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');

  const groups = groupByDate(videoState.filtered);

  let html = '';
  for (const [label, videos] of groups) {
    html += `<div class="date-group">`;
    html += `<div class="date-header"><span class="date-label">${esc(label)}</span><span class="date-count">${videos.length} 个</span></div>`;
    html += `<div class="video-grid">`;
    for (const v of videos) {
      const ext = (v.file_ext || '').replace(/^\./, '').toUpperCase();
      const width = v.width || 0;
      const height = v.height || 0;
      const resolution = (width && height) ? `${width}×${height}` : '';
      const checked = videoState.selected.has(v.id) ? ' checked' : '';
      html += `<div class="video-cell" data-id="${v.id}" data-path="${esc(v.file_path || '')}">
        <div class="video-check${checked}" data-id="${v.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div class="video-actions">
          <button class="video-act delete-btn" data-id="${v.id}" title="移至回收站">
            <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M16 6v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
        <div class="video-thumb">
          <img data-src="/video/thumb?id=${v.id}" loading="lazy" alt="${esc(videoName(v))}" onerror="this.style.display='none'">
          <div class="play-icon">
            <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
          </div>
        </div>
        <div class="video-info">
          <div class="video-fname">${esc(videoName(v))}</div>
          <div class="video-meta">
            ${ext ? `<span class="vm-ext">${esc(ext)}</span>` : ''}
            ${resolution ? `<span class="vm-res">${esc(resolution)}</span>` : ''}
          </div>
        </div>
      </div>`;
    }
    html += `</div></div>`;
  }

  content.innerHTML = html;
  bindCellEvents();
  content.querySelectorAll('img[data-src]').forEach((img) => lazyLoader.observe(img));
}

function renderBinGrid() {
  const content = $('#videoContent');
  const empty = $('#videoEmpty');
  const binEmpty = $('#videoBinEmpty');
  empty.classList.add('hidden');

  if (videoState.binVideos.length === 0) {
    content.innerHTML = '';
    binEmpty.classList.remove('hidden');
    return;
  }

  binEmpty.classList.add('hidden');

  const groups = groupByDate(videoState.binVideos);

  let html = '';
  for (const [label, videos] of groups) {
    html += `<div class="date-group">`;
    html += `<div class="date-header"><span class="date-label">${esc(label)}</span><span class="date-count">${videos.length} 个</span></div>`;
    html += `<div class="video-grid">`;
    for (const v of videos) {
      const ext = (v.file_ext || '').replace(/^\./, '').toUpperCase();
      const width = v.width || 0;
      const height = v.height || 0;
      const resolution = (width && height) ? `${width}×${height}` : '';
      const checked = videoState.selected.has(v.id) ? ' checked' : '';
      html += `<div class="video-cell" data-id="${v.id}" data-path="${esc(v.file_path || '')}">
        <div class="video-check${checked}" data-id="${v.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div class="video-actions">
          <button class="video-act restore-btn" data-id="${v.id}" title="恢复">
            <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3-7.7L3 8"/><path d="M3 3v5h5"/></svg>
          </button>
          <button class="video-act purge-btn" data-id="${v.id}" title="彻底删除">
            <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14"/></svg>
          </button>
        </div>
        <div class="video-thumb">
          <img data-src="/video/thumb?id=${v.id}" loading="lazy" alt="${esc(videoName(v))}" onerror="this.style.display='none'">
          <div class="play-icon">
            <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
          </div>
        </div>
        <div class="video-info">
          <div class="video-fname">${esc(videoName(v))}</div>
          <div class="video-meta">
            ${ext ? `<span class="vm-ext">${esc(ext)}</span>` : ''}
            ${resolution ? `<span class="vm-res">${esc(resolution)}</span>` : ''}
          </div>
          ${v.delete_time ? `<div class="video-delete-time">删除于 ${esc(v.delete_time.slice(0, 10))}</div>` : ''}
        </div>
      </div>`;
    }
    html += `</div></div>`;
  }

  content.innerHTML = html;
  bindBinCellEvents();
  content.querySelectorAll('img[data-src]').forEach((img) => lazyLoader.observe(img));
}

function bindCellEvents() {
  $$('.video-cell').forEach((cell) => {
    cell.addEventListener('click', (e) => {
      if (e.target.closest('.video-check')) {
        const id = parseInt(e.target.closest('.video-check').dataset.id);
        toggleSelect(id);
        return;
      }
      if (e.target.closest('.delete-btn')) {
        e.stopPropagation();
        const id = parseInt(e.target.closest('.delete-btn').dataset.id);
        deleteVideo(id);
        return;
      }
      if (videoState.batchMode) {
        const id = parseInt(cell.dataset.id);
        toggleSelect(id);
        return;
      }
      const id = parseInt(cell.dataset.id);
      const idx = videoState.filtered.findIndex((v) => v.id === id);
      if (idx >= 0) openLightbox(idx);
    });
  });
}

function bindBinCellEvents() {
  $$('.video-cell').forEach((cell) => {
    cell.addEventListener('click', (e) => {
      if (e.target.closest('.video-check')) {
        const id = parseInt(e.target.closest('.video-check').dataset.id);
        toggleSelect(id);
        return;
      }
      if (e.target.closest('.restore-btn')) {
        e.stopPropagation();
        const id = parseInt(e.target.closest('.restore-btn').dataset.id);
        restoreVideo(id);
        return;
      }
      if (e.target.closest('.purge-btn')) {
        e.stopPropagation();
        const id = parseInt(e.target.closest('.purge-btn').dataset.id);
        purgeVideo(id);
        return;
      }
      if (videoState.batchMode) {
        const id = parseInt(cell.dataset.id);
        toggleSelect(id);
        return;
      }
    });
  });
}

function groupByDate(videos) {
  const map = new Map();
  for (const v of videos) {
    const raw = videoDate(v);
    let label = '未知日期';
    if (raw) {
      const d = raw.slice(0, 10);
      const parts = d.split('-');
      if (parts.length === 3) {
        label = `${parts[0]}年${parseInt(parts[1])}月${parseInt(parts[2])}日`;
      } else {
        label = d;
      }
    }
    if (!map.has(label)) map.set(label, []);
    map.get(label).push(v);
  }
  return map;
}

function updateStats() {
  const total = videoState.videos.length;
  let totalSize = 0;
  const exts = new Set();
  let earliest = '';
  let latest = '';

  for (const v of videoState.videos) {
    totalSize += v.file_size || 0;
    if (v.file_ext) exts.add(v.file_ext.toLowerCase());
    const raw = videoDate(v);
    if (raw) {
      const day = raw.slice(0, 10);
      if (!earliest || day < earliest) earliest = day;
      if (!latest || day > latest) latest = day;
    }
  }

  let spanDays = 0;
  if (earliest && latest) {
    spanDays = Math.floor((new Date(latest) - new Date(earliest)) / 86400000);
  }

  $('#vsCount').textContent = total;
  $('#vsSize').textContent = (totalSize / 1e9).toFixed(2);
  $('#vsFormats').textContent = exts.size;
  $('#vsDays').textContent = spanDays;
  $('#cntLib').textContent = total;
}

/* ---------- batch ---------- */
function toggleBatchMode() {
  videoState.batchMode = !videoState.batchMode;
  const btn = $('#btnBatchMode');
  if (videoState.isBin) {
    if (videoState.batchMode) {
      btn.classList.add('btn-outline');
      btn.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg> 退出批量';
      $('#videoBinBatchBar').classList.add('show');
      $('#videoContent').classList.add('batch-mode');
      $$('.video-check').forEach((el) => el.style.opacity = '1');
      $('#btnBinBatchCheckAll').dataset.state = 'none';
    } else {
      exitBinBatchMode();
    }
  } else {
    if (videoState.batchMode) {
      btn.classList.add('btn-outline');
      btn.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg> 退出批量';
      $('#videoBatchBar').classList.add('show');
      $('#videoContent').classList.add('batch-mode');
      $$('.video-check').forEach((el) => el.style.opacity = '1');
      $('#btnBatchCheckAll').dataset.state = 'none';
    } else {
      exitBatchMode();
    }
  }
}

function exitBatchMode() {
  videoState.batchMode = false;
  videoState.selected.clear();
  const btn = $('#btnBatchMode');
  btn.classList.remove('btn-outline');
  btn.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> 批量';
  $('#videoBatchBar').classList.remove('show');
  $('#videoContent').classList.remove('batch-mode');
  $$('.video-check').forEach((el) => {
    el.classList.remove('checked');
    el.style.opacity = '0';
  });
  updateBatchCount();
}

function exitBinBatchMode() {
  videoState.batchMode = false;
  videoState.selected.clear();
  const btn = $('#btnBatchMode');
  btn.classList.remove('btn-outline');
  btn.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> 批量';
  $('#videoBinBatchBar').classList.remove('show');
  $('#videoContent').classList.remove('batch-mode');
  $$('.video-check').forEach((el) => {
    el.classList.remove('checked');
    el.style.opacity = '0';
  });
  updateBinBatchCount();
}

function toggleSelect(id) {
  if (videoState.selected.has(id)) {
    videoState.selected.delete(id);
  } else {
    videoState.selected.add(id);
  }
  const checkEl = $(`.video-check[data-id="${id}"]`);
  if (checkEl) checkEl.classList.toggle('checked');
  if (videoState.isBin) {
    updateBinBatchCount();
  } else {
    updateBatchCount();
  }
}

function toggleSelectAll() {
  const list = videoState.isBin ? videoState.binVideos : videoState.filtered;
  if (videoState.selected.size === list.length) {
    videoState.selected.clear();
  } else {
    list.forEach((v) => videoState.selected.add(v.id));
  }
  $$('.video-check').forEach((el) => {
    const id = parseInt(el.dataset.id);
    el.classList.toggle('checked', videoState.selected.has(id));
  });
  if (videoState.isBin) {
    updateBinBatchCount();
  } else {
    updateBatchCount();
  }
}

function updateBatchCount() {
  $('#batchSelCount').textContent = videoState.selected.size;
  const list = videoState.filtered;
  const btn = $('#btnBatchCheckAll');
  if (!btn) return;
  if (videoState.selected.size === 0) btn.dataset.state = 'none';
  else if (videoState.selected.size === list.length) btn.dataset.state = 'all';
  else btn.dataset.state = 'some';
}

function updateBinBatchCount() {
  $('#binBatchSelCount').textContent = videoState.selected.size;
  const list = videoState.binVideos;
  const btn = $('#btnBinBatchCheckAll');
  if (!btn) return;
  if (videoState.selected.size === 0) btn.dataset.state = 'none';
  else if (videoState.selected.size === list.length) btn.dataset.state = 'all';
  else btn.dataset.state = 'some';
}

function batchDelete() {
  if (videoState.selected.size === 0) {
    showToast('请先选择视频', 'warn');
    return;
  }
  showConfirm('删除视频', `确定要删除选中的 ${videoState.selected.size} 个视频吗？`, async () => {
    try {
      const ids = Array.from(videoState.selected);
      const res = await apiDelete('/video/delete', { ids, hard: false });
      if (res.code === 0) {
        showToast(`已删除 ${ids.length} 个视频`);
        videoState.selected.clear();
        loadVideos();
        loadBinCount();
        exitBatchMode();
      } else {
        showToast('删除失败: ' + (res.message || '未知错误'), 'warn');
      }
    } catch (e) {
      showToast('删除失败: ' + e.message, 'err');
    }
  });
}

/* ---------- bin batch operations ---------- */
function binBatchRestore() {
  if (videoState.selected.size === 0) {
    showToast('请先选择视频', 'warn');
    return;
  }
  showConfirm('恢复视频', `确定要恢复选中的 ${videoState.selected.size} 个视频吗？`, async () => {
    try {
      const ids = Array.from(videoState.selected);
      const res = await apiPost('/video/restore', { ids });
      if (res.code === 0) {
        showToast(`已恢复 ${ids.length} 个视频`);
        videoState.selected.clear();
        loadBinCount();
        loadRecycleBin();
        loadVideos();
        exitBinBatchMode();
      } else {
        showToast('恢复失败: ' + (res.message || '未知错误'), 'warn');
      }
    } catch (e) {
      showToast('恢复失败: ' + e.message, 'err');
    }
  });
}

function binBatchPurge() {
  if (videoState.selected.size === 0) {
    showToast('请先选择视频', 'warn');
    return;
  }
  showConfirm('彻底删除', `确定要彻底删除选中的 ${videoState.selected.size} 个视频吗？此操作不可恢复！`, async () => {
    try {
      const ids = Array.from(videoState.selected);
      const res = await apiDelete('/video/delete', { ids, hard: true });
      if (res.code === 0) {
        showToast(`已彻底删除 ${ids.length} 个视频`);
        videoState.selected.clear();
        loadBinCount();
        loadRecycleBin();
        exitBinBatchMode();
      } else {
        showToast('删除失败: ' + (res.message || '未知错误'), 'warn');
      }
    } catch (e) {
      showToast('删除失败: ' + e.message, 'err');
    }
  });
}

/* ---------- single restore / purge ---------- */
async function restoreVideo(id) {
  showConfirm('恢复视频', '确定要恢复这个视频吗？', async () => {
    try {
      const res = await apiPost('/video/restore', { ids: [id] });
      if (res.code === 0) {
        showToast('已恢复');
        loadBinCount();
        loadRecycleBin();
        loadVideos();
      } else {
        showToast('恢复失败: ' + (res.message || '未知错误'), 'warn');
      }
    } catch (e) {
      showToast('恢复失败: ' + e.message, 'err');
    }
  });
}

async function purgeVideo(id) {
  showConfirm('彻底删除', '确定要彻底删除这个视频吗？此操作不可恢复！', async () => {
    try {
      const res = await apiDelete('/video/delete', { ids: [id], hard: true });
      if (res.code === 0) {
        showToast('已彻底删除');
        loadBinCount();
        loadRecycleBin();
      } else {
        showToast('删除失败: ' + (res.message || '未知错误'), 'warn');
      }
    } catch (e) {
      showToast('删除失败: ' + e.message, 'err');
    }
  });
}

async function deleteVideo(id) {
  showConfirm('删除视频', '确定要将此视频移至回收站吗？', async () => {
    try {
      const res = await apiDelete('/video/delete', { ids: [id], hard: false });
      if (res.code === 0) {
        showToast('已移至回收站');
        loadBinCount();
        loadVideos();
      } else {
        showToast('删除失败: ' + (res.message || '未知错误'), 'warn');
      }
    } catch (e) {
      showToast('删除失败: ' + e.message, 'err');
    }
  });
}

/* ---------- lightbox ---------- */
function openLightbox(index) {
  const list = videoState.isBin ? videoState.binVideos : videoState.filtered;
  videoState.currentLbIndex = index;
  const video = list[index];
  if (!video) return;

  const lb = $('#lightbox');
  const videoWrap = $('#lbVideoWrap');
  const videoEl = document.createElement('video');
  videoEl.controls = true;
  videoEl.autoplay = true;
  videoEl.src = `/video/source?id=${video.id}`;

  videoWrap.innerHTML = '';
  videoWrap.appendChild(videoEl);

  $('#lbFname').textContent = videoName(video);
  $('#lbSize').textContent = formatSize(video.file_size || 0);
  const date = videoDate(video);
  $('#lbDate').textContent = date ? date.slice(0, 10) : '';
  const width = video.width || 0;
  const height = video.height || 0;
  $('#lbRes').textContent = (width && height) ? `${width}×${height}` : '-';
  $('#lbCounter').textContent = `${index + 1} / ${list.length}`;

  $('#lbDName').textContent = videoName(video) || '-';
  $('#lbDExt').textContent = (video.file_ext || '-').replace(/^\./, '').toUpperCase();
  $('#lbDSize').textContent = formatSize(video.file_size || 0);
  $('#lbDDate').textContent = date ? date.slice(0, 19) : '-';
  $('#lbDRes').textContent = (width && height) ? `${width}×${height}` : '-';
  $('#lbDPath').textContent = video.file_path || '-';
  $('#lbDPath').title = video.file_path || '';

  $('#lbDetailPanel').classList.remove('show');
  lb.classList.add('show');
  document.body.style.overflow = 'hidden';

  videoEl.addEventListener('ended', () => {
    lbNext();
  });
}

function closeLightbox() {
  const lb = $('#lightbox');
  const videoWrap = $('#lbVideoWrap');
  const videoEl = videoWrap.querySelector('video');
  if (videoEl) {
    videoEl.pause();
    videoEl.src = '';
  }
  videoWrap.innerHTML = '';
  lb.classList.remove('show');
  document.body.style.overflow = '';
  videoState.currentLbIndex = -1;
}

function lbPrev() {
  if (videoState.currentLbIndex > 0) {
    openLightbox(videoState.currentLbIndex - 1);
  }
}

function lbNext() {
  const list = videoState.isBin ? videoState.binVideos : videoState.filtered;
  if (videoState.currentLbIndex < list.length - 1) {
    openLightbox(videoState.currentLbIndex + 1);
  }
}

function toggleDetailPanel() {
  $('#lbDetailPanel').classList.toggle('show');
}

/* ---------- confirm ---------- */
let confirmCallback = null;

function showConfirm(title, msg, cb) {
  $('#cTitle').textContent = title;
  $('#cMsg').textContent = msg;
  confirmCallback = cb;
  $('#ovConfirm').classList.add('show');
}

function videoCloseConfirm() {
  $('#ovConfirm').classList.remove('show');
  confirmCallback = null;
}

function videoConfirmAction() {
  if (confirmCallback) confirmCallback();
  videoCloseConfirm();
}

/* ---------- utils ---------- */
function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

document.addEventListener('DOMContentLoaded', videoInit);