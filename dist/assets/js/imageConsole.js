/* ============================================================
   Rivus - 流集 · 图片管理
   ============================================================ */

const imgState = {
  images: [],
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
  applyFilter();
  updateStats();
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

function bindCellEvents() {
  $$('.photo-cell').forEach((cell) => {
    cell.addEventListener('click', (e) => {
      if (e.target.closest('.photo-check')) {
        const id = parseInt(e.target.closest('.photo-check').dataset.id);
        toggleSelect(id);
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
}

/* ---------- batch ---------- */
function toggleBatchMode() {
  imgState.batchMode = !imgState.batchMode;
  const btn = $('#btnBatchMode');
  if (imgState.batchMode) {
    btn.classList.add('btn-outline');
    btn.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg> 退出批量';
    $('#imgBatchBar').classList.add('show');
    $$('.photo-check').forEach((el) => el.style.opacity = '1');
  } else {
    exitBatchMode();
  }
}

function exitBatchMode() {
  imgState.batchMode = false;
  imgState.selected.clear();
  const btn = $('#btnBatchMode');
  btn.classList.remove('btn-outline');
  btn.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> 批量';
  $('#imgBatchBar').classList.remove('show');
  $$('.photo-check').forEach((el) => {
    el.classList.remove('checked');
    el.style.opacity = '';
  });
  updateBatchCount();
}

function toggleSelect(id) {
  if (imgState.selected.has(id)) {
    imgState.selected.delete(id);
  } else {
    imgState.selected.add(id);
  }
  const checkEl = $(`.photo-check[data-id="${id}"]`);
  if (checkEl) checkEl.classList.toggle('checked');
  updateBatchCount();
}

function toggleSelectAll() {
  if (imgState.selected.size === imgState.filtered.length) {
    imgState.selected.clear();
  } else {
    imgState.filtered.forEach((img) => imgState.selected.add(img.id));
  }
  $$('.photo-check').forEach((el) => {
    const id = parseInt(el.dataset.id);
    el.classList.toggle('checked', imgState.selected.has(id));
  });
  updateBatchCount();
}

function updateBatchCount() {
  $('#batchSelCount').textContent = imgState.selected.size;
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
  imgState.currentLbIndex = index;
  const img = imgState.filtered[index];
  if (!img) return;

  const lb = $('#lightbox');
  const lbImg = $('#lbImg');
  lbImg.src = `/image/source?id=${img.id}`;
  $('#lbFname').textContent = imgName(img);
  $('#lbSize').textContent = formatSize(img.file_size || 0);
  const date = imgDate(img);
  $('#lbDate').textContent = date ? date.slice(0, 10) : '';
  $('#lbCounter').textContent = `${index + 1} / ${imgState.filtered.length}`;

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
  if (imgState.currentLbIndex < imgState.filtered.length - 1) {
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