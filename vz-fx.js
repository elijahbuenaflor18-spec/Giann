/* =========================================================================
   Vyzee premium FX — boot, cursor, magnetism, parallax, spine, micro-pulses.
   Pure progressive enhancement: every block guards for touch / reduced-motion
   and no-ops if its target isn't present. Slide transitions themselves are
   handled in CSS (.vz-enter dissolve) so they cover keyboard nav too.
   ========================================================================= */
(function () {
  var deck = document.querySelector('deck-stage');
  var sections = Array.prototype.slice.call(document.querySelectorAll('deck-stage > section'));
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isPresent = function () { return document.body.classList.contains('vz-present'); };

  /* ---------------------------------------------------------------- BOOT */
  (function boot() {
    var el = document.getElementById('vzBoot');
    if (!el) { document.body.classList.add('vz-booted'); return; }
    var done = false;
    function finish() {
      if (done) return; done = true;
      el.classList.add('is-gone');
      document.body.classList.add('vz-booted');
      try { sessionStorage.setItem('vzBooted', '1'); } catch (e) {}
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 800);
    }
    var seen = false;
    try { seen = sessionStorage.getItem('vzBooted') === '1'; } catch (e) {}
    if (seen || reduce) {
      // already booted this session — skip the show
      el.style.transition = 'none';
      finish();
      return;
    }
    setTimeout(finish, 2500);
    ['click', 'keydown', 'touchstart'].forEach(function (ev) {
      window.addEventListener(ev, finish, { once: true, passive: true });
    });
  })();

  /* ------------------------------------------------------ NEON DOT CURSOR */
  if (fine) {
    document.documentElement.classList.add('vz-cursor-on');
    var cur = document.getElementById('vzCursor');
    if (cur) {
      var tx = -100, ty = -100, cx = -100, cy = -100, raf = null;
      function loop() {
        cx += (tx - cx) * 0.28; cy += (ty - cy) * 0.28;
        cur.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
        if (Math.abs(tx - cx) > 0.4 || Math.abs(ty - cy) > 0.4) { raf = requestAnimationFrame(loop); }
        else { raf = null; }
      }
      window.addEventListener('mousemove', function (e) {
        tx = e.clientX; ty = e.clientY;
        cur.style.opacity = '1';
        if (!raf) raf = requestAnimationFrame(loop);
      }, { passive: true });
      window.addEventListener('mousedown', function () { cur.classList.add('is-down'); });
      window.addEventListener('mouseup', function () { cur.classList.remove('is-down'); });
      window.addEventListener('mouseout', function (e) { if (!e.relatedTarget) cur.style.opacity = '0'; });
      var hotSel = 'a,button,input,[role="button"],.vz-tick,.vz-node,.vz-path,.vz-card,#vzHandle,.vz-icon,.vz-btn';
      document.addEventListener('mouseover', function (e) {
        if (e.target.closest && e.target.closest(hotSel)) cur.classList.add('is-hot');
      });
      document.addEventListener('mouseout', function (e) {
        if (e.target.closest && e.target.closest(hotSel)) cur.classList.remove('is-hot');
      });
    }
  }

  /* ------------------------------------------------------ MAGNETIC BUTTONS */
  if (fine && !reduce) {
    var magnets = Array.prototype.slice.call(document.querySelectorAll('.vz-btn, .vz-icon'));
    magnets.forEach(function (b) {
      var R = 70, pull = 0.34;
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        if (Math.hypot(dx, dy) < R + Math.max(r.width, r.height) / 2) {
          b.style.transform = 'translate(' + (dx * pull) + 'px,' + (dy * pull) + 'px)';
        }
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }

  /* -------------------------------------------------- CURSOR-REACTIVE HERO */
  var HERO_SEL = '.cover-title, .closing-title, .quote-pull, .vyzee-word, .cost-col .big';
  var hero = null;
  function pickHero(idx) {
    if (hero) { hero.style.transform = ''; hero = null; }
    var sec = sections[idx];
    if (!sec) return;
    hero = sec.querySelector(HERO_SEL);
    if (hero) { hero.style.transition = 'transform 0.25s cubic-bezier(0.22,1,0.36,1)'; hero.style.willChange = 'transform'; }
  }
  if (fine && !reduce) {
    window.addEventListener('mousemove', function (e) {
      if (!hero || isPresent()) return;
      var rx = (e.clientX / window.innerWidth - 0.5);
      var ry = (e.clientY / window.innerHeight - 0.5);
      hero.style.transform = 'perspective(1200px) translate3d(' + (rx * 18) + 'px,' + (ry * 12) + 'px,0) rotateY(' + (rx * 3) + 'deg) rotateX(' + (-ry * 2.2) + 'deg)';
    }, { passive: true });
  }

  /* --------------------------------------------------------- MOVEMENT SPINE */
  var spine = document.getElementById('vzSpine');
  var spineGlow = document.getElementById('vzSpineGlow');
  var nodes = [];
  if (spine && sections.length) {
    var labels = sections.map(function (s, i) {
      var raw = (s.getAttribute('data-label') || ('Slide ' + (i + 1))).trim();
      var m = raw.match(/^\d+\s+(.*)$/); return m ? m[1] : raw;
    });
    sections.forEach(function (s, i) {
      var n = document.createElement('button');
      n.className = 'vz-node'; n.type = 'button';
      n.setAttribute('aria-label', 'Go to ' + labels[i]);
      n.innerHTML = '<i></i><span class="vz-node-lbl">' + String(i + 1).padStart(2, '0') + ' · ' + labels[i] + '</span>';
      n.addEventListener('click', function () { if (deck) deck.goTo(i); });
      spine.appendChild(n); nodes.push(n);
    });
  }
  function syncSpine(idx) {
    if (!nodes.length) return;
    nodes.forEach(function (n, k) {
      n.classList.toggle('is-current', k === idx);
      n.classList.toggle('is-past', k < idx);
    });
    if (spineGlow && nodes.length > 1) {
      spineGlow.style.height = (idx / (nodes.length - 1) * 100) + '%';
    }
  }

  /* ----------------------------------------- "WHAT CHANGES" NUMBER PULSE */
  var toggle = document.getElementById('vzPathToggle');
  var costTable = document.getElementById('vzCostTable');
  if (toggle && costTable) {
    toggle.addEventListener('click', function (e) {
      var b = e.target.closest('.vz-path'); if (!b) return;
      var path = b.getAttribute('data-path');
      // pulse the cells that are now in focus
      var sel = path === 'a' ? '.now' : path === 'b' ? '.then, .delta' : '.now, .then, .delta';
      Array.prototype.forEach.call(costTable.querySelectorAll(sel), function (c) {
        c.classList.remove('vz-numpulse'); void c.offsetWidth; c.classList.add('vz-numpulse');
      });
      var fig = document.querySelector('.cost-total .figure');
      if (fig) { fig.classList.remove('vz-numpulse'); void fig.offsetWidth; fig.classList.add('vz-numpulse'); }
    });
  }

  /* -------------------------------------------------------- OPEN COUNT */
  (function opens() {
    var el = document.getElementById('vzOpens');
    if (!el) return;
    var n = 1;
    try {
      n = (parseInt(localStorage.getItem('vzOpenCount'), 10) || 0) + 1;
      localStorage.setItem('vzOpenCount', String(n));
    } catch (e) {}
    if (n <= 1) return; // first visit: stay quiet
    function ordinal(v) {
      var s = ['th', 'st', 'nd', 'rd'], m = v % 100;
      return v + (s[(m - 20) % 10] || s[m] || s[0]);
    }
    el.innerHTML = '<span class="dot"></span>Justin, this is your <b>' + ordinal(n) + '</b> time here';
    el.hidden = false;
  })();

  /* -------------------------------------------------------- ON SLIDE CHANGE */
  function onChange() {
    var idx = deck ? (deck.index || 0) : 0;
    syncSpine(idx);
    pickHero(idx);
  }
  if (deck) {
    deck.addEventListener('slidechange', onChange);
    setTimeout(onChange, 200);
    setTimeout(onChange, 600);
  }
})();
