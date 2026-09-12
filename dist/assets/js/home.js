/* ============================================================
   Rivus - 流集 · 首页
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

      state.imageDir = cfg.data.image_dir || '';
      if (state.imageDir) {
        $('#imageStatus').textContent = '已就绪';
        $('#imageStatus').classList.remove('warn');
        $('#imageStatus').classList.add('ok');
        $('#imageMeta').classList.remove('hidden');
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
            $('#amSize').textContent = formatSize(totalSize);
          }
        }
      }
    }

    const imgRes = await apiGet('/image/search', { page: 1, page_size: 1 });
    if (imgRes.code === 0 && imgRes.data && imgRes.data.pagination) {
      const total = imgRes.data.pagination.total || 0;
      $('#imCount').textContent = total;
    }

    if (state.imageDir && imgRes.data && imgRes.data.image_list && imgRes.data.image_list.length > 0) {
      const imgStatsRes = await apiGet('/image/search', { page: 1, page_size: 1, sort_by: 'shot_at', sort_order: 'desc' });
      if (imgStatsRes.code === 0 && imgStatsRes.data && imgStatsRes.data.pagination) {
        const t = imgStatsRes.data.pagination.total || 0;
        if (t > 0) {
          const allImgRes = await apiGet('/image/search', { page: 1, page_size: Math.min(t, 1000) });
          if (allImgRes.code === 0 && allImgRes.data && allImgRes.data.image_list) {
            let totalSize = 0;
            allImgRes.data.image_list.forEach((img) => {
              totalSize += (img.file_size || 0);
            });
            $('#imSize').textContent = formatSize(totalSize);
          }
        }
      }
    }
  } catch (e) {
    $('#audioStatus').textContent = '未连接';
    $('#audioStatus').classList.remove('ok');
    $('#audioStatus').classList.add('warn');
    $('#imageStatus').textContent = '未连接';
    $('#imageStatus').classList.remove('ok');
    $('#imageStatus').classList.add('warn');
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

  $('#cardImage').addEventListener('click', () => {
    if (state.imageDir) {
      window.location.href = '/imagepage/console';
    } else {
      window.location.href = '/imagepage/setting';
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