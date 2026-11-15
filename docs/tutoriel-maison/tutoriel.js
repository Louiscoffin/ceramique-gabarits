/* Gabarits Céramique — tutoriel 3D « maison lumineuse », dans l'outil, après achat.
   Même interface que les tutoriels du bol-tasse et de la théière (rail, cartes, barre mobile, FR / EN) ;
   les pièces de la maison sont des plaques PLATES percées (porte, fenêtres, fentes) : géométrie et rendu
   écrits pour elles. Toutes les cotes viennent de LA configuration achetée, par URL :
   ?l=90&p=70&h=70&r=38&d=8&e=6&sh=12&cuir=40  (largeur, profondeur, murs, toit, débord et plaque FINIS en mm,
   retrait total %, part du retrait faite au cuir %). Chaque cote est donnée à l'état où on la mesure : crue, cuir, cuite.
   Fichier assemblé par _dev/build.sh à partir de _dev/*.js : ne pas éditer ici. */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const arc = t => Math.sin(Math.PI * t);
/* Langue : ?lang=, sinon la préférence de l'atelier (même origine), sinon le navigateur.
   Le bouton FR / EN de la barre l'écrit dans l'atelier puis recharge : tout est recalculé dans la langue. */
const LANG = (() => {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'en' || q === 'fr') return q;
    const p = JSON.parse(localStorage.getItem('atelier-prefs') || '{}').lang;
    if (p === 'en' || p === 'fr') return p;
  } catch (e) {}
  return /^fr/i.test(navigator.language || 'fr') ? 'fr' : 'en';
})();
const tr = (fr, en) => LANG === 'en' ? en : fr;
const fmt = (x, d = 1) => x.toLocaleString(LANG === 'en' ? 'en-GB' : 'fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
const lerpV = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const hop = (a, b, t, h) => { const p = lerpV(a, b, t); p[1] += h * arc(t); return p; };

const DEG = Math.PI / 180;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FONT_MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
const FONT_TITRE = '"Bricolage Grotesque", "Helvetica Neue", Arial, sans-serif';
const FONT_TEXTE = 'Karla, "Helvetica Neue", Arial, sans-serif';

/* ─────────────── matrices et quaternions (colonne par colonne) ─────────────── */
const m4 = () => new Float32Array(16);
function mul(o, a, b) {
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++)
    o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
}
const mulN = (a, b) => mul(m4(), a, b);
const xf = (m, p) => [
  m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
  m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
  m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
];
function qAxis(x, y, z, a) {
  const l = Math.hypot(x, y, z), s = Math.sin(a / 2) / l;
  return [x * s, y * s, z * s, Math.cos(a / 2)];
}
function qMul(a, b) {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}
function slerp(a, b, t) {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3], s = 1;
  if (d < 0) { d = -d; s = -1; }
  let wa = 1 - t, wb = t * s;
  if (d < 0.9995) { const th = Math.acos(d), sn = Math.sin(th); wa = Math.sin((1 - t) * th) / sn; wb = Math.sin(t * th) / sn * s; }
  const q = [0, 1, 2, 3].map(i => a[i] * wa + b[i] * wb), l = Math.hypot(...q);
  return q.map(v => v / l);
}
function rigid(o, q, tx, ty, tz) {
  const [x, y, z, w] = q;
  o[0] = 1 - 2 * (y * y + z * z); o[1] = 2 * (x * y + w * z); o[2] = 2 * (x * z - w * y); o[3] = 0;
  o[4] = 2 * (x * y - w * z); o[5] = 1 - 2 * (x * x + z * z); o[6] = 2 * (y * z + w * x); o[7] = 0;
  o[8] = 2 * (x * z + w * y); o[9] = 2 * (y * z - w * x); o[10] = 1 - 2 * (x * x + y * y); o[11] = 0;
  o[12] = tx; o[13] = ty; o[14] = tz; o[15] = 1;
  return o;
}
// Pose qui amène le point local lc en c, orientation q
function place(o, q, cx, cy, cz, lc) {
  rigid(o, q, 0, 0, 0);
  o[12] = cx - (o[0] * lc[0] + o[4] * lc[1] + o[8] * lc[2]);
  o[13] = cy - (o[1] * lc[0] + o[5] * lc[1] + o[9] * lc[2]);
  o[14] = cz - (o[2] * lc[0] + o[6] * lc[1] + o[10] * lc[2]);
  return o;
}
// Même chose à partir d'une base (colonnes X, Y, Z)
function basis(o, X, Y, Z, c, lc) {
  o.set([X[0], X[1], X[2], 0, Y[0], Y[1], Y[2], 0, Z[0], Z[1], Z[2], 0, 0, 0, 0, 1]);
  o[12] = c[0] - (X[0] * lc[0] + Y[0] * lc[1] + Z[0] * lc[2]);
  o[13] = c[1] - (X[1] * lc[0] + Y[1] * lc[1] + Z[1] * lc[2]);
  o[14] = c[2] - (X[2] * lc[0] + Y[2] * lc[1] + Z[2] * lc[2]);
  return o;
}
function scaleCols(o, sx, sy, sz) {
  for (let i = 0; i < 3; i++) { o[i] *= sx; o[4 + i] *= sy; o[8 + i] *= sz; }
  return o;
}
function quatOf(m) {                              // orientation d'une matrice sans échelle
  const t = m[0] + m[5] + m[10];
  let q;
  if (t > 0) { const s = Math.sqrt(t + 1) * 2; q = [(m[6] - m[9]) / s, (m[8] - m[2]) / s, (m[1] - m[4]) / s, s / 4]; }
  else if (m[0] > m[5] && m[0] > m[10]) { const s = Math.sqrt(1 + m[0] - m[5] - m[10]) * 2; q = [s / 4, (m[4] + m[1]) / s, (m[8] + m[2]) / s, (m[6] - m[9]) / s]; }
  else if (m[5] > m[10]) { const s = Math.sqrt(1 + m[5] - m[0] - m[10]) * 2; q = [(m[4] + m[1]) / s, s / 4, (m[9] + m[6]) / s, (m[8] - m[2]) / s]; }
  else { const s = Math.sqrt(1 + m[10] - m[0] - m[5]) * 2; q = [(m[8] + m[2]) / s, (m[9] + m[6]) / s, s / 4, (m[1] - m[4]) / s]; }
  return q;
}
function perspective(o, fovy, asp, near, far, ox, oy) {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  o.fill(0);
  o[0] = f / asp; o[5] = f; o[10] = (far + near) * nf; o[11] = -1; o[14] = 2 * far * near * nf;
  o[8] = -ox; o[9] = -oy;               // décale le centre de l'image (NDC) sans déformer
  return o;
}
function lookAt(o, e, t) {               // haut = +y
  let zx = e[0] - t[0], zy = e[1] - t[1], zz = e[2] - t[2], l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
  let xx = zz, xz = -zx; l = Math.hypot(xx, xz) || 1; xx /= l; xz /= l;
  const yx = zy * xz, yy = zz * xx - zx * xz, yz = -zy * xx;
  o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0;
  o[4] = 0;  o[5] = yy; o[6] = zy; o[7] = 0;
  o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
  o[12] = -(xx * e[0] + xz * e[2]); o[13] = -(yx * e[0] + yy * e[1] + yz * e[2]); o[14] = -(zx * e[0] + zy * e[1] + zz * e[2]); o[15] = 1;
  return o;
}
/* géométrie des pièces plates : triangulation avec trous (oreilles + ponts), extrusion */
const polyArea = P => P.reduce((a, p, i) => { const q = P[(i + 1) % P.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;   // signée : > 0 = antihoraire (y vers le haut)

function inTri(a, b, c, p) {
  const s = (p1, p2, p3) => (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
  const d1 = s(p, a, b), d2 = s(p, b, c), d3 = s(p, c, a);
  const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}
const segX = (p1, p2, p3, p4) => {   // intersection stricte de deux segments
  const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
  if (Math.abs(d) < 1e-12) return false;
  const t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d;
  const u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d;
  return t > 1e-9 && t < 1 - 1e-9 && u > 1e-9 && u < 1 - 1e-9;
};

/* Fusionne les trous dans le contour par des ponts (le plus court sommet visible), puis découpe les oreilles.
   Renvoie { pts: [[x, y]…], tri: [i, j, k…] } ; pts contient les points (certains répétés par les ponts). */
function triangulate(outer, holes = []) {
  let O = polyArea(outer) < 0 ? outer.slice().reverse() : outer.slice();
  const H = holes.map(h => (polyArea(h) > 0 ? h.slice().reverse() : h.slice()));
  H.sort((a, b) => Math.max(...b.map(p => p[0])) - Math.max(...a.map(p => p[0])));
  for (const h of H) {
    let best = null;
    // on essaie les sommets du trou du plus à droite au plus à gauche ; le pont le plus court qui ne coupe rien
    const hs = h.map((p, i) => i).sort((i, j) => h[j][0] - h[i][0]);
    for (const hi of hs) {
      const cand = O.map((p, i) => ({ i, d: Math.hypot(p[0] - h[hi][0], p[1] - h[hi][1]) })).sort((a, b) => a.d - b.d);
      for (const c of cand) {
        const A = h[hi], B = O[c.i];
        let ok = true;
        for (let i = 0; i < O.length && ok; i++) { const p = O[i], q = O[(i + 1) % O.length]; if (i !== c.i && (i + 1) % O.length !== c.i && segX(A, B, p, q)) ok = false; }
        for (let i = 0; i < h.length && ok; i++) { const p = h[i], q = h[(i + 1) % h.length]; if (i !== hi && (i + 1) % h.length !== hi && segX(A, B, p, q)) ok = false; }
        // le pont doit partir vers l'intérieur du contour
        if (ok) { const m = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]; let c2 = false; for (let i = 0, j = O.length - 1; i < O.length; j = i++) { const a = O[i], b = O[j]; if ((a[1] > m[1]) !== (b[1] > m[1]) && m[0] < (b[0] - a[0]) * (m[1] - a[1]) / (b[1] - a[1]) + a[0]) c2 = !c2; } if (!c2) ok = false; }
        if (ok) { best = { hi, oi: c.i }; break; }
      }
      if (best) break;
    }
    if (!best) throw new Error('pont introuvable');
    const hh = h.slice(best.hi).concat(h.slice(0, best.hi));          // le trou, parcouru à partir du sommet du pont
    O = O.slice(0, best.oi + 1).concat(hh, [hh[0]], O.slice(best.oi));
  }
  // oreilles
  const n = O.length, idx = O.map((_, i) => i), tri = [];
  let guard = 0;
  const reflexOrOk = (a, b, c) => ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) > 1e-9;
  while (idx.length > 3 && guard++ < n * n) {
    let cut = false;
    for (let k = 0; k < idx.length; k++) {
      const ia = idx[(k + idx.length - 1) % idx.length], ib = idx[k], ic = idx[(k + 1) % idx.length];
      const a = O[ia], b = O[ib], c = O[ic];
      if (!reflexOrOk(a, b, c)) continue;
      let ear = true;
      for (const j of idx) { if (j === ia || j === ib || j === ic) continue; const p = O[j]; if ((p[0] === a[0] && p[1] === a[1]) || (p[0] === b[0] && p[1] === b[1]) || (p[0] === c[0] && p[1] === c[1])) continue; if (inTri(a, b, c, p)) { ear = false; break; } }
      if (ear) { tri.push(ia, ib, ic); idx.splice(k, 1); cut = true; break; }
    }
    if (!cut) { tri.push(idx[0], idx[1], idx[2]); idx.splice(1, 1); }   // dégénéré : on avance quand même
  }
  if (idx.length === 3) tri.push(idx[0], idx[1], idx[2]);
  return { pts: O, tri };
}

/* Plaque d'épaisseur T : dessus (z = T), dessous (z = 0), chants du contour et des trous.
   Repère : x, y du gabarit ; z = épaisseur. Renvoie des tableaux plats prêts pour WebGL. */
function extrude(outer, holes, T, opts = {}) {
  const pos = [], nor = [], uv = [], idx = [];
  const V = (x, y, z, nx, ny, nz) => { pos.push(x, y, z); nor.push(nx, ny, nz); uv.push(x, y); return pos.length / 3 - 1; };
  const { pts, tri } = triangulate(outer, holes);
  const top = pts.map(p => V(p[0], p[1], T, 0, 0, 1)), bot = pts.map(p => V(p[0], p[1], 0, 0, 0, -1));
  for (let i = 0; i < tri.length; i += 3) { idx.push(top[tri[i]], top[tri[i + 1]], top[tri[i + 2]]); idx.push(bot[tri[i]], bot[tri[i + 2]], bot[tri[i + 1]]); }
  const ring = (R, hole) => {
    const P = hole ? (polyArea(R) > 0 ? R.slice().reverse() : R) : (polyArea(R) < 0 ? R.slice().reverse() : R);
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      let nx = b[1] - a[1], ny = -(b[0] - a[0]); const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;   // normale extérieure d'un contour antihoraire
      if (hole) { /* trou horaire : la normale pointe déjà vers le vide */ }
      const i0 = V(a[0], a[1], 0, nx, ny, 0), i1 = V(b[0], b[1], 0, nx, ny, 0), i2 = V(b[0], b[1], T, nx, ny, 0), i3 = V(a[0], a[1], T, nx, ny, 0);
      idx.push(i0, i1, i2, i0, i2, i3);
    }
  };
  ring(outer, false); for (const h of holes) ring(h, true);
  return { pos: new Float32Array(pos), nor: new Float32Array(nor), uv: new Float32Array(uv), idx: new Uint16Array(idx) };
}

/* ─────────────── la maison et sa configuration ─────────────── */

const CFG = (() => {
  const q = new URLSearchParams(location.search);
  let clamped = false;   // une cote de l'atelier est sortie de la plage du tutoriel : on le signale à l'écran
  const num = (k, def, lo, hi) => { const v = parseFloat((q.get(k) || '').replace(',', '.')); if (!Number.isFinite(v)) return def; if (v < lo || v > hi) clamped = true; return clamp(v, lo, hi); };
  const cfg = { l: num('l', 90, 40, 160), p: num('p', 70, 40, 160), h: num('h', 70, 30, 160), r: num('r', 38, 10, 110), d: num('d', 8, 0, 30),
    e: num('e', 6, 3, 12), sh: num('sh', 12, 2, 25), cuir: num('cuir', 40, 0, 100) };
  // fp : feuilles A4 du PDF des gabarits, comptées par l'outil (absent : on reste général)
  cfg.sheets = q.has('fp') ? Math.round(num('fp', 2, 1, 8)) : null;
  cfg.clamped = clamped;
  return cfg;
})();
const SH = CFG.sh / 100, K = 1 / (1 - SH);               // retrait TOTAL : séchage + cuisson
const CR = 1 - CFG.cuir / 100 * SH;                        // taille au cuir / taille crue (convention de l'outil V2)
// tout est donné FINI par l'atelier ; les gabarits (et la terre fraîche) sont agrandis du retrait
const E = CFG.e * K, LW = CFG.l * K, PW = CFG.p * K, HW = CFG.h * K, RW = CFG.r * K, DW = CFG.d * K;
const HALF = LW / 2, HH = HW + RW;                          // demi-largeur ; hauteur du pignon (murs + toit)
const LWALL = Math.max(1, PW - 2 * E);                      // un mur latéral se pose ENTRE les deux pignons
const SL = Math.hypot(HALF, RW), ANG = Math.atan2(RW, HALF);   // pente du toit
const RWP = SL + DW, RHP = PW + 2 * DW;                    // un pan de toit : de la faîtière au bord, et sa longueur
const TANA = Math.tan(ANG);

// états : une cote crue, au cuir, cuite
const C = {
  crue:  { l: LW, p: PW, h: HW, r: RW, H: HH, e: E, d: DW },
  cuir:  { l: LW * CR, p: PW * CR, h: HW * CR, r: RW * CR, H: HH * CR, e: E * CR, d: DW * CR },
  cuite: { l: CFG.l, p: CFG.p, h: CFG.h, r: CFG.r, H: CFG.h + CFG.r, e: CFG.e, d: CFG.d },
};

/* ouvertures : mêmes dessins que l'outil (maisonCuts), en mm crus, repère du gabarit : x centré, y compté depuis le bas */
function archPts(cx, y0, w, hs) {
  const R = w / 2, a = [[cx - R, y0], [cx - R, y0 + hs]];
  for (let i = 1; i < 12; i++) { const t = Math.PI - Math.PI * i / 12; a.push([cx + R * Math.cos(t), y0 + hs + R * Math.sin(t)]); }
  a.push([cx + R, y0 + hs], [cx + R, y0]); return a;
}
const circPts = (cx, cy, r, n = 14) => Array.from({ length: n }, (_, i) => { const t = 2 * Math.PI * i / n; return [cx + r * Math.cos(t), cy + r * Math.sin(t)]; });
const rectPts = (cx, cy, w, h) => [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]];
const CUTS = (() => {
  const l = LW, h = HW, r = RW, e = E, lw = LWALL;
  const dw = l * .26, y0 = Math.max(e * 1.3, h * .08);
  const door = archPts(l * .17, y0, dw, h * .5 - dw / 2), s = l * .06, wr = l * .035, wx = -l * .22, wy = h * .64;
  const slW = Math.max(5, lw * .1), slH = h * .46, slY = h * .27;
  return {
    A: [door, ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(q => circPts(wx + q[0] * s, wy + q[1] * s, wr))],
    B: [rectPts(0, h * .52, l * .24, l * .24), circPts(0, h + r * .38, l * .065, 16)],
    C: [-.24, 0, .24].map(f => archPts(f * lw, slY, slW, slH - slW / 2)),
  };
})();
const PENT = [[-HALF, 0], [HALF, 0], [HALF, HH - RW], [0, HH], [-HALF, HH - RW]];
const WALL = [[-LWALL / 2, 0], [LWALL / 2, 0], [LWALL / 2, HW], [-LWALL / 2, HW]];
const ROOF = [[0, 0], [RWP, 0], [RWP, RHP], [0, RHP]];       // le patron d'un pan, à plat (x : pente, y : longueur)

