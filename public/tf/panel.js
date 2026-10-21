// Panneau de réglages — généré depuis le schéma (params.js), composants de la maquette imago.
// Ne connaît pas le moteur : il modifie l'état et annonce l'effet ; l'application relaie au moteur.
//   createPanel(host, app) — app = { P, setP(P), changed(effect), note(msg), save() }

import { SPEC, MODES, evalPredicate, layerFix, LAYER_DEF, modeOf, load } from './params.js';

const STORE_PRESETS = 'text-fusion-presets', STORE_UI = 'text-fusion-ui', STORE_HIDDEN = 'text-fusion-hidden', STORE_CURRENT = 'text-fusion-current';
const OPEN = ['Copies', 'Shape', 'Noise'];      // groupes ouverts au départ
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const decimals = (step) => { const s = String(step); return s.includes('.') ? s.split('.')[1].length : 0; };
const icon = (name, title, fn, disabled) => { const b = h('button', 'ic ic-' + name); b.title = title || ''; if (disabled) b.setAttribute('disabled', ''); if (fn) b.onclick = (e) => { e.stopPropagation(); fn(); }; return b; };
const readJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch (e) { return d; } };
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

// Curseur pastille : la piste entière se tire, le repère vertical règle finement (Maj = encore plus fin), la valeur se tape.
function fSlider({ label, min, max, step, get, set, strict }) {
  const dec = decimals(step), el = h('div', 'f f-slider');
  const fill = h('div', 'fill'), lab = h('span', 'lab', esc(label)), tick = h('span', 'tick'), val = h('input', 'val');
  tick.title = 'Drag: fine adjust (Shift: finer)';
  el.append(fill, lab, tick, val);
  const show = () => { const v = +get(); fill.style.width = (Math.max(0, Math.min(1, (v - min) / (max - min))) * 100) + '%'; if (document.activeElement !== val) val.value = v.toFixed(dec); };
  const put = (v) => {
    const lo = strict ? min : (min < 0 ? min * 4 : Math.min(min, 0)), hi = strict ? max : max * 4;
    v = Math.min(hi, Math.max(lo, v)); if (step >= 1) v = Math.round(v);
    set(v); show();
  };
  el.addEventListener('pointerdown', (e) => {
    if (e.target === val || e.target === tick) return;
    e.preventDefault(); window.getSelection()?.removeAllRanges();
    el.setPointerCapture(e.pointerId);
    const r = el.getBoundingClientRect(), at = (x) => { let v = min + (x - r.left) / r.width * (max - min); v = Math.round(v / step) * step; put(Math.min(max, Math.max(min, v))); };
    at(e.clientX);
    const mv = (ev) => at(ev.clientX), up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up);
  });
  tick.addEventListener('pointerdown', (e) => {
    e.stopPropagation(); e.preventDefault(); window.getSelection()?.removeAllRanges(); tick.setPointerCapture(e.pointerId);
    const x0 = e.clientX, v0 = +get(), span = max - min;
    const mv = (ev) => put(v0 + (ev.clientX - x0) / 600 * span * (ev.shiftKey ? .1 : 1) * .25);
    const up = () => { tick.removeEventListener('pointermove', mv); tick.removeEventListener('pointerup', up); };
    tick.addEventListener('pointermove', mv); tick.addEventListener('pointerup', up);
  });
  val.addEventListener('change', () => { const v = parseFloat(val.value.replace(',', '.')); if (!isNaN(v)) put(v); show(); });
  val.addEventListener('keydown', (e) => { if (e.key === 'Enter') val.blur(); });
  val.addEventListener('blur', show);
  show();
  return el;
}
function fDropdown({ label, options, get, set }) {
  const el = h('div', 'f'), lab = h('span', 'lab', esc(label)), dd = h('span', 'dd'), txt = h('span'), sel = h('select');
  sel.innerHTML = options.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('');
  const show = () => { sel.value = String(get()); const o = options.find(([v]) => String(v) === String(get())); txt.textContent = o ? o[1] : ''; };
  sel.addEventListener('change', () => { const o = options.find(([v]) => String(v) === sel.value); set(o ? o[0] : sel.value); show(); });
  dd.append(txt, h('span', 'ic ic-down'), sel); el.append(lab, dd); show();
  return el;
}
function fToggle({ label, get, set }) {
  const el = h('div', 'f f-tog'), tog = h('span', 'tog');
  el.append(h('span', 'lab', esc(label)), tog);
  const show = () => tog.classList.toggle('on', !!get());
  el.onclick = () => { set(!get()); show(); }; show();
  return el;
}
function fSwatch({ label, get, set }) {
  const el = h('div', 'f f-swatch'), bar = h('span', 'bar'), inp = h('input'); inp.type = 'color';
  bar.appendChild(inp); el.append(h('span', 'lab', esc(label)), bar);
  const show = () => { bar.style.background = get(); inp.value = get(); };
  inp.addEventListener('input', () => { set(inp.value); show(); }); show();
  return el;
}
function fText({ get, set, multiline }) {
  const el = h('div', 'f f-txt'), inp = h(multiline ? 'textarea' : 'input');
  inp.value = get(); inp.addEventListener('input', () => set(inp.value)); el.appendChild(inp);
  return el;
}
function fSection(label, collapsedNow, onToggle) {
  const el = h('div', 'f sec'), lab = h('span', 'lab', esc(label)), box = h('span', 'icbox');
  const chev = h('span', 'ic ' + (collapsedNow ? 'ic-right' : 'ic-down')); box.appendChild(chev);
  el.append(lab, box);
  el.onclick = () => { const c = onToggle(); chev.className = 'ic ' + (c ? 'ic-right' : 'ic-down'); };
  return el;
}

