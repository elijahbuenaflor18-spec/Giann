/* =====================================================================
   Vyzee UI layer — control bar sync, overview, fullscreen, present mode,
   sound design, auto-play, cinematic entrance. Ported from the Justin
   recruitment deck. Reads slide labels from each <section data-label>.
   ===================================================================== */

/* ---------- control bar: counter, ticks, overview, fullscreen ---------- */
(function () {
  var deck = document.querySelector('deck-stage');
  var nav = document.getElementById('vzNav');
  if (!deck || !nav) return;

  var prevBtn = document.getElementById('vzPrev');
  var nextBtn = document.getElementById('vzNext');
  var curEl = document.getElementById('vzCur');
  var totEl = document.getElementById('vzTot');
  var fill = document.getElementById('vzFill');
  var secN = document.getElementById('vzSecN');
  var secLabel = document.getElementById('vzSecLabel');
  var ticksWrap = document.getElementById('vzTicks');
  var ovBtn = document.getElementById('vzOverview');
  var fsBtn = document.getElementById('vzFs');
  var ov = document.getElementById('vzOv');
  var ovClose = document.getElementById('vzOvClose');
  var ovCount = document.getElementById('vzOvCount');
  var grid = document.getElementById('vzGrid');

  var pad = function (n) { return String(n).padStart(2, '0'); };

  var sections = Array.prototype.slice.call(document.querySelectorAll('deck-stage > section'));
  var labels = sections.map(function (s, i) {
    var raw = (s.getAttribute('data-label') || ('Slide ' + (i + 1))).trim();
    var m = raw.match(/^\d+\s+(.*)$/);
    return m ? m[1] : raw;
  });
  var total = labels.length || (deck.length || 1);

  // Build tick jumper.
  var ticks = [];
  for (var i = 0; i < total; i++) {
    (function (idx) {
      var t = document.createElement('button');
      t.className = 'vz-tick';
      t.type = 'button';
      t.setAttribute('aria-label', 'Slide ' + (idx + 1) + ' — ' + labels[idx]);
      t.title = pad(idx + 1) + ' · ' + labels[idx];
      t.addEventListener('click', function () { deck.goTo(idx); });
      ticksWrap.appendChild(t);
      ticks.push(t);
    })(i);
  }

  // Build overview grid.
  var cards = [];
  if (ovCount) ovCount.textContent = pad(total);
  for (var j = 0; j < total; j++) {
    (function (idx) {
      var c = document.createElement('button');
      c.className = 'vz-card';
      c.type = 'button';
      c.innerHTML = '<span class="vz-card-n">' + pad(idx + 1) + ' / ' + pad(total) + '</span>' +
                    '<span class="vz-card-t"></span>';
      c.querySelector('.vz-card-t').textContent = labels[idx];
      c.addEventListener('click', function () { deck.goTo(idx); closeOv(); });
      grid.appendChild(c);
      cards.push(c);
    })(j);
  }

  function sync() {
    var t = deck.length || total;
    var idx = deck.index || 0;
    curEl.textContent = pad(idx + 1);
    totEl.textContent = pad(t);
    fill.style.width = (100 / t) * (idx + 1) + '%';
    prevBtn.disabled = idx <= 0;
    nextBtn.disabled = idx >= t - 1;
    if (secN) secN.textContent = pad(idx + 1);
    if (secLabel && labels[idx]) secLabel.textContent = labels[idx];
    ticks.forEach(function (tk, k) {
      tk.classList.toggle('is-current', k === idx);
      tk.classList.toggle('is-past', k < idx);
    });
    cards.forEach(function (cd, k) { cd.classList.toggle('is-current', k === idx); });
  }

  prevBtn.addEventListener('click', function () { deck.prev(); });
  nextBtn.addEventListener('click', function () { deck.next(); });
  deck.addEventListener('slidechange', sync);

  // Overview toggle.
  function openOv() {
    ov.classList.add('is-open');
    ov.setAttribute('aria-hidden', 'false');
    ovBtn.classList.add('is-on');
  }
  function closeOv() {
    ov.classList.remove('is-open');
    ov.setAttribute('aria-hidden', 'true');
    ovBtn.classList.remove('is-on');
  }
  function toggleOv() { ov.classList.contains('is-open') ? closeOv() : openOv(); }
  ovBtn.addEventListener('click', toggleOv);
  ovClose.addEventListener('click', closeOv);
  ov.addEventListener('click', function (e) { if (e.target === ov) closeOv(); });

  // Fullscreen toggle.
  function fsActive() { return document.fullscreenElement || document.webkitFullscreenElement; }
  function toggleFs() {
    try {
      if (!fsActive()) {
        var el = document.documentElement;
        (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      } else {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      }
    } catch (e) {}
  }
  function syncFs() { fsBtn.classList.toggle('is-fs', !!fsActive()); }
  fsBtn.addEventListener('click', toggleFs);
  document.addEventListener('fullscreenchange', syncFs);
  document.addEventListener('webkitfullscreenchange', syncFs);

  // Keyboard shortcuts (deck-stage owns arrows; we add F / G / Esc).
  window.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key.toLowerCase();
    if (k === 'f') { e.preventDefault(); toggleFs(); }
    else if (k === 'g') { e.preventDefault(); toggleOv(); }
    else if (e.key === 'Escape' && ov.classList.contains('is-open')) { e.preventDefault(); closeOv(); }
  });

  setTimeout(sync, 60);
  setTimeout(sync, 400);
})();