// les six pièces : id, nom, contour, ouvertures, boîte englobante
const bboxOf = P => { const xs = P.map(p => p[0]), ys = P.map(p => p[1]); return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }; };
const PIECES = [
  { id: 'A', k: 'A', name: tr('Façade', 'Front'), out: PENT, cuts: CUTS.A },
  { id: 'B', k: 'B', name: tr('Pignon arrière', 'Back gable'), out: PENT, cuts: CUTS.B },
  { id: 'C', k: 'C', name: tr('Mur latéral', 'Side wall'), out: WALL, cuts: CUTS.C },
  { id: 'C', k: 'C', name: tr('Mur latéral', 'Side wall'), out: WALL, cuts: CUTS.C },
  { id: 'D', k: 'D', name: tr('Pan de toit', 'Roof panel'), out: ROOF, cuts: [] },
  { id: 'D', k: 'D', name: tr('Pan de toit', 'Roof panel'), out: ROOF, cuts: [] },
].map((p, i) => ({ ...p, i, bb: bboxOf(p.out) }));
for (const p of PIECES) { p.w = p.bb.x1 - p.bb.x0; p.h = p.bb.y1 - p.bb.y0; }

/* rangement par étagères : sur les feuilles A4 du PDF, puis sur la plaque */
function pack(items, maxW, maxH, gap, margin) {
  const order = items.map((p, i) => i).sort((a, b) => items[b].h - items[a].h);
  const out = new Array(items.length), sheets = [];
  let sheet = 0, x = margin, y = margin, rowH = 0;
  for (const i of order) {
    const it = items[i];
    if (x + it.w > maxW - margin + 1e-6 && x > margin) { x = margin; y += rowH + gap; rowH = 0; }
    if (maxH && y + it.h > maxH - margin + 1e-6 && y > margin) { sheet++; x = margin; y = margin; rowH = 0; }
    out[i] = { x, y, sheet };
    x += it.w + gap; rowH = Math.max(rowH, it.h);
    sheets[sheet] = Math.max(sheets[sheet] || 0, y + rowH + margin);
  }
  return { at: out, n: sheet + 1, h: sheets };
}
const SHEET_W = 210, SHEET_H = 297;
const PAPER = pack(PIECES, SHEET_W, SHEET_H, 7, 12);                  // sur les feuilles A4
const SLAB_PK = pack(PIECES, 318, 0, 8, 11);                           // sur la plaque : même rangement, un seul pan
const SLAB_W = 318, SLAB_D = SLAB_PK.h[0];
const nSheets = PAPER.n;

// aire de terre et poids de pâte (pièces × densité × chute, arrondi à 50 g)
const AREA = PIECES.reduce((a, p) => a + p.w * p.h * (p.k === 'A' || p.k === 'B' ? 0.82 : 1), 0);
const CLAY_G = Math.max(150, Math.round(SLAB_W * SLAB_D * E / 1000 * 1.9 / 50) * 50);

/* ─────────────── maillages ─────────────── */

// Un maillage : positions, normales, uv (mm, pour le grain), étiquette de face (0 dessus, 1 dessous, 2 chant), indices.
function mk(pos, nor, uv, tag, idx) { return { pos: new Float32Array(pos), nor: new Float32Array(nor), uv: new Float32Array(uv), tag: new Float32Array(tag), idx: new Uint16Array(idx), dirty: false }; }

// triangulation + extrusion d'une plaque (x, y du gabarit ; z = épaisseur de 0 à T)
function plateMesh(outer, holes, T) {
  const pos = [], nor = [], uv = [], tag = [], idx = [];
  const V = (x, y, z, nx, ny, nz, t) => { pos.push(x, y, z); nor.push(nx, ny, nz); uv.push(x, y); tag.push(t); return pos.length / 3 - 1; };
  const { pts, tri } = triangulate(outer, holes);
  const top = pts.map(p => V(p[0], p[1], T, 0, 0, 1, 0)), bot = pts.map(p => V(p[0], p[1], 0, 0, 0, -1, 1));
  for (let i = 0; i < tri.length; i += 3) { idx.push(top[tri[i]], top[tri[i + 1]], top[tri[i + 2]], bot[tri[i]], bot[tri[i + 2]], bot[tri[i + 1]]); }
  const ring = (R, hole) => {
    const P = hole ? (polyArea(R) > 0 ? R.slice().reverse() : R) : (polyArea(R) < 0 ? R.slice().reverse() : R);
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      let nx = b[1] - a[1], ny = -(b[0] - a[0]); const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const i0 = V(a[0], a[1], 0, nx, ny, 0, 2), i1 = V(b[0], b[1], 0, nx, ny, 0, 2), i2 = V(b[0], b[1], T, nx, ny, 0, 2), i3 = V(a[0], a[1], T, nx, ny, 0, 2);
      idx.push(i0, i1, i2, i0, i2, i3);
    }
  };
  ring(outer, false); for (const h of holes) ring(h, true);
  return mk(pos, nor, uv, tag, idx);
}

// prisme droit sur un profil convexe (x, y), extrudé de z = 0 à len : le pan de toit, biseau du faîtage compris
function prismMesh(prof, len) {
  const pos = [], nor = [], uv = [], tag = [], idx = [], P = prof.length;
  const V = (x, y, z, nx, ny, nz, t, u, v) => { pos.push(x, y, z); nor.push(nx, ny, nz); uv.push(u, v); tag.push(t); return pos.length / 3 - 1; };
  const ccw = polyArea(prof) > 0, Pp = ccw ? prof : prof.slice().reverse();
  const cx = Pp.reduce((a, p) => a + p[0], 0) / P, cy = Pp.reduce((a, p) => a + p[1], 0) / P;
  for (const [z, nz, t] of [[len, 1, 1], [0, -1, 1]]) {
    const c = V(cx, cy, z, 0, 0, nz, t, cx, cy), r = Pp.map(p => V(p[0], p[1], z, 0, 0, nz, t, p[0], p[1]));
    for (let i = 0; i < P; i++) idx.push(...(nz > 0 ? [c, r[i], r[(i + 1) % P]] : [c, r[(i + 1) % P], r[i]]));
  }
  for (let i = 0; i < P; i++) {
    const a = Pp[i], b = Pp[(i + 1) % P];
    let nx = b[1] - a[1], ny = -(b[0] - a[0]); const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const i0 = V(a[0], a[1], 0, nx, ny, 0, nx * 0 + (ny > 0.5 ? 0 : 2), a[0], 0), i1 = V(b[0], b[1], 0, nx, ny, 0, ny > 0.5 ? 0 : 2, b[0], 0),
      i2 = V(b[0], b[1], len, nx, ny, 0, ny > 0.5 ? 0 : 2, b[0], len), i3 = V(a[0], a[1], len, nx, ny, 0, ny > 0.5 ? 0 : 2, a[0], len);
    idx.push(i0, i1, i2, i0, i2, i3);
  }
  return mk(pos, nor, uv, tag, idx);
}
// ce pan de toit : profil (x : le long de la pente, y : épaisseur), biseau b ∈ [0, 1] sur la face du faîtage
const roofProfile = b => [[-E * TANA * (1 - b), 0], [RWP - E * TANA, 0], [RWP - E * TANA, E], [-E * TANA, E]];
const roofMesh = b => prismMesh(roofProfile(b), RHP);

function boxMesh(w, h, d) {
  const pos = [], nor = [], uv = [], tag = [], idx = [];
  const F = (o, u, v, n, t) => {   // une face : origine o, axes u et v (vecteurs complets), normale n
    const b = pos.length / 3;
    for (const [s, r] of [[0, 0], [1, 0], [1, 1], [0, 1]]) { pos.push(o[0] + u[0] * s + v[0] * r, o[1] + u[1] * s + v[1] * r, o[2] + u[2] * s + v[2] * r); nor.push(...n); uv.push(Math.hypot(...u) * s, Math.hypot(...v) * r); tag.push(t); }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  };
  F([0, h, 0], [w, 0, 0], [0, 0, d], [0, 1, 0], 0);
  F([0, 0, d], [w, 0, 0], [0, 0, -d], [0, -1, 0], 1);
  F([0, 0, d], [w, 0, 0], [0, h, 0], [0, 0, 1], 2);
  F([w, 0, 0], [-w, 0, 0], [0, h, 0], [0, 0, -1], 2);
  F([0, 0, 0], [0, 0, d], [0, h, 0], [-1, 0, 0], 2);
  F([w, 0, d], [0, 0, -d], [0, h, 0], [1, 0, 0], 2);
  return mk(pos, nor, uv, tag, idx);
}
// cylindre d'axe y, de 0 à h (r1 en bas, r2 en haut)
function cylMesh(r1, r2, h, n = 28) {
  const pos = [], nor = [], uv = [], tag = [], idx = [];
  const V = (x, y, z, nx, ny, nz, t, u, v) => { pos.push(x, y, z); nor.push(nx, ny, nz); uv.push(u, v); tag.push(t); return pos.length / 3 - 1; };
  const sl = (r1 - r2) / h, nl = Math.hypot(1, sl);
  for (let i = 0; i <= n; i++) { const t = i / n * Math.PI * 2, c = Math.cos(t), s = Math.sin(t); V(r1 * c, 0, r1 * s, c / nl, sl / nl, s / nl, 2, t * r1, 0); V(r2 * c, h, r2 * s, c / nl, sl / nl, s / nl, 2, t * r1, h); }
  for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 2, a + 3, a, a + 3, a + 1); }
  for (const [y, r, ny, t] of [[h, r2, 1, 0], [0, r1, -1, 1]]) {
    const c = V(0, y, 0, 0, ny, 0, t, 0, 0), b = pos.length / 3;
    for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2; V(r * Math.cos(a), y, r * Math.sin(a), 0, ny, 0, t, r * Math.cos(a), r * Math.sin(a)); }
    for (let i = 0; i < n; i++) idx.push(...(ny > 0 ? [c, b + i + 1, b + i] : [c, b + i, b + i + 1]));
  }
  return mk(pos, nor, uv, tag, idx);
}
// trait posé à plat (dans le plan x, z) : un ruban de largeur w qui suit une ligne ; 6 indices par segment, pour le tracer petit à petit
function ribbonMesh(pts, closed, w) {
  const pos = [], nor = [], uv = [], tag = [], idx = [], N = closed ? pts.length : pts.length - 1;
  let L = 0;
  for (let i = 0; i < N; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const nx = -dz * w / 2, nz = dx * w / 2, k = pos.length / 3;
    for (const [p, s] of [[a, 1], [a, -1], [b, -1], [b, 1]]) { pos.push(p[0] + nx * s, 0, p[1] + nz * s); nor.push(0, 1, 0); uv.push(L, 0); tag.push(0); }
    idx.push(k, k + 1, k + 2, k, k + 2, k + 3);
    L += l;
  }
  const m = mk(pos, nor, uv, tag, idx); m.segs = N; m.len = L; m.pts = pts; return m;
}

/* ─────────────── WebGL ─────────────── */

const VS = `
attribute vec3 aPos; attribute vec3 aNor; attribute vec2 aUV; attribute float aTag;
uniform mat4 uM, uVP; uniform mat3 uN;
varying vec3 vW, vN; varying vec2 vUV; varying float vT;
void main(){
  vec4 w = uM * vec4(aPos, 1.0);
  vW = w.xyz; vN = uN * aNor; vUV = aUV; vT = aTag;
  gl_Position = uVP * w;
}`;

// Papier, terre, outils : tout est calculé ici, à partir des coordonnées du gabarit (mm).
const FS = `
precision mediump float;
varying vec3 vW, vN; varying vec2 vUV; varying float vT;
uniform sampler2D uTex;
uniform float uMode, uCook, uSlip, uScore, uGloss, uGlow, uAlpha, uLine;
uniform vec3 uCol, uEye, uL;
float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hs(i), hs(i + vec2(1.0, 0.0)), f.x), mix(hs(i + vec2(0.0, 1.0)), hs(i + vec2(1.0, 1.0)), f.x), f.y); }
void main(){
  vec3 n = normalize(vN), v = normalize(uEye - vW);
  vec3 col = uCol; float gloss = uGloss, emis = 0.0;
  bool top = vT < 0.5, side = vT > 1.5;
  if (uMode < 0.5) {                                    // terre : humide, puis cuir
    float c1 = clamp(uCook, 0.0, 1.0);
    col = mix(vec3(0.665, 0.63, 0.575), vec3(0.79, 0.76, 0.70), c1) * (0.93 + 0.12 * vn(vUV / 11.0) + 0.05 * vn(vUV / 3.0));
    col = mix(col, vec3(0.3, 0.25, 0.21), step(0.972, hs(floor(vUV * 1.7))) * 0.5);
    gloss = 0.3 * (1.0 - c1);
    if (side) col *= 0.93;
    if (!top && !side) col *= 0.88;
    if (uScore > 0.0 && side) {                         // chants striés : hachures
      float h1 = smoothstep(0.38, 0.46, abs(fract((vW.x + vW.y + vW.z) / 1.8) - 0.5));
      col *= 1.0 - 0.4 * uScore * h1;
    }
    if (uSlip > 0.0) { col = mix(col, vec3(0.8, 0.77, 0.7), 0.6 * uSlip * (side ? 1.0 : 0.0)); gloss = max(gloss, 0.65 * uSlip * (side ? 1.0 : 0.0)); }
  } else if (uMode < 1.5) {                             // papier imprimé
    col = vec3(1.0, 0.996, 0.98) * (0.97 + 0.035 * hs(floor(vUV * 3.0)));
    if (top) col = texture2D(uTex, vUV).rgb * (0.97 + 0.03 * hs(floor(vUV * 600.0)));
    else col *= 0.93;
  } else if (uMode < 2.5) {                             // objets de l'atelier
    col = uCol * (0.96 + 0.05 * vn(vUV / 6.0));
  } else if (uMode < 3.5) {                             // lumière de la bougie : émissive
    col = uCol; emis = 1.0;
  } else if (uMode < 4.5) {                             // toile de jute
    col = vec3(0.885, 0.875, 0.815) * (0.97 + 0.035 * sin(vUV.x * 2.2) * sin(vUV.y * 2.2) + 0.04 * vn(vUV / 25.0));
  } else {                                              // tapis de coupe quadrillé
    gloss = 0.12;
    vec2 g = vUV; vec2 m10 = abs(mod(g + 5.0, 10.0) - 5.0), m50 = abs(mod(g + 25.0, 50.0) - 25.0);
    float l = max(0.55 * max(smoothstep(0.35, 0.1, m10.x), smoothstep(0.35, 0.1, m10.y)), max(smoothstep(0.6, 0.2, m50.x), smoothstep(0.6, 0.2, m50.y)));
    col = mix(uCol, vec3(0.6, 0.76, 0.68), 0.75 * l);
  }
  if (uLine > 0.5) { gl_FragColor = vec4(uCol, uAlpha); return; }
  float ndl = max(dot(n, uL), 0.0);
  vec3 lit = col * (0.5 + 0.13 * (0.5 + 0.5 * n.y) + 0.55 * ndl);
  vec3 h = normalize(uL + v);
  float spec = pow(max(dot(n, h), 0.0), mix(12.0, 150.0, gloss)) * mix(0.03, 0.85, gloss);
  vec3 outc = mix(lit + spec, col, emis);
  outc += uGlow * vec3(1.0, 0.72, 0.32) * (0.25 + 0.75 * max(dot(n, vec3(0.0, 0.3, 0.9)), 0.0)) * 0.0;
  gl_FragColor = vec4(outc, uAlpha);
}`;

