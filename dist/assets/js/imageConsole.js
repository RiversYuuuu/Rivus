/* ============================================================
   Rivus - 流集 · 图片管理
   ============================================================ */

const imgState = {
  images: [],
  binImages: [],
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

function imgName(img) {
  return basename(img.file_path || '');
}

function imgDate(img) {
  return img.shot_at || img.create_time || '';
}

function imgInit() {
  initTheme();
  imgBindEvents();
  loadImages();
  loadBinCount();
}

function imgBindEvents() {
  bindThemeButtons();

  $('#btnHome').addEventListener('click', () => {
    window.location.href = '/';
  });

  $('#btnImgSetting').addEventListener('click', () => {
    window.location.href = '/imagepage/setting';
  });

  $('#btnImgSync').addEventListener('click', () => openSyncModal('image'));
  bindSyncEvents();

  $('#sortTrigger').addEventListener('click', (e) => {
    e.stopPropagation();
    $('#sortMenu').classList.toggle('hidden');
  });

  $$('#sortMenu .sort-dropdown-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const field = item.dataset.field;
      if (imgState.sortBy === field) {
        imgState.sortOrder = imgState.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        imgState.sortBy = field;
        imgState.sortOrder = 'desc';
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
        imgState.isBin = true;
        imgState.batchMode = false;
        imgState.selected.clear();
        $('#btnBatchMode').innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> 批量';
        $('#btnBatchMode').classList.remove('btn-outline');
        $('#imgBatchBar').classList.remove('show');
        $('#imgBinBatchBar').classList.remove('show');
        $('#imgContent').classList.remove('batch-mode');
        $$('.photo-check').forEach((el) => {
          el.classList.remove('checked');
          el.style.opacity = '0';
        });
        loadRecycleBin();
      } else {
        imgState.isBin = false;
        imgState.batchMode = false;
        imgState.selected.clear();
        $('#btnBatchMode').innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> 批量';
        $('#btnBatchMode').classList.remove('btn-outline');
        $('#imgBatchBar').classList.remove('show');
        $('#imgBinBatchBar').classList.remove('show');
        $('#imgContent').classList.remove('batch-mode');
        $$('.photo-check').forEach((el) => {
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

  $('#btnConfirmOk').addEventListener('click', imgConfirmAction);
  $('#btnConfirmCancel').addEventListener('click', imgCloseConfirm);
  $('#ovConfirm').addEventListener('click', (e) => {
    if (e.target === $('#ovConfirm')) imgCloseConfirm();
  });
}

async function loadImages() {
  try {
    const res = await apiGet('/image/search', { page: 1, page_size: 10000 });
    if (res.code === 0 && res.data && res.data.image_list) {
      imgState.images = res.data.image_list;
    } else {
      imgState.images = [];
    }
  } catch (e) {
    imgState.images = [];
  }
  if (!imgState.isBin) applyFilter();
  updateStats();
}

async function loadBinCount() {
  try {
    const res = await apiGet('/image/recyclebin', { page: 1, page_size: 1 });
    if (res.code === 0 && res.data && res.data.pagination) {
      imgState.binTotal = res.data.pagination.total || 0;
      $('#cntBin').textContent = imgState.binTotal;
    }
  } catch (e) {
    $('#cntBin').textContent = '0';
  }
}

async function loadRecycleBin() {
  try {
    const res = await apiGet('/image/recyclebin', {
      page: imgState.binPage,
      page_size: imgState.binPageSize,
      sort_by: imgState.binSortBy,
      sort_order: imgState.binSortOrder,
    });
    if (res.code === 0 && res.data) {
      imgState.binImages = res.data.image_list || [];
      if (res.data.pagination) {
        imgState.binTotal = res.data.pagination.total || 0;
        $('#cntBin').textContent = imgState.binTotal;
      }
    } else {
      imgState.binImages = [];
    }
  } catch (e) {
    imgState.binImages = [];
  }
  renderBinGrid();
}

function applyFilter() {
  let list = [...imgState.images];

  const order = imgState.sortOrder === 'asc' ? 1 : -1;
  list.sort((a, b) => {
    switch (imgState.sortBy) {
      case 'date': return order * imgDate(a).localeCompare(imgDate(b));
      case 'size': return order * ((a.file_size || 0) - (b.file_size || 0));
      default: return 0;
    }
  });

  imgState.filtered = list;
  renderGrid();
}

function updateSortUI() {
  const label = imgState.sortBy === 'size' ? '大小' : '日期';
  const arrow = imgState.sortOrder === 'asc' ? '↑' : '↓';
  $('#sortLabel').textContent = label;
  $('#sortArrow').textContent = arrow;
  $$('#sortMenu .sort-dropdown-item').forEach((item) => {
    const active = item.dataset.field === imgState.sortBy;
    item.classList.toggle('active', active);
    item.textContent = active ? item.dataset.field === 'size' ? '大小 ' + arrow : '日期 ' + arrow : item.dataset.field === 'size' ? '大小' : '日期';
  });
}

function renderGrid() {
  const content = $('#imgContent');
  const empty = $('#imgEmpty');
  const binEmpty = $('#imgBinEmpty');
  binEmpty.classList.add('hidden');

  if (imgState.filtered.length === 0) {
    content.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');

  const groups = groupByDate(imgState.filtered);

  let html = '';
  for (const [label, imgs] of groups) {
    html += `<div class="date-group">`;
    html += `<div class="date-header"><span class="date-label">${esc(label)}</span><span class="date-count">${imgs.length} 张</span></div>`;
    html += `<div class="photo-grid">`;
    for (const img of imgs) {
      const ext = (img.file_ext || '').replace(/^\./, '').toUpperCase();
      const checked = imgState.selected.has(img.id) ? ' checked' : '';
      html += `<div class="photo-cell" data-id="${img.id}" data-path="${esc(img.file_path || '')}">
        <div class="photo-check${checked}" data-id="${img.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div class="photo-actions">
          <button class="photo-act delete-btn" data-id="${img.id}" title="移至回收站">
            <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M16 6v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
        <img data-src="/image/thumb?id=${img.id}" loading="lazy" alt="${esc(imgName(img))}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236d7c90%22 stroke-width=%221.5%22><rect x=%223%22 y=%223%22 width=%2218%22 height=%2218%22 rx=%222%22/><circle cx=%228.5%22 cy=%228.5%22 r=%221.5%22/><path d=%22m21 15-5-5L5 21%22/></svg>'">
        ${ext ? `<span class="photo-ext">${esc(ext)}</span>` : ''}
      </div>`;
    }
    html += `</div></div>`;
  }

  content.innerHTML = html;
  bindCellEvents();
  content.querySelectorAll('img[data-src]').forEach((img) => lazyLoader.observe(img));
}

function renderBinGrid() {
  const content = $('#imgContent');
  const empty = $('#imgEmpty');
  const binEmpty = $('#imgBinEmpty');
  empty.classList.add('hidden');

  if (imgState.binImages.length === 0) {
    content.innerHTML = '';
    binEmpty.classList.remove('hidden');
    return;
  }

  binEmpty.classList.add('hidden');

  const groups = groupByDate(imgState.binImages);

  let html = '';
  for (const [label, imgs] of groups) {
    html += `<div class="date-group">`;
    html += `<div class="date-header"><span class="date-label">${esc(label)}</span><span class="date-count">${imgs.length} 张</span></div>`;
    html += `<div class="photo-grid">`;
    for (const img of imgs) {
      const ext = (img.file_ext || '').replace(/^\./, '').toUpperCase();
      const checked = imgState.selected.has(img.id) ? ' checked' : '';
      html += `<div class="photo-cell" data-id="${img.id}" data-path="${esc(img.file_path || '')}">
        <div class="photo-check${checked}" data-id="${img.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div class="photo-actions">
          <button class="photo-act restore-btn" data-id="${img.id}" title="恢复">
            <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3-7.7L3 8"/><path d="M3 3v5h5"/></svg>
          </button>
          <button class="photo-act purge-btn" data-id="${img.id}" title="彻底删除">
            <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14"/></svg>
          </button>
        </div>
        <img data-src="/image/thumb?id=${img.id}" loading="lazy" alt="${esc(imgName(img))}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236d7c90%22 stroke-width=%221.5%22><rect x=%223%22 y=%223%22 width=%2218%22 height=%2218%22 rx=%222%22/><circle cx=%228.5%22 cy=%228.5%22 r=%221.5%22/><path d=%22m21 15-5-5L5 21%22/></svg>'">
        ${ext ? `<span class="photo-ext">${esc(ext)}</span>` : ''}
        ${img.delete_time ? `<span class="photo-delete-time">${esc(img.delete_time.slice(0, 10))}</span>` : ''}
      </div>`;
    }
    html += `</div></div>`;
  }

  content.innerHTML = html;
  bindBinCellEvents();
  content.querySelectorAll('img[data-src]').forEach((img) => lazyLoader.observe(img));
}

function bindCellEvents() {
  $$('.photo-cell').forEach((cell) => {
    cell.addEventListener('click', (e) => {
      if (e.target.closest('.photo-check')) {
        const id = parseInt(e.target.closest('.photo-check').dataset.id);
        toggleSelect(id);
        return;
      }
      if (e.target.closest('.delete-btn')) {
        e.stopPropagation();
        const id = parseInt(e.target.closest('.delete-btn').dataset.id);
        deleteImage(id);
        return;
      }
      if (imgState.batchMode) {
        const id = parseInt(cell.dataset.id);
        toggleSelect(id);
        return;
      }
      const id = parseInt(cell.dataset.id);
      const idx = imgState.filtered.findIndex((img) => img.id === id);
      if (idx >= 0) openLightbox(idx);
    });
  });
}

function bindBinCellEvents() {
  $$('.photo-cell').forEach((cell) => {
    cell.addEventListener('click', (e) => {
      if (e.target.closest('.photo-check')) {
        const id = parseInt(e.target.closest('.photo-check').dataset.id);
        toggleSelect(id);
        return;
      }
      if (e.target.closest('.restore-btn')) {
        e.stopPropagation();
        const id = parseInt(e.target.closest('.restore-btn').dataset.id);
        restoreImage(id);
        return;
      }
      if (e.target.closest('.purge-btn')) {
        e.stopPropagation();
        const id = parseInt(e.target.closest('.purge-btn').dataset.id);
        purgeImage(id);
        return;
      }
      if (imgState.batchMode) {
        const id = parseInt(cell.dataset.id);
        toggleSelect(id);
        return;
      }
    });
  });
}

function groupByDate(images) {
  const map = new Map();
  for (const img of images) {
    const raw = imgDate(img);
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
    map.get(label).push(img);
  }
  return map;
}

function updateStats() {
  const total = imgState.images.length;
  let totalSize = 0;
  const exts = new Set();
  let earliest = '';
  let latest = '';

  for (const img of imgState.images) {
    totalSize += img.file_size || 0;
    if (img.file_ext) exts.add(img.file_ext.toLowerCase());
    const raw = imgDate(img);
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

  $('#isCount').textContent = total;
  $('#isSize').textContent = (totalSize / 1e9).toFixed(2);
  $('#isFormats').textContent = exts.size;
  $('#isDays').textContent = spanDays;
  $('#cntLib').textContent = total;
}

/* ---------- batch ---------- */
function toggleBatchMode() {
  imgState.batchMode = !imgState.batchMode;
  const btn = $('#btnBatchMode');
  if (imgState.isBin) {
    // Bin batch mode
    if (imgState.batchMode) {
      btn.classList.add('btn-outline');
      btn.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg> 退出批量';
      $('#imgBinBatchBar').classList.add('show');
      $('#imgContent').classList.add('batch-mode');
      $$('.photo-check').forEach((el) => el.style.opacity = '1');
      $('#btnBinBatchCheckAll').dataset.state = 'none';
    } else {
      exitBinBatchMode();
    }
  } else {
    if (imgState.batchMode) {
      btn.classList.add('btn-outline');
      btn.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg> 退出批量';
      $('#imgBatchBar').classList.add('show');
      $('#imgContent').classList.add('batch-mode');
      $$('.photo-check').forEach((el) => el.style.opacity = '1');
      $('#btnBatchCheckAll').dataset.state = 'none';
    } else {
      exitBatchMode();
    }
  }
}

function exitBatchMode() {
  imgState.batchMode = false;
  imgState.selected.clear();
  const btn = $('#btnBatchMode');
  btn.classList.remove('btn-outline');
  btn.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> 批量';
  $('#imgBatchBar').classList.remove('show');
  $('#imgContent').classList.remove('batch-mode');
  $$('.photo-check').forEach((el) => {
    el.classList.remove('checked');
    el.style.opacity = '0';
  });
  updateBatchCount();
}

function exitBinBatchMode() {
  imgState.batchMode = false;
  imgState.selected.clear();
  const btn = $('#btnBatchMode');
  btn.classList.remove('btn-outline');
  btn.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> 批量';
  $('#imgBinBatchBar').classList.remove('show');
  $('#imgContent').classList.remove('batch-mode');
  $$('.photo-check').forEach((el) => {
    el.classList.remove('checked');
    el.style.opacity = '0';
  });
  updateBinBatchCount();
}

function toggleSelect(id) {
  if (imgState.selected.has(id)) {
    imgState.selected.delete(id);
  } else {
    imgState.selected.add(id);
  }
  const checkEl = $(`.photo-check[data-id="${id}"]`);
  if (checkEl) checkEl.classList.toggle('checked');
  if (imgState.isBin) {
    updateBinBatchCount();
  } else {
    updateBatchCount();
  }
}

function toggleSelectAll() {
  const list = imgState.isBin ? imgState.binImages : imgState.filtered;
  if (imgState.selected.size === list.length) {
    imgState.selected.clear();
  } else {
    list.forEach((img) => imgState.selected.add(img.id));
  }
  $$('.photo-check').forEach((el) => {
    const id = parseInt(el.dataset.id);
    el.classList.toggle('checked', imgState.selected.has(id));
  });
  if (imgState.isBin) {
    updateBinBatchCount();
  } else {
    updateBatchCount();
  }
}

function updateBatchCount() {
  $('#batchSelCount').textContent = imgState.selected.size;
  const list = imgState.filtered;
  const btn = $('#btnBatchCheckAll');
  if (!btn) return;
  if (imgState.selected.size === 0) btn.dataset.state = 'none';
  else if (imgState.selected.size === list.length) btn.dataset.state = 'all';
  else btn.dataset.state = 'some';
}

function updateBinBatchCount() {
  $('#binBatchSelCount').textContent = imgState.selected.size;
  const list = imgState.binImages;
  const btn = $('#btnBinBatchCheckAll');
  if (!btn) return;
  if (imgState.selected.size === 0) btn.dataset.state = 'none';
  else if (imgState.selected.size === list.length) btn.dataset.state = 'all';
  else btn.dataset.state = 'some';
}

function batchDelete() {
  if (imgState.selected.size === 0) {
    showToast('请先选择图片', 'warn');
    return;
  }
  showConfirm('删除图片', `确定要删除选中的 ${imgState.selected.size} 张图片吗？`, async () => {
    try {
      const ids = Array.from(imgState.selected);
      const res = await apiDelete('/image/delete', { ids, hard: false });
      if (res.code === 0) {
        showToast(`已删除 ${ids.length} 张图片`);
        imgState.selected.clear();
        loadImages();
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
  if (imgState.selected.size === 0) {
    showToast('请先选择图片', 'warn');
    return;
  }
  showConfirm('恢复图片', `确定要恢复选中的 ${imgState.selected.size} 张图片吗？`, async () => {
    try {
      const ids = Array.from(imgState.selected);
      const res = await apiPost('/image/restore', { ids });
      if (res.code === 0) {
        showToast(`已恢复 ${ids.length} 张图片`);
        imgState.selected.clear();
        loadBinCount();
        loadRecycleBin();
        loadImages();
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
  if (imgState.selected.size === 0) {
    showToast('请先选择图片', 'warn');
    return;
  }
  showConfirm('彻底删除', `确定要彻底删除选中的 ${imgState.selected.size} 张图片吗？此操作不可恢复！`, async () => {
    try {
      const ids = Array.from(imgState.selected);
      const res = await apiDelete('/image/delete', { ids, hard: true });
      if (res.code === 0) {
        showToast(`已彻底删除 ${ids.length} 张图片`);
        imgState.selected.clear();
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
async function restoreImage(id) {
  showConfirm('恢复图片', '确定要恢复这张图片吗？', async () => {
    try {
      const res = await apiPost('/image/restore', { ids: [id] });
      if (res.code === 0) {
        showToast('已恢复');
        loadBinCount();
        loadRecycleBin();
        loadImages();
      } else {
        showToast('恢复失败: ' + (res.message || '未知错误'), 'warn');
      }
    } catch (e) {
      showToast('恢复失败: ' + e.message, 'err');
    }
  });
}

async function purgeImage(id) {
  showConfirm('彻底删除', '确定要彻底删除这张图片吗？此操作不可恢复！', async () => {
    try {
      const res = await apiDelete('/image/delete', { ids: [id], hard: true });
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

async function deleteImage(id) {
  showConfirm('删除图片', '确定要将此图片移至回收站吗？', async () => {
    try {
      const res = await apiDelete('/image/delete', { ids: [id], hard: false });
      if (res.code === 0) {
        showToast('已移至回收站');
        loadBinCount();
        loadImages();
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
  const list = imgState.isBin ? imgState.binImages : imgState.filtered;
  imgState.currentLbIndex = index;
  const img = list[index];
  if (!img) return;

  const lb = $('#lightbox');
  const lbImg = $('#lbImg');
  lbImg.src = `/image/source?id=${img.id}`;
  $('#lbFname').textContent = imgName(img);
  $('#lbSize').textContent = formatSize(img.file_size || 0);
  const date = imgDate(img);
  $('#lbDate').textContent = date ? date.slice(0, 10) : '';
  $('#lbCounter').textContent = `${index + 1} / ${list.length}`;

  $('#lbDName').textContent = imgName(img) || '-';
  $('#lbDExt').textContent = (img.file_ext || '-').replace(/^\./, '').toUpperCase();
  $('#lbDSize').textContent = formatSize(img.file_size || 0);
  $('#lbDDate').textContent = date ? date.slice(0, 19) : '-';
  $('#lbDPath').textContent = img.file_path || '-';
  $('#lbDPath').title = img.file_path || '';

  $('#lbDetailPanel').classList.remove('show');
  lb.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  $('#lightbox').classList.remove('show');
  document.body.style.overflow = '';
  imgState.currentLbIndex = -1;
}

function lbPrev() {
  if (imgState.currentLbIndex > 0) {
    openLightbox(imgState.currentLbIndex - 1);
  }
}

function lbNext() {
  const list = imgState.isBin ? imgState.binImages : imgState.filtered;
  if (imgState.currentLbIndex < list.length - 1) {
    openLightbox(imgState.currentLbIndex + 1);
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

function imgCloseConfirm() {
  $('#ovConfirm').classList.remove('show');
  confirmCallback = null;
}

function imgConfirmAction() {
  if (confirmCallback) confirmCallback();
  imgCloseConfirm();
}

/* ---------- utils ---------- */
function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

document.addEventListener('DOMContentLoaded', imgInit);