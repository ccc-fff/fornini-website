// Source « texte » : mise en page, puis une carte de distances signées par forme (ici, une lettre).
// Sortie indépendante du GPU : liste de formes (boîte en px CSS), atlas des distances, tuiles.
// Une autre source (SVG, logo) produira la même chose : des formes, chacune avec sa carte et son identité
// (le mode Lettres colore par identité ; la Fusion additionne les formes qui se recouvrent).

import { qualOf, reachPx } from './params.js';

// ── Distance euclidienne exacte (Felzenszwalb & Huttenlocher), en 1D puis 2D ──
function edt1d(f, n, d, v, z) {
  let k = 0; v[0] = 0; z[0] = -1e20; z[1] = 1e20;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = 1e20;
  }
  k = 0;
  for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; const r = q - v[k]; d[q] = r * r + f[v[k]]; }
}
function edt(g, W, H, tmp) {
  const { f, d, v, z } = tmp;
  for (let x = 0; x < W; x++) { for (let y = 0; y < H; y++) f[y] = g[y * W + x]; edt1d(f, H, d, v, z); for (let y = 0; y < H; y++) g[y * W + x] = d[y]; }
  for (let y = 0; y < H; y++) { const o = y * W; for (let x = 0; x < W; x++) f[x] = g[o + x]; edt1d(f, W, d, v, z); for (let x = 0; x < W; x++) g[o + x] = Math.sqrt(d[x]); }
}
// distance signée en texels : négative dedans, positive dehors, bord sous-pixel par la couverture
function signedDistance(mask, W, H, a, b, tmp, out) {
  const N = W * H;
  for (let i = 0; i < N; i++) { const ink = mask[i] >= .5; a[i] = ink ? 0 : 1e20; b[i] = ink ? 1e20 : 0; }
  edt(a, W, H, tmp); edt(b, W, H, tmp);
  for (let i = 0; i < N; i++) out[i] = (mask[i] > 0 && mask[i] < 1) ? .5 - mask[i] : a[i] - b[i];
}

// marge autour de chaque lettre = gonflement le plus fort possible, plafonnée à 200 px (au-delà, distance extrapolée)
export const padNeeded = (P, size) => Math.ceil(Math.max(6, Math.min(200, reachPx(P, size)) + 2 * qualOf(P).fieldDiv + 4) / 8) * 8;