// Ombre portée « papier découpé » : chaque objet aplati sur la table, bord net
const VS_SH = `
attribute vec3 aPos; uniform mat4 uM, uS, uVP;
void main(){ gl_Position = uVP * (uS * (uM * vec4(aPos, 1.0))); }`;
const FS_SH = `precision mediump float; uniform vec4 uC; void main(){ gl_FragColor = uC; }`;

const LIGHT = (() => { const l = Math.hypot(-0.45, 1, 0.55); return new Float32Array([-0.45 / l, 1 / l, 0.55 / l]); })();
const SHADOW = m4();
for (let col = 0; col < 4; col++) for (let row = 0; row < 4; row++)   // projection sur le plan y = 0
  SHADOW[col * 4 + row] = (row === col ? LIGHT[1] : 0) - (row < 3 ? LIGHT[row] : 0) * (col === 1 ? 1 : 0);

// [uniforme, clé, défaut] : seuls les changements sont envoyés au GPU
const U1 = [['uMode', 'mode', 0], ['uCook', 'cook', 0], ['uSlip', 'slip', 0], ['uScore', 'score', 0], ['uGloss', 'gloss', 0], ['uGlow', 'glow', 0], ['uAlpha', 'alpha', 1], ['uLine', 'line', 0]];

/* les feuilles imprimées : un canevas par feuille A4, dessiné plus bas (drawSheet) */
const PRINT = Array.from({ length: Math.min(nSheets, 4) }, () => { const c = document.createElement('canvas'); c.width = 1024; c.height = 1448; return c; });

function createGL(canvas) {
  let gl = null;
  try { gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, stencil: true, depth: true, antialias: devicePixelRatio < 1.8, powerPreference: 'default' }); } catch (e) { /* pas de WebGL */ }
  if (!gl) return null;
  const program = (vs, fs) => {
    const p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    }
    gl.bindAttribLocation(p, 0, 'aPos'); gl.bindAttribLocation(p, 1, 'aNor'); gl.bindAttribLocation(p, 2, 'aUV'); gl.bindAttribLocation(p, 3, 'aTag');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) { const name = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, ''); u[name] = gl.getUniformLocation(p, name); }
    return { p, u };
  };
  const main = program(VS, FS), shadow = program(VS_SH, FS_SH);
  const buf = (target, data, usage) => { const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, usage); return b; };
  const gpu = m => {
    if (!m.gl) { m.gl = { pos: buf(gl.ARRAY_BUFFER, m.pos, gl.DYNAMIC_DRAW), nor: buf(gl.ARRAY_BUFFER, m.nor, gl.DYNAMIC_DRAW), uv: buf(gl.ARRAY_BUFFER, m.uv, gl.STATIC_DRAW),
      tag: buf(gl.ARRAY_BUFFER, m.tag, gl.STATIC_DRAW), idx: buf(gl.ELEMENT_ARRAY_BUFFER, m.idx, gl.STATIC_DRAW), n: m.idx.length }; m.dirty = false; }
    else if (m.dirty) {   // maillage reconstruit (biseau du toit) : tout est renvoyé
      for (const [k, t] of [['pos', gl.ARRAY_BUFFER], ['nor', gl.ARRAY_BUFFER], ['uv', gl.ARRAY_BUFFER], ['tag', gl.ARRAY_BUFFER], ['idx', gl.ELEMENT_ARRAY_BUFFER]]) { gl.bindBuffer(t, m.gl[k]); gl.bufferData(t, m[k], gl.DYNAMIC_DRAW); }
      m.gl.n = m.idx.length; m.dirty = false;
    }
    return m.gl;
  };
  const bind = (b, full) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, b.pos); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    if (full) {
      gl.bindBuffer(gl.ARRAY_BUFFER, b.nor); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.uv); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.tag); gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 0, 0);
    } else { gl.disableVertexAttribArray(1); gl.disableVertexAttribArray(2); gl.disableVertexAttribArray(3); }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.idx);
  };
  const texture = src => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  };
  const tex = PRINT.map(c => texture(c));
  const N3 = new Float32Array(9), last = {}, u = main.u;
  const set1 = (name, v) => { if (last[name] !== v) { last[name] = v; gl.uniform1f(u[name], v); } };
  const set3 = (name, v) => { const l = last[name] || (last[name] = [NaN, NaN, NaN]); if (l[0] !== v[0] || l[1] !== v[1] || l[2] !== v[2]) { l[0] = v[0]; l[1] = v[1]; l[2] = v[2]; gl.uniform3f(u[name], v[0], v[1], v[2]); } };
  let boundTex = null;
  return {
    refresh(i) { gl.bindTexture(gl.TEXTURE_2D, tex[i]); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, PRINT[i]); boundTex = null; },
    draw(F) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clearColor(0, 0, 0, 0); gl.clearStencil(0); gl.depthMask(true);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.STENCIL_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.POLYGON_OFFSET_FILL);
      gl.useProgram(main.p);
      gl.uniformMatrix4fv(u.uVP, false, F.VP); gl.uniform3fv(u.uEye, F.eye); gl.uniform3fv(u.uL, LIGHT); gl.uniform1i(u.uTex, 0); gl.activeTexture(gl.TEXTURE0); boundTex = null;
      gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      for (const d of F.draws) {
        const o = d.o, M = d.M;
        N3[0] = M[0]; N3[1] = M[1]; N3[2] = M[2]; N3[3] = M[4]; N3[4] = M[5]; N3[5] = M[6]; N3[6] = M[8]; N3[7] = M[9]; N3[8] = M[10];
        gl.uniformMatrix4fv(u.uM, false, M); gl.uniformMatrix3fv(u.uN, false, N3);
        for (const [name, key, def] of U1) set1(name, o[key] ?? def);
        set3('uCol', o.col || [1, 1, 1]);
        const t = tex[o.tex || 0]; if (boundTex !== t) { boundTex = t; gl.bindTexture(gl.TEXTURE_2D, t); }
        const b = gpu(d.mesh); bind(b, true);
        gl.drawElements(gl.TRIANGLES, o.n != null ? Math.max(0, Math.min(b.n, o.n)) : b.n, gl.UNSIGNED_SHORT, 0);
      }
      // ombres : une seule couche par pixel (stencil), posées sur la table
      gl.useProgram(shadow.p);
      gl.uniformMatrix4fv(shadow.u.uS, false, SHADOW); gl.uniformMatrix4fv(shadow.u.uVP, false, F.VP);
      gl.uniform4f(shadow.u.uC, 0.137, 0.153, 0.122, 0.15);
      gl.depthMask(false);
      gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-2, -2);
      gl.enable(gl.STENCIL_TEST); gl.stencilFunc(gl.EQUAL, 0, 0xff); gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
      for (const d of F.draws) {
        if (d.o.noShadow || d.o.alpha < 1 || d.o.line) continue;
        gl.uniformMatrix4fv(shadow.u.uM, false, d.M);
        const b = gpu(d.mesh); bind(b, false);
        gl.drawElements(gl.TRIANGLES, b.n, gl.UNSIGNED_SHORT, 0);
      }
    },
  };
}

/* ─────────────── les feuilles imprimées : les gabarits à plat ─────────────── */

const SZ = 1024 / 210;   // px par mm (le canevas fait 1024 × 1448 pour 210 × 297 mm)
const f1 = x => fmt(x, 1), f0 = x => fmt(x, 0);
function drawSheet(si) {
  const cv = PRINT[si], x = cv.getContext('2d');
  x.setTransform(cv.width / 210, 0, 0, cv.height / 297, 0, 0);
  x.fillStyle = '#FFFEFA'; x.fillRect(0, 0, 210, 297);
  const mono = (s, X, Y, size, color = '#565A4D', align = 'center', w = 400) => { x.font = `${w} ${size}px ${FONT_MONO}`; x.fillStyle = color; x.textAlign = align; x.textBaseline = 'middle'; x.fillText(s, X, Y); };
  const titre = (s, X, Y, size, align = 'center') => { x.font = `800 ${size}px ${FONT_TITRE}`; x.fillStyle = '#23271F'; x.textAlign = align; x.textBaseline = 'middle'; x.fillText(s, X, Y); };
  mono('gabarits-ceramique.com', 12, 7, 2.6, '#4A7263', 'left', 500);
  mono(tr(`maison lumineuse · feuille ${si + 1}/${nSheets} · imprimer à 100 %`, `light-up house · sheet ${si + 1}/${nSheets} · print at 100%`), 198, 7, 2.6, '#8A8D80', 'right');
  const ink = '#B08874', green = '#4A7263';
  for (const p of PIECES) {
    const at = PAPER.at[p.i]; if (at.sheet !== si) continue;
    const pt = q => [at.x + q[0] - p.bb.x0, at.y + p.bb.y1 - q[1]];                 // repère du gabarit (y vers le haut) → feuille
    const path = P => { x.beginPath(); P.forEach((q, j) => { const [X, Y] = pt(q); j ? x.lineTo(X, Y) : x.moveTo(X, Y); }); x.closePath(); };
    x.fillStyle = '#E7EFE9'; path(p.out); x.fill();
    // les ouvertures : à découper plus tard dans la terre, hachurées
    for (const o of p.cuts) {
      x.save(); path(o); x.clip(); x.fillStyle = '#FFFEFA'; x.fill();
      const bb = bboxOf(o), [X0, Y0] = pt([bb.x0, bb.y1]);
      x.strokeStyle = 'rgba(176,136,116,.75)'; x.lineWidth = 0.28; x.beginPath();
      for (let d = -(bb.y1 - bb.y0); d < bb.x1 - bb.x0 + (bb.y1 - bb.y0); d += 1.6) { x.moveTo(X0 + d, Y0 + (bb.y1 - bb.y0)); x.lineTo(X0 + d + (bb.y1 - bb.y0), Y0); }
      x.stroke(); x.restore();
      x.strokeStyle = green; x.lineWidth = 0.35; x.setLineDash([1.4, 1]); path(o); x.stroke(); x.setLineDash([]);
    }
    if (p.k === 'D') {                                                              // biseau du faîtage : bord à x = 0
      const w = Math.max(2.2, E * TANA);
      x.save(); path(p.out); x.clip(); x.fillStyle = 'rgba(176,136,116,.18)';
      const [X0, Y0] = pt([0, RHP]); x.fillRect(X0, Y0, w, RHP); x.restore();
      x.strokeStyle = ink; x.lineWidth = 0.3; x.setLineDash([1.2, 1]); x.beginPath(); const [Xa, Ya] = pt([w, 0]), [Xb, Yb] = pt([w, RHP]); x.moveTo(Xa, Ya); x.lineTo(Xb, Yb); x.stroke(); x.setLineDash([]);
    }
    x.strokeStyle = green; x.lineWidth = 0.55; x.setLineDash([4, 3]); path(p.out); x.stroke(); x.setLineDash([]);
    // étiquette
    const bx = at.x + p.w / 2, by = at.y + p.h * (p.k === 'D' ? 0.5 : p.k === 'C' ? 0.5 : 0.7);
    titre(p.name, bx, by + (p.k === 'D' ? -6 : 8), p.k === 'D' ? 7 : 8);
    const dim = p.k === 'D' ? `${f1(RWP)} × ${f1(RHP)} mm` : p.k === 'C' ? `${f1(LWALL)} × ${f1(HW)} mm` : `${f1(LW)} × ${f1(HH)} mm`;
    mono(dim, bx, by + (p.k === 'D' ? 0 : 15.5), 2.7, '#565A4D');
    if (p.k === 'D') mono(tr(`biseau du faîtage · ${Math.round(ANG / DEG)}°`, `ridge bevel · ${Math.round(ANG / DEG)}°`), bx, by + 5.5, 2.1, ink, 'center', 500);
    mono(p.k + (p.k === 'C' || p.k === 'D' ? ` · ×2` : ''), at.x + 7, at.y + 6, 4.8, green, 'left', 500);
  }
  if (si === 0) {                                                                   // barre témoin de 50 mm
    x.strokeStyle = '#23271F'; x.lineWidth = 0.4; x.beginPath(); x.moveTo(12, 289); x.lineTo(62, 289); x.moveTo(12, 286.6); x.lineTo(12, 291.4); x.moveTo(62, 286.6); x.lineTo(62, 291.4); x.stroke();
    mono(tr('50 mm · vérifiez à la règle', '50 mm · check with a ruler'), 37, 283.6, 2.3, '#23271F', 'center', 500);
  }
}
function drawSheets() { PRINT.forEach((_, i) => drawSheet(i)); }

/* ─────────────── l'atelier ─────────────── */

const MAT_X = -(nSheets * 222 + 30) / 2 - 330, MAT_W = nSheets * 222 + 30, MAT_Z0 = -175;
const SH_AT = i => [MAT_X - MAT_W / 2 + 18 + i * 222, 2.05, MAT_Z0 + 18];   // coin haut-gauche de la feuille i, posée sur le tapis (mm, x, y, z)
const BRD = [0, 0, 0];                                                       // la plaque
const S0 = [BRD[0] - SLAB_W / 2, E, BRD[2] - SLAB_D / 2];                    // coin haut-gauche de la plaque
const BOARD_W = 360, BOARD_D = 250, BOARD_H = 12;
const HOME = [520, BOARD_H, 0 - PW / 2];                                // origine de la maison montée (coin avant-gauche, repère maison : x centré)
const STACK = [MAT_X + MAT_W / 2 + 70, 0, 200];                              // la pile des gabarits qui ont servi

// maillages
const flatFrame = m => {   // (x, y, z) du gabarit → repère « posé sur la table » : x, épaisseur vers le haut, z vers l'observateur (haut du gabarit = −z)
  for (let i = 0; i < m.pos.length; i += 3) { const x = m.pos[i], y = m.pos[i + 1], z = m.pos[i + 2]; m.pos[i] = x; m.pos[i + 1] = z; m.pos[i + 2] = -y; }
  for (let i = 0; i < m.nor.length; i += 3) { const x = m.nor[i], y = m.nor[i + 1], z = m.nor[i + 2]; m.nor[i] = x; m.nor[i + 1] = z; m.nor[i + 2] = -y; }
  return m;
};
const PT = 0.3;                                                   // épaisseur du papier
const sheetUV = (m, p) => {                                       // le papier lit la feuille imprimée
  const at = PAPER.at[p.i];
  for (let i = 0; i < m.uv.length / 2; i++) { const x = m.pos[i * 3], z = m.pos[i * 3 + 2]; m.uv[i * 2] = (at.x + x - p.bb.x0) / 210; m.uv[i * 2 + 1] = 1 - (at.y + p.bb.y1 + z) / 297; }
  return m;
};
const slabOutline = () => {   // plaque abaissée : rectangle mou, bord irrégulier (coordonnées de la plaque, y vers le haut pour le gabarit)
  const pts = [], n = 160;
  for (let i = 0; i < n; i++) {
    const t = i / n * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), j = 1 + 0.008 * Math.sin(7 * t + 1.3) + 0.006 * Math.sin(13 * t + 0.4) + 0.004 * Math.sin(23 * t + 2.1);
    pts.push([SLAB_W / 2 + SLAB_W / 2 * Math.sign(c) * Math.abs(c) ** 0.2 * j, -(SLAB_D / 2 + SLAB_D / 2 * Math.sign(s) * Math.abs(s) ** 0.2 * j)]);
  }
  return pts;
};
const pieceOnSlab = p => { const at = SLAB_PK.at[p.i]; return [S0[0] + at.x - p.bb.x0, S0[2] + at.y + p.bb.y1]; };   // origine du repère local de la pièce, posée à plat sur la plaque
const kerfOutline = p => p.out;                                   // le trait de l'aiguille suit le bord exact
const slabHoles = PIECES.map(p => {
  const at = SLAB_PK.at[p.i];
  const P = p.k === 'D' ? rectPts(at.x + RWP / 2, -(at.y + RHP / 2), RWP, RHP) : p.out.map(q => [at.x + q[0] - p.bb.x0, -(at.y + p.bb.y1 - q[1])]);
  const cx = P.reduce((a, q) => a + q[0], 0) / P.length, cy = P.reduce((a, q) => a + q[1], 0) / P.length, r = Math.max(...P.map(q => Math.hypot(q[0] - cx, q[1] - cy)));
  return P.map(q => [cx + (q[0] - cx) * (1 + 1.3 / r), cy + (q[1] - cy) * (1 + 1.3 / r)]);   // un petit jeu autour de la pièce : le trait de l'aiguille
});

