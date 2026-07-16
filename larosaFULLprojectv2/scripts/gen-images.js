/**
 * Générateur d'images SVG pour les produits de démonstration.
 * Produit public/img/products/p01.svg … p12.svg — illustrations colorées de bouquets.
 * Usage : node scripts/gen-images.js
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'public', 'img', 'products');
fs.mkdirSync(OUT, { recursive: true });

// RNG déterministe (mulberry32) pour des images reproductibles
const rng = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(ch);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

/** Une fleur type rose : cercles concentriques + arcs de pétales */
function flower(x, y, r, color, R) {
  x = Number(x); y = Number(y);
  const petals = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + R() * 0.5;
    const px = x + Math.cos(a) * r * 0.55;
    const py = y + Math.sin(a) * r * 0.55;
    petals.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(r * 0.55).toFixed(1)}" fill="${color}"/>`);
  }
  return `<g>
    <circle cx="${x}" cy="${y}" r="${r}" fill="${shade(color, 0.82)}"/>
    ${petals.join('')}
    <circle cx="${x}" cy="${y}" r="${(r * 0.62).toFixed(1)}" fill="${shade(color, 1.12)}"/>
    <circle cx="${x}" cy="${y}" r="${(r * 0.34).toFixed(1)}" fill="${shade(color, 0.88)}"/>
    <circle cx="${x - r * 0.15}" cy="${y - r * 0.15}" r="${(r * 0.13).toFixed(1)}" fill="${shade(color, 1.35)}"/>
  </g>`;
}

function leaf(x, y, size, angle, green) {
  return `<path transform="translate(${x} ${y}) rotate(${angle})"
    d="M0 0 C ${size * 0.5} ${-size * 0.45}, ${size * 0.9} ${-size * 0.2}, ${size} 0 C ${size * 0.9} ${size * 0.2}, ${size * 0.5} ${size * 0.45}, 0 0 Z"
    fill="${green}"/>`;
}

function sparkles(R, count, box) {
  let s = '';
  for (let i = 0; i < count; i++) {
    const x = box.x + R() * box.w, y = box.y + R() * box.h;
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.5 + R() * 2.5).toFixed(1)}" fill="#ffffff" opacity="${(0.35 + R() * 0.4).toFixed(2)}"/>`;
  }
  return s;
}

/** Grappe de fleurs circulaire au-dessus d'un emballage */
function blossomCluster(cx, cy, radius, palette, R, count = 11) {
  const greens = ['#3e7d4f', '#549b63', '#2f6b41'];
  let g = '';
  for (let i = 0; i < 8; i++) {
    const a = R() * Math.PI * 2;
    g += leaf(cx + Math.cos(a) * radius * 0.95, cy + Math.sin(a) * radius * 0.75, 34 + R() * 22, (a * 180) / Math.PI, greens[i % 3]);
  }
  const spots = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + R() * 0.7;
    const d = i === 0 ? 0 : radius * (0.45 + R() * 0.55);
    spots.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * 0.8, r: 20 + R() * 14 });
  }
  spots.sort((p, q) => p.y - q.y);
  spots.forEach((p, i) => (g += flower(p.x.toFixed(1), p.y.toFixed(1), p.r, palette[i % palette.length], R)));
  return g;
}

