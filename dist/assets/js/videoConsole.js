/* ============================================================
   Rivus - 流集 · 视频管理
   ============================================================ */

const videoState = {
  videos: [],
  filtered: [],
  selected: new Set(),
  batchMode: false,
  currentLbIndex: -1,
  sortBy: 'date',
  sortOrder: 'desc',
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

  $('#btnBatchMode').addEventListener('click', toggleBatchMode);
  $('#btnBatchCancel').addEventListener('click', exitBatchMode);
  $('#btnBatchCheckAll').addEventListener('click', toggleSelectAll);
  $('#btnBatchDelete').addEventListener('click', batchDelete);

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
  applyFilter();
  updateStats();
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

function bindCellEvents() {
  $$('.video-cell').forEach((cell) => {
    cell.addEventListener('click', (e) => {
      if (e.target.closest('.video-check')) {
        const id = parseInt(e.target.closest('.video-check').dataset.id);
        toggleSelect(id);
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
}

/* ---------- batch ---------- */
function toggleBatchMode() {
  videoState.batchMode = !videoState.batchMode;
  const btn = $('#btnBatchMode');
  if (videoState.batchMode) {
    btn.classList.add('btn-outline');
    btn.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg> 退出批量';
    $('#videoBatchBar').classList.add('show');
    $$('.video-check').forEach((el) => el.style.opacity = '1');
  } else {
    exitBatchMode();
  }
}

function exitBatchMode() {
  videoState.batchMode = false;
  videoState.selected.clear();
  const btn = $('#btnBatchMode');
  btn.classList.remove('btn-outline');
  btn.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> 批量';
  $('#videoBatchBar').classList.remove('show');
  $$('.video-check').forEach((el) => {
    el.classList.remove('checked');
    el.style.opacity = '';
  });
  updateBatchCount();
}

function toggleSelect(id) {
  if (videoState.selected.has(id)) {
    videoState.selected.delete(id);
  } else {
    videoState.selected.add(id);
  }
  const checkEl = $(`.video-check[data-id="${id}"]`);
  if (checkEl) checkEl.classList.toggle('checked');
  updateBatchCount();
}

function toggleSelectAll() {
  if (videoState.selected.size === videoState.filtered.length) {
    videoState.selected.clear();
  } else {
    videoState.filtered.forEach((v) => videoState.selected.add(v.id));
  }
  $$('.video-check').forEach((el) => {
    const id = parseInt(el.dataset.id);
    el.classList.toggle('checked', videoState.selected.has(id));
  });
  updateBatchCount();
}

function updateBatchCount() {
  $('#batchSelCount').textContent = videoState.selected.size;
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
        exitBatchMode();
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
  videoState.currentLbIndex = index;
  const video = videoState.filtered[index];
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
  $('#lbCounter').textContent = `${index + 1} / ${videoState.filtered.length}`;

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
  if (videoState.currentLbIndex < videoState.filtered.length - 1) {
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

document.addEventListener('DOMContentLoaded', videoInit);