const MS = {
  cloth: boxMesh(2600, 1, 1800), mat: boxMesh(MAT_W, 2, 340), board: boxMesh(BOARD_W, BOARD_H, BOARD_D),
  sheet: (() => { const m = boxMesh(210, 0.3, 297); for (let i = 0; i < m.uv.length / 2; i++) { m.uv[i * 2] = m.pos[i * 3] / 210; m.uv[i * 2 + 1] = 1 - m.pos[i * 3 + 2] / 297; } return m; })(),
  strip: boxMesh(18, E, SLAB_D + 90), roller: cylMesh(24, 24, 330, 36),
  slabSolid: flatFrame(plateMesh(slabOutline(), [], E)),
  slabHoley: flatFrame(plateMesh(slabOutline(), slabHoles.map((h, i) => (PIECES[i].k === 'D' ? h : h)), E)),
  paper: PIECES.map(p => sheetUV(flatFrame(plateMesh(p.out, [], PT)), p)),
  clay: PIECES.map(p => p.k === 'D' ? roofMesh(0) : flatFrame(plateMesh(p.out, [], E))),
  clayOpen: PIECES.map(p => p.k === 'D' ? null : flatFrame(plateMesh(p.out, p.cuts, E))),
  plug: [],     // un bouchon par ouverture
  traceOut: PIECES.map(p => p.k === 'D' ? ribbonMesh(resample(rectPts(RWP / 2, RHP / 2, RWP, RHP), 2.2), true, 1.1) : ribbonMesh(resample(p.out.map(q => [q[0], -q[1]]), 2.2), true, 1.1)),
  needleShaft: cylMesh(0.7, 0.35, 62, 10), needleGrip: cylMesh(4.2, 4.2, 74, 16),
  blade: boxMesh(52, 1.1, 5.2), handle: boxMesh(26, 2.4, 7), grip: boxMesh(80, 11, 11),
  kblade: boxMesh(1.0, 15, 64), kgrip: boxMesh(11, 11, 78), jar: cylMesh(28, 28, 40, 32), slip: cylMesh(26.5, 26.5, 1, 32), brushH: cylMesh(1.1, 2.4, 78, 12), brushT: cylMesh(2.6, 0.6, 16, 12),
  sponge: boxMesh(48, 24, 34), coil: cylMesh(1, 1, 1, 14), candle: cylMesh(15, 15, 36, 28), flame: cylMesh(3.2, 0.2, 9, 12), lit: boxMesh(1, 1, 1),
  ruler: boxMesh(150, 1.4, 25), box: boxMesh(1, 1, 1), brd: boxMesh(130, 9, 150),
};
function resample(P, step) {   // un contour fermé rééchantillonné tous les `step` mm
  const out = []; let carry = 0;
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(l / step));
    for (let k = 0; k < n; k++) out.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]);
  }
  return out;
}
// les ouvertures, à plat : (pièce, contour dans le repère du gabarit)
const OPEN = [];
PIECES.forEach(p => p.cuts.forEach(o => OPEN.push({ p, poly: o, mesh: null })));
OPEN.forEach(o => {
  o.mesh = flatFrame(plateMesh(o.poly, [], E));
  o.trace = ribbonMesh(resample(o.poly.map(q => [q[0], -q[1]]), 1.4), true, 0.9);
  o.c = [o.poly.reduce((a, q) => a + q[0], 0) / o.poly.length, o.poly.reduce((a, q) => a + q[1], 0) / o.poly.length];
});

// poses : à plat sur la plaque, et montée (repère de la maison, translatée en HOME)
const Q_ID = [0, 0, 0, 1];
const qFlat = Q_ID;
const BASIS = {
  A: [[1, 0, 0], [0, 0, 1], [0, -1, 0], [0, 0, PW - E]],   // la façade côté observateur (+z) : sa face visible porte la porte et les fenêtres
  B: [[1, 0, 0], [0, 0, 1], [0, -1, 0], [0, 0, 0]],
  C1: [[0, 0, 1], [-1, 0, 0], [0, -1, 0], [HALF, 0, PW / 2]],
  C2: [[0, 0, -1], [1, 0, 0], [0, -1, 0], [-HALF, 0, PW / 2]],
  D1: [[Math.cos(ANG), -Math.sin(ANG), 0], [Math.sin(ANG), Math.cos(ANG), 0], [0, 0, 1], [0, HH, -DW]],
  D2: [[-Math.cos(ANG), -Math.sin(ANG), 0], [-Math.sin(ANG), Math.cos(ANG), 0], [0, 0, -1], [0, HH, PW + DW]],
};
const ASM_KEY = ['A', 'B', 'C1', 'C2', 'D1', 'D2'];
const asmM = i => { const [X, Y, Z, O] = BASIS[ASM_KEY[i]]; const M = m4(); M.set([X[0], X[1], X[2], 0, Y[0], Y[1], Y[2], 0, Z[0], Z[1], Z[2], 0, HOME[0] + O[0], HOME[1] + O[1], HOME[2] + O[2], 1]); return M; };
const flatM = i => { const p = PIECES[i], M = m4(); if (p.k === 'D') return rigid(M, Q_ID, S0[0] + SLAB_PK.at[i].x + E * TANA, 0, S0[2] + SLAB_PK.at[i].y); const o = pieceOnSlab(p); return rigid(M, Q_ID, o[0], 0, o[1]); };
const LCEN = i => PIECES[i].k === 'D' ? [RWP / 2, E / 2, RHP / 2] : [0, E / 2, -(PIECES[i].bb.y0 + PIECES[i].bb.y1) / 2];   // centre de la pièce, dans son repère

// bouchons : un petit maillage par ouverture
OPEN.forEach(o => { MS.plug.push(o.mesh); });

// couleurs
const COL = {
  steel: [0.6, 0.62, 0.61], wood: [0.69, 0.53, 0.45], iron: [0.33, 0.34, 0.32], scis: [0.29, 0.447, 0.388], mat: [0.2, 0.34, 0.29], ruler: [0.74, 0.76, 0.75],
  jar: [0.95, 0.95, 0.93], slip: [0.74, 0.71, 0.66], sponge: [0.93, 0.79, 0.46], cham: [0.86, 0.75, 0.57], candle: [0.96, 0.94, 0.86], flame: [1.0, 0.84, 0.5], warm: [1.0, 0.78, 0.42],
  board: [0.82, 0.68, 0.54], brush: [0.5, 0.36, 0.28], line: [0.2, 0.18, 0.16], wax: [0.9, 0.88, 0.8],
};

/* ─────────────── récit ─────────────── */

// Chaque étape i anime la fenêtre s ∈ [i, i + 1] ; tout l'état de la scène est une fonction de s (on peut sauter d'une étape à l'autre).
function story(s) {
  const r = {
    sheetIn: sm(1.03, 1.42, s), ruler: sm(1.46, 1.62, s), rulerOff: sm(1.9, 1.98, s),                  // 01 imprimer
    cut: sm(2.05, 2.8, s), scrap: sm(2.83, 2.97, s),                                                      // 02 découper
    rIn: sm(3.02, 3.12, s), roll: sm(3.12, 3.82, s), rOut: sm(3.82, 3.95, s),                             // 03 abaisser
    fly: sm(4.02, 4.26, s), trace: sm(4.3, 4.9, s),                                                       // 04 tracer
    peel: sm(5.04, 5.34, s), clear: sm(5.38, 5.9, s),                                                     // 05 dégager
    open: sm(6.08, 6.7, s), plug: sm(6.74, 6.96, s),                                                      // 06 ouvertures
    cook: sm(7.08, 7.92, s),                                                                              // 07 raffermir
    bev: sm(8.14, 8.7, s), bevK: sm(8.1, 8.8, s),                                                         // 08 biseauter
    score: sm(9.06, 9.4, s), slip: sm(9.44, 9.86, s),                                                     // 09 strier, barbotiner
    standA: sm(10.05, 10.3, s), standB: sm(10.32, 10.58, s), wallA: sm(10.6, 10.78, s), wallB: sm(10.78, 10.96, s),   // 10 monter
    coil: sm(11.08, 11.62, s),                                                                            // 11 colombins
    roofA: sm(12.06, 12.4, s), roofB: sm(12.4, 12.74, s), ridge: sm(12.76, 12.94, s),                    // 12 toit
    sponge: sm(13.08, 13.84, s),                                                                          // 13 lisser
    candle: sm(14.18, 14.42, s), lift: sm(14.04, 14.2, s) * (1 - sm(14.46, 14.62, s)), glow: sm(14.64, 14.96, s),   // 14 sécher, allumer
    fin: sm(14.99, 15.0, s),
  };
  return r;
}

/* ─────────────── poses ─────────────── */

const POOL = Array.from({ length: 400 }, m4); let pidx = 0;
const nm = () => POOL[pidx++];
const T3 = (x, y, z) => rigid(nm(), Q_ID, x, y, z);
const QF = PIECES.map((p, i) => quatOf(flatM(i))), QA = PIECES.map((p, i) => quatOf(asmM(i)));
const MFLAT = PIECES.map((p, i) => flatM(i)), MASM = PIECES.map((p, i) => asmM(i));
const sampleAt = (P, f) => { const n = P.length, k = f * n, i = Math.min(n - 1, Math.floor(k)), t = k - i, a = P[i], b = P[(i + 1) % n]; return { p: [lerp(a[0], b[0], t), lerp(a[1], b[1], t)], d: [b[0] - a[0], b[1] - a[1]] }; };
const OUTL = PIECES.map(p => resample(p.out, 1.6));
const scaleAbout = (o, c, lc, sx, sy, sz) => { o.fill(0); o[0] = sx; o[5] = sy; o[10] = sz; o[15] = 1; o[12] = c[0] - sx * lc[0]; o[13] = c[1] - sy * lc[1]; o[14] = c[2] - sz * lc[2]; return o; };
const rollG = r => 1 - (1 - r) ** 1.6;
const slabScale = r => { const g = rollG(r), sx = lerp(0.62, 1, g), sz = lerp(0.36, 1, g); return [sx, 1 / (sx * sz), sz]; };

// repos des outils : derrière la plaque, sauf l'aiguille (à droite) et les ciseaux (sur le tapis)
const BACK = -SLAB_D / 2 - 85;
const NDL_REST = [SLAB_W / 2 + 70, 0, SLAB_D / 2 - 40], SCIS_REST = { p: [MAT_X + MAT_W / 2 - 50, 3, MAT_Z0 + 300], a: 1.9 };
const KNF_REST = [-170, 0, BACK], BRS_REST = [-40, 0, BACK], JAR_AT = [90, 0, BACK], SPG_REST = [200, 0, BACK + 10];
const RL_REST = [BRD[0], 25, -SLAB_D / 2 - 175];
const CAND_REST = [HOME[0] + HALF + 90, BOARD_H, HOME[2] + PW / 2];