const CARD = (bg1, bg2, inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#bg)"/>
  ${inner}
</svg>`;

// Emballage kraft en cône
const wrap = (color) => `
  <path d="M140 240 L200 385 L260 240 Q200 270 140 240 Z" fill="${color}"/>
  <path d="M140 240 L200 385 L200 262 Q168 262 140 240 Z" fill="${shade(color, 0.85)}"/>
  <path d="M197 330 h6 l10 40 h-26 Z" fill="${shade(color, 0.7)}"/>`;

const builders = {
  bouquet: (palette, R, wrapColor = '#d9a066') =>
    wrap(wrapColor) + blossomCluster(200, 185, 92, palette, R) + sparkles(R, 10, { x: 40, y: 30, w: 320, h: 200 }),

  box: (palette, R, boxColor = '#8c3b5c') => `
    <ellipse cx="200" cy="330" rx="120" ry="26" fill="rgba(0,0,0,0.12)"/>
    <path d="M105 235 h190 v80 a95 24 0 0 1 -190 0 Z" fill="${boxColor}"/>
    <ellipse cx="200" cy="235" rx="95" ry="24" fill="${shade(boxColor, 1.25)}"/>
    <rect x="188" y="228" width="24" height="94" fill="${shade(boxColor, 1.5)}" opacity="0.5"/>
    ${blossomCluster(200, 185, 80, palette, R, 10)}
    ${sparkles(R, 8, { x: 50, y: 40, w: 300, h: 160 })}`,

  cloche: (palette, R) => `
    <ellipse cx="200" cy="345" rx="105" ry="18" fill="rgba(0,0,0,0.12)"/>
    <rect x="110" y="320" width="180" height="22" rx="8" fill="#6b4a2f"/>
    <path d="M120 320 v-140 a80 90 0 0 1 160 0 v140 Z" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.65)" stroke-width="3"/>
    <circle cx="200" cy="168" r="9" fill="rgba(255,255,255,0.7)"/>
    <path d="M200 310 q-6 -48 0 -95" stroke="#3e7d4f" stroke-width="6" fill="none"/>
    ${leaf(196, 265, 30, -140, '#3e7d4f')}
    ${flower(200, 205, 34, palette[0], R)}
    ${sparkles(R, 12, { x: 130, y: 120, w: 140, h: 180 })}`,

  basket: (palette, R) => `
    <ellipse cx="200" cy="345" rx="125" ry="20" fill="rgba(0,0,0,0.12)"/>
    <path d="M100 245 h200 l-25 95 h-150 Z" fill="#b97b3f"/>
    <path d="M100 245 h200 l-6 22 h-188 Z" fill="#a06430"/>
    <path d="M112 268 h176 M108 292 h182 M116 316 h166" stroke="#8a5527" stroke-width="7" fill="none"/>
    <path d="M135 245 a65 78 0 0 1 130 0" stroke="#a06430" stroke-width="10" fill="none"/>
    ${blossomCluster(178, 200, 68, palette, R, 8)}
    <rect x="238" y="180" width="52" height="62" rx="8" fill="#7c1f3a"/>
    <rect x="238" y="180" width="52" height="20" rx="8" fill="#9c2d4d"/>
    <text x="264" y="222" font-size="26" text-anchor="middle">🍫</text>
    ${sparkles(R, 8, { x: 60, y: 60, w: 280, h: 140 })}`,

  orchid: (palette, R) => {
    let stems = '';
    [-1, 1].forEach((dir) => {
      stems += `<path d="M200 300 q ${dir * 12} -80 ${dir * 45} -150" stroke="#3e7d4f" stroke-width="5" fill="none"/>`;
      for (let i = 0; i < 4; i++) {
        const t = 0.35 + i * 0.2;
        const x = 200 + dir * (12 * t + 45 * t * t) * 1.35;
        const y = 300 - 150 * t - 20;
        stems += flower(x.toFixed(1), y.toFixed(1), 17 + R() * 4, palette[i % palette.length], R);
      }
    });
    return `
    <ellipse cx="200" cy="352" rx="95" ry="16" fill="rgba(0,0,0,0.12)"/>
    <path d="M150 290 h100 l-12 65 h-76 Z" fill="#e8e2d6"/>
    <ellipse cx="200" cy="290" rx="50" ry="12" fill="#f6f1ea"/>
    ${leaf(180, 300, 55, -160, '#2f6b41')}${leaf(220, 300, 55, -20, '#3e7d4f')}
    ${stems}
    ${sparkles(R, 8, { x: 90, y: 60, w: 220, h: 200 })}`;
  },

  heart: (palette, R) => {
    let dots = '';
    // Cœur paramétrique rempli de petites roses
    for (let i = 0; i < 46; i++) {
      const t = R() * Math.PI * 2;
      const s = Math.sqrt(R());
      const hx = 16 * Math.pow(Math.sin(t), 3) * s;
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * s;
      dots += flower((200 + hx * 8.2).toFixed(1), (195 + hy * 7.6).toFixed(1), 12 + R() * 5, palette[i % palette.length], R);
    }
    return `<ellipse cx="200" cy="360" rx="115" ry="16" fill="rgba(0,0,0,0.12)"/>${dots}
      ${sparkles(R, 12, { x: 60, y: 50, w: 280, h: 240 })}`;
  },

  cloud: (palette, R) => {
    let puffs = '';
    for (let i = 0; i < 60; i++) {
      const a = R() * Math.PI * 2, d = Math.sqrt(R()) * 95;
      const x = 200 + Math.cos(a) * d, y = 175 + Math.sin(a) * d * 0.8;
      puffs += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(5 + R() * 9).toFixed(1)}" fill="${palette[i % palette.length]}" opacity="${(0.75 + R() * 0.25).toFixed(2)}"/>`;
    }
    return wrap('#e7cba9') + puffs + sparkles(R, 10, { x: 70, y: 50, w: 260, h: 200 });
  },

  teddy: (palette, R, fur = '#d9b38c') => `
    <ellipse cx="200" cy="352" rx="115" ry="18" fill="rgba(0,0,0,0.12)"/>
    <!-- corps -->
    <ellipse cx="200" cy="272" rx="86" ry="78" fill="${fur}"/>
    <ellipse cx="200" cy="285" rx="52" ry="55" fill="${shade(fur, 1.18)}"/>
    <!-- pattes -->
    <ellipse cx="130" cy="320" rx="30" ry="24" fill="${fur}"/><ellipse cx="270" cy="320" rx="30" ry="24" fill="${fur}"/>
    <ellipse cx="130" cy="322" rx="16" ry="12" fill="${shade(fur, 1.25)}"/><ellipse cx="270" cy="322" rx="16" ry="12" fill="${shade(fur, 1.25)}"/>
    <ellipse cx="118" cy="235" rx="26" ry="34" transform="rotate(20 118 235)" fill="${fur}"/>
    <ellipse cx="282" cy="235" rx="26" ry="34" transform="rotate(-20 282 235)" fill="${fur}"/>
    <!-- tête -->
    <circle cx="145" cy="120" r="27" fill="${fur}"/><circle cx="255" cy="120" r="27" fill="${fur}"/>
    <circle cx="145" cy="120" r="14" fill="${shade(fur, 1.25)}"/><circle cx="255" cy="120" r="14" fill="${shade(fur, 1.25)}"/>
    <circle cx="200" cy="150" r="62" fill="${fur}"/>
    <ellipse cx="200" cy="172" rx="30" ry="24" fill="${shade(fur, 1.22)}"/>
    <circle cx="178" cy="138" r="7" fill="#3d2314"/><circle cx="222" cy="138" r="7" fill="#3d2314"/>
    <circle cx="180" cy="136" r="2.2" fill="#fff"/><circle cx="224" cy="136" r="2.2" fill="#fff"/>
    <ellipse cx="200" cy="165" rx="10" ry="8" fill="#3d2314"/>
    <path d="M200 173 v8 M200 181 q-9 8 -18 2 M200 181 q9 8 18 2" stroke="#3d2314" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <!-- nœud papillon -->
    <path d="M200 208 l-30 -14 v28 Z" fill="${palette[0]}"/><path d="M200 208 l30 -14 v28 Z" fill="${palette[0]}"/>
    <circle cx="200" cy="208" r="8" fill="${shade(palette[0], 0.8)}"/>
    <!-- petites roses -->
    ${flower(120, 330, 20, palette[0], R)}${flower(285, 335, 17, palette[1 % palette.length], R)}
    ${sparkles(R, 8, { x: 60, y: 40, w: 280, h: 140 })}`,

  snowglobe: (palette, R) => {
    let snow = '';
    for (let i = 0; i < 34; i++) {
      const a = R() * Math.PI * 2, d = Math.sqrt(R()) * 88;
      snow += `<circle cx="${(200 + Math.cos(a) * d).toFixed(1)}" cy="${(185 + Math.sin(a) * d * 0.9).toFixed(1)}" r="${(1.8 + R() * 3).toFixed(1)}" fill="#fff" opacity="${(0.6 + R() * 0.4).toFixed(2)}"/>`;
    }
    return `
    <ellipse cx="200" cy="350" rx="110" ry="16" fill="rgba(0,0,0,0.12)"/>
    <path d="M130 295 h140 l14 42 h-168 Z" fill="#7c4a2d"/>
    <path d="M130 295 h140 l5 14 h-150 Z" fill="#94583a"/>
    <circle cx="200" cy="192" r="103" fill="rgba(210,235,255,0.45)" stroke="rgba(255,255,255,0.85)" stroke-width="4"/>
    <circle cx="163" cy="146" r="17" fill="rgba(255,255,255,0.55)"/>
    <path d="M200 262 q-5 -35 0 -62" stroke="#3e7d4f" stroke-width="5" fill="none"/>
    ${flower(200, 185, 30, palette[0], R)}
    <ellipse cx="200" cy="272" rx="70" ry="14" fill="rgba(255,255,255,0.85)"/>
    ${snow}
    <text x="200" y="326" font-size="17" text-anchor="middle" fill="#f3d9b1" font-family="Georgia,serif" font-style="italic">La Rosa</text>
    ${sparkles(R, 6, { x: 80, y: 50, w: 240, h: 90 })}`;
  },

  watch: (palette, R, metal = '#e8a87c') => `
    <ellipse cx="200" cy="352" rx="118" ry="16" fill="rgba(0,0,0,0.12)"/>
    <!-- écrin -->
    <rect x="82" y="150" width="236" height="180" rx="18" fill="#7c1f3a"/>
    <rect x="82" y="150" width="236" height="52" rx="18" fill="#9c2d4d"/>
    <rect x="94" y="206" width="212" height="112" rx="12" fill="#5e1329"/>
    <!-- bracelet -->
    <rect x="178" y="128" width="44" height="200" rx="20" fill="${metal}"/>
    <path d="M178 158 h44 M178 188 h44 M178 268 h44 M178 298 h44" stroke="${shade(metal, 0.82)}" stroke-width="5"/>
    <!-- cadran -->
    <circle cx="200" cy="228" r="55" fill="${shade(metal, 1.1)}"/>
    <circle cx="200" cy="228" r="46" fill="#fdf6ec"/>
    <g stroke="#8a6d4a" stroke-width="3">
      <path d="M200 190 v9 M200 257 v9 M162 228 h9 M229 228 h9"/>
    </g>
    <path d="M200 228 L200 200 M200 228 L219 240" stroke="#43202e" stroke-width="4" stroke-linecap="round"/>
    <circle cx="200" cy="228" r="4" fill="#d4a017"/>
    ${flower(116, 190, 24, palette[0] || '#e0355c', R)}
    ${flower(288, 300, 20, palette[0] || '#e0355c', R)}
    ${sparkles(R, 9, { x: 70, y: 60, w: 260, h: 110 })}`,

  perfume: (palette, R) => `
    <ellipse cx="200" cy="352" rx="115" ry="16" fill="rgba(0,0,0,0.12)"/>
    ${flower(120, 300, 26, palette[0], R)}${flower(286, 310, 23, palette[1 % palette.length], R)}
    ${leaf(140, 320, 40, -30, '#3e7d4f')}${leaf(258, 328, 40, -150, '#2f6b41')}
    <!-- flacon -->
    <rect x="150" y="170" width="100" height="150" rx="20" fill="${palette[0]}" opacity="0.85"/>
    <rect x="150" y="170" width="100" height="150" rx="20" fill="url(#bg)" opacity="0.25"/>
    <rect x="162" y="182" width="30" height="90" rx="14" fill="#ffffff" opacity="0.35"/>
    <rect x="176" y="140" width="48" height="34" rx="6" fill="#d4a017"/>
    <rect x="186" y="118" width="28" height="26" rx="8" fill="${shade('#d4a017', 1.2)}"/>
    <ellipse cx="200" cy="245" rx="34" ry="22" fill="#fdf6ec" opacity="0.92"/>
    <text x="200" y="251" font-size="15" text-anchor="middle" fill="#7c1f3a" font-family="Georgia,serif" font-style="italic">La Rosa</text>
    <!-- brume -->
    <g fill="#fff" opacity="0.7">
      <circle cx="248" cy="120" r="4"/><circle cx="262" cy="108" r="3"/><circle cx="274" cy="96" r="2.4"/>
    </g>
    ${sparkles(R, 10, { x: 70, y: 60, w: 260, h: 140 })}`,
};

