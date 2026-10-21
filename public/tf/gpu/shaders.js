// Shaders WGSL de Text Fusion — traduction du moteur WebGL2 (index.html, état de référence 7b9965c).
// Convention : uv a son origine EN HAUT à gauche (comme les textures WebGPU) ; s = uv = position écran 0..1, y vers le bas.
// Chaîne par image : SIM (intensité, par groupe de 4 couches) → SHAPE (contour gonflé) → BLUR ×2 → [MASK + BLUR ×2 : douceur]
// → SHOW (rendu). BASE (typo de base) ne tourne qu'après un changement de texte, de taille ou de qualité.

const VS = /* wgsl */ `
struct VO { @builtin(position) pos: vec4f, @location(0) uv: vec2f };
@vertex fn vs(@builtin(vertex_index) i: u32) -> VO {
  let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
  var o: VO; o.pos = vec4f(p * 2.0 - 1.0, 0.0, 1.0); o.uv = vec2f(p.x, 1.0 - p.y); return o;
}`;

// échantillonnage bicubique (B-spline, 4 lectures) — contours sans facettes
const BICUBIC = /* wgsl */ `
fn cubicW(v: f32) -> vec4f { let n = vec4f(1., 2., 3., 4.) - v; let s = n * n * n; let x = s.x; let y = s.y - 4. * s.x; let z = s.z - 4. * s.y + 6. * s.x; return vec4f(x, y, z, 6. - x - y - z) / 6.; }
fn bicubic(t: texture_2d<f32>, sm: sampler, uv: vec2f) -> vec4f {
  let res = vec2f(textureDimensions(t, 0));
  let st = uv * res - .5; let i = floor(st); let f = st - i;
  let xc = cubicW(f.x); let yc = cubicW(f.y);
  let c = i.xxyy + vec4f(-.5, 1.5, -.5, 1.5);
  let s = vec4f(xc.xz + xc.yw, yc.xz + yc.yw);
  let o = (c + vec4f(xc.yw, yc.yw) / s) / res.xxyy;
  let a = textureSampleLevel(t, sm, o.xz, 0.); let b = textureSampleLevel(t, sm, o.yz, 0.);
  let cc = textureSampleLevel(t, sm, o.xw, 0.); let d = textureSampleLevel(t, sm, o.yw, 0.);
  let sx = s.x / (s.x + s.y); let sy = s.z / (s.z + s.w);
  return mix(mix(d, cc, sx), mix(b, a, sx), sy);
}`;

