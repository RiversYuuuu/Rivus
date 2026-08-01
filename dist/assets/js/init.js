/* ============================================================
   MultiMediaManager - 流集 · 音频初始化
   ============================================================ */

function initSetup() {
  const dirInput = $('#dirInput');
  const btnStart = $('#btnStart');
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
  btnStart.disabled = true;

  async function checkDir(path) {
    if (!path) return;
    state.audioDir = path;
    try {
      const cfg = await apiGet('/config');
      dirNote.classList.remove('hidden');
      if (cfg.data && cfg.data.audio_dir === path) {
        dirNote.innerHTML = '<span style="color:var(--green)">&#10003; 该目录已配置，可直接进入管理</span>';
        btnStart.disabled = false;
        btnEnterLib.classList.remove('hidden');
      } else {
        dirNote.innerHTML = '<span style="color:var(--amber)">&#9888; 将设置为新的音频目录</span>';
        btnStart.disabled = false;
        btnEnterLib.classList.add('hidden');
      }
    } catch (e) {
      dirNote.classList.remove('hidden');
      dirNote.innerHTML = '<span style="color:var(--amber)">&#9888; 无法连接后端，请确认服务已启动</span>';
      btnStart.disabled = true;
      btnEnterLib.classList.add('hidden');
    }
  }

  dirInput.addEventListener('input', () => {
    const v = dirInput.value.trim();
    if (v) checkDir(v);
    else { btnStart.disabled = true; dirNote.classList.add('hidden'); btnEnterLib.classList.add('hidden'); }
  });

  btnStart.addEventListener('click', startScan);

  /* ----- auto-load existing config on page load ----- */
  (async () => {
    try {
      const cfg = await apiGet('/config');
      if (cfg.code === 0 && cfg.data && cfg.data.audio_dir) {
        const existingDir = cfg.data.audio_dir;
        state.audioDir = existingDir;
        dirInput.value = existingDir;
        dirNote.classList.remove('hidden');
        dirNote.innerHTML = '<span style="color:var(--green)">&#10003; 该目录已配置，可直接进入管理</span>';
        btnStart.disabled = false;
        btnEnterLib.classList.remove('hidden');
      }
    } catch (e) {
      /* backend not available, leave input empty */
    }
  })();
}

async function startScan() {
  const dir = state.audioDir;
  if (!dir) return;

  const btnStart = $('#btnStart');
  const btnOrigHTML = btnStart.innerHTML;
  btnStart.disabled = true;
  btnStart.innerHTML = '<span class="spin"></span> 扫描中…';

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

  addLog('正在连接后端服务...', 'info');
  addLog(`目标目录: ${dir}`, 'dim');

  try {
    const cfgRes = await apiPost('/config', { audio_dir: dir });
    if (cfgRes.code !== 0) {
      addLog('配置目录失败: ' + (cfgRes.message || '未知错误'), 'warn');
      btnStart.disabled = false;
      btnStart.innerHTML = btnOrigHTML;
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
        window.location.href = '/audiopage/console';
      }, 1500);
    } else {
      addLog('扫描失败: ' + (scanRes.message || '未知错误'), 'warn');
      btnStart.disabled = false;
      btnStart.innerHTML = btnOrigHTML;
    }
  } catch (e) {
    clearInterval(state.scanTimer);
    addLog('连接失败: ' + e.message, 'warn');
    addLog('请确认后端服务已启动', 'dim');
    btnStart.disabled = false;
    btnStart.innerHTML = btnOrigHTML;
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