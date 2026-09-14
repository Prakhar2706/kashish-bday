/* =========================================================
   app.js — all the moving parts
   ========================================================= */
(() => {
'use strict';

const C = window.CONTENT;
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =========================================================
   0. Text injection from content.js
   ========================================================= */
function hydrateText() {
  $('#gateName').textContent = C.name;
  $('#endName').textContent  = C.name;
  $('#signOff').textContent  = C.signOff;
  $('#wishTitle').textContent = C.wishTitle;
  $('#wishBody').textContent  = C.wishBody;
  $('#heroImg').src = C.heroPhoto;
  $('#heroImg').alt = C.name;
  $('#playerTitle').textContent = 'for ' + C.name.toLowerCase();
  document.title = `Happy Birthday, ${C.name} ♡`;

  // date badge — "today" if it is actually her birthday
  const now = new Date();
  const [bm, bd] = C.birthday.split('-').map(Number);
  const isToday = now.getMonth() + 1 === bm && now.getDate() === bd;
  const label = new Date(2000, bm - 1, bd)
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  $('#dateBadge').textContent = isToday ? `${label} · aaj hai!` : label;

  // split the big name into per-letter spans for the stagger
  const el = $('#nameSplit');
  const chars = [...C.name];
  el.textContent = '';
  chars.forEach((ch, i) => {
    const s = document.createElement('span');
    s.className = 'ch';
    s.textContent = ch;
    s.style.animationDelay = `${0.05 * i}s, ${0.6 + 0.07 * i}s`;
    el.appendChild(s);
  });
}

/* =========================================================
   1. Petals — ambient falling blossoms
   ========================================================= */
function petals() {
  const cv = $('#petals'), ctx = cv.getContext('2d');
  let W, H, items = [], raf;
  const COLORS = ['#ffc9de', '#ffd9e8', '#e3d4ff', '#ffe0c9', '#fff0f6'];

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.width = innerWidth * dpr;
    H = cv.height = innerHeight * dpr;
    cv.style.width = innerWidth + 'px';
    cv.style.height = innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = innerWidth < 640 ? 22 : 44;
    items = Array.from({ length: count }, spawn);
  };

  function spawn() {
    return {
      x: Math.random() * innerWidth,
      y: Math.random() * -innerHeight,
      r: 4 + Math.random() * 8,
      vy: 0.25 + Math.random() * 0.75,
      vx: -0.35 + Math.random() * 0.7,
      rot: Math.random() * Math.PI * 2,
      vr: (-0.5 + Math.random()) * 0.02,
      sway: 0.4 + Math.random() * 1.4,
      t: Math.random() * 100,
      c: COLORS[(Math.random() * COLORS.length) | 0],
      a: 0.35 + Math.random() * 0.5
    };
  }

  function petal(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.a;
    ctx.fillStyle = p.c;
    ctx.beginPath();
    // teardrop petal
    ctx.moveTo(0, -p.r);
    ctx.bezierCurveTo(p.r * 0.9, -p.r * 0.5, p.r * 0.6, p.r * 0.8, 0, p.r);
    ctx.bezierCurveTo(-p.r * 0.6, p.r * 0.8, -p.r * 0.9, -p.r * 0.5, 0, -p.r);
    ctx.fill();
    ctx.restore();
  }

  function frame() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of items) {
      p.t += 0.02;
      p.y += p.vy;
      p.x += p.vx + Math.sin(p.t) * p.sway * 0.4;
      p.rot += p.vr;
      if (p.y - p.r > innerHeight) { Object.assign(p, spawn(), { y: -20, x: Math.random() * innerWidth }); }
      petal(p);
    }
    raf = requestAnimationFrame(frame);
  }

  addEventListener('resize', resize);
  resize();
  if (!REDUCED) frame();
  else { ctx.clearRect(0, 0, innerWidth, innerHeight); items.forEach(petal); }

  // pause when tab hidden — saves battery on her phone
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else if (!REDUCED) frame();
  });
}

/* =========================================================
   2. Confetti + sparkle engine (shared canvas)
   ========================================================= */
