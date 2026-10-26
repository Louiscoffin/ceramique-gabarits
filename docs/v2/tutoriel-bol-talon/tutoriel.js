/* Gabarits Céramique — tutoriel « bol-tasse à talon » dans l'outil, après achat (série Tasses, n°1b).
   Moteur 3D repris de la LP (lp-immersive/tuto-bol-talon) ; ici la page avance étape par étape,
   au clic comme au défilement, et toutes les cotes viennent de LA configuration achetée :
   ?d=64&h=39.5&r=12&cuir=40&e=4.5  (Ø et hauteur cuits en mm, retrait total %, part du retrait faite
   au cuir %, plaque crue en mm). Chaque cote est donnée à l'état où on la mesure : crue, cuir, cuite. */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const arc = t => Math.sin(Math.PI * t);
const fmt = (x, d = 1) => x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
const lerpV = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const hop = (a, b, t, h) => { const p = lerpV(a, b, t); p[1] += h * arc(t); return p; };

const DEG = Math.PI / 180;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FONT_MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
const FONT_TITRE = '"Bricolage Grotesque", "Helvetica Neue", Arial, sans-serif';
const FONT_TEXTE = 'Karla, "Helvetica Neue", Arial, sans-serif';

/* ─────────────── la tasse et sa feuille ─────────────── */

// Cotes de la pièce cuite (série Tasses, n°1b) : un cylindre posé sur un fond, un talon en rondelle dessous
const CFG = (() => {
  const q = new URLSearchParams(location.search);
  const num = (k, def, lo, hi) => { const v = parseFloat((q.get(k) || '').replace(',', '.')); return Number.isFinite(v) ? clamp(v, lo, hi) : def; };
  // fp / fc : feuilles de papier et de carton du PDF, comptées par l'outil (absentes : on reste général)
  const sheets = q.has('fc') ? { fp: Math.round(num('fp', 0, 0, 20)), fc: Math.round(num('fc', 1, 0, 20)) } : null;
  return { d: num('d', 64, 40, 110), h: num('h', 39.5, 30, 140), r: num('r', 12, 4, 20), cuir: num('cuir', 40, 0, 100), e: num('e', 4.5, 3, 8), sheets };
})();
const RETRAIT = CFG.r / 100, KR = 1 / (1 - RETRAIT);          // retrait TOTAL : séchage + cuisson
const CR = 1 - CFG.cuir / 100 * RETRAIT;                       // taille au cuir / taille crue (convention de l'outil V2)
const T = CFG.e, PT = 0.3;                                     // plaque crue, papier
const E_FIN = T * (1 - RETRAIT);                               // la même plaque, cuite
// la tasse cuite : talon de la hauteur d'une plaque, anneau de 3 mm de large, Ø du talon proportionnel au Ø
const FIN = { d: CFG.d, h: CFG.h, body: CFG.h - E_FIN, fo: CFG.d * 36 / 64, fi: CFG.d * 36 / 64 - 6 };
const VOL_CL = Math.round(Math.PI * ((FIN.d - 2 * E_FIN) / 2) ** 2 * (FIN.body - E_FIN) / 1e4);   // à ras bord
const D_RAW = FIN.d * KR, R_OUT = D_RAW / 2;     // Ø du fond = Ø extérieur de la tasse
const R_IN = R_OUT - T, R_MID = R_OUT - T / 2;
const BODY = FIN.body * KR;                      // fond + paroi, crus
const WALL_H = BODY - T;                         // la paroi est posée sur le fond
const BEV = T;                                   // biseaux à 45° : chacun mange une épaisseur
const L_MID = 2 * Math.PI * R_MID;               // circonférence médiane
const L_BAND = L_MID + BEV;                      // longueur du gabarit de paroi
const FO = FIN.fo / 2 * KR, FI = FIN.fi / 2 * KR;   // rondelle du talon
const MAND_L = Math.max(84, Math.ceil(WALL_H + 40)), R_MAND = R_IN - 0.15;         // tube PVC Ø 63 + journal

// Pièces sur la feuille A4 (mm, x vers la droite, y vers le bas)
const WALL = { x0: 14, y0: 22 };                 // la paroi est posée en long
const XR = WALL.x0 + WALL_H + 8;                // à droite de la paroi (plus large en version haute)
const DISC = { cx: Math.max(128, XR + R_OUT), cy: 64 };
const RING = { cx: Math.max(100, XR + FO), cy: 141 };
const W_C = [WALL.x0 + WALL_H / 2, WALL.y0 + L_BAND / 2], W_H = [WALL_H / 2, L_BAND / 2];
const SQ = [176, 252];                           // carré témoin de 20 mm

// Point du contour d'une pièce (même paramétrage que le shader). Ordre : paroi, fond, petit cercle, grand cercle
function rim(i, t, off = 0.6) {
  const th = t * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
  if (i === 1) return [DISC.cx + (R_OUT + off) * c, DISC.cy + (R_OUT + off) * s];
  if (i === 2) return [RING.cx + (FI - off) * c, RING.cy + (FI - off) * s];
  if (i === 3) return [RING.cx + (FO + off) * c, RING.cy + (FO + off) * s];
  const k = 1 / Math.max(Math.abs(c), Math.abs(s));
  return [W_C[0] + (W_H[0] + off) * c * k, W_C[1] + (W_H[1] + off) * s * k];
}

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

/* ─────────────── maillages ─────────────── */

/* Une plaque W × H d'épaisseur Tk (de z0 à z0 + Tk), découpée en N colonnes le long de u.
   Coordonnées « à plat » par sommet : u, v, hauteur dans l'épaisseur, face
   (0 dessous, 1 dessus, 2 et 3 chants le long de u, 4 et 5 extrémités). */
const FACE_N = [[0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1], [-1, 0, 0], [1, 0, 0]];
const FLAT = { uc: 0, k: 0, aNeg: 0, aPos: 0 };

function plate(W, H, Tk, N, z0 = 0) {
  const nv = (N + 1) * 8 + 8, flat = new Float32Array(nv * 4), idx = [];
  let n = 0;
  const V = (u, v, z, f) => { flat[n * 4] = u; flat[n * 4 + 1] = v; flat[n * 4 + 2] = z; flat[n * 4 + 3] = f; return n++; };
  const strip = b => { for (let i = 0; i < N; i++) { const a = b + i * 2; idx.push(a, a + 2, a + 3, a, a + 3, a + 1); } };
  for (const [z, f] of [[z0 + Tk, 1], [z0, 0]]) { const b = n; for (let i = 0; i <= N; i++) for (let j = 0; j < 2; j++) V(W * i / N, j * H, z, f); strip(b); }
  for (const [v, f] of [[0, 2], [H, 3]]) { const b = n; for (let i = 0; i <= N; i++) for (let k = 0; k < 2; k++) V(W * i / N, v, z0 + k * Tk, f); strip(b); }
  for (const [u, f] of [[0, 4], [W, 5]]) { const b = n; for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) V(u, j * H, z0 + k * Tk, f); idx.push(b, b + 2, b + 3, b, b + 3, b + 1); }
  const m = { flat, idx: new Uint16Array(idx), nv, pos: new Float32Array(nv * 3), nor: new Float32Array(nv * 3), bkey: '', W, Tk, z0, bev: 0 };
  bend(m, FLAT);
  return m;
}

/* Cintrage exact (sans étirement de la fibre z = 0) autour d'un axe parallèle à v :
   rayon 1/k, centré au-dessus de u = uc ; l'angle est borné de chaque côté,
   au-delà la plaque continue tout droit (décollage du papier, paroi qui s'enroule sur le tube).
   m.bev : biseau à 45° des deux extrémités, l'un pris sur le dessous, l'autre sur le dessus. */
const BP = { x: 0, y: 0, a: 0 };
function bendPt(u, z0, B) {
  const k = B.k;
  if (k < 1e-7) { BP.x = u; BP.y = z0; BP.a = 0; return; }
  const s = u - B.uc;
  let a = k * s, extra = 0;
  if (a > B.aPos) { a = B.aPos; extra = s - a / k; } else if (a < -B.aNeg) { a = -B.aNeg; extra = s - a / k; }
  const R = 1 / k, sa = Math.sin(a), ca = Math.cos(a);
  BP.x = B.uc + sa * (R - z0) + extra * ca;
  BP.y = R - ca * (R - z0) + extra * sa;
  BP.a = a;
}
function bend(m, B) {
  const key = `${B.uc.toFixed(3)}|${B.k.toFixed(7)}|${B.aNeg.toFixed(4)}|${B.aPos.toFixed(4)}|${m.bev.toFixed(3)}`;
  if (key === m.bkey) return;
  m.bkey = key;
  const { flat, pos, nor } = m, bev = m.bev, l = Math.hypot(m.Tk, bev);
  const nA = [-m.Tk / l, -bev / l, 0], nB = [m.Tk / l, bev / l, 0];
  for (let i = 0; i < m.nv; i++) {
    let u = flat[i * 4];
    const v = flat[i * 4 + 1], z = flat[i * 4 + 2], f = flat[i * 4 + 3];
    let N = FACE_N[f];
    if (bev > 0) {
      if (u < 1e-4) u = bev * (m.z0 + m.Tk - z) / m.Tk;            // bout A : le dessus dépasse
      else if (u > m.W - 1e-4) u = m.W - bev * (z - m.z0) / m.Tk;   // bout B : le dessous dépasse
      if (f === 4) N = nA; else if (f === 5) N = nB;
    }
    bendPt(u, z, B);
    pos[i * 3] = BP.x; pos[i * 3 + 1] = BP.y; pos[i * 3 + 2] = v;
    const c = Math.cos(BP.a), s = Math.sin(BP.a);
    nor[i * 3] = N[0] * c - N[1] * s; nor[i * 3 + 1] = N[0] * s + N[1] * c; nor[i * 3 + 2] = N[2];
  }
  m.dirty = true;
}

// Prisme droit sous un contour, normales des chants lissées. À plat : (x, z, y, face)
function prism(pts, Tk) {
  const P = pts.length, nv = 2 * (P + 1) + 2 * P;
  const flat = new Float32Array(nv * 4), pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = [];
  let n = 0;
  const V = (x, z, y, f, nx, ny, nz) => { flat.set([x, z, y, f], n * 4); pos.set([x, y, z], n * 3); nor.set([nx, ny, nz], n * 3); return n++; };
  let cx = 0, cz = 0;
  for (const [x, z] of pts) { cx += x / P; cz += z / P; }
  for (const [y, f, ny] of [[Tk, 1, 1], [0, 0, -1]]) {
    const c = V(cx, cz, y, f, 0, ny, 0);
    for (const [x, z] of pts) V(x, z, y, f, 0, ny, 0);
    for (let i = 0; i < P; i++) idx.push(c, c + 1 + i, c + 1 + (i + 1) % P);
  }
  const b = n;
  for (let i = 0; i < P; i++) {
    const [x0, z0] = pts[(i + P - 1) % P], [x1, z1] = pts[i], [x2, z2] = pts[(i + 1) % P];
    let nx = z2 - z0, nz = -(x2 - x0);
    if (nx * (x1 - cx) + nz * (z1 - cz) < 0) { nx = -nx; nz = -nz; }
    const l = Math.hypot(nx, nz); nx /= l; nz /= l;
    V(x1, z1, 0, 2, nx, 0, nz); V(x1, z1, Tk, 2, nx, 0, nz);
  }
  for (let i = 0; i < P; i++) { const a = b + i * 2, c = b + ((i + 1) % P) * 2; idx.push(a, c, c + 1, a, c + 1, a + 1); }
  return { flat, idx: new Uint16Array(idx), nv, pos, nor, bkey: 'fixe' };
}
// Rondelle (anneau plat) : dessus, dessous, chant extérieur, chant intérieur. À plat : (x, z, y, face)
function annulus(ro, ri, Tk, n) {
  const nv = 8 * (n + 1), flat = new Float32Array(nv * 4), pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = [];
  let k = 0;
  const V = (x, z, y, f, nx, ny, nz) => { flat.set([x, z, y, f], k * 4); pos.set([x, y, z], k * 3); nor.set([nx, ny, nz], k * 3); return k++; };
  const block = fn => { const b = k; for (let i = 0; i <= n; i++) { const t = i / n * Math.PI * 2; fn(Math.cos(t), Math.sin(t)); } for (let i = 0; i < n; i++) { const a = b + i * 2; idx.push(a, a + 2, a + 3, a, a + 3, a + 1); } };
  block((c, s) => { V(ro * c, ro * s, Tk, 1, 0, 1, 0); V(ri * c, ri * s, Tk, 1, 0, 1, 0); });
  block((c, s) => { V(ro * c, ro * s, 0, 0, 0, -1, 0); V(ri * c, ri * s, 0, 0, 0, -1, 0); });
  block((c, s) => { V(ro * c, ro * s, 0, 2, c, 0, s); V(ro * c, ro * s, Tk, 2, c, 0, s); });
  block((c, s) => { V(ri * c, ri * s, 0, 3, -c, 0, -s); V(ri * c, ri * s, Tk, 3, -c, 0, -s); });
  return { flat, idx: new Uint16Array(idx), nv, pos, nor, bkey: 'fixe' };
}
const circle = (r, n) => Array.from({ length: n }, (_, i) => [r * Math.cos(i / n * Math.PI * 2), r * Math.sin(i / n * Math.PI * 2)]);
function roundRect(w, h, r, n = 6) {
  const pts = [];
  for (const [cx, cz, q] of [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, 1], [-w / 2 + r, -h / 2 + r, 2], [w / 2 - r, -h / 2 + r, 3]])
    for (let i = 0; i <= n; i++) { const a = (q + i / n) * Math.PI / 2; pts.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]); }
  return pts;
}
// Plaque abaissée entre réglettes : rectangle mou, bord irrégulier (centrée sous les pièces)
const SLAB_C = [92, 131], SLAB_H = [88, 122];
function slabOutline() {
  const pts = [], n = 160;
  for (let i = 0; i < n; i++) {
    const t = i / n * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
    const j = 1 + 0.008 * Math.sin(7 * t + 1.3) + 0.006 * Math.sin(13 * t + 0.4) + 0.004 * Math.sin(23 * t + 2.1);
    pts.push([SLAB_H[0] * Math.sign(c) * Math.abs(c) ** 0.25 * j, SLAB_H[1] * Math.sign(s) * Math.abs(s) ** 0.25 * j]);
  }
  return pts;
}
// Petite estèque « haricot » (taille tasse à espresso) : bord de travail du côté des x petits
const RIB_W = 30, RIB_H = 52;
const beanPts = Array.from({ length: 48 }, (_, i) => {
  const t = i / 48 * Math.PI * 2;
  return [RIB_W * (0.5 + 0.44 * Math.cos(t) + 0.1 * Math.cos(2 * t)), RIB_H * 0.5 * Math.sin(t) * (1 - 0.12 * Math.cos(t))];
});
const RIB_X0 = Math.min(...beanPts.map(p => p[0]));

/* Surface de révolution : profil [[r, y, étiquette], …] tourné autour de y.
   smooth adoucit entre portions de même étiquette. À plat : (angle × rayon de référence, y, r, étiquette). */
function lathe(prof, segs, opts = {}) {
  const S = prof.length - 1, ring = segs + 1, nv = S * 2 * ring;
  const flat = new Float32Array(nv * 4), pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = [];
  const rRef = opts.rRef || Math.max(...prof.map(p => p[0]));
  const tagOf = j => prof[j][2] ?? 10;
  const segN = [];
  for (let j = 0; j < S; j++) {
    const dr = prof[j + 1][0] - prof[j][0], dy = prof[j + 1][1] - prof[j][1], l = Math.hypot(dr, dy) || 1;
    segN.push([dy / l, -dr / l]);
  }
  let n = 0;
  for (let j = 0; j < S; j++) {
    for (let e = 0; e < 2; e++) {
      const p = prof[j + e], k = (j + (e ? 1 : -1) + S) % S;
      let [nr, ny] = segN[j];
      if (opts.smooth && (opts.closed || (j + (e ? 1 : -1) >= 0 && j + (e ? 1 : -1) < S)) && tagOf(k) === tagOf(j)) {
        nr += segN[k][0]; ny += segN[k][1];
        const l = Math.hypot(nr, ny); nr /= l; ny /= l;
      }
      for (let i = 0; i <= segs; i++) {
        const th = i / segs * Math.PI * 2, s = Math.sin(th), c = Math.cos(th);
        pos.set([p[0] * s, p[1], p[0] * c], n * 3);
        nor.set([nr * s, ny, nr * c], n * 3);
        flat.set([th * rRef, p[1], p[0], tagOf(j)], n * 4);
        n++;
      }
    }
    const a = j * 2 * ring, b = a + ring;
    for (let i = 0; i < segs; i++) idx.push(a + i, a + i + 1, b + i + 1, a + i, b + i + 1, b + i);
  }
  return { flat, idx: new Uint16Array(idx), nv, pos, nor, bkey: 'fixe' };
}

// Colombin de 3 mm couché dans l'angle intérieur (tore), pot de barbotine
const COIL_P = Array.from({ length: 17 }, (_, i) => { const a = -Math.PI / 2 + i / 16 * Math.PI * 2; return [R_IN - 1.5 + 1.5 * Math.cos(a), 1.5 + 1.5 * Math.sin(a), 15]; });
const JAR_P = [[0, 0, 13], [33, 0, 10], [36, 44, 10], [36, 48, 12], [33, 48, 11], [30, 4, 14], [0, 4]];

