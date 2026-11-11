(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const app = $('#app');
  const CFG = window.DEDICATORIA, T = window.TIMING, C = window.CARDS, S = window.SCENES;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // Safari y todos los navegadores del iPhone (mismo motor): ahí el audio y el temblor de los dibujos van por otro camino
  const UA = navigator.userAgent;
  const WK = 'GestureEvent' in window || (/AppleWebKit/.test(UA) && !/Chrome|Chromium|Edg/.test(UA));
  const IOS = /iP(hone|ad|od)/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  /* ------------------------------------------------------------------
     Textos
     ------------------------------------------------------------------ */
  $('#gate-for').textContent = CFG.para;
  $('#gate-ask').textContent = CFG.pregunta;
  $('#fin-title').textContent = [].concat(CFG.finalTitulo).join('\n');
  $('#fin-note').textContent = CFG.finalNota;
  $('#fin-sign').textContent = CFG.firma || '';

  /* ------------------------------------------------------------------
     Reproductor: dos pistas con el mismo reloj.
     La pista del otro idioma corre en silencio para que el cambio sea
     instantáneo; si el teléfono no lo permite, se cambia buscando el segundo.
     ------------------------------------------------------------------ */
  const A = { en: $('#a-en'), es: $('#a-es') };
  const tap = $('#tapstart');

  /* Safari / iPhone: las dos versiones se decodifican completas y suenan con un solo reloj (Web Audio).
     Cambiar de idioma es solo subir una y bajar la otra: no hay que buscar el segundo ni sincronizar
     dos reproductores, que es justo lo que Safari hace mal. Si aún no terminan de cargar, o algo falla,
     se usa el reproductor de siempre (más abajo) y este toma el mando en el siguiente toque. */
  const W = (() => {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!WK || !AC || !window.fetch) return null;
    let ctx;
    try { ctx = new AC(); } catch (e) { return null; }
    const buf = {}, gain = {}, src = {};
    let gen = 0, pos = 0, t0 = 0, keep = null;
    for (const k in A) { gain[k] = ctx.createGain(); gain[k].connect(ctx.destination); }

    // iPhone viejo: sin esto, el interruptor de silencio calla la canción. Un audio mudo en bucle la pasa al canal de música.
    if (IOS && !navigator.audioSession) {
      try {
        // medio segundo de silencio en WAV (8 kHz, 8 bits, mono)
        const n = 4000, b = new Uint8Array(44 + n), v = new DataView(b.buffer);
        const tag = (o, s) => { for (let i = 0; i < 4; i++) b[o + i] = s.charCodeAt(i); };
        tag(0, 'RIFF'); v.setUint32(4, 36 + n, true); tag(8, 'WAVE'); tag(12, 'fmt ');
        v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
        v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
        tag(36, 'data'); v.setUint32(40, n, true);
        b.fill(128, 44);
        keep = new Audio(URL.createObjectURL(new Blob([b], { type: 'audio/wav' })));
        keep.loop = true; keep.setAttribute('playsinline', '');
      } catch (e) { keep = null; }
    }
    const hum = () => { if (keep && keep.paused) { const q = keep.play(); if (q && q.catch) q.catch(() => {}); } };

    const w = {
      ready: false, on: false, playing: false, lang: 'en', onend: null, onstop: null,
      get running() { return ctx.state === 'running'; },
      dur() { return buf.en.duration; },
      len(l) { return buf[l].duration; },
      // siempre dentro de un toque: así Safari deja sonar
      unlock() {
        try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
        if (ctx.state !== 'running') { try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
        if (w.on && w.playing) hum();
      },
      // toma el mando en el segundo t (los reproductores normales se callan)
      take(t) { A.en.pause(); A.es.pause(); w.on = true; pos = Math.max(0, t || 0); },
      time() {
        if (!w.playing) return pos;
        const lat = Math.min(0.25, (ctx.baseLatency || 0) + (ctx.outputLatency || 0));
        return clamp(pos + ctx.currentTime - t0 - lat, pos, buf.en.duration);
      },
      stop() {
        gen++;
        for (const k in src) {
          try { src[k].onended = null; src[k].stop(); } catch (e) {}
          try { src[k].disconnect(); } catch (e) {}
          delete src[k];
        }
      },
      play() {
        w.stop();
        const g = gen, when = ctx.currentTime + 0.04;
        for (const k in gain) {
          const s = ctx.createBufferSource();
          s.buffer = buf[k]; s.connect(gain[k]);
          s.onended = () => { if (g === gen && w.playing && k === w.lang && w.onend) w.onend(); };
          s.start(when, clamp(pos, 0, buf[k].duration - 0.2));
          src[k] = s;
        }
        t0 = when; w.playing = true;
        hum();
      },
      pause() {
        if (w.playing) pos = w.time();
        w.stop(); w.playing = false;
        if (keep) keep.pause();
      },
      seek(t) { pos = Math.max(0, t); if (w.playing) w.play(); },
      // sube una versión y baja la otra (30 ms, para que no truene)
      mix(l) {
        w.lang = l;
        const now = ctx.currentTime;
        for (const k in gain) {
          const p = gain[k].gain, v = k === l ? 1 : 0;
          try {
            p.cancelScheduledValues(0);
            if (w.playing) { p.setValueAtTime(p.value, now); p.linearRampToValueAtTime(v, now + 0.03); }
            else p.setValueAtTime(v, now);
          } catch (e) { p.value = v; }
        }
      },
    };

    // una llamada, Siri o cambiar de app cortan el audio: si no vuelve solo, queda en pausa
    ctx.onstatechange = () => {
      if (!w.on || !w.playing || ctx.state === 'running') return;
      try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
      setTimeout(() => { if (w.on && w.playing && ctx.state !== 'running' && w.onstop) w.onstop(); }, 1200);
    };

    const load = k => fetch(A[k].getAttribute('src'))
      .then(r => { if (!r.ok) throw new Error('audio'); return r.arrayBuffer(); })
      .then(ab => new Promise((ok, no) => { const p = ctx.decodeAudioData(ab, ok, no); if (p && p.catch) p.catch(() => {}); }))
      .then(b => { buf[k] = b; });
    w.failed = false; w.onready = null;
    Promise.all([load('en'), load('es')])
      .then(() => { w.ready = true; if (w.onready) w.onready(); })
      .catch(() => { w.failed = true; if (w.onready) w.onready(); });
    return w;
  })();

  const P = {
    lang: CFG.idiomaInicial === 'es' ? 'es' : 'en',
    want: false, dual: true, ended: false, guard: 0, comp: 0.06, expect: null, pending: null,
    get el() { return A[this.lang]; },
    get other() { return A[this.lang === 'en' ? 'es' : 'en']; },
    time() { return W && W.on ? W.time() : (this.el.currentTime || 0); },
    dur() { if (W && W.ready) return W.dur(); const d = A.en.duration; return isFinite(d) && d > 0 ? d : 205.4; },
    limit(el, t) { const d = el.duration; return Math.max(0, Math.min(t, (isFinite(d) && d > 0 ? d : 1e9) - 0.2)); },

    // ¿manda el audio decodificado (Safari / iPhone)? Si ya está listo, toma el mando en el segundo t
    wa(t) {
      if (!W || !(W.on || W.ready)) return false;
      if (!W.on) {
        W.take(t === undefined ? this.time() : t);
        this.expect = null;
        W.mix(this.lang);
        if (this.want) W.play();
      }
      return true;
    },

    start() {
      if (W) W.unlock();
      if (this.ended) { this.seek(0); }
      this.want = true; this.ended = false; this.guard = performance.now() + 3000;
      if (this.wa()) {
        if (!W.playing) { W.mix(this.lang); W.play(); }
        // si Safari no dejó arrancar el sonido, pedimos un toque
        setTimeout(() => { if (W.on && W.playing && this.want && !W.running) { this.pause(); tap.classList.add('show'); } }, 1500);
        paintUI();
        return;
      }
      const a = this.el, b = this.other;
      a.muted = false; b.muted = true;
      const p = a.play();
      if (p && p.catch) p.catch(() => { this.want = false; tap.classList.add('show'); paintUI(); });
      if (this.dual) {
        try { if (b.readyState > 0) b.currentTime = this.limit(b, a.currentTime); } catch (e) {}
        const q = b.play();
        if (q && q.catch) q.catch(() => { this.dual = false; });
      }
      paintUI();
    },
    pause() { this.want = false; if (W && W.on) W.pause(); A.en.pause(); A.es.pause(); paintUI(); },
    seek(t) {
      t = clamp(t, 0, this.dur() - 0.25);
      this.ended = false; this.expect = null;
      if (this.wa(t)) { W.seek(t); return; }
      for (const k in A) { try { A[k].currentTime = this.limit(A[k], t); } catch (e) {} }
    },
    setLang(l) {
      if (l === this.lang) return;
      if (W) W.unlock();
      if (this.wa()) {
        this.pending = null;
        this.lang = l; W.mix(l);
        if (this.want && W.time() >= W.len(l) - 0.05) W.onend();   // esa versión ya había terminado
        return;
      }
      // Safari / iPhone sin el audio listo todavía: cambiar de pista ahí lo manda al final.
      // Se espera a que termine de cargar (unos segundos) y entonces cambia en el mismo segundo.
      if (W && !W.failed) { this.pending = l; return; }
      const from = this.el, to = A[l], t = from.currentTime || 0;
      const live = this.want && this.dual && !to.paused && !to.ended && Math.abs(to.currentTime - t) < 0.15;
      if (!live) this.put(to, t + (this.want ? 0.04 : 0));
      this.lang = l;
      to.muted = false; from.muted = true;
      // durante unos segundos vigilamos que la pista nueva no salte (algunos teléfonos la mandan al final o al inicio)
      this.expect = { t, at: performance.now() };
      if (this.want) {
        this.guard = performance.now() + 1500;   // si el teléfono pausa la pista nueva, la volvemos a poner
        const p = to.play(); if (p && p.catch) p.catch(() => {});
        if (!this.dual) from.pause();
      }
    },
    // poner una pista en un segundo, aunque todavía no haya cargado
    put(el, t) {
      t = this.limit(el, t);
      try { el.currentTime = t; } catch (e) {}
      if (el.readyState < 1) el.addEventListener('loadedmetadata', () => { try { el.currentTime = this.limit(el, t); } catch (e) {} }, { once: true });
    },
    // tiempo en el que debería ir la canción justo después de cambiar de idioma (o null)
    expected() {
      const e = this.expect;
      if (!e) return null;
      const dt = (performance.now() - e.at) / 1000;
      if (dt > 4) { this.expect = null; return null; }
      return e.t + (this.want ? dt : 0);
    },
    // si después del cambio la pista brincó lejos, la regresamos
    check() {
      if (W && W.on) return;
      const want = this.expected(), el = this.el;
      if (want === null || el.seeking) return;
      const now = el.currentTime || 0;
      if (now > want + 3 || (now < 1 && want > 3)) this.put(el, want);
    },
    sync() {
      if (!this.want || !this.dual || (W && W.on)) return;
      const a = this.el, b = this.other;
      if (a.paused || b.ended || a.seeking || b.seeking) return;
      if (b.paused) {
        try { b.currentTime = this.limit(b, a.currentTime); } catch (e) {}
        const q = b.play(); if (q && q.catch) q.catch(() => { this.dual = false; });
        return;
      }
      const d = b.currentTime - a.currentTime;
      if (Math.abs(d) > 0.06 && a.currentTime < (b.duration || 1e9) - 1) {
        this.comp = clamp(this.comp - d * 0.6, 0, 0.5);
        try { b.currentTime = a.currentTime + this.comp; } catch (e) {}
      }
    },
  };
  setInterval(() => P.sync(), 700);

  if (W) {
    W.onend = () => { P.ended = true; P.want = false; W.pause(); paintUI(); };
    W.onstop = () => { if (P.want) { P.want = false; W.pause(); paintUI(); } };
  }

  for (const k in A) {
    const el = A[k];
    el.addEventListener('pause', () => {
      if (W && W.on) return;
      if (el !== P.el || !P.want || el.ended) return;
      if (P.dual && performance.now() < P.guard) {
        // el teléfono solo deja sonar una pista a la vez: seguimos con una sola
        P.dual = false; P.other.pause();
        const p = el.play();
        if (p && p.catch) p.catch(() => { P.want = false; tap.classList.add('show'); paintUI(); });
      } else { P.want = false; P.other.pause(); paintUI(); }
    });
    el.addEventListener('ended', () => {
      if (W && W.on) return;
      if (el !== P.el) return;
      // un "terminó" falso justo después de cambiar de idioma: seguimos donde íbamos
      const want = P.expected();
      if (want !== null && want < P.dur() - 3) {
        P.put(el, want);
        if (P.want) { const p = el.play(); if (p && p.catch) p.catch(() => {}); }
        return;
      }
      P.ended = true; P.want = false; P.other.pause(); paintUI();
    });
  }

  /* ------------------------------------------------------------------
     Tarjetas de letra
     ------------------------------------------------------------------ */
  const STYLE = { '~': 's', '*': 'l', '#': 'x', '!': 'd', '^': 'c' };
  const BG = {
    cream: { c: '#fbefe2', light: true }, blush: { c: '#f7ccd4', light: true }, lilac: { c: '#e0d2f8', light: true },
    ink: { c: '#0c0912' }, wine: { c: '#521a34' }, rose: { c: '#d4607e' }, red: { c: '#ad2340' },
  };
  const norm = s => s.normalize('NFD').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cardsEl = $('#cards');
  const lists = { en: [], es: [], common: [] };

  /* Temblor de los dibujos sin filtro (Safari / iPhone). El filtro #boil mueve cada punto del dibujo
     según un ruido suave; Safari lo recalcula por software en cada cuadro y eso frena la página y
     calienta el teléfono. Aquí se calcula ese mismo movimiento una sola vez: cada trazo queda guardado
     en 8 versiones ya deformadas y al sonar la canción solo se alternan. */
  const wobble = (() => {
    const NS = 'http://www.w3.org/2000/svg', FRAMES = 8, STEP = 3, ARGS = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
    const cache = {};
    const hash = (i, j, s) => {
      let h = Math.imul(i, 0x27d4eb2d) ^ Math.imul(j, 0x165667b1) ^ Math.imul(s, 0x9e3779b1);
      h = Math.imul(h ^ h >>> 15, 0x85ebca6b); h = Math.imul(h ^ h >>> 13, 0xc2b2ae35);
      return ((h ^ h >>> 16) >>> 0) / 4294967296;
    };
    // ruido de Perlin en 2D, como el de feTurbulence
    function perlin(x, y, s) {
      const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
      const dot = (i, j) => { const a = hash(xi + i, yi + j, s) * 6.2832; return Math.cos(a) * (fx - i) + Math.sin(a) * (fy - j); };
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const a = dot(0, 0), b = dot(1, 0), c = dot(0, 1), d = dot(1, 1);
      return a + sx * (b - a) + sy * ((c + sx * (d - c)) - (a + sx * (b - a)));
    }
    // igual que baseFrequency .04, numOctaves 2 y scale 5 del filtro
    const push = (x, y, s) => 2.5 * (perlin(x * 0.04, y * 0.04, s) + perlin(x * 0.08, y * 0.08, s + 101) / 2);

    // separa un trazo en tramos sueltos, y cada tramo en sus comandos
    function split(d) {
      const subs = [];
      let cur = null;
      d.replace(/([a-zA-Z])([^a-zA-Z]*)/g, (_, c, rest) => {
        const nums = rest.match(/-?\d*\.?\d+/g) || [], n = ARGS[c.toUpperCase()];
        if (c === 'M' || !cur) { cur = []; subs.push(cur); }
        if (!n) { cur.push(c); return ''; }
        for (let i = 0; i < nums.length; i += n) cur.push((i && c === 'M' ? 'L' : i && c === 'm' ? 'l' : c) + nums.slice(i, i + n).join(' '));
        return '';
      });
      return subs;
    }

    return name => {
      if (cache[name]) return cache[name];
      const out = cache[name] = [];
      try {
        const svg = document.createElementNS(NS, 'svg'), probe = document.createElementNS(NS, 'path');
        svg.innerHTML = window.DOODLES[name].html;
        Array.from(svg.querySelectorAll('path')).forEach(path => {
          // el ruido vive en las coordenadas del dibujo completo: m lleva del trazo al dibujo
          let m = null;
          for (let n = path; n && n !== svg; n = n.parentNode) {
            const tl = n.transform && n.transform.baseVal;
            if (tl && tl.numberOfItems) { const c = tl.consolidate().matrix; m = m ? c.multiply(m) : c; }
          }
          const det = m ? m.a * m.d - m.b * m.c : 1;
          const frames = [];
          for (let f = 0; f < FRAMES; f++) frames.push('');
          split(path.getAttribute('d')).forEach(cmds => {
            const closed = /z/i.test(cmds[cmds.length - 1]);
            // puntos a lo largo del tramo, sin saltarse ninguna esquina
            const pts = [];
            let from = 0;
            probe.setAttribute('d', cmds.join(''));
            const whole = probe.getTotalLength();
            pts.push(probe.getPointAtLength(0));
            const marks = [];
            for (let i = 1; i < cmds.length; i++) {
              probe.setAttribute('d', cmds.slice(0, i + 1).join(''));
              marks.push(i === cmds.length - 1 ? whole : probe.getTotalLength());
            }
            probe.setAttribute('d', cmds.join(''));
            marks.forEach(to => {
              const n = Math.max(1, Math.ceil((to - from) / STEP));
              for (let j = 1; j <= n; j++) pts.push(probe.getPointAtLength(from + (to - from) * j / n));
              from = to;
            });
            for (let f = 0; f < FRAMES; f++) {
              let d = '';
              pts.forEach((p, i) => {
                const X = m ? m.a * p.x + m.c * p.y + m.e : p.x, Y = m ? m.b * p.x + m.d * p.y + m.f : p.y;
                const dx = push(X, Y, f * 2 + 1), dy = push(X, Y, f * 2 + 2);
                const lx = m ? (m.d * dx - m.c * dy) / det : dx, ly = m ? (m.a * dy - m.b * dx) / det : dy;
                d += (i ? 'L' : 'M') + (p.x + lx).toFixed(2) + ' ' + (p.y + ly).toFixed(2);
              });
              frames[f] += d + (closed ? 'Z' : '');
            }
          });
          out.push(frames);
        });
      } catch (e) { out.length = 0; }
      return out;
    };
  })();
  const wobs = [];   // dibujos con temblor precalculado

  function makeArt(name) {
    const D = window.DOODLES && window.DOODLES[name];
    if (!D) return null;
    const wrap = document.createElement('div');
    wrap.className = 'art art-' + name;
    const frames = WK ? wobble(name) : [];
    wrap.innerHTML = '<svg viewBox="' + D.vb + '" aria-hidden="true"><g' + (frames.length ? '' : ' filter="url(#boil)"') + '>' + D.html + '</g></svg>';
    $$('.ln', wrap).forEach((p, i) => { p.setAttribute('pathLength', '1'); p.style.setProperty('--k', i); });
    if (frames.length) {
      const paths = $$('path', wrap).map((el, i) => ({ el, f: frames[i] })).filter(p => p.f);
      paths.forEach(p => p.el.setAttribute('d', p.f[0]));
      wrap.wob = paths;
    }
    return wrap;
  }

  function build(spec, lang, idx) {
    const words = spec.l ? spec.l.reduce((acc, i) => acc.concat(T[lang][i].w), []) : null;
    const bg = spec.bg && BG[spec.bg] ? spec.bg : '';
    const el = document.createElement('div');
    const base = 'card ' + spec.c + ' x' + (idx % 3) + (spec.pose ? ' p-' + spec.pose : '') +
      (bg ? ' bg-' + bg + (BG[bg].light ? ' on-light' : '') : '');
    el.className = base;
    const pose = document.createElement('div'); pose.className = 'pose';
    const cam = document.createElement('div'); cam.className = 'cam';
    pose.appendChild(cam); el.appendChild(pose);
    const ws = [], rows = [];
    let k = 0;
    spec.t.split(' / ').forEach(r => {
      const row = document.createElement('div');
      row.className = 'row';
      r.trim().split(/\s+/).forEach(tok => {
        const m = tok.match(/^([~*#!^]?)(.+?)(?:\{(\w+)\})?$/);
        const cls = STYLE[m[1]] || 'm';
        const text = m[2].replace(/,$/, '');
        let t;
        if (words) {
          if (!words[k] || norm(words[k][0]) !== norm(m[2])) console.warn('letra desalineada', lang, spec.l, tok, words[k]);
          t = words[k] ? words[k][1] : words[words.length - 1][1];
        } else t = spec.at + k * spec.step;
        const w = document.createElement('span');
        w.className = 'w ' + cls + (m[3] ? ' fx-' + m[3] : '');
        w.style.setProperty('--j', k % 5);
        const inn = document.createElement('span');
        inn.className = 'in';
        if (cls === 'l') {
          Array.from(text).forEach((ch, i) => {
            const c = document.createElement('span');
            c.className = 'ch'; c.style.setProperty('--i', i); c.textContent = ch;
            inn.appendChild(c);
          });
        } else inn.textContent = text;
        w.appendChild(inn); row.appendChild(w);
        row.classList.add('has-' + cls);
        ws.push({ el: w, t, on: false });
        k++;
      });
      cam.appendChild(row); rows.push(row);
    });
    let wob = null;
    if (spec.art) {
      const parts = spec.art.split(':'), art = makeArt(parts[0]);
      if (art) {
        if (parts[1] === 'top') cam.insertBefore(art, cam.firstChild);
        else { if (parts[1] === 'behind') art.classList.add('behind'); cam.appendChild(art); }
        wob = art.wob || null;
      }
    }
    if (words && k !== words.length) console.warn('faltan palabras', lang, spec.l, k, words.length);
    const start = words ? words[0][1] : spec.at;
    const end = words ? T[lang][spec.l[spec.l.length - 1]].end : spec.at + spec.dur;
    cardsEl.appendChild(el);
    const card = { el, cam, rows, base, ws, start, end, exit: end, st: '', last: -1, fixed: !words, bg, pose: spec.pose || '', hero: /\bhero\b/.test(spec.c), wob };
    if (wob) wobs.push(card);
    return card;
  }

  function buildAll() {
    ['en', 'es', 'common'].forEach(lang => {
      lists[lang] = C[lang].map((spec, i) => build(spec, lang, i));
      lists[lang].forEach((c, i, arr) => {
        if (c.fixed) return;
        const next = arr[i + 1];
        const lastWord = c.ws[c.ws.length - 1].t;
        c.exit = Math.min(next ? next.start - 0.26 : 1e9, Math.max(c.end + 1.2, lastWord + 1.6));
      });
      // si la última palabra es caligrafía y la frase siguiente llega pronto, se escribe más rápido
      lists[lang].forEach(c => {
        const w = c.ws[c.ws.length - 1];
        if (w.el.classList.contains('x')) w.el.style.setProperty('--wr', clamp((c.exit - w.t) * 0.85, 0.3, 1).toFixed(2) + 's');
      });
    });
    fit();
  }

  // Las palabras grandes crecen hasta llenar el ancho; si no caben a lo alto, todo se encoge parejo.
  function fit() {
    const cw = cardsEl.clientWidth, ch = cardsEl.clientHeight;
    if (!cw) return;
    [lists.en, lists.es, lists.common].forEach(list => list.forEach(c => {
      const side = c.pose === 'side';
      c.el.style.setProperty('--cw', cw + 'px'); c.el.style.setProperty('--ch', ch + 'px');
      const availW = side ? ch * 0.88 : cw * (c.pose ? 0.9 : 0.97);   // de lado deja aire para el selector de idioma
      const fits = c.rows.map(row => {
        row.style.removeProperty('--fit');
        const w = row.offsetWidth, cn = row.className;
        if (!/has-[dclx]/.test(cn)) return Math.min(1, availW / w);
        return Math.min(c.hero ? 2.4 : (/has-[dc]/.test(cn) ? 2.1 : 1.35), availW / w);
      });
      const apply = k => c.rows.forEach((row, i) => row.style.setProperty('--fit', (fits[i] * k).toFixed(3)));
      apply(1);
      const cs = getComputedStyle(c.cam);
      const room = c.cam.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      let k = 1;
      for (let pass = 0; pass < 3; pass++) {
        const kids = Array.from(c.cam.children).filter(n => !n.classList.contains('behind'));
        const first = kids[0], last = kids[kids.length - 1];
        const used = last.offsetTop + last.offsetHeight - first.offsetTop;
        if (used <= room) break;
        k *= room / used * 0.98; apply(k);
      }
    }));
  }

  // el título final nunca se sale de la pantalla
  function fitTitle() {
    const el = $('#fin-title'), max = $('.stage').clientWidth * 0.88;
    el.style.fontSize = '';
    const w = el.scrollWidth;
    if (w > max) el.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * max / w).toFixed(1) + 'px';
  }

  function fitCaptions() {
    $$('.print figcaption').forEach(c => {
      c.style.fontSize = '';
      if (c.scrollWidth > c.clientWidth + 1) c.style.fontSize = (parseFloat(getComputedStyle(c).fontSize) * c.clientWidth / c.scrollWidth * 0.97).toFixed(1) + 'px';
    });
  }

  function setCard(c, st) {
    if (c.st === st) return;
    c.st = st;
    c.el.className = c.base + (st ? ' ' + st : '');
    if (!st) {
      c.last = -1;
      c.ws.forEach(w => { if (w.on) { w.on = false; w.el.classList.remove('on', 'past'); } });
    }
  }

  // Devuelve la tarjeta que manda en este momento (para decidir el color de fondo)
  function renderList(list, t, active) {
    let cur = null;
    for (let n = 0; n < list.length; n++) {
      const c = list[n];
      if (!active) { setCard(c, ''); continue; }
      // una frase que ya salió vuelve a su estado de reposo: así sus animaciones no siguen corriendo escondidas
      const st = t < c.start - 0.12 || t > c.exit + 1.5 ? '' : (t < c.exit ? 'live' : 'gone');
      setCard(c, st);
      if (st && t < c.exit + 0.42) cur = c;
      if (st !== 'live') continue;
      let last = -1;
      for (let i = 0; i < c.ws.length; i++) {
        const w = c.ws[i], on = t >= w.t - 0.06;
        if (on) last = i;
        if (on !== w.on) { w.on = on; w.el.classList.toggle('on', on); }
      }
      if (last !== c.last) {
        c.last = last;
        for (let i = 0; i < c.ws.length; i++) c.ws[i].el.classList.toggle('past', i < last);
      }
    }
    return cur;
  }

  /* ------------------------------------------------------------------
     Fondo de color que corta con cada frase
     ------------------------------------------------------------------ */
  const panels = [$('#panelA'), $('#panelB')];
  const WIPES = [
    ['circle(0% at 50% 58%)', 'circle(150% at 50% 58%)'],
    ['inset(0 100% 0 0)', 'inset(0 0 0 0)'],
    ['inset(100% 0 0 0)', 'inset(0 0 0 0)'],
    ['circle(0% at 0% 100%)', 'circle(170% at 0% 100%)'],
    ['inset(0 0 0 100%)', 'inset(0 0 0 0)'],
    ['circle(0% at 100% 0%)', 'circle(170% at 100% 0%)'],
    ['inset(0 0 100% 0)', 'inset(0 0 0 0)'],
  ];
  let pIdx = 0, curBg = '', wipeN = 0;
  let covered = false;   // un fondo de color tapa todo el cielo: no hace falta dibujar las estrellas
  const stopAnims = el => { if (el.getAnimations) el.getAnimations().forEach(a => a.cancel()); };

  function setPanel(name) {
    name = name || '';
    if (name === curBg) return;
    curBg = name;
    app.dataset.ink = name && BG[name].light ? 'dark' : 'light';
    if (name) {
      pIdx ^= 1;
      const inc = panels[pIdx], out = panels[pIdx ^ 1];
      stopAnims(inc);
      inc.style.background = BG[name].c; inc.style.zIndex = 2; out.style.zIndex = 1; inc.style.opacity = 1;
      if (inc.animate && !reduce) {
        const w = WIPES[wipeN++ % WIPES.length];
        const a = inc.animate([{ clipPath: w[0] }, { clipPath: w[1] }], { duration: 400, easing: 'cubic-bezier(.65, 0, .2, 1)' });
        a.onfinish = () => { if (panels[pIdx] === inc) { out.style.opacity = 0; covered = !!curBg; } };
      } else { out.style.opacity = 0; covered = true; }
    } else {
      covered = false;
      const act = panels[pIdx];
      panels[pIdx ^ 1].style.opacity = 0;
      if (act.animate && !reduce) {
        const a = act.animate([{ clipPath: 'circle(150% at 50% 50%)' }, { clipPath: 'circle(0% at 50% 50%)' }], { duration: 380, easing: 'cubic-bezier(.6, 0, .4, 1)', fill: 'forwards' });
        a.onfinish = () => { if (!curBg || panels[pIdx] !== act) act.style.opacity = 0; a.cancel(); };
      } else act.style.opacity = 0;
    }
  }

  /* ------------------------------------------------------------------
     Fuego dibujado: cuatro cuadros que se alternan, como animación a mano
     ------------------------------------------------------------------ */
  (() => {
    const host = $('#flames');
    if (!host) return;
    let seed = 1111;
    const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const W = 400, B = 300;
    // en pantallas anchas (computadora) hay más lenguas, para que no se estiren
    const wide = clamp((innerWidth / Math.max(1, innerHeight)) / 0.5, 1, 4);
    function tongues(amp, n) {
      n = Math.round(n * wide);
      let d = 'M0 ' + (B + 20) + 'L0 ' + (B - amp * 0.2).toFixed(1);
      for (let i = 0; i < n; i++) {
        const x0 = i * W / n, x1 = (i + 1) * W / n, dx = x1 - x0;
        const env = 0.42 + 0.58 * Math.sin(Math.PI * (i + 0.5) / n);
        const h = amp * env * (0.6 + 0.4 * rnd()), lean = (rnd() - 0.5) * 0.5, tx = x0 + dx * (0.5 + lean), ty = B - h;
        const v = B - h * (0.16 + 0.14 * rnd());
        // cada lengua: panza a la izquierda, punta que se dobla, bajada suave hasta el valle
        d += 'C' + (x0 - dx * 0.06).toFixed(1) + ' ' + (B - h * 0.5).toFixed(1) + ' ' + (tx + dx * 0.16).toFixed(1) + ' ' + (ty + h * 0.34).toFixed(1) + ' ' + tx.toFixed(1) + ' ' + ty.toFixed(1) +
             'C' + (tx + dx * 0.3).toFixed(1) + ' ' + (ty + h * 0.3).toFixed(1) + ' ' + (x1 + dx * 0.1).toFixed(1) + ' ' + (B - h * 0.56).toFixed(1) + ' ' + x1.toFixed(1) + ' ' + v.toFixed(1);
      }
      return d + 'L' + W + ' ' + (B + 20) + 'Z';
    }
    let html = '';
    for (let f = 0; f < 4; f++) {
      html += '<g class="fr"><path class="fl1" d="' + tongues(290, 5) + '"/><path class="fl2" d="' + tongues(220, 5) + '"/>' +
              '<path class="fl3" d="' + tongues(170, 4) + '"/><path class="fl4" d="' + tongues(118, 4) + '"/></g>';
    }
    host.innerHTML = '<svg viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">' + html + '</svg>';
  })();

  // barquito del atardecer
  (() => {
    const b = $('#boat'), D = window.DOODLES && window.DOODLES.boat;
    if (b && D) b.innerHTML = '<svg viewBox="' + D.vb + '" aria-hidden="true">' + D.html + '</svg>';
  })();

  // temblor de los dibujos: cambia la semilla del filtro unas 7 veces por segundo
  (() => {
    const turb = document.querySelector('#boil feTurbulence');
    if (!turb || reduce) return;
    let n = 0;
    setInterval(() => {
      if (document.hidden || app.dataset.phase !== 'play') return;
      n++;
      // con el temblor precalculado solo se cambia de versión el dibujo que está en pantalla
      if (WK) {
        for (let i = 0; i < wobs.length; i++) {
          const c = wobs[i];
          if (c.st === 'live') for (let j = 0; j < c.wob.length; j++) c.wob[j].el.setAttribute('d', c.wob[j].f[n % 8]);
        }
      }
      if (!WK || !wobs.length) turb.setAttribute('seed', String(1 + (n % 8)));
    }, 140);
  })();

  /* ------------------------------------------------------------------
     Subtítulo en el otro idioma
     ------------------------------------------------------------------ */
  const sub = $('#sub');
  let subKey = '';
  function renderSub(t) {
    const lines = T[P.lang === 'en' ? 'es' : 'en'];
    let text = '';
    for (let i = lines.length - 1; i >= 0; i--) {
      if (t >= lines[i].w[0][1] - 0.15) { if (t < lines[i].end + 1.1) text = lines[i].text; break; }
    }
    if (text === subKey) return;
    subKey = text;
    if (text) {
      sub.textContent = text;
      sub.classList.add('show');
      if (sub.animate && !reduce) sub.animate([{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 450, easing: 'ease-out' });
    } else sub.classList.remove('show');
  }

  /* ------------------------------------------------------------------
     Álbum de fotos (puente instrumental)
     ------------------------------------------------------------------ */
  const deck = $('#deck');
  const TILT = [-4, 3.5, -2.5, 4.5, -3];
  const prints = CFG.fotos.map((f, i) => {
    const fig = document.createElement('figure');
    fig.className = 'print' + (f.alta ? ' tall' : '');
    fig.style.setProperty('--r', TILT[i % TILT.length] + 'deg');
    fig.style.setProperty('--n', i);
    fig.style.setProperty('--dx', 'calc(var(--u) * ' + (i % 2 ? 3 : -3) + ')');
    fig.style.setProperty('--dy', 'calc(var(--u) * ' + (-2 - (i % 3)) + ')');
    const img = new Image(); img.src = f.src; img.alt = ''; img.draggable = false;
    const cap = document.createElement('figcaption'); cap.textContent = f.pie || '';
    fig.appendChild(img); fig.appendChild(cap); deck.appendChild(fig);
    return { el: fig, st: '' };
  });
  function renderAlbum(t, on) {
    let shown = -1;
    if (on) shown = Math.min(prints.length - 1, Math.floor((t - S.albumStart) / S.albumStep));
    prints.forEach((p, i) => {
      const st = i > shown ? '' : (i < shown ? 'in under' : 'in');
      if (st !== p.st) { p.st = st; p.el.className = 'print' + (CFG.fotos[i].alta ? ' tall' : '') + (st ? ' ' + st : ''); }
    });
    deck.classList.toggle('out', on && t > 152.75);
  }

  /* ------------------------------------------------------------------
     Fondo vivo. Dos lienzos: uno detrás del paisaje (estrellas) y otro
     delante (luces, pétalos, linternas, brasas, destellos).
     ------------------------------------------------------------------ */
  const fx = (() => {
    const back = $('#fx'), front = $('#fx2');
    const bg = back.getContext('2d'), fg = front.getContext('2d');
    let W = 0, H = 0, sc = 1;
    let stars = [], shots = [], embers = [], glints = [], bokeh = [], petals = [], lanterns = [];
    let gain = 0.9, last = 0, accE = 0, accG = 0, accP = 0, accL = 0, nextShot = 4, aB = 0, aL = 0;
    const TAU = 6.283;

    function sprite(w, h, paint) {
      const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d')); return c;
    }
    // luces desenfocadas
    const BOKEH = ['255,196,206', '255,214,160', '255,168,150', '216,182,255'].map(rgb => sprite(128, 128, x => {
      const g = x.createRadialGradient(64, 64, 0, 64, 64, 62);
      g.addColorStop(0, 'rgba(' + rgb + ',.46)'); g.addColorStop(0.7, 'rgba(' + rgb + ',.52)');
      g.addColorStop(0.9, 'rgba(' + rgb + ',.86)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
      x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    }));
    // linterna de papel
    const LANTERN = sprite(120, 160, x => {
      let g = x.createRadialGradient(60, 86, 4, 60, 86, 60);
      g.addColorStop(0, 'rgba(255,190,110,.6)'); g.addColorStop(1, 'rgba(255,150,80,0)');
      x.fillStyle = g; x.fillRect(0, 0, 120, 160);
      x.beginPath(); x.moveTo(36, 52); x.quadraticCurveTo(60, 42, 84, 52); x.lineTo(78, 112); x.quadraticCurveTo(60, 118, 42, 112); x.closePath();
      g = x.createLinearGradient(0, 46, 0, 116);
      g.addColorStop(0, '#ffac6a'); g.addColorStop(0.5, '#ffe2a8'); g.addColorStop(0.85, '#fff4da'); g.addColorStop(1, '#ff9a55');
      x.fillStyle = g; x.fill();
      x.fillStyle = 'rgba(150,64,40,.5)'; x.fillRect(44, 111, 32, 2.5);
    });
    const PETAL = ['#e88aa3', '#d4506f', '#ffffff', '#f4a9bb', '#c23e62', '#ffd2c4'];

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = back.clientWidth; H = back.clientHeight; sc = clamp(Math.min(W, H * 0.6) / 390, 0.8, 1.5);
      [[back, bg], [front, fg]].forEach(([cv, ctx]) => {
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      });
      const n = Math.round(clamp(W * H / 4200, 80, 220) * (reduce ? 0.6 : 1));
      stars = Array.from({ length: n }, () => {
        const r = 0.4 + Math.random() * 1;
        return { x: Math.random() * W, y: Math.pow(Math.random(), 1.4) * H * 0.92, r, p: Math.random() * TAU, s: 0.6 + Math.random() * 2.2,
          a: 0.3 + Math.random() * 0.7, big: Math.random() < 0.07, d: reduce ? 0 : 1.2 + r * 3.2 };
      });
      bokeh = []; lanterns = [];
    }
    function spark(ctx, x, y, r) {
      ctx.beginPath();
      ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
      ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill();
    }
    function shoot() {
      if (reduce) return;
      const left = Math.random() < 0.5, sp = Math.max(W, H) * 0.95;
      shots.push({
        x: left ? W * (0.05 + Math.random() * 0.35) : W * (0.6 + Math.random() * 0.35), y: H * (0.04 + Math.random() * 0.22),
        vx: (left ? 1 : -1) * sp * 0.72, vy: sp * 0.4, life: 0, max: 0.85 + Math.random() * 0.4,
      });
    }
    function burst(x, y, n) {
      if (reduce) return;
      for (let i = 0; i < (n || 26); i++) {
        const a = Math.random() * TAU, v = 30 + Math.random() * 150;
        glints.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.8 - 25, life: 0, max: 1.3 + Math.random() * 1.6, r: 1.6 + Math.random() * 3.4, drag: 1.6 });
      }
    }
    function newLantern(y) {
      const z = 0.4 + Math.random() * 0.6;
      return { x: Math.random() * W, y, z, vy: (20 + Math.random() * 22) * (0.6 + z * 0.7), amp: 8 + Math.random() * 18, fr: 0.25 + Math.random() * 0.5, ph: Math.random() * TAU };
    }

    let fgUsed = true;
    function draw(now, f, beat, hide) {
      const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
      const sec = now / 1000;
      // el lienzo de delante solo se toca cuando tiene algo (o hay que borrar lo del cuadro anterior)
      const busy = !!(f.bokeh || f.petals || f.lanterns || f.fire || f.glints || bokeh.length || petals.length || lanterns.length || embers.length || glints.length);
      if (busy || fgUsed) fg.clearRect(0, 0, W, H);
      fgUsed = busy;

      /* ---- detrás: estrellas ---- */
      const target = f.fire ? 0.35 : f.bokeh ? 0.3 : f.sea ? 0.45 : f.petals ? 0.6 : f.bright ? 1.5 : 0.95;
      gain += (target - gain) * Math.min(1, dt * 1.3);
      const g2 = gain * (0.7 + 0.55 * beat);
      // con un fondo de color encima el cielo no se ve: las estrellas siguen su camino pero no se dibujan
      if (hide) shots.length = 0; else bg.clearRect(0, 0, W, H);
      bg.fillStyle = '#fff6ea';
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.x += s.d * dt; if (s.x > W + 6) s.x = -6;
        if (hide) continue;
        const tw = 0.55 + 0.45 * Math.sin(sec * s.s + s.p);
        bg.globalAlpha = Math.min(1, s.a * tw * g2);
        if (s.big) spark(bg, s.x, s.y, 2.2 + 3.4 * tw);
        else { bg.beginPath(); bg.arc(s.x, s.y, s.r, 0, TAU); bg.fill(); }
      }
      if (!reduce && !(f.fire || f.bokeh || f.sea)) {
        nextShot -= dt;
        if (nextShot <= 0) { if (!hide) shoot(); nextShot = 3.5 + Math.random() * 5.5; }
      }
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i]; s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt;
        const k = s.life / s.max;
        if (k >= 1) { shots.splice(i, 1); continue; }
        const len = 0.16, tx = s.x - s.vx * len, ty = s.y - s.vy * len;
        const g = bg.createLinearGradient(s.x, s.y, tx, ty);
        g.addColorStop(0, 'rgba(255,246,234,1)'); g.addColorStop(1, 'rgba(246,204,211,0)');
        bg.globalAlpha = Math.sin(Math.PI * k);
        bg.strokeStyle = g; bg.lineWidth = 1.6; bg.lineCap = 'round';
        bg.beginPath(); bg.moveTo(s.x, s.y); bg.lineTo(tx, ty); bg.stroke();
        bg.fillStyle = '#fff6ea'; spark(bg, s.x, s.y, 4);
      }
      bg.globalAlpha = 1;

      /* ---- delante: luces desenfocadas ---- */
      aB += ((f.bokeh ? 1 : 0) - aB) * Math.min(1, dt * 0.9);
      if (f.bokeh && !bokeh.length) {
        bokeh = Array.from({ length: reduce ? 12 : 26 }, () => ({
          x: Math.random() * W, y: Math.random() * H, r: (16 + Math.pow(Math.random(), 1.6) * 62) * sc,
          vx: (Math.random() - 0.5) * 16, vy: -5 - Math.random() * 16, p: Math.random() * TAU, s: 0.4 + Math.random() * 1.1,
          a: 0.1 + Math.random() * 0.2, k: Math.random() * BOKEH.length | 0,
        }));
      }
      if (!f.bokeh && aB < 0.01) bokeh = [];
      if (bokeh.length) {
        fg.globalCompositeOperation = 'lighter';
        for (let i = 0; i < bokeh.length; i++) {
          const b = bokeh[i];
          if (!reduce) { b.x += b.vx * dt; b.y += b.vy * dt; }
          if (b.y < -b.r) { b.y = H + b.r; b.x = Math.random() * W; }
          if (b.x < -b.r) b.x = W + b.r; else if (b.x > W + b.r) b.x = -b.r;
          fg.globalAlpha = b.a * (0.55 + 0.45 * Math.sin(sec * b.s + b.p)) * aB * (0.65 + 0.6 * beat);
          fg.drawImage(BOKEH[b.k], b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
        }
        fg.globalCompositeOperation = 'source-over';
      }

      /* ---- pétalos ---- */
      if (f.petals && !reduce) {
        accP += dt * 9;
        while (accP > 1) {
          accP -= 1;
          petals.push({ x: -30 + Math.random() * (W + 30), y: -16, vx: 16 + Math.random() * 42, vy: 46 + Math.random() * 70, rot: Math.random() * TAU,
            vr: (Math.random() - 0.5) * 2.6, tum: Math.random() * TAU, vt: 1.4 + Math.random() * 2.6, size: (5 + Math.random() * 6.5) * sc,
            amp: 10 + Math.random() * 22, ph: Math.random() * TAU, c: PETAL[Math.random() * PETAL.length | 0], a: 0.5 + Math.random() * 0.45, life: 0 });
        }
      }
      for (let i = petals.length - 1; i >= 0; i--) {
        const p = petals[i]; p.life += dt;
        p.x += (p.vx + Math.sin(p.life * 1.3 + p.ph) * p.amp) * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.tum += p.vt * dt;
        if (!f.petals) p.a -= dt * 0.45;
        if (p.y > H + 24 || p.x > W + 40 || p.a <= 0) { petals.splice(i, 1); continue; }
        fg.save();
        fg.translate(p.x, p.y); fg.rotate(p.rot); fg.scale(1, 0.3 + 0.7 * Math.abs(Math.cos(p.tum)));
        fg.globalAlpha = p.a * Math.min(1, p.life * 2);
        fg.fillStyle = p.c;
        fg.beginPath(); fg.moveTo(0, -p.size);
        fg.quadraticCurveTo(p.size * 0.95, -p.size * 0.1, 0, p.size); fg.quadraticCurveTo(-p.size * 0.95, -p.size * 0.1, 0, -p.size);
        fg.fill(); fg.restore();
      }

      /* ---- linternas ---- */
      aL += ((f.lanterns ? 1 : 0) - aL) * Math.min(1, dt * 0.8);
      if (f.lanterns && !reduce) {
        if (!lanterns.length) for (let i = 0; i < 8; i++) lanterns.push(newLantern(H * (0.5 + Math.random() * 0.6)));
        accL += dt * 0.95;
        while (accL > 1) { accL -= 1; lanterns.push(newLantern(H + 70)); }
      }
      if (!f.lanterns && aL < 0.01) lanterns = [];
      for (let i = lanterns.length - 1; i >= 0; i--) {
        const l = lanterns[i]; l.y -= l.vy * dt;
        const w = (30 + l.z * 42) * sc, h = w * 160 / 120;
        if (l.y < -h) { lanterns.splice(i, 1); continue; }
        const x = l.x + Math.sin(sec * l.fr + l.ph) * l.amp;
        fg.globalAlpha = (0.42 + 0.58 * l.z) * (0.84 + 0.16 * Math.sin(sec * 5 + l.ph * 3)) * aL * (0.8 + 0.3 * beat);
        fg.drawImage(LANTERN, x - w / 2, l.y - h / 2, w, h);
      }

      /* ---- brasas ---- */
      if (f.fire && !reduce) {
        accE += dt * (26 + 22 * beat);
        while (accE > 1) {
          accE -= 1;
          embers.push({ x: Math.random() * W, y: H + 8, vy: 45 + Math.random() * 110, amp: 8 + Math.random() * 28, ph: Math.random() * TAU,
            fr: 0.8 + Math.random() * 1.6, r: 0.8 + Math.random() * 2, life: 0, max: 3 + Math.random() * 3.5,
            c: 'rgb(255,' + (140 + Math.random() * 80 | 0) + ',' + (80 + Math.random() * 60 | 0) + ')' });
        }
      }
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i]; e.life += dt * (f.fire ? 1 : 3); e.y -= e.vy * dt;   // al apagarse el fuego, las brasas se van rápido
        const k = e.life / e.max;
        if (k >= 1 || e.y < -10) { embers.splice(i, 1); continue; }
        const x = e.x + Math.sin(e.life * e.fr + e.ph) * e.amp, a = (1 - k) * (0.6 + 0.4 * Math.sin(e.life * 9 + e.ph));
        fg.fillStyle = e.c;
        fg.globalAlpha = a * 0.16; fg.beginPath(); fg.arc(x, e.y, e.r * 4, 0, TAU); fg.fill();
        fg.globalAlpha = a; fg.beginPath(); fg.arc(x, e.y, e.r, 0, TAU); fg.fill();
      }

      /* ---- destellos ---- */
      if (f.glints && !reduce) {
        accG += dt * 3;
        while (accG > 1) {
          accG -= 1;
          glints.push({ x: Math.random() * W, y: H * (0.2 + Math.random() * 0.8), vx: (Math.random() - 0.5) * 10, vy: -8 - Math.random() * 16,
            life: 0, max: 3 + Math.random() * 3, r: 1.5 + Math.random() * 3, drag: 0 });
        }
      }
      fg.fillStyle = '#fff1e6';
      for (let i = glints.length - 1; i >= 0; i--) {
        const g = glints[i]; g.life += dt;
        const k = g.life / g.max;
        if (k >= 1) { glints.splice(i, 1); continue; }
        if (g.drag) { const d = Math.exp(-g.drag * dt); g.vx *= d; g.vy *= d; }
        g.x += g.vx * dt; g.y += g.vy * dt;
        fg.globalAlpha = Math.sin(Math.PI * k) * (0.55 + 0.45 * Math.sin(g.life * 7 + g.r));
        spark(fg, g.x, g.y, g.r * (0.7 + 0.5 * Math.sin(Math.PI * k)));
      }
      fg.globalAlpha = 1;
    }
    addEventListener('resize', resize);
    resize();
    return { draw, shoot, burst };
  })();

  /* ------------------------------------------------------------------
     Escenas y eventos
     ------------------------------------------------------------------ */
  const flags = {};
  let tone = 'night';
  const flashEl = $('.flash');

  function renderScene(t) {
    for (const name in S.flags) {
      let on = S.flags[name].some(r => t >= r[0] && t < r[1]);
      if (name === 'end' && P.ended) on = true;
      if (on !== !!flags[name]) { flags[name] = on; app.classList.toggle('f-' + name, on); }
    }
    let tn = 'night';
    for (let i = 0; i < S.tones.length; i++) if (t >= S.tones[i][0]) tn = S.tones[i][1];
    if (tn !== tone) { tone = tn; app.dataset.tone = tn; }
  }

  function fire(type) {
    if (type === 'shoot') return fx.shoot();
    if (reduce) return;
    // golpe de cámara
    if ((type === 'kick' || type === 'flash') && cardsEl.animate) {
      cardsEl.animate([{ transform: 'scale(1.09)' }, { transform: 'scale(1)' }], { duration: 540, easing: 'cubic-bezier(.2, .9, .2, 1)' });
    }
    if (type === 'flash' && flashEl.animate) {
      flashEl.animate([{ opacity: 0 }, { opacity: 0.42, offset: 0.16 }, { opacity: 0 }], { duration: 1100, easing: 'ease-out' });
    }
    if (type === 'bloom') {
      const ws = $$('.card.live .w.x.on');
      const r = ws.length ? ws[ws.length - 1].getBoundingClientRect() : null;
      const x = r ? r.left + r.width / 2 : innerWidth / 2, y = r ? r.top + r.height / 2 : innerHeight * 0.6;
      fx.burst(x, y, 34);
      if (flashEl.animate) flashEl.animate([{ opacity: 0 }, { opacity: 0.24, offset: 0.2 }, { opacity: 0 }], { duration: 1600, easing: 'ease-out' });
    }
  }

  /* ------------------------------------------------------------------
     Controles
     ------------------------------------------------------------------ */
  const pp = $('#pp'), fill = $('#fill'), knob = $('#knob'), seek = $('#seek'), wait = $('#wait'), credit = $('#credit');
  const langBtns = $$('#lang button');

  // la pantalla no se apaga mientras suena la canción
  let lock = null;
  function keepAwake(on) {
    if (!('wakeLock' in navigator)) return;
    if (on && !lock && document.visibilityState === 'visible') {
      navigator.wakeLock.request('screen').then(l => { lock = l; l.addEventListener('release', () => { lock = null; }); }).catch(() => {});
    } else if (!on && lock) { lock.release().catch(() => {}); lock = null; }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') keepAwake(P.want); });

  function paintUI() {
    keepAwake(P.want);
    app.classList.toggle('paused', !P.want);
    pp.setAttribute('aria-label', P.want ? 'Pausar' : 'Reproducir');
  }
  function paintLang() {
    const shown = P.pending || P.lang;   // el botón se mueve al instante aunque la canción espere a cargar
    app.dataset.lang = shown;
    langBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === shown)));
    credit.textContent = P.lang === 'en' ? 'Risk It All' : 'Lo Arriesgo Todo';
    subKey = '\u0000';
  }
  paintLang();

  langBtns.forEach(b => b.addEventListener('click', () => {
    if (P.pending && b.dataset.lang === P.lang) P.pending = null;   // se arrepintió antes de que cargara
    else P.setLang(b.dataset.lang);
    paintLang();
  }));
  if (W) W.onready = () => {
    const l = P.pending;
    P.pending = null;
    if (l && l !== P.lang) P.setLang(l);
    paintLang();
  };
  pp.addEventListener('click', () => { if (P.want) P.pause(); else P.start(); });
  tap.addEventListener('click', () => { tap.classList.remove('show'); P.start(); });
  $('#again').addEventListener('click', () => { P.seek(0); P.ended = false; P.start(); });

  let dragging = false;
  function seekTo(e) {
    const r = seek.getBoundingClientRect();
    P.seek(clamp((e.clientX - r.left) / r.width, 0, 1) * P.dur());
  }
  seek.addEventListener('pointerdown', e => { dragging = true; try { seek.setPointerCapture(e.pointerId); } catch (x) {} seekTo(e); });
  seek.addEventListener('pointermove', e => { if (dragging) seekTo(e); });
  ['pointerup', 'pointercancel'].forEach(n => seek.addEventListener(n, () => { dragging = false; }));
  seek.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') P.seek(P.time() + 5);
    else if (e.key === 'ArrowLeft') P.seek(P.time() - 5);
  });

  let idleTimer = 0;
  function wake() {
    app.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => app.classList.add('idle'), 4500);
  }
  addEventListener('pointerdown', wake, { passive: true });

  /* ------------------------------------------------------------------
     Entrada: clave 11:11
     ------------------------------------------------------------------ */
  const slots = $$('.slot'), codeEl = $('#code'), ask = $('#gate-ask'), pad = $('#pad');
  let entry = '', locked = false;

  function paintCode() {
    slots.forEach((s, i) => {
      const ch = entry[i];
      if (ch) {
        if (!s.firstChild) { const b = document.createElement('b'); b.textContent = ch; s.appendChild(b); }
        s.classList.add('full');
      } else { s.textContent = ''; s.classList.remove('full'); }
    });
  }
  function replay(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

  function press(k) {
    if (locked || app.dataset.phase !== 'gate') return;
    if (k === 'del') { entry = entry.slice(0, -1); paintCode(); return; }
    if (!/^\d$/.test(k) || entry.length >= 4) return;
    entry += k; paintCode();
    if (entry.length < 4) return;
    locked = true;
    if (entry === String(CFG.clave)) {
      P.start();                       // dentro del toque: así el teléfono deja sonar la música
      app.dataset.phase = 'play';
      wake();
    } else {
      replay(codeEl, 'wrong');
      ask.textContent = CFG.claveMal; replay(ask, 'swap');
      setTimeout(() => { entry = ''; paintCode(); locked = false; }, 700);
    }
  }
  pad.addEventListener('click', e => { const b = e.target.closest('button'); if (b) press(b.dataset.k); });
  addEventListener('keydown', e => {
    if (app.dataset.phase !== 'gate') {
      if (e.key === ' ' && e.target === document.body) { e.preventDefault(); if (P.want) P.pause(); else P.start(); }
      return;
    }
    const k = e.key === 'Backspace' ? 'del' : e.key;
    const b = pad.querySelector('[data-k="' + (/^\d$/.test(k) || k === 'del' ? k : 'x') + '"]');
    if (!b) return;
    b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 140);
    press(k);
  });

  /* ------------------------------------------------------------------
     Bucle
     ------------------------------------------------------------------ */
  let prevT = 0, stallT = -1, stallAt = 0, ariaAt = 0, seekW = 0, knobX = '';
  addEventListener('resize', () => { seekW = 0; knobX = ''; });

  // el fondo respira con la intensidad de la música (solo si las nubes de color están a la vista)
  const PU = window.PULSE, aura = $('#aura');
  const auraOn = getComputedStyle(aura).display !== 'none';
  let beat = 0.3;
  function pulseAt(t) {
    if (!PU) return 0.4;
    const i = clamp(Math.round(t * PU.fps), 0, PU.d.length - 1);
    return (PU.d.charCodeAt(i) - 48) / 9;
  }

  function frame(now) {
    if (app.dataset.phase === 'play') {
      P.check();
      const t = P.expect && Math.abs(P.time() - P.expected()) > 3 ? P.expected() : P.time();

      renderScene(t);
      const tl = t - (CFG.ajuste || 0);
      const c0 = renderList(lists.common, t, true);
      const c1 = renderList(lists.en, tl, P.lang === 'en');
      const c2 = renderList(lists.es, tl, P.lang === 'es');
      const cur = c1 || c2 || c0;
      setPanel(cur && !flags.end ? cur.bg : '');
      renderSub(tl);
      renderAlbum(t, !!flags.album);

      if (t > prevT && t - prevT < 1) {
        for (let i = 0; i < S.events.length; i++) {
          const e = S.events[i];
          if (e[0] > prevT && e[0] <= t) fire(e[1]);
        }
      }
      prevT = t;

      // la barra solo se repinta cuando el punto se mueve al menos una décima de pixel
      const p = clamp(t / P.dur(), 0, 1);
      if (!seekW) seekW = seek.clientWidth;
      const kx = (p * seekW).toFixed(1);
      if (kx !== knobX) {
        knobX = kx;
        fill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
        knob.style.transform = 'translateX(' + kx + 'px)';
      }
      if (now - ariaAt > 1000) { ariaAt = now; seek.setAttribute('aria-valuenow', String(Math.round(p * 100))); }

      // si la canción aún está cargando, avisamos con suavidad
      if (t !== stallT) { stallT = t; stallAt = now; }
      wait.classList.toggle('show', (P.want && !P.ended && now - stallAt > 1400) || !!P.pending);
    }
    const live = app.dataset.phase === 'play' && P.want;
    const target = live ? pulseAt(P.time()) : 0.3;
    beat += (target - beat) * (target > beat ? 0.3 : 0.05);
    if (!reduce && auraOn) {
      aura.style.opacity = (0.5 + 0.5 * beat).toFixed(3);
      aura.style.transform = 'scale(' + (1 + 0.08 * beat).toFixed(4) + ')';
    }
    fx.draw(now, flags, beat, covered);
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------
     Arranque
     ------------------------------------------------------------------ */
  const fontsReady = document.fonts && document.fonts.load ? Promise.all([
    document.fonts.load('italic 500 20px Cormorant'),
    document.fonts.load('300 20px Cormorant'),
    document.fonts.load('300 20px Jost'),
    document.fonts.load('20px "Mrs Saint Delafield"'),
    document.fonts.load('800 20px "Bodoni Moda"'),
    document.fonts.load('20px Anton'),
  ]).catch(() => {}) : Promise.resolve();

  Promise.race([fontsReady, new Promise(r => setTimeout(r, 3500))]).then(() => {
    buildAll(); fitTitle(); fitCaptions();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fit(); fitTitle(); fitCaptions(); });
  });
  addEventListener('resize', () => { if (lists.en.length) { fit(); fitTitle(); fitCaptions(); } });

  paintUI();
  requestAnimationFrame(frame);

  // acceso desde la consola para pruebas
  window.__risk = { P, W, fx, lists, flags };
})();