// ── Intensité : bruit (10 natures, formules d'imago couchesfield.ts) + mémoire de la souris, par groupe de 4 couches ──
export const SIM = VS + /* wgsl */ `
struct SimU {
  a: vec4f,   // t, dt, aspect, nL
  b: vec4f,   // mUp, mDown, mEase, mAmt
  c: vec4f,   // mRad, mSoft, mOn, grp
  d: vec4f,   // mouse.x, mouse.y, multi, ecart
  e: vec4f,   // nScale, nSpeed, nLac, nGain
  f: vec4f,   // nWarp, nJit, nOct, nType
  g: vec4f,   // driftX, driftY, nNoir, nBlanc
  h: vec4f,   // variation
  lm: array<vec4f, 3>,   // souris active par couche (12 places)
};
@group(0) @binding(0) var<uniform> U: SimU;
@group(0) @binding(1) var memT: texture_2d<f32>;
struct SimOut { @location(0) mem: vec4f, @location(1) inten: vec4f, @location(2) raw: vec4f };

fn hash(p0: vec3f) -> f32 { var p = fract(p0 * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
fn vnoise(x: vec3f) -> f32 {
  let i = floor(x); var f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(hash(i), hash(i + vec3f(1,0,0)), f.x), mix(hash(i + vec3f(0,1,0)), hash(i + vec3f(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3f(0,0,1)), hash(i + vec3f(1,0,1)), f.x), mix(hash(i + vec3f(0,1,1)), hash(i + vec3f(1,1,1)), f.x), f.y), f.z);
}
fn fbm(p0: vec3f, oct: i32) -> f32 {
  var a = .5; var s = 0.; var n = 0.; var p = p0;
  for (var k = 0; k < 6; k++) { if (k >= oct) { break; } s += a * vnoise(p); n += a; p = p * 2.03 + 17.1; a *= .5; }
  return s / n;
}
fn h33(p0: vec3f) -> vec3f { var p = fract(p0 * vec3f(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx) * 2. - 1.; }
fn pn(p: vec3f) -> f32 {                                  // bruit de gradient (Perlin), interpolation quintique
  let i = floor(p); let f = fract(p); let u = f * f * f * (f * (f * 6. - 15.) + 10.);
  return 1.5 * mix(mix(mix(dot(h33(i), f), dot(h33(i + vec3f(1,0,0)), f - vec3f(1,0,0)), u.x),
                       mix(dot(h33(i + vec3f(0,1,0)), f - vec3f(0,1,0)), dot(h33(i + vec3f(1,1,0)), f - vec3f(1,1,0)), u.x), u.y),
                   mix(mix(dot(h33(i + vec3f(0,0,1)), f - vec3f(0,0,1)), dot(h33(i + vec3f(1,0,1)), f - vec3f(1,0,1)), u.x),
                       mix(dot(h33(i + vec3f(0,1,1)), f - vec3f(0,1,1)), dot(h33(i + vec3f(1,1,1)), f - vec3f(1,1,1)), u.x), u.y), u.z) * .577;
}
fn fbmP(p: vec3f, oct: i32, lac: f32, gain: f32, kind: i32) -> f32 {   // kind 0 fBm · 1 ridged · 2 turbulence
  var sum = 0.; var amp = 1.; var fr = 1.; var norm = 0.;
  for (var o = 0; o < 8; o++) {
    if (o >= oct) { break; }
    var v = pn(vec3f(p.xy * fr + f32(o) * vec2f(7.13, 13.71), p.z + f32(o) * 3.7));
    if (kind == 1) { v = 1. - abs(v); v *= v; } else if (kind == 2) { v = abs(v); }
    sum += v * amp; norm += amp; amp *= gain; fr *= lac;
  }
  let r = select(0., sum / norm, norm > 0.);
  return select(r * 2. - 1., r, kind == 0);
}
fn nature(q: vec2f, z: f32) -> f32 {
  let nType = i32(U.f.w); let nOct = i32(U.f.z); let nLac = U.e.z; let nGain = U.e.w; let nWarp = U.f.x; let nJit = U.f.y;
  if (nType == 0) { return fbm(vec3f(q, z), nOct) * 2. - 1.; }                       // valeur
  if (nType == 1) { return pn(vec3f(q, z)); }                                          // Perlin
  if (nType == 2) { return fbmP(vec3f(q, z), nOct, nLac, nGain, 0); }                  // fBm
  if (nType == 3) { return fbmP(vec3f(q, z), nOct, nLac, nGain, 1); }                  // ridged
  if (nType == 4) { return fbmP(vec3f(q, z), nOct, nLac, nGain, 2); }                  // turbulence
  if (nType == 5) {                                                                    // domain warp
    let qx = fbmP(vec3f(q + vec2f(5.2, 1.3), z), 4, nLac, .5, 0); let qy = fbmP(vec3f(q + vec2f(8.1, 2.7), z), 4, nLac, .5, 0);
    return fbmP(vec3f(q + nWarp * vec2f(qx, qy), z), nOct, nLac, .5, 0);
  }
  if (nType == 6) {                                                                    // cellulaire : F1, sites animés
    let c = floor(q); var f1 = 9.;
    for (var j = -1; j <= 1; j++) { for (var i = -1; i <= 1; i++) {
      let g = c + vec2f(f32(i), f32(j)); let h = h33(vec3f(g, 17.)) * .5 + .5;
      let site = g + .5 + .5 * nJit * vec2f(cos(z + h.x * 6.283), sin(z + h.y * 6.283));
      f1 = min(f1, length(site - q));
    } }
    return 1. - 2. * clamp(f1, 0., 1.);
  }
  if (nType == 7) {                                                                    // curl : advection perpendiculaire au gradient
    var cq = vec3f(q, z); let e = .25;
    for (var o = 0; o < 8; o++) {
      if (o >= nOct) { break; }
      let gx = (pn(cq + vec3f(e, 0, 0)) - pn(cq - vec3f(e, 0, 0))) / (2. * e);
      let gy = (pn(cq + vec3f(0, e, 0)) - pn(cq - vec3f(0, e, 0))) / (2. * e);
      cq = vec3f(cq.xy + vec2f(-gy, gx) * nWarp * .25, cq.z);
    }
    return pn(cq);
  }
  if (nType == 8) {                                                                    // marbre
    let t = fbmP(vec3f(q, z), nOct, 2., .5, 2) * .5 + .5;
    return sin(3.1416 * q.x + t * nWarp * 5. + z);
  }
  let g = 6.2832 * q;                                                                  // gyroïde, coupe z = temps
  return clamp((sin(g.x) * cos(g.y) + sin(g.y) * cos(z) + sin(z) * cos(g.x)) / 1.5, -1., 1.);
}
// valeur brute du bruit (0..1) vue par la couche k ; graine propre à la couche en mode Couches
fn rawN(s: vec2f, k: f32) -> f32 {
  let p = vec2f(s.x * U.a.z, s.y);
  let multi = U.d.z > .5;
  let jt = select(vec2f(0.), h33(vec3f(k, 7.1, 3.3)).xy, multi);
  let sc = U.e.x * (1. + .3 * U.h.x * jt.y);
  let off = select(vec2f(0.), vec2f(k * (8. + U.d.w * 14.) + jt.x * 5., k * (6. + U.d.w * 10.) + jt.y * 5.), multi);
  let zt = U.a.x * U.e.y + select(0., k * 3.1 + jt.y * 2., multi);
  let dr = U.g.xy * U.a.x * sc * (1. + U.h.x * jt.x * .8);
  return clamp(nature(p * sc - dr + off, zt) * .5 + .5, 0., 1.);
}
fn levels(n: f32) -> f32 { return clamp((n - U.g.z) / max(U.g.w - U.g.z, 1e-4), 0., 1.); }
fn mouseT(s: vec2f, k: i32) -> f32 {
  if (U.b.w <= 0. || U.c.z <= 0. || U.lm[k / 4][k % 4] <= .5) { return 0.; }
  let p = vec2f(s.x * U.a.z, s.y);
  let d = length(p - vec2f(U.d.x * U.a.z, U.d.y));
  return pow(clamp(1. - d / U.c.x, 0., 1.), U.c.y);
}
fn stepM(m: f32, tg: f32) -> f32 { return select(max(tg, m - U.a.y / max(U.b.y, 1e-3)), min(tg, m + U.a.y / max(U.b.x, 1e-3)), tg > m); }
fn ease(x: f32) -> f32 {
  let e = i32(U.b.z);
  if (e == 1) { return select(1. - pow(-2. * x + 2., 3.) / 2., 4. * x * x * x, x < .5); }
  if (e == 2) { return 1. - pow(1. - x, 3.); }
  if (e == 3) { return select(1. - pow(-2. * x + 2., 5.) / 2., 16. * pow(x, 5.), x < .5); }
  return x;
}
@fragment fn fs(i: VO) -> SimOut {
  let s = i.uv;
  let m = textureLoad(memT, vec2i(i.pos.xy), 0);
  let nL = i32(U.a.w); let b = i32(U.c.w) * 4;
  var R = vec4f(0.); var N = vec4f(0.); var M = vec4f(0.);
  for (var c = 0; c < 4; c++) {
    let k = b + c;
    if (k < nL) { let r = rawN(s, f32(k)); R[c] = r; N[c] = levels(r); M[c] = stepM(m[c], mouseT(s, k)); }
  }
  var o: SimOut;
  o.mem = M; o.raw = R;
  // la souris AJOUTE de l'intensité au bruit : sous le curseur, la forme gonfle au-delà de ce que fait le bruit
  o.inten = clamp(N + vec4f(ease(M.x), ease(M.y), ease(M.z), ease(M.w)) * U.b.w, vec4f(0.), vec4f(1. + U.b.w));
  return o;
}`;