const MS = {
  cloth: plate(660, 500, 1, 1),
  mat: plate(340, 320, 2, 1),
  lapBase: plate(330, 230, 16, 1),
  lapLid: plate(330, 225, 7, 1),
  prBody: plate(320, 220, 120, 1),
  prTray: plate(210, 150, 1.5, 1),
  sheet: plate(210, 297, PT, 1),
  ruler: plate(150, 25, 1.2, 1),
  pWall: plate(L_BAND, WALL_H, PT, 64),
  pDisc: prism(circle(R_OUT, 72), PT),
  pRing: annulus(FO, FI, PT, 72),
  slab: prism(slabOutline(), T),
  cWall: plate(L_BAND, WALL_H, T, 128, -T / 2),   // épaisseur centrée : la fibre neutre est au milieu
  cDisc: prism(circle(R_OUT, 72), T),
  cRing: annulus(FO, FI, T, 72),
  coil: lathe(COIL_P, 72, { smooth: true, closed: true }),
  blade: plate(64, 2.4, 2.4, 1),
  grip: plate(80, 11, 11, 1),
  regl: plate(20, 340, T, 1),
  roller: prism(circle(25, 40), 330),
  mand: prism(circle(R_MAND, 64), MAND_L),
  trnBase: prism(circle(82, 48), 10),
  trnCol: prism(circle(18, 24), 72),
  trnWheel: prism(circle(115, 96), 12),
  bat: prism(circle(84, 64), 12),
  foam: prism(roundRect(132, 132, 18), 24),
  sponge: prism(roundRect(52, 36, 13), 22),
  rib: prism(beanPts, 3),
  cham: plate(46, 24, 1.2, 24),
  jar: lathe(JAR_P, 48),
  slip: prism(circle(32.2, 48), 0.6),
  // ciseaux (lame, branche, anneau) et feuille de carton du mandrin
  sBlade: plate(50, 4.2, 0.9, 1),
  sShank: plate(30, 4.6, 2.6, 1),
  sRing: annulus(8.5, 6, 3, 32),
  card: plate(2 * Math.PI * R_MAND, MAND_L, 0.5, 96),
};

const SOLO_SET = new Set([MS.cWall, MS.cDisc, MS.cRing, MS.coil]);

/* ─────────────── l'atelier ─────────────── */

const Q_ID = [0, 0, 0, 1];
const Q_PW = qAxis(0, 1, 0, -Math.PI / 2);       // pièce posée en long sur la feuille
const Q_STAND = qAxis(1, 0, 0, -Math.PI / 2);    // paroi roulée, debout
const Q_FLIP = qAxis(1, 0, 0, Math.PI);          // tasse retournée sur la mousse
const SEAM_YAW = Math.PI + 0.25;                 // la soudure verticale tournée vers la caméra

// pièce (u le long, épaisseur, v en travers) → repère de la feuille (x, hauteur, y)
const L_WALLP = rigid(m4(), Q_PW, WALL.x0 + WALL_H, 0, WALL.y0);
const L_WALLC = rigid(m4(), Q_PW, WALL.x0 + WALL_H, T / 2, WALL.y0);
const L_DISCM = rigid(m4(), Q_ID, DISC.cx, 0, DISC.cy);
const L_RINGM = rigid(m4(), Q_ID, RING.cx, 0, RING.cy);
// et en 2D, pour l'impression et les tracés : x = a0 + a1 u + a2 v, y = b0 + b1 u + b2 v
const mat3 = (a1, b1, a2, b2, a0, b0) => new Float32Array([a1, b1, 0, a2, b2, 0, a0, b0, 1]);
const P_ID = mat3(1, 0, 0, 1, 0, 0);
const P_WALL = mat3(0, 1, -1, 0, WALL.x0 + WALL_H, WALL.y0);
const P_DISC = mat3(1, 0, 0, 1, DISC.cx, DISC.cy);
const P_RING = mat3(1, 0, 0, 1, RING.cx, RING.cy);
const P_SLAB = mat3(1, 0, 0, 1, SLAB_C[0], SLAB_C[1]);

const LAP = [-980, 0, -20];                      // ordinateur
const PRN = [-500, 0, -140];                     // imprimante (centre du corps)
const SLOT = [-500, 54, -30];                    // fente de sortie
const MAT_H = 2;
const REST = [-605, MAT_H, 14];                  // coin de la feuille posée sur le tapis de coupe
const SHEET_C = [105, 0, 148.5];
const BRD = [200, 0, 60];                        // centre de la plaque
const ORG = [BRD[0] - SLAB_C[0], BRD[2] - SLAB_C[1]];   // coin de la feuille sur la plaque (x, z)
const ASM0 = [ORG[0] + DISC.cx, 0, ORG[1] + DISC.cy];   // le fond reste où il a été découpé : on monte dessus
const TRN = [560, 0, 20], TRN_TOP = 94, BAT_TOP = TRN_TOP + 12, FOAM_TOP = BAT_TOP + 24;
const CHECK = [REST[0] + SQ[0] + 10, MAT_H, REST[2] + SQ[1] + 12];   // le carré témoin et la règle
const RL_REST = [200, 25, -168];                 // rouleau au repos
const MD_REST = [-190, R_MAND, 150];             // le mandrin se roule et attend entre le tapis et la toile             // mandrin au repos, couché le long de z, derrière
const RIB_REST = [404, 0, 172], SPG_REST = [690, 0, -150], CHM_REST = [630, 0, -214], FOAM_REST = [772, 0, -196];
const BODY_C = BODY / 2;                         // centre de la tasse (repère de montage : y = 0 sous le fond)

const M_CLOTH = rigid(m4(), Q_ID, -20, -1, -200);
const M_MAT = rigid(m4(), Q_ID, -670, 0, -2);
const M_LAPB = rigid(m4(), Q_ID, LAP[0] - 165, 0, LAP[2] - 115);
const LID_B = 18 * DEG;
const M_LID = rigid(m4(), qAxis(1, 0, 0, Math.PI / 2 - LID_B), LAP[0] - 165, 16 + 225 * Math.cos(LID_B), LAP[2] - 109 - 225 * Math.sin(LID_B));
const SCREEN = [14, 12, 302, 188];
const SCREEN_C = xf(M_LID, [SCREEN[0] + SCREEN[2] / 2, 7, SCREEN[1] + SCREEN[3] / 2]);
const M_PRN = rigid(m4(), Q_ID, PRN[0] - 160, 0, PRN[2] - 110);
const TRAY_B = 25 * DEG;
const M_TRAY = rigid(m4(), qAxis(1, 0, 0, Math.PI / 2 - TRAY_B), PRN[0] - 105, 120 + 150 * Math.cos(TRAY_B), PRN[2] - 96 - 150 * Math.sin(TRAY_B));
const M_REGL = [rigid(m4(), Q_ID, ORG[0] + 4 - 32, 0, BRD[2] - 170), rigid(m4(), Q_ID, ORG[0] + 180 + 12, 0, BRD[2] - 170)];
const M_TRN_BASE = rigid(m4(), Q_ID, TRN[0], 0, TRN[2]);
const M_TRN_COL = rigid(m4(), Q_ID, TRN[0], 10, TRN[2]);
const M_JAR = rigid(m4(), Q_ID, 392, 0, -62), M_SLIP = rigid(m4(), Q_ID, 392, 38, -62);
const M_RULER0 = rigid(m4(), qAxis(0, 1, 0, Math.PI / 2), -646, MAT_H, 236);
const M_RULER1 = rigid(m4(), Q_ID, REST[0] + SQ[0] - 10, MAT_H + PT + 0.05, REST[2] + SQ[1] + 20.3);
const M_CUTTER = rigid(m4(), qAxis(0, 1, 0, -Math.PI / 2), -365, MAT_H, 60);
const M_NEEDLE = rigid(m4(), qAxis(0, 1, 0, -0.35), 360, 0, 214);

const G_CLAY = rigid(m4(), Q_ID, ORG[0], 0, ORG[1]);
const G_ON = rigid(m4(), Q_ID, ORG[0], T + 0.05, ORG[1]);
const M_CW0 = mulN(G_CLAY, L_WALLC), M_CD0 = mulN(G_CLAY, L_DISCM), M_CR0 = mulN(G_CLAY, L_RINGM);

// Montage (repère de la tasse : origine sous le fond, y vers le haut)
const LC_BAND = [L_BAND / 2, R_MID, WALL_H / 2];  // centre de la paroi roulée (repère de la paroi)
const L_BAND_ASM = place(m4(), qMul(qAxis(0, 1, 0, SEAM_YAW), Q_STAND), 0, T + WALL_H / 2, 0, LC_BAND);
const L_RING_ASM = rigid(m4(), Q_ID, 0, -T, 0);
const L_MAND_BAND = rigid(m4(), qAxis(1, 0, 0, Math.PI / 2), L_BAND / 2, R_MID, 0.4);  // le tube affleure en bas, dépasse en haut
const Q_MREST = qAxis(1, 0, 0, Math.PI / 2);

const PIECES = [
  { mesh: MS.pWall, L: L_WALLP, P: P_WALL, lc: [L_BAND / 2, 0, WALL_H / 2], q0: Q_PW, len: L_BAND, stk: [372, 0.03, 262], qs: qAxis(0, 1, 0, Math.PI + 0.05) },
  { mesh: MS.pDisc, L: L_DISCM, P: P_DISC, lc: [0, 0, 0], q0: Q_ID, len: 0, stk: [438, 0.66, 252], qs: qAxis(0, 1, 0, 0.3) },
  { mesh: MS.pRing, L: L_RINGM, P: P_RING, lc: [0, 0, 0], q0: Q_ID, len: 0, stk: [318, 0.36, 270], qs: qAxis(0, 1, 0, -0.4) },
];
for (const pc of PIECES) { pc.on = mulN(G_ON, pc.L); pc.M = m4(); }

const COL = {
  card: [0.94, 0.93, 0.9], scis: [0.29, 0.447, 0.388],
  lapBase: [0.8, 0.8, 0.765], lapLid: [0.2, 0.22, 0.19], printer: [0.91, 0.9, 0.85],
  steel: [0.6, 0.62, 0.61], wood: [0.69, 0.53, 0.45], iron: [0.33, 0.34, 0.32], alu: [0.74, 0.75, 0.73],
  rubber: [0.29, 0.447, 0.388], mat: [0.2, 0.34, 0.29], ruler: [0.74, 0.76, 0.75], cutter: [0.36, 0.38, 0.35],
  foam: [0.9, 0.87, 0.74], sponge: [0.93, 0.79, 0.46], cham: [0.86, 0.75, 0.57], jar: [0.95, 0.95, 0.93],
  slip: [0.74, 0.71, 0.66],
};

// Aiguille de potière, et cutter pour le papier (même manche, tenu de la même façon)
const TOOL = (() => {
  const l = Math.hypot(0.3, 0.86, 0.42), X = [0.3 / l, 0.86 / l, 0.42 / l];
  const zl = Math.hypot(X[2], X[0]), Z = [-X[2] / zl, 0, X[0] / zl];
  const Y = [-Z[2] * X[1], Z[2] * X[0] - Z[0] * X[2], Z[0] * X[1]];
  const off = m4(); off[0] = off[5] = off[10] = off[15] = 1; off[12] = 64; off[13] = -4.3; off[14] = -4.3;
  return { X, Y, Z, blade: m4(), grip: m4(), off };
})();
const M_CUTTER_G = mulN(M_CUTTER, TOOL.off), M_NEEDLE_G = mulN(M_NEEDLE, TOOL.off);   // outils au repos
function toolAt(x, y, z) {
  const { X, Y, Z, blade } = TOOL;
  blade.set([X[0], X[1], X[2], 0, Y[0], Y[1], Y[2], 0, Z[0], Z[1], Z[2], 0, 0, 0, 0, 1]);
  blade[12] = x - (Y[0] + Z[0]) * 1.2; blade[13] = y - (Y[1] + Z[1]) * 1.2; blade[14] = z - (Y[2] + Z[2]) * 1.2;
  mul(TOOL.grip, blade, TOOL.off);
}
// K ∈ [0, 4] : un contour après l'autre, petit saut entre deux ; s0/s1 : fenêtre d'apparition
const cut = (K, i) => clamp((K - i - 0.1) / 0.9);
const cuts = K => [cut(K, 0), cut(K, 1), (cut(K, 2) + cut(K, 3)) / 2];
function toolPath(K, bx, by, bz, s0, s1, s) {
  if (s < s0 || s > s1) return false;
  const i = Math.min(3, Math.floor(K)), t = K - i;
  let p, lift = 0;
  if (t < 0.1) {
    const h = t / 0.1, a = rim(i ? i - 1 : 0, i ? 1 : 0), b = rim(i, 0);
    p = [lerp(a[0], b[0], h), lerp(a[1], b[1], h)];
    lift = i ? 24 * arc(h) : 0;
  } else p = rim(i, cut(K, i));
  lift += 45 * (1 - sm(s0, s0 + 0.045, s)) + 45 * sm(s1 - 0.045, s1, s);
  toolAt(bx + p[0], by + lift, bz + p[1]);
  return true;
}

/* ─────────────── textures dessinées (feuille imprimée, écran de l'outil) ─────────────── */

// Bruit répétable 256² : R = mouchetures, G = marbrure douce, B = grain fin
function makeNoise() {
  const N = 256, img = new ImageData(N, N), px = img.data;
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const lat = n => { const a = new Float32Array(n * n); for (let i = 0; i < a.length; i++) a[i] = rnd(); return a; };
  const L1 = lat(8), L2 = lat(16);
  const vnoise = (L, n, x, y) => {
    const fx = x * n, fy = y * n, x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = fx - x0, ty = fy - y0, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const g = (i, j) => L[((j % n + n) % n) * n + ((i % n + n) % n)];
    return lerp(lerp(g(x0, y0), g(x0 + 1, y0), sx), lerp(g(x0, y0 + 1), g(x0 + 1, y0 + 1), sx), sy);
  };
  const speck = new Float32Array(N * N);
  for (let k = 0; k < 300; k++) {
    const cx = rnd() * N, cy = rnd() * N, r = 0.5 + rnd() * rnd() * 2.2, a = 0.55 + rnd() * 0.45;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const x = Math.floor(cx) + dx, y = Math.floor(cy) + dy;
      const v = clamp(r + 0.5 - Math.hypot(x + 0.5 - cx, y + 0.5 - cy)) * a;
      if (v > 0) { const i = ((y + N) % N) * N + ((x + N) % N); speck[i] = Math.max(speck[i], v); }
    }
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, u = x / N, v = y / N;
    px[i * 4] = speck[i] * 255;
    px[i * 4 + 1] = (vnoise(L1, 8, u, v) * 0.65 + vnoise(L2, 16, u, v) * 0.35) * 255;
    px[i * 4 + 2] = rnd() * 255;
    px[i * 4 + 3] = 255;
  }
  return img;
}

// Grain du fond de page (tuile PNG générée, pas de filtre SVG ni de mode de fusion)
function paintGrain() {
  const N = 160, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d'), img = x.createImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    const v = Math.random() < 0.5 ? 35 : 255;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = Math.random() * 16;
  }
  x.putImageData(img, 0, 0);
  document.body.style.setProperty('--grain', `url(${c.toDataURL('image/png')})`);
}

// Textures en puissance de deux (mipmaps en WebGL 1) : on dessine en mm / en px logiques
const PRINT = document.createElement('canvas'); PRINT.width = 1024; PRINT.height = 2048;
const UI = document.createElement('canvas'); UI.width = 1024; UI.height = 1024;

function tx(x, str, X, Y, size, weight, fam, color, ang = 0, align = 'center') {
  x.save(); x.translate(X, Y); if (ang) x.rotate(ang);
  x.font = `${weight} ${size}px ${fam}`; x.fillStyle = color; x.textAlign = align; x.textBaseline = 'middle';
  x.fillText(str, 0, 0); x.restore();
}
function partial(x, pts, f) {
  let L = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
  let rem = L * f;
  x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length && rem > 0; i++) {
    const t = Math.min(1, rem / seg[i - 1]);
    x.lineTo(lerp(pts[i - 1][0], pts[i][0], t), lerp(pts[i - 1][1], pts[i][1], t));
    rem -= seg[i - 1];
  }
}
function hatchPath(x, clip, x0, y0, w, h) {     // hachures biscuit dans une zone (clip : fonction qui trace le chemin)
  x.save(); x.beginPath(); clip(); x.clip('evenodd');
  x.strokeStyle = 'rgba(176,136,116,.7)'; x.lineWidth = 0.3; x.beginPath();
  for (let d = -h; d < w + h; d += 2.2) { x.moveTo(x0 + d, y0 + h); x.lineTo(x0 + d + h, y0); }
  x.stroke(); x.restore();
}
const hatch = (x, x0, y0, w, h) => hatchPath(x, () => x.rect(x0, y0, w, h), x0, y0, w, h);
function dimLine(x, X, y0, y1, label) {          // cote verticale (biscuit), libellé couché
  x.strokeStyle = '#B08874'; x.lineWidth = 0.35; x.beginPath();
  x.moveTo(X, y0); x.lineTo(X, y1); x.moveTo(X - 2, y0); x.lineTo(X + 2, y0); x.moveTo(X - 2, y1); x.lineTo(X + 2, y1); x.stroke();
  x.save(); x.translate(X, (y0 + y1) / 2); x.rotate(-Math.PI / 2);
  x.font = `500 3.4px ${FONT_MONO}`; const w = x.measureText(label).width + 3;
  x.fillStyle = '#E7EFE9'; x.fillRect(-w / 2, -2.6, w, 5.2);
  x.fillStyle = '#8C6A58'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, 0, 0);
  x.restore();
}
const ring2 = (x, cx, cy, ro, ri) => { x.moveTo(cx + ro, cy); x.arc(cx, cy, ro, 0, Math.PI * 2); x.moveTo(cx + ri, cy); x.arc(cx, cy, ri, 0, Math.PI * 2); };

