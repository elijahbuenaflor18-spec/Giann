/* =========================================================================
   Vyzee premium FX — phase 2.
   Satisfying number count-ups + the self-drawing trajectory line, both
   re-fired each time their slide becomes active. Pure enhancement: guards
   for reduced-motion and no-ops if targets are absent.
   ========================================================================= */
(function () {
  var deck = document.querySelector('deck-stage');
  if (!deck) return;
  var sections = Array.prototype.slice.call(document.querySelectorAll('deck-stage > section'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function easeOutExpo(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }

  function fmt(v, dp, sep) {
    var s = dp ? v.toFixed(dp) : String(Math.round(v));
    if (sep) {
      var p = s.split('.');
      p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      s = p.join('.');
    }
    return s;
  }

  /* -------------------------------------------------------- COUNT-UP */
  function countUp(el) {
    var to = parseFloat(el.getAttribute('data-to'));
    var dp = parseInt(el.getAttribute('data-dp') || '0', 10);
    var sep = el.getAttribute('data-sep') === '1';
    if (isNaN(to)) return;
    if (reduce) { el.textContent = fmt(to, dp, sep); return; }
    var dur = 1150, start = null;
    el.textContent = fmt(0, dp, sep);
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min(1, (ts - start) / dur);
      el.textContent = fmt(to * easeOutExpo(t), dp, sep);
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = fmt(to, dp, sep);
    }
    requestAnimationFrame(step);
  }

  function runCounts(sec) {
    var els = Array.prototype.slice.call(sec.querySelectorAll('.cu'));
    els.forEach(function (el, i) {
      setTimeout(function () { countUp(el); }, 200 + i * 75);
    });
  }

  /* ------------------------------------------ SELF-DRAWING TRAJECTORY */
  function drawTraj(sec) {
    var line = sec.querySelector('#vzTrajLine');
    if (!line) return;
    var area = sec.querySelector('#vzTrajArea');
    var dots = sec.querySelector('#vzTrajDots');
    var cap = sec.querySelector('#vzTrajCap');
    var len;
    try { len = line.getTotalLength(); } catch (e) { return; }

    if (reduce) {
      line.style.strokeDasharray = 'none';
      line.style.strokeDashoffset = '0';
      if (area) area.style.opacity = '1';
      if (dots) dots.style.opacity = '1';
      if (cap) cap.style.opacity = '1';
      return;
    }

    [line, area, dots, cap].forEach(function (n) { if (n) n.style.transition = 'none'; });
    line.style.strokeDasharray = len;
    line.style.strokeDashoffset = len;
    if (area) area.style.opacity = '0';
    if (dots) dots.style.opacity = '0';
    if (cap) cap.style.opacity = '0';
    void line.getBoundingClientRect(); // flush

    requestAnimationFrame(function () {
      line.style.transition = 'stroke-dashoffset 1500ms cubic-bezier(0.65,0,0.35,1)';
      line.style.strokeDashoffset = '0';
      if (area) { area.style.transition = 'opacity 900ms ease 520ms'; area.style.opacity = '1'; }
      if (dots) { dots.style.transition = 'opacity 700ms ease 1180ms'; dots.style.opacity = '1'; }
      if (cap) { cap.style.transition = 'opacity 700ms ease 1380ms'; cap.style.opacity = '1'; }
    });

    /* Safety net: some throttled iframes never commit the rAF-driven
       stroke transition. Force the final DRAWN/visible state after the
       intended duration so the line can never stay stuck hidden. */
    var token = (drawTraj._t = (drawTraj._t || 0) + 1);
    setTimeout(function () {
      if (token !== drawTraj._t) return; // a newer slide took over
      line.style.transition = 'none';
      line.style.strokeDashoffset = '0';
      line.style.strokeDasharray = 'none';
      if (area) { area.style.transition = 'none'; area.style.opacity = '1'; }
      if (dots) { dots.style.transition = 'none'; dots.style.opacity = '1'; }
      if (cap) { cap.style.transition = 'none'; cap.style.opacity = '1'; }
    }, 2100);
  }

  /* --------------------------------------------------- PER-SLIDE FIRE */
  function animSlide(idx) {
    var sec = sections[idx];
    if (!sec) return;
    runCounts(sec);
    drawTraj(sec);
  }

  deck.addEventListener('slidechange', function (e) {
    animSlide(e.detail ? e.detail.index : (deck.index || 0));
  });
  setTimeout(function () { animSlide(deck.index || 0); }, 170);

  /* Re-fire the cover once the boot curtain lifts, so its number counts
     up in full view rather than behind the loader. */
  try {
    if (sessionStorage.getItem('vzBooted') !== '1') {
      var bo = new MutationObserver(function () {
        if (document.body.classList.contains('vz-booted')) {
          bo.disconnect();
          if ((deck.index || 0) === 0) animSlide(0);
        }
      });
      bo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
  } catch (e) {}
})();
