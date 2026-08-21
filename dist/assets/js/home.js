/* ============================================================
   MultiMediaManager - 流集 · 首页
   ============================================================ */

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

function bindEvents() {
  bindThemeButtons();

  $('#cardAudio').addEventListener('click', () => {
    if (state.audioDir) {
      window.location.href = '/audiopage/console';
    } else {
      window.location.href = '/audiopage/setting';
    }
  });

  $$('.mod-locked').forEach((card) => {
    card.addEventListener('click', () => {
      card.classList.add('shake');
      setTimeout(() => card.classList.remove('shake'), 350);
      showToast('该模块即将上线，敬请期待', 'warn');
    });
  });
}

function init() {
  initTheme();
  bindEvents();
  loadHomeStatus();
}

document.addEventListener('DOMContentLoaded', init);