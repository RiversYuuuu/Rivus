/* ============================================================
   Rivus - 流集 · 图片初始化
   ============================================================ */

function initSetup() {
  const dirInput = $('#dirInput');
  const btnSave = $('#btnSave');
  const btnScan = $('#btnScan');
  const scanBtnText = $('#scanBtnText');
  const btnEnterLib = $('#btnEnterLib');
  const dirNote = $('#dirNote');
  const scanPanel = $('#scanPanel');

  scanPanel.classList.add('hidden');
  scanPanel.classList.remove('reveal');
  $('#step1').classList.add('on');
  $('#step1').classList.remove('done');
  $('#step2').classList.remove('on', 'done');
  $('#step3').classList.remove('on', 'done');
  btnEnterLib.classList.add('hidden');
  btnSave.disabled = true;
  btnScan.disabled = true;

  state.imageDir = '';
  state.imageConfigSaved = false;

  function updateScanBtnLabel() {
    scanBtnText.textContent = state.imageConfigSaved ? '重新扫描' : '开始扫描';
  }

  async function checkDir(path) {
    if (!path) return;
    state.imageDir = path;
    try {
      const cfg = await apiGet('/config');
      dirNote.classList.remove('hidden');
      if (cfg.data && cfg.data.image_dir === path) {
        dirNote.innerHTML = '<span style="color:var(--green)">&#10003; 该目录已配置</span>';
        state.imageConfigSaved = true;
        btnSave.disabled = false;
        btnScan.disabled = false;
        btnEnterLib.classList.remove('hidden');
      } else {
        dirNote.innerHTML = '<span style="color:var(--amber)">&#9888; 将设置为新的图片目录</span>';
        state.imageConfigSaved = false;
        btnSave.disabled = false;
        btnScan.disabled = true;
        btnEnterLib.classList.add('hidden');
      }
      updateScanBtnLabel();
    } catch (e) {
      dirNote.classList.remove('hidden');
      dirNote.innerHTML = '<span style="color:var(--amber)">&#9888; 无法连接后端，请确认服务已启动</span>';
      btnSave.disabled = true;
      btnScan.disabled = true;
      btnEnterLib.classList.add('hidden');
    }
  }

  dirInput.addEventListener('input', () => {
    const v = dirInput.value.trim();
    if (v) checkDir(v);
    else {
      btnSave.disabled = true;
      btnScan.disabled = true;
      dirNote.classList.add('hidden');
      btnEnterLib.classList.add('hidden');
    }
  });

  btnSave.addEventListener('click', saveConfig);
  btnScan.addEventListener('click', startScan);

  initBrowse(dirInput, checkDir);

  (async () => {
    try {
      const cfg = await apiGet('/config');
      if (cfg.code === 0 && cfg.data) {
        if (cfg.data.image_dir) {
          state.imageDir = cfg.data.image_dir;
          dirInput.value = cfg.data.image_dir;
          state.imageConfigSaved = true;
          dirNote.classList.remove('hidden');
          dirNote.innerHTML = '<span style="color:var(--green)">&#10003; 该目录已配置</span>';
          btnSave.disabled = false;
          btnScan.disabled = false;
          btnEnterLib.classList.remove('hidden');
        }
        updateScanBtnLabel();
      }
    } catch (e) {
    }
  })();
}

async function saveConfig() {
  const dir = state.imageDir;
  if (!dir) return;

  const btnSave = $('#btnSave');
  const btnScan = $('#btnScan');
  const btnOrigHTML = btnSave.innerHTML;
  btnSave.disabled = true;
  btnSave.innerHTML = '<span class="spin"></span> 保存中…';

  try {
    const existingCfg = await apiGet('/config');
    const existingAudioDir = (existingCfg.code === 0 && existingCfg.data) ? (existingCfg.data.audio_dir || '') : '';
    const existingAcoustidKey = (existingCfg.code === 0 && existingCfg.data) ? (existingCfg.data.acoustid_api_key || '') : '';

    const res = await apiPost('/config', {
      audio_dir: existingAudioDir,
      acoustid_api_key: existingAcoustidKey,
      image_dir: dir,
    });
    if (res.code === 0) {
      state.imageConfigSaved = true;
      btnScan.disabled = false;
      $('#scanBtnText').textContent = '重新扫描';
      const dirNote = $('#dirNote');
      dirNote.classList.remove('hidden');
      dirNote.innerHTML = '<span style="color:var(--green)">&#10003; 设置已保存</span>';
      showToast('设置已保存');
    } else {
      showToast('保存失败: ' + (res.message || '未知错误'), 'warn');
    }
  } catch (e) {
    showToast('连接失败: ' + e.message, 'warn');
  }

  btnSave.disabled = false;
  btnSave.innerHTML = btnOrigHTML;
}