/* Le gabarit, en mm (origine = coin de la feuille). prog ∈ [0, 1] : l'outil le trace
   pièce après pièce ; à 1, c'est exactement ce qui sort de l'imprimante. */
function tpl(x, prog) {
  const pw = clamp(prog * 3), pd = clamp(prog * 3 - 1), pr = clamp(prog * 3 - 2), info = sm(0.8, 1, prog);
  x.lineJoin = 'round'; x.lineCap = 'butt';
  const outline = draw => { x.strokeStyle = '#4A7263'; x.lineWidth = 0.55; x.setLineDash([4, 3]); draw(); x.stroke(); x.setLineDash([]); };
  const inside = (f, fn) => { if (f <= 0) return; x.save(); x.globalAlpha = sm(0.35, 1, f); fn(); x.restore(); };
  const mono = (s, X, Y, size, color = '#565A4D', ang = 0, align = 'center', w = 400) => tx(x, s, X, Y, size, w, FONT_MONO, color, ang, align);
  const ital = '#8C6A58';

  if (prog > 0) {
    x.save(); x.globalAlpha = sm(0, 0.15, prog);
    mono('gabarits-ceramique.com', WALL.x0, 10.5, 2.6, '#4A7263', 0, 'left', 500);
    mono('série tasses · n°1b · imprimer à 100 %', 196, 10.5, 2.6, '#8A8D80', 0, 'right');
    x.restore();
  }

  // A · paroi : biseaux aux deux bouts, bas de paroi le long du bord droit
  const X0 = WALL.x0, X1 = X0 + WALL_H, Y0 = WALL.y0, Y1 = Y0 + L_BAND, XC = (X0 + X1) / 2, YC = (Y0 + Y1) / 2;
  if (pw > 0) {
    inside(pw, () => {
      x.fillStyle = '#E7EFE9'; x.fillRect(X0, Y0, WALL_H, L_BAND);
      hatch(x, X0, Y0, WALL_H, BEV); hatch(x, X0, Y1 - BEV, WALL_H, BEV); hatch(x, X1 - 3, Y0 + BEV, 3, L_BAND - 2 * BEV);
      x.strokeStyle = '#B08874'; x.lineWidth = 0.3; x.setLineDash([1.2, 1]); x.beginPath();
      x.moveTo(X0, Y0 + BEV); x.lineTo(X1, Y0 + BEV); x.moveTo(X0, Y1 - BEV); x.lineTo(X1, Y1 - BEV);
      x.moveTo(X1 - 3, Y0 + BEV); x.lineTo(X1 - 3, Y1 - BEV); x.stroke(); x.setLineDash([]);
      mono('biseau 45° · dessus', XC, Y0 + BEV + 3, 2.1, ital, 0, 'center', 500);
      mono('biseau 45° · dessous', XC, Y1 - BEV - 3, 2.1, ital, 0, 'center', 500);
      mono('A', XC, Y0 + 15, 5.5, '#4A7263', 0, 'center', 500);
      mono('A', XC, Y1 - 15, 5.5, '#4A7263', 0, 'center', 500);
      tx(x, 'paroi', XC - 4.5, YC, 12, 800, FONT_TITRE, '#23271F', -Math.PI / 2);
      mono(`${fmt(L_BAND)} × ${fmt(WALL_H)} mm`, XC + 4.6, YC, 3, '#565A4D', -Math.PI / 2);
      mono('bas de paroi · posé sur le fond', X1 - 5.4, YC + 62, 2, ital, -Math.PI / 2, 'center', 500);
      dimLine(x, X0 + 4.2, Y0 + 24, Y1 - 24, `${fmt(L_BAND)} mm`);
    });
    outline(() => partial(x, [[X0, Y0], [X1, Y0], [X1, Y1], [X0, Y1], [X0, Y0]], pw));
    tx(x, '✂', X0 + 4, Y0 - 3.4, 4.2, 400, FONT_MONO, '#4A7263');
  }

  // B · fond : couronne à hacher, cercle du talon à piquer
  if (pd > 0) {
    const { cx, cy } = DISC;
    inside(pd, () => {
      x.fillStyle = '#E7EFE9'; x.beginPath(); x.arc(cx, cy, R_OUT, 0, Math.PI * 2); x.fill();
      hatchPath(x, () => ring2(x, cx, cy, R_OUT, R_OUT - 6), cx - R_OUT, cy - R_OUT, 2 * R_OUT, 2 * R_OUT);
      x.strokeStyle = '#B08874'; x.lineWidth = 0.3; x.setLineDash([1.2, 1]);
      x.beginPath(); x.arc(cx, cy, R_OUT - 6, 0, Math.PI * 2); x.stroke();
      x.lineWidth = 0.4; x.setLineDash([1.8, 1.2]); x.beginPath(); x.arc(cx, cy, FO, 0, Math.PI * 2); x.stroke(); x.setLineDash([]);
      x.lineWidth = 0.35; x.beginPath(); x.moveTo(cx - 3, cy); x.lineTo(cx + 3, cy); x.moveTo(cx, cy - 3); x.lineTo(cx, cy + 3); x.stroke();
      tx(x, 'fond', cx, cy - 8, 7.5, 800, FONT_TITRE, '#23271F');
      mono(`Ø ${fmt(D_RAW)} mm`, cx, cy + 7, 2.9, ital, 0, 'center', 500);
      mono('talon · piquer', cx, cy + FO + 3.4, 2, ital, 0, 'center', 500);
      mono('B', cx - R_OUT + 12, cy, 5, '#4A7263', 0, 'center', 500);
      mono('couronne de 6 mm · hacher', cx, cy - R_OUT - 2.6, 2, ital, 0, 'center', 500);
    });
    outline(() => { x.beginPath(); x.arc(cx, cy, R_OUT, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pd); });
  }

  // C · talon : rondelle, petit cercle d'abord
  if (pr > 0) {
    const { cx, cy } = RING;
    inside(pr, () => {
      x.fillStyle = '#E7EFE9'; x.beginPath(); ring2(x, cx, cy, FO, FI); x.fill('evenodd');
      x.strokeStyle = 'rgba(176,136,116,.6)'; x.lineWidth = 0.25; x.beginPath();
      x.moveTo(cx - 2, cy); x.lineTo(cx + 2, cy); x.moveTo(cx, cy - 2); x.lineTo(cx, cy + 2); x.stroke();
      tx(x, 'talon', cx + FO + 4, cy - 4, 6.5, 800, FONT_TITRE, '#23271F', 0, 'left');
      mono(`Ø ${fmt(2 * FO)} / ${fmt(2 * FI)} mm`, cx + FO + 4, cy + 2.6, 2.6, '#565A4D', 0, 'left');
      mono(`anneau de ${fmt(FO - FI)} mm · évider d’abord`, cx + FO + 4, cy + 6.6, 2.1, ital, 0, 'left', 500);
      mono('C', cx, cy, 4.2, '#4A7263', 0, 'center', 500);
    });
    outline(() => { x.beginPath(); x.arc(cx, cy, FI, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(pr * 2)); });
    if (pr > 0.5) outline(() => { x.beginPath(); x.arc(cx, cy, FO, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(pr * 2 - 1)); });
  }

  // notice de montage + cartouche + carré de contrôle
  if (info > 0) {
    x.save(); x.globalAlpha = info;
    const nx = Math.max(66, XR), ny = 178;
    mono('MONTAGE', nx, ny, 2.4, '#4A7263', 0, 'left', 500);
    x.strokeStyle = 'rgba(74,114,99,.45)'; x.lineWidth = 0.3; x.setLineDash([1.2, 0.9]);
    x.beginPath(); x.moveTo(nx + 14, ny); x.lineTo(196, ny); x.stroke(); x.setLineDash([]);
    [
      'abaisser une plaque de 4,5 mm entre réglettes',
      'tracer A, B, C à l’aiguille tenue verticale',
      'biseauter A à 45° : un bout dessus, l’autre dessous',
      'hacher + barbotine, rouler sur mandrin Ø ' + fmt(2 * R_IN),
      'monter A sur la couronne de B, colombin dedans',
      'à consistance cuir : piquer le talon, poser C',
    ].forEach((l, i) => {
      mono(String(i + 1), nx + 1, ny + 7 + i * 5.6, 2.3, '#4A7263', 0, 'left', 500);
      mono(l, nx + 6, ny + 7 + i * 5.6, 2.3, '#565A4D', 0, 'left');
    });
    tx(x, 'bol-tasse à talon', nx, 248, 8, 800, FONT_TITRE, '#23271F', 0, 'left');
    mono('n°1b · sans chanfrein · série Tasses', nx, 256, 2.4, '#565A4D', 0, 'left');
    mono(`Ø ${FIN.d} × ${fmt(FIN.h)} mm après cuisson · ${VOL_CL} cl`, nx, 260.4, 2.4, '#565A4D', 0, 'left');
    mono('retrait 12 % compris · plaque de 4,5 mm', nx, 264.8, 2.4, '#565A4D', 0, 'left');
    x.strokeStyle = '#23271F'; x.lineWidth = 0.35; x.strokeRect(SQ[0], SQ[1], 20, 20);
    mono('20 mm', SQ[0] + 10, SQ[1] + 10, 2.8, '#23271F', 0, 'center', 500);
    mono('vérifiez à la règle', SQ[0] + 10, SQ[1] - 2.6, 2.1, '#8A8D80');
    x.restore();
  }
}

function drawPrint() {
  const x = PRINT.getContext('2d');
  x.setTransform(PRINT.width / 210, 0, 0, PRINT.height / 297, 0, 0);
  x.fillStyle = '#FFFEFA'; x.fillRect(0, 0, 210, 297);
  tpl(x, 1);
}

const LOGO_A = new Path2D('M50 5C75 5 95 25 95 51C95 79 76 96 49 96C23 96 6 77 6 50C6 24 25 5 50 5Z');
const LOGO_B = new Path2D('M14.2 46.9A64 64 0 0 1 85.8 46.9L71.2 68.5A38 38 0 0 0 28.8 68.5Z');
const ARROW = new Path2D('M0 0L0 19L5 14.5L8.4 22L11.6 20.6L8.3 13.3L14.6 13.3Z');
function rr(x, X, Y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  x.beginPath(); x.moveTo(X + r, Y);
  x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r);
  x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath();
}
// curseur de la souris dans l'outil : (p, x, y)
const CUR = [[0, 290, 300], [0.04, 256, 147], [0.08, 256, 147], [0.12, 237, 240], [0.17, 237, 240],
  [0.21, 262, 327], [0.25, 262, 373], [0.29, 262, 419], [0.33, 262, 465], [0.38, 262, 465],
  [0.44, 520, 300], [0.62, 600, 360], [0.9, 640, 450], [1, 176, 588]];

// Coupe cotée de la tasse cuite, à côté de l'aperçu
function drawCoupe(x, X, Y) {
  tx(x, 'Bol-tasse à talon', X, Y + 10, 20, 800, FONT_TITRE, '#23271F', 0, 'left');
  tx(x, 'n°1b · droit · cotes après cuisson', X, Y + 33, 11, 400, FONT_MONO, '#565A4D', 0, 'left');
  const s = 2.6, cx = X + 108, base = Y + 236, ink = '#23271F', dim = '#B08874';
  x.strokeStyle = ink; x.fillStyle = '#E7EFE9'; x.lineWidth = 1.2;
  const box = (x0, y0, x1, y1) => { x.beginPath(); x.rect(cx + x0 * s, base - y1 * s, (x1 - x0) * s, (y1 - y0) * s); x.fill(); x.stroke(); };
  box(-32, 4, 32, 8);                             // fond
  box(-32, 8, -28, 39.5); box(28, 8, 32, 39.5);   // paroi
  box(-18, 0, -15, 4); box(15, 0, 18, 4);         // talon
  x.setLineDash([8, 3, 1, 3]); x.lineWidth = 0.8; x.beginPath(); x.moveTo(cx, base - 46 * s); x.lineTo(cx, base + 8); x.stroke(); x.setLineDash([]);
  x.strokeStyle = dim; x.lineWidth = 1;
  const yT = base - 39.5 * s - 16;
  x.beginPath(); x.moveTo(cx - 32 * s, yT); x.lineTo(cx + 32 * s, yT); x.moveTo(cx - 32 * s, yT - 5); x.lineTo(cx - 32 * s, yT + 5); x.moveTo(cx + 32 * s, yT - 5); x.lineTo(cx + 32 * s, yT + 5); x.stroke();
  tx(x, 'Ø 64', cx, yT - 11, 12, 500, FONT_MONO, '#8C6A58');
  const xH = cx + 32 * s + 14;
  x.beginPath(); x.moveTo(xH, base); x.lineTo(xH, base - 39.5 * s); x.moveTo(xH - 5, base); x.lineTo(xH + 5, base); x.moveTo(xH - 5, base - 39.5 * s); x.lineTo(xH + 5, base - 39.5 * s); x.stroke();
  tx(x, '39,5', xH + 4, base - 19.75 * s, 12, 500, FONT_MONO, '#8C6A58', -Math.PI / 2);
  const yB = base + 16;
  x.beginPath(); x.moveTo(cx - 18 * s, yB); x.lineTo(cx + 18 * s, yB); x.moveTo(cx - 18 * s, yB - 5); x.lineTo(cx - 18 * s, yB + 5); x.moveTo(cx + 18 * s, yB - 5); x.lineTo(cx + 18 * s, yB + 5); x.stroke();
  tx(x, 'talon Ø 36 · 3 × 4', cx, yB + 14, 11, 500, FONT_MONO, '#8C6A58');
  tx(x, `${VOL_CL} cl`, cx, base - 24 * s, 14, 500, FONT_MONO, '#4A7263');
  tx(x, 'A paroi · B fond · C talon', X, base + 62, 11, 400, FONT_MONO, '#565A4D', 0, 'left');
}

