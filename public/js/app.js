(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const app = $('#app');
  const CFG = window.DEDICATORIA, T = window.TIMING, C = window.CARDS, S = window.SCENES;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

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

  const P = {
    lang: CFG.idiomaInicial === 'es' ? 'es' : 'en',
    want: false, dual: true, ended: false, guard: 0, comp: 0.06,
    get el() { return A[this.lang]; },
    get other() { return A[this.lang === 'en' ? 'es' : 'en']; },
    time() { return this.el.currentTime || 0; },
    dur() { const d = A.en.duration; return isFinite(d) && d > 0 ? d : 205.4; },
    limit(el, t) { const d = el.duration; return Math.max(0, Math.min(t, (isFinite(d) && d > 0 ? d : 1e9) - 0.2)); },

    start() {
      if (this.ended) { this.seek(0); }
      this.want = true; this.ended = false; this.guard = performance.now() + 3000;
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
    pause() { this.want = false; A.en.pause(); A.es.pause(); paintUI(); },
    seek(t) {
      t = clamp(t, 0, this.dur() - 0.25);
      for (const k in A) { try { A[k].currentTime = this.limit(A[k], t); } catch (e) {} }
      this.ended = false;
    },
    setLang(l) {
      if (l === this.lang) return;
      const from = this.el, to = A[l], t = from.currentTime;
      const live = this.want && this.dual && !to.paused && !to.ended && Math.abs(to.currentTime - t) < 0.15;
      if (!live) { try { to.currentTime = this.limit(to, t + (this.want ? 0.04 : 0)); } catch (e) {} }
      this.lang = l;
      to.muted = false; from.muted = true;
      if (this.want) {
        const p = to.play(); if (p && p.catch) p.catch(() => {});
        if (!this.dual) from.pause();
      }
    },
    sync() {
      if (!this.want || !this.dual) return;
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

  for (const k in A) {
    const el = A[k];
    el.addEventListener('pause', () => {
      if (el !== P.el || !P.want || el.ended) return;
      if (P.dual && performance.now() < P.guard) {
        // el teléfono solo deja sonar una pista a la vez: seguimos con una sola
        P.dual = false; P.other.pause();
        const p = el.play();
        if (p && p.catch) p.catch(() => { P.want = false; tap.classList.add('show'); paintUI(); });
      } else { P.want = false; P.other.pause(); paintUI(); }
    });
    el.addEventListener('ended', () => {
      if (el !== P.el) return;
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

  function makeArt(name) {
    const D = window.DOODLES && window.DOODLES[name];
    if (!D) return null;
    const wrap = document.createElement('div');
    wrap.className = 'art art-' + name;
    wrap.innerHTML = '<svg viewBox="' + D.vb + '" aria-hidden="true"><g filter="url(#boil)">' + D.html + '</g></svg>';
    $$('.ln', wrap).forEach((p, i) => { p.setAttribute('pathLength', '1'); p.style.setProperty('--k', i); });
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
    if (spec.art) {
      const parts = spec.art.split(':'), art = makeArt(parts[0]);
      if (art) {
        if (parts[1] === 'top') cam.insertBefore(art, cam.firstChild);
        else { if (parts[1] === 'behind') art.classList.add('behind'); cam.appendChild(art); }
      }
    }
    if (words && k !== words.length) console.warn('faltan palabras', lang, spec.l, k, words.length);
    const start = words ? words[0][1] : spec.at;
    const end = words ? T[lang][spec.l[spec.l.length - 1]].end : spec.at + spec.dur;
    cardsEl.appendChild(el);
    return { el, cam, rows, base, ws, start, end, exit: end, st: '', last: -1, fixed: !words, bg, pose: spec.pose || '', hero: /\bhero\b/.test(spec.c) };
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
      const st = t < c.start - 0.12 ? '' : (t < c.exit ? 'live' : 'gone');
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
        a.onfinish = () => { if (panels[pIdx] === inc) out.style.opacity = 0; };
      } else out.style.opacity = 0;
    } else {
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
      turb.setAttribute('seed', String(1 + (n++ % 8)));
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

    function draw(now, f, beat) {
      const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
      const sec = now / 1000;
      bg.clearRect(0, 0, W, H); fg.clearRect(0, 0, W, H);

      /* ---- detrás: estrellas ---- */
      const target = f.fire ? 0.35 : f.bokeh ? 0.3 : f.sea ? 0.45 : f.petals ? 0.6 : f.bright ? 1.5 : 0.95;
      gain += (target - gain) * Math.min(1, dt * 1.3);
      const g2 = gain * (0.7 + 0.55 * beat);
      bg.fillStyle = '#fff6ea';
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i], tw = 0.55 + 0.45 * Math.sin(sec * s.s + s.p);
        s.x += s.d * dt; if (s.x > W + 6) s.x = -6;
        bg.globalAlpha = Math.min(1, s.a * tw * g2);
        if (s.big) spark(bg, s.x, s.y, 2.2 + 3.4 * tw);
        else { bg.beginPath(); bg.arc(s.x, s.y, s.r, 0, TAU); bg.fill(); }
      }
      if (!reduce && !(f.fire || f.bokeh || f.sea)) {
        nextShot -= dt;
        if (nextShot <= 0) { shoot(); nextShot = 3.5 + Math.random() * 5.5; }
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
    app.dataset.lang = P.lang;
    langBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === P.lang)));
    credit.textContent = P.lang === 'en' ? 'Risk It All' : 'Lo Arriesgo Todo';
    subKey = '\u0000';
  }
  paintLang();

  langBtns.forEach(b => b.addEventListener('click', () => { P.setLang(b.dataset.lang); paintLang(); }));
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
  let prevT = 0, stallT = -1, stallAt = 0, ariaAt = 0;

  // el fondo respira con la intensidad de la música
  const PU = window.PULSE, aura = $('#aura');
  let beat = 0.3;
  function pulseAt(t) {
    if (!PU) return 0.4;
    const i = clamp(Math.round(t * PU.fps), 0, PU.d.length - 1);
    return (PU.d.charCodeAt(i) - 48) / 9;
  }

  function frame(now) {
    if (app.dataset.phase === 'play') {
      const t = P.time();

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

      const p = clamp(t / P.dur(), 0, 1);
      fill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      knob.style.transform = 'translateX(' + (p * seek.clientWidth).toFixed(1) + 'px)';
      if (now - ariaAt > 1000) { ariaAt = now; seek.setAttribute('aria-valuenow', String(Math.round(p * 100))); }

      // si la canción aún está cargando, avisamos con suavidad
      if (t !== stallT) { stallT = t; stallAt = now; }
      wait.classList.toggle('show', P.want && !P.ended && now - stallAt > 1400);
    }
    const live = app.dataset.phase === 'play' && P.want;
    const target = live ? pulseAt(P.time()) : 0.3;
    beat += (target - beat) * (target > beat ? 0.3 : 0.05);
    if (!reduce) {
      aura.style.opacity = (0.5 + 0.5 * beat).toFixed(3);
      aura.style.transform = 'scale(' + (1 + 0.08 * beat).toFixed(4) + ')';
    }
    fx.draw(now, flags, beat);
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
  window.__risk = { P, fx, lists, flags };
})();
