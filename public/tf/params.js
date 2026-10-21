// Réglages de Text Fusion — schéma unique, sur le modèle du descripteur d'imago (src/nodedesc.ts) :
// un réglage = un enregistrement de données ; nom stable (sert à l'enregistrement et au partage) ;
// bornes dures (min/max) ; affichage contextuel déclaratif (`visibleWhen`, prédicat de DONNÉES, pas une fonction).
// Les groupes suivent le modèle FF : texte → copies → forme → bruit → souris → qualité.
//
// effect : ce qu'un changement déclenche dans le moteur.
//   'layout'  = refaire la mise en page et les cartes de distances (texte, police, corps…)
//   'reach'   = la portée du gonflement a pu grandir (marge des lettres, tuiles)
//   'quality' = réallouer les grilles (qualité)
//   absent    = instantané (valeurs envoyées au GPU à l'image suivante)

export const MODES = [
  { k: 'couches', label: 'Layers', min: 1, max: 10, def: ['#0a5cf0', '#f0471a', '#2e9e44'], note: 'One layer per colour, each with its own intensity. Up to 10; beyond 4, then 8, the computation doubles, then triples.' },
  { k: 'niveaux', label: 'Levels', min: 1, max: 10, def: ['#f4a6c8', '#ffe14d', '#7ed37a', '#5aa9ff'], note: 'The field sliced by height. Top: the height over which the palette spreads. Step: terraces of that height (0 = continuous ramp). Sharpness: hard or soft change from one step to the next.' },
  { k: 'lettres', label: 'Letters', min: 1, max: 10, def: ['#0a5cf0', '#f0471a', '#2e9e44', '#f5c81e', '#e85a8c'], note: 'One colour per letter (looping), blended where letters meet.' },
];
export const NOISES = [[0, 'Value (smooth, simple)'], [1, 'Perlin'], [2, 'fBm'], [3, 'Ridged'], [4, 'Turbulence'], [5, 'Domain warp'], [6, 'Cellular'], [7, 'Curl (flow)'], [8, 'Marble'], [9, 'Gyroid']];
// Qualité : finesse du rendu (quality × densité de pixels), divisions des grilles de forme et d'intensité, texels par px des cartes de distances
export const QUALS = { 1: { quality: 0.6, fieldDiv: 3, simDiv: 6, sdf: 1 }, 2: { quality: 1, fieldDiv: 2, simDiv: 4, sdf: 1.5 }, 3: { quality: 1, fieldDiv: 1, simDiv: 2, sdf: 2 } };
export const qualOf = (P) => QUALS[P.qual] || QUALS[2];

const mode = (...m) => ({ param: 'mode', in: m });
const noise = (...t) => ({ param: 'nType', in: t });
const notCouches = { not: mode('couches') };