const TOOL_DIR = (() => { const l = Math.hypot(0.3, 0.86, 0.42); return [0.3 / l, 0.86 / l, 0.42 / l]; })();
function toolBasis(o, Y, tip) {
  const up = Math.abs(Y[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  let X = [up[1] * Y[2] - up[2] * Y[1], up[2] * Y[0] - up[0] * Y[2], up[0] * Y[1] - up[1] * Y[0]]; const l = Math.hypot(...X); X = X.map(v => v / l);
  const Z = [X[1] * Y[2] - X[2] * Y[1], X[2] * Y[0] - X[0] * Y[2], X[0] * Y[1] - X[1] * Y[0]];
  return basis(o, X, Y, Z, tip, [0, 0, 0]);
}
function needleAt(add, tip) {
  const M = toolBasis(nm(), TOOL_DIR, tip); add(MS.needleShaft, M, { mode: 2, col: COL.steel, gloss: 0.8 });
  add(MS.needleGrip, mul(nm(), M, T3(0, 62, 0)), { mode: 2, col: COL.wood });
}
function brushAt(add, tip) {
  const M = toolBasis(nm(), TOOL_DIR, tip); add(MS.brushT, M, { mode: 2, col: COL.slip, gloss: 0.5 });
  add(MS.brushH, mul(nm(), M, T3(0, 16, 0)), { mode: 2, col: COL.brush });
}
function scissorsAt(add, P, dir, open, y) {
  const th = Math.atan2(-dir[1], dir[0]), piv = [P[0] - dir[0] * 30, y, P[1] - dir[1] * 30];
  [1, -1].forEach(sg => {
    const a = th + sg * open, b = th + Math.PI - sg * (open * 1.4 + 0.22);
    add(MS.blade, place(nm(), qAxis(0, 1, 0, a), piv[0], piv[1] + (sg > 0 ? 1.2 : 0), piv[2], [0, 0, 2.6]), { mode: 2, col: COL.steel, gloss: 0.8 });
    add(MS.handle, place(nm(), qAxis(0, 1, 0, b), piv[0], piv[1] + (sg > 0 ? 1.2 : 0), piv[2], [0, 0, 3.5]), { mode: 2, col: COL.scis });
  });
}
const worldOnPiece = (i, x, y, ytop) => xf(MFLAT[i], [x, ytop, -y]);   // un point du gabarit (x, y vers le haut) posé sur la pièce à plat

/* ─────────────── la scène ─────────────── */

const F = { draws: [], VP: m4(), eye: new Float32Array(3) };
const Pm = m4(), Vm = m4(), FOV = 30 * DEG;
function setRoofBevel(m, b) {
  b = Math.round(b * 200) / 200;
  if (m.bevK === b) return; m.bevK = b;
  const n = roofMesh(b); m.pos = n.pos; m.nor = n.nor; m.uv = n.uv; m.tag = n.tag; m.idx = n.idx; m.dirty = true;
}
function compose(st) {
  const D = F.draws; D.length = 0; pidx = 0;
  const add = (mesh, M, o) => D.push({ mesh, M, o });
  const NP = PIECES.length;

  // décor : la toile, le tapis de coupe, la planche de montage
  add(MS.cloth, T3(-1300, -1, -900), { mode: 4, noShadow: true });
  add(MS.mat, T3(MAT_X - MAT_W / 2, 0, MAT_Z0), { mode: 5, col: COL.mat, noShadow: true });
  add(MS.board, T3(HOME[0] - BOARD_W / 2 + 30, 0, HOME[2] + PW / 2 - BOARD_D / 2), { mode: 2, col: COL.board });

  // 01-02 : les feuilles, les gabarits, les ciseaux
  const sc = st.scrap, K = st.cut * NP;
  const sheetPos = si => { const a = SH_AT(si), ex = 1 - st.sheetIn; return [a[0] - ex * 380 - sc * 700, a[1] + 55 * arc(Math.min(1, ex)) * (ex > 0 ? 1 : 0), a[2] + ex * 40 + sc * 120]; };
  if (st.sheetIn > 0 && sc < 1) for (let si = 0; si < nSheets; si++) add(MS.sheet, T3(...sheetPos(si)), { mode: 1, tex: si });
  if (st.sheetIn > 0 && st.fly <= 0) {
    PIECES.forEach((p, i) => {
      const at = PAPER.at[i], a = SH_AT(at.sheet), fr = clamp(K - i - 0.04), ex = 1 - st.sheetIn;
      const base = [a[0] + at.x - p.bb.x0 - ex * 380, a[1] + 0.32 + 0.7 * fr + 55 * arc(Math.min(1, ex)) * (ex > 0 ? 1 : 0), a[2] + at.y + p.bb.y1 + ex * 40];
      add(MS.paper[i], T3(...base), { mode: 1, tex: at.sheet });
    });
  }
  if (st.cut > 0 && st.cut < 1) {
    const j = Math.min(NP - 1, Math.floor(K)), f = clamp(K - j), at = PAPER.at[j], p = PIECES[j], a = SH_AT(at.sheet);
    const sp = sampleAt(OUTL[j], f), q = sp.p, l = Math.hypot(...sp.d) || 1;
    scissorsAt(add, [a[0] + at.x + q[0] - p.bb.x0, a[2] + at.y + p.bb.y1 - q[1]], [sp.d[0] / l, -sp.d[1] / l], 0.05 + 0.13 * (0.5 + 0.5 * Math.cos(K * 160)), a[1] + 2.4);
  } else scissorsAt(add, [SCIS_REST.p[0], SCIS_REST.p[2]], [Math.cos(SCIS_REST.a), Math.sin(SCIS_REST.a)], 0.05, SCIS_REST.p[1]);

  // la règle, posée sur la barre témoin de la feuille 1
  if (st.ruler > 0 && st.rulerOff < 1) {
    const a = SH_AT(0), e = st.ruler * (1 - st.rulerOff), target = [a[0] + 12 + 25 - 75, a[1] + 0.9, a[2] + 289 - 12 + 11];
    add(MS.ruler, T3(...lerpV([target[0] + 160, target[1] + 70, target[2] + 80], target, e)), { mode: 2, col: COL.ruler, gloss: 0.7 });
  }

  // 03 : les réglettes, le rouleau, la plaque
  const [sx, sy, sz] = slabScale(st.roll);
  if (st.rIn > 0 && st.peel < 1) {
    add(MS.strip, T3(BRD[0] - SLAB_W / 2 - 24, 0, BRD[2] - SLAB_D / 2 - 45), { mode: 2, col: COL.wood });
    add(MS.strip, T3(BRD[0] + SLAB_W / 2 + 6, 0, BRD[2] - SLAB_D / 2 - 45), { mode: 2, col: COL.wood });
  }
  {
    let C = RL_REST, ang = 0;
    const hz = SLAB_D / 2 * sz + 18, top = E * sy + 25;
    const start = [BRD[0], E * slabScale(0)[1] + 25, BRD[2] - (SLAB_D / 2 * 0.36 + 18)], end = [BRD[0], E + 25, BRD[2] - (SLAB_D / 2 + 18)];
    if (st.roll <= 0) C = st.rIn > 0 ? hop(RL_REST, start, st.rIn, 50) : RL_REST;
    else if (st.roll >= 1) C = hop(end, RL_REST, st.rOut, 50);
    else { const P = 4, seg = st.roll * P, j = Math.min(P - 1, Math.floor(seg)), t = seg - j, dir = j % 2 ? 1 : -1, z = BRD[2] - dir * lerp(-hz, hz, sm(0, 1, t)); C = [BRD[0], top, z]; ang = (z - BRD[2]) / 24; }
    add(MS.roller, place(nm(), qMul(qAxis(1, 0, 0, ang), qAxis(0, 0, 1, -Math.PI / 2)), C[0], C[1], C[2], [0, 165, 0]), { mode: 2, col: COL.wood, gloss: 0.1 });
  }
  const showPieces = st.trace >= 0.999;
  if (st.rIn > 0 && st.clear < 1) {
    const cx = S0[0] + SLAB_W / 2, cz = S0[2] + SLAB_D / 2, eC = st.clear;
    if (eC > 0) {
      const M = place(nm(), qAxis(0, 1, 0, -0.3 * eC), cx - 560 * sm(0.15, 1, eC), 50 * sm(0, 0.35, eC), cz - 60 * eC, [SLAB_W / 2, 0, SLAB_D / 2]);
      add(MS.slabHoley, M, { mode: 0 });
    } else add(showPieces ? MS.slabHoley : MS.slabSolid, scaleAbout(nm(), [cx, 0, cz], [SLAB_W / 2, 0, SLAB_D / 2], sx, sy, sz), { mode: 0 });
  }

  // 04-05 : les gabarits de papier volent sur la plaque, l'aiguille trace, puis ils se décollent et font un tas
  const pf = st.fly, pe = st.peel;
  if (pf > 0) {
    PIECES.forEach((p, i) => {
      const at = PAPER.at[i], a = SH_AT(at.sheet), o = pieceOnSlab(p);
      const from = [a[0] + at.x - p.bb.x0, a[1] + 0.32, a[2] + at.y + p.bb.y1], to = [o[0], E + 0.34, o[1]];
      const pos = lerpV(from, to, pf); pos[1] += 130 * arc(pf);
      const cen = [STACK[0] - (p.bb.x0 + p.bb.x1) / 2 + (i % 2) * 3, 0.4 + i * 0.36, STACK[2] + (p.bb.y0 + p.bb.y1) / 2 + (i >> 1) * 2];
      let fp = pos;
      if (pe > 0) { const up = [pos[0], pos[1] + 24 * sm(0, 0.45, pe), pos[2]]; fp = lerpV(up, cen, sm(0.4, 1, pe)); fp[1] += 90 * arc(sm(0.4, 1, pe)); }
      add(MS.paper[i], T3(...fp), { mode: 1, tex: at.sheet });
    });
  }
  const Kt = st.trace * NP;
  if (pf >= 1 && !showPieces) {
    PIECES.forEach((p, i) => {
      const f = clamp(Kt - i); if (f <= 0) return;
      const o = p.k === 'D' ? [S0[0] + SLAB_PK.at[i].x, S0[2] + SLAB_PK.at[i].y] : pieceOnSlab(p), mesh = MS.traceOut[i];
      add(mesh, T3(o[0], E + 0.06, o[1]), { mode: 2, col: COL.line, n: Math.floor(f * mesh.segs) * 6 });
    });
  }
  let needleTip = null, brushTip = null;
  if (pf >= 1 && st.trace > 0 && !showPieces) {
    const j = Math.min(NP - 1, Math.floor(Kt)), mesh = MS.traceOut[j], p = PIECES[j], q = sampleAt(mesh.pts, clamp(Kt - j)).p;
    const o = p.k === 'D' ? [S0[0] + SLAB_PK.at[j].x, S0[2] + SLAB_PK.at[j].y] : pieceOnSlab(p);
    needleTip = [o[0] + q[0], E + 0.2, o[1] + q[1]];
  }

  // 05+ : les pièces de terre
  if (showPieces) {
    const pr = [st.standA, st.standB, st.wallA, st.wallB, st.roofA, st.roofB];
    const opened = st.plug > 0, lift = 70 * st.lift;
    PIECES.forEach((p, i) => {
      const a = pr[i], lc = LCEN(i), D2 = p.k === 'D';
      const looks = { mode: 0, cook: st.cook, score: D2 ? 0 : st.score, slip: D2 ? st.ridge : st.slip };
      let M = MFLAT[i];
      if (a > 0 && a < 1) {
        const c0 = xf(MFLAT[i], lc), c1 = xf(MASM[i], lc);
        M = place(nm(), slerp(QF[i], QA[i], sm(0.1, 0.9, a)), lerp(c0[0], c1[0], a), lerp(c0[1], c1[1], a) + 170 * arc(a), lerp(c0[2], c1[2], a), lc);
      } else if (a >= 1) { M = nm(); M.set(MASM[i]); M[13] += lift; }
      const mesh = D2 ? MS.clay[i] : (opened ? MS.clayOpen[i] : MS.clay[i]);
      if (D2) setRoofBevel(mesh, st.bev);
      add(mesh, M, looks);
      if (!D2 && a <= 0) {
        OPEN.forEach((o, ix) => {
          if (o.p.i !== i) return;
          if (st.plug > 0 && st.plug < 1) { const e = st.plug; add(o.mesh, mul(nm(), M, T3(0, 22 * arc(e) + 40 * e * e, 0)), { ...looks, alpha: 1 - sm(0.55, 1, e) }); }
          else if (!opened) { const f = clamp(st.open * OPEN.length - ix); if (f > 0) add(o.trace, mul(nm(), M, T3(0, E + 0.06, 0)), { mode: 2, col: COL.line, n: Math.floor(f * o.trace.segs) * 6 }); }
        });
      }
    });
    if (st.open > 0 && st.open < 1) {
      const Ko = st.open * OPEN.length, jo = Math.min(OPEN.length - 1, Math.floor(Ko)), o = OPEN[jo], q = sampleAt(o.trace.pts, clamp(Ko - jo)).p;
      needleTip = xf(MFLAT[o.p.i], [q[0], E + 0.2, q[1]]);
    }
    const ord = [0, 1, 2, 3];
    if (st.score > 0 && st.score < 1) { const j = Math.min(3, Math.floor(st.score * 4)), i = ord[j], P = OUTL[i], sp = sampleAt(P, clamp(st.score * 4 - j)); needleTip = worldOnPiece(i, sp.p[0], sp.p[1], E * 0.5); }
    if (st.slip > 0 && st.slip < 1) { const j = Math.min(3, Math.floor(st.slip * 4)), i = ord[j], sp = sampleAt(OUTL[i], clamp(st.slip * 4 - j)); brushTip = worldOnPiece(i, sp.p[0], sp.p[1], E * 0.5); }
    // le couteau du biseau : une lame dans le plan du biseau, qui avance le long du bord de faîtage de chaque pan
    const knifeRest = () => add(MS.kblade, place(nm(), qAxis(0, 0, 1, Math.PI / 2), KNF_REST[0], 1, KNF_REST[2], [0.5, 7.5, 32]), { mode: 2, col: COL.steel, gloss: 0.8 });
    if (st.bevK > 0 && st.bevK < 1) {
      const d = clamp(st.bev), j = d < 0.5 ? 4 : 5, f = d < 0.5 ? d * 2 : (d - 0.5) * 2;
      const w = xf(MFLAT[j], [-E * TANA * 0.5, E * 0.5, lerp(RHP - 34, 34, f)]);
      const Mb = place(nm(), qAxis(0, 0, 1, ANG), w[0], w[1] + 3, w[2], [0.5, 7.5, 32]);
      add(MS.kblade, Mb, { mode: 2, col: COL.steel, gloss: 0.8 });
      add(MS.kgrip, mul(nm(), Mb, T3(-5, 15, -7)), { mode: 2, col: COL.wood });
    } else knifeRest();
    // l'éponge : sur la façade, puis sur le mur de droite
    if (st.sponge > 0 && st.sponge < 1) {
      const u = st.sponge, hy = HOME[1] + HW * 0.55;
      if (u < 0.55) { const t = u / 0.55; add(MS.sponge, T3(HOME[0] + Math.sin(t * Math.PI * 4) * HALF * 0.55 - 24, hy + Math.cos(t * Math.PI * 4) * 6 - 12, HOME[2] - 34 - 0.3), { mode: 2, col: COL.sponge }); }
      else { const t = (u - 0.55) / 0.45; add(MS.sponge, place(nm(), qAxis(0, 1, 0, Math.PI / 2), HOME[0] + HALF + 17.5, hy + Math.cos(t * Math.PI * 4) * 6, HOME[2] + PW / 2 + Math.sin(t * Math.PI * 4) * PW * 0.3, [24, 12, 17]), { mode: 2, col: COL.sponge }); }
    } else add(MS.sponge, T3(SPG_REST[0], 0, SPG_REST[2]), { mode: 2, col: COL.sponge });
  } else {
    add(MS.kblade, place(nm(), qAxis(0, 0, 1, Math.PI / 2), KNF_REST[0], 1, KNF_REST[2], [0.5, 7.5, 32]), { mode: 2, col: COL.steel, gloss: 0.8 });
    add(MS.sponge, T3(SPG_REST[0], 0, SPG_REST[2]), { mode: 2, col: COL.sponge });
  }
  if (needleTip) needleAt(add, needleTip); else needleAt(add, NDL_REST);
  // la barbotine : le pot et son pinceau
  add(MS.jar, T3(JAR_AT[0], 0, JAR_AT[2]), { mode: 2, col: COL.jar, gloss: 0.4 });
  add(MS.slip, T3(JAR_AT[0], 36, JAR_AT[2]), { mode: 2, col: COL.slip, gloss: 0.7 });
  if (brushTip) brushAt(add, brushTip); else brushAt(add, [BRS_REST[0], 1, BRS_REST[2]]);

  // 11 : les colombins dans les angles intérieurs
  if (st.coil > 0) {
    const cr = 1.9, hh = HW - 2;
    for (const [x, z] of [[HALF - E - cr, E + cr], [-(HALF - E - cr), E + cr], [HALF - E - cr, PW - E - cr], [-(HALF - E - cr), PW - E - cr]])
      add(MS.coil, scaleAbout(nm(), [HOME[0] + x, HOME[1] + 70 * st.lift, HOME[2] + z], [0, 0, 0], cr, hh * st.coil, cr), { mode: 0, cook: st.cook, noShadow: true });
  }

  // 14 : la bougie LED et la lumière
  const lift = 70 * st.lift;
  if (st.candle > 0) {
    const c = lerpV(CAND_REST, [HOME[0] + HALF * 0.25, HOME[1] + 0.2, HOME[2] + PW / 2], st.candle);
    add(MS.candle, T3(c[0], c[1], c[2]), { mode: 2, col: COL.candle, gloss: 0.3 });
    add(MS.flame, T3(c[0], c[1] + 36, c[2]), { mode: 3, col: COL.flame, noShadow: true, alpha: 0.35 + 0.65 * st.glow });
  }
  if (st.glow > 0) {
    const w = (HALF - E) * 2 - 0.8, d = PW - 2 * E - 0.8, h = HW - 0.6;
    add(MS.lit, scaleAbout(nm(), [HOME[0], HOME[1] + 0.2 + lift, HOME[2] + PW / 2], [0.5, 0, 0.5], w, h, d), { mode: 3, col: [1.0, 0.72 + 0.1 * st.glow, 0.36], noShadow: true, alpha: st.glow });
  }
}

/* ─────────────── la configuration et ses cotes ─────────────── */

const ANGD = Math.round(ANG / DEG);
const DW_DOOR = LW * 0.26, H_DOOR = HW * 0.5 - DW_DOOR / 2 + DW_DOOR / 2, D_WIN = 2 * LW * 0.035, W_SQ = LW * 0.24, D_OEIL = 2 * LW * 0.065;
const W_SLIT = Math.max(5, LWALL * 0.1), H_SLIT = HW * 0.46;
const BEV_W = E * TANA;                      // largeur de la languette retirée au biseau
const tag = s => `<span class="st st--${s}">${{ crue: tr('crue', 'raw'), cuir: tr('au cuir', 'leather-hard'), cuite: tr('finie', 'finished'), papier: tr('papier', 'paper') }[s]}</span>`;
const row = (k, v, s) => `<div class="kv"><span>${k}</span><b>${v}${s ? ' ' + tag(s) : ''}</b></div>`;
const mm = x => `${f1(x)} mm`;
const dims3 = d => `${f1(d.l)} × ${f1(d.p)} × ${f1(d.H)} mm`;
const SHEETS_TXT = CFG.sheets || nSheets;
const nF = n => tr(`${n} feuille${n > 1 ? 's' : ''} A4`, `${n} A4 sheet${n > 1 ? 's' : ''}`);

/* ─────────────── les étapes ─────────────── */

// s : fenêtre de l'animation ; cam : caméra [cible, rayon à cadrer, élévation °, azimut rad] ; dur : secondes
const HC = [HOME[0], HOME[1] + HH * 0.42, HOME[2] + PW / 2];
const SC = [BRD[0], 6, BRD[2]], MC = [MAT_X, 4, MAT_Z0 + 150];
const STEPS = [
  {
    id: 'ma-maison', n: 'Ma maison', time: '', s: [15, 15], dur: 0.1, spin: true,
    cam: [HC, 78 + HH * 0.7, 16, 0.5],
    html: `<p class="lead">Le tutoriel suit <b>votre</b> maison : toutes les cotes ci-dessous sont recalculées pour votre terre, et données à l'état où vous les mesurez.</p>
      <div class="cfg">${row('Maison', dims3(C.cuite), 'cuite')}${row('Murs · toit', `${f1(CFG.h)} · ${f1(CFG.r)} mm`)}${row('Débord du toit', mm(CFG.d))}
      ${row('Retrait total de votre terre', `${f0(CFG.sh)} %`)}${row('Retrait déjà fait au cuir', `${f0(CFG.cuir)} %`)}${row('Plaque', mm(E), 'crue')}</div>
      <div class="states">
        <div><i>crue</i><b>${f1(C.crue.l)}</b><small>on découpe, on monte</small></div>
        <div><i>au cuir</i><b>${f1(C.cuir.l)}</b><small>on assemble</small></div>
        <div><i>finie</i><b>${f0(C.cuite.l)}</b><small>on allume</small></div>
      </div>
      <p class="note">Les trois nombres sont la largeur de la maison. Le retrait total, c'est le séchage (plus la cuisson, si votre terre se cuit) : de la terre humide à la pièce finie. Les gabarits sont déjà agrandis du retrait : ne corrigez rien à l'œil.</p>
      <h3>Il vous faut</h3>
      <ul class="kit">
        <li><em>papier</em> le PDF des gabarits (feuilles A4 ordinaires), ciseaux, colle en bâton</li>
        <li><em>terre</em> ≈ ${CLAY_G} g d'argile (autodurcissante ou grès fin), rouleau, 2 réglettes de ${f1(E)} mm, toile</li>
        <li><em>découpe</em> aiguille, cutter, un emporte-pièce ou une paille pour les petits ronds</li>
        <li><em>montage</em> strieur, barbotine, pinceau, éponge, deux planchettes pour sécher à plat</li>
        <li><em>lumière</em> une bougie LED (la maison n'a pas de fond : elle se pose dessus)</li>
      </ul>
      <p class="note">Comptez 1 h 30 de travail, puis 2 à 4 h de raffermissement avant le montage.</p>`,
  },
  {
    id: 'imprimer', n: 'Imprimer', time: '5 min', s: [1.02, 1.98], dur: 5, cam: [[MAT_X, 4, MAT_Z0 + 150], MAT_W * 0.58, 56, 0.1],
    html: `<ol>
        <li>Téléchargez le PDF de vos gabarits depuis l'outil et imprimez toutes ses feuilles, sur <b>papier ordinaire</b> : les six pièces y sont.</li>
        <li>Dans la fenêtre d'impression : <b>taille réelle</b>, « ajuster à la page » décoché.</li>
        <li>Posez la règle sur la <b>barre témoin</b> imprimée sur chaque feuille : <b>50 mm</b> pile. À 48 mm, toute la maison sortirait 4 % trop petite : réimprimez.</li>
      </ol>
      <div class="cfg">${row('Barre témoin', '50,0 mm', 'papier')}</div>
      <p class="tip"><b>Astuce</b> Vérifiez la barre sur chaque feuille : les imprimantes changent parfois l'échelle quand on change de papier.</p>`,
  },
  {
    id: 'decouper', n: 'Découper aux ciseaux', time: '10 min', s: [2.02, 2.98], dur: 7, cam: [[MAT_X, 4, MAT_Z0 + 150], MAT_W * 0.58, 62, 0.06],
    html: `<ol>
        <li>Coupez <b>au milieu du trait plein</b> : il est le bord exact de la pièce.</li>
        <li>Dans les angles du toit de la façade et du pignon, coupez droit jusqu'au sommet : <b>un seul trait</b> par côté.</li>
        <li>Les ouvertures (porte, fenêtres, fentes) restent pleines : on les piquera à travers le papier, puis on les découpera dans la terre.</li>
      </ol>
      <div class="cfg">${row('A · façade', `${f1(LW)} × ${f1(HH)} mm`, 'papier')}${row('B · pignon', `${f1(LW)} × ${f1(HH)} mm`, 'papier')}${row('C · murs ×2', `${f1(LWALL)} × ${f1(HW)} mm`, 'papier')}${row('D · toit ×2', `${f1(RWP)} × ${f1(RHP)} mm`, 'papier')}</div>
      <p class="tip"><b>Bonne pratique</b> Des ciseaux plutôt qu'un cutter : pas de lame qui dérape sur la table, et le bord reste net, sans bavure de papier qui fausserait le tracé.</p>`,
  },
  {
    id: 'abaisser', n: 'Abaisser la plaque', time: '10 min', s: [3.02, 3.98], dur: 7, cam: [SC, 255, 54, 0.24],
    html: `<ol>
        <li>Tapez ≈ ${CLAY_G} g d'argile en galette, à la paume.</li>
        <li>Roulez du centre vers les bords, entre les deux réglettes de <b>${f1(E)} mm</b>. Décollez et retournez la plaque entre deux passes, jusqu'à ce que le rouleau porte sur les réglettes.</li>
        <li>Lissez les deux faces à l'éponge ou à l'estèque : la terre fendra moins aux bords.</li>
        <li>Laissez raffermir dix minutes : la plaque se tient sans s'affaisser quand on la découpe.</li>
      </ol>
      <div class="cfg">${row('Plaque', mm(E), 'crue')}${row('Une fois finie', mm(CFG.e), 'cuite')}${row('Surface utile', `${f0(SLAB_W)} × ${f0(SLAB_D)} mm`)}</div>`,
  },
  {
    id: 'tracer', n: 'Tracer', time: '10 min', s: [4.02, 4.98], dur: 7, cam: [SC, 255, 58, 0.1],
    html: `<ol>
        <li>Posez les six gabarits sur la plaque et lissez-les du plat de la main : l'humidité les plaque.</li>
        <li>Suivez chaque bord à l'aiguille <b>tenue verticale</b>, d'un seul geste par contour. Inclinée, elle taille un chant en biais qui se soudera mal.</li>
        <li>À travers le papier, <b>piquez les ouvertures</b> : un petit trou tous les 4 ou 5 mm sur chaque contour (porte, fenêtres, fentes).</li>
      </ol>
      <p class="tip"><b>Astuce</b> Les cotes des gabarits sont crues : le retrait de ${f0(CFG.sh)} % est déjà compris. Les pièces ne se recoupent jamais ; gardez 5 mm entre elles, la chute servira au colombin.</p>`,
  },
  {
    id: 'degager', n: 'Dégager', time: '5 min', s: [5.02, 5.98], dur: 6, cam: [SC, 255, 56, 0.14],
    html: `<ol>
        <li>Décollez les gabarits par un coin et gardez-les : ils serviront à contrôler les cotes au montage.</li>
        <li>Retirez la terre autour des pièces <b>sans les soulever</b> ; la chute retourne au pain, dans un sac fermé.</li>
        <li>Laissez les six pièces à plat, chacune à sa place.</li>
      </ol>`,
  },
  {
    id: 'ouvertures', n: 'Découper les ouvertures', time: '15 min', s: [6.02, 6.98], dur: 8, cam: [SC, 255, 62, 0.08],
    html: `<ol>
        <li>Reliez les piqûres à l'aiguille : chaque ouverture est un trait fermé.</li>
        <li>Les petits ronds se prélèvent à l'<b>emporte-pièce</b> ou à la paille. Pour la porte, la fenêtre carrée et les fentes : cutter, lame bien verticale.</li>
        <li>Poussez le bouchon vers le haut, lissez le bord du doigt.</li>
      </ol>
      <div class="cfg">${row('Porte', `${f1(DW_DOOR)} × ${f1(HW * 0.5)} mm`, 'crue')}${row('4 fenêtres rondes', `Ø ${f1(D_WIN)} mm`, 'crue')}${row('Fenêtre carrée', `${f1(W_SQ)} mm`, 'crue')}${row('Œil-de-bœuf', `Ø ${f1(D_OEIL)} mm`, 'crue')}${row('Fentes ×3 par mur', `${f1(W_SLIT)} × ${f1(H_SLIT)} mm`, 'crue')}</div>
      <p class="tip"><b>Avant de sécher</b> Découpez les ouvertures <b>maintenant</b> : la terre sèche se fendrait au cutter, et elles rétrécissent avec la pièce.</p>`,
  },
  {
    id: 'raffermir', n: 'Raffermir à plat', time: '2 à 4 h', s: [7.02, 7.98], dur: 6, cam: [SC, 255, 50, 0.2],
    html: `<p class="lead">Les pièces plates gauchissent : on les laisse prendre du corps <b>à plat</b> avant de les assembler.</p>
      <ol>
        <li>Posez-les sur une toile, sous un plastique léger, ou entre deux planchettes sous un petit poids.</li>
        <li>Retournez-les une fois, à mi-parcours.</li>
        <li>Elles sont prêtes quand la terre se tient et que l'ongle marque encore : c'est la consistance <b>cuir</b>.</li>
      </ol>
      <div class="cfg">${row('Largeur de la maison', mm(C.cuir.l), 'cuir')}${row('Hauteur du pignon', mm(C.cuir.H), 'cuir')}${row('Plaque', mm(C.cuir.e), 'cuir')}</div>
      <p class="note">À ce stade, ${f0(CFG.cuir)} % du retrait est déjà fait : les pièces mesurent un peu moins que leurs gabarits. C'est normal, elles s'assemblent toujours entre elles.</p>`,
  },
  {
    id: 'biseauter', n: 'Biseauter le toit', time: '10 min', s: [8.02, 8.98], dur: 6, cam: [[(MFLAT[4][12] + MFLAT[5][12] + RWP) / 2, 3, MFLAT[4][14] + RHP - 4], 105, 24, 0.12],
    html: `<ol>
        <li>Les deux pans du toit se rejoignent au faîtage : leur bord doit être <b>coupé en biseau</b>, à <b>${ANGD}°</b> (l'angle de votre toit).</li>
        <li>Au couteau, retirez la languette hachurée sur le <b>dessous</b> du bord de faîtage de chaque pan : ${f1(BEV_W)} mm de large pour la plaque de ${f1(E)} mm.</li>
        <li>Contrôlez en posant les deux pans bord à bord : ils doivent former un toit sans jour.</li>
      </ol>
      <div class="cfg">${row('Angle du toit', `${ANGD}°`)}${row('Languette retirée', mm(BEV_W), 'cuir')}${row('Pan de toit', `${f1(RWP)} × ${f1(RHP)} mm`, 'crue')}</div>
      <p class="tip"><b>Astuce</b> Taillez par petites passes en tirant le couteau vers vous. Un biseau trop gros ne se rattrape pas ; trop petit, il se reprend en deux secondes.</p>`,
  },
  {
    id: 'strier', n: 'Griffer, barbotiner', time: '10 min', s: [9.02, 9.98], dur: 6, cam: [SC, 255, 52, 0.18],
    html: `<p class="lead">Une jointure tient parce que <b>deux surfaces rugueuses et mouillées</b> s'accrochent. Une seule face griffée, et la soudure se décolle au séchage.</p>
      <ol>
        <li>Les pièces doivent avoir <b>la même consistance</b> (cuir) : une pièce plus sèche que l'autre ne se soude pas.</li>
        <li><b>Griffez les deux surfaces qui vont se toucher</b> : la tranche du mur <b>et</b> la zone de la face du pignon où elle se posera (une bande de ${f1(C.cuir.e)} mm). À l'aiguille ou au strieur, en croisillons serrés, assez profonds pour accrocher.</li>
        <li><b>Barbotine épaisse</b> (consistance de crème), de la même terre, au pinceau sur <b>les deux surfaces griffées</b>, juste avant d'assembler.</li>
      </ol>
      <div class="cfg">${row('Bande à griffer sur le pignon', mm(C.cuir.e), 'cuir')}${row('Tranche courte d\u2019un mur', mm(C.cuir.e), 'cuir')}</div>
      <p class="tip"><b>Tout ce qui se touche se griffe des deux côtés</b> : tranches des murs et faces des pignons ; haut des pignons et des murs et dessous du toit ; biseaux de faîtage.</p>
      <p class="warn"><b>Attention</b> Pas de barbotine sur la face extérieure : elle laisserait un halo clair après séchage. Si elle déborde, essuyez à l'éponge humide.</p>`,
  },
  {
    id: 'monter', n: 'Monter les murs', time: '10 min', s: [10.02, 10.98], dur: 8, cam: [HC, 125 + HH * 0.7, 28, 0.55],
    html: `<ol>
        <li>Dressez la <b>façade A</b> et le <b>pignon B</b> face à face, à ${f1(C.cuir.p - 2 * C.cuir.e)} mm l'un de l'autre.</li>
        <li>Posez les <b>deux murs C entre eux</b>, tranches griffées et barbotinées : ils tombent juste contre chaque pignon.</li>
        <li>Pressez chaque angle avec un <b>petit va-et-vient</b> : la barbotine doit remonter en bourrelet le long de la jointure. Essuyez le surplus dehors, laissez-le dedans.</li>
        <li>Contrôlez à l'équerre, sans écraser les ouvertures.</li>
      </ol>
      <div class="cfg">${row('Entre les pignons', mm(C.cuir.p - 2 * C.cuir.e), 'cuir')}${row('Largeur', mm(C.cuir.l), 'cuir')}${row('Hauteur des murs', mm(C.cuir.h), 'cuir')}</div>
      <p class="tip"><b>Astuce</b> Montez sur la planchette où la maison restera : on ne la déplace plus avant le séchage complet.</p>`,
  },
  {
    id: 'colombin', n: 'Sceller au colombin', time: '15 min', s: [11.02, 11.98], dur: 6, cam: [HC, 105 + HH * 0.6, 55, 0.5],
    html: `<p class="lead">La barbotine colle ; <b>le colombin scelle</b>. Il comble la jointure et la fond dans les deux parois.</p>
      <ol>
        <li>Roulez des colombins de 3 mm de diamètre, de la hauteur des murs : un par angle intérieur.</li>
        <li>Posez-le dans l'angle, sur la barbotine fraîche, et écrasez-le au pouce <b>vers les deux parois</b> : il doit s'accrocher aux deux.</li>
        <li>Lissez à l'ébauchoir en tirant <b>de la jointure vers la pièce</b>, jusqu'à ce que la limite disparaisse. Sceller, c'est fondre.</li>
        <li>Dehors, rebouchez d'un trait de barbotine et lissez : plus aucune ligne ne doit se voir.</li>
      </ol>
      <p class="tip"><b>Astuce</b> Un colombin trop sec craque : roulez-le juste avant, sur une toile humide, avec la même terre que les pièces.</p>`,
  },
  {
    id: 'toit', n: 'Poser le toit', time: '10 min', s: [12.02, 12.98], dur: 7, cam: [HC, 130 + HH * 0.7, 22, 0.6],
    html: `<ol>
        <li>Striez et barbotinez le dessus des pignons et des murs, là où le toit va reposer.</li>
        <li>Posez un premier pan, le biseau vers le haut, puis le second : les deux biseaux se rejoignent en <b>faîtage</b>.</li>
        <li>Pressez doucement le long du faîtage, soudez-le à la barbotine et lissez. Le toit déborde de ${f1(C.cuir.d)} mm sur les pignons et les murs.</li>
      </ol>
      <div class="cfg">${row('Angle du toit', `${ANGD}°`)}${row('Débord', mm(C.cuir.d), 'cuir')}${row('Hauteur totale', mm(C.cuir.H), 'cuir')}</div>
      <p class="tip"><b>Astuce</b> Un petit colombin sous chaque pan, contre les murs, rend le toit plus solide et le soulage pendant le séchage.</p>`,
  },
  {
    id: 'lisser', n: 'Lisser', time: '10 min', s: [13.02, 13.98], dur: 6, cam: [HC, 130 + HH * 0.7, 20, 0.35],
    html: `<ol>
        <li>Éponge bien essorée sur toute la maison : les traces de doigts et le surplus de barbotine disparaissent.</li>
        <li>Passez un doigt humide sur le bord de chaque ouverture : l'arête vive casserait au premier choc.</li>
        <li>Vérifiez que la maison tient d'aplomb sur sa planchette, sans fond : elle ne repose que sur ses quatre murs.</li>
      </ol>`,
  },
  {
    id: 'secher', n: 'Sécher, allumer', time: '24 à 72 h', s: [14.02, 14.98], dur: 8, cam: [HC, 105 + HH * 0.7, 14, 0.4],
    html: `<ol>
        <li>Séchez lentement, <b>sous un plastique ouvert</b> le premier jour, puis à l'air. Un séchage trop vif fait fendre les angles.</li>
        <li>Terre à cuire : biscuit, puis émail éventuel, selon votre terre ; autodurcissante : vernis ou peinture, si vous le souhaitez.</li>
        <li>Soulevez la maison et glissez une <b>bougie LED</b> dessous : la lumière sort par la porte, les fenêtres et les fentes.</li>
      </ol>
      <div class="cfg">${row('Montée', dims3(C.crue), 'crue')}${row('À l’assemblage', dims3(C.cuir), 'cuir')}${row('Finie', dims3(C.cuite), 'cuite')}</div>
      <p class="note">Si votre maison finie mesure autre chose que ${f0(CFG.l)} mm de large, mesurez le retrait réel de cette terre et reportez-le dans l'outil : la prochaine tombera juste.</p>`,
  },
];

/* ─────────────── les étapes en anglais ───────────────
   Même id, mêmes variables : seuls le titre, la durée et le texte changent. Le français reste la source. */
var EN_STEPS = {
  'ma-maison': {
    n: 'My house',
    html: `<p class="lead">The tutorial follows <b>your</b> house: every dimension below is recalculated for your clay, and given at the stage where you measure it.</p>
      <div class="cfg">${row('House', dims3(C.cuite), 'cuite')}${row('Walls · roof', `${f1(CFG.h)} · ${f1(CFG.r)} mm`)}${row('Roof overhang', mm(CFG.d))}
      ${row('Total shrinkage of your clay', `${f0(CFG.sh)} %`)}${row('Shrinkage already done at leather-hard', `${f0(CFG.cuir)} %`)}${row('Slab', mm(E), 'crue')}</div>
      <div class="states">
        <div><i>raw</i><b>${f1(C.crue.l)}</b><small>we cut, we build</small></div>
        <div><i>leather-hard</i><b>${f1(C.cuir.l)}</b><small>we assemble</small></div>
        <div><i>finished</i><b>${f0(C.cuite.l)}</b><small>we light it</small></div>
      </div>
      <p class="note">The three numbers are the width of the house. Total shrinkage is drying (plus firing, if your clay is fired): from wet clay to the finished piece. The templates are already enlarged by the shrinkage: don't correct anything by eye.</p>
      <h3>You will need</h3>
      <ul class="kit">
        <li><em>paper</em> the PDF of your templates (ordinary A4 sheets), scissors, glue stick</li>
        <li><em>clay</em> ≈ ${CLAY_G} g of clay (air-dry or fine stoneware), rolling pin, 2 guide strips of ${f1(E)} mm, canvas</li>
        <li><em>cutting</em> needle tool, craft knife, a small cutter or a straw for the little rounds</li>
        <li><em>assembly</em> scoring tool, slip, brush, sponge, two small boards for flat drying</li>
        <li><em>light</em> an LED tea light (the house has no base: it stands over it)</li>
      </ul>
      <p class="note">Allow 1 h 30 of work, then 2 to 4 h of firming up before assembly.</p>`,
  },
  'imprimer': {
    n: 'Print',
    html: `<ol>
        <li>Download the PDF of your templates from the tool and print all its sheets on <b>ordinary paper</b>: the six pieces are in it.</li>
        <li>In the print dialog: <b>actual size</b>, “fit to page” unchecked.</li>
        <li>Lay the ruler on the <b>check bar</b> printed on each sheet: exactly <b>50 mm</b>. At 48 mm, the whole house would come out 4% too small: print again.</li>
      </ol>
      <div class="cfg">${row('Check bar', '50.0 mm', 'papier')}</div>
      <p class="tip"><b>Tip</b> Check the bar on every sheet: printers sometimes change the scale when you change paper.</p>`,
  },
  'decouper': {
    n: 'Cut with scissors',
    html: `<ol>
        <li>Cut <b>along the middle of the solid line</b>: it is the exact edge of the piece.</li>
        <li>At the roof corners of the front and the back gable, cut straight up to the peak: <b>one single cut</b> per side.</li>
        <li>The openings (door, windows, slits) stay solid: you'll prick them through the paper, then cut them out of the clay.</li>
      </ol>
      <div class="cfg">${row('A · front', `${f1(LW)} × ${f1(HH)} mm`, 'papier')}${row('B · back gable', `${f1(LW)} × ${f1(HH)} mm`, 'papier')}${row('C · walls ×2', `${f1(LWALL)} × ${f1(HW)} mm`, 'papier')}${row('D · roof ×2', `${f1(RWP)} × ${f1(RHP)} mm`, 'papier')}</div>
      <p class="tip"><b>Good practice</b> Scissors rather than a craft knife: no blade slipping on the table, and the edge stays clean, with no paper burr to spoil the tracing.</p>`,
  },
  'abaisser': {
    n: 'Roll the slab',
    html: `<ol>
        <li>Pat ≈ ${CLAY_G} g of clay into a cake with your palm.</li>
        <li>Roll from the centre to the edges, between the two <b>${f1(E)} mm</b> guide strips. Lift and turn the slab over between passes, until the rolling pin rides on the strips.</li>
        <li>Smooth both faces with a sponge or a rib: the clay will crack less at the edges.</li>
        <li>Let it firm up for ten minutes: the slab holds itself when you cut it.</li>
      </ol>
      <div class="cfg">${row('Slab', mm(E), 'crue')}${row('Once finished', mm(CFG.e), 'cuite')}${row('Usable area', `${f0(SLAB_W)} × ${f0(SLAB_D)} mm`)}</div>`,
  },
  'tracer': {
    n: 'Trace',
    html: `<ol>
        <li>Lay the six templates on the slab and smooth them with the flat of your hand: the moisture holds them down.</li>
        <li>Follow each edge with the needle <b>held vertical</b>, in a single gesture per outline. Tilted, it cuts a slanted edge that will join badly.</li>
        <li>Through the paper, <b>prick the openings</b>: one small hole every 4 or 5 mm along each outline (door, windows, slits).</li>
      </ol>
      <p class="tip"><b>Tip</b> The template dimensions are raw: the ${f0(CFG.sh)}% shrinkage is already included. Pieces never overlap; keep 5 mm between them, the offcut will serve for coils.</p>`,
  },
  'degager': {
    n: 'Clear',
    html: `<ol>
        <li>Peel the templates off by a corner and keep them: they'll help check dimensions during assembly.</li>
        <li>Remove the clay around the pieces <b>without lifting them</b>; the offcut goes back to the lump, in a closed bag.</li>
        <li>Leave the six pieces flat, each in its place.</li>
      </ol>`,
  },
  'ouvertures': {
    n: 'Cut the openings',
    html: `<ol>
        <li>Join the pricks with the needle: each opening is a closed line.</li>
        <li>The little rounds come out with a small <b>cutter</b> or a straw. For the door, the square window and the slits: craft knife, blade kept vertical.</li>
        <li>Push the plug out upward, smooth the edge with a finger.</li>
      </ol>
      <div class="cfg">${row('Door', `${f1(DW_DOOR)} × ${f1(HW * 0.5)} mm`, 'crue')}${row('4 round windows', `Ø ${f1(D_WIN)} mm`, 'crue')}${row('Square window', `${f1(W_SQ)} mm`, 'crue')}${row('Round gable window', `Ø ${f1(D_OEIL)} mm`, 'crue')}${row('Slits ×3 per wall', `${f1(W_SLIT)} × ${f1(H_SLIT)} mm`, 'crue')}</div>
      <p class="tip"><b>Before drying</b> Cut the openings <b>now</b>: dry clay would crack under the knife, and they shrink with the piece.</p>`,
  },
  'raffermir': {
    n: 'Firm up flat',
    html: `<p class="lead">Flat pieces warp: let them firm up <b>flat</b> before assembling.</p>
      <ol>
        <li>Lay them on canvas, under light plastic, or between two small boards under a small weight.</li>
        <li>Turn them over once, halfway.</li>
        <li>They are ready when the clay holds and a fingernail still marks it: <b>leather-hard</b>.</li>
      </ol>
      <div class="cfg">${row('Width of the house', mm(C.cuir.l), 'cuir')}${row('Gable height', mm(C.cuir.H), 'cuir')}${row('Slab', mm(C.cuir.e), 'cuir')}</div>
      <p class="note">At this stage, ${f0(CFG.cuir)}% of the shrinkage is already done: the pieces are a little smaller than their templates. That's normal, they still fit one another.</p>`,
  },
  'biseauter': {
    n: 'Bevel the roof',
    html: `<ol>
        <li>The two roof panels meet at the ridge: their edge must be <b>bevelled</b>, at <b>${ANGD}°</b> (the angle of your roof).</li>
        <li>With a knife, remove the hatched strip from the <b>underside</b> of the ridge edge of each panel: ${f1(BEV_W)} mm wide for the ${f1(E)} mm slab.</li>
        <li>Check by laying the two panels edge to edge: they must make a roof with no gap.</li>
      </ol>
      <div class="cfg">${row('Roof angle', `${ANGD}°`)}${row('Strip removed', mm(BEV_W), 'cuir')}${row('Roof panel', `${f1(RWP)} × ${f1(RHP)} mm`, 'crue')}</div>
      <p class="tip"><b>Tip</b> Trim in small passes, pulling the knife towards you. A bevel that is too big can't be fixed; too small, it takes two seconds to redo.</p>`,
  },
  'strier': {
    n: 'Score, apply slip',
    html: `<p class="lead">A joint holds because <b>two rough, wet surfaces</b> grip each other. Score only one face and the weld lets go as it dries.</p>
      <ol>
        <li>The pieces must be at <b>the same consistency</b> (leather-hard): a piece drier than the other won't weld.</li>
        <li><b>Score both surfaces that will touch</b>: the end of the wall <b>and</b> the area of the gable face where it will sit (a ${f1(C.cuir.e)} mm strip). With a needle or scoring tool, in tight cross-hatching, deep enough to grip.</li>
        <li><b>Thick slip</b> (cream consistency) made of the same clay, brushed onto <b>both scored surfaces</b>, just before joining.</li>
      </ol>
      <div class="cfg">${row('Strip to score on the gable', mm(C.cuir.e), 'cuir')}${row('Short end of a wall', mm(C.cuir.e), 'cuir')}</div>
      <p class="tip"><b>Everything that touches is scored on both sides</b>: wall ends and gable faces; top of the gables and walls and the underside of the roof; ridge bevels.</p>
      <p class="warn"><b>Careful</b> No slip on the outer face: it would leave a pale halo after drying. If it overflows, wipe it with a damp sponge.</p>`,
  },
  'monter': {
    n: 'Build the walls',
    html: `<ol>
        <li>Stand the <b>front A</b> and the <b>back gable B</b> facing each other, ${f1(C.cuir.p - 2 * C.cuir.e)} mm apart.</li>
        <li>Set the <b>two walls C between them</b>, scored and slipped ends: they fit exactly against each gable.</li>
        <li>Press each corner with a <b>small back-and-forth motion</b>: the slip must rise as a bead along the joint. Wipe the surplus outside, leave it inside.</li>
        <li>Check with a square, without crushing the openings.</li>
      </ol>
      <div class="cfg">${row('Between the gables', mm(C.cuir.p - 2 * C.cuir.e), 'cuir')}${row('Width', mm(C.cuir.l), 'cuir')}${row('Wall height', mm(C.cuir.h), 'cuir')}</div>
      <p class="tip"><b>Tip</b> Build on the board where the house will stay: it isn't moved again before it is completely dry.</p>`,
  },
  'colombin': {
    n: 'Seal with a coil',
    time: '15 min',
    html: `<p class="lead">Slip glues; <b>a coil seals</b>. It fills the joint and blends it into both walls.</p>
      <ol>
        <li>Roll 3 mm coils, as tall as the walls: one per inside corner.</li>
        <li>Lay it in the corner, on the fresh slip, and press it with your thumb <b>towards both walls</b>: it must grip both.</li>
        <li>Smooth with a tool, pulling <b>from the joint towards the piece</b>, until the boundary disappears. Sealing means blending.</li>
        <li>Outside, fill with a stroke of slip and smooth: no line should remain visible.</li>
      </ol>
      <p class="tip"><b>Tip</b> A dry coil cracks: roll it just before use, on damp canvas, with the same clay as the pieces.</p>`,
  },
  'toit': {
    n: 'Set the roof',
    html: `<ol>
        <li>Score and slip the top of the gables and walls, where the roof will rest.</li>
        <li>Set a first panel, bevel up, then the second: the two bevels meet at the <b>ridge</b>.</li>
        <li>Press gently along the ridge, weld it with slip and smooth. The roof overhangs the gables and walls by ${f1(C.cuir.d)} mm.</li>
      </ol>
      <div class="cfg">${row('Roof angle', `${ANGD}°`)}${row('Overhang', mm(C.cuir.d), 'cuir')}${row('Total height', mm(C.cuir.H), 'cuir')}</div>
      <p class="tip"><b>Tip</b> A small coil under each panel, against the walls, makes the roof stronger and relieves it while it dries.</p>`,
  },
  'lisser': {
    n: 'Smooth',
    html: `<ol>
        <li>A well wrung-out sponge over the whole house: finger marks and surplus slip disappear.</li>
        <li>Run a damp finger around the edge of each opening: a sharp edge would chip at the first knock.</li>
        <li>Check that the house stands upright on its board, with no base: it rests only on its four walls.</li>
      </ol>`,
  },
  'secher': {
    n: 'Dry, light up',
    time: '24 to 72 h',
    html: `<ol>
        <li>Dry slowly, <b>under open plastic</b> on the first day, then in the air. Drying too fast cracks the corners.</li>
        <li>Fired clay: bisque, then glaze if you like, depending on your clay; air-dry clay: varnish or paint, if you wish.</li>
        <li>Lift the house and slide an <b>LED tea light</b> under it: the light comes out through the door, the windows and the slits.</li>
      </ol>
      <div class="cfg">${row('Built', dims3(C.crue), 'crue')}${row('At assembly', dims3(C.cuir), 'cuir')}${row('Finished', dims3(C.cuite), 'cuite')}</div>
      <p class="note">If your finished house measures anything other than ${f0(CFG.l)} mm wide, measure the real shrinkage of this clay and enter it in the tool: the next one will be spot on.</p>`,
  },
};

/* ─────────────── accès : acheté, ou aperçu ───────────────
   Le tutoriel vit à côté de l'outil (même origine) : il lit les achats que l'outil enregistre.
   Sans achat, les trois premières étapes restent ouvertes, la suite renvoie à la fiche produit. */
const PRODUCT = `../?lang=${LANG}#produit/maison-lumineuse`;   // l'atelier s'ouvre dans la langue du tutoriel
const UNLOCK = tr('Débloquer · 3,99 €', 'Unlock · €3.99');
// le bouton FR / EN : la langue est celle de l'atelier (même origine), donc on l'y écrit puis on recharge
function setLang(l) {
  if (l === LANG) return;
  const u = new URL(location.href); u.searchParams.delete('lang');
  try { const p = JSON.parse(localStorage.getItem('atelier-prefs') || '{}'); p.lang = l; localStorage.setItem('atelier-prefs', JSON.stringify(p)); }
  catch (e) { u.searchParams.set('lang', l); }
  location.replace(u.href);
}
const OWNED = (() => { try { return !!(JSON.parse(localStorage.getItem('atelier-owned') || '{}')['maison-lumineuse']) || new URLSearchParams(location.search).has('owned'); } catch (e) { return false; } })();
if (typeof EN_STEPS !== 'undefined' && LANG === 'en') for (const st of STEPS) { const e = EN_STEPS[st.id]; if (e) Object.assign(st, e); }
const ALL = STEPS.slice();
const FREE = 3;
if (!OWNED) {
  STEPS.length = FREE;
  STEPS.push({
    id: 'suite', n: tr('La suite du tutoriel', 'The rest of the tutorial'), time: '', s: [15, 15], dur: 0.1, spin: true, lock: true, cam: ALL[0].cam,
    html: tr(`<p class="lead">Vous venez de voir le début. Les <b>${ALL.length - FREE} étapes suivantes</b> sont incluses avec le gabarit :</p>
      <ul class="kit">${ALL.slice(FREE).map(x => `<li>${x.n}</li>`).join('')}</ul>
      <p class="note">Gabarits A, B, C et D recalculés à vos cotes, plus ce tutoriel en entier. Achat unique, sur Gumroad.</p>`,
      `<p class="lead">That was the beginning. The <b>${ALL.length - FREE} steps that follow</b> are included with the template:</p>
      <ul class="kit">${ALL.slice(FREE).map(x => `<li>${x.n}</li>`).join('')}</ul>
      <p class="note">Templates A, B, C and D, recalculated to your dimensions, plus this whole tutorial. One-time purchase, on Gumroad.</p>`),
  });
}

/* ─────────────── page ─────────────── */

const root = document.documentElement;
const canvas = $('#scene');
paintGrain();
function paintGrain() {   // grain du fond de page (tuile PNG générée)
  const N = 160, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d'), img = x.createImageData(N, N);
  for (let i = 0; i < N * N; i++) { const v = Math.random() < 0.5 ? 35 : 255; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = Math.random() * 16; }
  x.putImageData(img, 0, 0);
  document.body.style.setProperty('--grain', `url(${c.toDataURL('image/png')})`);
}
{
  const N = STEPS.length - 1;
  $('[data-kind]').textContent = tr('maison lumineuse', 'light-up house');
  root.lang = LANG;
  document.title = tr('Tutoriel · Maison lumineuse · Gabarits Céramique', 'Tutorial · Light-up house · Gabarits Céramique');
  $('.bar__back').innerHTML = `<span aria-hidden="true">←</span><span class="bar__bt"> ${tr('Mon gabarit', 'My template')}</span>`;
  $('.bar__back').setAttribute('aria-label', tr('Mon gabarit', 'My template'));
  $('.bar__title b').textContent = tr('Maison lumineuse', 'Light-up house');
  $('#rail').setAttribute('aria-label', tr('Étapes du tutoriel', 'Tutorial steps'));
  $('#rail p').textContent = tr('Tutoriel', 'Tutorial');
  $('.hint').textContent = tr('glisser sur la scène pour tourner autour · ← → pour changer d\'étape', 'drag the scene to orbit · ← → to change step');
  $('.dock').setAttribute('aria-label', 'Navigation');
  $('[data-prev]').setAttribute('aria-label', tr('Étape précédente', 'Previous step'));
  $('[data-next]').setAttribute('aria-label', tr('Étape suivante', 'Next step'));
  $('[data-replay]').setAttribute('aria-label', tr('Revoir le geste', 'Replay the gesture'));
  $$('.bar__lang [data-lang]').forEach(b => {
    b.classList.toggle('on', b.dataset.lang === LANG); b.setAttribute('aria-pressed', b.dataset.lang === LANG);
    b.addEventListener('click', () => setLang(b.dataset.lang));
  });
  $('[data-cfg]').textContent = `${f0(CFG.l)} × ${f0(CFG.p)} × ${f0(CFG.h + CFG.r)} mm · ${tr('retrait', 'shrinkage')} ${f0(CFG.sh)} %${CFG.clamped ? tr(' · cotes ramenées à la plage du tutoriel', ' · dimensions brought back within the tutorial range') : ''}`;
  $('#rail ol').innerHTML = (OWNED ? STEPS : ALL).map((st, i) => {
    const lk = !OWNED && i >= FREE;
    return `<li><a href="#${lk ? 'suite' : st.id}" data-go="${lk ? FREE : i}"${lk ? ' class="lock"' : ''}><span>${i ? String(i).padStart(2, '0') : '·'}</span>${st.n}${lk ? ' <i>🔒</i>' : ''}</a></li>`;
  }).join('');
  $('.bar__back').href = PRODUCT;
  const pdf = $('.bar__pdf'); pdf.textContent = OWNED ? tr('Mes gabarits', 'My templates') : UNLOCK; pdf.href = PRODUCT; pdf.removeAttribute('download');
  $('#steps').innerHTML = STEPS.map((st, i) => `
    <section class="step" id="${st.id}" data-i="${i}">
      <article class="card">
        <p class="card__num">${st.lock ? tr('Inclus avec le gabarit', 'Included with the template') : i ? `${tr('Étape', 'Step')} ${String(i).padStart(2, '0')} / ${ALL.length - 1}` : tr('Avant de commencer', 'Before you start')}${st.time ? `<span>${st.time}</span>` : ''}</p>
        <h2>${st.n}</h2>
        ${st.html}
        <div class="card__nav">
          ${i && !st.lock ? `<button class="btn btn--ghost" type="button" data-replay>${tr('Revoir le geste', 'Replay the gesture')}</button>` : ''}
          ${st.lock ? `<a class="btn btn--primary" href="${PRODUCT}">${UNLOCK}</a>`
            : i < N ? `<button class="btn btn--primary" type="button" data-go="${i + 1}">${i ? tr('Étape suivante', 'Next step') : tr('Commencer', 'Start')} →</button>` : `<a class="btn btn--primary" href="#ma-maison" data-go="0">${tr('Revenir au début', 'Back to the start')}</a>`}
        </div>
      </article>
    </section>`).join('');
}
const sections = $$('.step');

/* ─────────────── image ─────────────── */

// Zone de l'écran réservée à la scène (fractions : gauche, haut, droite, bas)
let FRAME_OVR = null, CAM_OVR = null;
let cw = 1, chh = 1;
function frameRect() {
  if (FRAME_OVR) return FRAME_OVR;
  if (cw >= 1000) { const l = ($('#steps').getBoundingClientRect().right + 16) / cw; return [Math.min(0.62, l), 0.1, 0.98, 0.96]; }
  return [0.03, 0.075, 0.97, 0.44];
}

/* ─────────────── lecteur : une étape = une animation ─────────────── */

let cur = -1, tStep = 1, playing = false, sT = 15, sC = 15, orbit = 0, orbitV = 0, dragging = false, orbitBack = false;
const camNow = { tg: [...STEPS[0].cam[0]], rad: STEPS[0].cam[1], el: STEPS[0].cam[2] * DEG, az: STEPS[0].cam[3] };
const player = {
  go(i, how = 'scroll') {
    i = clamp(i, 0, STEPS.length - 1);
    if (how === 'scroll') { sections[i].scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }); return; }
    if (i === cur) return;
    const prev = cur; cur = i;
    const S = STEPS[i];
    tStep = 0; playing = true;
    if (prev < 0 || Math.abs(i - prev) > 1) sC = S.s[0];     // saut lointain : on ne rejoue pas tout le film
    sT = S.s[0];
    CAM_OVR = S.cam || null;
    orbitV = 0; orbitBack = true;
    $$('#rail a').forEach((a, k) => { a.classList.toggle('on', k === i); a.classList.toggle('done', k < i); });
    $('[data-dock-n]').textContent = S.lock ? '🔒' : i ? `${String(i).padStart(2, '0')} / ${ALL.length - 1}` : '·';
    $('[data-dock-name]').textContent = S.n;
    $('.progress i').style.transform = `scaleX(${i / (STEPS.length - 1)})`;
    if (history.replaceState) history.replaceState(null, '', location.search + '#' + S.id);
    kick();
  },
  replay() { const S = STEPS[cur]; tStep = 0; playing = true; sC = sT = S.s[0]; kick(); },
};
let settle = 0, noPick = false;
function pickStep() {
  if (noPick) return;   // l'étape active est celle qui occupe le milieu de l'écran, qu'on y soit venu au clic ou au défilement
  const mid = innerHeight * (cw >= 1000 ? 0.45 : 0.62);
  let best = 0;
  sections.forEach((el, k) => { if (el.getBoundingClientRect().top <= mid) best = k; });
  player.go(best, 'set');
}
addEventListener('scroll', () => { clearTimeout(settle); settle = setTimeout(pickStep, 90); }, { passive: true });
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if (g) { e.preventDefault(); player.go(+g.dataset.go, 'scroll'); return; }
  if (e.target.closest('[data-replay]')) player.replay();
  if (e.target.closest('[data-prev]')) player.go(cur - 1, 'scroll');
  if (e.target.closest('[data-next]')) player.go(cur + 1, 'scroll');
});
addEventListener('keydown', e => {
  if (e.target.closest('input, textarea')) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); player.go(cur + 1, 'scroll'); }
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); player.go(cur - 1, 'scroll'); }
});