const Confetti = (() => {
  const cv = $('#confetti'), ctx = cv.getContext('2d');
  let parts = [], running = false, dpr = 1;
  const COLORS = ['#ff9ec4', '#c9b6ff', '#ffc9a8', '#ffe27a', '#ffffff', '#e66fa1'];

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', resize); resize();

  function loop() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(p => p.life > 0);
    for (const p of parts) {
      p.life--;
      p.vy += p.g;
      p.vx *= 0.99;
      p.x += p.vx; p.y += p.vy;
      p.rot += p.vr;
      const a = clamp(p.life / p.fade, 0, 1);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.c;
      if (p.kind === 'rect') {
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      } else if (p.kind === 'circle') {
        ctx.beginPath(); ctx.arc(0, 0, p.s / 2, 0, 7); ctx.fill();
      } else { // 4-point star
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const r1 = p.s / 2, r2 = p.s / 6, a1 = (i * Math.PI) / 2;
          ctx.lineTo(Math.cos(a1) * r1, Math.sin(a1) * r1);
          ctx.lineTo(Math.cos(a1 + Math.PI / 4) * r2, Math.sin(a1 + Math.PI / 4) * r2);
        }
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    if (parts.length) requestAnimationFrame(loop);
    else { running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }

  function push(list) {
    if (REDUCED) return;
    parts.push(...list);
    if (!running) { running = true; requestAnimationFrame(loop); }
  }

  return {
    burst(x, y, n = 90, power = 13) {
      push(Array.from({ length: n }, () => {
        const a = Math.random() * Math.PI * 2, sp = Math.random() * power + 2;
        return {
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3,
          g: 0.22 + Math.random() * 0.12, s: 6 + Math.random() * 9,
          rot: Math.random() * 7, vr: -0.2 + Math.random() * 0.4,
          life: 90 + Math.random() * 70, fade: 60,
          c: COLORS[(Math.random() * COLORS.length) | 0],
          kind: ['rect', 'circle', 'star'][(Math.random() * 3) | 0]
        };
      }));
    },
    rain(n = 160) {
      push(Array.from({ length: n }, () => ({
        x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.5,
        vx: -1.4 + Math.random() * 2.8, vy: 1 + Math.random() * 3,
        g: 0.045, s: 6 + Math.random() * 10,
        rot: Math.random() * 7, vr: -0.14 + Math.random() * 0.28,
        life: 320, fade: 90,
        c: COLORS[(Math.random() * COLORS.length) | 0],
        kind: ['rect', 'circle', 'star'][(Math.random() * 3) | 0]
      })));
    },
    sparkle(x, y) {
      push(Array.from({ length: 2 }, () => ({
        x, y, vx: -0.7 + Math.random() * 1.4, vy: -0.4 + Math.random() * 0.9,
        g: 0.012, s: 3 + Math.random() * 5,
        rot: Math.random() * 7, vr: 0.08,
        life: 34, fade: 34,
        c: ['#fff', '#ffe27a', '#ff9ec4', '#c9b6ff'][(Math.random() * 4) | 0],
        kind: 'star'
      })));
    }
  };
})();

/* =========================================================
   3. Cursor glow + sparkle trail
   ========================================================= */
function cursor() {
  if (!matchMedia('(hover:hover)').matches || REDUCED) return;
  const dot = $('#cursorDot');
  let last = 0;
  addEventListener('pointermove', e => {
    dot.classList.add('on');
    dot.style.transform = `translate(${e.clientX - 13}px,${e.clientY - 13}px)`;
    const now = performance.now();
    if (now - last > 42) { last = now; Confetti.sparkle(e.clientX, e.clientY); }
  }, { passive: true });
  addEventListener('pointerleave', () => dot.classList.remove('on'));
}

/* =========================================================
   4. Hero rotator (typewriter)
   ========================================================= */
function rotator() {
  const el = $('#rotator');
  const lines = C.heroLines;
  if (REDUCED) { el.textContent = lines[0]; return; }
  let li = 0, ci = 0, dir = 1;
  (function tick() {
    const word = lines[li];
    ci += dir;
    el.textContent = word.slice(0, ci);
    let wait = dir > 0 ? 58 : 28;
    if (dir > 0 && ci === word.length) { dir = -1; wait = 1750; }
    else if (dir < 0 && ci === 0) { dir = 1; li = (li + 1) % lines.length; wait = 320; }
    setTimeout(tick, wait);
  })();
}

/* =========================================================
   5. Polaroid tilt
   ========================================================= */
function tilt() {
  const el = $('#heroPolaroid');
  if (!el || !matchMedia('(hover:hover)').matches) return;
  const zone = $('.hero-photo');
  zone.addEventListener('pointermove', e => {
    const r = zone.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--ry', `${px * 17}deg`);
    el.style.setProperty('--rx', `${-py * 17}deg`);
  });
  zone.addEventListener('pointerleave', () => {
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--rx', '0deg');
  });
}

/* =========================================================
   6. The carousel — 3D coverflow ring
   ========================================================= */
const Carousel = (() => {
  const ring = $('#ring'), stage = $('#ringStage');
  // fresh order on every visit, so the ring never feels like the same gallery twice
  const photos = (() => {
    const a = C.photos.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  })();
  const N = photos.length;
  let cards = [], pos = 0, target = 0, vel = 0, dragging = false, autoplay = true, raf;

  function build() {
    $('#ringTotal').textContent = N;
    const frag = document.createDocumentFragment();
    photos.forEach((p, i) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-inner">
          <img src="${p.src}" alt="${(p.caption || '').replace(/"/g, '')}"
               style="object-position:${p.pos || '50% 20%'}"
               loading="${i < 6 ? 'eager' : 'lazy'}" decoding="async" draggable="false" />
          <p class="card-tag">${p.caption || ''}</p>
        </div>`;
      card.addEventListener('click', () => {
        const k = wrap(i - pos);
        if (Math.abs(k) < 0.55) Lightbox.open(i, photos);
        else { target = pos + k; autoplay = false; }
      });
      cards.push(card);
      frag.appendChild(card);
    });
    ring.appendChild(frag);
  }

  // shortest signed distance around the loop
  const wrap = k => {
    k = ((k % N) + N) % N;
    return k > N / 2 ? k - N : k;
  };

  function layout() {
    let front = 0, best = 1e9;
    cards.forEach((card, i) => {
      const k = wrap(i - pos);
      const ak = Math.abs(k);
      if (ak < best) { best = ak; front = i; }

      const kk = clamp(k, -6, 6);
      const x  = kk * 118;
      const z  = -Math.abs(kk) * 108;
      const ry = -kk * 20;
      const sc = 1 - Math.min(ak, 6) * 0.042;
      const y  = Math.abs(kk) * 6;

      card.style.transform =
        `translate3d(${x}px,${y}px,${z}px) rotateY(${ry}deg) scale(${sc})`;
      card.style.opacity = ak > 5.2 ? 0 : 1;
      card.style.zIndex = String(200 - Math.round(ak * 10));
      card.classList.toggle('front', ak < 0.5);
      card.classList.toggle('far', ak > 2.6);
    });
    setFront(front);
  }

  let shownFront = -1;
  function setFront(i) {
    if (i === shownFront) return;
    shownFront = i;
    $('#ringIdx').textContent = i + 1;
    const cap = $('#ringCaption');
    cap.style.opacity = 0;
    setTimeout(() => {
      cap.textContent = photos[i].caption || '\u00a0';
      cap.style.opacity = 1;
    }, 170);
  }

  function frame() {
    if (!dragging) {
      if (autoplay && Math.abs(target - pos) < 0.002) target += 0.0022 * 60 / 60;
      pos += (target - pos) * 0.09;
    }
    layout();
    raf = requestAnimationFrame(frame);
  }

  function go(d) { autoplay = false; target = Math.round(target) + d; }

  function drag() {
    let startX = 0, startPos = 0, lastX = 0, lastT = 0, id = null, travel = 0;
    let tapCard = -1;
    stage.addEventListener('pointerdown', e => {
      if (e.button) return;
      // the arrows live inside the stage — don't treat tapping them as a drag,
      // or the release below would snap the position back and cancel the step
      if (e.target.closest('.ring-nav')) return;
      dragging = true; autoplay = false; id = e.pointerId; travel = 0;
      // pointer capture below sends the follow-up click to the stage, not the
      // card, so remember which card the press started on and act on release
      tapCard = cards.indexOf(e.target.closest('.card'));
      stage.setPointerCapture(id);
      stage.classList.add('dragging');
      startX = lastX = e.clientX; startPos = pos; vel = 0; lastT = performance.now();
    });
    stage.addEventListener('pointermove', e => {
      if (!dragging || e.pointerId !== id) return;
      const dx = e.clientX - startX;
      travel = Math.max(travel, Math.abs(dx));
      pos = startPos - dx / 120;
      const now = performance.now(), dt = now - lastT;
      if (dt > 0) vel = (e.clientX - lastX) / dt;
      lastX = e.clientX; lastT = now;
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      stage.classList.remove('dragging');
      // a tap is not a drag — treat it as picking that card
      if (travel < 6) {
        if (tapCard > -1) {
          const k = wrap(tapCard - pos);
          if (Math.abs(k) < 0.55) Lightbox.open(tapCard, photos);
          else target = Math.round(pos + k);
        }
        return;
      }
      // momentum, then snap to the nearest card
      target = Math.round(pos - vel * 3.4);
    };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    stage.addEventListener('lostpointercapture', end);
    // don't let a drag turn into a stray click
    stage.addEventListener('dragstart', e => e.preventDefault());
  }

  function init() {
    build(); drag(); layout();
    $('#ringPrev').addEventListener('click', () => go(-1));
    $('#ringNext').addEventListener('click', () => go(1));
    addEventListener('keydown', e => {
      if ($('#lightbox').hidden === false) return;
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    });
    // horizontal trackpad / shift-wheel
    stage.addEventListener('wheel', e => {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
      if (!dx) return;
      e.preventDefault();
      autoplay = false;
      target += dx / 160;
    }, { passive: false });

    // only animate while the section is on screen
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting) { if (!raf) raf = requestAnimationFrame(frame); }
      else { cancelAnimationFrame(raf); raf = null; }
    }, { rootMargin: '160px' }).observe(stage);
  }

  return { init, focus: i => { autoplay = false; target = pos + wrap(i - pos); } };
})();

/* =========================================================
   7. Lightbox
   ========================================================= */
const Lightbox = (() => {
  const box = $('#lightbox'), img = $('#lbImg'), cap = $('#lbCap');
  let list = [], idx = 0;

  function show() {
    const it = list[idx];
    img.src = it.src;
    img.alt = it.caption || '';
    cap.textContent = it.caption || '';
    img.style.animation = 'none';
    void img.offsetWidth;
    img.style.animation = '';
  }
  function open(i, custom) {
    list = custom || C.photos;
    idx = i;
    box.hidden = false;
    document.body.style.overflow = 'hidden';
    show();
  }
  function close() {
    box.hidden = true;
    document.body.style.overflow = '';
  }
  const step = d => { idx = (idx + d + list.length) % list.length; show(); };

  $('#lbClose').addEventListener('click', close);
  $('#lbPrev').addEventListener('click', e => { e.stopPropagation(); step(-1); });
  $('#lbNext').addEventListener('click', e => { e.stopPropagation(); step(1); });
  box.addEventListener('click', e => { if (e.target === box || e.target.tagName === 'FIGURE') close(); });
  addEventListener('keydown', e => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
  // swipe on mobile
  let sx = null;
  box.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', e => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 55) step(dx < 0 ? 1 : -1);
    sx = null;
  }, { passive: true });

  return { open, close };
})();

/* =========================================================
   8. Reveal on scroll
   ========================================================= */
function reveals() {
  const io = new IntersectionObserver(es => {
    es.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
  $$('.reveal, .tl-item, .flip').forEach(el => io.observe(el));
}

/* =========================================================
   9. Timeline
   ========================================================= */
function timeline() {
  const list = $('#timelineList');
  const items = C.timeline;
  const shots = [];
  items.forEach((t, i) => {
    const row = document.createElement('article');
    row.className = 'tl-item' + (i % 2 ? ' alt' : '');
    row.innerHTML = `
      <div class="tl-card">
        <p class="tl-date">${t.date}</p>
        <h3 class="tl-title">${t.title}</h3>
        <p class="tl-body">${t.body}</p>
      </div>
      <span class="tl-dot"></span>
      <div class="tl-photo">
        <div class="shot" style="--tilt:${(i % 2 ? 1 : -1) * (1.6 + (i % 3))}deg">
          <img src="${t.photo}" alt="${t.title}"
               style="object-position:${t.pos || '50% 20%'}"
               loading="lazy" decoding="async" />
        </div>
      </div>`;
    list.appendChild(row);
    shots.push({ src: t.photo, caption: `${t.date} — ${t.title}` });
    row.querySelector('.shot').addEventListener('click', () => Lightbox.open(i, shots));
  });

  // spine fill follows the scroll position
  const bar = $('#tlProgress'), spine = $('.tl-spine');
  let queued = false;
  const paint = () => {
    queued = false;
    const r = spine.getBoundingClientRect();
    const p = clamp((innerHeight * 0.62 - r.top) / r.height, 0, 1);
    bar.style.height = (p * 100) + '%';
  };
  addEventListener('scroll', () => {
    if (!queued) { queued = true; requestAnimationFrame(paint); }
  }, { passive: true });
  paint();
}

/* =========================================================
   10. Flip cards
   ========================================================= */
function reasons() {
  const wrap = $('#cards');
  const list = C.reasons;
  $('#flipTotal').textContent = list.length;
  let opened = 0;

  list.forEach((r, i) => {
    const el = document.createElement('button');
    el.className = 'flip';
    el.type = 'button';
    el.setAttribute('aria-label', 'Reveal ' + r.front);
    el.style.transitionDelay = `${(i % 5) * 0.07}s`;
    el.innerHTML = `
      <span class="flip-in">
        <span class="flip-face flip-front">
          <span class="heart">${['♡', '✿', '✧', '❀', '♥'][i % 5]}</span>
          <b>${r.front}</b>
          <small>tap kar</small>
        </span>
        <span class="flip-face flip-back"><p>${r.back}</p></span>
      </span>`;
    el.addEventListener('click', e => {
      const first = !el.classList.contains('open');
      el.classList.toggle('open');
      if (first) {
        opened++;
        $('#flipCount').textContent = opened;
        const b = el.getBoundingClientRect();
        Confetti.burst(b.left + b.width / 2, b.top + b.height / 2, 22, 7);
        if (opened === list.length) {
          Confetti.rain(140);
          $('.cards-progress').textContent = 'saari khul gayi. har ek. ❤️';
        }
      }
    });
    wrap.appendChild(el);
  });
}

/* =========================================================
   11. Cake — blow out the candles
   ========================================================= */
function cake() {
  const COUNT = 5;
  const box = $('#candles'), cakeEl = $('#cakeEl');
  const status = $('#micStatus');
  let done = false;

  cakeEl.classList.add('lit');
  for (let i = 0; i < COUNT; i++) {
    const c = document.createElement('div');
    c.className = 'candle';
    c.innerHTML = '<i class="wick"></i><i class="flame"></i><i class="smoke"></i>';
    box.appendChild(c);
  }
  const candles = $$('.candle', box);

  function blow(n = 1) {
    if (done) return;
    const lit = candles.filter(c => !c.classList.contains('out'));
    if (!lit.length) return;
    lit.sort(() => Math.random() - 0.5).slice(0, n)
       .forEach((c, i) => setTimeout(() => c.classList.add('out'), i * 110));
    if (lit.length <= n) setTimeout(finish, 420);
  }

  function finish() {
    if (done) return;
    done = true;
    cakeEl.classList.remove('lit');
    $('#cakeDone').hidden = false;
    status.textContent = '';
    const b = cakeEl.getBoundingClientRect();
    Confetti.burst(b.left + b.width / 2, b.top + b.height * 0.2, 130, 16);
    Confetti.rain(120);
    stopMic();
  }

  $('#puffBtn').addEventListener('click', () => blow(1 + ((Math.random() * 2) | 0)));
  candles.forEach(c => c.addEventListener('click', () => { c.classList.add('out');
    if (candles.every(x => x.classList.contains('out'))) setTimeout(finish, 400); }));

  /* --- microphone breath detection --- */
  let ac = null, stream = null, micRaf = null;

  function stopMic() {
    if (micRaf) cancelAnimationFrame(micRaf), micRaf = null;
    if (stream) stream.getTracks().forEach(t => t.stop()), stream = null;
    if (ac && ac.state !== 'closed') ac.close(), ac = null;
  }

  $('#micBtn').addEventListener('click', async () => {
    if (done) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      status.textContent = 'mic available nahi — tap wala button use kar';
      return;
    }
    status.textContent = 'mic ka permission maang raha hu…';
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
    } catch {
      status.textContent = 'mic band hai — dusre button se bujha de';
      return;
    }
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const src = ac.createMediaStreamSource(stream);
    const an = ac.createAnalyser();
    an.fftSize = 1024;
    an.smoothingTimeConstant = 0.5;
    src.connect(an);
    const buf = new Uint8Array(an.frequencyBinCount);
    status.textContent = 'ab screen pe phoonk maar 💨';

    let hot = 0;
    (function listen() {
      an.getByteFrequencyData(buf);
      // breath = broadband energy, weighted to the low/mid bins
      let sum = 0;
      const top = Math.floor(buf.length * 0.55);
      for (let i = 2; i < top; i++) sum += buf[i];
      const level = sum / (top - 2);
      if (level > 42) { hot++; } else { hot = Math.max(0, hot - 1); }
      if (hot > 5) { hot = 0; blow(2); }
      if (!done) micRaf = requestAnimationFrame(listen);
    })();
  });

  // auto-finish if she scrolls past without playing? no — leave it to her.
}

/* =========================================================
   12. Letter typewriter
   ========================================================= */
function letter() {
  const body = $('#letterBody'), btn = $('#letterBtn');
  let started = false;

  btn.addEventListener('click', () => {
    if (started) return;
    started = true;
    btn.disabled = true;
    btn.textContent = 'likh raha hu…';

    if (REDUCED) {
      body.innerHTML = C.letter.map(p => `<p>${p}</p>`).join('');
      btn.remove();
      return;
    }

    let pi = 0;
    const nextPara = () => {
      if (pi >= C.letter.length) {
        $$('.cur', body).forEach(c => c.remove());
        btn.remove();
        return;
      }
      const p = document.createElement('p');
      const cur = document.createElement('i');
      cur.className = 'cur';
      body.appendChild(p);
      p.appendChild(cur);
      const text = C.letter[pi];
      let ci = 0;
      (function type() {
        if (ci < text.length) {
          cur.before(document.createTextNode(text[ci]));
          ci++;
          const ch = text[ci - 1];
          const d = /[.!?]/.test(ch) ? 120 : /[,—]/.test(ch) ? 70 : 9 + Math.random() * 14;
          setTimeout(type, d);
        } else {
          cur.remove();
          pi++;
          setTimeout(nextPara, 330);
        }
      })();
    };
    nextPara();
  });
}

/* =========================================================
   13. Music — real file if present, generated melody if not
   ========================================================= */
const Music = (() => {
  const el = $('#audio'), btn = $('#musicBtn'), sub = $('#playerSub');
  let playing = false, synth = null, useSynth = false;

  /* Fallback: a soft music-box "Happy Birthday" via WebAudio,
     so the site has a soundtrack even with no mp3 committed. */
  function makeSynth() {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ac = new AC();
    const out = ac.createGain();
    out.gain.value = 0.0;
    const dly = ac.createDelay(0.6);
    dly.delayTime.value = 0.28;
    const fb = ac.createGain(); fb.gain.value = 0.26;
    const wet = ac.createGain(); wet.gain.value = 0.3;
    out.connect(ac.destination);
    out.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(wet); wet.connect(ac.destination);

    const N = f => f;
    const G4 = 392, A4 = 440, B4 = 493.88, C5 = 523.25, D5 = 587.33,
          E5 = 659.25, F5 = 698.46, G5 = 783.99, A5 = 880;
    // dreamy arpeggio over F - Dm - Bb - C, matching the committed loop
    const song = [
      [A4,.5],[C5,.5],[F5,.5],[C5,.5],[A4,.5],[F5,.5],[C5,1],
      [A4,.5],[D5,.5],[F5,.5],[A5,.5],[F5,.5],[D5,.5],[A4,1],
      [G4,.5],[B4,.5],[D5,.5],[F5,.5],[D5,.5],[B4,.5],[G4,1],
      [C5,.5],[E5,.5],[G5,.5],[E5,.5],[C5,.5],[G4,.5],[C5,1.5]
    ];
    const BEAT = 0.42;
    let timer = null;

    function note(f, t, dur) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'triangle';
      o.frequency.value = N(f);
      // gentle bell envelope
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.95);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + dur + 0.05);
      // shimmer octave
      const o2 = ac.createOscillator(), g2 = ac.createGain();
      o2.type = 'sine'; o2.frequency.value = N(f) * 2;
      g2.gain.setValueAtTime(0, t);
      g2.gain.linearRampToValueAtTime(0.055, t + 0.02);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.7);
      o2.connect(g2); g2.connect(out);
      o2.start(t); o2.stop(t + dur + 0.05);
    }

    function schedule() {
      let t = ac.currentTime + 0.15;
      song.forEach(([f, b]) => { note(f, t, b * BEAT); t += b * BEAT; });
      const total = song.reduce((s, [, b]) => s + b, 0) * BEAT;
      timer = setTimeout(schedule, (total + 1.4) * 1000);
    }

    return {
      async start() {
        if (ac.state === 'suspended') await ac.resume();
        out.gain.cancelScheduledValues(ac.currentTime);
        out.gain.linearRampToValueAtTime(0.5, ac.currentTime + 0.8);
        if (!timer) schedule();
      },
      stop() {
        out.gain.linearRampToValueAtTime(0, ac.currentTime + 0.4);
        clearTimeout(timer); timer = null;
      }
    };
  }

  async function play() {
    if (!useSynth) {
      try {
        el.volume = 0;
        await el.play();
        // fade in
        let v = 0;
        const f = setInterval(() => {
          v = Math.min(0.55, v + 0.03);
          el.volume = v;
          if (v >= 0.55) clearInterval(f);
        }, 60);
        set(true, 'chal raha hai');
        return;
      } catch {
        useSynth = true; // no file, or blocked
      }
    }
    synth = synth || makeSynth();
    await synth.start();
    set(true, 'chal raha hai');
  }

  function pause() {
    if (useSynth) synth?.stop(); else el.pause();
    set(false, 'tap kar ke chala');
  }

  function set(on, label) {
    playing = on;
    btn.setAttribute('aria-pressed', String(on));
    sub.textContent = label;
  }

  btn.addEventListener('click', () => playing ? pause() : play());
  el.addEventListener('error', () => { useSynth = true; });

  return { play, pause, show: () => $('#player').classList.add('show') };
})();

/* =========================================================
   14. Gate
   ========================================================= */
function gate() {
  const g = $('#gate');
  $('#openBtn').addEventListener('click', () => {
    g.classList.add('gone');
    document.body.classList.remove('is-locked');
    setTimeout(() => { g.remove(); }, 1000);
    Confetti.rain(180);
    setTimeout(() => Confetti.burst(innerWidth / 2, innerHeight * 0.4, 110, 15), 150);
    Music.play();          // user gesture — autoplay is allowed here
    setTimeout(Music.show, 900);
    rotator();
  });
}

/* =========================================================
   15. Finale
   ========================================================= */
function finale() {
  $('#finaleBtn').addEventListener('click', e => {
    Confetti.rain(220);
    const b = e.currentTarget.getBoundingClientRect();
    Confetti.burst(b.left + b.width / 2, b.top, 140, 17);
    for (let i = 1; i <= 4; i++) {
      setTimeout(() => Confetti.burst(
        innerWidth * (0.15 + Math.random() * 0.7),
        innerHeight * (0.2 + Math.random() * 0.5), 80, 14), i * 260);
    }
  });
}

/* =========================================================
   boot
   ========================================================= */
hydrateText();
petals();
cursor();
tilt();
Carousel.init();
timeline();
reasons();
reveals();
cake();
letter();
finale();
gate();

})();