export const SPEC = [
  // 1. Le texte — intact, sous tout le reste
  { g: 'Text', k: 'text', t: 'textarea', def: 'PORTFOLIO\nON DEMAND', effect: 'layout', label: 'Phrase' },
  { g: 'Text', k: 'upper', t: 'check', def: true, effect: 'layout', label: 'Uppercase' },
  { g: 'Text', k: 'font', t: 'text', def: 'Inter', effect: 'layout', label: 'Font' },
  { g: 'Text', t: 'fontfile' },
  // Graisse : affichée seulement si la police en a plusieurs (variable ou famille à graisses) — _wghtVar est mesuré par l'application
  { g: 'Text', k: 'wght', min: 100, max: 900, step: 1, def: 300, effect: 'layout', label: 'Weight', visibleWhen: { param: '_wghtVar', ne: false } },
  // Taille : deux niveaux (décision FF 09/10) — une boîte en % de la page (largeur, hauteur, position du centre),
  // et le texte s'ajuste dedans : retour à la ligne entre les mots si la boîte est trop étroite, corps le plus grand qui tient.
  { g: 'Text', k: 'boxW', min: 5, max: 100, step: 0.5, def: 80, effect: 'layout', label: 'Box width %' },
  { g: 'Text', k: 'boxH', min: 5, max: 100, step: 0.5, def: 60, effect: 'layout', label: 'Box height %' },
  { g: 'Text', k: 'boxX', min: 0, max: 100, step: 0.5, def: 50, effect: 'layout', label: 'Box X %' },
  { g: 'Text', k: 'boxY', min: 0, max: 100, step: 0.5, def: 50, effect: 'layout', label: 'Box Y %' },
  { g: 'Text', k: 'showBox', t: 'check', def: false, label: 'Show box' },
  { g: 'Text', t: 'note', text: 'The text fits inside the box at any page size: it wraps between words when the box is too narrow, and grows until it meets an edge. Line breaks typed in the phrase are kept. Sizes below (inflate, blur, softness, widths, tracking) are % of the type size.' },
  { g: 'Text', k: 'lh', min: 0.2, max: 2, step: 0.01, def: 1.05, effect: 'layout', label: 'Line height' },
  { g: 'Text', k: 'ls', min: -30, max: 60, step: 0.1, def: 0, effect: 'layout', label: 'Tracking %' },
  // la typo d'origine, dessinée sous les copies : on peut la masquer pour ne garder que les copies
  { g: 'Text', k: 'showInk', t: 'check', def: true, label: 'Show text' },
  { g: 'Text', k: 'ink', t: 'color', def: '#1a1a1a', label: 'Colour', visibleWhen: { param: 'showInk', eq: true } },
  { g: 'Text', k: 'bg', t: 'color', def: '#f7f7f5', label: 'Background' },

  // 2. Les copies — ce qui se dessine par-dessus le texte
  { g: 'Copies', t: 'mode' },
  { g: 'Copies', k: 'rampTop', min: 0.6, max: 3, step: 0.01, def: 0.86, label: 'Top', visibleWhen: mode('niveaux') },
  { g: 'Copies', k: 'gap', min: 0, max: 0.5, step: 0.005, def: 0.12, label: 'Step', visibleWhen: mode('niveaux') },
  { g: 'Copies', k: 'sharp', min: 0, max: 1, step: 0.01, def: 1, label: 'Sharpness', visibleWhen: mode('niveaux') },
  { g: 'Copies', k: 'cOn', t: 'check', def: false, label: 'Outlines', visibleWhen: notCouches },
  { g: 'Copies', k: 'strokePx', min: 0.2, max: 15, step: 0.05, def: 1.25, label: 'Stroke width %', visibleWhen: { and: [{ param: 'cOn', eq: true }, notCouches] } },
  { g: 'Copies', k: 'strokeCol', t: 'color', def: '#1a1a1a', label: 'Stroke colour', visibleWhen: { and: [{ param: 'cOn', eq: true }, { param: 'aplat', eq: true }, notCouches] } },
  { g: 'Copies', k: 'aplat', t: 'check', def: true, label: 'Fill', visibleWhen: notCouches },

  // 3. La forme qu'on transforme — gonflement, flou et leur rencontre
  { g: 'Shape', t: 'curves' },
  { g: 'Shape', k: 'rMax', min: 0, max: 60, step: 0.1, def: 11.7, effect: 'reach', label: 'Inflate (%)' },
  { g: 'Shape', k: 'gr', min: 0.2, max: 4, step: 0.05, def: 1, effect: 'reach', label: 'Inflate curve' },
  { g: 'Shape', k: 's1', min: 0, max: 50, step: 0.1, def: 10, label: 'Blur (%)' },
  { g: 'Shape', k: 'gs', min: 0.2, max: 6, step: 0.05, def: 2.5, label: 'Blur curve' },
  { g: 'Shape', k: 'alpha', min: 0, max: 2, step: 0.01, def: 1, label: 'Fusion' },
  { g: 'Shape', t: 'note', text: 'The curves show how much the shape inflates and blurs with intensity. Fusion: 0 = copies join through blur alone; higher, overlaps stick together more.' },

  // 4. Le bruit qui meut la forme
  { g: 'Noise', k: 'showN', t: 'select', def: 0, label: 'View', options: [[0, 'None'], [1, 'Raw noise (grey)'], [2, 'Intensity (grey)']] },
  { g: 'Noise', t: 'hist' },
  { g: 'Noise', k: 'nNoir', min: 0, max: 1, step: 0.005, def: 0.5, label: 'Black point' },
  { g: 'Noise', k: 'nBlanc', min: 0, max: 1, step: 0.005, def: 0.68, label: 'White point' },
  { g: 'Noise', t: 'note', text: 'Levels: below the black point nothing moves; above the white point the shape inflates fully. The same levels apply to every layer.' },
  { g: 'Noise', k: 'nType', t: 'select', def: 2, label: 'Type', options: NOISES },
  { g: 'Noise', k: 'nScale', min: 0.2, max: 20, step: 0.1, def: 3, label: 'Scale' },
  { g: 'Noise', k: 'nOct', min: 1, max: 8, step: 1, def: 3, label: 'Octaves / steps', visibleWhen: noise(0, 2, 3, 4, 5, 7, 8) },
  { g: 'Noise', k: 'nLac', min: 1.2, max: 4, step: 0.01, def: 2, label: 'Lacunarity', visibleWhen: noise(2, 3, 4, 5) },
  { g: 'Noise', k: 'nGain', min: 0.1, max: 0.9, step: 0.01, def: 0.5, label: 'Gain', visibleWhen: noise(2, 3, 4) },
  { g: 'Noise', k: 'nWarp', min: 0, max: 4, step: 0.01, def: 1, label: 'Warp', visibleWhen: noise(5, 7, 8) },
  { g: 'Noise', k: 'nJit', min: 0, max: 1, step: 0.01, def: 0.8, label: 'Jitter', visibleWhen: noise(6) },
  { g: 'Noise', k: 'nSpeed', min: 0, max: 2, step: 0.01, def: 0.15, label: 'Speed' },
  { g: 'Noise', k: 'nDriftX', min: -1, max: 1, step: 0.01, def: 0.05, label: 'Drift X' },
  { g: 'Noise', k: 'nDriftY', min: -1, max: 1, step: 0.01, def: 0, label: 'Drift Y' },
  { g: 'Noise', k: 'ecart', min: 0, max: 2, step: 0.01, def: 0.3, label: 'Layer offset', visibleWhen: mode('couches') },
  { g: 'Noise', k: 'variation', min: 0, max: 1, step: 0.01, def: 0.5, label: 'Variation', visibleWhen: mode('couches') },

  // 5. La souris, qui ajoute de l'intensité
  { g: 'Mouse', k: 'showM', t: 'check', def: false, label: 'Show mouse' },
  { g: 'Mouse', t: 'note', text: 'In magenta, under the text and over the noise view: what the mouse leaves behind (its trail) and the circle of its radius. The mouse adds to the noise: under the cursor the shape inflates beyond what the noise does (blur stays capped). In Layers mode, only layers with Mouse on react.', visibleWhen: { param: 'showM', eq: true } },
  { g: 'Mouse', k: 'mAmt', min: 0, max: 3, step: 0.01, def: 1, effect: 'reach', label: 'Intensity' },
  { g: 'Mouse', k: 'mRad', min: 0.01, max: 1, step: 0.005, def: 0.12, label: 'Radius' },
  { g: 'Mouse', k: 'mSoft', min: 0.2, max: 6, step: 0.05, def: 1.5, label: 'Edge' },
  { g: 'Mouse', t: 'ease' },
  { g: 'Mouse', k: 'mUp', min: 0, max: 3, step: 0.01, def: 0.25, label: 'Rise (s)' },
  { g: 'Mouse', k: 'mDown', min: 0, max: 6, step: 0.01, def: 1.2, label: 'Fall (s)' },
  { g: 'Mouse', k: 'mEase', t: 'select', def: 1, label: 'Curve', options: [[0, 'Linear'], [1, 'Cubic'], [2, 'Ease out'], [3, 'Quintic']] },
  { g: 'Mouse', t: 'note', text: 'Under the cursor the shape inflates over Rise seconds, then settles back over Fall seconds once it moves away, following the curve (like an animated transition).' },

  // 6. Qualité — un seul choix pour la résolution et la finesse des calculs
  { g: 'Quality', k: 'qual', t: 'select', def: 2, effect: 'quality', label: 'Quality', options: [[1, 'Fast'], [2, 'Crisp'], [3, 'Max']] },
];

