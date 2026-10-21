// Text Fusion sur fornini.com — variante de text-fusion/src/app.js pour le site :
// - à chaque chargement, un préréglage du projet (presets/) tiré au hasard ; les réglages du visiteur ne sont pas rechargés ;
// - un clic sur la phrase charge un autre préréglage ;
// - panneau « Playground » fermé au départ, pas de compteur à l'écran.
// Le reste (engine, layout, params, panel, gpu, ui, fonts, presets) est recopié par scripts/sync-text-fusion.sh.
import { load } from './params.js';
import { Engine } from './engine.js';
import { createPanel } from './panel.js';

const STORE = 'text-fusion-v3';
const $ = (id) => document.getElementById(id);
const canvas = $('view'), panelEl = $('panel'), fallback = $('tf-fallback');

// préréglages du projet : presets/index.json liste les noms, un fichier par préréglage
let filePresets = {};
try {
  const names = await (await fetch('/tf/presets/index.json', { cache: 'no-store' })).json();
  filePresets = Object.fromEntries(await Promise.all(names.map(async n => [n, await (await fetch(`/tf/presets/${encodeURIComponent(n)}.json`, { cache: 'no-store' })).json()])));
} catch (e) { console.warn('presets du projet illisibles', e); }
const names = Object.keys(filePresets);
// tirage au hasard, jamais le préréglage en cours quand il y a le choix
const pick = (not) => { const pool = names.length > 1 ? names.filter(n => n !== not) : names; return pool[Math.floor(Math.random() * pool.length)] || null; };

let current = pick(null);
let P = load(current ? JSON.parse(JSON.stringify(filePresets[current])) : null);
const app = {
  get P() { return P; },
  current, filePresets,
  setP(n) { P = n; },
  save() { try { localStorage.setItem(STORE, JSON.stringify(P)); } catch (e) {} },
  // l'histogramme du bruit n'est calculé que s'il est visible (panneau ouvert, groupe Noise déplié)
  changed(effect) { engine.setParams(P, effect); engine.wantHist = panel.histVisible(); },
  note() {},
};
try { localStorage.setItem('text-fusion-current', current || ''); } catch (e) {}

const engine = new Engine(canvas, { onError: (e) => console.error(e), onHist: (hs) => panel.setHist(hs) });
panelEl.classList.add('hidden');
const panel = createPanel(panelEl, app);
window.TF = { engine, app, get P() { return P; } };      // accès pour les tests

// la phrase : l'enveloppe de ses lettres (coordonnées de la page), un peu élargie
const textHit = (x, y) => {
  const g = engine.glyphs; if (!g || !g.length) return false;
  const m = (engine.built?.size || 0) * 0.15;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const { box: b } of g) { x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]); }
  return x >= x0 - m && x <= x1 + m && y >= y0 - m && y <= y1 + m;
};
function next() {
  const n = pick(app.current); if (!n || n === app.current) return;
  app.current = n; try { localStorage.setItem('text-fusion-current', n); } catch (e) {}
  P = load(JSON.parse(JSON.stringify(filePresets[n])));
  panel.rebuild(); app.changed('quality');
}

const local = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, r]; };
canvas.addEventListener('pointermove', (e) => {
  const [x, y, r] = local(e); engine.setMouse(x / r.width, y / r.height, 1);
  canvas.classList.toggle('over-text', names.length > 1 && textHit(x, y));
});
let down = null;
canvas.addEventListener('pointerdown', (e) => { const [x, y, r] = local(e); down = [x, y]; engine.setMouse(x / r.width, y / r.height, 1); });
canvas.addEventListener('pointerup', (e) => {     // un clic, pas un glissé
  const [x, y] = local(e); if (down && Math.hypot(x - down[0], y - down[1]) < 8 && textHit(x, y)) next(); down = null;
});
canvas.addEventListener('pointerleave', () => { engine.mouse.on = 0; });
window.addEventListener('keydown', (e) => {
  if (['TEXTAREA', 'INPUT', 'SELECT'].includes(e.target.tagName)) return;
  if (e.key === 'h' || e.key === 'H') { panelEl.classList.toggle('hidden'); app.changed(null); }
});
let rz = 0; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => engine.setParams(P, 'layout'), 100); });

try {
  if (await engine.init()) { engine.setParams(P, 'quality'); engine.start(); }
  else throw new Error('WebGPU unavailable');
} catch (e) {   // repli : la phrase en clair, sans animation ni panneau
  console.warn(e);
  canvas.style.display = 'none'; panelEl.style.display = 'none';
  fallback.textContent = P.upper ? P.text.toUpperCase() : P.text;
  fallback.style.display = 'flex';
}
