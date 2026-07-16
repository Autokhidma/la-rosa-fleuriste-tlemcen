/**
 * Bouquet du hero — mandala de roses vu du dessus, généré en SVG.
 * Le groupe #bouquetSpin est mis en rotation par main.js selon le scroll.
 */
(function () {
  const spin = document.getElementById('bouquetSpin');
  if (!spin) return;

  const CX = 260, CY = 260;
  let seed = 7;
  const R = () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const shade = (hex, f) => {
    const n = parseInt(hex.slice(1), 16);
    const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c);
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  };

  let out = '';

  // Papier d'emballage : ruffles extérieurs
  for (let ring = 0; ring < 2; ring++) {
    const n = 14 - ring * 2;
    const rad = 244 - ring * 26;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * 0.22;
      const x = CX + Math.cos(a) * (rad - 34);
      const y = CY + Math.sin(a) * (rad - 34);
      out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="44" fill="url(#paperG${ring ? '2' : ''})" opacity="0.95"/>`;
    }
  }
  out += `<circle cx="${CX}" cy="${CY}" r="196" fill="#fdeef5"/>`;

  // Feuillage entre papier et fleurs
  const greens = ['#4c9160', '#3a7a4d', '#61a873'];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.15;
    const x = CX + Math.cos(a) * 178, y = CY + Math.sin(a) * 178;
    const deg = (a * 180) / Math.PI;
    out += `<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${deg.toFixed(1)})"
      d="M0 0 C 18 -16, 34 -8, 42 0 C 34 8, 18 16, 0 0 Z" fill="${greens[i % 3]}"/>`;
  }

  // Une rose (spirale de pétales)
  function rose(x, y, r, color) {
    let g = `<g>`;
    g += `<circle cx="${x}" cy="${y}" r="${r}" fill="${shade(color, 0.78)}"/>`;
    const petals = 9;
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2 + R();
      const d = r * 0.52;
      g += `<ellipse cx="${(x + Math.cos(a) * d).toFixed(1)}" cy="${(y + Math.sin(a) * d).toFixed(1)}"
        rx="${(r * 0.52).toFixed(1)}" ry="${(r * 0.44).toFixed(1)}"
        transform="rotate(${((a * 180) / Math.PI).toFixed(1)} ${(x + Math.cos(a) * d).toFixed(1)} ${(y + Math.sin(a) * d).toFixed(1)})"
        fill="${shade(color, 0.92 + R() * 0.2)}"/>`;
    }
    g += `<circle cx="${x}" cy="${y}" r="${(r * 0.6).toFixed(1)}" fill="${shade(color, 1.1)}"/>`;
    g += `<path d="M ${x - r * 0.42} ${y} a ${r * 0.42} ${r * 0.42} 0 0 1 ${r * 0.84} 0" fill="none" stroke="${shade(color, 0.75)}" stroke-width="${(r * 0.1).toFixed(1)}"/>`;
    g += `<circle cx="${x}" cy="${y}" r="${(r * 0.3).toFixed(1)}" fill="${shade(color, 0.85)}"/>`;
    g += `<circle cx="${(x - r * 0.12).toFixed(1)}" cy="${(y - r * 0.12).toFixed(1)}" r="${(r * 0.1).toFixed(1)}" fill="${shade(color, 1.45)}"/>`;
    g += `</g>`;
    return g;
  }

  const palette = ['#e0355c', '#f06a8a', '#d63384', '#ff8fab', '#c81d3c', '#f4a7c3', '#ffb3c6', '#e85d75'];

  // Anneau extérieur de roses
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    rosePositions(a, 138, 40 + R() * 6, palette[i % palette.length]);
  }
  // Anneau intermédiaire
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.35;
    rosePositions(a, 82, 36 + R() * 5, palette[(i + 3) % palette.length]);
  }
  // Rose centrale
  out += rose(CX, CY, 46, '#c81d3c');

  function rosePositions(a, dist, r, color) {
    const x = +(CX + Math.cos(a) * dist).toFixed(1);
    const y = +(CY + Math.sin(a) * dist).toFixed(1);
    out += rose(x, y, r, color);
  }

  // Gypsophile : petits points blancs éparpillés
  for (let i = 0; i < 40; i++) {
    const a = R() * Math.PI * 2;
    const d = 60 + R() * 130;
    out += `<circle cx="${(CX + Math.cos(a) * d).toFixed(1)}" cy="${(CY + Math.sin(a) * d).toFixed(1)}" r="${(2 + R() * 3).toFixed(1)}" fill="#fff" opacity="${(0.7 + R() * 0.3).toFixed(2)}"/>`;
  }

  spin.innerHTML = out;
})();