/* L'outil à l'écran (1024 × 640 px logiques). p : réglages puis tracé ; press : bouton Imprimer. */
function drawUI(p, press) {
  const x = UI.getContext('2d');
  x.setTransform(1, 0, 0, UI.height / 640, 0, 0);
  x.fillStyle = '#F4F2E8'; x.fillRect(0, 0, 1024, 640);
  x.strokeStyle = 'rgba(74,114,99,.09)'; x.lineWidth = 1; x.beginPath();
  for (let i = 346; i < 1024; i += 24) { x.moveTo(i, 44); x.lineTo(i, 640); }
  for (let j = 60; j < 640; j += 24) { x.moveTo(330, j); x.lineTo(1024, j); }
  x.stroke();

  // barre du navigateur
  x.fillStyle = '#E3E2D3'; x.fillRect(0, 0, 1024, 44);
  x.fillStyle = '#C9C7B6';
  for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(24 + i * 20, 22, 6, 0, 7); x.fill(); }
  rr(x, 312, 10, 400, 24, 12); x.fillStyle = '#F4F2E8'; x.fill();
  tx(x, 'app.gabarits-ceramique.com', 512, 22.5, 13, 400, FONT_MONO, '#565A4D');

  // panneau de réglages
  x.fillStyle = '#FFFEFA'; x.fillRect(0, 44, 330, 596);
  x.fillStyle = '#E3E2D3'; x.fillRect(329, 44, 1.5, 596);
  x.save(); x.translate(24, 60); x.scale(0.3, 0.3);
  x.fillStyle = '#5F8A78'; x.fill(LOGO_A);
  x.strokeStyle = '#F4F2E8'; x.lineWidth = 5; x.setLineDash([9, 6]); x.lineJoin = 'round'; x.stroke(LOGO_B);
  x.restore(); x.setLineDash([]);
  tx(x, 'Gabarits Céramique', 64, 75, 19, 800, FONT_TITRE, '#23271F', 0, 'left');

  const sel = p > 0.06, mod = p > 0.15;
  tx(x, 'FORME', 24, 114, 11, 600, FONT_TEXTE, '#4A7263', 0, 'left');
  let cx = 24;
  x.font = `600 15px ${FONT_TEXTE}`;
  for (const name of ['Cylindre', 'Tasse', 'Série Tasses']) {
    const w = x.measureText(name).width + 26, on = sel && name === 'Série Tasses';
    rr(x, cx, 130, w, 34, 17);
    if (on) { x.fillStyle = '#4A7263'; x.fill(); }
    else { x.setLineDash([5, 4]); x.strokeStyle = '#4A7263'; x.lineWidth = 1.5; x.stroke(); x.setLineDash([]); }
    tx(x, name, cx + w / 2, 147.5, 15, 600, FONT_TEXTE, on ? '#FFFEFA' : '#4A7263');
    x.font = `600 15px ${FONT_TEXTE}`;
    cx += w + 8;
  }

  if (p > 0.08) {
    x.save(); x.globalAlpha = sm(0.08, 0.11, p);
    tx(x, 'MODÈLE · SÉRIE TASSES', 24, 190, 11, 600, FONT_TEXTE, '#4A7263', 0, 'left');
    [['n°1a', 'chanfrein', 24, false], ['n°1b', 'droit', 169, true]].forEach(([num, name, X0, b]) => {
      const on = mod && b;
      rr(x, X0, 204, 137, 72, 10);
      x.fillStyle = on ? '#E7EFE9' : '#FFFEFA'; x.fill();
      if (on) { x.strokeStyle = '#4A7263'; x.lineWidth = 2; x.stroke(); }
      else { x.setLineDash([5, 4]); x.strokeStyle = '#C9C7B6'; x.lineWidth = 1.5; x.stroke(); x.setLineDash([]); }
      // silhouette
      x.fillStyle = on ? '#4A7263' : '#B7B9AE'; x.beginPath();
      const sx = X0 + 16, sy = 226;
      if (b) { x.rect(sx, sy, 40, 22); x.rect(sx + 9, sy + 22, 22, 4); }
      else { x.moveTo(sx, sy); x.lineTo(sx + 40, sy); x.lineTo(sx + 40, sy + 15); x.lineTo(sx + 32, sy + 22); x.lineTo(sx + 8, sy + 22); x.lineTo(sx, sy + 15); x.closePath(); x.rect(sx + 9, sy + 22, 22, 4); }
      x.fill();
      tx(x, num, X0 + 70, 228, 12, 500, FONT_MONO, '#565A4D', 0, 'left');
      tx(x, name, X0 + 70, 248, 15, 600, FONT_TEXTE, '#23271F', 0, 'left');
    });
    x.restore();
  }

  tx(x, 'RÉGLAGES', 24, 298, 11, 600, FONT_TEXTE, '#4A7263', 0, 'left');
  [['Contenance', `${VOL_CL} cl`, 0.2], ['Épaisseur de plaque', '4,5 mm', 0.24], ['Largeur du talon', '3 mm', 0.28], ['Retrait de la terre', '12 %', 0.32]]
    .forEach(([lab, val, at], i) => {
      const y = 312 + i * 46;
      tx(x, lab, 24, y + 15, 16, 400, FONT_TEXTE, '#23271F', 0, 'left');
      rr(x, 214, y, 92, 30, 6); x.fillStyle = p > at ? '#E7EFE9' : '#F4F2E8'; x.fill();
      tx(x, mod && p > at ? val : '·', 260, y + 15.5, 15, 500, FONT_MONO, '#23271F');
    });
  const yc = 312 + 4 * 46;
  tx(x, 'Coupelle', 24, yc + 15, 16, 400, FONT_TEXTE, '#23271F', 0, 'left');
  tx(x, 'option', 96, yc + 16, 12, 400, FONT_MONO, '#8A8D80', 0, 'left');
  rr(x, 262, yc + 4, 44, 22, 11); x.fillStyle = '#E3E2D3'; x.fill();
  x.fillStyle = '#FFFEFA'; x.beginPath(); x.arc(273, yc + 15, 8, 0, 7); x.fill();

  // bouton Imprimer
  rr(x, 24, 562, 282, 46, 23); x.fillStyle = press > 0 ? '#3A5A4E' : '#4A7263'; x.fill();
  if (press > 0) { x.save(); rr(x, 24, 562, 282, 46, 23); x.clip(); x.fillStyle = '#5F8A78'; x.fillRect(24, 562, 282 * press, 46); x.restore(); }
  tx(x, press > 0.98 ? 'Envoyé à l’imprimante' : press > 0 ? 'Impression…' : 'Imprimer le PDF', 165, 585.5, 16, 600, FONT_TEXTE, '#FFFEFA');

  // aperçu A4
  const k = 540 / 297, pw = 210 * k, ox = 352, oy = 70;
  x.fillStyle = 'rgba(35,39,31,.12)'; x.fillRect(ox + 6, oy + 8, pw, 540);
  x.fillStyle = '#FFFEFA'; x.fillRect(ox, oy, pw, 540);
  const tp = sm(0.42, 0.98, p);
  x.save(); x.translate(ox, oy); x.scale(k, k); tpl(x, tp); x.restore();
  if (tp <= 0) tx(x, mod ? 'Calcul du patron…' : 'Choisissez une forme', ox + pw / 2, oy + 270, 14, 400, FONT_MONO, '#8A8D80');

  // coupe cotée
  if (p > 0.18) { x.save(); x.globalAlpha = sm(0.18, 0.3, p); drawCoupe(x, 772, 92); x.restore(); }

  // curseur
  let i = 0; while (i < CUR.length - 2 && p > CUR[i + 1][0]) i++;
  const t = sm(CUR[i][0], CUR[i + 1][0], p);
  x.save(); x.translate(lerp(CUR[i][1], CUR[i + 1][1], t), lerp(CUR[i][2], CUR[i + 1][2], t));
  x.lineWidth = 2.5; x.strokeStyle = '#FFFEFA'; x.lineJoin = 'round'; x.stroke(ARROW);
  x.fillStyle = '#23271F'; x.fill(ARROW); x.restore();
}

/* ─────────────── WebGL ─────────────── */

const VS = `
attribute vec3 aPos; attribute vec3 aNor; attribute vec4 aFlat;
uniform mat4 uM, uVP; uniform mat3 uN;
varying vec3 vW, vN; varying vec4 vF;
void main(){
  vec4 w = uM * vec4(aPos, 1.0);
  vW = w.xyz; vN = uN * aNor; vF = aFlat;
  gl_Position = uVP * w;
}`;

