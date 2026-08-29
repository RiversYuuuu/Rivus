/* ============================================================
   Rivus - 播放器模块
   ============================================================ */

const Player = {
  state: {
    playlist: [],
    currentIndex: -1,
    mode: 'sequential',
    playing: false,
    blobUrl: null,
    currentAudio: null,
    shuffleOrder: [],
    loading: false,
    volume: 0.7,
    muted: false,
    lyrics: [],
    lyricIndex: -1,
  },

  init() {
    this.el = {
      bar: $('#playerBar'),
      tab: $('#plTab'),
      title: $('#plTitle'),
      artist: $('#plArtist'),
      playBtn: $('#plPlay'),
      prevBtn: $('#plPrev'),
      nextBtn: $('#plNext'),
      modeBtn: $('#plMode'),
      toggleBtn: $('#plToggle'),
      locateBtn: $('#plLocate'),
      progress: $('#plProgress'),
      currentTime: $('#plCurTime'),
      duration: $('#plDuration'),
      audio: $('#plAudio'),
      volIcon: $('#plVolIcon'),
      lyricCur: $('#lyricCur'),
      lyricNext: $('#lyricNext'),
      lyricNext2: $('#lyricNext2'),
      lyricScroll: $('#lyricScroll'),
    };

    this.el.playBtn.addEventListener('click', () => this.toggle());
    this.el.prevBtn.addEventListener('click', () => this.prev());
    this.el.nextBtn.addEventListener('click', () => this.next());
    this.el.modeBtn.addEventListener('click', () => this.toggleMode());
    this.el.toggleBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleBar(); });
    this.el.tab.addEventListener('click', (e) => { e.stopPropagation(); this.toggleBar(); });
    this.el.locateBtn.addEventListener('click', (e) => { e.stopPropagation(); this.locate(); });
    this.el.progress.addEventListener('input', () => this.seek());
    this.el.audio.addEventListener('timeupdate', () => this.onTimeUpdate());
    this.el.audio.addEventListener('loadedmetadata', () => this.onLoaded());
    this.el.audio.addEventListener('ended', () => this.onEnded());
    this.el.audio.addEventListener('error', () => this.onError());

    this._createVolPopup();
    this.el.audio.volume = this.state.volume;

    document.body.classList.add('has-player');
    this.el.bar.classList.add('show', 'collapsed');
  },

  setPlaylist(songs, startIndex = 0) {
    this.state.playlist = songs;
    this.state.currentIndex = startIndex;
    this.state.shuffleOrder = this._shuffleIndexes(songs.length);
    document.body.classList.add('has-player');
    this.el.bar.classList.add('show');
    this.el.bar.classList.remove('collapsed');
    this.play(startIndex);
  },

  toggle() {
    if (!this.state.currentAudio) {
      if (typeof fetchAllSongs === 'function') {
        fetchAllSongs().then((songs) => {
          if (songs.length > 0) {
            this.setPlaylist(songs, 0);
          }
        });
      }
      return;
    }
    const audio = this.el.audio;
    if (audio.paused) {
      audio.play();
      this.state.playing = true;
      this._setPlayIcon(true);
      this._scheduleNextScroll();
    } else {
      audio.pause();
      this.state.playing = false;
      this._setPlayIcon(false);
      if (this._scrollTimer) { clearTimeout(this._scrollTimer); this._scrollTimer = null; }
    }
  },

  play(index) {
    if (index < 0 || index >= this.state.playlist.length) return;
    this.state.currentIndex = index;
    this.state.playing = true;
    this._loadAndPlay(index);
  },

  pause() {
    this.el.audio.pause();
    this.state.playing = false;
    this._setPlayIcon(false);
  },

  next() {
    if (this.state.playlist.length === 0) return;
    const nextIdx = this._getNextIndex();
    this.play(nextIdx);
  },

  prev() {
    if (this.state.playlist.length === 0) return;
    if (this.el.audio.currentTime > 3) {
      this.el.audio.currentTime = 0;
      return;
    }
    const prevIdx = this._getPrevIndex();
    this.play(prevIdx);
  },

  toggleMode() {
    const modes = ['sequential', 'repeat-one', 'shuffle'];
    const idx = modes.indexOf(this.state.mode);
    this.state.mode = modes[(idx + 1) % 3];
    this._updateModeBtn();
  },

  toggleBar() {
    this.el.bar.classList.toggle('collapsed');
  },

  locate() {
    const song = this.state.currentAudio;
    if (!song || typeof navigateToSong !== 'function') return;
    navigateToSong(song.id);
  },

  _getNextIndex() {
    const len = this.state.playlist.length;
    if (len === 0) return -1;
    if (this.state.mode === 'repeat-one') return this.state.currentIndex;
    if (this.state.mode === 'shuffle') {
      const cur = this.state.shuffleOrder.indexOf(this.state.currentIndex);
      const next = (cur + 1) % len;
      return this.state.shuffleOrder[next];
    }
    return (this.state.currentIndex + 1) % len;
  },

  _getPrevIndex() {
    const len = this.state.playlist.length;
    if (len === 0) return -1;
    if (this.state.mode === 'shuffle') {
      const cur = this.state.shuffleOrder.indexOf(this.state.currentIndex);
      const prev = (cur - 1 + len) % len;
      return this.state.shuffleOrder[prev];
    }
    return (this.state.currentIndex - 1 + len) % len;
  },

  _shuffleIndexes(len) {
    const arr = Array.from({ length: len }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  _updateModeBtn() {
    const icons = {
      'sequential': '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
      'repeat-one': '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><text x="9" y="15" font-size="8" font-weight="bold" fill="currentColor" stroke="none">1</text></svg>',
      'shuffle': '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>',
    };
    this.el.modeBtn.innerHTML = icons[this.state.mode] || icons['sequential'];
    this.el.modeBtn.title = {
      'sequential': '顺序播放',
      'repeat-one': '单曲循环',
      'shuffle': '随机播放',
    }[this.state.mode];
  },

  seek() {
    const audio = this.el.audio;
    if (!audio.duration) return;
    audio.currentTime = (this.el.progress.value / 100) * audio.duration;
  },

  onTimeUpdate() {
    const audio = this.el.audio;
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    this.el.progress.value = pct;
    this.el.currentTime.textContent = this._fmtTime(audio.currentTime);
    this._syncLyric(audio.currentTime);
  },

  onLoaded() {
    const audio = this.el.audio;
    this.el.duration.textContent = this._fmtTime(audio.duration);
    this.el.progress.value = 0;
  },

  onEnded() {
    if (this.state.mode === 'repeat-one') {
      this.el.audio.currentTime = 0;
      this.el.audio.play();
      return;
    }
    this.next();
  },

  onError() {
    if (this.state.loading) return;
    showToast('播放失败，文件可能不存在', 'err');
    this.state.playing = false;
    this._setPlayIcon(false);
  },

  async _loadAndPlay(index) {
    const song = this.state.playlist[index];
    if (!song) return;

    if (this.state.blobUrl) {
      URL.revokeObjectURL(this.state.blobUrl);
      this.state.blobUrl = null;
    }

    this.el.title.textContent = song.title || '未知歌曲';
    this.el.artist.textContent = song.artist || '未知歌手';
    this.el.currentTime.textContent = '0:00';
    this.el.duration.textContent = '0:00';
    this.el.progress.value = 0;
    this.state.lyrics = [];
    this.state.lyricIndex = -1;
    this._renderLyric(true);
    this.state.loading = true;
    this.el.bar.classList.add('loading');

    try {
      const resp = await fetch('/audio/source?id=' + song.id);
      if (!resp.ok) throw new Error('加载失败');

      const blob = await resp.blob();
      this.state.blobUrl = URL.createObjectURL(blob);

      this.el.audio.src = this.state.blobUrl;
      this.state.currentAudio = song;
      await this.el.audio.play();
      this._setPlayIcon(true);
      this._highlightRow(index);
      this._loadLyric(song);
    } catch (e) {
      showToast('加载失败: ' + e.message, 'err');
    }
    this.state.loading = false;
    this.el.bar.classList.remove('loading');
  },

  _setPlayIcon(playing) {
    this.el.playBtn.innerHTML = playing
      ? '<svg class="ic" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
      : '<svg class="ic" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 20,12 6,21"/></svg>';
  },

  _highlightRow(index) {
    $$('.song-row').forEach(function(r) { r.classList.remove('playing'); });
    var row = $('.song-row[data-id="' + this.state.playlist[index].id + '"]');
    if (row) row.classList.add('playing');
  },

  highlightCurrent() {
    if (this.state.currentIndex < 0 || !this.state.currentAudio) return;
    this._highlightRow(this.state.currentIndex);
  },

  _fmtTime(s) {
    if (isNaN(s)) return '0:00';
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ':' + String(sec).padStart(2, '0');
  },

  _createVolPopup() {
    const popup = document.createElement('div');
    popup.className = 'pl-vol-popup';
    popup.innerHTML = '<div class="vol-val" id="volVal">70</div>'
      + '<input type="range" id="volSlider" min="0" max="100" value="70" orient="vertical">';
    this.el.volIcon.appendChild(popup);
    this.el.volPopup = popup;
    this.el.volSlider = $('#volSlider');
    this.el.volVal = $('#volVal');

    this.el.volSlider.addEventListener('input', () => this._onVolInput());
    this.el.volPopup.addEventListener('click', (e) => { e.stopPropagation(); });
    this.el.volIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleMute();
    });
    this.el.volIcon.addEventListener('mouseenter', () => { this.el.volPopup.classList.add('show'); });
    this.el.volIcon.addEventListener('mouseleave', () => { this.el.volPopup.classList.remove('show'); });
  },

  _onVolInput() {
    const v = parseInt(this.el.volSlider.value);
    this.state.volume = v / 100;
    this.el.audio.volume = this.state.volume;
    this.el.volVal.textContent = v;
    if (v === 0) {
      this.state.muted = true;
      this._setVolIcon(true);
    } else {
      this.state.muted = false;
      this._setVolIcon(false);
    }
  },

  _toggleMute() {
    this.state.muted = !this.state.muted;
    if (this.state.muted) {
      this.el.audio.volume = 0;
      this.el.volSlider.value = 0;
      this.el.volVal.textContent = '0';
      this._setVolIcon(true);
    } else {
      const v = Math.round((this.state.volume || 0.7) * 100);
      this.el.audio.volume = this.state.volume || 0.7;
      this.el.volSlider.value = v;
      this.el.volVal.textContent = v;
      this._setVolIcon(false);
    }
  },

  _setVolIcon(muted) {
    const svg = this.el.volIcon.querySelector('svg.ic');
    if (svg) {
      svg.outerHTML = muted
        ? '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>'
        : '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
    }
    this.el.volIcon.title = muted ? '取消静音' : '静音';
    if (this.el.volPopup) this.el.volPopup.classList.add('show');
  },

  async _loadLyric(song) {
    if (!song.lyric_path) return;
    try {
      const resp = await fetch('/audio/lyric/source?id=' + song.id);
      if (!resp.ok) return;
      const text = await resp.text();
      this.state.lyrics = this._parseLRC(text);
      this.state.lyricIndex = -1;
      this._renderLyric();
    } catch (e) {}
  },

  _parseLRC(lrc) {
    const lines = [];
    for (const raw of lrc.split('\n')) {
      const match = raw.match(/\[(\d{1,2}):(\d{2})\.(\d{2,3})](.*)/);
      if (!match) continue;
      const time = +match[1] * 60 + +match[2] + +match[3] / (match[3].length === 3 ? 1000 : 100);
      const text = match[4].trim();
      if (text) lines.push({ time, text });
    }
    return lines.sort((a, b) => a.time - b.time);
  },

  _syncLyric(currentTime) {
    const lines = this.state.lyrics;
    if (lines.length === 0) return;
    let idx = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (currentTime >= lines[i].time) { idx = i; break; }
    }
    if (idx === this.state.lyricIndex) return;
    if (this._scrollTargetIdx >= 0 && idx === this._scrollTargetIdx) return;
    this.state.lyricIndex = idx;
    this._renderLyric();
  },

  _renderLyric(instant) {
    const scroll = this.el.lyricScroll;
    const lines = this.state.lyrics;
    const idx = this.state.lyricIndex;

    if (this._scrollTimer) { clearTimeout(this._scrollTimer); this._scrollTimer = null; }
    this._scrollAnimId = (this._scrollAnimId || 0) + 1;
    this._scrollTargetIdx = -1;

    if (this._scrollClone) {
      this._scrollClone.remove();
      this._scrollClone = null;
    }
    scroll.classList.remove('smooth');
    scroll.style.transform = '';
    scroll.style.transitionDuration = '';
    scroll.style.removeProperty('--lyric-dur');

    const cur = idx >= 0 && idx < lines.length ? lines[idx].text : (lines.length > 0 ? lines[0].text : '');
    const nxt = idx >= 0 && idx + 1 < lines.length ? lines[idx + 1].text : (idx < 0 && lines.length > 1 ? lines[1].text : '');
    const nxt2 = idx >= 0 && idx + 2 < lines.length ? lines[idx + 2].text : (idx < 0 && lines.length > 2 ? lines[2].text : '');
    this.el.lyricCur.textContent = cur;
    this.el.lyricNext.textContent = nxt;
    this.el.lyricNext2.textContent = nxt2;

    if (!instant) this._scheduleNextScroll();
  },

  _scheduleNextScroll() {
    if (this._scrollTimer) { clearTimeout(this._scrollTimer); this._scrollTimer = null; }
    const lines = this.state.lyrics;
    const idx = this.state.lyricIndex;
    if (idx < 0 || idx >= lines.length - 1) return;
    const audio = this.el.audio;
    if (!audio.duration || audio.paused) return;
    const nextTime = lines[idx + 1].time;
    const timeUntilNext = nextTime - audio.currentTime;
    if (timeUntilNext <= 0) return;
    const animDuration = Math.min(0.8, timeUntilNext * 0.8);
    const startDelay = Math.max(0, (timeUntilNext - animDuration) * 1000);
    this._scrollTargetIdx = idx + 1;
    this._scrollTimer = setTimeout(() => {
      if (audio.paused) return;
      this._startScrollAnimation(animDuration);
    }, startDelay);
  },

  _startScrollAnimation(duration) {
    const scroll = this.el.lyricScroll;
    const animId = this._scrollAnimId;
    const targetIdx = this._scrollTargetIdx;
    const lines = this.state.lyrics;

    const cur = lines[targetIdx].text;
    const nxt = targetIdx + 1 < lines.length ? lines[targetIdx + 1].text : '';
    const nxt2 = targetIdx + 2 < lines.length ? lines[targetIdx + 2].text : '';

    const clone = scroll.cloneNode(true);
    clone.id = '';
    clone.querySelectorAll('[id]').forEach(function(el) { el.id = ''; });
    clone.style.position = 'absolute';
    clone.style.top = '0';
    clone.style.left = '0';
    clone.style.width = '100%';
    clone.style.zIndex = '1';
    clone.style.pointerEvents = 'none';
    scroll.style.position = 'relative';
    scroll.appendChild(clone);

    this.el.lyricCur.style.visibility = 'hidden';
    this.el.lyricNext.style.visibility = 'hidden';
    this.el.lyricNext2.style.visibility = 'hidden';
    this.el.lyricCur.textContent = cur;
    this.el.lyricNext.textContent = nxt;
    this.el.lyricNext2.textContent = nxt2;

    const curEl = clone.querySelector('.lyric-cur');
    const nextEl = clone.querySelector('.lyric-next');
    if (!curEl || !nextEl) return;
    const curRect = curEl.getBoundingClientRect();
    const nextRect = nextEl.getBoundingClientRect();
    const gap = 0.9;
    const lineH = curRect.height + gap;

    clone.style.setProperty('--lyric-dur', duration + 's');
    clone.style.transitionDuration = duration + 's';
    clone.classList.add('smooth');
    clone.offsetHeight;
    clone.style.transform = 'translateY(' + (-lineH) + 'px)';

    this._scrollClone = clone;

    var self = this;
    var onEnd = function(e) {
      if (e.target !== clone || e.propertyName !== 'transform') return;
      clone.removeEventListener('transitionend', onEnd);
      if (self._scrollAnimId !== animId) return;
      clone.remove();
      self._scrollClone = null;
      self.state.lyricIndex = targetIdx;
      self._scrollTargetIdx = -1;
      self.el.lyricCur.style.visibility = '';
      self.el.lyricNext.style.visibility = '';
      self.el.lyricNext2.style.visibility = '';
      self._renderLyric();
    };
    clone.addEventListener('transitionend', onEnd);
  },
};