const EASE = [(x) => x, (x) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2, (x) => 1 - Math.pow(1 - x, 3), (x) => x < .5 ? 16 * Math.pow(x, 5) : 1 - Math.pow(-2 * x + 2, 5) / 2];

export function createPanel(host, app) {
  const showers = [];
  let collapsed = readJSON(STORE_UI, {});
  let hist = [];
  const P = () => app.P;

  function section(card, name, defCollapsed) {
    const blk = h('div', 'blk'), body = h('div', 'body');
    const isCol = name in collapsed ? collapsed[name] : defCollapsed;
    if (isCol) blk.classList.add('collapsed');
    blk.append(fSection(name, isCol, () => { blk.classList.toggle('collapsed'); collapsed[name] = blk.classList.contains('collapsed'); writeJSON(STORE_UI, collapsed); app.changed(null); return collapsed[name]; }), body);
    card.appendChild(blk);
    return body;
  }

  function build() {
    host.innerHTML = ''; showers.length = 0;
    // titre « Playground » : ouvre et ferme le panneau (fermé = la seule pastille du titre)
    const ttl = h('div', 'ttl', '<span class="act"></span><span class="ttype">Playground</span>');
    ttl.title = 'Open / close (H)';
    ttl.onclick = () => { host.classList.toggle('hidden'); app.changed(null); };
    const card = h('div', 'card');
    host.append(ttl, card);
    buildPresets(section(card, 'Presets', true));
    const bodies = {};
    for (const s of SPEC) {
      const body = bodies[s.g] || (bodies[s.g] = section(card, s.g, !OPEN.includes(s.g)));
      let el;
      if (s.t === 'mode') el = buildModes();
      else if (s.t === 'curves') el = h('div', '', '<svg class="plot" data-plot="curves" viewBox="0 0 280 110" preserveAspectRatio="none" style="height:90px"></svg>');
      else if (s.t === 'ease') el = h('div', '', '<svg class="plot" data-plot="ease" viewBox="0 0 280 100"></svg>');
      else if (s.t === 'hist') el = h('div', '', '<svg class="plot" data-plot="hist" viewBox="0 0 280 84" preserveAspectRatio="none" style="height:70px"></svg>');
      else if (s.t === 'note') el = h('p', 'note', esc(s.text));
      else if (s.t === 'fontfile') {
        el = h('div', 'btnrow', '<label class="btn">Load a font…<input type="file" accept=".ttf,.otf,.woff,.woff2"></label>');
        el.querySelector('input').addEventListener('change', async (e) => {
          const f = e.target.files[0]; if (!f) return;
          try { const name = 'User-' + f.name.replace(/\W+/g, ''); const face = new FontFace(name, await f.arrayBuffer()); await face.load(); document.fonts.add(face); P().font = name; app.save(); build(); app.changed('layout'); }
          catch (err) { app.note('Unreadable font: ' + err.message); }
        });
      } else el = buildRow(s);
      if (s.visibleWhen) showers.push([el, s.visibleWhen]);
      body.appendChild(el);
    }
    refresh();
  }

  function refresh() { for (const [el, p] of showers) el.style.display = evalPredicate(p, P()) ? '' : 'none'; drawCurves(); drawEase(); drawHist(); }

  function buildRow(s) {
    const get = () => P()[s.k], set = (v) => { P()[s.k] = v; app.save(); refresh(); app.changed(s.effect || null); };
    if (s.t === 'textarea' || s.t === 'text') {
      const wrap = h('div', 'body'); wrap.style.gap = '4px';
      if (s.t === 'text') wrap.appendChild(h('div', 'f', `<span class="lab">${esc(s.label)}</span>`));
      wrap.appendChild(fText({ get, set, multiline: s.t === 'textarea' }));
      return wrap;
    }
    if (s.t === 'check') return fToggle({ label: s.label, get, set });
    if (s.t === 'select') return fDropdown({ label: s.label, options: s.options, get, set: (v) => set(+v) });
    if (s.t === 'color') return fSwatch({ label: s.label, get, set });
    return fSlider({ label: s.label, min: s.min, max: s.max, step: s.step, get, set, strict: !!s.effect || s.step >= 1 });
  }

  function buildModes() {
    const wrap = h('div', 'body'), note = h('p', 'note', ''), pal = h('div', 'body');
    wrap.append(fDropdown({ label: 'Mode', options: MODES.map(m => [m.k, m.label]), get: () => P().mode, set: (v) => { P().mode = v; app.save(); renderPalette(); refresh(); app.changed(null); } }), note, pal);
    const renderPalette = () => {
      const p = P(), m = modeOf(p);
      note.textContent = m.note;
      let cols = p.pals[m.k];
      if (!Array.isArray(cols) || cols.length < m.min) cols = p.pals[m.k] = m.def.slice();
      const lay = m.k === 'couches';
      if (lay) { while (p.layers.length < cols.length) p.layers.push(layerFix({})); }
      const L = p.layers;
      pal.innerHTML = '';
      const commit = () => { app.save(); renderPalette(); app.changed(null); };
      const sw2 = (a, i, j) => { [a[i], a[j]] = [a[j], a[i]]; };
      const head = h('div', 'f', '<span class="lab" style="text-transform:uppercase">Palette</span>'), box = h('span', 'icbox');
      box.append(icon('plus', 'Add a colour', () => {
        cols.push(cols[cols.length - 1]);
        if (lay) L.splice(cols.length - 1, 0, layerFix(Object.assign({}, L[cols.length - 2] || LAYER_DEF()[0], { mouse: false })));
        commit();
      }, cols.length >= m.max));
      head.appendChild(box); pal.appendChild(head);
      cols.forEach((c, k) => {
        const row = h('div', 'f f-col'), bar = h('span', 'bar'), inp = h('input'); inp.type = 'color'; inp.value = c;
        bar.style.background = c; bar.appendChild(inp);
        inp.addEventListener('input', () => { cols[k] = inp.value; bar.style.background = inp.value; app.save(); app.changed(null); });
        const ib = h('span', 'icbox');
        ib.append(
          icon('up', 'Move up', () => { sw2(cols, k - 1, k); if (lay) sw2(L, k - 1, k); commit(); }, k === 0),
          icon('down', 'Move down', () => { sw2(cols, k + 1, k); if (lay) sw2(L, k + 1, k); commit(); }, k === cols.length - 1),
          icon('delete', 'Delete', () => { cols.splice(k, 1); if (lay) L.splice(k, 1); commit(); }, cols.length <= m.min));
        row.append(bar, ib); pal.appendChild(row);
        if (!lay) return;
        const ls = L[k] = layerFix(L[k]), sub = h('div', 'lay'), ch = () => { app.save(); app.changed(null); };
        sub.append(
          fSlider({ label: 'Softness %', min: 0, max: 80, step: 0.1, get: () => ls.soft, set: (v) => { ls.soft = v; ch(); } }),
          fToggle({ label: 'Fill', get: () => ls.fill, set: (v) => { ls.fill = v; ch(); } }),
          fToggle({ label: 'Outline', get: () => ls.line, set: (v) => { ls.line = v; ch(); } }),
          fSlider({ label: 'Width %', min: 0.2, max: 25, step: 0.05, get: () => ls.lw, set: (v) => { ls.lw = v; ch(); } }),
          fToggle({ label: 'Mouse', get: () => ls.mouse, set: (v) => { ls.mouse = v; ch(); } }));
        pal.appendChild(sub);
      });
      // (pas de bouton « Palette par défaut » : absent de la maquette du 08/10 ; « Défaut » des préréglages remet tout)
    };
    renderPalette();
    return wrap;
  }

  // Préréglages : enregistrés dans ce navigateur, exportables / importables en JSON
  // Préréglages (accord FF 09/10, gestes d'imago) :
  // - liste déroulante (item/menus d'imago) : clic = charger ; croix au survol = supprimer, avec « Undo » ;
  // - le champ Name prend le nom du preset chargé ;
  // - Save = enregistre sous le nom du champ ; si ce nom existe, une copie « nom 2 » (jamais d'écrasement silencieux) ;
  // - Update = réenregistre sous le nom chargé (grisé sans preset chargé) ;
  // - Import / Export / Reset (tous les réglages à leur valeur de départ).
  // Presets du projet (presets/*.json) : un Update les remplace dans CE navigateur ; une suppression les masque.
  function buildPresets(body) {
    const local = readJSON(STORE_PRESETS, {}), hidden = new Set(readJSON(STORE_HIDDEN, []));
    const files = app.filePresets || {};
    const all = () => { const o = {}; for (const n of Object.keys(files)) if (!hidden.has(n)) o[n] = files[n]; return Object.assign(o, local); };
    const persist = () => { writeJSON(STORE_PRESETS, local); writeJSON(STORE_HIDDEN, [...hidden]); };
    const setCurrent = (n) => { app.current = n; try { n ? localStorage.setItem(STORE_CURRENT, n) : localStorage.removeItem(STORE_CURRENT); } catch (e) {} };
    const use = (o, name) => { setCurrent(name || null); app.setP(load(JSON.parse(JSON.stringify(o)))); app.save(); build(); app.changed('quality'); };
    const uniq = (n) => { const ex = all(); if (!(n in ex)) return n; let k = 2; const root = n.replace(/ \d+$/, ''); while (`${root} ${k}` in ex) k++; return `${root} ${k}`; };
    const cur = app.current && app.current in all() ? app.current : null;

    // liste
    const row = h('div', 'f'), dd = h('span', 'dd'), txt = h('span'), list = h('div', 'plist');
    row.append(h('span', 'lab', 'Preset'), dd); dd.append(txt, h('span', 'ic ic-down'));
    txt.textContent = cur || '—'; if (!cur) txt.style.color = 'var(--nodes)';
    dd.onclick = () => { list.classList.toggle('open'); };
    const names = Object.keys(all()).sort((a, b) => a.localeCompare(b));
    if (!names.length) list.appendChild(h('div', 'pempty', 'No preset yet'));
    for (const n of names) {
      const it = h('div', 'pitem' + (n === cur ? ' cur' : '')), lab = h('span', '', esc(n)), x = icon('delete', 'Delete', () => del(n));
      it.append(lab, x); it.onclick = () => { use(all()[n], n); app.note('Preset “' + n + '” loaded.'); };
      list.appendChild(it);
    }
    // suppression annulable
    const undo = h('div', 'btnrow undo'); undo.style.display = 'none';
    const del = (n) => {
      const before = { local: n in local ? local[n] : undefined, hidden: hidden.has(n) };
      if (n in local) delete local[n]; else hidden.add(n);
      if (n in files && !(n in local) && !hidden.has(n)) hidden.add(n);
      persist(); if (app.current === n) setCurrent(null);
      app.undoPreset = () => { if (before.local !== undefined) local[n] = before.local; if (!before.hidden) hidden.delete(n); persist(); build(); app.note('Preset “' + n + '” restored.'); };
      app.undoLabel = n; app.undoUntil = performance.now() + 8000;
      app.note('Preset “' + n + '” deleted.');
      build();
    };
    if (app.undoPreset && performance.now() < app.undoUntil) {
      undo.style.display = '';
      const b = h('button', 'btn', 'Undo delete “' + esc(app.undoLabel) + '”'); b.onclick = () => { const f = app.undoPreset; app.undoPreset = null; f(); };
      undo.appendChild(b);
      setTimeout(() => { if (performance.now() >= app.undoUntil) undo.style.display = 'none'; }, app.undoUntil - performance.now() + 50);
    }
    // nom + Save / Update
    const nameF = fText({ get: () => cur || '', set: () => {} }); nameF.querySelector('input').placeholder = 'Name';
    const btns = h('div', 'btnrow'), saveB = h('button', 'btn', 'Save'), updB = h('button', 'btn', 'Update');
    updB.disabled = !cur; updB.title = cur ? 'Overwrite “' + cur + '”' : 'Load a preset first';
    saveB.onclick = () => {
      const typed = nameF.querySelector('input').value.trim(); if (!typed) { app.note('Name the preset first.'); return; }
      const n = uniq(typed); local[n] = JSON.parse(JSON.stringify(P())); persist(); setCurrent(n); build();
      app.note(n === typed ? 'Preset “' + n + '” saved.' : '“' + typed + '” exists: saved as “' + n + '”.');
    };
    updB.onclick = () => { if (!cur) return; local[cur] = JSON.parse(JSON.stringify(P())); hidden.delete(cur); persist(); build(); app.note('Preset “' + cur + '” updated.'); };
    btns.append(saveB, updB);
    // Import / Export / Reset
    const io = h('div', 'btnrow', '<label class="btn">Import<input type="file" accept=".json,application/json"></label><button class="btn" data-a="exp">Export</button><button class="btn" data-a="reset" title="All settings back to their starting values">Reset</button>');
    io.querySelector('[data-a=exp]').onclick = () => {
      const blob = new Blob([JSON.stringify({ current: P(), presets: all() }, null, 1)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'text-fusion-presets.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    io.querySelector('input').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try { const o = JSON.parse(await f.text()); if (o.presets) { Object.assign(local, o.presets); persist(); } use(o.current || o, null); app.note('Settings imported.'); }
      catch (err) { app.note('Unreadable file.'); }
    };
    io.querySelector('[data-a=reset]').onclick = () => use(null, null);
    body.append(row, list, nameF, btns, io, undo);
  }

  const plot = (k) => host.querySelector(`[data-plot=${k}]`);
  function drawCurves() {
    const el = plot('curves'), p = P(); if (!el) return;
    const S0 = 0.5, s1 = Math.max(p.s1, S0), top = Math.max(p.rMax, s1, 1), X = (I) => 26 + I * 246, Y = (v) => 92 - v / top * 80;
    const path = (f) => Array.from({ length: 41 }, (_, k) => { const I = k / 40; return `${k ? 'L' : 'M'}${X(I).toFixed(1)},${Y(f(I)).toFixed(1)}`; }).join('');
    el.innerHTML = `<line x1="26" y1="92" x2="274" y2="92" stroke="#282828"/><line x1="26" y1="10" x2="26" y2="92" stroke="#282828"/>
      <path d="${path(I => p.rMax * Math.pow(I, p.gr))}" fill="none" stroke="#c3c3cd" stroke-width="1.6"/>
      <path d="${path(I => S0 + (s1 - S0) * Math.pow(I, p.gs))}" fill="none" stroke="#79efff" stroke-width="1.6"/>
      <text x="32" y="18" style="fill:#c3c3cd">— inflate</text><text x="32" y="29" style="fill:#79efff">— blur</text>
      <text x="22" y="14" text-anchor="end">${top.toFixed(0)}</text><text x="26" y="104" text-anchor="middle">I 0</text><text x="272" y="104" text-anchor="middle">1</text>`;
  }
  function drawEase() {
    const el = plot('ease'), p = P(); if (!el) return;
    const e = EASE[+p.mEase] || EASE[0], up = Math.max(p.mUp, .001), dn = Math.max(p.mDown, .001), hold = .6, tot = up + hold + dn;
    const X = (t) => 20 + t / tot * 250, Y = (v) => 84 - v * 70, pts = [];
    for (let i = 0; i <= 120; i++) { const t = i / 120 * tot, lin = t < up ? t / up : t < up + hold ? 1 : 1 - (t - up - hold) / dn; pts.push(`${X(t).toFixed(1)},${Y(e(Math.max(0, lin))).toFixed(1)}`); }
    el.innerHTML = `<line x1="20" y1="84" x2="272" y2="84" stroke="#282828"/><line x1="${X(up + hold)}" y1="10" x2="${X(up + hold)}" y2="84" stroke="#282828" stroke-dasharray="3 3"/>
      <polyline points="${pts.join(' ')}" fill="none" stroke="#79efff" stroke-width="1.6"/>
      <text x="${X(up / 2)}" y="96" text-anchor="middle">rise</text><text x="${X(up + hold + dn / 2)}" y="96" text-anchor="middle">fall</text>
      <text x="${X(up + hold) + 4}" y="20">cursor leaves</text>`;
  }
  function drawHist() {
    const el = plot('hist'), p = P(); if (!el || !hist.length) return;
    const m = modeOf(p), cols = p.pals[m.k] || m.def, multi = m.k === 'couches';
    const X = (v) => 10 + v * 260, Y0 = 64, H = 54, NB = hist[0].length;
    let out = `<line x1="10" y1="${Y0}" x2="270" y2="${Y0}" stroke="#282828"/>`;
    hist.forEach((hc, c) => {
      const mx = Math.max(1, ...hc);
      const d = Array.from(hc, (v, i) => `${i ? 'L' : 'M'}${X((i + .5) / NB).toFixed(1)},${(Y0 - v / mx * H).toFixed(1)}`).join('');
      out += `<path d="${d}" fill="none" stroke="${multi ? cols[c] : '#8e8e8e'}" stroke-width="1.2" opacity="${multi ? .9 : 1}"/>`;
    });
    out += `<path d="M${X(0)},${Y0} L${X(p.nNoir)},${Y0} L${X(Math.max(p.nBlanc, p.nNoir + 1e-3))},${Y0 - H} L${X(1)},${Y0 - H}" fill="none" stroke="#79efff" stroke-width="1" stroke-dasharray="3 2"/>`;
    out += `<text x="10" y="80">0</text><text x="270" y="80" text-anchor="end">1</text><text x="140" y="80" text-anchor="middle">noise value · dashed: levels</text>`;
    el.innerHTML = out;
  }

  build();
  return {
    refresh,
    rebuild: build,
    setHist(hs) { hist = hs; drawHist(); },
    // l'histogramme n'est utile que si le panneau est ouvert et le groupe Bruit déplié
    histVisible() { const el = plot('hist'); return !!el && !host.classList.contains('hidden') && el.offsetParent !== null; },
  };
}