const products = [
  { file: 'p01', kind: 'bouquet', bg: ['#ffe3ea', '#ffc2d1'], palette: ['#e0355c', '#c81d3c', '#f06a8a', '#a8142f'] },
  { file: 'p02', kind: 'box',     bg: ['#fff0f6', '#ffd6e8'], palette: ['#f4a7c3', '#d63384', '#f7c8d8', '#e56aa2'] },
  { file: 'p03', kind: 'bouquet', bg: ['#f3e8ff', '#ffe3f0'], palette: ['#f7c8d8', '#b9a7e0', '#ffc9a3', '#f4a7c3'] },
  { file: 'p04', kind: 'cloche',  bg: ['#2b1230', '#571c4b'],  palette: ['#e0355c'] },
  { file: 'p05', kind: 'bouquet', bg: ['#fdf6ec', '#f7e6d8'], palette: ['#f6f1ea', '#f7c8d8', '#efe0d0', '#fdeef2'] },
  { file: 'p06', kind: 'bouquet', bg: ['#fff8dc', '#ffe8b3'], palette: ['#f5c518', '#d0342c', '#ef7fae', '#e8862e'] },
  { file: 'p07', kind: 'basket',  bg: ['#fff1e0', '#ffddb8'], palette: ['#e56aa2', '#c81d3c', '#f5c518'] },
  { file: 'p08', kind: 'bouquet', bg: ['#eaf7e0', '#fdf3c4'], palette: ['#f5c518', '#e8862e', '#fff3c9', '#f2a83b'] },
  { file: 'p09', kind: 'orchid',  bg: ['#e8f4f8', '#d5e8f0'], palette: ['#ef7fae', '#f6f1ea', '#e56aa2'] },
  { file: 'p10', kind: 'bouquet', bg: ['#e3f2fd', '#fce4ec'], palette: ['#8ec5e8', '#f7c8d8', '#d9e8c5', '#fdeef2'] },
  { file: 'p11', kind: 'heart',   bg: ['#fff0f0', '#ffd0d8'], palette: ['#c81d3c', '#e0355c', '#a8142f', '#f06a8a'] },
  { file: 'p12', kind: 'cloud',   bg: ['#f0f6ff', '#e8e3fa'], palette: ['#ffffff', '#f7c8d8', '#e8e3fa', '#dcecfa'] },
  { file: 'p13', kind: 'teddy',    bg: ['#fff0e6', '#ffdcc8'], palette: ['#c81d3c', '#e56aa2'] },
  { file: 'p14', kind: 'snowglobe', bg: ['#dfeefc', '#c5dcf5'], palette: ['#c81d3c'] },
  { file: 'p15', kind: 'watch',    bg: ['#fdf1f5', '#f6d9e3'], palette: ['#e0355c'] },
  { file: 'p16', kind: 'perfume',  bg: ['#fceef5', '#f3d6ea'], palette: ['#d63384', '#e56aa2'] },
];