const v2 = a => `vec2(${a[0].toFixed(3)}, ${a[1].toFixed(3)})`;
// Papier, terre, outils : tout est calculé ici, à partir des coordonnées à plat (mm).
const FS = `
#extension GL_OES_standard_derivatives : enable
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec3 vW, vN; varying vec4 vF;
uniform sampler2D uTex, uNoise;
uniform mat3 uP;
uniform float uMat, uPrint, uClipV, uHoles, uStain, uSeam, uScore, uScore2, uSlip, uCook, uAO, uShape, uDetail, uDimU, uDimV;
uniform float uJoint, uJoint2, uPrick, uScrFace;
uniform vec3 uCol, uKerf, uKnife, uEye, uL, uSmooth;
uniform vec4 uScreen;

const vec2 WC = ${v2(W_C)}, WH = ${v2(W_H)}, DC = ${v2([DISC.cx, DISC.cy])}, RC = ${v2([RING.cx, RING.cy])};
const float DR = ${R_OUT.toFixed(3)}, RO = ${FO.toFixed(3)}, RI = ${FI.toFixed(3)}, RM = ${R_MAND.toFixed(3)};
const vec3 SPECK = vec3(0.3, 0.25, 0.21), SLIP = vec3(0.74, 0.71, 0.66);

float sdBox(vec2 p, vec2 c, vec2 h){ vec2 d = abs(p - c) - h; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float prm(vec2 q){ return fract(atan(q.y, q.x) / 6.2831853 + 1.0); }
float band(float d, float w){ float f = fwidth(d) + 1e-4; return 1.0 - smoothstep(w - f, w + f, abs(d)); }

void main(){
  float face = vF.w;
  bool top = face > 0.5 && face < 1.5;
  vec3 n = normalize(vN), v = normalize(uEye - vW);

  vec2 S = (uP * vec3(vF.xy, 1.0)).xy;                  // position sur la feuille (mm)
  float d1 = sdBox(S, WC, WH), d2 = length(S - DC) - DR;
  float rr = length(S - RC), dO = rr - RO, dI = RI - rr, d3 = max(dO, dI);
  if (uHoles > 0.5 && min(min(d1, d2), d3) < 0.0) discard;
  float p1 = prm((S - WC) / WH), p2 = prm(S - DC), p3 = prm(S - RC);
  vec4 nz = texture2D(uNoise, (uMat < 1.5 ? S : vF.xy) / 70.0);   // même mouchetis pour la plaque et ses pièces
  vec3 col = uCol;
  float gloss = 0.0, ao = 1.0, emis = 0.0;

  if (uMat < 0.5) {                                     // papier
    if (S.y < uClipV) discard;                          // encore dans l'imprimante
    float kI = clamp(uKerf.z * 2.0, 0.0, 1.0), kO = clamp(uKerf.z * 2.0 - 1.0, 0.0, 1.0);
    if ((abs(d1) < 0.6 && p1 < uKerf.x) || (abs(d2) < 0.6 && p2 < uKerf.y) || (abs(dI) < 0.6 && p3 < kI) || (abs(dO) < 0.6 && p3 < kO)) discard;
    vec3 paper = vec3(1.0, 0.996, 0.98) * (0.97 + 0.035 * nz.b);
    col = paper;
    if (top && uPrint > 0.5) {
      vec3 pr = texture2D(uTex, vec2(S.x / 210.0, 1.0 - S.y / 297.0)).rgb * (0.97 + 0.035 * nz.b);
      col = mix(paper, pr, smoothstep(uClipV, uClipV + 16.0, S.y));   // l'encre « sèche » en sortant
    }
    if (!top) col *= 0.93;
    vec4 nf = texture2D(uNoise, S / 41.0 + 0.37);       // traces de terre près des bords
    float edge = 1.0 - smoothstep(1.0, 9.0, -min(d1, min(d2, d3)));
    col = mix(col, vec3(0.72, 0.68, 0.62), smoothstep(0.5, 0.68, nf.g) * edge * uStain * 0.45);
  } else if (uMat < 1.5) {                              // terre : humide, puis cuir
    float c1 = clamp(uCook, 0.0, 1.0);
    col = mix(vec3(0.665, 0.63, 0.575), vec3(0.79, 0.76, 0.70), c1) * (0.93 + 0.12 * nz.g);
    col = mix(col, SPECK, nz.r * 0.5);
    gloss = 0.3 * (1.0 - c1);
    if (uShape < -0.5) {                                // la plaque : tracé de l'aiguille
      if (!top) col *= face < 0.5 ? 0.86 : 0.92;
      if (top) {
        col *= 1.0 - 0.025 * sin(S.x * 2.3) * sin(S.y * 2.3);
        float kI = clamp(uKnife.z * 2.0, 0.0, 1.0), kO = clamp(uKnife.z * 2.0 - 1.0, 0.0, 1.0);
        float g = band(d1 - 0.9, 0.8) * step(p1, uKnife.x) * step(0.001, uKnife.x)
                + band(d2 - 0.9, 0.8) * step(p2, uKnife.y) * step(0.001, uKnife.y)
                + band(dI - 0.9, 0.7) * step(p3, kI) * step(0.001, kI)
                + band(dO - 0.9, 0.8) * step(p3, kO) * step(0.001, kO);
        col *= 1.0 - 0.55 * min(g, 1.0);
      }
    } else {                                            // une pièce : 0 paroi, 1 fond, 2 talon, 3 colombin
      if (face > 1.5) col *= 0.95;
      float own = uShape < 0.5 ? d1 : (uShape < 1.5 ? d2 : (uShape < 2.5 ? d3 : -20.0));
      float r = length(vF.xy);
      if (top && uShape < 2.5) col *= 1.0 - 0.25 * uSeam * (1.0 - smoothstep(0.2, 1.2, -own)) * (1.0 - uSmooth.x);
      // hachures + barbotine : biseaux et bas de paroi ; couronne du fond ; cercle du talon ; rondelle
      float z = 0.0, z2 = 0.0;
      if (uShape < 0.5) z = (face > 3.5 || (face > 1.5 && face < 2.5)) ? 1.0 : 0.0;
      else if (uShape < 1.5) {
        if (top) z = 1.0 - step(6.0, -own);
        if (face < 0.5) z2 = step(RI - 0.8, r) * step(r, RO + 0.8);
      } else if (uShape < 2.5) { if (top) z2 = 1.0; }
      z *= uScore; z2 *= uScore2;
      float zz = max(z, z2);
      float h1 = smoothstep(0.36, 0.46, abs(fract((S.x + S.y) / 2.2) - 0.5));
      float h2 = smoothstep(0.36, 0.46, abs(fract((S.x - S.y) / 2.2) - 0.5));
      col = mix(col, SLIP * 1.2, 0.65 * zz * uSlip);   // barbotine : plus claire, mouillée
      col *= 1.0 - 0.45 * zz * max(h1, h2);
      gloss = max(gloss, 0.65 * zz * uSlip);
      // piqûres du cercle de talon, sous le fond (24 points)
      if (uShape > 0.5 && uShape < 1.5 && face < 0.5 && uPrick > 0.0) {
        float a = prm(vF.xy) * 24.0, i = floor(a + 0.5), th = i / 24.0 * 6.2831853;
        float dd = length(vF.xy - RO * vec2(cos(th), sin(th)));
        col *= 1.0 - 0.65 * (1.0 - smoothstep(0.3, 0.75, dd)) * step(i / 24.0 + 0.001, uPrick);
      }
      // soudures : un trait et une traînée de barbotine, effacés par l'estèque, l'ébauchoir, l'éponge
      float jl = 0.0, jt = 0.0, jt2 = 0.0;
      if (uShape < 0.5 && face < 0.5) {
        float e = min(vF.x, uDimU - vF.x);
        jl = max(1.0 - smoothstep(0.5, 1.3, e), 1.0 - smoothstep(0.6, 1.6, vF.y));
        jt = max(1.0 - smoothstep(2.5, 8.0, e), 1.0 - smoothstep(2.5, 7.0, vF.y));
      } else if (uShape > 0.5 && uShape < 1.5) {
        if (face > 1.5) jt = 1.0;
        if (face < 0.5) jt2 = max(band(r - RO, 1.8), band(r - RI, 1.4));
      } else if (uShape > 1.5 && uShape < 2.5) { if (face > 1.5) jt2 = 1.0; }
      else jt = 1.0;
      float jv = uJoint * (1.0 - uSmooth.x), jv2 = uJoint2 * (1.0 - uSmooth.y);
      col = mix(col, SLIP, 0.5 * (jt * jv + jt2 * jv2) * (0.5 + 0.5 * nz.g));
      col *= 1.0 - 0.38 * jl * jv;
      gloss = max(gloss, 0.3 * uSmooth.x * (1.0 - c1));
      if (top) ao = mix(1.0, uShape < 0.5 ? 0.42 + 0.58 * vF.y / uDimV : 0.55, uAO);
      if (uShape > 1.5 && uShape < 2.5 && face > 1.5) ao = 1.0 - 0.5 * uAO;   // le talon, dans l'ombre du fond qui déborde
    }
  } else if (uMat < 2.5) {                              // objets de l'atelier
    col = uCol * (0.97 + 0.04 * nz.b);
    float dt = uDetail;
    if (dt > 0.5 && dt < 1.5) {                         // clavier et pavé tactile
      if (top) {
        vec2 k = vF.xy - vec2(28.0, 22.0);
        if (k.x > 0.0 && k.x < 274.0 && k.y > 0.0 && k.y < 104.0) {
          vec2 c = fract(k / vec2(19.57, 17.33));
          col = mix(col, uCol * 0.6, step(0.08, c.x) * step(c.x, 0.92) * step(0.1, c.y) * step(c.y, 0.9));
        }
        vec2 tp = abs(vF.xy - vec2(165.0, 172.0)) - vec2(42.0, 30.0);
        col *= 1.0 - 0.07 * step(max(tp.x, tp.y), 0.0);
      }
    } else if (dt > 1.5 && dt < 2.5) {                  // imprimante : fente, panneau, voyant
      if (face > 2.5 && face < 3.5 && vF.x > 48.0 && vF.x < 272.0 && vF.z > 49.0 && vF.z < 57.0) col = vec3(0.16, 0.17, 0.15);
      if (top) {
        if (vF.x > 222.0 && vF.x < 304.0 && vF.y > 176.0 && vF.y < 210.0) col *= 0.9;
        float led = 1.0 - smoothstep(3.0, 4.0, length(vF.xy - vec2(290.0, 193.0)));
        col = mix(col, vec3(0.56, 0.75, 0.67), led); emis = led;
      }
    } else if (dt > 2.5 && dt < 3.5) gloss = 0.8;       // acier
    else if (dt > 3.5 && dt < 4.5) {                    // bois (la girelle garde l'ombre de la tasse posée)
      col *= 0.94 + 0.08 * sin(vF.x * 0.9 + nz.g * 4.0);
      if (top && uAO > 0.0) col *= 1.0 - uAO * 0.55 * (1.0 - smoothstep(RO - 1.0, DR + 5.0, length(vF.xy)));
    }
    else if (dt > 4.5 && dt < 5.5) {                    // plateau de tournette : on le voit tourner
      gloss = 0.45;
      if (top) {
        float r = length(vF.xy);
        col *= 1.0 - 0.18 * max(max(band(r - 40.0, 0.7), band(r - 75.0, 0.7)), band(r - 104.0, 0.7));
        if (abs(vF.y) < 1.5 && vF.x > 18.0) col *= 0.6;
      }
    } else if (dt > 5.5 && dt < 6.5) {                  // tapis de coupe quadrillé
      gloss = 0.12;
      if (top) {
        vec2 g = vF.xy - 10.0;
        vec2 m10 = abs(mod(g + 5.0, 10.0) - 5.0), m50 = abs(mod(g + 25.0, 50.0) - 25.0);
        float ins = step(0.0, g.x) * step(0.0, g.y) * step(g.x, uDimU - 20.0) * step(g.y, uDimV - 20.0);
        float l = max(0.55 * max(band(m10.x, 0.16), band(m10.y, 0.16)), max(band(m50.x, 0.3), band(m50.y, 0.3)));
        col = mix(col, vec3(0.6, 0.76, 0.68), 0.75 * l * ins);
      }
    } else if (dt > 6.5 && dt < 7.5) {                  // règle métal graduée (zéro à 10 mm du bout)
      gloss = 0.7;
      if (top) {
        float u = vF.x - 10.0, k = floor(u + 0.5), d = abs(u - k);
        float len = mod(k, 10.0) < 0.5 ? 7.0 : (mod(k, 5.0) < 0.5 ? 5.0 : 3.2);
        col = mix(col, vec3(0.12, 0.13, 0.12), band(d, 0.09) * step(vF.y, len) * step(-0.5, u) * step(u, 130.5));
      }
    } else if (dt > 7.5 && dt < 8.5) {                  // mandrin : tube PVC roulé dans du journal
      if (face > 1.5) {
        col = vec3(0.86, 0.85, 0.81) * (0.96 + 0.05 * nz.b);
        float al = (atan(vF.y, vF.x) + 3.14159) * RM;
        float row = fract(vF.z / 1.9), cl = fract(al / 46.0);
        float words = step(0.4, texture2D(uNoise, vec2(al / 11.0, floor(vF.z / 1.9) / 17.0)).b);
        col = mix(col, vec3(0.42, 0.42, 0.41), 0.5 * step(0.45, row) * step(0.05, cl) * step(cl, 0.95) * words);
      } else {
        col = length(vF.xy) < RM - 3.4 ? vec3(0.18, 0.19, 0.18) : vec3(0.58, 0.6, 0.62);
        gloss = 0.3;
      }
    } else if (dt > 8.5 && dt < 9.5) {                  // mousse, éponge : alvéoles
      col *= 0.9 + 0.14 * smoothstep(0.3, 0.9, nz.b) - 0.22 * step(0.82, texture2D(uNoise, vF.xy / 9.0).b);
    } else if (dt > 9.5 && dt < 10.5) gloss = 0.35;     // plastique
    else if (dt > 11.5 && dt < 12.5) {                  // papier cartonné du mandrin : trait « aligner ici »
      if (top || face < 0.5) {
        float d = vF.x - (uDimU - 13.0);
        col = mix(col, vec3(0.3), band(d, 0.28) * step(0.45, fract(vF.y / 3.0)));
        col *= 1.0 - 0.06 * step(uDimU - 13.0, vF.x);
      }
    }
  } else if (uMat < 3.5) {                              // écran de l'ordinateur
    if (abs(face - uScrFace) < 0.5) {
      vec2 q = (vF.xy - uScreen.xy) / uScreen.zw;
      if (q.x > 0.0 && q.x < 1.0 && q.y > 0.0 && q.y < 1.0) {
        vec3 sc = texture2D(uTex, vec2(q.x, 1.0 - q.y)).rgb;
        float glare = 0.05 * smoothstep(0.55, 1.2, q.x + (1.0 - q.y) * 0.6);
        gl_FragColor = vec4(sc * 0.98 + glare, 1.0);
        return;
      }
    }
    gloss = 0.25;
  } else if (uMat < 4.5) {                              // toile de jute sous la terre
    col = vec3(0.885, 0.875, 0.815) * (0.97 + 0.035 * sin(vF.x * 2.2) * sin(vF.y * 2.2) + 0.03 * nz.g);
  } else {                                              // barbotine dans son pot
    col = uCol * (0.95 + 0.08 * nz.g);
    gloss = 0.7;
  }

  // lumière : une directionnelle, un ciel
  float ndl = max(dot(n, uL), 0.0);
  vec3 lit = col * (0.43 + 0.13 * (0.5 + 0.5 * n.y) + 0.6 * ndl) * ao;
  vec3 h = normalize(uL + v);
  float spec = pow(max(dot(n, h), 0.0), mix(12.0, 150.0, gloss)) * mix(0.03, 0.85, gloss);
  gl_FragColor = vec4(mix(lit + spec * ao, col, emis), 1.0);
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
const U1 = [['uMat', 'mat', 1], ['uPrint', 'print', 0], ['uClipV', 'clipV', -1000], ['uHoles', 'holes', 0], ['uStain', 'stain', 0],
  ['uSeam', 'seam', 0], ['uScore', 'score', 0], ['uScore2', 'score2', 0], ['uSlip', 'slip', 0], ['uCook', 'cook', 0], ['uAO', 'ao', 0],
  ['uShape', 'shape', -1], ['uDetail', 'detail', 0], ['uDimU', 'dimU', 1], ['uDimV', 'dimV', 1],
  ['uJoint', 'joint', 0], ['uJoint2', 'joint2', 0], ['uPrick', 'prick', 0], ['uScrFace', 'scrFace', 1]];
const Z3 = [0, 0, 0], ONE3 = [1, 1, 1];
const U3 = [['uCol', 'col', ONE3], ['uKerf', 'kerf', Z3], ['uKnife', 'knife', Z3], ['uSmooth', 'smooth', Z3]];

function createGL(canvas) {
  let gl = null;
  try {
    gl = canvas.getContext('webgl', {
      alpha: true, premultipliedAlpha: true, stencil: true, depth: true,
      antialias: devicePixelRatio < 1.8, powerPreference: 'default',
    });
  } catch (e) { /* pas de WebGL */ }
  if (!gl || !gl.getExtension('OES_standard_derivatives')) return null;
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');

  const program = (vs, fs) => {
    const p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    }
    gl.bindAttribLocation(p, 0, 'aPos'); gl.bindAttribLocation(p, 1, 'aNor'); gl.bindAttribLocation(p, 2, 'aFlat');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) {
      const name = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, '');
      u[name] = gl.getUniformLocation(p, name);
    }
    return { p, u };
  };
  const main = program(VS, FS), shadow = program(VS_SH, FS_SH);

  // tampons créés au premier tracé ; positions et normales renvoyées seulement après un cintrage
  const gpu = (m) => {
    if (!m.gl) {
      const b = m.gl = { pos: gl.createBuffer(), nor: gl.createBuffer(), flat: gl.createBuffer(), idx: gl.createBuffer(), n: m.idx.length };
      gl.bindBuffer(gl.ARRAY_BUFFER, b.pos); gl.bufferData(gl.ARRAY_BUFFER, m.pos, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.nor); gl.bufferData(gl.ARRAY_BUFFER, m.nor, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.flat); gl.bufferData(gl.ARRAY_BUFFER, m.flat, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.idx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.idx, gl.STATIC_DRAW);
      m.dirty = false;
    } else if (m.dirty) {
      gl.bindBuffer(gl.ARRAY_BUFFER, m.gl.pos); gl.bufferSubData(gl.ARRAY_BUFFER, 0, m.pos);
      gl.bindBuffer(gl.ARRAY_BUFFER, m.gl.nor); gl.bufferSubData(gl.ARRAY_BUFFER, 0, m.nor);
      m.dirty = false;
    }
    return m.gl;
  };
  const bind = (b, full) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, b.pos); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    if (full) {
      gl.bindBuffer(gl.ARRAY_BUFFER, b.nor); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.flat); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, 0);
    } else { gl.disableVertexAttribArray(1); gl.disableVertexAttribArray(2); }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.idx);
  };

  const fill = (t, src) => {
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.generateMipmap(gl.TEXTURE_2D);
  };
  const texture = (src, repeat) => {
    const t = gl.createTexture();
    fill(t, src);
    const wrap = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    return t;
  };
  const src = { print: PRINT, ui: UI };
  const tex = { noise: texture(makeNoise(), true) };
  for (const k in src) tex[k] = texture(src[k]);

  const N3 = new Float32Array(9), last = {};
  const u = main.u;
  const set1 = (name, v) => { if (last[name] !== v) { last[name] = v; gl.uniform1f(u[name], v); } };
  const set3 = (name, v) => {
    const l = last[name] || (last[name] = [NaN, NaN, NaN]);
    if (l[0] !== v[0] || l[1] !== v[1] || l[2] !== v[2]) { l[0] = v[0]; l[1] = v[1]; l[2] = v[2]; gl.uniform3f(u[name], v[0], v[1], v[2]); }
  };
  let boundTex = null;
  const setDraw = (d) => {
    const o = d.o, M = d.M;
    N3[0] = M[0]; N3[1] = M[1]; N3[2] = M[2]; N3[3] = M[4]; N3[4] = M[5]; N3[5] = M[6]; N3[6] = M[8]; N3[7] = M[9]; N3[8] = M[10];
    gl.uniformMatrix4fv(u.uM, false, M); gl.uniformMatrix3fv(u.uN, false, N3);
    if (last.P !== (o.P || P_ID)) { last.P = o.P || P_ID; gl.uniformMatrix3fv(u.uP, false, last.P); }
    for (const [name, key, def] of U1) set1(name, o[key] ?? def);
    for (const [name, key, def] of U3) set3(name, o[key] || def);
    const scr = o.screen || [0, 0, 1, 1];
    if (last.scr !== scr) { last.scr = scr; gl.uniform4f(u.uScreen, scr[0], scr[1], scr[2], scr[3]); }
    const t = tex[o.tex || 'print'];
    if (boundTex !== t) { boundTex = t; gl.bindTexture(gl.TEXTURE_2D, t); }
    const b = gpu(d.mesh);
    bind(b, true);
    return b;
  };

  return {
    refresh(name) { fill(tex[name], src[name]); boundTex = null; },
    draw(F) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clearColor(0, 0, 0, 0); gl.clearStencil(0); gl.depthMask(true);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
      gl.disable(gl.BLEND); gl.disable(gl.STENCIL_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.POLYGON_OFFSET_FILL);

      gl.useProgram(main.p);
      gl.uniformMatrix4fv(u.uVP, false, F.VP); gl.uniform3fv(u.uEye, F.eye); gl.uniform3fv(u.uL, LIGHT);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex.noise); gl.uniform1i(u.uNoise, 1);
      gl.activeTexture(gl.TEXTURE0); gl.uniform1i(u.uTex, 0); boundTex = null;
      for (const d of F.draws) { const b = setDraw(d); gl.drawElements(gl.TRIANGLES, b.n, gl.UNSIGNED_SHORT, 0); }

      // ombres : une seule couche par pixel (stencil), posées sur la table
      gl.useProgram(shadow.p);
      gl.uniformMatrix4fv(shadow.u.uS, false, SHADOW); gl.uniformMatrix4fv(shadow.u.uVP, false, F.VP);
      gl.uniform4f(shadow.u.uC, 0.137, 0.153, 0.122, 0.15);
      gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-2, -2);
      gl.enable(gl.STENCIL_TEST); gl.stencilFunc(gl.EQUAL, 0, 0xff); gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
      for (const d of F.draws) {
        if (d.o.noShadow) continue;
        gl.uniformMatrix4fv(shadow.u.uM, false, d.M);
        const b = gpu(d.mesh); bind(b, false);
        gl.drawElements(gl.TRIANGLES, b.n, gl.UNSIGNED_SHORT, 0);
      }
    },
  };
}


/* ─────────────── récit ─────────────── */

// Chaque chapitre anime sa fenêtre de scroll ; s = index du chapitre + avancement.
// (sur mobile, chaque carte reste seule à l'écran de s = i − 0,07 à i + 0,68 : les animations tiennent dedans)
function story(s) {
  const r = {
    draw: sm(1.95, 2.56, s), press: sm(2.56, 2.68, s),                                   // 02 réglages, impression
    out: sm(2.95, 3.34, s), drop: sm(3.34, 3.48, s), ruler: sm(3.5, 3.62, s), rulerOff: sm(3.94, 4.02, s),   // 03
    kerf: sm(4.04, 4.52, s), scrap: sm(4.52, 4.66, s),                                    // 04 découpe du papier
    rIn: sm(4.9, 4.98, s), roll: sm(4.98, 5.44, s), rOut: sm(5.44, 5.52, s), rib: sm(5.5, 5.68, s),   // 05 abaisser
    fly: sm(5.94, 6.22, s), knife: sm(6.26, 6.66, s), stain: sm(6.28, 6.66, s),          // 06 tracer
    clear: sm(6.96, 7.22, s),                                                             // 07 dégager
    peel: [sm(7.12, 7.3, s), sm(7.2, 7.36, s), sm(7.18, 7.34, s)],
    stk: [sm(7.3, 7.56, s), sm(7.36, 7.62, s), sm(7.42, 7.66, s)],
    bevel: sm(7.98, 8.08, s), scoreW: sm(8.08, 8.18, s), scoreD: sm(8.32, 8.42, s), slip: sm(8.42, 8.58, s),   // 08
    mandIn: sm(8.96, 9.12, s), wrap: sm(9.12, 9.48, s), seam: sm(9.48, 9.62, s),         // 09 rouler
    stand: sm(9.96, 10.2, s), mandOut: sm(10.22, 10.38, s),                              // 10 monter
    coil: sm(10.38, 10.47, s), coilFlat: sm(10.47, 10.53, s), rib1: sm(10.52, 10.68, s),
    cuir: sm(10.96, 11.08, s), foam: sm(11.0, 11.1, s), flip1: sm(11.08, 11.24, s),      // 11 le talon
    tplIn: sm(11.24, 11.31, s), prick: sm(11.31, 11.44, s), tplOut: sm(11.44, 11.5, s),
    score2: sm(11.47, 11.52, s), slip2: sm(11.51, 11.55, s), ringFly: sm(11.55, 11.64, s), weld: sm(11.63, 11.68, s),
    flip2: sm(11.96, 12.14, s), foamOut: sm(12.12, 12.22, s), spin2: sm(12.16, 12.66, s),   // 12 finir
    sponge: sm(12.16, 12.22, s) * (1 - sm(12.38, 12.44, s)), cham: sm(12.42, 12.48, s) * (1 - sm(12.62, 12.68, s)),
    play: sm(13.05, 13.35, s),                                                            // 13 à vous
  };
  r.mk = 1;                                        // mandrin en carton : roulé (voir l'étape dédiée)
  r.cook = 0.5 * r.cuir;
  r.smA = sm(0.08, 0.95, r.rib1);                                  // l'estèque efface les soudures de la paroi
  r.smB = 0.55 * r.weld + 0.45 * sm(12.16, 12.4, s);              // l'ébauchoir, puis l'éponge, pour le talon
  return r;
}

// Caméra : [s, cible, rayon à cadrer (bureau, mobile), élévation °, azimut rad]
const CAM = [
  [0.00, [-970, 112, -92], 205, 228, 19, 0.58],
  [0.52, [-970, 112, -92], 205, 228, 19, 0.58],     // en haut de page, s vaut déjà 0,5
  [1.02, [430, 30, 40], 340, 380, 40, 0.12],        // l'établi, de la terre jusqu'au papier
  [1.66, [-560, 30, 130], 340, 380, 40, 0.12],
  [2.00, SCREEN_C, 150, 162, 18, 0],
  [2.66, SCREEN_C, 150, 162, 18, 0],
  [3.04, [-502, 36, 40], 260, 265, 24, 0.42],
  [3.44, [-500, 2, 162], 172, 196, 70, 0],
  [3.60, CHECK, 34, 40, 62, 0.15],                  // le carré témoin sous la règle
  [3.90, CHECK, 34, 40, 62, 0.15],
  [4.04, [-500, 2, 162], 168, 192, 74, 0],
  [4.70, [-500, 2, 162], 168, 192, 74, 0],
  [5.00, [200, 10, 60], 190, 220, 36, 0.32],        // la plaque
  [5.70, [200, 10, 60], 190, 220, 36, 0.32],
  [5.96, [-150, 40, 110], 420, 470, 50, 0.1],       // le vol des gabarits
  [6.24, [200, 4, 60], 196, 222, 62, -0.12],
  [6.70, [200, 4, 60], 196, 222, 62, -0.12],
  [7.04, [270, 0, 120], 270, 300, 50, 0.06],
  [7.70, [270, 0, 120], 270, 300, 50, 0.06],
  [8.02, [140, 2, 168], 22, 28, 30, -0.75],         // le biseau du bout B
  [8.20, [140, 2, 168], 22, 28, 30, -0.75],
  [8.32, [236, 2, -7], 58, 70, 50, 0.6],           // la couronne du fond
  [8.70, [236, 2, -7], 58, 70, 50, 0.6],
  [9.04, [140, 34, 60], 92, 108, 22, 1.25],         // le roulage, vu dans l'axe
  [9.66, [140, 34, 60], 92, 108, 22, 1.25],
  [10.04, [205, 30, 20], 120, 140, 24, 0.5],
  [10.70, [236, 20, -7], 88, 104, 34, 0.55],
  [11.02, [560, 150, 20], 118, 136, 24, 0.4],       // sur la tournette
  [11.26, [560, 172, 20], 74, 88, 54, 0.3],         // le dessous : piqûres, rondelle
  [11.70, [560, 172, 20], 74, 88, 54, 0.3],
  [12.04, [560, 132, 20], 92, 108, 16, 0.5],
  [12.70, [560, 132, 20], 92, 108, 16, 0.5],
  [13.04, [560, 116, 20], 54, 64, 3, 0.35],        // à hauteur d'œil : le cylindre flotte sur son talon
  [15.00, [560, 116, 20], 54, 64, 3, 0.35],
];


/* ─────────────── ciseaux ─────────────── */

// Les gabarits se découpent aux ciseaux : la feuille tourne, les ciseaux avancent sur le trait.
// Au repos, ils sont posés à droite du tapis.
const M_SCIS_REST = (() => { const p = [-372, MAT_H + 0.5, 210], a = 1.9; return { p, a }; })();
function scissorsPose(add, P, dir, open, y) {
  const th = Math.atan2(-dir[1], dir[0]);              // rotation autour de y qui amène x sur la direction de coupe
  const piv = [P[0] - dir[0] * 34, y, P[1] - dir[1] * 34];
  [1, -1].forEach((sg, i) => {
    const a = th + sg * open, ca = Math.cos(a), sa = Math.sin(a);
    place(MX.sb[i], qAxis(0, 1, 0, a), piv[0], piv[1] + (sg > 0 ? 1 : 0), piv[2], [0, 0, 2.1]);
    const b = th + Math.PI - sg * (open * 1.4 + 0.22), cb = Math.cos(b), sb = Math.sin(b);
    place(MX.ss[i], qAxis(0, 1, 0, b), piv[0], piv[1] + (sg > 0 ? 1 : 0), piv[2], [0, 0, 2.3]);
    rigid(MX.sr[i], Q_ID, piv[0] + cb * 37, piv[1] - 0.2 + (sg > 0 ? 1 : 0), piv[2] - sb * 37);
    add(MS.sBlade, MX.sb[i], { mat: 2, col: COL.steel, detail: 3 });
    add(MS.sShank, MX.ss[i], { mat: 2, col: COL.scis, detail: 10 });
    add(MS.sRing, MX.sr[i], { mat: 2, col: COL.scis, detail: 10 });
    void ca; void sa;
  });
}
function scissors(K, bx, by, bz, s0, s1, s, add) {
  if (s < s0 || s > s1) {
    const { p, a } = M_SCIS_REST;
    scissorsPose(add, [p[0], p[2]], [Math.cos(a), Math.sin(a)], 0.05, p[1]);
    return false;
  }
  const i = Math.min(3, Math.floor(K)), t = K - i;
  let p, q, lift = 0;
  if (t < 0.1) {
    const h = t / 0.1, a = rim(i ? i - 1 : 0, i ? 1 : 0), b = rim(i, 0);
    p = [lerp(a[0], b[0], h), lerp(a[1], b[1], h)]; q = rim(i, 0.01);
    lift = i ? 24 * arc(h) : 0;
  } else { const u = cut(K, i); p = rim(i, u); q = rim(i, u + 0.01); }
  let dir = [q[0] - p[0], q[1] - p[1]];
  if (i === 2) dir = [-dir[0], -dir[1]];                // le petit cercle se coupe de l'intérieur
  const l = Math.hypot(dir[0], dir[1]) || 1; dir = [dir[0] / l, dir[1] / l];
  lift += 45 * (1 - sm(s0, s0 + 0.045, s)) + 45 * sm(s1 - 0.045, s1, s);
  const open = 0.05 + 0.13 * (0.5 + 0.5 * Math.cos(K * 46));   // les lames s'ouvrent et se referment en avançant
  scissorsPose(add, [bx + p[0], bz + p[1]], dir, open, by + 1.2 + lift);
  return true;
}

/* ─────────────── la configuration et ses cotes ─────────────── */

const f1 = x => fmt(x, 1), f0 = x => fmt(x, 0);
const NEWS = 0.08, CARD_E = 0.25, TAB = 15;           // journal (un tour), carton 200 g, languette à coller
const D_MAND = 2 * R_IN;                                // Ø intérieur de la tasse crue = Ø du mandrin fini
const D_CARD = D_MAND - 2 * NEWS;                       // Ø extérieur du tube de carton, avant journal
const L_CARD = Math.PI * (D_CARD - CARD_E) + TAB;       // longueur du gabarit D (fibre moyenne + languette)
const H_CARD = Math.ceil(WALL_H + 30);                  // la paroi, plus de quoi tenir le tube
const AREA = L_BAND * WALL_H + Math.PI * R_OUT ** 2 + Math.PI * (FO ** 2 - FI ** 2);
const CLAY_G = Math.round(AREA * T / 1000 * 1.9 * 2.6 / 50) * 50;   // pièces × densité × chute, arrondi à 50 g
const C = {                                             // les cotes, par état
  crue: { d: D_RAW, h: BODY + T, fo: 2 * FO, fi: 2 * FI },
  cuir: { d: D_RAW * CR, h: (BODY + T) * CR, fo: 2 * FO * CR, fi: 2 * FI * CR, r: FO * CR, rm: (FO + FI) / 2 * CR },
  cuite: { d: FIN.d, h: FIN.h, fo: FIN.fo, fi: FIN.fi },
};
const ESP = FIN.h < 50;
/* ce qu'on imprime : les feuilles du PDF telles que l'outil les a calepinées */
const nF = (n, w) => `${n} feuille${n > 1 ? 's' : ''} ${w}`;
const PAPER_KIT = CFG.sheets
  ? [CFG.sheets.fp ? nF(CFG.sheets.fp, 'A4 80 g') : '', nF(CFG.sheets.fc || 1, 'A4 de papier cartonné 160 à 220 g')].filter(Boolean).join(', ')
  : '1 feuille A4 de papier cartonné 160 à 220 g, et 1 feuille A4 80 g pour une grande tasse';
const PRINT_HOW = CFG.sheets && !CFG.sheets.fp
  ? `Téléchargez le PDF de vos gabarits depuis l'outil. Les quatre gabarits, mandrin compris, tiennent sur <b>${CFG.sheets.fc > 1 ? CFG.sheets.fc + ' feuilles' : 'une seule feuille'}</b> : imprimez-la sur <b>papier cartonné</b>.`
  : `Téléchargez le PDF de vos gabarits depuis l'outil. La planche marquée « à imprimer sur papier cartonné » (celle du mandrin <b>D</b>) passe sur <b>papier cartonné</b>${CFG.sheets ? ', les autres (<b>A, B, C</b>) sur papier ordinaire' : ' ; les autres sur papier ordinaire. Pour une petite tasse, les quatre gabarits tiennent sur cette seule feuille'}.`;