// ── Forme (G1a) : contour repoussé de r(I), lettre par lettre — seulement les lettres de la tuile du pixel ──
export const SHAPE = VS + BICUBIC + /* wgsl */ `
struct ShapeU {
  a: vec4f,   // nG, mode, nPal, cell
  b: vec4f,   // rMax, gr, alpha, iOn
  c: vec4f,   // iW, viewW, viewH, tile
  d: vec4f,   // tilesX, tilesY
  pal: array<vec4f, 10>,
};
@group(0) @binding(0) var<uniform> U: ShapeU;
@group(0) @binding(1) var smp: sampler;
@group(0) @binding(2) var Itex: texture_2d<f32>;
@group(0) @binding(3) var atlas: texture_2d<f32>;
@group(0) @binding(4) var<storage, read> gdata: array<vec4f>;
@group(0) @binding(5) var<storage, read> ranges: array<u32>;
@group(0) @binding(6) var<storage, read> idx: array<u32>;
@fragment fn fs(i: VO) -> @location(0) vec4f {
  let view = U.c.yz; let p = i.uv * view; let cell = U.a.w; let nPal = u32(U.a.z);
  let I = clamp(bicubic(Itex, smp, i.uv), vec4f(0.), vec4f(4.));          // jusqu'à 4 : bruit (1) + souris (3)
  let r = U.b.x * pow(I, vec4f(U.b.y));
  let pres = smoothstep(vec4f(U.b.w - U.c.x), vec4f(U.b.w + U.c.x), I);   // la copie n'existe que là où la couche est active
  let cut = max(max(r.x, r.y), max(r.z, r.w)) + 2. * cell;
  let tc = clamp(vec2i(floor(p / U.c.w)), vec2i(0), vec2i(i32(U.d.x) - 1, i32(U.d.y) - 1));
  let t = u32(tc.y * i32(U.d.x) + tc.x);
  let o0 = ranges[t * 2u]; let cnt = ranges[t * 2u + 1u];
  var sum = vec4f(0.); var mx = vec4f(0.); var cs = vec3f(0.);
  for (var j = 0u; j < cnt; j++) {
    let gi = idx[o0 + j];
    let bx = gdata[gi * 2u];
    let q = clamp(p, bx.xy, bx.zw);
    let dq = length(p - q);
    if (dq > cut) { continue; }
    let a = gdata[gi * 2u + 1u];
    let d = textureSampleLevel(atlas, smp, mix(a.xy, a.zw, (q - bx.xy) / (bx.zw - bx.xy)), 0.).r + dq;
    let cov = clamp(.5 - (vec4f(d) - r) / cell, vec4f(0.), vec4f(1.)) * pres;
    sum += cov; mx = max(mx, cov); cs += cov.x * U.pal[gi % nPal].rgb;
  }
  let F = mx + U.b.z * (sum - mx);
  if (i32(U.a.y) == 2) { return vec4f(cs / max(sum.x, 1e-5) * F.x, F.x); }      // 2 = Lettres
  return F;
}`;

