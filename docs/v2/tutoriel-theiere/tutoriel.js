/* Gabarits Céramique — tutoriel « théière » dans l'outil, après achat.
   Même coque et même moteur 3D que le tutoriel du bol-tasse à talon (v2/tutoriel-bol-talon) : la page avance
   étape par étape, au clic comme au défilement, et toutes les cotes viennent de LA configuration achetée :
   ?dp=100&hp=80&he=22&dc=64&hc=12&bd=34&bt=15&ba=50&by=0.58&bl=91&ah=54&ap=34&aw=18&r=12&cuir=40&e=4.5
   (cotes cuites en mm : panse Ø × h, épaule h, col Ø × h ; bec Ø base, Ø bout, angle °, attache / panse, longueur ;
   anse h, saillie, largeur ; retrait total %, part du retrait faite au cuir %, plaque crue mm).
   Les calculs sont ceux de theierePieces() dans l'outil : chaque cote est donnée à l'état où on la mesure. */

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

/* ─────────────── la théière et ses gabarits ─────────────── */

// Cotes de la pièce cuite, telles que l'outil les envoie (mm, °, %). Mêmes calculs que theierePieces() dans l'outil.
const CFG = (() => {
  const q = new URLSearchParams(location.search);
  const num = (k, def, lo, hi) => { const v = parseFloat((q.get(k) || '').replace(',', '.')); return Number.isFinite(v) ? clamp(v, lo, hi) : def; };
  // fp / fc : feuilles de papier et de carton du PDF, comptées par l'outil (absentes : on reste général)
  const sheets = q.has('fc') ? { fp: Math.round(num('fp', 0, 0, 30)), fc: Math.round(num('fc', 1, 0, 30)) } : null;
  return {
    dp: num('dp', 100, 60, 200), hp: num('hp', 80, 40, 200), he: num('he', 22, 6, 90), dc: num('dc', 64, 30, 160), hc: num('hc', 12, 5, 40),
    bd: num('bd', 34, 16, 80), bt: num('bt', 15, 8, 40), ba: num('ba', 50, 20, 70), by: num('by', 0.58, 0.2, 0.8), bl: num('bl', 0, 0, 300),
    ah: num('ah', 54, 20, 180), ap: num('ap', 34, 12, 90), aw: num('aw', 18, 8, 40),
    r: num('r', 12, 4, 20), cuir: num('cuir', 40, 0, 100), e: num('e', 4.5, 3, 8),
    g: num('g', 0, 0, 20000), cl: num('cl', 0, 0, 2000), sheets,
  };
})();
const RETRAIT = CFG.r / 100, KR = 1 / (1 - RETRAIT);            // retrait TOTAL : séchage + cuisson
const CR = 1 - CFG.cuir / 100 * RETRAIT;                         // taille au cuir / taille crue (convention de l'outil V2)
const T = CFG.e, PT = 0.3, E_FIN = T * (1 - RETRAIT);            // plaque crue, papier ; la même plaque, cuite
const JEU = 1, HOLE = 2.6, PITCH = 5.5, TIGE = 8, MARGE = 2, NEWS = 0.08;   // cotes finies, comme l'outil

// On découpe et on monte terre molle : tout est donné cru (× KR)
const RP = CFG.dp * KR / 2, HP = CFG.hp * KR, HE = CFG.he * KR, RC = CFG.dc * KR / 2, HC = CFG.hc * KR;
const Y_SH = HP + HE, Y_TOP = Y_SH + HC;                         // haut de l'épaule (niveau de remplissage), haut du col
// A · la panse, posée sur le fond : à mi-épaisseur, plus une épaisseur pour les deux biseaux
const R_A = RP - T / 2, W_A = 2 * Math.PI * R_A + T, H_A = HP - T;
// B · l'épaule : tronc de cône à mi-épaisseur, sommet au-dessus du col
const B0 = RP - T / 2, B1 = RC - T / 2, SL_B = Math.hypot(HE, B0 - B1);
const RB = SL_B * B0 / (B0 - B1), rB = RB - SL_B, SB_B = B0 / RB, TH_B = 2 * Math.PI * SB_B;
const ANG_B = 360 * SB_B + T / ((RB + rB) / 2) * 180 / Math.PI;
const Y_APEX_B = HP + HE * B0 / (B0 - B1);
// C · le col ; D · le fond ; E · le couvercle (trou d'air) ; F · la collerette ; G · le bouton sur sa tige
const R_C = RC - T / 2, W_C = 2 * Math.PI * R_C + T, H_C = HC;
const R_D = RP;
const R_E = RC + T / 2, R_VENT = HOLE * KR / 2, VENT = [R_E * 0.56, 0];
const R_Fo = RC - T - JEU * KR, R_F = R_Fo - T / 2, W_F = 2 * Math.PI * R_F + T, H_F = HC + 4 * KR;
const R_G = Math.max(16 * KR, 2 * RC * 0.36) / 2, R_TIGE = 5 * KR, H_TIGE = TIGE * KR;

// H · le bec : un cône dont chaque génératrice s'arrête là où elle touche la panse
const BEC = (() => {
  const a = CFG.ba * DEG, ca = Math.cos(a), sa = Math.sin(a);
  const rbO = Math.max(T + 4 * KR, CFG.bd * KR / 2), rtO = Math.max(T + 1.5 * KR, Math.min(CFG.bt * KR / 2, rbO - 2 * KR));
  const ya = CFG.by * HP;
  const L = Math.max(25 * KR, (Y_SH + MARGE * KR + rtO * ca - ya) / sa, CFG.bl * KR);   // la longueur choisie, jamais sous le remplissage
  const cone = (r0, r1) => { const sap = L * r0 / Math.max(0.01, r0 - r1), b = Math.atan(r0 / sap); return { r0, r1, sap, cb: Math.cos(b), sb: Math.sin(b) }; };
  // génératrice φ (0 = dessus du bec, π = dessous) à l'abscisse s le long de l'axe (repère de la théière, bec vers +x)
  const at = (C, phi, s) => { const R = C.r0 * (1 - s / C.sap); return [RP + s * ca - R * Math.cos(phi) * sa, ya + s * sa + R * Math.cos(phi) * ca, R * Math.sin(phi)]; };
  const hit = (C, phi) => {
    const f = s => { const p = at(C, phi, s); return p[0] * p[0] + p[2] * p[2] - RP * RP; };
    let hi = L, lo = L; while (f(lo) > 0 && lo > -2 * RP) lo -= 0.5;
    for (let i = 0; i < 36; i++) { const m = (lo + hi) / 2; if (f(m) > 0) hi = m; else lo = m; }
    return (lo + hi) / 2;
  };
  return { a, ca, sa, rbO, rtO, ya, L, cone, at, hit, tip: ya + L * sa - rtO * ca };
})();
const H_M = BEC.cone(BEC.rbO - T / 2, BEC.rtO - T / 2);          // fibre moyenne du bec
const RHO_T = (H_M.sap - BEC.L) / H_M.cb;
const RHO_B = phi => (H_M.sap - BEC.hit(H_M, clamp(phi, -Math.PI, Math.PI))) / H_M.cb;
const TH_H = 2 * Math.PI * H_M.sb;
// J · la passoire : l'empreinte du bec sur la panse, déroulée [arc, hauteur], et les trous dans celle de sa face intérieure
const footOf = (C, n = 72) => Array.from({ length: n }, (_, i) => {
  const phi = 2 * Math.PI * i / n, p = BEC.at(C, phi, BEC.hit(C, phi)); return [RP * Math.atan2(p[2], p[0]), p[1]];
});
const FOOT_O = footOf(BEC.cone(BEC.rbO, BEC.rtO)), FOOT_I = footOf(BEC.cone(BEC.rbO - T, BEC.rtO - T));
function inPoly(P, x, y) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
function segDist(P, x, y) { let m = 1e9; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [ax, ay] = P[j], [bx, by] = P[i], dx = bx - ax, dy = by - ay; const t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)); m = Math.min(m, Math.hypot(x - ax - t * dx, y - ay - t * dy)); } return m; }
const HOLES = (() => {
  const hole = HOLE * KR, ins = hole / 2 + 1.6 * KR, p = PITCH * KR, out = [];
  const xs = FOOT_I.map(q => q[0]), ys = FOOT_I.map(q => q[1]), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  for (let j = -12; j <= 12; j++) for (let i = -12; i <= 12; i++) {
    const x = cx + (i + (j & 1) * 0.5) * p, y = cy + j * p * 0.866;
    if (inPoly(FOOT_I, x, y) && segDist(FOOT_I, x, y) >= ins) out.push([x, y]);
  }
  return out.slice(0, 48);
})();
const FOOT_Y0 = Math.min(...FOOT_O.map(q => q[1])), FOOT_Y1 = Math.max(...FOOT_O.map(q => q[1]));
const FOOT_W = Math.max(...FOOT_O.map(q => q[0])) - Math.min(...FOOT_O.map(q => q[0]));
// I · l'anse : demi-ellipse développée + 12 mm de pattes ; K · son profil de contrôle
const AH = CFG.ah * KR, AP = CFG.ap * KR, AW = CFG.aw * KR;
const L_I = (() => { const a = AH / 2, b = AP; return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b))) / 2 + 12; })();
const Y_IB = HP * 0.2, Y_IT = Math.min(HP - 5 * KR, Y_IB + AH), R_I = (Y_IT - Y_IB) / 2;
// L · M : les mandrins en papier cartonné (un tour de journal par-dessus)
const D_MAND = 2 * RP - 2 * T, D_CARD = D_MAND - 2 * NEWS;
const W_L = Math.PI * (D_CARD - 0.25) + 15, H_L = Math.ceil(HP - T + 30), R_LM = RP - T - 0.15;
const MB = (() => {
  const I0 = BEC.rbO - T, I1 = BEC.rtO - T, sap = BEC.L * I0 / Math.max(0.01, I0 - I1), b = Math.atan(I0 / sap);
  const cb = Math.cos(b), sb = Math.sin(b), R = (sap + 15) / cb, r = Math.max(0, (sap - BEC.L - 10) / cb);
  return { I0, I1, sap, cb, sb, R, r, Th: 2 * Math.PI * sb, tab: 15 / ((R + r) / 2) };
})();

