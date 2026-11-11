/* Dibujos a mano. Cada trazo (.ln) se dibuja solo cuando aparece su frase;
   los rellenos (.fl) aparecen después. Todo tiembla un poquito, como animación cuadro por cuadro. */
(() => {
  const r = n => Math.round(n * 10) / 10;
  const circle = (cx, cy, rad) => `M${r(cx - rad)} ${cy}a${rad} ${rad} 0 1 0 ${rad * 2} 0a${rad} ${rad} 0 1 0 ${-rad * 2} 0`;
  const ln = (d, extra) => `<path class="ln${extra ? ' ' + extra : ''}" d="${d}"/>`;
  const fl = (d, extra) => `<path class="fl${extra ? ' ' + extra : ''}" d="${d}"/>`;

  function star(cx, cy, R, rot) {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = (rot || 0) - Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? R * 0.44 : R;
      d += (i ? 'L' : 'M') + r(cx + Math.cos(a) * rad) + ' ' + r(cy + Math.sin(a) * rad);
    }
    return d + 'Z';
  }
  const HEART = 'M100 166C62 138 22 104 30 66C36 36 76 26 100 62C124 26 164 36 170 66C178 104 140 138 100 166';

  function spiral() {
    let d = '';
    for (let i = 0; i <= 90; i++) {
      const t = i / 90 * Math.PI * 6.4, rad = 5 + t * 4.3;
      d += (i ? 'L' : 'M') + r(100 + Math.cos(t) * rad) + ' ' + r(100 + Math.sin(t) * rad * 0.94);
    }
    return d;
  }
  function rays() {
    let s = '';
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * Math.PI * 2, a0 = i % 2 ? 70 : 62, a1 = i % 2 ? 84 : 96;
      s += ln(`M${r(100 + Math.cos(a) * a0)} ${r(100 + Math.sin(a) * a0)}L${r(100 + Math.cos(a) * a1)} ${r(100 + Math.sin(a) * a1)}`);
    }
    return s;
  }
  function clock() {
    let s = fl(circle(100, 100, 76), 'soft') + ln(circle(100, 100, 80));
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, a0 = i % 3 ? 68 : 62;
      s += ln(`M${r(100 + Math.cos(a) * a0)} ${r(100 + Math.sin(a) * a0)}L${r(100 + Math.cos(a) * 73)} ${r(100 + Math.sin(a) * 73)}`, 'thin');
    }
    s += `<g class="hand hh"><path class="ln" d="M100 104L100 60"/></g><g class="hand mh"><path class="ln" d="M100 106L100 38"/></g>`;
    return s + fl(circle(100, 100, 6), 'dot');
  }
  function flower() {
    let s = ln('M80 214C74 176 90 146 80 108') + ln('M80 176C108 168 124 148 120 132C100 136 86 152 80 176');
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
      s += fl(circle(r(80 + Math.cos(a) * 27), r(70 + Math.sin(a) * 27), 17), 'soft') + ln(circle(r(80 + Math.cos(a) * 27), r(70 + Math.sin(a) * 27), 19));
    }
    return s + fl(circle(80, 70, 12), 'dot');
  }

  window.DOODLES = {
    heart: { vb: '0 0 210 190', html: `<g class="beat">${fl(HEART + 'Z', 'off')}${ln(HEART + 'L104 172')}</g>${ln('M178 30l12-12', 'thin')}${ln('M190 52l16-4', 'thin')}${ln('M164 18l4-15', 'thin')}` },
    stars: { vb: '0 0 230 170', html: `<g class="spin">${fl(star(72, 88, 44, 0.1), 'off')}${ln(star(72, 88, 48, 0.1))}</g>${ln(star(170, 46, 24, -0.2))}${ln(star(186, 128, 14, 0.3))}${ln('M128 150l0 16M120 158l16 0', 'thin')}${ln('M14 30l0 14M7 37l14 0', 'thin')}` },
    wish: { vb: '0 0 230 150', html: `${fl(star(178, 46, 28, 0.2), 'off')}${ln(star(178, 46, 30, 0.2))}${ln('M146 66L28 128')}${ln('M158 86L78 130', 'thin')}${ln('M134 48L50 90', 'thin')}` },
    flower: { vb: '0 0 160 220', html: `<g class="sway">${flower()}</g>` },
    plane: { vb: '0 0 250 170', html: `${ln('M8 150C52 160 92 128 86 102C82 82 54 86 60 106C66 128 124 116 152 70', 'dash')}<g class="glide">${fl('M152 36L240 22L190 100L180 64Z', 'soft')}${ln('M152 36L240 22L190 100L180 64Z')}${ln('M180 64L240 22')}${ln('M180 64L170 90L190 100', 'thin')}</g>` },
    spiral: { vb: '0 0 200 200', html: `<g class="turn">${ln(spiral())}</g>` },
    clock: { vb: '0 0 200 200', html: clock() },
    pulse: { vb: '0 0 320 130', html: `${ln('M4 80H72l10-12 10 12h16l12-56 16 98 12-42h26')}<g transform="translate(206 26) scale(.5)" class="beat">${fl(HEART + 'Z', 'off')}${ln(HEART + 'L104 172')}</g>` },
    infinity: { vb: '0 0 240 120', html: `${ln('M120 60C150 20 220 20 220 60C220 100 150 100 120 60C90 20 20 20 20 60C20 100 90 100 120 60')}<path class="run" pathLength="1" d="M120 60C150 20 220 20 220 60C220 100 150 100 120 60C90 20 20 20 20 60C20 100 90 100 120 60"/>` },
    rays: { vb: '0 0 200 200', html: `<g class="throb">${rays()}</g>` },
    boat: { vb: '0 0 90 70', html: `${ln('M10 44H80L66 62H24Z')}${ln('M45 44V8L70 40')}${ln('M45 14L24 40', 'thin')}` },
  };
})();