// ── Flou (G2) : gaussien séparable, rayon σ(I) propre à chaque point et à chaque couche ──
export const BLUR = VS + BICUBIC + /* wgsl */ `
struct BlurU {
  a: vec4f,   // dir.x, dir.y, s0, s1
  b: vec4f,   // gs, cell, same, useFixed
  sig: vec4f, // rayons fixes par canal (douceur des couches), en cases
};
@group(0) @binding(0) var<uniform> U: BlurU;
@group(0) @binding(1) var smp: sampler;
@group(0) @binding(2) var src: texture_2d<f32>;
@group(0) @binding(3) var Itex: texture_2d<f32>;
@fragment fn fs(i: VO) -> @location(0) vec4f {
  var sg = (U.a.z + max(U.a.w - U.a.z, 0.) * pow(clamp(bicubic(Itex, smp, i.uv), vec4f(0.), vec4f(1.)), vec4f(U.b.x))) / U.b.y;
  if (U.b.z > .5) { sg = vec4f(sg.x); }
  if (U.b.w > .5) { sg = U.sig; }
  sg = max(sg, vec4f(.01));
  let R = ceil(3. * max(max(sg.x, sg.y), max(sg.z, sg.w)));
  let stride = max(1., R / 40.);
  var acc = vec4f(0.); var ws = vec4f(0.);
  for (var k = -40; k <= 40; k++) {
    let x = f32(k) * stride;
    if (abs(x) > R + .5) { continue; }
    let w = exp(-x * x / (2. * sg * sg));
    acc += w * textureSampleLevel(src, smp, i.uv + U.a.xy * x, 0.); ws += w;
  }
  return acc / max(ws, vec4f(1e-6));
}`;