// La terre : surfaces crues × épaisseur, + 15 % (même règle que l'outil, qui envoie son chiffre)
const polyArea = P => Math.abs(P.reduce((a, p, i) => { const q = P[(i + 1) % P.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
const fanPts = (Th, rIn, rOut, n = 64) => {
  const P = [];
  for (let i = 0; i <= n; i++) { const t = -Th / 2 + Th * i / n, r = rOut(t); P.push([r * Math.sin(t), r * Math.cos(t)]); }
  for (let i = n; i >= 0; i--) { const t = -Th / 2 + Th * i / n, r = rIn(t); P.push([r * Math.sin(t), r * Math.cos(t)]); }
  return P;
};
// les gabarits de papier gardent les biseaux de la couture (comme dans l'outil)
const TH_B_P = ANG_B * DEG;
const TH_H_P = TH_H + T / RHO_T;
const OUT_B = fanPts(TH_B_P, () => rB, () => RB);
const OUT_H = fanPts(TH_H_P, () => RHO_T, t => RHO_B(t / H_M.sb), 96);
const OUT_J = FOOT_O.map(([x, y]) => [-x, -y]);        // repère de J : x vers −z, z vers le bas (texte à l'endroit)
const OUT_K = (() => {                                            // le profil en C, du côté des x positifs
  const a = AH / 2, b = AP, e2 = T / 2, P = [];
  for (let i = 0; i <= 40; i++) { const t = -Math.PI / 2 + Math.PI * i / 40; P.push([(b + e2) * Math.cos(t), (a + e2) * Math.sin(t)]); }
  for (let i = 40; i >= 0; i--) { const t = -Math.PI / 2 + Math.PI * i / 40; P.push([Math.max(1, b - e2) * Math.cos(t), Math.max(1, a - e2) * Math.sin(t)]); }
  return P;
})();
const AREA = W_A * H_A + Math.PI * (B0 + B1) * SL_B + W_C * H_C + Math.PI * R_D ** 2 + Math.PI * R_E ** 2 + W_F * H_F + Math.PI * R_G ** 2 + polyArea(OUT_H) + L_I * AW;
const CLAY_G = CFG.g || Math.round(AREA * T / 1000 * 1.8 * 1.15 / 50) * 50;
const VOL_CL = CFG.cl || (() => {
  const ri = CFG.dp / 2 - E_FIN, rc = CFG.dc / 2 - E_FIN;
  return Math.round((Math.PI * ri * ri * (CFG.hp - E_FIN) + Math.PI * CFG.he / 3 * (ri * ri + ri * rc + rc * rc)) / 1e4);
})();


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


/* Secteur de cône, roulable. À plat : (θ, ρ), θ ∈ [−Θ/2, Θ/2] autour de +z, ρ de rIn(θ) à rOut(θ), épaisseur centrée.
   Roulé : cône de sommet l'origine et d'axe −y, sin β = sb (sb = 1 : à plat sur le plan y = 0).
   La fibre moyenne se roule sans étirement : φ = θ / sin β. À plat : (x, z, épaisseur, face). */
function fan(Th, rIn, rOut, Tk, nT = 64, nR = 6) {
  const th = [], rho = [], zz = [], ff = [], nk = [], idx = [];
  let n = 0;
  const V = (t, r, z, f, k) => { th.push(t); rho.push(r); zz.push(z); ff.push(f); nk.push(k); return n++; };
  const tAt = i => -Th / 2 + Th * i / nT, rAt = (t, j) => lerp(rIn(t), rOut(t), j / nR);
  for (const [z, f] of [[Tk / 2, 1], [-Tk / 2, 0]]) {               // dessus, dessous
    const b = n;
    for (let i = 0; i <= nT; i++) for (let j = 0; j <= nR; j++) V(tAt(i), rAt(tAt(i), j), z, f, f);
    for (let i = 0; i < nT; i++) for (let j = 0; j < nR; j++) { const a = b + i * (nR + 1) + j, c = a + nR + 1; idx.push(a, c, c + 1, a, c + 1, a + 1); }
  }
  for (const [j, k] of [[0, 2], [nR, 3]]) {                          // chants : petit arc, grand arc
    const b = n;
    for (let i = 0; i <= nT; i++) { const t = tAt(i), r = rAt(t, j); V(t, r, -Tk / 2, 2, k); V(t, r, Tk / 2, 2, k); }
    for (let i = 0; i < nT; i++) { const a = b + i * 2; idx.push(a, a + 2, a + 3, a, a + 3, a + 1); }
  }
  for (const [i, k] of [[0, 4], [nT, 5]]) {                          // les deux bords de la couture
    const b = n, t = tAt(i);
    for (let j = 0; j <= nR; j++) { const r = rAt(t, j); V(t, r, -Tk / 2, 2, k); V(t, r, Tk / 2, 2, k); }
    for (let j = 0; j < nR; j++) { const a = b + j * 2; idx.push(a, a + 2, a + 3, a, a + 3, a + 1); }
  }
  const flat = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) flat.set([rho[i] * Math.sin(th[i]), rho[i] * Math.cos(th[i]), zz[i], ff[i]], i * 4);
  const m = { flat, idx: new Uint16Array(idx), nv: n, pos: new Float32Array(n * 3), nor: new Float32Array(n * 3), th, rho, zz, nk, Th, bkey: '' };
  roll(m, 1);
  return m;
}
function roll(m, sb) {
  sb = clamp(sb, 0.02, 1);
  const key = sb.toFixed(5); if (key === m.bkey) return; m.bkey = key;
  const cb = Math.sqrt(Math.max(0, 1 - sb * sb)), { pos, nor } = m;
  for (let i = 0; i < m.nv; i++) {
    const phi = m.th[i] / sb, s = Math.sin(phi), c = Math.cos(phi), r = m.rho[i], z = m.zz[i];
    const g = [sb * s, -cb, sb * c], nn = [cb * s, sb, cb * c];
    pos[i * 3] = r * g[0] + z * nn[0]; pos[i * 3 + 1] = r * g[1] + z * nn[1]; pos[i * 3 + 2] = r * g[2] + z * nn[2];
    const k = m.nk[i];
    const N = k === 1 ? nn : k === 0 ? [-nn[0], -nn[1], -nn[2]] : k === 2 ? [-g[0], -g[1], -g[2]] : k === 3 ? g : k === 4 ? [-c, 0, s] : [c, 0, -s];
    nor[i * 3] = N[0]; nor[i * 3 + 1] = N[1]; nor[i * 3 + 2] = N[2];
  }
  m.dirty = true;
}
// centre d'un secteur : à plat (le milieu de la pièce) puis roulé (sur l'axe, à mi-hauteur)
const fanC = (r0, r1, sb) => { const rm = (r0 + r1) / 2, cb = Math.sqrt(1 - sb * sb); return t => [0, -rm * cb * t, rm * (1 - t)]; };

/* ─────────────── l'atelier ─────────────── */

// Les pièces de terre sur la plaque, rangées en lignes (comme on les placerait pour économiser la terre)
const bbox = P => { const xs = P.map(p => p[0]), zs = P.map(p => p[1]); return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)]; };
const rectPts = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]];
const SHAPES = {                                   // contour à plat de chaque gabarit (repère de son maillage)
  A: rectPts(W_A, H_A), B: OUT_B, C: rectPts(W_C, H_C), D: circle(R_D, 72), E: circle(R_E, 72), F: rectPts(W_F, H_F),
  G: circle(R_G, 40), H: OUT_H, I: rectPts(L_I, AW), J: OUT_J, K: OUT_K,
  L: rectPts(W_L, H_L), M: fanPts(MB.Th + MB.tab, () => MB.r, () => MB.R),
};
function shelf(keys, wMax, gap) {
  const it = keys.map(k => { const b = bbox(SHAPES[k]); return { k, b, w: b[2] - b[0] + gap, h: b[3] - b[1] + gap }; })
    .sort((a, b) => b.w * b.h - a.w * a.h);
  wMax = Math.max(wMax, ...it.map(o => o.w));
  let sky = [{ x: 0, w: wMax, z: 0 }];                // la ligne d'horizon des pièces déjà posées
  for (const o of it) {
    let best = null;
    for (const seg of sky) {
      const x = seg.x; if (x + o.w > wMax + 1e-6) continue;
      const z = Math.max(...sky.filter(q => q.x < x + o.w - 1e-6 && q.x + q.w > x + 1e-6).map(q => q.z));
      if (!best || z < best.z - 1e-6 || (Math.abs(z - best.z) < 1e-6 && x < best.x)) best = { x, z };
    }
    o.x = best.x; o.z = best.z;
    const x0 = o.x, x1 = o.x + o.w, out = [];
    for (const q of sky) {
      if (q.x + q.w <= x0 || q.x >= x1) { out.push(q); continue; }
      if (q.x < x0) out.push({ x: q.x, w: x0 - q.x, z: q.z });
      if (q.x + q.w > x1) out.push({ x: x1, w: q.x + q.w - x1, z: q.z });
    }
    out.push({ x: x0, w: o.w, z: o.z + o.h });
    sky = out.sort((a, b) => a.x - b.x);
  }
  const out = {}; it.forEach(o => { o.w -= gap; o.h -= gap; out[o.k] = o; });
  return { at: out, W: Math.max(...it.map(o => o.x + o.w)), H: Math.max(...it.map(o => o.z + o.h)) };
}
const CLAY_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const LAY = shelf(CLAY_KEYS, W_A, 9);
const SLAB_W = LAY.W + 24, SLAB_D = LAY.H + 24;
const BRD = [0, 0, 0];
const SLAB_O = [BRD[0] - LAY.W / 2, BRD[2] - LAY.H / 2];   // coin des pièces sur la plaque
const PAPER_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
const PLAY = shelf(PAPER_KEYS, 520, 12);
const PAPER_O = [-SLAB_W / 2 - 120 - PLAY.W, -PLAY.H / 2];     // les gabarits découpés, posés à gauche de la toile
// matrice d'une forme posée à plat : son coin de boîte en (ox, oz), à la hauteur y
const flatAt = (L, k, ox, oz, y) => { const o = L.at[k]; return rigid(m4(), Q_ID, ox + o.x - o.b[0], y, oz + o.z - o.b[1]); };
const centerOf = (L, k, ox, oz, y) => { const o = L.at[k]; return [ox + o.x + o.w / 2, y, oz + o.z + o.h / 2]; };

const TRN = [SLAB_W / 2 + 260, 0, 40], TRN_TOP = 94, BAT_TOP = TRN_TOP + 12;
const D_AT = centerOf(LAY, 'D', ...SLAB_O, 0);             // la théière se monte sur son fond, là où il a été découpé
const ASM0 = [D_AT[0], 0, D_AT[2]];
const RL_REST = [BRD[0], 25, BRD[2] - SLAB_D / 2 - 90];
const MD_REST = [PAPER_O[0] + PLAY.W - 40, R_LM, PAPER_O[1] + PLAY.H + 70];    // mandrin de panse, couché le long de z
const MM_REST = [MD_REST[0] - 120, 0, MD_REST[2] + 30];                         // mandrin de bec, debout
const STACK = [PAPER_O[0] + 60, 0, PAPER_O[1] - 70];                            // la pile des gabarits qui ont servi
const JAR_AT = [BRD[0] + SLAB_W / 2 + 70, 0, BRD[2] - SLAB_D / 2 - 30], SPG_REST = [TRN[0] + 150, 0, TRN[2] - 170];
const NDL_REST = [BRD[0] + SLAB_W / 2 + 40, 0, BRD[2] + SLAB_D / 2 + 40];

const COL = {
  steel: [0.6, 0.62, 0.61], wood: [0.69, 0.53, 0.45], iron: [0.33, 0.34, 0.32], alu: [0.74, 0.75, 0.73],
  sponge: [0.93, 0.79, 0.46], jar: [0.95, 0.95, 0.93], slip: [0.74, 0.71, 0.66], card: [0.88, 0.83, 0.74], news: [0.86, 0.85, 0.81],
};
const COIL_P = Array.from({ length: 17 }, (_, i) => { const a = -Math.PI / 2 + i / 16 * Math.PI * 2; return [R_A - T / 2 - 1.5 + 1.5 * Math.cos(a), 1.5 + 1.5 * Math.sin(a), 15]; });
const JAR_P = [[0, 0, 13], [33, 0, 10], [36, 44, 10], [36, 48, 12], [33, 48, 11], [30, 4, 14], [0, 4]];
const SLAB_PTS = (() => {                         // plaque abaissée : rectangle mou, bord irrégulier
  const pts = [], n = 160, hx = SLAB_W / 2, hz = SLAB_D / 2;
  for (let i = 0; i < n; i++) {
    const t = i / n * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
    const j = 1 + 0.008 * Math.sin(7 * t + 1.3) + 0.006 * Math.sin(13 * t + 0.4) + 0.004 * Math.sin(23 * t + 2.1);
    pts.push([hx * Math.sign(c) * Math.abs(c) ** 0.22 * j, hz * Math.sign(s) * Math.abs(s) ** 0.22 * j]);
  }
  return pts;
})();

const paperMesh = k => (/[ACFIL]/.test(k) ? plate(bbox(SHAPES[k])[2], bbox(SHAPES[k])[3], PT, 1) : prism(SHAPES[k], PT));
const MS = {
  cloth: plate(2400, 1300, 1, 1),
  jute: plate(SLAB_W + 90, SLAB_D + 90, 1, 1),
  paper: Object.fromEntries(PAPER_KEYS.filter(k => k !== 'L' && k !== 'M').map(k => [k, paperMesh(k)])),
  cardL: plate(W_L, H_L, 0.5, 96),
  cardM: fan(MB.Th + MB.tab, () => MB.r, () => MB.R, 0.5, 48, 2),
  tubeL: prism(circle(R_LM, 64), H_L),
  slab: prism(SLAB_PTS, T),
  A: plate(W_A, H_A, T, 160, -T / 2),
  B: fan(TH_B, () => rB, () => RB, T, 80, 4),
  C: plate(W_C, H_C, T, 72, -T / 2),
  D: prism(circle(R_D, 96), T),
  E: prism(circle(R_E, 72), T),
  F: plate(W_F, H_F, T, 72, -T / 2),
  G: prism(circle(R_G, 40), T),
  tige: prism(circle(R_TIGE, 24), H_TIGE),
  H: fan(TH_H, () => RHO_T, t => RHO_B(t / H_M.sb), T, 72, 6),
  I: plate(L_I, AW, T, 48, -T / 2),
  coil: lathe(COIL_P, 72, { smooth: true, closed: true }),
  regl: plate(20, SLAB_D + 60, T, 1),
  roller: prism(circle(25, 40), SLAB_W + 80),
  blade: plate(64, 2.4, 2.4, 1),
  grip: plate(80, 11, 11, 1),
  trnBase: prism(circle(82, 48), 10),
  trnCol: prism(circle(18, 24), 72),
  trnWheel: prism(circle(115, 96), 12),
  bat: prism(circle(Math.max(84, RP + 22), 64), 12),
  sponge: prism(roundRect(52, 36, 13), 22),
  jar: lathe(JAR_P, 48),
  slip: prism(circle(32.2, 48), 0.6),
};
const SOLO_SET = new Set([MS.A, MS.B, MS.C, MS.D, MS.E, MS.F, MS.G, MS.tige, MS.H, MS.I, MS.coil]);