// ── Mise en page à deux niveaux : une boîte en % de la page, le texte ajusté dedans ──
// Le texte revient à la ligne entre deux mots quand il dépasse la largeur de la boîte (les retours tapés
// sont gardés). Coupure et corps dépendent l'un de l'autre : on cherche le PLUS GRAND corps pour lequel le
// texte, coupé à la largeur de la boîte, tient aussi dans sa hauteur (recherche par dichotomie).
// Les largeurs sont mesurées une fois au corps de référence : elles varient proportionnellement au corps
// (l'interlettrage est en % du corps), la recherche ne refait donc aucune mesure.
export function layoutText(P, viewW, viewH, ctx) {
  const txt = P.upper ? P.text.toUpperCase() : P.text;
  const paras = txt.split('\n').map(l => l.trim().split(/\s+/).filter(Boolean));
  const fontAt = (sz) => `${Math.round(P.wght)} ${sz}px "${P.font}"`;
  const setFont = (sz) => { ctx.font = fontAt(sz); if ('letterSpacing' in ctx) ctx.letterSpacing = `${P.ls / 100 * sz}px`; };
  const REF = 100; setFont(REF);
  const adv = new Map(), wAt = (t) => { if (!adv.has(t)) adv.set(t, ctx.measureText(t).width); return adv.get(t); };
  const space = wAt(' ');
  // coupure à la largeur maxW (au corps de référence) : retour avant le mot qui dépasse ; un mot seul trop long reste entier
  const wrap = (maxW) => {
    const out = [];
    for (const words of paras) {
      if (!words.length) { out.push(''); continue; }
      let line = words[0], w = wAt(words[0]);
      for (const word of words.slice(1)) {
        const ww = wAt(word);
        if (w + space + ww > maxW) { out.push(line); line = word; w = ww; } else { line += ' ' + word; w += space + ww; }
      }
      out.push(line);
    }
    return out.length ? out : [''];
  };
  const ink = new Map(), inkOf = (l) => { if (!ink.has(l)) { const m = ctx.measureText(l); ink.set(l, { a: m.actualBoundingBoxAscent, d: m.actualBoundingBoxDescent }); } return ink.get(l); };
  const blockAt = (lines) => ({ W: Math.max(1, ...lines.map(wAt)), H: Math.max(1, (lines.length - 1) * P.lh * REF + inkOf(lines[0]).a + inkOf(lines[lines.length - 1]).d) });
  const bw = P.boxW / 100 * viewW, bh = P.boxH / 100 * viewH, bx = P.boxX / 100 * viewW, by = P.boxY / 100 * viewH;
  const fits = (sz) => { const lines = wrap(bw * REF / sz), b = blockAt(lines); return b.W * sz / REF <= bw + 0.5 && b.H * sz / REF <= bh + 0.5; };
  // « ça tient » n'est pas monotone (un corps plus grand peut couper autrement et tenir quand un plus petit
  // ne tient pas) : balayage descendant par pas de 1 %, en notant pour chaque nombre de lignes le plus grand
  // corps qui tient. Règle : le plus grand corps, MAIS le moins de lignes possible quand l'écart est minime
  // (< 3 %) — couper une ligne tapée (« ON DEMAND ») pour gagner 1 px n'a pas de sens. Puis affinage local.
  const top0 = Math.max(4, Math.min(bh, bw) * 4), best = new Map();
  let firstFit = 0;
  for (let sz = top0; sz >= 2; sz /= 1.01) {
    if (firstFit && sz < firstFit / 1.03) break;
    if (!fits(sz)) continue;
    if (!firstFit) firstFit = sz;
    const n = wrap(bw * REF / sz).length; if (!best.has(n)) best.set(n, sz);
  }
  let lo = 2, hi = 2;
  if (best.size) { const n = Math.min(...best.keys()); lo = best.get(n); hi = lo * 1.01; }
  const nLines = (sz) => wrap(bw * REF / sz).length, n0 = nLines(lo);
  for (let it = 0; it < 12; it++) { const mid = (lo + hi) / 2; if (fits(mid) && nLines(mid) === n0) lo = mid; else hi = mid; }
  const size = Math.max(4, lo);
  const lines = wrap(bw * REF / size), { H } = blockAt(lines), first = inkOf(lines[0]);
  setFont(size);
  const k = size / REF, lh = P.lh * size;
  const top = by - H * k / 2 + first.a * k;          // ligne de base de la 1re ligne
  const glyphs = [];
  lines.forEach((line, li) => {
    const m = ctx.measureText(line), base = top + li * lh;
    const x0 = bx - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;   // centrage sur l'encre de la ligne
    for (let j = 0; j < line.length; j++) {
      const ch = line[j]; if (!ch.trim()) continue;
      const x = x0 + ctx.measureText(line.slice(0, j)).width, g = ctx.measureText(ch);
      glyphs.push({ ch, x, y: base, box: [x - g.actualBoundingBoxLeft, base - g.actualBoundingBoxAscent, x + g.actualBoundingBoxRight, base + g.actualBoundingBoxDescent] });
    }
  });
  return { glyphs, font: fontAt(size), size, box: [bx - bw / 2, by - bh / 2, bw, bh] };
}