// ── Douceur (flou centré, choisi par FF le 07/10) : forme nette de chaque couche, ensuite floutée ──
export const MASK = VS + /* wgsl */ `
@group(0) @binding(0) var smp: sampler;
@group(0) @binding(1) var src: texture_2d<f32>;
@fragment fn fs(i: VO) -> @location(0) vec4f {
  let F = textureSampleLevel(src, smp, i.uv, 0.);
  return clamp((F - .5) / max(fwidth(F), vec4f(1e-4)) + .5, vec4f(0.), vec4f(1.));
}`;

// ── Typo de base : couverture des lettres à la résolution de l'écran, calculée une fois (texte, taille, qualité) ──
export const BASE = VS + /* wgsl */ `
struct BaseU { a: vec4f, b: vec4f };   // a: viewW, viewH, tile, tilesX · b: tilesY, pxScale
@group(0) @binding(0) var<uniform> U: BaseU;
@group(0) @binding(1) var smp: sampler;
@group(0) @binding(2) var atlas: texture_2d<f32>;
@group(0) @binding(3) var<storage, read> gdata: array<vec4f>;
@group(0) @binding(4) var<storage, read> ranges: array<u32>;
@group(0) @binding(5) var<storage, read> idx: array<u32>;
@fragment fn fs(i: VO) -> @location(0) vec4f {
  let p = i.uv * U.a.xy;
  let tc = clamp(vec2i(floor(p / U.a.z)), vec2i(0), vec2i(i32(U.a.w) - 1, i32(U.b.x) - 1));
  let t = u32(tc.y * i32(U.a.w) + tc.x);
  let o0 = ranges[t * 2u]; let cnt = ranges[t * 2u + 1u];
  var dB = 1e4;
  for (var j = 0u; j < cnt; j++) {
    let gi = idx[o0 + j]; let bx = gdata[gi * 2u];
    if (any(p < bx.xy) || any(p > bx.zw)) { continue; }
    let a = gdata[gi * 2u + 1u];
    dB = min(dB, textureSampleLevel(atlas, smp, mix(a.xy, a.zw, (p - bx.xy) / (bx.zw - bx.xy)), 0.).r);
  }
  return vec4f(clamp(.5 - dB * U.b.y, 0., 1.), 0., 0., 1.);
}`;