/* ---------- premium experience: entrance, sweep, sound, present, play ---------- */
(function () {
  var deck = document.querySelector('deck-stage');
  if (!deck) return;
  var sweep = document.getElementById('vzSweep');
  var sections = Array.prototype.slice.call(document.querySelectorAll('deck-stage > section'));

  /* ---- entrance: dissolve + stagger + sweep + sound ---- */
  function onChange() {
    var idx = deck.index || 0;
    var sec = sections[idx];
    sections.forEach(function (s) { s.classList.remove('vz-enter'); });
    if (sec) { void sec.offsetWidth; sec.classList.add('vz-enter'); }
    if (sweep) { sweep.classList.remove('is-sweep'); void sweep.offsetWidth; sweep.classList.add('is-sweep'); setTimeout(function () { sweep.classList.remove('is-sweep'); }, 700); }
    tick();
    if (idx === (deck.length - 1)) setTimeout(swell, 250);
    if (idx !== 0 && card) card.style.transform = '';
  }
  deck.addEventListener('slidechange', onChange);
  setTimeout(onChange, 140);

  /* ---- sound design (synth, off by default) ---- */
  var soundOn = false, actx = null, soundBtn = document.getElementById('vzSound');
  function ctx() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return actx; }
  function tick() {
    if (!soundOn) return; var c = ctx(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = 680;
    o.connect(g); g.connect(c.destination); var t = c.currentTime;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    o.start(t); o.stop(t + 0.15);
  }
  function swell() {
    if (!soundOn) return; var c = ctx(); if (!c) return;
    [392, 523, 659].forEach(function (f, i) {
      var o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f;
      o.connect(g); g.connect(c.destination); var t = c.currentTime + i * 0.05;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
      o.start(t); o.stop(t + 1.6);
    });
  }
  function toggleSound() {
    soundOn = !soundOn; soundBtn.classList.toggle('is-on', soundOn);
    if (soundOn) { var c = ctx(); if (c && c.state === 'suspended') c.resume(); tick(); }
  }
  if (soundBtn) soundBtn.addEventListener('click', toggleSound);

  /* ---- present mode ---- */
  var present = false, presentBtn = document.getElementById('vzPresent'), toast = document.getElementById('vzToast');
  function showToast(msg) { if (!toast) return; toast.textContent = msg; toast.classList.add('is-show'); clearTimeout(toast.__t); toast.__t = setTimeout(function () { toast.classList.remove('is-show'); }, 2200); }
  function togglePresent() {
    present = !present;
    document.body.classList.toggle('vz-present', present);
    if (presentBtn) presentBtn.classList.toggle('is-on', present);
    window.dispatchEvent(new Event('resize'));
    showToast(present ? 'Present mode · press P to exit' : 'Present mode off');
  }
  if (presentBtn) presentBtn.addEventListener('click', togglePresent);

  /* ---- auto-play ---- */
  var playing = false, playBtn = document.getElementById('vzPlay'), playTimer = null, DWELL = 7000;
  function tickPlay() { if (!playing) return; if ((deck.index || 0) >= deck.length - 1) { stopPlay(); return; } deck.next(); playTimer = setTimeout(tickPlay, DWELL); }
  function startPlay() { playing = true; if (playBtn) playBtn.classList.add('is-playing'); if ((deck.index || 0) >= deck.length - 1) deck.goTo(0); playTimer = setTimeout(tickPlay, DWELL); showToast('Auto-play on'); }
  function stopPlay() { playing = false; if (playBtn) playBtn.classList.remove('is-playing'); clearTimeout(playTimer); }
  function togglePlay() { playing ? stopPlay() : startPlay(); }
  if (playBtn) playBtn.addEventListener('click', togglePlay);
  ['vzPrev', 'vzNext'].forEach(function (id) { var b = document.getElementById(id); if (b) b.addEventListener('click', stopPlay); });

  /* ---- hover-reactive brand card (cover only) ---- */
  var card = sections[0] && sections[0].querySelector('.brand-card');
  if (card) {
    card.style.transition = 'transform 0.2s ease';
    window.addEventListener('mousemove', function (e) {
      if ((deck.index || 0) !== 0 || present) return;
      var rx = ((e.clientY / window.innerHeight) - 0.5) * -6;
      var ry = ((e.clientX / window.innerWidth) - 0.5) * 8;
      card.style.transform = 'perspective(900px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
    });
  }

  /* ---- keys: P present, S sound ---- */
  window.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key.toLowerCase();
    if (k === 'p') { e.preventDefault(); togglePresent(); }
    else if (k === 's') { e.preventDefault(); toggleSound(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { stopPlay(); }
  });
})();

/* ---------- portrait rotate prompt dismiss ---------- */
(function () {
  var btn = document.getElementById('vzrAnyway');
  if (btn) btn.addEventListener('click', function () {
    document.body.classList.add('vz-rotate-dismiss');
    window.dispatchEvent(new Event('resize'));
  });
  window.addEventListener('orientationchange', function () {
    var portrait = window.matchMedia('(orientation: portrait)').matches;
    if (!portrait) document.body.classList.remove('vz-rotate-dismiss');
  });
})();