const Q_ID = [0, 0, 0, 1];
const Q_STAND = qAxis(1, 0, 0, -Math.PI / 2);     // bande roulée, debout
const Q_BAND = qMul(qAxis(0, 1, 0, Math.PI / 2), Q_STAND);   // la couture des bandes côté anse (−x), le milieu face au bec
const Q_YAW = qAxis(0, 1, 0, Math.PI / 2);        // même chose pour les secteurs (couture en −z avant rotation)
const Q_FLIP = qAxis(1, 0, 0, Math.PI);
const Q_MREST = qAxis(1, 0, 0, Math.PI / 2);      // mandrin de panse couché le long de z

// Où chaque pièce finit, dans le repère de la théière (y = 0 sous le fond)
const LC = { A: [W_A / 2, R_A, H_A / 2], C: [W_C / 2, R_C, H_C / 2], F: [W_F / 2, R_F, H_F / 2] };
const ASM = {
  A: place(m4(), Q_BAND, 0, T + H_A / 2, 0, LC.A),
  B: rigid(m4(), Q_YAW, 0, Y_APEX_B, 0),
  C: place(m4(), Q_BAND, 0, Y_SH + H_C / 2, 0, LC.C),
  D: rigid(m4(), Q_ID, 0, 0, 0),
  LID: rigid(m4(), Q_FLIP, 0, Y_TOP + T, 0),     // le couvercle, monté à l'envers puis retourné
  tige: rigid(m4(), Q_ID, 0, Y_TOP + T, 0),
  G: rigid(m4(), Q_ID, 0, Y_TOP + T + H_TIGE, 0),
  H: basis(m4(), [0, 0, 1], [BEC.ca, BEC.sa, 0], [-BEC.sa, BEC.ca, 0], [RP + H_M.sap * BEC.ca, BEC.ya + H_M.sap * BEC.sa, 0], [0, 0, 0]),
  I: basis(m4(), [0, 1, 0], [AP / R_I, 0, 0], [0, 0, -1], [-RP, (Y_IB + Y_IT) / 2, 0], [L_I / 2, R_I, AW / 2]),   // le milieu de la bande à AP de la panse
  J: basis(m4(), [0, 0, -1], [1, 0, 0], [0, -1, 0], [RP + 0.8, 0, 0], [0, 0, 0]),
};
// le couvercle à l'envers sur la toile : E à plat, F debout dessus
const LID_E = rigid(m4(), Q_ID, 0, 0, 0), LID_F = place(m4(), Q_BAND, 0, T + H_F / 2, 0, LC.F);
const L_MAND_A = rigid(m4(), qAxis(1, 0, 0, Math.PI / 2), W_A / 2, R_A, -14);    // le tube dépasse des deux côtés
const L_MAND_H = rigid(m4(), Q_ID, 0, MB.sap - H_M.sap, 0);                      // mandrin de bec, coaxial au bec
const HOLE_P = new Float32Array(96);                                             // trous de la passoire, dans le repère de la panse (u, v)
HOLES.forEach(([x, y], i) => { HOLE_P[i * 2] = W_A / 2 + x * R_A / RP; HOLE_P[i * 2 + 1] = y - T; });

// L'aiguille de potière, tenue inclinée
const TOOL = (() => {
  const l = Math.hypot(0.3, 0.86, 0.42), X = [0.3 / l, 0.86 / l, 0.42 / l];
  const zl = Math.hypot(X[2], X[0]), Z = [-X[2] / zl, 0, X[0] / zl];
  const Y = [-Z[2] * X[1], Z[2] * X[0] - Z[0] * X[2], Z[0] * X[1]];
  const off = m4(); off[0] = off[5] = off[10] = off[15] = 1; off[12] = 64; off[13] = -4.3; off[14] = -4.3;
  return { X, Y, Z, blade: m4(), grip: m4(), off };
})();
const M_NEEDLE = rigid(m4(), qAxis(0, 1, 0, -0.35), ...NDL_REST), M_NEEDLE_G = mulN(M_NEEDLE, TOOL.off);
function toolAt(x, y, z) {
  const { X, Y, Z, blade } = TOOL;
  blade.set([X[0], X[1], X[2], 0, Y[0], Y[1], Y[2], 0, Z[0], Z[1], Z[2], 0, 0, 0, 0, 1]);
  blade[12] = x - (Y[0] + Z[0]) * 1.2; blade[13] = y - (Y[1] + Z[1]) * 1.2; blade[14] = z - (Y[2] + Z[2]) * 1.2;
  mul(TOOL.grip, blade, TOOL.off);
}
// Le tracé de l'aiguille : le contour de chaque pièce, l'une après l'autre (repère du monde, sur la plaque)
const TRACE = CLAY_KEYS.map(k => {
  const o = LAY.at[k], P = SHAPES[k], out = [];
  for (let i = 0; i <= P.length; i++) {
    const a = P[i % P.length], b = P[(i + 1) % P.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4));
    if (i < P.length) for (let j = 0; j < n; j++) out.push([SLAB_O[0] + o.x - o.b[0] + lerp(a[0], b[0], j / n), SLAB_O[1] + o.z - o.b[1] + lerp(a[1], b[1], j / n)]);
  }
  return out;
});

/* ─────────────── les gabarits imprimés (une planche de textures) ─────────────── */