const GLR = (() => { try { return createGL(canvas); } catch (e) { console.warn(e); return null; } })();
if (!GLR) root.classList.add('no-gl');

function camera() {
  const mob = cw < 900, c = CAM_OVR || STEPS[Math.max(0, cur)].cam;
  const k = 1 - Math.exp(-0.12 * 3);                          // approche douce vers la cible de l'étape (à chaque image)
  const tg = c[0], rad = c[1] * (mob ? 1.15 : 1), el = c[2] * DEG, az = c[3];
  camNow.tg = camNow.tg.map((v, j) => v + (tg[j] - v) * camK); camNow.rad += (rad - camNow.rad) * camK; camNow.el += (el - camNow.el) * camK; camNow.az += (az - camNow.az) * camK;
  void k;
  const fr = frameRect(), asp = cw / chh, fw = fr[2] - fr[0], fh = fr[3] - fr[1];
  const Dst = camNow.rad / (Math.tan(FOV / 2) * Math.min(fh, fw * asp));
  const a = camNow.az + orbit, e = F.eye;
  e[0] = camNow.tg[0] + Dst * Math.cos(camNow.el) * Math.sin(a); e[1] = camNow.tg[1] + Dst * Math.sin(camNow.el); e[2] = camNow.tg[2] + Dst * Math.cos(camNow.el) * Math.cos(a);
  perspective(Pm, FOV, asp, Dst * 0.05, Dst * 12, fr[0] + fr[2] - 1, 1 - fr[1] - fr[3]);
  lookAt(Vm, e, camNow.tg);
  mul(F.VP, Pm, Vm);
}
let camK = 0.1, camForce = false;