products.forEach((p, i) => {
  const R = rng(1000 + i * 77);
  const svg = CARD(p.bg[0], p.bg[1], builders[p.kind](p.palette, R));
  fs.writeFileSync(path.join(OUT, `${p.file}.svg`), svg);
  console.log(`✔ ${p.file}.svg`);
});

/* ============================================================
   LOGO — La Rosa (disque noir, couronne d'étoiles or, script or)
   ============================================================ */
const IMG = path.join(__dirname, '..', 'public', 'img');

const starPath = (cx, cy, r) => {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.42;
    d += `${i === 0 ? 'M' : 'L'}${(cx + Math.cos(a) * rad).toFixed(1)} ${(cy + Math.sin(a) * rad).toFixed(1)}`;
  }
  return d + 'Z';
};

const genLogo = () => {
  let stars = '';
  const N = 20;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const x = 100 + Math.cos(a) * 74, y = 100 + Math.sin(a) * 74;
    stars += `<path d="${starPath(x, y, 9)}" fill="url(#gold)"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f5d97a"/><stop offset="0.5" stop-color="#d4a017"/><stop offset="1" stop-color="#b8860b"/>
    </linearGradient>
  </defs>
  <circle cx="100" cy="100" r="100" fill="#0d0b0c"/>
  ${stars}
  <text x="100" y="112" text-anchor="middle" font-family="'Great Vibes','Brush Script MT','Segoe Script',cursive"
        font-size="44" font-style="italic" fill="url(#gold)">La Rosa</text>
</svg>`;
  fs.writeFileSync(path.join(IMG, 'logo.svg'), svg);
  console.log('✔ logo.svg');
};