const ATLAS = document.createElement('canvas'); ATLAS.width = ATLAS.height = 2048;
const CELL = 512, ATL = {};
const LABEL_AT = { B: [0, (rB + RB) / 2], H: [0, (RHO_T + RHO_B(0)) / 2], M: [0, (MB.r + MB.R) / 2], K: [AP, 0] };                       // ATL[k] : matrice à plat (mm) → texture
function drawAtlas() {
  const x = ATLAS.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.clearRect(0, 0, 2048, 2048);
  const NAMES = { A: 'Panse', B: 'Épaule', C: 'Col', D: 'Fond', E: 'Couvercle', F: 'Collerette', G: 'Bouton', H: 'Bec', I: 'Anse', J: 'Passoire', K: 'Profil anse', L: 'Mandrin panse', M: 'Mandrin bec' };
  PAPER_KEYS.forEach((k, i) => {
    const P = SHAPES[k], [x0, y0, x1, y1] = bbox(P), w = x1 - x0, h = y1 - y0;
    const sc = (CELL - 40) / Math.max(w, h), cx = (i % 4) * CELL + (CELL - w * sc) / 2, cy = Math.floor(i / 4) * CELL + (CELL - h * sc) / 2;
    ATL[k] = mat3(sc / 2048, 0, 0, -sc / 2048, (cx - x0 * sc) / 2048, 1 - (cy - y0 * sc) / 2048);
    x.setTransform(sc, 0, 0, sc, cx - x0 * sc, cy - y0 * sc);
    const card = k === 'L' || k === 'M';
    x.beginPath(); P.forEach((p, j) => (j ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.closePath();
    x.fillStyle = card ? 'rgba(212,198,172,1)' : 'rgba(255,254,250,0)'; x.fill();
    x.lineWidth = 3 / sc; x.strokeStyle = '#23271F'; x.stroke();
    x.setLineDash([9 / sc, 7 / sc]); x.lineWidth = 2 / sc; x.strokeStyle = '#4A7263';
    if (k === 'A' || k === 'C' || k === 'F') { x.beginPath(); x.moveTo(T, 0); x.lineTo(T, h); x.moveTo(w - T, 0); x.lineTo(w - T, h); x.stroke(); }
    if (k === 'L') { x.beginPath(); x.moveTo(w - 15, 0); x.lineTo(w - 15, h); x.stroke(); }
    x.setLineDash([]);
    if (k === 'J') { x.fillStyle = '#23271F'; HOLES.forEach(([hx, hy]) => { x.beginPath(); x.arc(-hx, -hy, HOLE * KR / 2, 0, Math.PI * 2); x.fill(); }); }
    x.setTransform(1, 0, 0, 1, 0, 0);
    const lp = LABEL_AT[k] || [(x0 + x1) / 2, (y0 + y1) / 2];   // dans la matière, pas dans le creux d'un secteur
    const tx = cx + (lp[0] - x0) * sc, ty = cy + (lp[1] - y0) * sc;
    x.fillStyle = '#23271F'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const small = Math.min(w, h) * sc < 90;
    x.font = `800 ${small ? 34 : 78}px ${FONT_TITRE}`;
    x.fillText(k, tx, ty - (small ? 0 : 18));
    if (!small) { x.font = `400 26px ${FONT_MONO}`; x.fillStyle = '#565A4D'; x.fillText(NAMES[k], tx, ty + 34); }
  });
}
const mat3 = (a1, b1, a2, b2, a0, b0) => new Float32Array([a1, b1, 0, a2, b2, 0, a0, b0, 1]);


/* ─────────────── textures dessinées  ─────────────── */

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

// Papier, terre, outils : tout est calculé ici, à partir des coordonnées à plat (mm) de chaque pièce.
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
uniform float uMat, uPrint, uCook, uSlip, uScore, uDetail, uKerf, uAO, uHoleN, uHoleR;
uniform vec3 uCol, uEye, uL, uVent;
uniform vec2 uHoleP[48];
const vec3 SPECK = vec3(0.3, 0.25, 0.21), SLIP = vec3(0.74, 0.71, 0.66);
float band(float d, float w){ float f = fwidth(d) + 1e-4; return 1.0 - smoothstep(w - f, w + f, abs(d)); }

void main(){
  float face = vF.w;
  bool top = face > 0.5 && face < 1.5;
  vec3 n = normalize(vN), v = normalize(uEye - vW);
  vec4 nz = texture2D(uNoise, vF.xy / 70.0);
  vec3 col = uCol;
  float gloss = 0.0, ao = 1.0;

  if (uMat < 0.5) {                                     // papier ; carton des mandrins (uDetail 1)
    vec3 paper = (uDetail > 0.5 ? vec3(0.86, 0.8, 0.69) : vec3(1.0, 0.996, 0.98)) * (0.97 + 0.035 * nz.b);
    col = paper;
    if (uPrint > 0.5 && face < 1.5) {
      vec4 pr = texture2D(uTex, (uP * vec3(vF.xy, 1.0)).xy);
      col = mix(paper, pr.rgb, pr.a * (top ? 1.0 : 0.35));
    }
    if (!top) col *= 0.93;
  } else if (uMat < 1.5) {                              // terre : humide, puis cuir
    if (uHoleN > 0.5) {                                 // la passoire, percée trou par trou
      for (int i = 0; i < 48; i++) { if (float(i) >= uHoleN) break; if (distance(vF.xy, uHoleP[i]) < uHoleR) discard; }
    }
    if (uVent.z > 0.0 && distance(vF.xy, uVent.xy) < uVent.z) discard;   // trou d'air du couvercle
    float c1 = clamp(uCook, 0.0, 1.0);
    col = mix(vec3(0.665, 0.63, 0.575), vec3(0.79, 0.76, 0.70), c1) * (0.93 + 0.12 * nz.g);
    col = mix(col, SPECK, nz.r * 0.5);
    gloss = 0.3 * (1.0 - c1);
    if (face > 1.5) col *= 0.95; else if (face < 0.5) col *= 0.96;
    if (top) col *= 1.0 - 0.025 * sin(vF.x * 2.3) * sin(vF.y * 2.3) - 0.06 * uKerf;
    if (face > 1.5) {                                   // les tranches : striées, puis barbotine
      float q = vF.x + vF.y + vF.z * 3.0;
      float h1 = smoothstep(0.36, 0.46, abs(fract(q / 2.2) - 0.5)), h2 = smoothstep(0.36, 0.46, abs(fract((vF.x - vF.y - vF.z * 3.0) / 2.2) - 0.5));
      col *= 1.0 - 0.4 * uScore * max(h1, h2);
      col = mix(col, SLIP * 1.2, 0.6 * uSlip);
      gloss = max(gloss, 0.65 * uSlip);
    }
    ao = 1.0 - 0.3 * uAO;
  } else if (uMat < 2.5) {                              // objets de l'atelier
    col = uCol * (0.97 + 0.04 * nz.b);
    float dt = uDetail;
    if (dt > 0.5 && dt < 1.5) col *= 0.94 + 0.08 * sin(vF.x * 0.9 + nz.g * 4.0);          // bois
    else if (dt > 1.5 && dt < 2.5) gloss = 0.8;                                            // acier
    else if (dt > 2.5 && dt < 3.5) {                                                       // plateau de tournette : on le voit tourner
      gloss = 0.45;
      if (top) { float r = length(vF.xy); col *= 1.0 - 0.18 * max(max(band(r - 40.0, 0.7), band(r - 75.0, 0.7)), band(r - 104.0, 0.7)); if (abs(vF.y) < 1.5 && vF.x > 18.0) col *= 0.6; }
    } else if (dt > 3.5 && dt < 4.5) col *= 0.9 + 0.14 * smoothstep(0.3, 0.9, nz.b) - 0.22 * step(0.82, texture2D(uNoise, vF.xy / 9.0).b);   // éponge
    else if (dt > 4.5 && dt < 5.5) gloss = 0.35;                                           // pot émaillé
    else if (dt > 5.5 && dt < 6.5) {                                                       // mandrin : carton roulé dans du journal
      if (face > 1.5) {
        float al = atan(vF.y, vF.x) * 60.0, row = fract(vF.z / 1.9), cl = fract(al / 46.0);
        float words = step(0.4, texture2D(uNoise, vec2(al / 11.0, floor(vF.z / 1.9) / 17.0)).b);
        col = mix(col, vec3(0.42, 0.42, 0.41), 0.5 * step(0.45, row) * step(0.05, cl) * step(cl, 0.95) * words);
      } else col = vec3(0.8, 0.74, 0.63);
    }
  } else if (uMat < 3.5) {                              // nappe ; toile de jute sous la plaque (uDetail 1)
    col = (uDetail > 0.5 ? vec3(0.885, 0.875, 0.815) : vec3(0.93, 0.92, 0.88)) * (0.97 + 0.035 * sin(vF.x * 2.2) * sin(vF.y * 2.2) + 0.03 * nz.g);
  } else {                                              // barbotine dans son pot
    col = uCol * (0.95 + 0.08 * nz.g);
    gloss = 0.7;
  }

  // lumière : une directionnelle, un ciel
  float ndl = max(dot(n, uL), 0.0);
  vec3 lit = col * (0.43 + 0.13 * (0.5 + 0.5 * n.y) + 0.6 * ndl) * ao;
  vec3 h = normalize(uL + v);
  float spec = pow(max(dot(n, h), 0.0), mix(12.0, 150.0, gloss)) * mix(0.03, 0.85, gloss);
  gl_FragColor = vec4(lit + spec * ao, 1.0);
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
const U1 = [['uMat', 'mat', 1], ['uPrint', 'print', 0], ['uCook', 'cook', 0], ['uSlip', 'slip', 0], ['uScore', 'score', 0],
  ['uDetail', 'detail', 0], ['uKerf', 'kerf', 0], ['uAO', 'ao', 0], ['uHoleN', 'holeN', 0], ['uHoleR', 'holeR', 0]];
const Z3 = [0, 0, 0], ONE3 = [1, 1, 1];
const U3 = [['uCol', 'col', ONE3], ['uVent', 'vent', Z3]];
const P_ID = mat3(1, 0, 0, 1, 0, 0);

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
  const src = { atlas: ATLAS };
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
    if (o.holeN && last.hp !== o.holeP) { last.hp = o.holeP; gl.uniform2fv(u.uHoleP, o.holeP); }   // trous de la passoire
    const scr = o.screen || [0, 0, 1, 1];
    if (last.scr !== scr) { last.scr = scr; gl.uniform4f(u.uScreen, scr[0], scr[1], scr[2], scr[3]); }
    const t = tex.atlas;
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

// L'étape i joue sa fenêtre [i, i + 0,7] du récit ; s = étape + avancement.
function story(s) {
  const W = (i, a, b) => sm(i + a, i + b, s);
  const r = {
    paper: s - 1,                                                                            // 01 imprimer, découper
    flyL: W(2, 0, 0.18), mkL: W(2, 0.18, 0.4), flyM: W(2, 0.36, 0.5), mkM: W(2, 0.5, 0.7),  // 02 mandrins
    rIn: W(3, 0, 0.08), roll: W(3, 0.08, 0.55), rOut: W(3, 0.55, 0.63),                      // 03 abaisser
    fly: W(4, 0, 0.18), knife: W(4, 0.2, 0.68),                                               // 04 tracer
    clear: W(5, 0, 0.3), back: W(5, 0.25, 0.55),                                              // 05 dégager
    bevel: W(6, 0, 0.25), score: W(6, 0.25, 0.45), slip: W(6, 0.45, 0.65),                    // 06 biseauter, strier
    mandIn: W(7, 0, 0.1), wrap: W(7, 0.1, 0.35), stand: W(7, 0.37, 0.55), mandOut: W(7, 0.55, 0.64), coil: W(7, 0.62, 0.7),  // 07
    rollB: W(8, 0, 0.3), putB: W(8, 0.32, 0.62),                                              // 08 épaule
    rollC: W(9, 0, 0.25), putC: W(9, 0.28, 0.58),                                             // 09 col
    rollF: W(10, 0, 0.18), standF: W(10, 0.18, 0.34), flipL: W(10, 0.38, 0.58), knob: W(10, 0.58, 0.68), vent: W(10, 0.66, 0.7),  // 10
    mIn: W(11, 0, 0.14), wrapH: W(11, 0.14, 0.42), mOut: W(11, 0.45, 0.6),                    // 11 bec
    kIn: W(12, 0, 0.12), bendI: W(12, 0.12, 0.45), kOut: W(12, 0.5, 0.62),                    // 12 anse
    cuir: W(13, 0, 0.12), jIn: W(13, 0.12, 0.24), holes: W(13, 0.26, 0.6), jOut: W(13, 0.6, 0.7),   // 13 passoire, au cuir
    putH: W(14, 0, 0.35), weldH: W(14, 0.35, 0.6),                                            // 14 poser le bec
    putI: W(15, 0, 0.35), weldI: W(15, 0.35, 0.6),                                            // 15 poser l'anse
    toTrn: W(16, 0, 0.2), spin: W(16, 0.22, 0.7),                                             // 16 finir
    play: W(17, 0, 0.3),                                                                      // 17 à vous
  };
  r.sponge = W(16, 0.24, 0.3) * (1 - W(16, 0.6, 0.66));
  r.cook = 0.5 * r.cuir;
  r.smooth = 0.6 * W(7, 0.62, 0.7) + 0.4 * W(16, 0.3, 0.6);
  return r;
}

// Caméra : [s, cible, rayon à cadrer (bureau, mobile), élévation °, azimut rad]
const PAPER_C = [PAPER_O[0] + PLAY.W / 2, 0, PAPER_O[1] + PLAY.H / 2];
const MAND_C = [(MD_REST[0] + MM_REST[0]) / 2, 30, (MD_REST[2] + MM_REST[2]) / 2];
const AT = (k, dy = 0) => centerOf(LAY, k, ...SLAB_O, dy);
const POT = (dy, dx = 0) => [ASM0[0] + dx, dy, ASM0[2]];
const TRN_POT = dy => [TRN[0], BAT_TOP + dy, TRN[2]];
const A_END = [SLAB_O[0] + LAY.at.A.x + W_A, T, SLAB_O[1] + LAY.at.A.z + H_A / 2];
const SZ = Math.max(Y_TOP, RP * 2 + BEC.L * BEC.ca);
const CAM = [
  [0.0, PAPER_C, PLAY.W * 0.62, PLAY.W * 0.7, 52, 0.15],
  [1.0, PAPER_C, PLAY.W * 0.62, PLAY.W * 0.7, 52, 0.15],
  [1.7, PAPER_C, PLAY.W * 0.62, PLAY.W * 0.7, 52, 0.15],
  [2.0, MAND_C, 190, 215, 32, 0.35],
  [2.7, MAND_C, 190, 215, 32, 0.35],
  [3.0, BRD, SLAB_W * 0.62, SLAB_W * 0.7, 38, 0.3],
  [3.7, BRD, SLAB_W * 0.62, SLAB_W * 0.7, 38, 0.3],
  [4.0, BRD, SLAB_W * 0.6, SLAB_W * 0.66, 64, 0.05],
  [5.7, BRD, SLAB_W * 0.6, SLAB_W * 0.66, 58, 0.05],
  [6.0, A_END, 46, 54, 34, -0.7],
  [6.3, A_END, 46, 54, 34, -0.7],
  [6.6, BRD, SLAB_W * 0.55, SLAB_W * 0.62, 50, 0.1],
  [7.0, AT('A', 30), W_A * 0.42, W_A * 0.5, 26, 0.9],
  [7.4, AT('A', 30), W_A * 0.42, W_A * 0.5, 26, 0.9],
  [7.7, POT(HP * 0.5), HP * 0.95 + 40, HP * 1.1 + 40, 26, 0.5],
  [8.0, POT(HP), RP * 1.6 + 40, RP * 1.8 + 40, 30, 0.45],
  [9.0, POT(Y_SH), RP * 1.5 + 40, RP * 1.7 + 40, 30, 0.45],
  [9.7, POT(Y_SH), RP * 1.5 + 40, RP * 1.7 + 40, 30, 0.45],
  [10.0, AT('E', 20), 90, 105, 40, 0.3],
  [10.36, AT('E', 20), 90, 105, 40, 0.3],
  [10.6, POT(Y_TOP * 0.62), RP * 1.6 + 50, RP * 1.8 + 50, 26, 0.45],
  [11.0, AT('H', 40), 110, 125, 28, 0.4],
  [11.7, AT('H', 40), 110, 125, 28, 0.4],
  [12.0, AT('I', 20), 100, 115, 40, 0.2],
  [12.7, AT('I', 20), 100, 115, 40, 0.2],
  [13.0, POT((FOOT_Y0 + FOOT_Y1) / 2, RP), 70, 82, 10, Math.PI / 2 - 0.35],
  [13.7, POT((FOOT_Y0 + FOOT_Y1) / 2, RP), 70, 82, 10, Math.PI / 2 - 0.35],
  [14.0, POT(HP * 0.7, RP * 0.6), SZ * 0.7, SZ * 0.8, 18, 0.95],
  [14.7, POT(HP * 0.7, RP * 0.6), SZ * 0.7, SZ * 0.8, 18, 0.95],
  [15.0, POT(HP * 0.55, -RP), SZ * 0.76, SZ * 0.86, 18, -0.55],
  [15.7, POT(HP * 0.55, -RP), SZ * 0.76, SZ * 0.86, 18, -0.55],
  [16.0, TRN_POT(Y_TOP * 0.45), SZ * 0.72, SZ * 0.82, 16, 0.6],
  [16.7, TRN_POT(Y_TOP * 0.45), SZ * 0.72, SZ * 0.82, 16, 0.6],
  [17.0, TRN_POT(Y_TOP * 0.48), SZ * 0.72, SZ * 0.82, 6, 0.5],
  [19.0, TRN_POT(Y_TOP * 0.48), SZ * 0.72, SZ * 0.82, 6, 0.5],
];

/* ─────────────── la scène, image par image ─────────────── */

const F = { draws: [], VP: m4(), eye: new Float32Array(3) };
const Pm = m4(), Vm = m4(), FOV = 30 * DEG;
const MX = {};
const mx = k => MX[k] || (MX[k] = m4());
const ROOT = m4();             // la théière dans le monde

// La plaque s'étale sous le rouleau : la surface grandit, l'épaisseur baisse, le volume reste
const rollG = r => 1 - (1 - r) ** 1.6;
function slabScale(r) { const g = rollG(r), sx = lerp(0.62, 1, g), sz = lerp(0.36, 1, g); return [sx, 1 / (sx * sz), sz]; }

// Une pièce qui vole d'une pose à l'autre (orientation, point local lc amené en c)
function fly(M, q0, c0, q1, c1, t, h, lc) { return place(M, slerp(q0, q1, t), ...hop(c0, c1, t, h), lc); }
// le point local d'un secteur roulé que l'on tient : le milieu de la pièce à plat, le pied de l'axe une fois roulé
function fanHold(rIn, rOut, sb, t) {
  const cb = Math.sqrt(1 - sb * sb), rm = (rIn + rOut) / 2;
  return lerpV([0, -rm * cb, rm * sb], [0, -rOut * cb, 0], t);
}
const SB = (m, t) => lerp(1, m, t);               // sin β pendant le roulage

// les secteurs se tiennent par le milieu de leur matière (θ = 0), là où ils ont été découpés
const rmOf = k => (k === 'B' ? (rB + RB) / 2 : (RHO_T + RHO_B(0)) / 2);
const fanAt = (k, y) => { const p = xf(flatAt(LAY, k, ...SLAB_O, 0), [0, 0, rmOf(k)]); return [p[0], y, p[2]]; };
const H_REST = (() => { const p = fanAt('H', 0); return place(m4(), Q_ID, p[0], 0, p[2], fanHold(RHO_T, RHO_B(0), H_M.sb, 1)); })();
const I_UNIT = basis(m4(), [0, 1, 0], [1, 0, 0], [0, 0, -1], [0, 0, 0], [0, 0, 0]);

function compose(st) {
  const D = F.draws; D.length = 0;
  const add = (mesh, M, o) => { if (!SOLO || SOLO_SET.has(mesh)) D.push({ mesh, M, o }); };
  const look = (k, extra) => ({ mat: 1, cook: st.cook, score: st.score, slip: Math.max(st.slip * (1 - st.smooth), 0), ...extra });

  // la théière : sur son fond, là où il a été découpé ; puis sur la tournette, qui tourne
  {
    const t = st.toTrn, spin = st.spin * Math.PI * 4 + (SOLO ? 0 : 0);
    const c = hop([ASM0[0], 0, ASM0[2]], [TRN[0], BAT_TOP, TRN[2]], t, 160);
    rigid(ROOT, qAxis(0, 1, 0, spin), c[0], SOLO ? 0 : c[1], c[2]);
  }
  const R = (k, L) => mul(mx(k), ROOT, L);

  // décor : la nappe, la toile de jute sous la plaque
  add(MS.cloth, rigid(mx('cloth'), Q_ID, -1400, -1.5, -650), { mat: 3, noShadow: true });
  add(MS.jute, rigid(mx('jute'), Q_ID, BRD[0] - (SLAB_W + 90) / 2, -1, BRD[2] - (SLAB_D + 90) / 2), { mat: 3, detail: 1, noShadow: true });

  // 01 · les gabarits découpés arrivent sur la table ; 04 sur la plaque ; 05 sur la pile
  PAPER_KEYS.forEach((k, j) => {
    if (k === 'L' || k === 'M') return;
    const a = clamp((st.paper - 0.03 * j) / 0.16);
    if (a <= 0) return;
    const b = bbox(SHAPES[k]), lc = [(b[0] + b[2]) / 2, 0, (b[1] + b[3]) / 2];
    const onT = centerOf(PLAY, k, ...PAPER_O, 0.05 + j * 0.02), src = [PAPER_C[0], 0, PAPER_O[1] - 200];
    const slab = CLAY_KEYS.includes(k), onS = slab ? centerOf(LAY, k, ...SLAB_O, T + 0.08) : null;
    const pile = [STACK[0], 0.4 + j * 0.35, STACK[2]];
    const M = mx('p' + k);
    let q = Q_ID, c = onT;
    if (a < 1) { c = hop(src, onT, a, 60); q = slerp(qAxis(0, 1, 0, 0.5), Q_ID, a); }
    if (slab && st.fly > 0 && st.back <= 0) c = hop(onT, onS, clamp(st.fly * 1.25 - j * 0.03), 80);
    if (slab && st.back > 0) { c = hop(onS, pile, st.back, 90); q = slerp(Q_ID, qAxis(0, 1, 0, 0.2 * j), st.back); }
    if (k === 'K' && st.kIn > 0) { const to = AT('I', 0.1); to[0] += L_I * 0.15; c = hop(onT, to, st.kIn * (1 - st.kOut), 70); }
    if (k === 'J' && st.jIn > 0) {                           // la passoire, posée contre la panse au cuir
      const a2 = st.jIn * (1 - st.jOut);
      if (a2 >= 1) { mul(M, ROOT, ASM.J); add(MS.paper[k], M, { mat: 0, print: 1, P: ATL[k] }); return; }
      const MJ = mul(mx('tmp'), ROOT, ASM.J), cJ = xf(MJ, lc);
      place(M, slerp(Q_ID, quatOf(MJ), a2), ...hop(onT, cJ, a2, 120), lc);
      add(MS.paper[k], M, { mat: 0, print: 1, P: ATL[k] });
      return;
    }
    place(M, q, ...c, lc);
    add(MS.paper[k], M, { mat: 0, print: 1, P: ATL[k] });
  });

  // 02 · les mandrins : la feuille de carton se roule en tube (L), en cône (M)
  {
    const c0 = centerOf(PLAY, 'L', ...PAPER_O, 0.3), c1 = [MD_REST[0], 0, MD_REST[2]];
    if (st.paper > 0.4) {
      if (st.mkL < 1) {
        const A_END_L = st.mkL * W_L / (2 * R_LM);
        bend(MS.cardL, { uc: W_L / 2, k: 1 / R_LM, aNeg: A_END_L, aPos: A_END_L });
        place(mx('cardL'), Q_ID, ...hop(c0, c1, st.flyL, 60), [W_L / 2, 0, H_L / 2]);
        add(MS.cardL, MX.cardL, { mat: 0, print: 1, P: ATL.L, detail: 1 });
      }
    }
    if (st.paper > 0.45) {
      const sb = SB(MB.sb, st.mkM), lc = fanHold(MB.r, MB.R, sb, st.mkM);
      roll(MS.cardM, sb);
      const c2 = centerOf(PLAY, 'M', ...PAPER_O, 0.3), c3 = [MM_REST[0], 0, MM_REST[2]];
      // posé, puis tenu par le bec (11) et rangé
      let M = place(mx('cardM'), Q_ID, ...hop(c2, c3, st.flyM, 60), lc);
      if (st.mIn > 0) {                                      // 11 : le bec se roule autour, puis il ressort par le haut
        const lcM = [0, -MB.R * MB.cb, 0], cOn = xf(mul(mx('tmp2'), H_REST, L_MAND_H), lcM);
        if (st.mOut <= 0) place(M, Q_ID, ...hop(c3, cOn, st.mIn, 90), lcM);
        else {
          const up = [cOn[0], cOn[1] + 140 * sm(0, 0.5, st.mOut), cOn[2]];
          place(M, Q_ID, ...(st.mOut < 0.5 ? up : hop(up, c3, sm(0.5, 1, st.mOut), 40)), lcM);
        }
      }
      add(MS.cardM, M, { mat: 0, print: 1, P: ATL.M, detail: 1 });
    }
  }

  // 03 · la plaque, entre les réglettes, sous le rouleau ; 05 · la chute s'en va
  const [sx, sy, sz] = slabScale(st.roll);
  if (sC > 2.9 && st.clear < 1) {
    const e = st.clear;
    place(mx('slab'), qAxis(0, 1, 0, -0.3 * e), BRD[0] + (SLAB_W + 300) * sm(0.15, 1, e), 60 * sm(0, 0.35, e), BRD[2] - 60 * e, [0, 0, 0]);
    scaleCols(MX.slab, sx, sy, sz);
    add(MS.slab, MX.slab, { mat: 1, cook: 0 });
  }
  add(MS.regl, rigid(mx('rg1'), Q_ID, BRD[0] - SLAB_W / 2 - 36, 0, BRD[2] - (SLAB_D + 60) / 2), { mat: 2, col: COL.wood, detail: 1 });
  add(MS.regl, rigid(mx('rg2'), Q_ID, BRD[0] + SLAB_W / 2 + 16, 0, BRD[2] - (SLAB_D + 60) / 2), { mat: 2, col: COL.wood, detail: 1 });
  {
    const hz = SLAB_D / 2 * sz + 16, top = T * sy + 25;
    let C = RL_REST, ang = 0;
    const start = [BRD[0], T * slabScale(0)[1] + 25, BRD[2] - (SLAB_D / 2 * 0.36 + 16)], end = [BRD[0], T + 25, BRD[2] - (SLAB_D / 2 + 16)];
    if (st.roll <= 0) C = hop(RL_REST, start, st.rIn, 50);
    else if (st.roll >= 1) C = hop(end, RL_REST, st.rOut, 50);
    else {
      const P = 4, seg = st.roll * P, j = Math.min(P - 1, Math.floor(seg)), t = seg - j, dir = j % 2 ? 1 : -1;
      const z = BRD[2] - dir * lerp(-hz, hz, sm(0, 1, t));
      C = [BRD[0], top, z]; ang = (z - BRD[2]) / 25;
    }
    place(mx('roller'), qMul(qAxis(1, 0, 0, ang), qAxis(0, 0, 1, -Math.PI / 2)), C[0], C[1], C[2], [0, (SLAB_W + 80) / 2, 0]);
    add(MS.roller, MX.roller, { mat: 2, col: COL.wood, detail: 1 });
  }

  // 04 · les pièces de terre, à mesure que l'aiguille en fait le tour
  const shown = k => st.knife * CLAY_KEYS.length >= CLAY_KEYS.indexOf(k) + 0.98;
  const kerf = 1 - st.clear;
  const onSlab = k => flatAt(LAY, k, ...SLAB_O, 0);
  const yOff = k => (/[ACFIBH]/.test(k) ? T / 2 : 0) + 0.04 * kerf;

  // A · la panse : biseaux, roulée sur le mandrin L, debout sur le fond
  if (shown('A')) {
    MS.A.bev = T * st.bevel;
    const AE = W_A / (2 * R_A) + 1e-3;
    bend(MS.A, { uc: W_A / 2, k: 1 / R_A, aNeg: st.wrap * AE, aPos: st.wrap * AE });
    const M0 = onSlab('A'); M0[13] = yOff('A');
    const M = mx('A');
    if (st.stand <= 0) M.set(M0);
    else if (st.stand < 1) {
      const c0 = xf(M0, LC.A), M1 = R('tA', ASM.A), c1 = xf(M1, LC.A);
      place(M, slerp(Q_ID, quatOf(M1), st.stand), ...hop(c0, c1, st.stand, 90), LC.A);
    } else R('A', ASM.A);
    add(MS.A, M, look('A', { kerf, holeN: Math.round(st.holes * HOLES.length), holeP: HOLE_P, holeR: HOLE * KR / 2 }));
    // le mandrin L : posé sur la panse, enveloppé, debout avec elle, puis retiré par le haut
    if (st.mkL >= 1) {
      const lc = [0, H_L / 2, 0], rest = [MD_REST[0], MD_REST[1], MD_REST[2]];
      const att = mul(mx('att'), M, L_MAND_A), Mm = mx('tube');
      if (st.mandIn <= 0) place(Mm, Q_MREST, ...rest, lc);
      else if (st.mandOut <= 0) {
        if (st.mandIn < 1) place(Mm, slerp(Q_MREST, quatOf(att), st.mandIn), ...hop(rest, xf(att, lc), st.mandIn, 80), lc);
        else Mm.set(att);
      } else {
        const o = st.mandOut, c = xf(att, lc), up = [c[0], c[1] + (H_L + 20) * sm(0, 0.55, o), c[2]];
        if (o < 0.55) place(Mm, quatOf(att), ...up, lc);
        else place(Mm, slerp(quatOf(att), Q_MREST, sm(0.55, 1, o)), ...hop(up, rest, sm(0.55, 1, o), 30), lc);
      }
      add(MS.tubeL, Mm, { mat: 2, col: COL.news, detail: 6 });
    }
  } else if (st.mkL >= 1) add(MS.tubeL, place(mx('tube'), Q_MREST, ...MD_REST, [0, H_L / 2, 0]), { mat: 2, col: COL.news, detail: 6 });

  // D · le fond : il ne bouge pas, la théière se monte dessus
  if (shown('D')) {
    if (st.toTrn <= 0) { const M = onSlab('D'); M[13] = yOff('D'); add(MS.D, MX.D = M, look('D', { kerf, ao: 0.8 * st.stand })); }
    else add(MS.D, R('D', ASM.D), look('D', { ao: 0.8 }));
  }
  // le colombin dans l'angle panse / fond
  if (st.coil > 0) {
    rigid(mx('tc'), Q_ID, 0, T, 0); scaleCols(MX.tc, 1, st.coil, 1);
    add(MS.coil, R('coil', MX.tc), look('coil', { noShadow: true }));
  }

  // B · l'épaule : roulée en cône dans la main, posée sur la panse
  if (shown('B')) {
    const sb = SB(SB_B, st.rollB), lc = fanHold(rB, RB, sb, st.rollB);
    roll(MS.B, sb);
    const c0 = fanAt('B', yOff('B')), air = [c0[0], c0[1] + 70 * sm(0, 0.3, st.rollB), c0[2]];
    const M = mx('B');
    if (st.putB <= 0) place(M, Q_ID, ...air, lc);
    else if (st.putB < 1) { const M1 = R('tB', ASM.B), c1 = xf(M1, lc); place(M, slerp(Q_ID, quatOf(M1), st.putB), ...hop(air, c1, st.putB, 80), lc); }
    else R('B', ASM.B);
    add(MS.B, M, look('B', { kerf }));
  }
  // C · le col
  if (shown('C')) {
    const AE = W_C / (2 * R_C) + 1e-3;
    MS.C.bev = T * st.bevel;
    bend(MS.C, { uc: W_C / 2, k: 1 / R_C, aNeg: st.rollC * AE, aPos: st.rollC * AE });
    const M0 = onSlab('C'); M0[13] = yOff('C') + 40 * sm(0, 0.25, st.rollC) * (1 - st.putC);
    const M = mx('C');
    if (st.putC <= 0) M.set(M0);
    else if (st.putC < 1) { const c0 = xf(M0, LC.C), M1 = R('tC', ASM.C); place(M, slerp(Q_ID, quatOf(M1), st.putC), ...hop(c0, xf(M1, LC.C), st.putC, 80), LC.C); }
    else R('C', ASM.C);
    add(MS.C, M, look('C', { kerf }));
  }

  // E · F · le couvercle : monté à l'envers sur la toile, retourné sur le col ; G sur sa tige
  if (shown('E')) {
    const e0 = AT('E', 0), Lg = mx('lid');
    if (st.flipL <= 0) rigid(Lg, Q_ID, e0[0], 0.04 * kerf, e0[2]);
    else if (st.flipL < 1) {
      const M1 = R('tL', ASM.LID), c1 = xf(M1, [0, T / 2, 0]);
      place(Lg, slerp(Q_ID, quatOf(M1), st.flipL), ...hop([e0[0], T / 2, e0[2]], c1, st.flipL, 110), [0, T / 2, 0]);
    } else R('lid', ASM.LID);
    add(MS.E, mul(mx('E'), Lg, LID_E), look('E', { kerf, vent: st.vent > 0.5 ? [VENT[0], VENT[1], R_VENT] : [0, 0, 0] }));
    if (shown('F')) {
      const AE = W_F / (2 * R_F) + 1e-3;
      MS.F.bev = T * st.bevel;
      bend(MS.F, { uc: W_F / 2, k: 1 / R_F, aNeg: st.rollF * AE, aPos: st.rollF * AE });
      const M0 = onSlab('F'); M0[13] = yOff('F') + 40 * sm(0, 0.3, st.rollF) * (1 - st.standF);
      const M = mx('F');
      if (st.standF <= 0) M.set(M0);
      else if (st.standF < 1) { const c0 = xf(M0, LC.F), M1 = mul(mx('tF'), Lg, LID_F); place(M, slerp(Q_ID, quatOf(M1), st.standF), ...hop(c0, xf(M1, LC.F), st.standF, 70), LC.F); }
      else mul(M, Lg, LID_F);
      add(MS.F, M, look('F', { kerf }));
    }
  }
  if (shown('G')) {
    const g0 = AT('G', 0), k = st.knob;
    if (k <= 0) { const M = onSlab('G'); M[13] = yOff('G'); add(MS.G, MX.G = M, look('G', { kerf })); }
    else {
      const M1 = R('tG', ASM.G), c1 = xf(M1, [0, 0, 0]);
      add(MS.G, k < 1 ? place(mx('G'), slerp(Q_ID, quatOf(M1), k), ...hop([g0[0], 0, g0[2]], c1, k, 70), [0, 0, 0]) : M1, look('G'));
      const T1 = R('tT', ASM.tige), t1 = xf(T1, [0, 0, 0]);
      add(MS.tige, k < 1 ? place(mx('tige'), slerp(Q_ID, quatOf(T1), k), ...hop([g0[0] + 30, 0, g0[2]], t1, k, 50), [0, 0, 0]) : T1, look('tige'));
    }
  }

  // H · le bec : roulé sur son mandrin, posé debout sous plastique ; au cuir, soudé sur la passoire
  if (shown('H')) {
    const sb = SB(H_M.sb, st.wrapH), lc = fanHold(RHO_T, RHO_B(0), sb, st.wrapH);
    roll(MS.H, sb);
    const h0 = fanAt('H', yOff('H')), rest = [h0[0], 0, h0[2]];
    const M = mx('H');
    if (st.putH <= 0) place(M, Q_ID, ...lerpV(h0, rest, st.wrapH), lc);
    else if (st.putH < 1) { const M1 = R('tH', ASM.H), lc1 = fanHold(RHO_T, RHO_B(0), H_M.sb, 1); place(M, slerp(Q_ID, quatOf(M1), st.putH), ...hop(rest, xf(M1, lc1), st.putH, 120), lc1); }
    else R('H', ASM.H);
    add(MS.H, M, look('H', { kerf, slip: Math.max(st.slip * (1 - st.smooth), 0.7 * st.weldH * (1 - sm(0.7, 1, st.weldH))) }));
  }
  // I · l'anse : cintrée en U sur son profil, posée ; au cuir, soudée côté opposé au bec
  if (shown('I')) {
    const AEI = Math.PI / 2 * st.bendI;
    bend(MS.I, { uc: L_I / 2, k: 1 / R_I, aNeg: AEI, aPos: AEI });
    const M0 = onSlab('I'); M0[13] = yOff('I');
    const M = mx('I'), lc = [L_I / 2, 0, AW / 2];
    if (st.putI <= 0) M.set(M0);
    else {
      const M1 = R('tI', ASM.I), qI = quatOf(R('tIu', I_UNIT));
      if (st.putI < 1) {
        place(M, slerp(Q_ID, qI, st.putI), ...hop(xf(M0, lc), xf(M1, lc), st.putI, 120), lc);
        // la bande est cintrée sur un demi-cercle ; l'anse posée est une demi-ellipse de saillie AP
        scaleCols(M, 1, lerp(1, AP / R_I, st.putI), 1);
      } else M.set(M1);
    }
    add(MS.I, M, look('I', { kerf, slip: Math.max(st.slip * (1 - st.smooth), 0.7 * st.weldI * (1 - sm(0.7, 1, st.weldI))) }));
  }

  // la barbotine dans son pot
  add(MS.jar, rigid(mx('jar'), Q_ID, ...JAR_AT), { mat: 2, col: COL.jar, detail: 5 });
  add(MS.slip, rigid(mx('slipm'), Q_ID, JAR_AT[0], 38, JAR_AT[2]), { mat: 4, col: COL.slip, noShadow: true });

  // l'aiguille : au repos, sur le tracé des pièces (04), puis sur les trous de la passoire (13)
  let held = false;
  if (sC > 4.18 && sC < 4.72) {
    const n = TRACE.length, K = st.knife * n, i = Math.min(n - 1, Math.floor(K)), t = K - i, P = TRACE[i];
    const p = P[Math.min(P.length - 1, Math.floor(t * P.length))];
    const lift = 18 * (1 - sm(0, 0.08, t)) + 40 * (1 - sm(4.18, 4.22, sC)) + 40 * sm(4.68, 4.72, sC);
    toolAt(p[0], T + lift, p[1]); held = true;
  } else if (sC > 13.24 && sC < 13.62 && HOLES.length) {
    const n = HOLES.length, K = st.holes * n, i = Math.min(n - 1, Math.floor(K)), f = K - i;
    const [ax, ay] = HOLES[i], th = ax / RP, p = xf(ROOT, [RP * Math.cos(th), ay, RP * Math.sin(th)]);
    const lift = 6 * (0.5 + 0.5 * Math.cos(2 * Math.PI * f)) + 50 * (1 - sm(13.24, 13.28, sC)) + 50 * sm(13.58, 13.62, sC);
    toolAt(p[0] + lift + 2, p[1] + 2, p[2]); held = true;
  }
  if (held) { add(MS.blade, TOOL.blade, { mat: 2, col: COL.steel, detail: 2 }); add(MS.grip, TOOL.grip, { mat: 2, col: COL.wood, detail: 1 }); }
  else { add(MS.blade, M_NEEDLE, { mat: 2, col: COL.steel, detail: 2 }); add(MS.grip, M_NEEDLE_G, { mat: 2, col: COL.wood, detail: 1 }); }

  // la tournette, sa girelle ; l'éponge (16)
  if (!SOLO) {
    add(MS.trnBase, rigid(mx('tb'), Q_ID, TRN[0], 0, TRN[2]), { mat: 2, col: COL.iron });
    add(MS.trnCol, rigid(mx('tcol'), Q_ID, TRN[0], 10, TRN[2]), { mat: 2, col: COL.iron });
    const spin = st.spin * Math.PI * 4;
    add(MS.trnWheel, rigid(mx('tw'), qAxis(0, 1, 0, spin), TRN[0], 82, TRN[2]), { mat: 2, col: COL.alu, detail: 3 });
    add(MS.bat, rigid(mx('bat'), qAxis(0, 1, 0, spin), TRN[0], TRN_TOP, TRN[2]), { mat: 2, col: COL.wood, detail: 1 });
    if (st.sponge > 0) {
      const az = -0.9, rh = [Math.sin(az), 0, Math.cos(az)], th = [Math.cos(az), 0, -Math.sin(az)], r = RP + 14 + 40 * (1 - st.sponge);
      basis(mx('sp'), th, rh, [0, 1, 0], [TRN[0] + rh[0] * r, BAT_TOP + HP * 0.5 + 3 * Math.sin(spin * 3), TRN[2] + rh[2] * r], [0, 0, 0]);
    } else place(mx('sp'), qAxis(0, 1, 0, -0.3), ...SPG_REST, [0, 0, 0]);
    add(MS.sponge, MX.sp, { mat: 2, col: COL.sponge, detail: 4 });
  }
}

function camera(st) {
  let i = 0; while (i < CAM.length - 2 && sC > CAM[i + 1][0]) i++;
  const a = CAM[i], b = CAM[i + 1], t = sm(a[0], b[0], sC), mob = cw < 900;
  let tg = [0, 1, 2].map(j => lerp(a[1][j], b[1][j], t));
  let rad = lerp(a[mob ? 3 : 2], b[mob ? 3 : 2], t);
  let el = Math.max(1, lerp(a[4], b[4], t)) * DEG;
  let azi = lerp(a[5], b[5], t) + orbit * st.play;
  if (CAM_OVR) { tg = CAM_OVR[0] || tg; rad = CAM_OVR[1] ?? rad; el = (CAM_OVR[2] ?? el / DEG) * DEG; azi = (CAM_OVR[3] ?? azi) + orbit; }
  if (SOLO) tg = [tg[0], tg[1] - BAT_TOP, tg[2]];
  const fr = frameRect(), asp = cw / chh, fw = fr[2] - fr[0], fh = fr[3] - fr[1];
  const Dst = rad / (Math.tan(FOV / 2) * Math.min(fh, fw * asp));
  const e = F.eye;
  e[0] = tg[0] + Dst * Math.cos(el) * Math.sin(azi); e[1] = tg[1] + Dst * Math.sin(el); e[2] = tg[2] + Dst * Math.cos(el) * Math.cos(azi);
  perspective(Pm, FOV, asp, Dst * 0.08, Dst * 8, fr[0] + fr[2] - 1, 1 - fr[1] - fr[3]);
  lookAt(Vm, e, tg);
  mul(F.VP, Pm, Vm);
}


/* ─────────────── la configuration et ses cotes ─────────────── */

const f1 = x => fmt(x, 1), f0 = x => fmt(x, 0);
const FIN_H = CFG.hp + CFG.he + CFG.hc + 2 * E_FIN + TIGE;          // théière cuite, couvercle et bouton compris
const C = {                                                       // les cotes qui se mesurent, par état
  crue: { d: 2 * RP, h: Y_TOP },
  cuir: { d: 2 * RP * CR, foot: FOOT_Y0 * CR, ib: Y_IB * CR, it: Y_IT * CR, hole: HOLE * KR * CR, jw: FOOT_W * CR },
  cuite: { d: CFG.dp, h: FIN_H },
};
const ANG_SEAM = Math.round(BEC.a / DEG);
/* ce qu'on imprime : les feuilles du PDF telles que l'outil les a calepinées */
const nF = (n, w) => `${n} feuille${n > 1 ? 's' : ''} ${w}`;
const PAPER_KIT = CFG.sheets
  ? [CFG.sheets.fp ? nF(CFG.sheets.fp, 'A4 80 g') : '', CFG.sheets.fc ? nF(CFG.sheets.fc, 'A4 de papier cartonné 160 à 220 g') : ''].filter(Boolean).join(', ')
  : 'des feuilles A4 80 g et 1 ou 2 feuilles A4 de papier cartonné 160 à 220 g';
const PRINT_HOW = CFG.sheets
  ? `Téléchargez le PDF de vos gabarits depuis l'outil : <b>${nF(CFG.sheets.fp + CFG.sheets.fc, '')}</b>. ${CFG.sheets.fc && !CFG.sheets.fp ? `Imprimez-les toutes sur <b>papier cartonné</b> : les mandrins <b>L</b> et <b>M</b> partagent leurs feuilles avec les autres gabarits.` : CFG.sheets.fc ? `${CFG.sheets.fc > 1 ? `Les ${CFG.sheets.fc} planches marquées` : 'La planche marquée'} « à imprimer sur papier cartonné » (les mandrins <b>L</b> et <b>M</b>) passe${CFG.sheets.fc > 1 ? 'nt' : ''} sur <b>papier cartonné</b>, les autres sur papier ordinaire.` : ''}`
  : `Téléchargez le PDF de vos gabarits depuis l'outil. Les planches marquées « à imprimer sur papier cartonné » (les mandrins <b>L</b> et <b>M</b>) passent sur <b>papier cartonné</b>, les autres sur papier ordinaire.`;
const KIND = `${VOL_CL} cl, Ø ${f0(CFG.dp)} mm`;

/* ─────────────── les étapes ─────────────── */

// s : fenêtre de l'animation dans le récit ; cam : caméra imposée ; dur : secondes
const tag = s => `<span class="st st--${s}">${{ crue: 'crue', cuir: 'au cuir', cuite: 'cuite', papier: 'papier', carton: 'carton' }[s]}</span>`;
const row = (k, v, s) => `<div class="kv"><span>${k}</span><b>${v}${s ? ' ' + tag(s) : ''}</b></div>`;
const FINAL_CAM = [[TRN[0], BAT_TOP + Y_TOP * 0.5, TRN[2]], SZ * 0.74, 12, 0.5];
const STEPS = [
  {
    id: 'ma-theiere', n: 'Ma théière', time: '', s: [17.6, 17.6], dur: 0.1, spin: true, cam: FINAL_CAM,
    html: `<p class="lead">Le tutoriel suit <b>votre</b> théière : toutes les cotes ci-dessous sont recalculées pour votre terre, et données à l'état où vous les mesurez.</p>
      <div class="cfg">${row('Théière', `Ø ${f0(CFG.dp)} × ${f0(FIN_H)} mm, couvercle compris`, 'cuite')}${row('Contenance', `${VOL_CL} cl jusqu'au haut de l'épaule`)}
      ${row('Retrait total de votre terre', `${f0(CFG.r)} %`)}${row('Retrait déjà fait au cuir', `${f0(CFG.cuir)} %`)}${row('Plaque', `${f1(T)} mm`, 'crue')}</div>
      <div class="states">
        <div><i>crue</i><b>Ø ${f1(C.crue.d)}</b><small>on découpe, on monte</small></div>
        <div><i>au cuir</i><b>Ø ${f1(C.cuir.d)}</b><small>passoire, bec, anse</small></div>
        <div><i>cuite</i><b>Ø ${f0(C.cuite.d)}</b><small>on sert le thé</small></div>
      </div>
      <p class="note">Deux séances : on monte le corps et le couvercle terre molle, puis on perce la passoire et on pose le bec et l'anse quand la théière est au cuir. Le bec et l'anse, découpés dans la même plaque et gardés sous le même plastique, rétrécissent avec elle.</p>
      <h3>Il vous faut</h3>
      <ul class="kit">
        <li><em>papier</em> ${PAPER_KIT}, ciseaux, colle en bâton, ruban adhésif</li>
        <li><em>terre</em> ≈ ${f0(CLAY_G)} g de grès fin, rouleau, 2 réglettes de ${f1(T)} mm, toile</li>
        <li><em>montage</em> aiguille, strieur, barbotine, pinceau, estèque souple, ébauchoir, papier journal, une paille ou un emporte-pièce de ${f1(HOLE * KR * CR)} mm</li>
        <li><em>fin</em> tournette, éponge, plastique</li>
      </ul>
      <p class="note">Comptez 2 h 30 le premier jour, 2 à 4 h d'attente, puis 1 h au cuir.</p>`,
  },
  {
    id: 'imprimer', n: 'Imprimer, découper', time: '20 min', s: [1, 1.6], dur: 5,
    html: `<ol>
        <li>${PRINT_HOW}</li>
        <li>Dans la fenêtre d'impression : <b>taille réelle</b>, « ajuster à la page » décoché. Posez la règle sur la barre témoin : <b>50 mm</b> pile, sur chaque feuille.</li>
        <li>Scotchez bord à bord les tronçons d'un même gabarit (crans « 1|2 » face à face), puis découpez aux ciseaux, <b>au milieu du trait plein</b>.</li>
      </ol>
      <div class="cfg">${row('Gabarits à découper dans la terre', 'A à I')}${row('À percer, à cintrer', 'J passoire · K profil d’anse', 'papier')}${row('Mandrins', 'L panse · M bec', 'carton')}</div>
      <p class="tip"><b>Astuce</b> Le gabarit J est imprimé un peu plus petit que la panse découpée : il sert au cuir, quand elle a déjà rétréci de ${f0(CFG.cuir * CFG.r / 100)} %.</p>`,
  },
  {
    id: 'mandrins', n: 'Rouler les mandrins', time: '10 min', s: [2, 2.7], dur: 6,
    html: `<ol>
        <li><b>L</b> : roulez le carton en tube jusqu'au trait « aligner ici », collez la languette, puis un tour de papier journal par-dessus. Le tube mesure <b>Ø ${f1(D_MAND)} mm</b> : le dedans de la panse crue.</li>
        <li><b>M</b> : roulez le secteur en cône, languette dessous, collez. Un tour de journal aussi.</li>
      </ol>
      <div class="cfg">${row('Mandrin de panse L', `Ø ${f1(D_MAND)} × ${f0(H_L)} mm`, 'carton')}${row('Mandrin de bec M', `Ø ${f1(2 * MB.I1)} → ${f1(2 * MB.I0)} mm`, 'carton')}</div>
      <p class="note">Le journal empêche la terre de coller ; à la fin on froisse le carton pour le sortir sans déformer la pièce.</p>`,
  },
  {
    id: 'abaisser', n: 'Abaisser la plaque', time: '10 min', s: [3, 3.63], dur: 6,
    html: `<ol>
        <li>Pétrissez ≈ ${f0(CLAY_G)} g de terre, aplatissez-la à la main sur la toile.</li>
        <li>Rouleau posé sur les deux réglettes de ${f1(T)} mm : roulez en croix, retournez la plaque deux fois.</li>
        <li>Resserrez la surface à l'estèque souple, des deux côtés : la plaque se déformera moins au roulage.</li>
      </ol>
      <div class="cfg">${row('Plaque', `${f1(T)} mm`, 'crue')}${row('Pièces à y loger', `≈ ${f0(AREA / 100)} cm²`, 'crue')}${row('La plus longue (A)', `${f0(W_A)} × ${f0(H_A)} mm`, 'crue')}</div>
      <p class="tip"><b>Astuce</b> Une plaque qui loge tout fait ≈ ${f0(SLAB_W / 10)} × ${f0(SLAB_D / 10)} cm. Sinon, deux plaques : la panse A seule sur la première, les autres pièces sur la seconde.</p>`,
  },
  {
    id: 'tracer', n: 'Tracer les pièces', time: '15 min', s: [4, 4.72], dur: 7,
    html: `<ol>
        <li>Posez les gabarits A à I sur la plaque, serrés : regardez la vue, c'est un rangement qui tient.</li>
        <li>Aiguille bien droite, suivez le bord du papier sans appuyer sur le gabarit. Un seul passage, jusqu'à la toile.</li>
        <li>Le bec H a une base en « selle » : suivez la courbe, elle épousera la panse.</li>
      </ol>
      <div class="cfg">${row('A · panse', `${f1(W_A)} × ${f1(H_A)} mm`, 'crue')}${row('B · épaule', `secteur R ${f1(RB)} / r ${f1(rB)}, ${f0(ANG_B)}°`, 'crue')}${row('H · bec', `axe ${f0(BEC.L)} mm, ${ANG_SEAM}°`, 'crue')}</div>`,
  },
  {
    id: 'degager', n: 'Dégager, protéger', time: '5 min', s: [5, 5.55], dur: 5,
    html: `<ol>
        <li>Retirez la chute autour des pièces, puis les gabarits : gardez-les à plat, ils resservent.</li>
        <li>Mettez de côté le bec H et la bande d'anse I sous un plastique : ils se travailleront aussi aujourd'hui, mais se poseront au cuir.</li>
      </ol>
      <p class="warn"><b>Attention</b> Les pièces doivent sécher au même rythme : tout ce qui attend reste sous le même plastique.</p>`,
  },
  {
    id: 'biseauter', n: 'Biseauter et strier', time: '10 min', s: [6, 6.65], dur: 6,
    html: `<ol>
        <li>Les petits côtés de la panse A, du col C et de la collerette F : biseau à 45°, l'un <b>dessus</b>, l'autre <b>dessous</b>. Les deux bords droits de l'épaule B aussi.</li>
        <li>Striez tout ce qui se touchera : biseaux, bord haut et bas des bandes, couronne du fond D sur ${f0(T + 4)} mm.</li>
        <li>Barbotine au pinceau juste avant chaque assemblage, pas avant.</li>
      </ol>
      <p class="note">Les gabarits comptent déjà une épaisseur de plaque en plus pour ces biseaux : la couture se referme pile au bon Ø.</p>`,
  },
  {
    id: 'panse', n: 'Monter la panse', time: '15 min', s: [7, 7.7], dur: 7,
    html: `<ol>
        <li>Posez le mandrin L au milieu de la panse A, roulez la terre autour. Les deux biseaux se chevauchent : pressez, lissez la couture.</li>
        <li>Mettez le cylindre debout sur la couronne striée du fond D, au ras du bord.</li>
        <li>Froissez le carton pour sortir le mandrin. Dedans, un colombin de 3 mm dans l'angle, écrasé au doigt ; dehors, ramenez la terre du fond sur la panse.</li>
      </ol>
      <div class="cfg">${row('Panse', `Ø ${f1(2 * RP)} × ${f1(HP)} mm`, 'crue')}</div>
      <p class="tip"><b>Astuce</b> Tournez la couture vers vous : c'est là que l'anse se posera, elle la cachera.</p>`,
  },
  {
    id: 'epaule', n: 'Poser l’épaule', time: '10 min', s: [8, 8.62], dur: 6,
    html: `<ol>
        <li>Roulez l'épaule B en cône, biseaux l'un sur l'autre. Le grand bord doit faire le tour de la panse : <b>Ø ${f1(2 * RP)} mm</b>.</li>
        <li>Barbotine sur le haut de la panse, posez l'épaule, couture du même côté que celle de la panse.</li>
        <li>Soudez dehors à l'ébauchoir ; dedans, par l'ouverture de ${f0(2 * RC - 2 * T)} mm, un petit colombin dans l'angle.</li>
      </ol>`,
  },
  {
    id: 'col', n: 'Poser le col', time: '10 min', s: [9, 9.58], dur: 5,
    html: `<ol>
        <li>Roulez le col C, couture fermée : <b>Ø ${f1(2 * RC)} mm</b> dehors.</li>
        <li>Posez-le sur le haut de l'épaule, barbotine, soudez dedans et dehors.</li>
        <li>Vérifiez qu'il est rond : posez la règle en travers, dans deux sens.</li>
      </ol>
      <div class="cfg">${row('Haut du col', `${f1(Y_TOP)} mm du pied`, 'crue')}${row('Niveau de remplissage', `${f1(Y_SH)} mm`, 'crue')}</div>`,
  },
  {
    id: 'couvercle', n: 'Le couvercle', time: '15 min', s: [10, 10.7], dur: 7,
    html: `<ol>
        <li>À l'envers d'abord : le disque E à plat. Roulez la collerette F, <b>Ø ${f1(2 * R_Fo)} mm</b> dehors, et soudez-la debout au centre du disque.</li>
        <li>Retournez le couvercle, essayez-le dans le col : ${f1(JEU * KR)} mm de jeu tout autour. Il ne doit ni frotter ni danser.</li>
        <li>Une tige de colombin de ${f0(2 * R_TIGE)} mm au centre, le bouton G dessus. Percez le <b>trou d'air</b> à la paille, à ${f0(VENT[0])} mm du centre.</li>
      </ol>
      <div class="cfg">${row('E · couvercle', `Ø ${f1(2 * R_E)} mm`, 'crue')}${row('F · collerette', `Ø ${f1(2 * R_Fo)} × ${f1(H_F)} mm`, 'crue')}</div>
      <p class="tip"><b>Astuce</b> Sans trou d'air, le thé ne coule pas : le vide le retient dans la théière.</p>`,
  },
  {
    id: 'bec', n: 'Rouler le bec', time: '10 min', s: [11, 11.6], dur: 6,
    html: `<ol>
        <li>Le mandrin M debout sur la toile ; roulez le bec H autour, biseaux l'un sur l'autre, la couture <b>dessous</b>.</li>
        <li>Repérez le dessus : c'est la pointe du « V » au milieu de la base courbe.</li>
        <li>Sortez le mandrin par le haut, laissez le bec debout sous le plastique.</li>
      </ol>
      <div class="cfg">${row('Bec', `Ø ${f1(2 * BEC.rbO)} → ${f1(2 * BEC.rtO)} mm`, 'crue')}</div>`,
  },
  {
    id: 'anse', n: 'Cintrer l’anse', time: '10 min', s: [12, 12.62], dur: 6,
    html: `<ol>
        <li>Posez le profil K à plat à côté de la bande I, et cintrez-la en suivant sa courbe en C, sans écraser la terre.</li>
        <li>Les 6 mm de chaque bout sont des pattes : laissez-les droites, elles entreront dans la panse.</li>
        <li>Laissez-la raffermir sous le plastique : au cuir, elle tiendra sa forme toute seule.</li>
      </ol>
      <div class="cfg">${row('I · bande', `${f1(L_I)} × ${f1(AW)} mm`, 'crue')}</div>`,
  },
  {
    id: 'passoire', n: 'Percer la passoire', time: '2 à 4 h, puis 15 min', s: [13, 13.7], dur: 8,
    html: `<p class="lead">Au cuir, la théière se tient et l'ongle marque encore. Elle a déjà fait <b>${f0(CFG.cuir)} % de son retrait</b> : c'est à cette taille que le gabarit J est imprimé.</p>
      <ol>
        <li>Plaquez J sur la panse, à l'opposé de la couture, le bas de l'empreinte à <b>${f1(C.cuir.foot)} mm</b> du pied.</li>
        <li>Tracez le contour à l'aiguille : c'est là que le bec se posera.</li>
        <li>Percez chaque point de dehors vers dedans, à la paille ou à l'emporte-pièce. Ôtez les bavures dedans au pinceau humide.</li>
      </ol>
      <div class="cfg">${row('Trous', `${HOLES.length} × Ø ${f1(C.cuir.hole)} mm`, 'cuir')}${row('Empreinte du bec', `${f1(C.cuir.jw)} mm de large`, 'cuir')}</div>`,
  },
  {
    id: 'poser-bec', n: 'Poser le bec', time: '15 min', s: [14, 14.6], dur: 6,
    html: `<ol>
        <li>Présentez le bec sur le contour tracé : la selle doit toucher partout. Reprenez au couteau là où elle porte.</li>
        <li>Striez la base du bec et l'anneau autour des trous, barbotine, pressez sans écraser.</li>
        <li>Dehors, un colombin fin tout autour, lissé à l'ébauchoir.</li>
      </ol>
      <p class="warn"><b>Attention</b> Le bout du bec doit rester au-dessus du niveau de remplissage (le haut de l'épaule) : ${f1(BEC.tip)} mm contre ${f1(Y_SH)} mm, crus. Sinon la théière déborde par le bec avant d'être pleine.</p>`,
  },
  {
    id: 'poser-anse', n: 'Poser l’anse', time: '10 min', s: [15, 15.6], dur: 5,
    html: `<ol>
        <li>À l'opposé du bec, sur la couture : attache haute à <b>${f1(C.cuir.it)} mm</b> du pied, attache basse à <b>${f1(C.cuir.ib)} mm</b>.</li>
        <li>Striez, barbotine, enfoncez les pattes ; soudez les deux attaches à l'ébauchoir.</li>
        <li>Regardez d'en haut : bec, bouton et anse sur une même ligne.</li>
      </ol>`,
  },
  {
    id: 'finir', n: 'Finir, sécher', time: '10 min, puis 3 jours', s: [16, 16.7], dur: 7,
    html: `<ol>
        <li>Sur la tournette, éponge à peine humide sur toutes les soudures ; chanfreinez le bord du col.</li>
        <li>Couvercle <b>en place</b>, séchez lentement sous un plastique lâche, deux ou trois jours : le couvercle et le col rétrécissent ensemble.</li>
        <li>À l'émaillage, essuyez l'émail du bord du col et de la collerette, ou cuisez le couvercle à part.</li>
      </ol>
      <p class="tip"><b>Astuce</b> Mettez un peu d'oxyde d'alumine ou de kaolin sur la portée si le couvercle cuit en place.</p>`,
  },
  {
    id: 'a-vous', n: 'À vous', time: '', s: [17, 17.3], dur: 3, spin: true,
    html: `<p class="lead">Une théière de <b>${VOL_CL} cl</b>, Ø ${f0(CFG.dp)} × ${f0(FIN_H)} mm une fois cuite.</p>
      <div class="cfg">${row('Bec', `${ANG_SEAM}°, bout au-dessus du remplissage`, 'cuite')}${row('Passoire', `${HOLES.length} trous`)}${row('Couvercle', `jeu ${f1(JEU)} mm`, 'cuite')}</div>
      <p class="note">Faites tourner la théière en glissant sur la scène. Pour une autre taille, revenez à l'outil : le tutoriel se recalcule.</p>`,
  },
];


/* ─────────────── accès : acheté, ou aperçu ───────────────
   Le tutoriel vit à côté de l'outil (même origine) : il lit les achats que
   l'outil enregistre. Sans achat, les trois premières étapes restent ouvertes,
   la suite renvoie à la fiche produit. */
const PRODUCT = '../#produit/theiere';
const OWNED = (() => { try { return !!(JSON.parse(localStorage.getItem('atelier-owned') || '{}')['theiere']); } catch (e) { return false; } })();
const ALL = STEPS.slice();
const FREE = 3;
if (!OWNED) {
  STEPS.length = FREE;
  STEPS.push({
    id: 'suite', n: 'La suite du tutoriel', time: '', s: [17.6, 17.6], dur: 0.1, spin: true, lock: true, cam: ALL[0].cam,
    html: `<p class="lead">Vous venez de voir le début. Les <b>${ALL.length - FREE} étapes suivantes</b> sont incluses avec le gabarit :</p>
      <ul class="kit">${ALL.slice(FREE).map(x => `<li>${x.n}</li>`).join('')}</ul>
      <p class="note">Les treize gabarits, de la panse A au mandrin de bec M, recalculés à vos cotes, plus ce tutoriel en entier. Achat unique, sur Gumroad.</p>`,
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
  $('[data-cfg]').textContent = `Ø ${f0(CFG.dp)} × ${f0(FIN_H)} mm · ${VOL_CL} cl · retrait ${f0(CFG.r)} %`;
  $('#rail ol').innerHTML = (OWNED ? STEPS : ALL).map((st, i) => {
    const lk = !OWNED && i >= FREE;
    return `<li><a href="#${lk ? 'suite' : st.id}" data-go="${lk ? FREE : i}"${lk ? ' class="lock"' : ''}><span>${i ? String(i).padStart(2, '0') : '·'}</span>${st.n}${lk ? ' <i>🔒</i>' : ''}</a></li>`;
  }).join('');
  $('.bar__back').href = PRODUCT;
  const pdf = $('.bar__pdf');
  if (OWNED) { pdf.textContent = 'Mes gabarits'; pdf.href = PRODUCT; pdf.removeAttribute('download'); }
  else { pdf.textContent = 'Débloquer · 9,99 €'; pdf.href = PRODUCT; pdf.removeAttribute('download'); }
  $('#steps').innerHTML = STEPS.map((st, i) => `
    <section class="step" id="${st.id}" data-i="${i}">
      <article class="card">
        <p class="card__num">${st.lock ? 'Inclus avec le gabarit' : i ? `Étape ${String(i).padStart(2, '0')} / ${ALL.length - 1}` : 'Avant de commencer'}${st.time ? `<span>${st.time}</span>` : ''}</p>
        <h2>${st.n}</h2>
        ${st.html}
        <div class="card__nav">
          ${i && !st.lock ? `<button class="btn btn--ghost" type="button" data-replay>Revoir le geste</button>` : ''}
          ${st.lock ? `<a class="btn btn--primary" href="${PRODUCT}">Débloquer · 9,99 €</a>`
            : i < N ? `<button class="btn btn--primary" type="button" data-go="${i + 1}">${i ? 'Étape suivante' : 'Commencer'} →</button>` : `<a class="btn btn--primary" href="#ma-theiere" data-go="0">Revenir au début</a>`}
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

drawAtlas();
const GLR = (() => { try { return createGL(canvas); } catch (e) { console.warn(e); return null; } })();
if (!GLR) root.classList.add('no-gl');


/* ─────────────── boucle (à la demande) ─────────────── */

let sT = 13.5, sC = 13.5, orbit = 0, orbitV = 0, dragging = false;
let px = 0, py = 0, pxC = 0, pyC = 0;
let last = 0, raf = 0, first = true, fontsKey = 0;
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
  st.play = 1;

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
  const refont = () => { drawAtlas(); if (GLR) GLR.refresh('atlas'); fontsKey++; kick(); };
  document.fonts.addEventListener('loadingdone', refont);
  document.fonts.ready.then(refont);
}

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
    G: { ASM, SHAPES, FOOT_O, HOLES, HOLE_P, xf, ROOT, MS },
  };
}