const KIND = ESP ? 'tasse à espresso' : `version haute, ${fmt(FIN.h / 10, FIN.h % 10 ? 1 : 0)} cm`;

/* ─────────────── les étapes ─────────────── */

// s : fenêtre de l'animation dans le récit de la LP ; cam : caméra imposée ; ovr(t) : état imposé ; dur : secondes
const tag = s => `<span class="st st--${s}">${{ crue: 'crue', cuir: 'au cuir', cuite: 'cuite', papier: 'papier', carton: 'carton' }[s]}</span>`;
const row = (k, v, s) => `<div class="kv"><span>${k}</span><b>${v}${s ? ' ' + tag(s) : ''}</b></div>`;
const STEPS = [
  {
    id: 'ma-tasse', n: 'Ma tasse', time: '', s: [13.5, 13.5], dur: 0.1, spin: true,
    cam: [[560, BAT_TOP + T + BODY * 0.5, 20], 62 + BODY * 0.85, 12, 0.4],
    html: `<p class="lead">Le tutoriel suit <b>votre</b> tasse : toutes les cotes ci-dessous sont recalculées pour votre terre, et données à l'état où vous les mesurez.</p>
      <div class="cfg">${row('Tasse', `Ø ${f0(FIN.d)} × ${f1(FIN.h)} mm`, 'cuite')}${row('Contenance', `${VOL_CL} cl à ras bord`)}
      ${row('Retrait total de votre terre', `${f0(CFG.r)} %`)}${row('Retrait déjà fait au cuir', `${f0(CFG.cuir)} %`)}${row('Plaque', `${f1(T)} mm`, 'crue')}</div>
      <div class="states">
        <div><i>crue</i><b>Ø ${f1(C.crue.d)}</b><small>on découpe, on monte</small></div>
        <div><i>au cuir</i><b>Ø ${f1(C.cuir.d)}</b><small>on pose le talon</small></div>
        <div><i>cuite</i><b>Ø ${f0(C.cuite.d)}</b><small>on boit</small></div>
      </div>
      <p class="note">Le retrait total, c'est le séchage plus la cuisson, de la terre humide à la pièce cuite. Au cuir, une partie du retrait de séchage est déjà faite : c'est pour cela que le talon n'a pas les mêmes cotes que la rondelle découpée.</p>
      <h3>Il vous faut</h3>
      <ul class="kit">
        <li><em>papier</em> ${PAPER_KIT}, ciseaux, colle en bâton, ruban adhésif</li>
        <li><em>terre</em> ≈ ${CLAY_G} g de grès fin, rouleau, 2 réglettes de ${f1(T)} mm, toile</li>
        <li><em>montage</em> aiguille, strieur, barbotine, pinceau, estèque souple, ébauchoir, papier journal</li>
        <li><em>fin</em> tournette, mousse, éponge, bande de chamois, plastique</li>
      </ul>
      <p class="note">Comptez 1 h 30 de travail, puis 2 à 4 h d'attente avant la pose du talon.</p>`,
  },
  {
    id: 'imprimer', n: 'Imprimer', time: '5 min', s: [2.9, 3.9], dur: 5,
    html: `<ol>
        <li>${PRINT_HOW}</li>
        <li>Dans la fenêtre d'impression : <b>taille réelle</b>, « ajuster à la page » décoché.</li>
        <li>Posez la règle sur la barre témoin du bandeau : <b>50 mm</b> pile. À 48 mm, toute la tasse sortirait 4 % trop petite : réimprimez.</li>
      </ol>
      <div class="cfg">${row('Barre témoin', '50,0 mm', 'papier')}</div>
      <p class="tip"><b>Astuce</b> Vérifiez la barre sur chaque feuille : les imprimantes changent parfois l'échelle quand on change de papier.</p>`,
  },
  {
    id: 'decouper', n: 'Découper aux ciseaux', time: '10 min', s: [4.0, 4.66], dur: 6,
    html: `<ol>
        <li>Coupez <b>au milieu du trait plein</b> : il est le bord exact de la pièce.</li>
        <li>Dans les courbes, <b>tournez la feuille, pas les ciseaux</b>, et coupez avec le fond des lames, à petits coups réguliers.</li>
        <li>Le talon : pliez légèrement la feuille au centre de la rondelle, entaillez d'un coup de ciseaux, puis suivez le <b>petit cercle</b> de l'intérieur. Le grand cercle ensuite.</li>
      </ol>
      <div class="cfg">${row('A · paroi', `${f1(L_BAND)} × ${f1(WALL_H)} mm`, 'papier')}${row('B · fond', `Ø ${f1(D_RAW)} mm`, 'papier')}${row('C · talon', `Ø ${f1(2 * FO)} / ${f1(2 * FI)} mm`, 'papier')}${row('D · mandrin', `${f1(L_CARD)} × ${H_CARD} mm`, 'carton')}</div>
      <p class="tip"><b>Bonne pratique</b> Des ciseaux plutôt qu'un cutter : pas de lame qui dérape sur la table, et le bord reste net, sans bavure de papier qui fausserait le tracé.</p>`,
  },
  {
    id: 'mandrin', n: 'Le mandrin en carton', time: '10 min', s: [4.72, 4.72], dur: 5,
    cam: [[MD_REST[0], 26, MD_REST[2]], 58 + MAND_L * 0.32, 30, 0.5], ovr: t => ({ mk: sm(0.05, 0.85, t) }),
    html: `<p class="lead">Un tube PVC au bon diamètre est presque introuvable. Le vôtre se roule en carton, au <b>Ø exact de votre tasse crue</b>.</p>
      <ol>
        <li>Roulez le gabarit <b>D</b>, face imprimée dehors, jusqu'à ce que le bord vienne pile sur le trait <b>« aligner ici »</b>. C'est ce trait qui fait le diamètre.</li>
        <li>Collez la languette (colle en bâton) sur toute la hauteur et tenez une minute. Un ruban adhésif par-dessus, en haut et en bas.</li>
        <li>Enroulez <b>un seul tour</b> de papier journal autour, scotché : il empêche la terre de coller, et le gabarit a déjà retiré son épaisseur.</li>
        <li>Bourrez le tube de journal froissé : il ne s'écrasera pas quand la terre viendra serrer.</li>
      </ol>
      <div class="cfg">${row('Mandrin fini (journal compris)', `Ø ${f1(D_MAND)} mm`, 'crue')}${row('Tube de carton seul', `Ø ${f1(D_CARD)} mm`, 'carton')}${row('Hauteur', `${H_CARD} mm : la paroi + 3 cm`)}</div>
      <p class="tip"><b>Pourquoi ce Ø</b> Le mandrin sert pendant le montage, terre humide : il prend le Ø intérieur de la tasse <b>crue</b> (Ø ${f1(D_RAW)} − 2 × ${f1(T)} de plaque), pas celui de la tasse cuite.</p>`,
  },
  {
    id: 'abaisser', n: 'Abaisser la plaque', time: '10 min', s: [4.88, 5.7], dur: 7,
    html: `<ol>
        <li>Tapez ≈ ${CLAY_G} g de grès en galette, à la paume.</li>
        <li>Roulez du centre vers les bords, entre les deux réglettes de <b>${f1(T)} mm</b>. Décollez et retournez la plaque entre deux passes, jusqu'à ce que le rouleau porte sur les réglettes.</li>
        <li>Resserrez les deux faces à l'estèque souple : la terre fendra moins au cintrage.</li>
        <li>Laissez raffermir une vingtaine de minutes : elle se soulève sans s'affaisser.</li>
      </ol>
      <div class="cfg">${row('Plaque', `${f1(T)} mm`, 'crue')}${row('Une fois cuite', `${f1(E_FIN)} mm`, 'cuite')}</div>`,
  },
  {
    id: 'tracer', n: 'Tracer', time: '5 min', s: [5.92, 6.7], dur: 6,
    html: `<ol>
        <li>Posez A, B et C sur la plaque, lissez-les du plat de la main : l'humidité les plaque.</li>
        <li>Suivez chaque bord à l'aiguille <b>tenue verticale</b>, d'un seul geste par contour. Inclinée, elle taille un chant en biais qui se soudera mal.</li>
        <li>Pour le talon, le petit cercle d'abord.</li>
      </ol>
      <p class="tip"><b>Astuce</b> Les cotes des gabarits sont crues : le retrait de ${f0(CFG.r)} % est déjà compris. Ne corrigez rien à l'œil.</p>`,
  },
  {
    id: 'degager', n: 'Dégager', time: '5 min', s: [6.94, 7.68], dur: 6,
    html: `<ol>
        <li>Retirez la terre autour des pièces sans les soulever ; la chute retourne au pain, dans un sac fermé.</li>
        <li>Décollez les gabarits par un coin et gardez-les.</li>
        <li><b>Glissez la rondelle C sous le même plastique que la tasse</b> pendant tout le séchage : elle doit arriver au cuir en même temps qu'elle.</li>
      </ol>`,
  },
  {
    id: 'biseauter', n: 'Biseauter la paroi', time: '5 min', s: [7.96, 8.24], dur: 4,
    html: `<ol>
        <li>Taillez les deux petits côtés de A à 45°, sur les zones hachurées : <b>l'un sur le dessus, l'autre sur le dessous</b> (retournez la bande).</li>
        <li>Ils se recouvriront sans surépaisseur.</li>
      </ol>
      <div class="cfg">${row('Longueur de A', `${f1(L_BAND)} mm`, 'crue')}${row('dont les biseaux', `${f1(BEV)} mm`)}</div>
      <p class="note">${f1(L_BAND)} mm, c'est la circonférence prise au milieu de l'épaisseur (${f1(L_MID)} mm), plus les ${f1(BEV)} mm que mangent les deux biseaux.</p>`,
  },
  {
    id: 'strier', n: 'Strier, barbotiner', time: '5 min', s: [8.24, 8.66], dur: 4,
    html: `<ol>
        <li>Striez les deux biseaux, le chant du bas de la paroi, et la couronne de 6 mm au bord du fond.</li>
        <li>Barbotine épaisse de la même terre, au pinceau, juste avant d'assembler.</li>
      </ol>`,
  },
  {
    id: 'rouler', n: 'Rouler sur le mandrin', time: '5 min', s: [8.94, 9.66], dur: 6,
    html: `<ol>
        <li>Posez le mandrin au milieu de la paroi, <b>face tracée contre lui</b>.</li>
        <li>Relevez les deux bouts autour du tube, sans tirer sur la terre.</li>
        <li>Quand les biseaux se rejoignent, pressez la soudure contre le carton, du pouce, de bas en haut.</li>
      </ol>
      <div class="cfg">${row('Ø intérieur', `${f1(D_MAND)} mm`, 'crue')}${row('Ø extérieur', `${f1(D_RAW)} mm`, 'crue')}</div>`,
  },
  {
    id: 'monter', n: 'Monter sur le fond', time: '5 min', s: [9.94, 10.4], dur: 5,
    html: `<ol>
        <li>Debout, mandrin en place, posez le cylindre sur la couronne striée, au ras du bord. Un léger va-et-vient fait remonter la barbotine.</li>
        <li>Retirez le journal froissé de l'intérieur, puis <b>rabattez le carton vers le centre</b> : il se replie et sort sans tirer sur la terre. Le tour de journal se décolle du bout des doigts.</li>
      </ol>
      <p class="tip"><b>L'avantage du carton</b> Un tube rigide se coince quand la terre serre ; le carton se froisse et sort tout seul.</p>`,
  },
  {
    id: 'colombin', n: 'Colombin, estèque', time: '10 min', s: [10.36, 10.7], dur: 4,
    html: `<ol>
        <li>Dedans : un colombin de 3 mm couché dans l'angle paroi / fond, écrasé au doigt, lissé à l'ébauchoir. C'est lui qui rend la tasse étanche.</li>
        <li>Dehors : ramenez la terre du fond sur la paroi, puis l'estèque souple tout autour, soudure verticale comprise.</li>
        <li>Couvrez d'un plastique léger, la rondelle C à côté.</li>
      </ol>`,
  },
  {
    id: 'reperer', n: 'Repérer le talon', time: '2 à 4 h, puis 5 min', s: [10.94, 11.46], dur: 6,
    ovr: () => ({ tplIn: 0, tplOut: 1 }),
    html: `<p class="lead">À consistance cuir, la tasse se tient et l'ongle marque encore. Elle a déjà fait <b>${f0(CFG.cuir)} % de son retrait</b> : ses cotes ne sont plus celles de la découpe.</p>
      <div class="cfg">${row('Fond', `Ø ${f1(C.cuir.d)} mm`, 'cuir')}${row('Cercle du talon', `Ø ${f1(C.cuir.fo)} mm`, 'cuir')}${row('soit un rayon de', `${f1(C.cuir.r)} mm`, 'cuir')}</div>
      <ol>
        <li>Retournez la tasse sur une mousse, sur la tournette, et centrez-la sur les cercles du plateau.</li>
        <li>Tournette lancée, posez la pointe de l'aiguille à <b>${f1(C.cuir.r)} mm du centre</b> : un tour suffit à tracer le cercle du talon.</li>
      </ol>
      <p class="warn"><b>Attention</b> Ne reposez pas le gabarit B : en papier, il n'a pas rétréci. Au cuir, il déborde de ${f1((D_RAW - C.cuir.d) / 2)} mm tout autour et son cercle de talon tomberait trop grand.</p>`,
  },
  {
    id: 'talon', n: 'Poser le talon', time: '10 min', s: [11.46, 11.7], dur: 4,
    ovr: () => ({ tplIn: 0, tplOut: 1 }),
    html: `<ol>
        <li>Sortez la rondelle C de sous le plastique : elle a séché au même rythme que la tasse, elle mesure maintenant <b>Ø ${f1(C.cuir.fo)} / ${f1(C.cuir.fi)} mm</b> et tombe juste sur le cercle.</li>
        <li>Striez l'anneau tracé et une face de la rondelle, barbotine sur les deux.</li>
        <li>Posez la rondelle face striée dessous, pressez à plat, puis soudez l'angle intérieur et l'angle extérieur à l'ébauchoir.</li>
      </ol>
      <div class="cfg">${row('Rondelle découpée', `Ø ${f1(C.crue.fo)} / ${f1(C.crue.fi)} mm`, 'crue')}${row('Rondelle à la pose', `Ø ${f1(C.cuir.fo)} / ${f1(C.cuir.fi)} mm`, 'cuir')}${row('Talon fini', `Ø ${f0(C.cuite.fo)} × ${f1(E_FIN)} mm`, 'cuite')}</div>
      <p class="warn"><b>Attention</b> Une rondelle restée à l'air sèche plus vite que la tasse : plus petite et plus dure, elle se décollera. Si c'est le cas, découpez-en une neuve dans une chute gardée humide, aux cotes « au cuir ».</p>`,
  },
  {
    id: 'finir', n: 'Finir la lèvre', time: '5 min', s: [11.94, 12.7], dur: 6,
    html: `<ol>
        <li>Remettez la tasse à l'endroit, centrée sur la tournette.</li>
        <li>Éponge bien essorée sur toute la paroi.</li>
        <li>Une bande de chamois humide pliée sur la lèvre, deux tours de tournette : le bord s'arrondit sans s'écraser.</li>
      </ol>`,
  },
  {
    id: 'secher', n: 'Sécher', time: '1 semaine', s: [13.2, 13.6], dur: 3, spin: true,
    html: `<ol>
        <li>Séchez la tasse <b>à l'envers</b>, sous plastique les deux premiers jours, puis à l'air jusqu'à ce qu'elle soit froide au toucher nulle part.</li>
        <li>Biscuit, émail, second feu : selon votre terre et votre émail. Pas d'émail sous le talon.</li>
      </ol>
      <div class="cfg">${row('Montée', `Ø ${f1(C.crue.d)} × ${f1(C.crue.h)} mm`, 'crue')}${row('Talon posé', `Ø ${f1(C.cuir.d)} × ${f1(C.cuir.h)} mm`, 'cuir')}${row('Finie', `Ø ${f0(C.cuite.d)} × ${f1(C.cuite.h)} mm · ${VOL_CL} cl`, 'cuite')}</div>
      <p class="note">Si votre tasse cuite mesure autre chose que Ø ${f0(FIN.d)}, mesurez le retrait réel de cette terre et reportez-le dans l'outil : la prochaine tombera juste.</p>`,
  },
];