async function startScan() {
  const dir = state.imageDir;
  if (!dir) return;

  const btnScan = $('#btnScan');
  const btnOrigHTML = btnScan.innerHTML;
  btnScan.disabled = true;
  btnScan.innerHTML = '<span class="spin"></span> 扫描中…';

  const scanPanel = $('#scanPanel');
  scanPanel.classList.remove('hidden');
  scanPanel.classList.add('reveal');
  $('#scanLog').innerHTML = '';
  $('#scanCur').textContent = '准备中…';
  $('#scanPct').textContent = '';
  if (state.scanTimer) { clearInterval(state.scanTimer); state.scanTimer = null; }
  $('#btnEnterLib').classList.add('hidden');

  $('#step1').classList.remove('on');
  $('#step1').classList.add('done');
  $('#step2').classList.add('on');
  $('#step3').classList.remove('on', 'done');

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

  addLog('开始扫描图片文件...', 'info');
  addLog(`目标目录: ${dir}`, 'dim');

  try {
    const startTime = Date.now();

    state.scanTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      $('#scanPct').textContent = elapsed + 's';
    }, 1000);

    $('#scanCur').textContent = '扫描中...';

    const scanRes = await apiGet('/image/scan');
    clearInterval(state.scanTimer);

    if (scanRes.code === 0) {
      addLog('扫描完成！', 'ok');
      const totalSec = Math.floor((Date.now() - startTime) / 1000);
      $('#scanCur').textContent = '扫描完成';
      $('#scanPct').textContent = totalSec + 's';
      $('#step2').classList.remove('on');
      $('#step2').classList.add('done');
      $('#step3').classList.add('on');
      showToast('扫描完成，图库已更新');
      setTimeout(() => {
        window.location.href = '/imagepage/console';
      }, 1500);
    } else {
      addLog('扫描失败: ' + (scanRes.message || '未知错误'), 'warn');
      btnScan.disabled = false;
      btnScan.innerHTML = btnOrigHTML;
    }
  } catch (e) {
    clearInterval(state.scanTimer);
    addLog('连接失败: ' + e.message, 'warn');
    addLog('图片扫描接口尚未实现，请等待后续更新', 'dim');
    btnScan.disabled = false;
    btnScan.innerHTML = btnOrigHTML;
  }
}