// Prédicat de visibilité (même grammaire qu'imago : param eq/ne/in/nin, and, or, not)
export function evalPredicate(p, P) {
  if (!p) return true;
  if (p.and) return p.and.every(q => evalPredicate(q, P));
  if (p.or) return p.or.some(q => evalPredicate(q, P));
  if (p.not) return !evalPredicate(p.not, P);
  const v = P[p.param];
  if ('eq' in p) return v === p.eq;
  if ('ne' in p) return v !== p.ne;
  if (p.in) return p.in.includes(typeof p.in[0] === 'number' ? +v : v);
  if (p.nin) return !p.nin.includes(typeof p.nin[0] === 'number' ? +v : v);
  return true;
}

// Réglages propres à chaque couche (mode Couches)
export const LAYER_FIELDS = { noir: 0.5, blanc: 0.68, soft: 0, mouse: false, fill: true, line: false, lw: 1.25 };   // soft, lw : % du corps
export const layerFix = (l) => Object.assign({}, LAYER_FIELDS, l);
export const LAYER_DEF = () => [0, 1, 2].map(k => layerFix({ mouse: k === 2 }));

export function defaults() {
  const o = {};
  for (const s of SPEC) if (s.k) o[s.k] = s.def;
  o.mode = 'couches';
  o.pals = Object.fromEntries(MODES.map(m => [m.k, m.def.slice()]));
  o.layers = LAYER_DEF();
  o.v = 2;
  return o;
}