/* ─────────────── boucle (à la demande) ─────────────── */

let last = 0, raf = 0, first = true;
let dpr = Math.min(devicePixelRatio || 1, 2), slow = 0, frames = 0, base = 1;
const wrapA = a => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));
function kick() { if (!raf && GLR) raf = requestAnimationFrame(frame); }
function frame(now) {
  raf = 0;
  const iv = last ? (now - last) / 1000 : 0, dt = iv ? Math.min(0.05, iv) : 0.016; last = now;
  const ease = rate => REDUCED ? 1 : 1 - Math.exp(-dt * rate);
  let moving = false;
  const S = STEPS[Math.max(0, cur)];
  if (playing) {                                         // l'animation de l'étape avance d'elle-même
    tStep = REDUCED ? 1 : Math.min(1, tStep + dt / S.dur);
    sT = lerp(S.s[0], S.s[1], sm(0, 1, tStep));
    if (tStep >= 1) playing = false;
    moving = true;
  }
  if (Math.abs(sT - sC) > 1e-4) { sC += (sT - sC) * ease(7); moving = true; } else sC = sT;
  camK = camForce ? 1 : ease(3.2);
  if (dragging) moving = true;
  else if (Math.abs(orbitV) > 0.01) { orbit += orbitV * dt; orbitV *= Math.exp(-dt * 3); moving = true; }
  else if (S.spin && !REDUCED) { orbit += dt * 0.25; moving = true; }
  else if (orbitBack && Math.abs(orbit) > 1e-3) { orbit -= wrapA(orbit) * ease(3); if (Math.abs(wrapA(orbit)) < 1e-3) { orbit = 0; orbitBack = false; } moving = true; }
  if (Math.abs(camNow.rad - (CAM_OVR || S.cam)[1]) > 0.5) moving = true;
  camera();
  compose(story(sC));
  GLR.draw(F);
  if (first) { first = false; root.classList.add('gl-ready'); }
  if (iv && document.visibilityState === 'visible') {
    base = Math.min(base, iv); frames++; if (iv > base * 1.7) slow++;
    if (frames >= 60) { if (slow > 40 && dpr > 1) { dpr = Math.max(1, dpr * 0.85); resize(); } frames = slow = 0; }
  }
  if (moving) kick(); else last = 0;
}