/* ─────────────── accès : acheté, ou aperçu ───────────────
   Le tutoriel vit à côté de l'outil (même origine) : il lit les achats que
   l'outil enregistre. Sans achat, les trois premières étapes restent ouvertes,
   la suite renvoie à la fiche produit. */
const PRODUCT = '../#produit/bol-talon';
const OWNED = (() => { try { return !!(JSON.parse(localStorage.getItem('atelier-owned') || '{}')['bol-talon']); } catch (e) { return false; } })();
const ALL = STEPS.slice();
const FREE = 3;
if (!OWNED) {
  STEPS.length = FREE;
  STEPS.push({
    id: 'suite', n: 'La suite du tutoriel', time: '', s: [13.5, 13.5], dur: 0.1, spin: true, lock: true, cam: ALL[0].cam,
    html: `<p class="lead">Vous venez de voir le début. Les <b>${ALL.length - FREE} étapes suivantes</b> sont incluses avec le gabarit :</p>
      <ul class="kit">${ALL.slice(FREE).map(x => `<li>${x.n}</li>`).join('')}</ul>
      <p class="note">Gabarits A, B, C et le mandrin D en carton, recalculés à vos cotes, plus ce tutoriel en entier. Achat unique, sur Gumroad.</p>`,
  });
}

/* ─────────────── page ─────────────── */

const root = document.documentElement;
const canvas = $('#scene');
paintGrain();

// cartes, rail, barre mobile : tout est construit depuis STEPS
{
  const N = STEPS.length - 1;
  $('[data-kind]').textContent = KIND;
  $('.bar__pdf').href = FIN.h === 80 && FIN.d === 64 ? 'gabarits-h80.pdf' : 'gabarits.pdf';   // maquette : les deux PDF générés
  $('[data-cfg]').textContent = `Ø ${f0(FIN.d)} × ${f1(FIN.h)} mm · ${VOL_CL} cl · retrait ${f0(CFG.r)} %`;
  $('#rail ol').innerHTML = (OWNED ? STEPS : ALL).map((st, i) => {
    const lk = !OWNED && i >= FREE;
    return `<li><a href="#${lk ? 'suite' : st.id}" data-go="${lk ? FREE : i}"${lk ? ' class="lock"' : ''}><span>${i ? String(i).padStart(2, '0') : '·'}</span>${st.n}${lk ? ' <i>🔒</i>' : ''}</a></li>`;
  }).join('');
  $('.bar__back').href = PRODUCT;
  const pdf = $('.bar__pdf');
  if (OWNED) { pdf.textContent = 'Mes gabarits'; pdf.href = PRODUCT; pdf.removeAttribute('download'); }
  else { pdf.textContent = 'Débloquer · 4,99 €'; pdf.href = PRODUCT; pdf.removeAttribute('download'); }
  $('#steps').innerHTML = STEPS.map((st, i) => `
    <section class="step" id="${st.id}" data-i="${i}">
      <article class="card">
        <p class="card__num">${st.lock ? 'Inclus avec le gabarit' : i ? `Étape ${String(i).padStart(2, '0')} / ${ALL.length - 1}` : 'Avant de commencer'}${st.time ? `<span>${st.time}</span>` : ''}</p>
        <h2>${st.n}</h2>
        ${st.html}
        <div class="card__nav">
          ${i && !st.lock ? `<button class="btn btn--ghost" type="button" data-replay>Revoir le geste</button>` : ''}
          ${st.lock ? `<a class="btn btn--primary" href="${PRODUCT}">Débloquer · 4,99 €</a>`
            : i < N ? `<button class="btn btn--primary" type="button" data-go="${i + 1}">${i ? 'Étape suivante' : 'Commencer'} →</button>` : `<a class="btn btn--primary" href="#ma-tasse" data-go="0">Revenir au début</a>`}
        </div>
      </article>
    </section>`).join('');
}
const sections = $$('.step');

/* ─────────────── image ─────────────── */

// Zone de l'écran réservée à la scène (fractions : gauche, haut, droite, bas)
let FRAME_OVR = null, CAM_OVR = null, SOLO = false;
let cw = 1, chh = 1;
function frameRect() {
  if (FRAME_OVR) return FRAME_OVR;
  if (cw >= 1000) { const l = ($('#steps').getBoundingClientRect().right + 16) / cw; return [Math.min(0.62, l), 0.1, 0.98, 0.96]; }
  return [0.03, 0.075, 0.97, 0.44];
}

/* ─────────────── lecteur : une étape = une animation ─────────────── */

let cur = -1, tStep = 1, playing = false;
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
let orbitBack = false;

