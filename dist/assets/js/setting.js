/* ============================================================
   MultiMediaManager - 流集 · 音频初始化
   ============================================================ */

function initSetup() {
  const dirInput = $('#dirInput');
  const acoustidInput = $('#acoustidInput');
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

  function updateScanBtnLabel() {
    scanBtnText.textContent = state.configSaved ? '重新扫描' : '开始扫描';
  }

  async function checkDir(path) {
    if (!path) return;
    state.audioDir = path;
    try {
      const cfg = await apiGet('/config');
      dirNote.classList.remove('hidden');
      if (cfg.data && cfg.data.audio_dir === path) {
        dirNote.innerHTML = '<span style="color:var(--green)">&#10003; 该目录已配置</span>';
        state.configSaved = true;
        btnSave.disabled = false;
        btnScan.disabled = false;
        btnEnterLib.classList.remove('hidden');
      } else {
        dirNote.innerHTML = '<span style="color:var(--amber)">&#9888; 将设置为新的音频目录</span>';
        state.configSaved = false;
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

  acoustidInput.addEventListener('input', () => {
    state.acoustidApiKey = acoustidInput.value.trim();
  });

  btnSave.addEventListener('click', saveConfig);
  btnScan.addEventListener('click', startScan);

  /* ----- auto-load existing config on page load ----- */
  (async () => {
    try {
      const cfg = await apiGet('/config');
      if (cfg.code === 0 && cfg.data) {
        if (cfg.data.audio_dir) {
          state.audioDir = cfg.data.audio_dir;
          dirInput.value = cfg.data.audio_dir;
          state.configSaved = true;
          dirNote.classList.remove('hidden');
          dirNote.innerHTML = '<span style="color:var(--green)">&#10003; 该目录已配置</span>';
          btnSave.disabled = false;
          btnScan.disabled = false;
          btnEnterLib.classList.remove('hidden');
        }
        if (cfg.data.acoustid_api_key) {
          state.acoustidApiKey = cfg.data.acoustid_api_key;
          acoustidInput.value = cfg.data.acoustid_api_key;
        }
        updateScanBtnLabel();
      }
    } catch (e) {
      /* backend not available, leave input empty */
    }
  })();
}

async function saveConfig() {
  const dir = state.audioDir;
  if (!dir) return;

  const btnSave = $('#btnSave');
  const btnScan = $('#btnScan');
  const btnOrigHTML = btnSave.innerHTML;
  btnSave.disabled = true;
  btnSave.innerHTML = '<span class="spin"></span> 保存中…';

  try {
    const res = await apiPost('/config', { audio_dir: dir, acoustid_api_key: state.acoustidApiKey || '' });
    if (res.code === 0) {
      state.configSaved = true;
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
  const dir = state.audioDir;
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

  addLog('开始扫描音频文件...', 'info');
  addLog(`目标目录: ${dir}`, 'dim');

  try {
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
        window.location.href = '/audiopage/console';
      }, 1500);
    } else {
      addLog('扫描失败: ' + (scanRes.message || '未知错误'), 'warn');
      btnScan.disabled = false;
      btnScan.innerHTML = btnOrigHTML;
    }
  } catch (e) {
    clearInterval(state.scanTimer);
    addLog('连接失败: ' + e.message, 'warn');
    addLog('请确认后端服务已启动', 'dim');
    btnScan.disabled = false;
    btnScan.innerHTML = btnOrigHTML;
  }
}

function bindEvents() {
  bindThemeButtons();

  $('#btnSetupHome').addEventListener('click', () => {
    window.location.href = '/';
  });

  $('#btnEnterLib').addEventListener('click', () => {
    window.location.href = '/audiopage/console';
  });
}

function init() {
  initTheme();
  bindEvents();
  initSetup();
}

document.addEventListener('DOMContentLoaded', init);