/* ─────────────── interface ─────────────── */

let lastX = 0, lastT = 0;   // glisser sur la scène pour tourner autour, à toutes les étapes
canvas.addEventListener('pointerdown', e => { dragging = true; orbitV = 0; orbitBack = false; lastX = e.clientX; lastT = e.timeStamp; canvas.setPointerCapture(e.pointerId); kick(); });
canvas.addEventListener('pointermove', e => {
  if (!dragging) return;
  const dx = -(e.clientX - lastX) * 0.006, dtm = Math.max(8, e.timeStamp - lastT) / 1000;
  orbit += dx; orbitV = lerp(orbitV, dx / dtm, 0.5); lastX = e.clientX; lastT = e.timeStamp; kick();
});
const release = () => { if (!dragging) return; dragging = false; kick(); };
canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
function resize() {
  cw = innerWidth; chh = innerHeight;
  const W = Math.round(canvas.clientWidth * dpr), H = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  kick();
}
addEventListener('resize', resize);
if (document.fonts) {
  const refont = () => { drawSheets(); if (GLR) PRINT.forEach((_, i) => GLR.refresh(i)); kick(); };
  document.fonts.addEventListener('loadingdone', refont);
  document.fonts.ready.then(refont);
}
drawSheets();
resize();
{
  const k = STEPS.findIndex(x => '#' + x.id === location.hash);
  if (k > 0) sections[k].scrollIntoView();
  pickStep();
}

// ?debug : __lp.step(i) fige l'étape i à la fin de son animation
if (new URLSearchParams(location.search).has('debug')) {
  window.__lp = {
    step(i, t = 1) { sections[i].scrollIntoView(); player.go(i, 'set'); tStep = t; playing = t < 1; sC = sT = lerp(STEPS[i].s[0], STEPS[i].s[1], sm(0, 1, t)); camForce = true; frame(performance.now()); frame(performance.now() + 16); camForce = false; return { cur, sC }; },
    shot(i, s) { this.step(i, 1); playing = false; tStep = 1; sC = sT = s; camForce = true; frame(performance.now()); frame(performance.now() + 16); camForce = false; return canvas.toDataURL('image/png'); },   // capture du canevas (même tâche : le tampon n'est pas conservé)
    at(s) { playing = false; tStep = 1; sC = sT = s; camForce = true; frame(performance.now()); frame(performance.now() + 16); camForce = false; return sC; },
    full(on = true) { noPick = on; FRAME_OVR = on ? [0.02, 0.02, 0.98, 0.98] : null; for (const q of ['#steps', '#rail', '.bar', '.dock', '.hint', '.progress']) { const el = $(q); if (el) el.style.display = on ? 'none' : ''; } camForce = true; frame(performance.now()); frame(performance.now() + 16); camForce = false; return [innerWidth, innerHeight]; },
    STEPS, C, CFG, PIECES, PAPER, SLAB_PK, get cur() { return cur; }, F, camNow,
  };
}

/* L'atelier (autre onglet) change de cotes : ce tutoriel se recharge avec les nouvelles, à la même étape. */
addEventListener('storage', e => {
  if (e.key === 'atelier-prefs' && e.newValue) {
    try { const l = JSON.parse(e.newValue).lang; if ((l === 'en' || l === 'fr') && l !== LANG) { const u = new URL(location.href); u.searchParams.delete('lang'); location.replace(u.href); } } catch (err) {}
    return;
  }
  if (e.key !== 'atelier-tuto-sync' || !e.newValue) return;
  try {
    const u = new URL(JSON.parse(e.newValue).url), cu = new URL(location.href);
    u.searchParams.delete('lang'); cu.searchParams.delete('lang');
    if (u.pathname === cu.pathname && u.search !== cu.search) { u.searchParams.set('lang', LANG); location.replace(u.pathname + u.search + location.hash); }
  } catch (err) {}
});