/* ============================================================
   HERO — bouquet royal (roses rouges, couronne perlée, gypsophile,
   collerette blanche + or) pensé pour le médaillon circulaire
   ============================================================ */
const genHero = () => {
  const R = rng(777);
  let s = '';
  // Collerette : pointes dorées puis dentelle blanche
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const x = 300 + Math.cos(a) * 232, y = 300 + Math.sin(a) * 232;
    s += `<path d="M300 300 L${(x - 26).toFixed(0)} ${(y - 26).toFixed(0)} L${x.toFixed(0)} ${y.toFixed(0)} L${(x + 26).toFixed(0)} ${(y + 26).toFixed(0)} Z" fill="#e6c25a" opacity="0.9"/>`;
  }
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + 0.17;
    const x = 300 + Math.cos(a) * 208, y = 300 + Math.sin(a) * 208;
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="46" fill="#fdf9f3"/>`;
  }
  s += `<circle cx="300" cy="300" r="205" fill="#fffdf9"/>`;
  // Gypsophile en couronne
  for (let i = 0; i < 90; i++) {
    const a = R() * Math.PI * 2;
    const d = 150 + R() * 60;
    s += `<circle cx="${(300 + Math.cos(a) * d).toFixed(1)}" cy="${(300 + Math.sin(a) * d * 0.98).toFixed(1)}" r="${(2.2 + R() * 3.6).toFixed(1)}" fill="#fff" stroke="#eee6d8" stroke-width="0.6"/>`;
  }
  // Feuillage discret
  const greens = ['#3e7d4f', '#2f6b41'];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    s += leaf(300 + Math.cos(a) * 168, 300 + Math.sin(a) * 168, 30 + R() * 14, (a * 180) / Math.PI, greens[i % 2]);
  }
  // Dôme de roses rouges (3 anneaux + centre)
  const reds = ['#a8142f', '#c81d3c', '#8f0f26', '#d92747'];
  const ring = (n, dist, rr, off = 0) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + off;
      s += flower((300 + Math.cos(a) * dist).toFixed(1), (300 + Math.sin(a) * dist).toFixed(1), rr + R() * 5, reds[i % reds.length], R);
    }
  };
  ring(11, 128, 34);
  ring(8, 76, 36, 0.35);
  ring(4, 34, 34, 0.8);
  // Couronne perlée au centre
  s += `<g transform="translate(300 268)">
    <path d="M-46 26 h92 v14 a8 8 0 0 1 -8 8 h-76 a8 8 0 0 1 -8 -8 Z" fill="url(#goldH)"/>
    <path d="M-46 26 L-34 -18 L-17 14 L0 -30 L17 14 L34 -18 L46 26 Z" fill="url(#goldH)"/>
    <circle cx="-34" cy="-22" r="7" fill="#fdf6ec" stroke="#c9a75a" stroke-width="1.4"/>
    <circle cx="0" cy="-35" r="8" fill="#fdf6ec" stroke="#c9a75a" stroke-width="1.4"/>
    <circle cx="34" cy="-22" r="7" fill="#fdf6ec" stroke="#c9a75a" stroke-width="1.4"/>
    <circle cx="-20" cy="33" r="4.6" fill="#fdf6ec"/><circle cx="0" cy="33" r="4.6" fill="#fdf6ec"/><circle cx="20" cy="33" r="4.6" fill="#fdf6ec"/>
    <circle cx="0" cy="8" r="6" fill="#e75e79"/>
  </g>`;
  // Perles éparses
  for (let i = 0; i < 16; i++) {
    const a = R() * Math.PI * 2, d = 50 + R() * 110;
    s += `<circle cx="${(300 + Math.cos(a) * d).toFixed(1)}" cy="${(300 + Math.sin(a) * d).toFixed(1)}" r="${(2.6 + R() * 2).toFixed(1)}" fill="#fdf6ec" stroke="#d8c9a8" stroke-width="0.8"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="goldH" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f5d97a"/><stop offset="1" stop-color="#c9971c"/>
    </linearGradient>
    <radialGradient id="heroBg" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#fff2f4"/><stop offset="0.75" stop-color="#fbe3e8"/><stop offset="1" stop-color="#f6d3db"/>
    </radialGradient>
    <clipPath id="round"><circle cx="300" cy="300" r="300"/></clipPath>
  </defs>
  <g clip-path="url(#round)">
    <rect width="600" height="600" fill="url(#heroBg)"/>
    ${s}
  </g>
