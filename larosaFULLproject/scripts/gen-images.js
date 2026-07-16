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
];

products.forEach((p, i) => {
  const R = rng(1000 + i * 77);
  const svg = CARD(p.bg[0], p.bg[1], builders[p.kind](p.palette, R));
  fs.writeFileSync(path.join(OUT, `${p.file}.svg`), svg);
  console.log(`✔ ${p.file}.svg`);
});
console.log(`\nImages générées dans ${OUT}`);
