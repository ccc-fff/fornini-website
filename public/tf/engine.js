// Moteur WebGPU de Text Fusion — indépendant du panneau et du stockage.
// Cycle de vie : const e = new Engine(canvas); if (!(await e.init())) → repli statique ; e.setParams(P, effet) ;
// e.start() / e.stop() ; e.dispose(). Le moteur s'arrête seul quand la page est cachée ou le canvas hors de l'écran.
// Taille : celle du canvas dans la page (son conteneur), pas celle de la fenêtre.

import { qualOf, modeOf, hex, layerFix, reachPx, pxOf } from './params.js';
import { layoutText, buildAtlas, binGlyphs, toHalf, padNeeded } from './layout.js';
import * as SH from './gpu/shaders.js';

const NGRP = 3;            // 3 groupes × 4 canaux = 12 places, 10 couches au plus
const PALMAX = 10;
const TILE = 32;           // côté d'une tuile (px CSS)
const F16 = 'rgba16float';
const PASS_KINDS = ['sim', 'forme', 'flou', 'douceur', 'rendu'];

export class Engine {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.opts = opts;                    // { fixedTime, onStats(stats), onHist(hist, probe) }
    this.P = null;
    this.mouse = { x: .5, y: .5, on: 0 };
    this.running = false; this.visible = true; this.paused = false;
    this.simT = 0; this.cur = 0; this.last = 0;
    this.stats = { fps: 0, nG: 0, buildMs: 0, size: 0, gpu: null, cells: 0, maxPerTile: 0 };
    this.wantHist = false;
    this._frame = this._frame.bind(this);
  }

  // ── Initialisation : false si WebGPU est absent (le site affiche alors un repli statique) ──
  async init() {
    if (!navigator.gpu) return false;
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) return false;
    this.timing = adapter.features.has('timestamp-query');
    const device = await adapter.requestDevice({ requiredFeatures: this.timing ? ['timestamp-query'] : [] });
    this.device = device;
    device.lost.then((info) => { if (this.disposed) return; console.warn('GPU perdu :', info.message); this.stop(); this._lost = true; this.opts.onLost?.(info); });
    this.ctx = this.canvas.getContext('webgpu');
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.ctx.configure({ device, format: this.format, alphaMode: 'opaque' });
    this.smp = device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
    const mod = (code, label) => device.createShaderModule({ code, label });
    const pipe = (code, label, targets) => device.createRenderPipeline({ label, layout: 'auto',
      vertex: { module: mod(code, label), entryPoint: 'vs' }, fragment: { module: mod(code, label), entryPoint: 'fs', targets }, primitive: { topology: 'triangle-list' } });
    device.pushErrorScope('validation');
    this.pl = {
      sim: pipe(SH.SIM, 'sim', [{ format: F16 }, { format: F16 }, { format: F16 }]),
      shape: pipe(SH.SHAPE, 'shape', [{ format: F16 }]),
      blur: pipe(SH.BLUR, 'blur', [{ format: F16 }]),
      mask: pipe(SH.MASK, 'mask', [{ format: F16 }]),
      base: pipe(SH.BASE, 'base', [{ format: 'r8unorm' }]),
      show: pipe(SH.SHOW, 'show', [{ format: this.format }]),
    };
    const err = await device.popErrorScope();
    if (err) throw new Error('Shaders : ' + err.message);
    // tampons de valeurs (uniformes), un par emplacement de passe : plusieurs passes d'une même image ont des valeurs différentes
    const ub = (n) => device.createBuffer({ size: n * 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.u = {
      sim: [0, 1, 2].map(() => ub(44)), shape: [0, 1, 2].map(() => ub(56)),
      blurH: [0, 1, 2].map(() => ub(12)), blurV: [0, 1, 2].map(() => ub(12)),
      softH: [0, 1, 2].map(() => ub(12)), softV: [0, 1, 2].map(() => ub(12)),
      base: ub(8), show: ub(124),
    };
    this.uData = { sim: new Float32Array(44), shape: new Float32Array(56), blur: new Float32Array(12), base: new Float32Array(8), show: new Float32Array(124) };
    if (this.timing) {
      this.qMax = 64;
      this.qs = device.createQuerySet({ type: 'timestamp', count: this.qMax });
      this.qResolve = device.createBuffer({ size: this.qMax * 8, usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC });
      this.qRead = device.createBuffer({ size: this.qMax * 8, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
      this.qBusy = false; this.gpuAcc = null; this.gpuN = 0;
    }
    this.layoutCtx = document.createElement('canvas').getContext('2d');
    this._io = new IntersectionObserver((es) => { this.visible = es[es.length - 1].isIntersecting; this._wake(); });
    this._io.observe(this.canvas);
    this._vis = () => this._wake(); document.addEventListener('visibilitychange', this._vis);
    return true;
  }

  // ── Réglages : P complet + l'effet déclaré par le schéma ──
  setParams(P, effect) {
    const first = !this.P;
    this.P = P;
    if (first || effect === 'quality') { this._sized = null; this._needLayout = true; }
    else if (effect === 'layout') this._needLayout = true;
    else if (effect === 'reach') { if (!this.built || padNeeded(P, this.built.size) > this.built.pad) this._needLayout = true; else this._needBins = true; }
  }

  setMouse(x, y, on) { this.mouse.x = x; this.mouse.y = y; this.mouse.on = on; }
  start() { this.running = true; this._wake(); }
  stop() { this.running = false; }
  _wake() { if (this.running && !this._raf && this._active()) { this.last = performance.now(); this._raf = requestAnimationFrame(this._frame); } }
  _active() { return this.running && this.visible && !document.hidden && !this._lost && !this.disposed; }

  // ── Dimensions : canvas = taille de son conteneur × densité de pixels (plafonnée à 2) × qualité ──
  _size() {
    const r = this.canvas.getBoundingClientRect(), q = qualOf(this.P);
    const vw = Math.max(1, r.width), vh = Math.max(1, r.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * q.quality;
    return { vw, vh, cw: Math.max(1, Math.round(vw * dpr)), ch: Math.max(1, Math.round(vh * dpr)), fw: Math.max(8, Math.ceil(vw / q.fieldDiv)), fh: Math.max(8, Math.ceil(vh / q.fieldDiv)),
      sw: Math.max(8, Math.round(vw / q.simDiv)), sh: Math.max(8, Math.round(vh / q.simDiv)), key: '' };
  }
  _tex(w, h, format, usage) { return this.device.createTexture({ size: [w, h], format, usage }); }
  _alloc(s) {
    const d = this.device, U = GPUTextureUsage;
    this._destroyTextures();
    this.canvas.width = s.cw; this.canvas.height = s.ch;
    const rt = U.RENDER_ATTACHMENT | U.TEXTURE_BINDING;
    // grilles d'intensité, par groupe : mémoire de la souris (aller-retour), intensité, bruit brut
    this.mem = []; this.inten = []; this.raw = [];
    for (let g = 0; g < NGRP; g++) {
      this.mem.push([this._tex(s.sw, s.sh, F16, rt), this._tex(s.sw, s.sh, F16, rt)]);
      this.inten.push(this._tex(s.sw, s.sh, F16, rt)); this.raw.push(this._tex(s.sw, s.sh, F16, rt | U.COPY_SRC));
    }
    // grilles de forme : 2 temporaires, puis champ final et douceur de chaque groupe
    this.tmp = [this._tex(s.fw, s.fh, F16, rt), this._tex(s.fw, s.fh, F16, rt)];
    this.field = [0, 1, 2].map(() => this._tex(s.fw, s.fh, F16, rt));
    this.soft = [0, 1, 2].map(() => this._tex(s.fw, s.fh, F16, rt));
    this.baseTex = this._tex(s.cw, s.ch, 'r8unorm', rt);
    this.views = new Map();
    // efface les mémoires (une texture neuve est déjà à zéro en WebGPU) ; histogramme : tampon de relecture
    const bpr = Math.ceil(s.sw * 8 / 256) * 256;
    this.histBuf = d.createBuffer({ size: bpr * s.sh * NGRP, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    this.histBpr = bpr; this.histBusy = false;
    this._sized = s; this._bg = null; this._needBase = true;
  }
  _destroyTextures() {
    const all = [...(this.mem || []).flat(), ...(this.inten || []), ...(this.raw || []), ...(this.tmp || []), ...(this.field || []), ...(this.soft || []), this.baseTex];
    for (const t of all) t?.destroy();
    this.histBuf?.destroy(); this.histBuf = null;
  }
  _v(t) { let v = this.views.get(t); if (!v) { v = t.createView(); this.views.set(t, v); } return v; }

  // ── Mise en page + cartes de distances + tuiles (après un changement de texte, de taille, de marge) ──
  async _layout() {
    if (this._building) { this._again = true; return; }
    this._building = true; this._needLayout = false;
    try {
      const t0 = performance.now(), P = this.P, s = this._sized;
      const txt = P.upper ? P.text.toUpperCase() : P.text;
      const font = `${Math.round(P.wght)} 100px "${P.font}"`;
      try { await document.fonts.load(font, txt); } catch (e) {}
      if (!document.fonts.check(font, txt)) this.opts.onNote?.('⚠ font “' + P.font + '” not found');
      const lay = layoutText(P, s.vw, s.vh, this.layoutCtx);
      const at = buildAtlas(lay.glyphs, lay.font, P, this.device.limits.maxTextureDimension2D, lay.size);
      if (at.reduced) this.opts.onNote?.(`letter precision reduced to ${at.S.toFixed(2)} to fit in memory`);
      const d = this.device;
      this.atlasTex?.destroy();
      this.atlasTex = d.createTexture({ size: [at.AW, at.AH], format: 'r16float', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
      d.queue.writeTexture({ texture: this.atlasTex }, toHalf(at.atlas), { bytesPerRow: at.AW * 2 }, [at.AW, at.AH]);
      this.gdataBuf?.destroy();
      this.gdataBuf = d.createBuffer({ size: at.gdata.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
      d.queue.writeBuffer(this.gdataBuf, 0, at.gdata);
      this.glyphs = lay.glyphs;
      this.built = { pad: at.pad, nG: at.nG, size: lay.size, box: lay.box, layoutKey: this._sizeKey(s) };
      this.opts.onLayout?.(this.built);
      this.stats.nG = at.nG; this.stats.cells = at.nCells; this.stats.size = lay.size;
      this._bins(); this._needBase = true;
      this.stats.buildMs = Math.round(performance.now() - t0);
    } catch (e) { this.opts.onError?.(e); }
    this._building = false;
    if (this._again) { this._again = false; this._layout(); }
  }
  _sizeKey(s) { return s.vw + 'x' + s.vh; }
  // tuiles : portée = gonflement le plus fort + 2 cases de grille (au-delà, une lettre ne compte plus)
  _bins() {
    const s = this._sized, P = this.P, d = this.device;
    const reach = Math.max(0, reachPx(P, this.built.size) + 2 * qualOf(P).fieldDiv + 1 - this.built.pad);
    const b = binGlyphs(this.glyphs, s.vw, s.vh, TILE, reach);
    for (const k of ['rangeBuf', 'idxBuf']) this[k]?.destroy();
    this.rangeBuf = d.createBuffer({ size: b.ranges.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    this.idxBuf = d.createBuffer({ size: b.idx.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    d.queue.writeBuffer(this.rangeBuf, 0, b.ranges); d.queue.writeBuffer(this.idxBuf, 0, b.idx);
    this.tiles = b; this.stats.maxPerTile = b.maxPer;
    this._needBins = false; this._bg = null;
  }

  // ── Groupes de liaison (textures + tampons) : refaits seulement quand les ressources changent ──
  _bindGroups() {
    const d = this.device, L = (p) => p.getBindGroupLayout(0), E = (i, r) => ({ binding: i, resource: r });
    const buf = (b) => ({ buffer: b });
    const bg = { sim: [], shape: [], blurH: [], blurV: [], softM: [], softH: [], softV: [] };
    for (let g = 0; g < NGRP; g++) {
      bg.sim.push([0, 1].map(k => d.createBindGroup({ layout: L(this.pl.sim), entries: [E(0, buf(this.u.sim[g])), E(1, this._v(this.mem[g][k]))] })));
      bg.shape.push(d.createBindGroup({ layout: L(this.pl.shape), entries: [E(0, buf(this.u.shape[g])), E(1, this.smp), E(2, this._v(this.inten[g])), E(3, this._v(this.atlasTex)), E(4, buf(this.gdataBuf)), E(5, buf(this.rangeBuf)), E(6, buf(this.idxBuf))] }));
      bg.blurH.push(d.createBindGroup({ layout: L(this.pl.blur), entries: [E(0, buf(this.u.blurH[g])), E(1, this.smp), E(2, this._v(this.tmp[0])), E(3, this._v(this.inten[g]))] }));
      bg.blurV.push(d.createBindGroup({ layout: L(this.pl.blur), entries: [E(0, buf(this.u.blurV[g])), E(1, this.smp), E(2, this._v(this.tmp[1])), E(3, this._v(this.inten[g]))] }));
      bg.softM.push(d.createBindGroup({ layout: L(this.pl.mask), entries: [E(0, this.smp), E(1, this._v(this.field[g]))] }));
      bg.softH.push(d.createBindGroup({ layout: L(this.pl.blur), entries: [E(0, buf(this.u.softH[g])), E(1, this.smp), E(2, this._v(this.tmp[0])), E(3, this._v(this.inten[g]))] }));
      bg.softV.push(d.createBindGroup({ layout: L(this.pl.blur), entries: [E(0, buf(this.u.softV[g])), E(1, this.smp), E(2, this._v(this.tmp[1])), E(3, this._v(this.inten[g]))] }));
    }
    bg.base = d.createBindGroup({ layout: L(this.pl.base), entries: [E(0, buf(this.u.base)), E(1, this.smp), E(2, this._v(this.atlasTex)), E(3, buf(this.gdataBuf)), E(4, buf(this.rangeBuf)), E(5, buf(this.idxBuf))] });
    bg.show = [0, 1].map(k => d.createBindGroup({ layout: L(this.pl.show), entries: [E(0, buf(this.u.show)), E(1, this.smp),
      E(2, this._v(this.field[0])), E(3, this._v(this.field[1])), E(4, this._v(this.field[2])),
      E(5, this._v(this.soft[0])), E(6, this._v(this.soft[1])), E(7, this._v(this.soft[2])),
      E(8, this._v(this.inten[0])), E(9, this._v(this.raw[0])), E(10, this._v(this.mem[0][k])), E(11, this._v(this.baseTex))] }));
    this._bg = bg;
  }

  // ── Une image ──
  _frame(now) {
    this._raf = 0;
    if (!this._active()) return;
    this._raf = requestAnimationFrame(this._frame);
    this.render(now);
  }

  // Calcule et affiche une image (appelé par la boucle, ou directement par le banc de mesure)
  render(now) {
    const P = this.P; if (!P) return;
    const rawDt = (now - this.last) / 1000; this.last = now;
    const dt = this.opts.fixedTime != null ? 1 / 60 : Math.min(.05, Math.max(0, rawDt));
    this._fpsAcc = (this._fpsAcc || 0) + rawDt; this._fpsN = (this._fpsN || 0) + 1;
    if (this._fpsAcc > .5) { this.stats.fps = this._fpsN / this._fpsAcc; this._fpsAcc = 0; this._fpsN = 0; this.opts.onStats?.(this.stats); }

    const s = this._size(), old = this._sized;
    if (!old || old.cw !== s.cw || old.ch !== s.ch || old.fw !== s.fw || old.sw !== s.sw || old.sh !== s.sh || old.fh !== s.fh) { this._alloc(s); if (!old || old.vw !== s.vw || old.vh !== s.vh) this._needLayout = true; }
    if (this._needLayout) this._layout();
    if (!this.atlasTex || this._building && !this.gdataBuf) return;
    if (this._needBins && !this._building) this._bins();
    if (!this._bg) this._bindGroups();

    const d = this.device, q = qualOf(P), m = modeOf(P), cols = P.pals[m.k] || m.def, px = (v) => pxOf(v, this.built.size);   // % du corps → px
    const nPal = Math.min(PALMAX, cols.length), nL = m.k === 'couches' ? nPal : 1, G = Math.max(1, Math.ceil(nL / 4)), mi = ['couches', 'niveaux', 'lettres'].indexOf(m.k);
    const multi = m.k === 'couches';
    const layers = Array.from({ length: 12 }, (_, i) => layerFix(P.layers[i]));
    const pal = new Float32Array(PALMAX * 4); cols.slice(0, PALMAX).forEach((c, k) => pal.set(hex(c), k * 4));
    const sz = this._sized, enc = d.createCommandEncoder();
    let qi = 0; const marks = [];
    const pass = (kind, view, bg, pipeline, extraTargets) => {
      const tw = this.timing && qi + 2 <= this.qMax ? { querySet: this.qs, beginningOfPassWriteIndex: qi, endOfPassWriteIndex: qi + 1 } : undefined;
      if (tw) { marks.push(kind); qi += 2; }
      const targets = [{ view, loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 0] }, ...(extraTargets || [])];
      const pe = enc.beginRenderPass({ colorAttachments: targets, timestampWrites: tw });
      pe.setPipeline(pipeline); pe.setBindGroup(0, bg); pe.draw(3); pe.end();
    };

    // 1. intensité (le temps n'avance pas en pause ; temps imposé pour les tests)
    if (!this.paused) {
      this.simT = this.opts.fixedTime != null ? this.opts.fixedTime : this.simT + dt;
      const nxt = 1 - this.cur, u = this.uData.sim, mo = this.mouse;
      u.set([this.simT, dt, sz.vw / sz.vh, nL, P.mUp, P.mDown, +P.mEase || 0, P.mAmt, P.mRad, P.mSoft, mo.on, 0, mo.x, mo.y, multi ? 1 : 0, P.ecart,
        P.nScale, P.nSpeed, P.nLac, P.nGain, P.nWarp, P.nJit, P.nOct, +P.nType, P.nDriftX, P.nDriftY, P.nNoir, P.nBlanc, P.variation, 0, 0, 0]);
      for (let i = 0; i < 12; i++) u[32 + i] = !multi || layers[i].mouse ? 1 : 0;
      for (let g = 0; g < G; g++) {
        u[11] = g; d.queue.writeBuffer(this.u.sim[g], 0, u);
        const t = [{ view: this._v(this.inten[g]), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 0] }, { view: this._v(this.raw[g]), loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 0] }];
        pass('sim', this._v(this.mem[g][nxt]), this._bg.sim[g][this.cur], this.pl.sim, t);
      }
      this.cur = nxt;
    }

    // 2-3. forme puis flou, par groupe de 4 couches ; 3 bis. douceur des couches
    for (let g = 0; g < G; g++) {
      const u = this.uData.shape;
      u.set([this.built.nG, mi, nPal, q.fieldDiv, px(P.rMax), P.gr, P.alpha, 0.02, 0.02, sz.vw, sz.vh, TILE, this.tiles.tx, this.tiles.ty, 0, 0]);
      u.set(pal, 16); d.queue.writeBuffer(this.u.shape[g], 0, u);
      pass('forme', this._v(this.tmp[0]), this._bg.shape[g], this.pl.shape);
      const b = this.uData.blur;
      b.set([1 / sz.fw, 0, 0.5, px(P.s1), P.gs, q.fieldDiv, mi === 0 ? 0 : 1, 0, 0, 0, 0, 0]); d.queue.writeBuffer(this.u.blurH[g], 0, b);
      b[0] = 0; b[1] = 1 / sz.fh; d.queue.writeBuffer(this.u.blurV[g], 0, b);
      pass('flou', this._v(this.tmp[1]), this._bg.blurH[g], this.pl.blur);
      pass('flou', this._v(this.field[g]), this._bg.blurV[g], this.pl.blur);
      const soft4 = [0, 1, 2, 3].map(c => mi === 0 ? px(layers[g * 4 + c].soft || 0) : 0);
      if (soft4.some(v => v > 0.25)) {
        pass('douceur', this._v(this.tmp[0]), this._bg.softM[g], this.pl.mask);
        b.set([1 / sz.fw, 0, 0.5, px(P.s1), P.gs, q.fieldDiv, 0, 1, ...soft4.map(v => Math.max(v, 0.01) / 2.4 / q.fieldDiv)]);
        d.queue.writeBuffer(this.u.softH[g], 0, b);
        b[0] = 0; b[1] = 1 / sz.fh; d.queue.writeBuffer(this.u.softV[g], 0, b);
        pass('douceur', this._v(this.tmp[1]), this._bg.softH[g], this.pl.blur);
        pass('douceur', this._v(this.soft[g]), this._bg.softV[g], this.pl.blur);
      }
    }

    // typo de base : seulement après un changement de texte, de taille ou de qualité
    if (this._needBase) {
      this.uData.base.set([sz.vw, sz.vh, TILE, this.tiles.tx, this.tiles.ty, sz.cw / sz.vw, 0, 0]);
      d.queue.writeBuffer(this.u.base, 0, this.uData.base);
      pass('rendu', this._v(this.baseTex), this._bg.base, this.pl.base);
      this._needBase = false;
    }

    // 4. rendu à l'écran
    const u = this.uData.show, mo = this.mouse;
    u.fill(0);
    u.set([P.showInk === false ? 0 : 1, mi, nL, nPal, 0.5, P.gap, P.rampTop, P.sharp, sz.cw / sz.vw, +P.showN || 0, P.showM ? 1 : 0, P.cOn ? 1 : 0, P.aplat ? 1 : 0, px(P.strokePx), sz.vw, sz.vh, P.nNoir, P.nBlanc, 0, 0,
      mo.x * sz.vw, mo.y * sz.vh, mo.on ? P.mRad * sz.vh : 0, 0]);
    u.set([...hex(P.bg), 0, ...hex(P.ink), 0, ...hex(P.strokeCol), 0], 24);
    u.set(pal, 36);
    layers.forEach((l, i) => { u[76 + i] = l.fill ? 1 : 0; u[88 + i] = l.line ? 1 : 0; u[100 + i] = px(l.lw); u[112 + i] = px(l.soft || 0); });
    d.queue.writeBuffer(this.u.show, 0, u);
    pass('rendu', this.ctx.getCurrentTexture().createView(), this._bg.show[this.cur], this.pl.show);

    // relectures (histogramme, chronométrage) : seulement si quelqu'un les demande, sans bloquer l'image
    const wantHist = this.wantHist && !this.histBusy && !this.paused && now - (this._lastHist || 0) > 250;
    if (wantHist) {
      for (let g = 0; g < G; g++) enc.copyTextureToBuffer({ texture: this.raw[g] }, { buffer: this.histBuf, offset: g * this.histBpr * sz.sh, bytesPerRow: this.histBpr }, [sz.sw, sz.sh]);
    }
    const timeIt = this.timing && qi && !this.qBusy;
    if (timeIt) { enc.resolveQuerySet(this.qs, 0, qi, this.qResolve, 0); enc.copyBufferToBuffer(this.qResolve, 0, this.qRead, 0, qi * 8); }
    d.queue.submit([enc.finish()]);
    if (wantHist) this._readHist(G, nL, sz);
    if (timeIt) this._readTimes(marks.slice(), qi);
  }

  async _readTimes(marks, n) {
    this.qBusy = true;
    try {
      await this.qRead.mapAsync(GPUMapMode.READ, 0, n * 8);
      const t = new BigInt64Array(this.qRead.getMappedRange(0, n * 8).slice(0)); this.qRead.unmap();
      const acc = this.gpuAcc || (this.gpuAcc = Object.fromEntries(PASS_KINDS.map(k => [k, 0])));
      marks.forEach((k, i) => { acc[k] += Number(t[i * 2 + 1] - t[i * 2]) / 1e6; });
      if (++this.gpuN >= 30) {      // moyenne sur 30 images, en ms
        this.stats.gpu = Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, v / this.gpuN]));
        this.stats.gpu.total = Object.values(this.stats.gpu).reduce((a, b) => a + b, 0);
        this.gpuAcc = null; this.gpuN = 0;
      }
    } catch (e) {}
    this.qBusy = false;
  }

  async _readHist(G, nL, sz) {
    this.histBusy = true; this._lastHist = performance.now();
    try {
      await this.histBuf.mapAsync(GPUMapMode.READ);
      const data = new Uint16Array(this.histBuf.getMappedRange().slice(0)); this.histBuf.unmap();
      const NB = 56, hist = [], N = sz.sw * sz.sh, stride = Math.max(1, Math.floor(N / 8000));
      for (let g = 0; g < G; g++) for (let c = 0; c < 4 && g * 4 + c < nL; c++) {
        const hc = new Float32Array(NB), base = g * this.histBpr * sz.sh / 2;
        for (let i = 0; i < N; i += stride) {
          const x = i % sz.sw, y = (i / sz.sw) | 0, v = half(data[base + y * this.histBpr / 2 + x * 4 + c]);
          hc[Math.min(NB - 1, Math.max(0, Math.floor(v * NB)))]++;
        }
        hist.push(hc);
      }
      this.opts.onHist?.(hist);
    } catch (e) {}
    this.histBusy = false;
  }

  // remet la mémoire de la souris et le temps à zéro (tests, changement de preset)
  reset() { this.simT = 0; this._sized = null; }

  dispose() {
    this.disposed = true; this.stop();
    if (this._raf) cancelAnimationFrame(this._raf);
    this._io?.disconnect(); document.removeEventListener('visibilitychange', this._vis);
    this._destroyTextures();
    for (const b of [this.atlasTex, this.gdataBuf, this.rangeBuf, this.idxBuf, this.qResolve, this.qRead]) b?.destroy();
    this.qs?.destroy();
    for (const v of Object.values(this.u || {})) (Array.isArray(v) ? v : [v]).forEach(b => b.destroy());
    this.device?.destroy();
  }
}

function half(h) {
  const s = h & 0x8000 ? -1 : 1, e = (h >> 10) & 0x1f, f = h & 0x3ff;
  if (e === 0) return s * f * 2 ** -24;
  if (e === 31) return f ? NaN : s * Infinity;
  return s * (1 + f / 1024) * 2 ** (e - 15);
}