// ── Rendu : seuil(s) du champ flouté à la résolution de l'écran ; typo de base intacte en dessous ──
export const SHOW = VS + BICUBIC + /* wgsl */ `
struct ShowU {
  a: vec4f,   // typo d'origine affichée, mode, nL, nPal
  b: vec4f,   // th, gap, rampTop, sharp
  c: vec4f,   // pxScale, showN, showM, cOn
  d: vec4f,   // aplat, strokePx, viewW, viewH
  e: vec4f,   // point noir, point blanc (vue du bruit)
  mouseV: vec4f,   // x, y en px CSS, rayon en px CSS (0 si le curseur est hors de l'image)
  bg: vec4f, ink: vec4f, strokeCol: vec4f,
  pal: array<vec4f, 10>,
  lFill: array<vec4f, 3>, lLine: array<vec4f, 3>, lW: array<vec4f, 3>, lEdge: array<vec4f, 3>,
};
@group(0) @binding(0) var<uniform> U: ShowU;
@group(0) @binding(1) var smp: sampler;
@group(0) @binding(2) var field0: texture_2d<f32>;
@group(0) @binding(3) var field1: texture_2d<f32>;
@group(0) @binding(4) var field2: texture_2d<f32>;
@group(0) @binding(5) var soft0: texture_2d<f32>;
@group(0) @binding(6) var soft1: texture_2d<f32>;
@group(0) @binding(7) var soft2: texture_2d<f32>;
@group(0) @binding(8) var Itex: texture_2d<f32>;
@group(0) @binding(9) var rawTex: texture_2d<f32>;
@group(0) @binding(10) var memTex: texture_2d<f32>;
@group(0) @binding(11) var baseTex: texture_2d<f32>;
fn cover(F: f32, t: f32, fw: f32) -> f32 { return clamp((F - t) / max(fw, 1e-4) + .5, 0., 1.); }
// trait d'épaisseur sw (px écran) centré sur la ligne de niveau t
fn lineCov(G: f32, t: f32, sw: f32, fw: f32) -> f32 { return clamp(sw * .5 - abs((G - t) / max(fw, 1e-6)) + .5, 0., 1.); }
fn lay(a: array<vec4f, 3>, L: i32) -> f32 { return a[L / 4][L % 4]; }
@fragment fn fs(i: VO) -> @location(0) vec4f {
  let uv = i.uv; let p = uv * U.d.zw; let pxScale = U.c.x;
  let mode = i32(U.a.y); let nL = i32(U.a.z); let nPal = i32(U.a.w); let th = U.b.x;
  let showN = i32(U.c.y);
  // les dérivées (fwidth) se prennent hors de toute branche dépendant du pixel
  var n = 0.; if (showN == 1) { n = bicubic(rawTex, smp, uv).x; }
  let F = bicubic(field0, smp, uv);
  var F1 = vec4f(0.); var F2 = vec4f(0.); var S0 = vec4f(0.); var S1 = vec4f(0.); var S2 = vec4f(0.);
  if (mode == 0) {
    S0 = bicubic(soft0, smp, uv);
    if (nL > 4) { F1 = bicubic(field1, smp, uv); S1 = bicubic(soft1, smp, uv); }
    if (nL > 8) { F2 = bicubic(field2, smp, uv); S2 = bicubic(soft2, smp, uv); }
  }
  let fwn = fwidth(n); let fF = fwidth(F); let fF1 = fwidth(F1); let fF2 = fwidth(F2);
  let fH = fwidth(max(F.x - th, 0.));                           // pente de la hauteur au-dessus du seuil (mode Niveaux)

  var back = U.bg.rgb;
  if (showN == 1) {                                            // bruit brut en gris, avec les lignes des points noir et blanc
    back = mix(vec3f(n), vec3f(1., .35, .1), lineCov(n, U.e.x, 1.5 * pxScale, fwn));
    back = mix(back, vec3f(.47, .94, 1.), lineCov(n, U.e.y, 1.5 * pxScale, fwn));
  } else if (showN == 2) { back = vec3f(bicubic(Itex, smp, uv).x); }
  if (U.c.z > .5) {                                            // souris : traînée en magenta + cercle du rayon
    let mm = bicubic(memTex, smp, uv);
    back = mix(back, vec3f(1., .31, .85), .75 * clamp(max(max(mm.x, mm.y), max(mm.z, mm.w)), 0., 1.));
    if (U.mouseV.z > 0.) { back = mix(back, vec3f(.47, .94, 1.), clamp(1.5 - abs(length(p - U.mouseV.xy) - U.mouseV.z) * pxScale, 0., 1.)); }
  }
  var c = mix(back, U.ink.rgb, textureLoad(baseTex, vec2i(i.pos.xy), 0).r * U.a.x);      // a.x = typo d'origine affichée (0/1)
  let sw = max(U.d.y * pxScale, 1.);
  let fillOn = U.d.x > .5; let lineOn = U.c.w > .5;
  if (mode == 0) {
    for (var L = 0; L < 10; L++) {
      if (L >= nL) { break; }
      var FL = 0.; var fw = 0.; var SL = 0.;
      if (L < 4) { FL = F[L]; fw = fF[L]; SL = S0[L]; } else if (L < 8) { FL = F1[L - 4]; fw = fF1[L - 4]; SL = S1[L - 4]; } else { FL = F2[L - 8]; fw = fF2[L - 8]; SL = S2[L - 8]; }
      // par couche : aplat (douceur = flou centré de la forme nette), contour de la couleur de la couche, épaisseur propre
      if (lay(U.lFill, L) > .5) { c = mix(c, U.pal[L].rgb, select(cover(FL, th, fw), clamp(SL, 0., 1.), lay(U.lEdge, L) > .25)); }
      if (lay(U.lLine, L) > .5) { c = mix(c, U.pal[L].rgb, lineCov(FL, th, max(lay(U.lW, L) * pxScale, 1.), fw)); }
    }
  } else if (mode == 1) {
    // niveaux + rampe : hauteur au-dessus du seuil, découpée en marches d'« écart » (0 = continu), plus ou moins franches
    let gap = U.b.y; let rampTop = U.b.z;
    let span = max(rampTop - th, 1e-3); let h = max(F.x - th, 0.); var hq = h;
    if (gap > 1e-4) {
      let u = h / gap; let soft = max(1. - U.b.w, fH / gap);
      hq = gap * (floor(u) + smoothstep(1. - soft, 1., fract(u)));
    }
    let tt = clamp(hq / span, 0., 1.) * f32(nPal - 1);
    let k0 = min(i32(floor(tt)), max(nPal - 2, 0));
    var col = U.pal[0].rgb;
    if (nPal > 1) { col = mix(U.pal[k0].rgb, U.pal[k0 + 1].rgb, clamp(tt - f32(k0), 0., 1.)); }
    if (fillOn) { c = mix(c, col, cover(F.x, th, fF.x)); }
    if (lineOn) {                                                    // bord extérieur + une ligne par marche
      c = mix(c, select(U.pal[0].rgb, U.strokeCol.rgb, fillOn), lineCov(F.x, th, sw, fF.x));
      if (gap > 1e-4) {
        for (var k = 1; k < 24; k++) {
          let t = th + f32(k) * gap;
          if (t > rampTop + 1e-4) { break; }
          let tk = clamp(f32(k) * gap / span, 0., 1.) * f32(nPal - 1);
          c = mix(c, select(U.pal[min(i32(floor(tk + .5)), nPal - 1)].rgb, U.strokeCol.rgb, fillOn), lineCov(F.x, t, sw, fF.x));
        }
      }
    }
  } else {
    let lc = F.rgb / max(F.a, 1e-5);
    if (fillOn) { c = mix(c, lc, cover(F.a, th, fF.a)); }
    if (lineOn) { c = mix(c, select(lc, U.strokeCol.rgb, fillOn), lineCov(F.a, th, sw, fF.a)); }
  }
  return vec4f(c, 1.);
}`;