// ── Atlas des distances : une carte par forme, rangée en étagères ; précision réduite si l'atlas déborde ──
// Les cartes d'un même caractère sont identiques (mêmes police, corps, marge) : calculées une seule fois.
export function buildAtlas(glyphs, font, P, maxTex, size) {
  const pad = padNeeded(P, size);
  let S = qualOf(P).sdf;
  for (const g of glyphs) g.pbox = [g.box[0] - pad, g.box[1] - pad, g.box[2] + pad, g.box[3] + pad];
  const AW = Math.min(4096, maxTex);
  // une entrée par caractère distinct ; chaque lettre pointe vers la carte de son caractère
  const uniq = new Map();
  for (const g of glyphs) { if (!uniq.has(g.ch)) uniq.set(g.ch, { ch: g.ch, ox: g.x - g.pbox[0], oy: g.y - g.pbox[1], bw: g.pbox[2] - g.pbox[0], bh: g.pbox[3] - g.pbox[1] }); g.u = uniq.get(g.ch); }
  const cells = [...uniq.values()];
  const pack = () => {
    let ax = 0, ay = 0, rowH = 0, fits = true;
    for (const c of cells) {
      c.w = Math.max(2, Math.ceil(c.bw * S)); c.h = Math.max(2, Math.ceil(c.bh * S));
      if (c.w > AW) fits = false;
      if (ax + c.w > AW) { ax = 0; ay += rowH + 1; rowH = 0; }
      c.ax = ax; c.ay = ay; ax += c.w + 1; rowH = Math.max(rowH, c.h);
    }
    return { AH: Math.max(1, ay + rowH), fits };
  };
  let r = pack();
  while ((r.AH > maxTex || !r.fits) && S > 0.05) { S *= 0.85; r = pack(); }
  const AH = r.AH;
  const atlas = new Float32Array(AW * AH).fill(1e3);
  const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
  let maxN = 0; for (const c of cells) maxN = Math.max(maxN, c.w * c.h, c.w, c.h);
  const big = Math.max(...cells.map(c => Math.max(c.w, c.h)), 2);
  const tmp = { f: new Float64Array(big), d: new Float64Array(big), v: new Int32Array(big), z: new Float64Array(big + 1) };
  const a = new Float64Array(maxN), b = new Float64Array(maxN), mask = new Float32Array(maxN), sd = new Float32Array(maxN);
  for (const c of cells) {
    cv.width = c.w; cv.height = c.h;
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.fillStyle = '#000'; cx.fillRect(0, 0, c.w, c.h);
    cx.setTransform(S, 0, 0, S, 0, 0);
    cx.fillStyle = '#fff'; cx.font = font; cx.textAlign = 'left'; cx.textBaseline = 'alphabetic';
    if ('letterSpacing' in cx) cx.letterSpacing = '0px';
    cx.fillText(c.ch, c.ox, c.oy);
    const px = cx.getImageData(0, 0, c.w, c.h).data, N = c.w * c.h;
    for (let i = 0; i < N; i++) mask[i] = px[i * 4] / 255;
    signedDistance(mask, c.w, c.h, a, b, tmp, sd);
    for (let y = 0; y < c.h; y++) { const row = (c.ay + y) * AW + c.ax, src = y * c.w; for (let x = 0; x < c.w; x++) atlas[row + x] = sd[src + x] / S; }   // en px CSS
  }
  // données par lettre : boîte (px CSS) puis coordonnées de sa carte dans l'atlas (0..1)
  const gdata = new Float32Array(Math.max(1, glyphs.length) * 8);
  glyphs.forEach((g, i) => {
    const c = g.u;
    gdata.set(g.pbox, i * 8);
    gdata.set([(c.ax + .5) / AW, (c.ay + .5) / AH, (c.ax + c.w - .5) / AW, (c.ay + c.h - .5) / AH], i * 8 + 4);
  });
  return { atlas, AW, AH, gdata, S, pad, nG: glyphs.length, nCells: cells.length, reduced: S < qualOf(P).sdf - 1e-6 };
}

// ── Tuiles : pour chaque carré de `tile` px, la liste des lettres assez proches pour y contribuer ──
// Évite au GPU de parcourir toutes les lettres à chaque pixel (le coût principal du moteur WebGL2).
// reach = distance au-delà de la boîte de la lettre jusqu'où elle peut encore compter.
export function binGlyphs(glyphs, viewW, viewH, tile, reach) {
  const tx = Math.max(1, Math.ceil(viewW / tile)), ty = Math.max(1, Math.ceil(viewH / tile));
  const lists = Array.from({ length: tx * ty }, () => []);
  glyphs.forEach((g, i) => {
    const x0 = Math.max(0, Math.floor((g.pbox[0] - reach) / tile)), x1 = Math.min(tx - 1, Math.floor((g.pbox[2] + reach) / tile));
    const y0 = Math.max(0, Math.floor((g.pbox[1] - reach) / tile)), y1 = Math.min(ty - 1, Math.floor((g.pbox[3] + reach) / tile));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) lists[y * tx + x].push(i);
  });
  const ranges = new Uint32Array(tx * ty * 2);
  let total = 0; for (const l of lists) total += l.length;
  const idx = new Uint32Array(Math.max(1, total));
  let o = 0, maxPer = 0;
  lists.forEach((l, t) => { ranges[t * 2] = o; ranges[t * 2 + 1] = l.length; idx.set(l, o); o += l.length; maxPer = Math.max(maxPer, l.length); });
  return { tx, ty, tile, ranges, idx, maxPer };
}

// float32 → float16 (atlas en r16float : filtrable partout, contrairement au r32float)
const f32 = new Float32Array(1), u32 = new Uint32Array(f32.buffer);
export function toHalf(src) {
  const out = new Uint16Array(src.length);
  for (let i = 0; i < src.length; i++) {
    f32[0] = src[i]; const x = u32[0];
    const sign = (x >>> 16) & 0x8000; let e = ((x >>> 23) & 0xff) - 127 + 15; let m = x & 0x7fffff;
    if (e <= 0) { out[i] = e < -10 ? sign : sign | (((m | 0x800000) + (1 << (13 - e))) >>> (1 - e + 13)); continue; }
    m += 0x1000; if (m & 0x800000) { m = 0; e++; }        // arrondi au plus proche (comme le pilote GL)
    if (e >= 31) { out[i] = sign | 0x7bff; continue; }   // borné au plus grand fini (pas d'infini dans les distances)
    out[i] = sign | (e << 10) | (m >>> 13);
  }
  return out;
}