// Charge un jeu de réglages enregistré : complète les clés manquantes, migre les anciennes,
// garde les palettes par défaut des modes absents (correctif : l'ancienne fusion écrasait d'abord d.pals).
export function load(o) {
  const d = defaults();
  const src = (o && typeof o === 'object') ? o : {};
  const P = Object.assign(d, src);
  P.pals = Object.assign(defaults().pals, (src.pals && typeof src.pals === 'object') ? src.pals : {});
  for (const k of ['bAmt', 'bN', 'bRad', 'bSpeed']) delete P[k];
  P.layers = (Array.isArray(src.layers) ? src.layers : d.layers).map(layerFix);
  if (P.mode === 'rampe') { P.mode = 'niveaux'; P.gap = 0; }      // Rampe réunie dans Niveaux (07/10) : écart 0 = rampe continue
  if (!MODES.some(m => m.k === P.mode)) P.mode = 'couches';
  // v2 (09/10) : tailles en px → % du corps ; la largeur de retour à la ligne devient la largeur de la boîte.
  // Conversion au corps où le preset a été réglé (src.size, 120 par défaut) : même rendu à ce corps-là.
  if (!(src.v >= 2)) {
    const k = 100 / (+src.size || 120);
    for (const key of ['rMax', 's1', 'strokePx', 'ls']) if (key in src) P[key] = +(src[key] * k).toFixed(3);
    P.layers = P.layers.map(l => Object.assign(l, { soft: +((src.layers ? l.soft : 0) * k).toFixed(3), lw: +((src.layers ? l.lw : 1.5) * k).toFixed(3) }));
    if ('boxW' in src) P.boxW = Math.max(src.boxW, 5);
    delete P.size; P.v = 2;
  }
  return P;
}

export const modeOf = (P) => MODES.find(m => m.k === P.mode) || MODES[0];
export const hex = (h) => [1, 3, 5].map(i => parseInt(String(h).slice(i, i + 2), 16) / 255);
// gonflement le plus fort possible (bruit 1 + souris) — sert à la marge des lettres et à la portée des tuiles
// valeurs exprimées en % du corps → px, une fois le corps connu (après la mise en page)
export const pxOf = (v, size) => v / 100 * size;
export const reachPx = (P, size) => pxOf(P.rMax, size) * Math.pow(1 + P.mAmt, P.gr);