function initBrowse(dirInput, checkDir) {
  const overlay = $('#browseOverlay');
  const browseList = $('#browseList');
  const browseBreadcrumb = $('#browseBreadcrumb');
  const browseLoading = $('#browseLoading');
  const browseFilter = $('#browseFilter');
  const btnBrowse = $('#btnBrowse');
  const btnBrowseCancel = $('#btnBrowseCancel');
  const btnBrowseSelect = $('#btnBrowseSelect');

  let currentDir = '';
  let selectedDir = '';
  let separator = '/';
  let allDirs = [];

  function showOverlay() {
    overlay.classList.add('show');
  }

  function hideOverlay() {
    overlay.classList.remove('show');
  }

  function dirBasename(p) {
    if (!p) return '';
    p = p.replace(/[/\\]+$/, '');
    const parts = p.split(/[/\\]/);
    return parts[parts.length - 1] || p;
  }

  function buildBreadcrumb(dir) {
    browseBreadcrumb.innerHTML = '';

    if (!dir) return;

    const sep = separator === '\\' ? '\\' : '/';
    let isWindowsDrive = /^[A-Za-z]:\\?$/.test(dir);
    let segments;

    if (isWindowsDrive) {
      segments = [dir.replace(/\\$/, '')];
    } else {
      let clean = dir;
      if (clean.startsWith(sep)) clean = clean.slice(sep.length);
      if (clean.endsWith(sep)) clean = clean.slice(0, -sep.length);
      segments = clean.split(sep).filter(Boolean);
    }

    let pathSoFar = '';
    segments.forEach((seg, i) => {
      if (i > 0) {
        const sepEl = document.createElement('span');
        sepEl.className = 'browse-sep';
        sepEl.textContent = sep;
        browseBreadcrumb.appendChild(sepEl);
      }

      if (!pathSoFar && seg.includes(':')) {
        pathSoFar = seg + sep;
      } else if (!pathSoFar) {
        pathSoFar = sep + seg;
      } else if (pathSoFar.endsWith(sep)) {
        pathSoFar = pathSoFar + seg;
      } else {
        pathSoFar = pathSoFar + sep + seg;
      }

      const isLast = i === segments.length - 1;
      const crumb = document.createElement('span');
      crumb.className = 'browse-crumb' + (isLast ? ' current' : '');
      crumb.textContent = seg;
      if (!isLast) {
        const targetDir = pathSoFar;
        crumb.addEventListener('click', () => loadDir(targetDir));
      } else {
        crumb.style.cursor = 'default';
      }
      browseBreadcrumb.appendChild(crumb);
    });
  }

  function renderList(keyword) {
    browseList.innerHTML = '';
    const kw = (keyword || '').toLowerCase();
    const filtered = kw ? allDirs.filter((d) => dirBasename(d).toLowerCase().includes(kw)) : allDirs;

    if (filtered.length === 0) {
      browseList.innerHTML = '<div class="browse-empty">' + (kw ? '没有匹配的目录' : '此目录下没有子目录') + '</div>';
      return;
    }

    filtered.forEach((d) => {
      const item = document.createElement('div');
      item.className = 'browse-item';
      item.dataset.path = d;
      item.innerHTML =
        '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>' +
        '<span class="browse-item-name">' + esc(dirBasename(d)) + '</span>';
      item.addEventListener('click', () => {
        loadDir(d);
      });
      browseList.appendChild(item);
    });
  }

  async function loadDir(dir) {
    browseLoading.classList.remove('hidden');
    browseList.innerHTML = '';
    browseFilter.value = '';
    btnBrowseSelect.disabled = true;

    try {
      const params = {};
      if (dir) params.directory = dir;
      const res = await apiGet('/browse', params);

      if (res.code === 0 && res.data) {
        separator = res.data.separator || '/';
        currentDir = dir;
        selectedDir = dir;
        buildBreadcrumb(dir);

        const dirs = res.data.dirs || [];
        browseLoading.classList.add('hidden');

        dirs.sort((a, b) => {
          const na = dirBasename(a).toLowerCase();
          const nb = dirBasename(b).toLowerCase();
          return na.localeCompare(nb);
        });
        allDirs = dirs;
        renderList('');

        btnBrowseSelect.disabled = !dir;
      } else {
        browseLoading.classList.add('hidden');
        browseList.innerHTML = '<div class="browse-empty">无法读取目录</div>';
      }
    } catch (e) {
      browseLoading.classList.add('hidden');
      browseList.innerHTML = '<div class="browse-empty">连接失败: ' + esc(e.message) + '</div>';
    }
  }

  browseFilter.addEventListener('input', () => {
    renderList(browseFilter.value.trim());
  });

  btnBrowse.addEventListener('click', () => {
    const existingDir = dirInput.value.trim();
    selectedDir = '';
    loadDir(existingDir || '');
    showOverlay();
  });

  btnBrowseCancel.addEventListener('click', hideOverlay);

  btnBrowseSelect.addEventListener('click', () => {
    const dir = selectedDir || currentDir;
    if (dir) {
      dirInput.value = dir;
      checkDir(dir);
    }
    hideOverlay();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hideOverlay();
  });
}

function bindEvents() {
  bindThemeButtons();

  $('#btnSetupHome').addEventListener('click', () => {
    window.location.href = '/';
  });

  $('#btnEnterLib').addEventListener('click', () => {
    window.location.href = '/imagepage/console';
  });
}

function init() {
  initTheme();
  bindEvents();
  initSetup();
}

document.addEventListener('DOMContentLoaded', init);