</svg>`;
  fs.writeFileSync(path.join(IMG, 'hero-bouquet.svg'), svg);
  console.log('✔ hero-bouquet.svg');
};

/* ============================================================
   ICÔNES DE CATÉGORIES (l'admin peut les remplacer par upload)
   ============================================================ */
const genCategoryIcons = () => {
  const CATS = path.join(IMG, 'cats');
  fs.mkdirSync(CATS, { recursive: true });
  const R = rng(4242);
  const icon = (name, bg, inner) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <defs><clipPath id="c"><circle cx="80" cy="80" r="80"/></clipPath></defs>
  <g clip-path="url(#c)"><rect width="160" height="160" fill="${bg}"/>${inner}</g>
</svg>`;
    fs.writeFileSync(path.join(CATS, `${name}.svg`), svg);
    console.log(`✔ cats/${name}.svg`);
  };

  icon('bouquets', '#ffe3ea', `
    <path d="M62 92 L80 138 L98 92 Q80 102 62 92 Z" fill="#d9a066"/>
    ${flower(64, 74, 15, '#c81d3c', R)}${flower(96, 74, 15, '#f06a8a', R)}${flower(80, 56, 16, '#e0355c', R)}
    ${leaf(52, 84, 18, -160, '#3e7d4f')}${leaf(108, 84, 18, -20, '#3e7d4f')}`);

  icon('box', '#fde7f1', `
    <path d="M40 78 h80 v34 a40 12 0 0 1 -80 0 Z" fill="#8c3b5c"/>
    <ellipse cx="80" cy="78" rx="40" ry="11" fill="#a94f74"/>
    ${flower(62, 62, 12, '#f4a7c3', R)}${flower(97, 62, 12, '#d63384', R)}${flower(80, 50, 13, '#e56aa2', R)}`);

  icon('eternelle', '#3c1430', `
    <rect x="46" y="118" width="68" height="10" rx="4" fill="#6b4a2f"/>
    <path d="M52 118 v-44 a28 34 0 0 1 56 0 v44 Z" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.7)" stroke-width="2"/>
    <path d="M80 112 q-3 -18 0 -34" stroke="#3e7d4f" stroke-width="3.4" fill="none"/>
    ${flower(80, 70, 13, '#e0355c', R)}`);

  icon('boule', '#dfeefc', `
    <path d="M52 112 h56 l6 16 h-68 Z" fill="#7c4a2d"/>
    <circle cx="80" cy="76" r="40" fill="rgba(255,255,255,0.5)" stroke="#fff" stroke-width="2.5"/>
    ${flower(80, 76, 12, '#c81d3c', R)}
    <circle cx="64" cy="60" r="2.4" fill="#fff"/><circle cx="95" cy="55" r="2" fill="#fff"/><circle cx="98" cy="88" r="2.4" fill="#fff"/><circle cx="60" cy="90" r="2" fill="#fff"/>`);

  icon('nounours', '#ffeedd', `
    <circle cx="56" cy="52" r="14" fill="#d9b38c"/><circle cx="104" cy="52" r="14" fill="#d9b38c"/>
    <circle cx="80" cy="76" r="34" fill="#d9b38c"/>
    <ellipse cx="80" cy="88" rx="16" ry="13" fill="#efd3b3"/>
    <circle cx="68" cy="70" r="4" fill="#3d2314"/><circle cx="92" cy="70" r="4" fill="#3d2314"/>
    <ellipse cx="80" cy="84" rx="5.4" ry="4.4" fill="#3d2314"/>
    <path d="M62 112 l18 8 18 -8 v10 l-18 8 -18 -8 Z" fill="#c81d3c"/>`);

  icon('montre', '#fdf1f5', `
    <rect x="66" y="16" width="28" height="128" rx="13" fill="#e8a87c"/>
    <circle cx="80" cy="80" r="34" fill="#f3c8a4"/><circle cx="80" cy="80" r="27" fill="#fdf6ec"/>
    <path d="M80 80 V62 M80 80 L93 88" stroke="#43202e" stroke-width="3.4" stroke-linecap="round"/>
    <circle cx="80" cy="80" r="3" fill="#d4a017"/>`);

  icon('parfum', '#fceef5', `
    <rect x="56" y="62" width="48" height="70" rx="12" fill="#d63384" opacity="0.85"/>
    <rect x="62" y="68" width="14" height="42" rx="7" fill="#fff" opacity="0.4"/>
    <rect x="68" y="44" width="24" height="20" rx="4" fill="#d4a017"/>
    <rect x="73" y="32" width="14" height="14" rx="5" fill="#e6c25a"/>
    <circle cx="106" cy="36" r="2.6" fill="#d4a017" opacity="0.8"/><circle cx="114" cy="28" r="2" fill="#d4a017" opacity="0.7"/>`);

  icon('mariage', '#fdf6ec', `
    <circle cx="66" cy="86" r="26" fill="none" stroke="#d4a017" stroke-width="7"/>
    <circle cx="98" cy="86" r="26" fill="none" stroke="#e8b4c4" stroke-width="7"/>
    <path d="${starPath(66, 46, 9)}" fill="#e0e7ff" stroke="#b9c4f0" stroke-width="1.4"/>`);

  icon('occasions', '#fff3dc', `
    <rect x="42" y="72" width="76" height="56" rx="9" fill="#e0355c"/>
    <rect x="42" y="72" width="76" height="18" rx="9" fill="#c81d3c"/>
    <rect x="74" y="58" width="12" height="70" fill="#f5c518"/>
    <path d="M80 58 q-20 -22 -26 -4 q-4 14 26 4 Z" fill="#f5c518"/>
    <path d="M80 58 q20 -22 26 -4 q4 14 -26 4 Z" fill="#e8b415"/>`);

  icon('plantes', '#e7f5e1', `
    <path d="M56 96 h48 l-7 40 h-34 Z" fill="#b06fd1"/>
    <path d="M80 96 q-4 -30 0 -48" stroke="#3e7d4f" stroke-width="4" fill="none"/>
    ${leaf(78, 66, 26, -150, '#4c9160')}${leaf(82, 78, 26, -30, '#3a7a4d')}${leaf(78, 52, 22, -120, '#61a873')}`);
};

genLogo();
genHero();
genCategoryIcons();
console.log(`\nImages générées dans ${OUT}`);