// l'étape active est celle qui occupe le milieu de l'écran, qu'on y soit venu au clic ou au défilement
let settle = 0;
function pickStep() {
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



/* ─────────────── image ─────────────── */

const GLR = (() => { try { return createGL(canvas); } catch (e) { console.warn(e); return null; } })();
if (!GLR) root.classList.add('no-gl');

const F = { draws: [], VP: m4(), eye: new Float32Array(3) };
const Pm = m4(), Vm = m4(), FOV = 30 * DEG;
const MX = {
  sheet: m4(), group: m4(), card: m4(), sb: [m4(), m4()], ss: [m4(), m4()], sr: [m4(), m4()], slab: m4(), roller: m4(), ruler: m4(), cw: m4(), cd: m4(), cr: m4(), coil: m4(),
  root: m4(), mand: m4(), att: m4(), rib: m4(), bat: m4(), wheel: m4(), foam: m4(), sponge: m4(), cham: m4(), tmp: m4(),
};
let pose = { C: [0, 0, 0], q: Q_ID, spin: 0 };

// La plaque s'étale sous le rouleau : la surface grandit, l'épaisseur baisse, le volume reste
const rollG = r => 1 - (1 - r) ** 1.6;
function slabScale(r) {
  const g = rollG(r), sx = lerp(0.62, 1, g), sz = lerp(0.36, 1, g);
  return [sx, 1 / (sx * sz), sz];
}

// La tasse : montée sur le fond, retournée sur la mousse de la tournette, remise à l'endroit sur la girelle
function cupPose(st) {
  const UP = [ASM0[0], BODY_C, ASM0[2]];
  const ON_FOAM = [TRN[0], FOAM_TOP + BODY_C, TRN[2]], ON_BAT = [TRN[0], BAT_TOP + T + BODY_C, TRN[2]];
  let C = UP, q = Q_ID, spin = 0;
  if (st.flip2 > 0) { C = hop(ON_FOAM, ON_BAT, st.flip2, 90); q = slerp(Q_FLIP, Q_ID, sm(0.15, 0.85, st.flip2)); }
  else if (st.flip1 > 0) { C = hop(UP, ON_FOAM, st.flip1, 150); q = slerp(Q_ID, Q_FLIP, sm(0.2, 0.85, st.flip1)); }
  if (st.flip2 >= 1) { spin = st.spin2 * Math.PI * 4; q = qAxis(0, 1, 0, spin); }
  return { C, q, spin };
}

// Outil contre la paroi, à l'azimut az (l'estèque debout, l'éponge à plat contre la terre)
function ribAround(M, vis, P, az, y) {
  const rh = [Math.sin(az), 0, Math.cos(az)], th = [Math.cos(az), 0, -Math.sin(az)];
  const ca = Math.cos(0.38), sa = Math.sin(0.38);
  const X = [rh[0] * ca + th[0] * sa, 0, rh[2] * ca + th[2] * sa], Z = [0, 1, 0], Y = [X[2], 0, -X[0]];
  const r = R_OUT + 50 * (1 - vis);
  basis(M, X, Y, Z, [P[0] + rh[0] * r, y, P[2] + rh[2] * r], [RIB_X0, 1.5, 0]);
}

function compose(st) {
  const D = F.draws; D.length = 0;
  const add = (mesh, M, o) => { if (!SOLO || SOLO_SET.has(mesh)) D.push({ mesh, M, o }); };
  pose = cupPose(st);
  if (SOLO) pose.C = [pose.C[0], pose.C[1] - BAT_TOP, pose.C[2]];
  place(MX.root, pose.q, pose.C[0], pose.C[1], pose.C[2], [0, BODY_C, 0]);
  const qRoot = pose.q;

  // décor : la toile, le tapis de coupe ; l'ordinateur et l'imprimante quittent la scène quand la caméra ne revient plus
  add(MS.cloth, M_CLOTH, { mat: 4, noShadow: true });
  add(MS.mat, M_MAT, { mat: 2, col: COL.mat, detail: 6, dimU: 340, dimV: 320, noShadow: true });
  if (sC < 7.6) {
    add(MS.lapBase, M_LAPB, { mat: 2, col: COL.lapBase, detail: 1 });
    add(MS.lapLid, M_LID, { mat: 3, col: COL.lapLid, tex: 'ui', screen: SCREEN, scrFace: 1 });
    add(MS.prBody, M_PRN, { mat: 2, col: COL.printer, detail: 2 });
    add(MS.prTray, M_TRAY, { mat: 0 });
  }

  // la règle : posée sur le carré témoin, puis rangée
  {
    const a = st.ruler * (1 - st.rulerOff), q = slerp(qAxis(0, 1, 0, Math.PI / 2), Q_ID, a);
    const c0 = xf(M_RULER0, [75, 0, 12.5]), c1 = xf(M_RULER1, [75, 0, 12.5]);
    place(MX.ruler, q, ...hop(c0, c1, a, 40), [75, 0, 12.5]);
    add(MS.ruler, MX.ruler, { mat: 2, col: COL.ruler, detail: 7 });
  }

  // la feuille : elle sort de l'imprimante, se pose sur le tapis, puis la chute s'en va
  if (st.out > 0 && st.scrap < 1) {
    const M = MX.sheet;
    if (st.drop <= 0) place(M, qAxis(1, 0, 0, 10.5 * DEG), SLOT[0], SLOT[1], SLOT[2], [105, 0, 297 * (1 - st.out)]);
    else if (st.scrap <= 0) {
      const d = st.drop;
      place(M, qAxis(1, 0, 0, 10.5 * DEG * (1 - d)), SLOT[0], lerp(SLOT[1], REST[1], d), lerp(SLOT[2], REST[2], d), [105, 0, 0]);
    } else {
      const e = st.scrap;
      place(M, qMul(qAxis(0, 1, 0, 0.8 * e), qAxis(0, 0, 1, -0.3 * e)),
        REST[0] + 105 - 430 * e, REST[1] + 90 * Math.sin(e * Math.PI / 2), REST[2] + 148.5 + 140 * e, SHEET_C);
    }
    add(MS.sheet, M, {
      mat: 0, print: 1, clipV: st.drop > 0 ? -100 : 297 * (1 - st.out),
      kerf: cuts(st.kerf * 4), holes: st.kerf >= 0.999 ? 1 : 0, noShadow: st.drop <= 0,
    });
  }

  // les gabarits de papier : dans la feuille, sur la plaque, puis sur la pile ; le fond resservira
  if (st.kerf >= 0.999) {
    const f = st.fly, Gm = MX.group;
    place(Gm, qMul(qAxis(0, 0, 1, 0.1 * arc(f)), qAxis(1, 0, 0, -0.1 * Math.sin(2 * Math.PI * f))),
      lerp(REST[0], ORG[0], f) + 105, lerp(REST[1], T + 0.05, f) + 110 * arc(f), lerp(REST[2], ORG[1], f) + 148.5, SHEET_C);
    PIECES.forEach((pc, i) => {
      const pe = st.peel[i], sk = st.stk[i];
      if (pe <= 0 && sk <= 0) {
        mul(pc.M, Gm, pc.L);
        if (pc.len) bend(pc.mesh, FLAT);
      } else {
        const c0 = xf(pc.on, pc.lc);
        let q0 = pc.q0, lift = 0;
        if (pc.len) bend(pc.mesh, { uc: pe * pc.len, k: 1 / 22, aNeg: 0.6 * (1 - sk), aPos: 0 });
        else { lift = 22 * pe * (1 - sk); q0 = qMul(q0, qAxis(1, 0, 0, 0.45 * pe)); }
        place(pc.M, slerp(q0, pc.qs, sk), lerp(c0[0], pc.stk[0], sk), lerp(c0[1], pc.stk[1], sk) + lift + 120 * arc(sk), lerp(c0[2], pc.stk[2], sk), pc.lc);
      }
      // 11 : le gabarit du fond revient se poser sous la tasse retournée, le temps de piquer le talon
      if (i === 1 && st.tplIn > 0 && st.tplOut < 1) {
        const under = xf(MX.root, [0, 0, 0]);
        under[1] += 0.06;
        const a = st.tplIn * (1 - st.tplOut);
        place(pc.M, slerp(pc.qs, Q_ID, a), ...hop(pc.stk, under, a, 140), [0, 0, 0]);
      }
      add(pc.mesh, pc.M, { mat: 0, print: 1, P: pc.P, stain: st.stain });
    });
  }

  // les réglettes et le rouleau ; la plaque s'étale, se resserre à l'estèque, puis est tracée et dégagée
  for (const M of M_REGL) add(MS.regl, M, { mat: 2, col: COL.wood, detail: 4 });
  const [sx, sy, sz] = slabScale(st.roll);
  {
    const hz = 122 * sz + 16, top = T * sy + 25;
    let C = RL_REST, ang = 0;
    const start = [BRD[0], T * slabScale(0)[1] + 25, BRD[2] - (122 * 0.36 + 16)];
    const end = [BRD[0], T + 25, BRD[2] - (122 + 16)];
    if (st.roll <= 0) C = hop(RL_REST, start, st.rIn, 50);
    else if (st.roll >= 1) C = hop(end, RL_REST, st.rOut, 50);
    else {
      const P = 4, seg = st.roll * P, j = Math.min(P - 1, Math.floor(seg)), t = seg - j, dir = j % 2 ? 1 : -1;
      const z = BRD[2] - dir * lerp(-hz, hz, sm(0, 1, t));
      C = [BRD[0], top, z];
      ang = (z - BRD[2]) / 25;
    }
    if (st.roll <= 0) ang = 0;
    place(MX.roller, qMul(qAxis(1, 0, 0, ang), qAxis(0, 0, 1, -Math.PI / 2)), C[0], C[1], C[2], [0, 165, 0]);
    add(MS.roller, MX.roller, { mat: 2, col: COL.wood, detail: 4 });
  }
  if (st.clear < 1) {
    const e = st.clear, K = st.knife * 4;
    place(MX.slab, qAxis(0, 1, 0, -0.3 * e), BRD[0] - 560 * sm(0.15, 1, e), 50 * sm(0, 0.35, e), BRD[2] - 60 * e, [0, 0, 0]);
    scaleCols(MX.slab, sx, sy, sz);
    add(MS.slab, MX.slab, { mat: 1, P: P_SLAB, shape: -1, knife: cuts(K), holes: st.knife >= 0.999 ? 1 : 0 });
  }

  // la tasse et ses pièces
  if (st.knife >= 0.999) {
    const look = { mat: 1, cook: st.cook, seam: 1, smooth: [st.smA, st.smB, 0] };

    // A · la paroi : biseaux, puis enroulée sur le tube, puis debout sur le fond
    MS.cWall.bev = BEV * st.bevel;
    const A_END = L_BAND / (2 * R_MID) + 1e-3;
    bend(MS.cWall, { uc: L_BAND / 2, k: 1 / R_MID, aNeg: st.wrap * A_END, aPos: st.wrap * A_END });
    if (st.stand <= 0) MX.cw.set(M_CW0);
    else {
      const sd = st.stand, c0 = xf(M_CW0, LC_BAND), qT = qMul(qRoot, quatOf(L_BAND_ASM));
      const c1 = xf(MX.root, [0, T + WALL_H / 2, 0]);
      if (sd < 1) place(MX.cw, slerp(Q_PW, qT, sd), ...hop(c0, c1, sd, 70), LC_BAND);
      else mul(MX.cw, MX.root, L_BAND_ASM);
    }
    add(MS.cWall, MX.cw, { ...look, P: P_WALL, shape: 0, dimU: L_BAND, dimV: WALL_H, ao: st.wrap,
      score: st.scoreW, slip: st.slip, joint: st.seam });

    // B · le fond : il ne bouge pas ; c'est la tasse qui se monte dessus
    MX.cd.set(MX.root);                                // avant le retournement, c'est exactement M_CD0
    add(MS.cDisc, MX.cd, { ...look, P: P_DISC, shape: 1, ao: 0.85 * st.stand, score: st.scoreD, slip: st.slip,
      score2: st.score2, prick: st.prick, joint: st.stand, joint2: st.ringFly >= 1 ? 1 : 0 });

    // C · le talon : sur la toile, sous plastique, puis posé sous la tasse retournée
    if (st.ringFly <= 0) MX.cr.set(M_CR0);
    else {
      mul(MX.tmp, MX.root, L_RING_ASM);
      if (st.ringFly < 1) {
        const c0 = xf(M_CR0, [0, T / 2, 0]), c1 = xf(MX.tmp, [0, T / 2, 0]);
        place(MX.cr, slerp(Q_ID, qRoot, sm(0.15, 0.85, st.ringFly)), ...hop(c0, c1, st.ringFly, 130), [0, T / 2, 0]);
      } else MX.cr.set(MX.tmp);
    }
    add(MS.cRing, MX.cr, { ...look, P: P_RING, shape: 2, score2: st.score2, slip: st.slip2, joint2: st.ringFly >= 1 ? 1 : 0, ao: sm(0.85, 1, st.flip2) });

    // le colombin, couché dans l'angle intérieur puis écrasé
    if (st.coil > 0) {
      rigid(MX.tmp, Q_ID, 0, T, 0); scaleCols(MX.tmp, 1, st.coil * (1 - 0.5 * st.coilFlat), 1);
      mul(MX.coil, MX.root, MX.tmp);
      add(MS.coil, MX.coil, { ...look, shape: 3, joint: 1, smooth: [st.coilFlat * 0.8, 0, 0], noShadow: true });
    }
  }

  // le mandrin : posé sur la paroi, enveloppé par elle, debout avec elle, puis retiré par le haut
  {
    const qRest = Q_MREST, cRest = [MD_REST[0], MD_REST[1], MD_REST[2]], lc = [0, MAND_L / 2, 0];
    const att = mul(MX.att, MX.cw, L_MAND_BAND);
    if (st.mandIn <= 0 || st.knife < 0.999) place(MX.mand, qRest, ...cRest, lc);
    else if (st.mandOut <= 0) {
      if (st.mandIn < 1) place(MX.mand, slerp(qRest, quatOf(att), st.mandIn), ...hop(cRest, xf(att, lc), st.mandIn, 80), lc);
      else MX.mand.set(att);
    } else {
      const o = st.mandOut, c = xf(att, lc), up = [c[0], c[1] + (MAND_L + 14) * sm(0, 0.55, o), c[2]];
      if (o < 0.55) place(MX.mand, quatOf(att), ...up, lc);
      else place(MX.mand, slerp(quatOf(att), qRest, sm(0.55, 1, o)), ...hop(up, cRest, sm(0.55, 1, o), 30), lc);
    }
    if (st.mk >= 1) add(MS.mand, MX.mand, { mat: 2, col: COL.steel, detail: 8 });
    else {                                             // la feuille de carton se roule autour de l'axe du futur tube
      bend(MS.card, { uc: Math.PI * R_MAND, k: 1 / R_MAND, aNeg: st.mk * Math.PI, aPos: st.mk * Math.PI });
      place(MX.card, Q_ID, MD_REST[0], 0, MD_REST[2], [Math.PI * R_MAND, 0, MAND_L / 2]);
      add(MS.card, MX.card, { mat: 2, col: COL.card, detail: 12, dimU: 2 * Math.PI * R_MAND });
    }
  }

  // le pot de barbotine
  add(MS.jar, M_JAR, { mat: 2, col: COL.jar, detail: 10 });
  add(MS.slip, M_SLIP, { mat: 6, col: COL.slip, noShadow: true });

  // l'aiguille et le cutter : au repos, ou en main
  let clay = false;
  const paper = scissors(st.kerf * 4, REST[0], REST[1] + PT, REST[2], 4.0, 4.56, sC, add);
  if (toolPath(st.knife * 4, ORG[0], T, ORG[1], 6.22, 6.7, sC)) clay = true;
  else if (sC > 11.26 && sC < 11.48) {                     // piquer le cercle du talon à travers le papier
    const t = st.prick * 24, i = Math.floor(Math.min(23.999, t)), f = t - i;
    const th = (i + sm(0.55, 1, f)) / 24 * Math.PI * 2;
    const p = xf(MX.root, [FO * Math.cos(th), 0, FO * Math.sin(th)]);
    const lift = 4 * (0.5 + 0.5 * Math.cos(2 * Math.PI * clamp(f / 0.55))) + 45 * (1 - sm(11.26, 11.31, sC)) + 45 * sm(11.44, 11.48, sC);
    toolAt(p[0], p[1] + 0.3 + lift, p[2]);
    clay = true;
  }
  if (clay) {
    add(MS.blade, TOOL.blade, { mat: 2, col: COL.steel, detail: 3 });
    add(MS.grip, TOOL.grip, { mat: 2, col: COL.wood, detail: 4 });
  } else {
    add(MS.blade, M_NEEDLE, { mat: 2, col: COL.steel, detail: 3 });
    add(MS.grip, M_NEEDLE_G, { mat: 2, col: COL.wood, detail: 4 });
  }

  // l'estèque souple : sur la plaque (05), puis autour de la tasse (10)
  if (st.rib > 0 && st.rib < 1) {
    const r = st.rib, z = BRD[2] + lerp(-95, 95, r), xx = BRD[0] + 52 * Math.sin(r * Math.PI * 5);
    const lift = 30 * (1 - sm(0, 0.12, r)) + 30 * sm(0.88, 1, r);
    place(MX.rib, qAxis(0, 1, 0, Math.PI / 2 + 0.4 * Math.cos(r * Math.PI * 5)), xx, T + 0.05 + lift, z, [RIB_W / 2, 0, 0]);
  } else if (st.rib1 > 0 && st.rib1 < 1) {
    const vis = sm(0, 0.12, st.rib1) * (1 - sm(0.88, 1, st.rib1));
    ribAround(MX.rib, vis, ASM0, 0.6 + st.rib1 * Math.PI * 2, BODY_C + 6);
  } else place(MX.rib, qAxis(0, 1, 0, 0.6), ...RIB_REST, [RIB_W / 2, 0, 0]);
  add(MS.rib, MX.rib, { mat: 2, col: COL.rubber });

  // la tournette, sa girelle, la mousse
  add(MS.trnBase, M_TRN_BASE, { mat: 2, col: COL.iron });
  add(MS.trnCol, M_TRN_COL, { mat: 2, col: COL.iron });
  rigid(MX.wheel, qAxis(0, 1, 0, pose.spin), TRN[0], 82, TRN[2]);
  add(MS.trnWheel, MX.wheel, { mat: 2, col: COL.alu, detail: 5 });
  rigid(MX.bat, qAxis(0, 1, 0, pose.spin), TRN[0], TRN_TOP, TRN[2]);
  add(MS.bat, MX.bat, { mat: 2, col: COL.wood, detail: 4, ao: sm(0.85, 1, st.flip2) });
  {
    const on = [TRN[0], BAT_TOP, TRN[2]];
    let c = FOAM_REST, q = qAxis(0, 1, 0, 0.2);
    if (st.foamOut > 0) { c = hop(on, FOAM_REST, st.foamOut, 60); q = slerp(Q_ID, q, st.foamOut); }
    else if (st.foam > 0) { c = hop(FOAM_REST, on, st.foam, 60); q = slerp(q, Q_ID, st.foam); }
    place(MX.foam, q, ...c, [0, 0, 0]);
    add(MS.foam, MX.foam, { mat: 2, col: COL.foam, detail: 9 });
  }

  // l'éponge et le chamois (12) : tenus contre la tasse qui tourne
  {
    const ON_Y = BAT_TOP + T;
    if (st.sponge > 0) {
      const az = 0.75, rh = [Math.sin(az), 0, Math.cos(az)], th = [Math.cos(az), 0, -Math.sin(az)], r = R_OUT + 40 * (1 - st.sponge);
      basis(MX.sponge, th, rh, [0, 1, 0], [TRN[0] + rh[0] * r, ON_Y + BODY_C - T / 2 + 2 * Math.sin(pose.spin * 3), TRN[2] + rh[2] * r], [0, 0, 0]);
    } else place(MX.sponge, qAxis(0, 1, 0, -0.3), ...SPG_REST, [0, 0, 0]);
    add(MS.sponge, MX.sponge, { mat: 2, col: COL.sponge, detail: 9 });
    if (st.cham > 0) {
      bend(MS.cham, { uc: 23, k: 1 / 4.2, aNeg: Math.PI / 2, aPos: Math.PI / 2 });
      const az = 0.5, rh = [Math.sin(az), 0, Math.cos(az)], th = [Math.cos(az), 0, -Math.sin(az)], lift = 30 * (1 - st.cham);
      basis(MX.cham, rh, [0, -1, 0], th, [TRN[0] + rh[0] * R_MID, ON_Y + BODY - 2.8 + lift, TRN[2] + rh[2] * R_MID], [23, 4.2, 12]);
    } else {
      bend(MS.cham, FLAT);
      place(MX.cham, qAxis(0, 1, 0, 0.4), ...CHM_REST, [23, 0, 12]);
    }
    add(MS.cham, MX.cham, { mat: 2, col: COL.cham, detail: 9 });
  }
}

function camera(st) {
  let i = 0; while (i < CAM.length - 2 && sC > CAM[i + 1][0]) i++;
  const a = CAM[i], b = CAM[i + 1], t = sm(a[0], b[0], sC), mob = cw < 900;
  let tg = [0, 1, 2].map(j => lerp(a[1][j], b[1][j], t));
  let rad = lerp(a[mob ? 3 : 2], b[mob ? 3 : 2], t);
  let el = Math.max(1, lerp(a[4], b[4], t) - pyC * 3) * DEG;
  let azi = lerp(a[5], b[5], t) + pxC * 0.07 + orbit * st.play;
  if (CAM_OVR) { tg = CAM_OVR[0] || tg; rad = CAM_OVR[1] ?? rad; el = (CAM_OVR[2] ?? el / DEG) * DEG; azi = CAM_OVR[3] ?? azi; }
  const fr = frameRect(sC, st.play), asp = cw / chh, fw = fr[2] - fr[0], fh = fr[3] - fr[1];
  const Dst = rad / (Math.tan(FOV / 2) * Math.min(fh, fw * asp));
  const e = F.eye;
  e[0] = tg[0] + Dst * Math.cos(el) * Math.sin(azi); e[1] = tg[1] + Dst * Math.sin(el); e[2] = tg[2] + Dst * Math.cos(el) * Math.cos(azi);
  perspective(Pm, FOV, asp, Dst * 0.08, Dst * 8, fr[0] + fr[2] - 1, 1 - fr[1] - fr[3]);
  lookAt(Vm, e, tg);
  mul(F.VP, Pm, Vm);
}


/* ─────────────── boucle (à la demande) ─────────────── */

let sT = 13.5, sC = 13.5, orbit = 0, orbitV = 0, dragging = false;
let px = 0, py = 0, pxC = 0, pyC = 0;
let last = 0, raf = 0, first = true, uiKey = '', fontsKey = 0;
let dpr = Math.min(devicePixelRatio || 1, 2), slow = 0, frames = 0, base = 1;

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
  if (Math.abs(px - pxC) + Math.abs(py - pyC) > 1e-3) { pxC += (px - pxC) * ease(4); pyC += (py - pyC) * ease(4); moving = true; }
  if (dragging) moving = true;
  else if (Math.abs(orbitV) > 0.01) { orbit += orbitV * dt; orbitV *= Math.exp(-dt * 3); moving = true; }
  else if (S.spin && !REDUCED) { orbit += dt * 0.25; moving = true; }
  else if (orbitBack && Math.abs(orbit) > 1e-3) { orbit -= wrapA(orbit) * ease(3); if (Math.abs(wrapA(orbit)) < 1e-3) { orbit = 0; orbitBack = false; } moving = true; }

  const st = story(sC);
  if (S.ovr) Object.assign(st, S.ovr(tStep));
  if (cur >= 0 && STEPS.findIndex(x => x.id === 'mandrin') > cur) st.mk = 0;   // avant l'étape du mandrin, le carton est à plat
  st.play = 1;
  const key = `${Math.round(st.draw * 80)}|${Math.round(st.press * 12)}|${fontsKey}`;
  if (key !== uiKey) { uiKey = key; drawUI(st.draw, st.press); GLR.refresh('ui'); }

  camera(st);
  compose(st);
  GLR.draw(F);
  if (first) { first = false; root.classList.add('gl-ready'); }

  if (iv && document.visibilityState === 'visible') {
    base = Math.min(base, iv);
    frames++; if (iv > base * 1.7) slow++;
    if (frames >= 60) { if (slow > 40 && dpr > 1) { dpr = Math.max(1, dpr * 0.85); resize(); } frames = slow = 0; }
  }
  if (moving) kick(); else last = 0;
}
const wrapA = a => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));

/* ─────────────── interface ─────────────── */

// Glisser sur la scène pour tourner autour, à toutes les étapes
let lastX = 0, lastT = 0;
canvas.addEventListener('pointerdown', e => {
  dragging = true; orbitV = 0; orbitBack = false; lastX = e.clientX; lastT = e.timeStamp;
  canvas.setPointerCapture(e.pointerId); kick();
});
canvas.addEventListener('pointermove', e => {
  if (!dragging) return;
  const dx = -(e.clientX - lastX) * 0.006, dtm = Math.max(8, e.timeStamp - lastT) / 1000;
  orbit += dx; orbitV = lerp(orbitV, dx / dtm, 0.5);
  lastX = e.clientX; lastT = e.timeStamp; kick();
});
const release = () => { if (!dragging) return; dragging = false; kick(); };
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);

function resize() {
  cw = innerWidth; chh = innerHeight;
  const W = Math.round(canvas.clientWidth * dpr), H = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  kick();
}
addEventListener('resize', resize);

if (document.fonts) {
  const refont = () => { drawPrint(); if (GLR) GLR.refresh('print'); fontsKey++; kick(); };
  document.fonts.addEventListener('loadingdone', refont);
  document.fonts.ready.then(refont);
}

drawPrint();
drawUI(0, 0);
resize();
{
  const k = STEPS.findIndex(x => '#' + x.id === location.hash);
  if (k > 0) { sections[k].scrollIntoView(); }
  pickStep();
}

// ?debug : __lp.step(i) fige l'étape i à la fin de son animation
if (new URLSearchParams(location.search).has('debug')) {
  window.__lp = {
    step(i, t = 1) { sections[i].scrollIntoView(); player.go(i, 'set'); tStep = t; playing = t < 1; sC = sT = lerp(STEPS[i].s[0], STEPS[i].s[1], sm(0, 1, t)); frame(performance.now()); frame(performance.now() + 16); return { cur, sC }; },
    shot(i, t = 1, cam = null) {               // capture du canevas seul, cadre plein (rendus du PDF)
      FRAME_OVR = [0.02, 0.02, 0.98, 0.98]; this.step(i, t); if (cam) { CAM_OVR = cam; frame(performance.now()); }
      const url = canvas.toDataURL('image/png'); FRAME_OVR = null; return url;
    },
    STEPS, C, CFG, get cur() { return cur; },
  };
}
