// --------------------------- Modelle bauen ---------------------------
//
// Alles im Spiel besteht aus einfachen Formen, die zu einem einzigen 3D-Teil verschmolzen werden.
// Vorne ist immer -z, oben ist +y. Farben dürfen [unten, oben] sein, dann gibt es einen Verlauf.

const _farbe = new THREE.Color();
const _farbe2 = new THREE.Color();

class Bau {
  constructor() { this.p = []; this.n = []; this.c = []; this.i = []; this.zahl = 0; }
  setze(geo, farbe, x, y, z, o = {}) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(o.rx || 0, o.ry || 0, o.rz || 0));
    const sk = o.s || [1, 1, 1];
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sk[0], sk[1], sk[2]));
    const pos = geo.attributes.position, nor = geo.attributes.normal;
    let unten = 0, oben = 0;
    const zweifarbig = Array.isArray(farbe);
    if (zweifarbig) {
      unten = Infinity; oben = -Infinity;
      for (let i = 0; i < pos.count; i++) { unten = Math.min(unten, pos.getY(i)); oben = Math.max(oben, pos.getY(i)); }
      _farbe.set(farbe[0]); _farbe2.set(farbe[1]);
    } else _farbe.set(farbe);
    const v = new THREE.Vector3(), nv = new THREE.Vector3();
    const start = this.zahl;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m);
      this.p.push(v.x, v.y, v.z);
      nv.fromBufferAttribute(nor, i);
      nv.set(nv.x / sk[0], nv.y / sk[1], nv.z / sk[2]).applyQuaternion(q).normalize();
      this.n.push(nv.x, nv.y, nv.z);
      if (zweifarbig) {
        const u = (pos.getY(i) - unten) / Math.max(1e-5, oben - unten);
        this.c.push(_farbe.r + (_farbe2.r - _farbe.r) * u, _farbe.g + (_farbe2.g - _farbe.g) * u, _farbe.b + (_farbe2.b - _farbe.b) * u);
      } else this.c.push(_farbe.r, _farbe.g, _farbe.b);
    }
    const idx = geo.index;
    for (let i = 0; i < idx.count; i++) this.i.push(idx.getX(i) + start);
    this.zahl += pos.count;
    geo.dispose();
    return this;
  }
  // Einfacher Quader, Mittelpunkt bei x y z
  box(b, h, t, x, y, z, f, o) { return this.setze(new THREE.BoxGeometry(b, h, t), f, x, y, z, o); }
  // Quader mit runden Kanten
  weich(b, h, t, x, y, z, f, o = {}) {
    const r = o.r !== undefined ? o.r : Math.min(b, h, t) * 0.28;
    const g = new THREE.BoxGeometry(b, h, t, 3, 3, 3);
    const pos = g.attributes.position, nor = g.attributes.normal;
    const ib = b / 2 - r, ih = h / 2 - r, it = t / 2 - r;
    const p = new THREE.Vector3(), q = new THREE.Vector3(), d = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i);
      q.set(begrenzt(p.x, -ib, ib), begrenzt(p.y, -ih, ih), begrenzt(p.z, -it, it));
      d.subVectors(p, q);
      if (d.lengthSq() < 1e-8) continue;
      d.normalize();
      p.copy(q).addScaledVector(d, r);
      pos.setXYZ(i, p.x, p.y, p.z);
      nor.setXYZ(i, d.x, d.y, d.z);
    }
    return this.setze(g, f, x, y, z, o);
  }
  rund(r, x, y, z, f, o = {}) { return this.setze(new THREE.SphereGeometry(r, o.seg || 14, o.seg2 || 10), f, x, y, z, o); }
  zyl(rOben, rUnten, h, x, y, z, f, o = {}) { return this.setze(new THREE.CylinderGeometry(rOben, rUnten, h, o.seg || 12), f, x, y, z, o); }
  kegel(r, h, x, y, z, f, o = {}) { return this.setze(new THREE.ConeGeometry(r, h, o.seg || 10), f, x, y, z, o); }
  ring(r, dicke, x, y, z, f, o = {}) { return this.setze(new THREE.TorusGeometry(r, dicke, o.seg || 8, o.seg2 || 20), f, x, y, z, o); }
  // Flache Fläche auf dem Boden, in Fahrtrichtung fein unterteilt, damit sie sich mit der Welt biegt
  platte(x0, x1, y, z0, z1, f, teile = 8) {
    return this.setze(new THREE.PlaneGeometry(x1 - x0, Math.abs(z1 - z0), 1, teile), f, (x0 + x1) / 2, y, (z0 + z1) / 2, { rx: -Math.PI / 2 });
  }
  fertig() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.i);
    return g;
  }
}

const bau = machen => { const b = new Bau(); machen(b); return b.fertig(); };

function augen(b, x, y, z, r, blickX = 0, pupille = 0x17151c) {
  for (const sx of [-1, 1]) {
    b.rund(r, sx * x, y, z, 0xffffff, { seg: 12, seg2: 8 });
    b.rund(r * 0.56, sx * x + blickX * r * 0.3, y, z - r * 0.72, pupille, { seg: 10, seg2: 6 });
    b.rund(r * 0.16, sx * x + blickX * r * 0.3 - r * 0.15, y + r * 0.2, z - r * 1.18, 0xffffff, { seg: 6, seg2: 4 });
  }
}

// Gelb-schwarze Streifen: drüberspringen. Rot-weiße Streifen: drunter durchrutschen.
function streifen(b, breit, hoch, x, y, z, a, c, anzahl = 7, tief = 0.2) {
  const stueck = breit / anzahl;
  for (let i = 0; i < anzahl; i++) {
    b.box(stueck + 0.001, hoch, tief, x - breit / 2 + stueck * (i + 0.5), y, z, i % 2 ? c : a);
  }
}

// --------------------------- Die Figuren ---------------------------
// Jede Figur besteht aus beweglichen Teilen. at = Drehpunkt, f = wie das Teil aussieht.

const FIGUR_BAU = {
  fiete: {
    gang: 'lauf',
    rumpf: { at: [0, 0.72, 0], f: b => {
      b.weich(0.72, 0.68, 0.48, 0, 0.26, 0, [0xf5b70a, 0xffd21f]);
      for (const y of [0.42, 0.22, 0.04]) b.rund(0.035, 0, y, -0.245, 0x7a5a10, { seg: 6, seg2: 4 });
    } },
    kopf: { at: [0, 1.28, 0], f: b => {
      b.rund(0.33, 0, 0.1, 0, 0xf6c9a3);
      augen(b, 0.13, 0.17, -0.27, 0.07);
      b.rund(0.08, 0, 0.08, -0.33, 0xe89878, { seg: 8, seg2: 6 });
      // Weißer Rauschebart und Mütze
      b.rund(0.33, 0, -0.1, -0.13, 0xf8f6f0, { s: [1.05, 1.05, 0.8] });
      b.rund(0.17, -0.18, -0.02, -0.14, 0xf8f6f0);
      b.rund(0.17, 0.18, -0.02, -0.14, 0xf8f6f0);
      b.zyl(0.5, 0.56, 0.05, 0, 0.3, 0.04, 0xf0ac08, { seg: 18, rx: 0.22 });
      b.zyl(0.28, 0.33, 0.24, 0, 0.4, 0, 0xffd21f, { seg: 14 });
      // Pfeife
      b.box(0.04, 0.04, 0.2, 0.11, 0.01, -0.42, 0x6e4120);
      b.zyl(0.06, 0.05, 0.1, 0.11, 0.06, -0.52, 0x6e4120, { seg: 8 });
    } },
    armL: { at: [-0.42, 1.15, 0], f: b => { b.weich(0.2, 0.56, 0.2, 0, -0.22, 0, 0xffd21f); b.rund(0.11, 0, -0.52, 0, 0xf6c9a3, { seg: 8, seg2: 6 }); } },
    armR: { at: [0.42, 1.15, 0], f: b => { b.weich(0.2, 0.56, 0.2, 0, -0.22, 0, 0xffd21f); b.rund(0.11, 0, -0.52, 0, 0xf6c9a3, { seg: 8, seg2: 6 }); } },
    beinL: { at: [-0.18, 0.66, 0], f: b => { b.weich(0.26, 0.4, 0.28, 0, -0.2, 0, 0x2f5fa8); b.weich(0.28, 0.32, 0.4, 0, -0.5, -0.04, 0x25262c); } },
    beinR: { at: [0.18, 0.66, 0], f: b => { b.weich(0.26, 0.4, 0.28, 0, -0.2, 0, 0x2f5fa8); b.weich(0.28, 0.32, 0.4, 0, -0.5, -0.04, 0x25262c); } }
  },
  kalle: {
    gang: 'seite',
    rumpf: { at: [0, 0.55, 0], f: b => {
      b.rund(0.62, 0, 0.1, 0, [0xd8321e, 0xff6a3c], { s: [1.2, 0.72, 0.9] });
      for (const [x, z] of [[-0.3, 0.45], [0.3, 0.45], [0, 0.52]]) b.rund(0.08, x, 0.3, z, 0xffb28a, { seg: 8, seg2: 6 });
    } },
    kopf: { at: [0, 0.8, -0.2], f: b => {
      for (const sx of [-1, 1]) {
        b.zyl(0.05, 0.06, 0.4, sx * 0.24, 0.2, 0, 0xd8321e, { seg: 8 });
        b.rund(0.17, sx * 0.24, 0.45, 0, 0xffffff);
        b.rund(0.09, sx * 0.24, 0.45, -0.13, 0x17151c, { seg: 8, seg2: 6 });
      }
      b.ring(0.14, 0.03, 0, -0.05, -0.32, 0x7a1208, { seg: 6, seg2: 10, rz: Math.PI });
    } },
    armL: { at: [-0.72, 0.72, -0.05], f: b => {
      b.weich(0.18, 0.5, 0.18, -0.12, 0.2, 0, 0xe0432a, { rz: 0.4 });
      b.rund(0.3, -0.28, 0.6, 0, 0xff5c36, { s: [0.9, 1.05, 0.7] });
      b.kegel(0.13, 0.32, -0.42, 0.85, 0, 0xff8a60, { rz: 0.5 });
      b.kegel(0.11, 0.26, -0.14, 0.85, 0, 0xff8a60, { rz: -0.4 });
    } },
    armR: { at: [0.72, 0.72, -0.05], f: b => {
      b.weich(0.18, 0.5, 0.18, 0.12, 0.2, 0, 0xe0432a, { rz: -0.4 });
      b.rund(0.3, 0.28, 0.6, 0, 0xff5c36, { s: [0.9, 1.05, 0.7] });
      b.kegel(0.13, 0.32, 0.42, 0.85, 0, 0xff8a60, { rz: -0.5 });
      b.kegel(0.11, 0.26, 0.14, 0.85, 0, 0xff8a60, { rz: 0.4 });
    } },
    beinL: { at: [-0.55, 0.45, 0], f: b => {
      for (const z of [-0.26, 0, 0.26]) b.weich(0.46, 0.1, 0.1, -0.12, -0.22, z, 0xc42a18, { rz: 0.9 });
    } },
    beinR: { at: [0.55, 0.45, 0], f: b => {
      for (const z of [-0.26, 0, 0.26]) b.weich(0.46, 0.1, 0.1, 0.12, -0.22, z, 0xc42a18, { rz: -0.9 });
    } }
  },
  hilde: {
    gang: 'lauf',
    rumpf: { at: [0, 0.74, 0], f: b => {
      b.kegel(0.46, 0.92, 0, 0.14, 0, [0xe04f9c, 0xf58ac2], { seg: 16 });
      for (const [x, y, z] of [[-0.2, -0.1, -0.3], [0.18, 0.05, -0.27], [0, -0.22, -0.38], [0.26, -0.22, 0.3], [-0.22, 0.02, 0.27], [0, 0.2, 0.18]]) b.rund(0.05, x, y, z, 0xfff27a, { seg: 6, seg2: 4 });
      b.weich(0.5, 0.36, 0.34, 0, 0.42, 0, 0x7c54c8);
    } },
    kopf: { at: [0, 1.32, 0], f: b => {
      b.rund(0.3, 0, 0.06, 0, 0xf4cdb0);
      augen(b, 0.12, 0.09, -0.25, 0.075);
      b.ring(0.095, 0.014, -0.12, 0.09, -0.3, 0xc9a23a, { seg: 6, seg2: 14 });
      b.ring(0.095, 0.014, 0.12, 0.09, -0.3, 0xc9a23a, { seg: 6, seg2: 14 });
      b.box(0.05, 0.015, 0.015, 0, 0.09, -0.3, 0xc9a23a);
      b.ring(0.07, 0.015, 0, -0.08, -0.28, 0xd83c62, { seg: 6, seg2: 10, rz: Math.PI });
      // Lila Lockenfrisur mit Dutt
      for (const [x, y, z, r] of [[0, 0.3, 0, 0.26], [-0.22, 0.22, 0, 0.17], [0.22, 0.22, 0, 0.17], [0, 0.2, 0.2, 0.22], [-0.2, 0.14, 0.15, 0.15], [0.2, 0.14, 0.15, 0.15], [-0.15, 0.3, -0.12, 0.12], [0.15, 0.3, -0.12, 0.12], [0, 0.5, 0.1, 0.15]]) b.rund(r, x, y, z, 0xb68cf2, { seg: 10, seg2: 7 });
    } },
    armL: { at: [-0.32, 1.2, 0], f: b => { b.weich(0.16, 0.5, 0.16, 0, -0.2, 0, 0x7c54c8); b.rund(0.09, 0, -0.47, 0, 0xf4cdb0, { seg: 8, seg2: 6 }); } },
    armR: { at: [0.32, 1.2, 0], f: b => {
      b.weich(0.16, 0.5, 0.16, 0, -0.2, 0, 0x7c54c8);
      b.rund(0.09, 0, -0.47, 0, 0xf4cdb0, { seg: 8, seg2: 6 });
      // Die gefährliche Handtasche
      b.ring(0.11, 0.018, 0.08, -0.55, 0, 0x5a3a18, { seg: 6, seg2: 12 });
      b.weich(0.34, 0.26, 0.14, 0.08, -0.72, 0, [0x8a4a1a, 0xa86024]);
      b.box(0.08, 0.05, 0.16, 0.08, -0.66, 0, 0xf2c94b);
    } },
    beinL: { at: [-0.14, 0.42, 0], f: b => { b.zyl(0.07, 0.06, 0.3, 0, -0.14, 0, 0xe8c8a8, { seg: 8 }); b.weich(0.22, 0.14, 0.36, 0, -0.34, -0.05, 0x28d8c8); } },
    beinR: { at: [0.14, 0.42, 0], f: b => { b.zyl(0.07, 0.06, 0.3, 0, -0.14, 0, 0xe8c8a8, { seg: 8 }); b.weich(0.22, 0.14, 0.36, 0, -0.34, -0.05, 0x28d8c8); } }
  },
  rudi: {
    gang: 'watschel',
    rumpf: { at: [0, 0.62, 0], f: b => {
      b.rund(0.56, 0, 0.1, 0, 0xffffff, { s: [1, 0.95, 1.05] });
      for (const y of [-0.26, -0.06, 0.14, 0.34]) b.ring(0.53 - Math.abs(y) * 0.32, 0.035, 0, y + 0.04, 0, 0x2556b8, { rx: Math.PI / 2, seg: 6, seg2: 22 });
      // Geringelter Schwanz
      b.ring(0.09, 0.04, 0, 0.42, 0.54, 0xd9ad74, { seg: 6, seg2: 12, ry: Math.PI / 2 });
    } },
    kopf: { at: [0, 1.12, -0.12], f: b => {
      b.rund(0.42, 0, 0.06, 0, 0xd9ad74, { s: [1.08, 0.95, 1] });
      b.rund(0.28, 0, -0.03, -0.26, 0x2a2228, { s: [1.1, 0.8, 0.6] });
      b.rund(0.09, 0, 0.04, -0.42, 0x111015, { seg: 8, seg2: 6, s: [1.2, 0.8, 0.8] });
      augen(b, 0.2, 0.18, -0.32, 0.12, 0);
      b.rund(0.07, 0.02, -0.14, -0.4, 0xf0628a, { s: [1, 1.3, 0.5], seg: 8, seg2: 6 });
      for (const sx of [-1, 1]) b.rund(0.17, sx * 0.4, 0.24, 0.02, 0x3a2c2c, { s: [0.7, 1.2, 0.5], rz: sx * 0.7 });
      // Kapitänsmützchen
      b.zyl(0.24, 0.25, 0.08, 0, 0.42, 0, 0xffffff, { seg: 14 });
      b.zyl(0.26, 0.26, 0.04, 0, 0.37, 0, 0x2556b8, { seg: 14 });
    } },
    armL: { at: [-0.5, 0.72, -0.1], f: b => { b.weich(0.2, 0.36, 0.2, -0.04, -0.15, 0, 0xd9ad74); } },
    armR: { at: [0.5, 0.72, -0.1], f: b => { b.weich(0.2, 0.36, 0.2, 0.04, -0.15, 0, 0xd9ad74); } },
    beinL: { at: [-0.25, 0.3, 0.05], f: b => { b.weich(0.24, 0.32, 0.28, 0, -0.14, -0.02, 0xd9ad74); } },
    beinR: { at: [0.25, 0.3, 0.05], f: b => { b.weich(0.24, 0.32, 0.28, 0, -0.14, -0.02, 0xd9ad74); } }
  },
  erna: {
    gang: 'watschel',
    rumpf: { at: [0, 0.58, 0], f: b => {
      b.rund(0.55, 0, 0.14, 0, [0xf7c90e, 0xffe43a], { s: [1, 0.9, 1.12] });
      b.kegel(0.2, 0.42, 0, 0.42, 0.58, 0xffe43a, { rx: -1 });
      // Rot-weißer Schwimmring
      for (let i = 0; i < 8; i++) {
        const w = (i / 8) * Math.PI * 2;
        b.rund(0.19, Math.cos(w) * 0.56, -0.05, Math.sin(w) * 0.56, i % 2 ? 0xffffff : 0xf0382e, { seg: 10, seg2: 7 });
      }
    } },
    kopf: { at: [0, 1.12, -0.12], f: b => {
      b.rund(0.38, 0, 0.06, 0, [0xf7c90e, 0xffe43a]);
      augen(b, 0.15, 0.17, -0.3, 0.1);
      b.rund(0.24, 0, -0.02, -0.38, 0xff8a1a, { s: [1.15, 0.42, 0.9] });
      b.rund(0.18, 0, -0.1, -0.33, 0xe56a10, { s: [1.05, 0.3, 0.9] });
      // Matrosenhütchen
      b.zyl(0.22, 0.26, 0.15, 0.04, 0.45, 0, 0xffffff, { seg: 14, rz: -0.14 });
      b.box(0.5, 0.03, 0.03, 0.02, 0.4, -0.2, 0x2556b8);
    } },
    armL: { at: [-0.48, 0.85, 0], f: b => { b.rund(0.2, -0.08, -0.15, 0, 0xf0b90a, { s: [0.45, 1.1, 0.8] }); } },
    armR: { at: [0.48, 0.85, 0], f: b => { b.rund(0.2, 0.08, -0.15, 0, 0xf0b90a, { s: [0.45, 1.1, 0.8] }); } },
    beinL: { at: [-0.22, 0.32, 0], f: b => { b.zyl(0.05, 0.05, 0.2, 0, -0.1, 0, 0xff8a1a, { seg: 6 }); b.weich(0.3, 0.08, 0.42, 0, -0.24, -0.08, 0xff8a1a); } },
    beinR: { at: [0.22, 0.32, 0], f: b => { b.zyl(0.05, 0.05, 0.2, 0, -0.1, 0, 0xff8a1a, { seg: 6 }); b.weich(0.3, 0.08, 0.42, 0, -0.24, -0.08, 0xff8a1a); } }
  },
  bert: {
    gang: 'lauf',
    rumpf: { at: [0, 0.74, 0], f: b => {
      b.zyl(0.36, 0.36, 0.7, 0, 0.14, 0, [0xa8b4c4, 0xd8e0ea], { seg: 16 });
      b.zyl(0.37, 0.37, 0.36, 0, 0.14, 0, 0xe0442e, { seg: 16 });
      b.box(0.3, 0.1, 0.04, 0, 0.14, -0.37, 0xffe04a);
      b.ring(0.36, 0.025, 0, 0.5, 0, 0x8a96a6, { rx: Math.PI / 2, seg: 6, seg2: 18 });
      b.ring(0.36, 0.025, 0, -0.2, 0, 0x8a96a6, { rx: Math.PI / 2, seg: 6, seg2: 18 });
    } },
    kopf: { at: [0, 1.26, 0], f: b => {
      b.zyl(0.32, 0.32, 0.42, 0, 0.1, 0, [0xa8b4c4, 0xe4ecf4], { seg: 16 });
      b.ring(0.32, 0.02, 0, 0.31, 0, 0x8a96a6, { rx: Math.PI / 2, seg: 6, seg2: 18 });
      // Dosendeckel steht schief offen, eins der Augen ist riesig
      b.zyl(0.32, 0.32, 0.03, 0.12, 0.45, 0.08, 0xc4ced8, { seg: 16, rz: -0.5 });
      b.rund(0.15, -0.14, 0.14, -0.26, 0xffffff);
      b.rund(0.08, -0.14, 0.14, -0.39, 0x26c8ff, { seg: 8, seg2: 6 });
      b.rund(0.07, 0.15, 0.14, -0.29, 0xffffff, { seg: 8, seg2: 6 });
      b.rund(0.04, 0.15, 0.14, -0.35, 0x17151c, { seg: 6, seg2: 4 });
      b.box(0.28, 0.05, 0.03, 0, -0.03, -0.32, 0x45505e);
      b.zyl(0.015, 0.015, 0.4, -0.15, 0.55, 0, 0x8a96a6, { seg: 6 });
      b.rund(0.06, -0.15, 0.76, 0, 0xff4a4a, { seg: 8, seg2: 6 });
    } },
    armL: { at: [-0.42, 1.08, 0], f: b => { b.zyl(0.07, 0.07, 0.42, 0, -0.2, 0, 0x8a96a6, { seg: 8 }); b.ring(0.08, 0.03, 0, -0.46, 0, 0xe0442e, { seg: 6, seg2: 10 }); } },
    armR: { at: [0.42, 1.08, 0], f: b => { b.zyl(0.07, 0.07, 0.42, 0, -0.2, 0, 0x8a96a6, { seg: 8 }); b.ring(0.08, 0.03, 0, -0.46, 0, 0xe0442e, { seg: 6, seg2: 10 }); } },
    beinL: { at: [-0.17, 0.48, 0], f: b => { for (let i = 0; i < 4; i++) b.ring(0.08, 0.02, 0, -0.06 - i * 0.075, 0, 0xc4ced8, { rx: Math.PI / 2, seg: 5, seg2: 10 }); b.weich(0.24, 0.13, 0.36, 0, -0.42, -0.05, 0xe0442e); } },
    beinR: { at: [0.17, 0.48, 0], f: b => { for (let i = 0; i < 4; i++) b.ring(0.08, 0.02, 0, -0.06 - i * 0.075, 0, 0xc4ced8, { rx: Math.PI / 2, seg: 5, seg2: 10 }); b.weich(0.24, 0.13, 0.36, 0, -0.42, -0.05, 0xe0442e); } }
  },
  bodo: {
    gang: 'hopf',
    rumpf: { at: [0, 0.42, 0], f: b => {
      b.zyl(0.33, 0.33, 0.9, 0, 0.45, 0, [0xa43a1a, 0xc95026], { seg: 16 });
      b.rund(0.33, 0, 0, 0, 0xa43a1a);
    } },
    kopf: { at: [0, 1.28, 0], f: b => {
      b.rund(0.33, 0, -0.02, 0, 0xc95026);
      b.zyl(0.34, 0.33, 0.4, 0, -0.2, 0, 0xc95026, { seg: 16 });
      // Coole Sonnenbrille
      b.weich(0.26, 0.14, 0.05, -0.15, 0.03, -0.32, 0x121218, { r: 0.04 });
      b.weich(0.26, 0.14, 0.05, 0.15, 0.03, -0.32, 0x121218, { r: 0.04 });
      b.box(0.68, 0.04, 0.04, 0, 0.06, -0.32, 0x121218);
      b.box(0.06, 0.02, 0.01, -0.2, 0.06, -0.35, 0x8ad8ff);
      b.ring(0.11, 0.02, 0.03, -0.15, -0.3, 0x5e1a0c, { seg: 6, seg2: 10, rz: Math.PI });
      // Senf-Zickzack vorne und hinten
      for (let i = 0; i < 5; i++) {
        const y = 0.27 - i * 0.04;
        b.weich(0.1, 0.05, 0.03, (i % 2 ? 0.1 : -0.1), y, -0.3 + i * 0.01, 0xffd51a, { r: 0.015 });
      }
    } },
    extra: { at: [0, 0.42, 0], f: b => {
      for (let i = 0; i < 9; i++) {
        const y = 0.02 + i * 0.1;
        const x = i % 2 ? 0.14 : -0.14;
        b.rund(0.05, x, y, 0.33, 0xffd51a, { seg: 6, seg2: 4 });
        b.rund(0.05, x * 0.7, y, -0.335, 0xffd51a, { seg: 6, seg2: 4 });
        b.rund(0.05, 0, y + 0.05, 0.34, 0xffd51a, { seg: 6, seg2: 4 });
      }
    } },
    armL: { at: [-0.34, 0.86, 0], f: b => { b.zyl(0.03, 0.03, 0.34, -0.03, -0.14, 0, 0x2a1c18, { seg: 6 }); b.rund(0.1, -0.05, -0.34, 0, 0xffffff, { seg: 8, seg2: 6 }); } },
    armR: { at: [0.34, 0.86, 0], f: b => { b.zyl(0.03, 0.03, 0.34, 0.03, -0.14, 0, 0x2a1c18, { seg: 6 }); b.rund(0.1, 0.05, -0.34, 0, 0xffffff, { seg: 8, seg2: 6 }); } },
    beinL: { at: [-0.14, 0.25, 0], f: b => { b.zyl(0.03, 0.03, 0.2, 0, -0.09, 0, 0x2a1c18, { seg: 6 }); b.weich(0.2, 0.09, 0.3, 0, -0.2, -0.05, 0xf8f8f8); } },
    beinR: { at: [0.14, 0.25, 0], f: b => { b.zyl(0.03, 0.03, 0.2, 0, -0.09, 0, 0x2a1c18, { seg: 6 }); b.weich(0.2, 0.09, 0.3, 0, -0.2, -0.05, 0xf8f8f8); } }
  },
  quentin: {
    gang: 'schweb',
    rumpf: { at: [0, 0.95, 0], f: b => {
      b.setze(new THREE.SphereGeometry(0.62, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), [0xf254b4, 0xffa3e0], 0, 0, 0);
      for (const [x, y, z, r] of [[-0.3, 0.32, 0.3, 0.09], [0.28, 0.2, 0.38, 0.07], [0, 0.46, 0.22, 0.1], [0.34, 0.36, -0.1, 0.06], [-0.4, 0.2, -0.1, 0.07]]) b.rund(r, x, y, z, 0xffd8f2, { seg: 8, seg2: 6 });
      b.rund(0.56, 0, -0.03, 0, 0xc23a96, { s: [1, 0.14, 1] });
    } },
    kopf: { at: [0, 1.18, -0.42], f: b => {
      augen(b, 0.2, 0, 0, 0.13);
      b.box(0.28, 0.05, 0.1, -0.2, 0.09, -0.06, 0xf254b4);
      b.box(0.28, 0.05, 0.1, 0.2, 0.09, -0.06, 0xf254b4);
      // Fliege
      b.kegel(0.09, 0.16, -0.1, -0.24, -0.03, 0x39e0d8, { rz: -Math.PI / 2, seg: 6 });
      b.kegel(0.09, 0.16, 0.1, -0.24, -0.03, 0x39e0d8, { rz: Math.PI / 2, seg: 6 });
      b.rund(0.04, 0, -0.24, -0.05, 0x1ea8a2, { seg: 6, seg2: 4 });
    } },
    armL: { at: [-0.36, 0.9, 0], f: b => { for (let i = 0; i < 5; i++) b.rund(0.09 - i * 0.008, -0.03 * i, -0.08 - i * 0.14, 0, 0xff8bd4, { seg: 7, seg2: 5 }); } },
    armR: { at: [0.36, 0.9, 0], f: b => { for (let i = 0; i < 5; i++) b.rund(0.09 - i * 0.008, 0.03 * i, -0.08 - i * 0.14, 0, 0xff8bd4, { seg: 7, seg2: 5 }); } },
    beinL: { at: [-0.14, 0.9, 0.05], f: b => { for (let i = 0; i < 6; i++) b.rund(0.1 - i * 0.008, (i % 2 ? 0.03 : -0.03), -0.06 - i * 0.14, 0, 0xffa3e0, { seg: 7, seg2: 5 }); } },
    beinR: { at: [0.14, 0.9, 0.05], f: b => { for (let i = 0; i < 6; i++) b.rund(0.1 - i * 0.008, (i % 2 ? -0.03 : 0.03), -0.06 - i * 0.14, 0, 0xffa3e0, { seg: 7, seg2: 5 }); } }
  },
  pia: {
    gang: 'humpel',
    rumpf: { at: [0, 0.72, 0], f: b => {
      b.weich(0.54, 0.62, 0.34, 0, 0.26, 0, 0xfaf4e6);
      for (const y of [0.42, 0.26, 0.1]) b.box(0.56, 0.05, 0.36, 0, y, 0, 0xd83a3a);
      b.weich(0.2, 0.62, 0.36, -0.2, 0.26, 0, 0x6c3e1e, { r: 0.04 });
      b.weich(0.2, 0.62, 0.36, 0.2, 0.26, 0, 0x6c3e1e, { r: 0.04 });
      b.box(0.58, 0.09, 0.38, 0, -0.04, 0, 0x2a1c18);
      b.box(0.12, 0.11, 0.05, 0, -0.04, -0.19, 0xf2c94b);
    } },
    kopf: { at: [0, 1.32, 0], f: b => {
      b.rund(0.31, 0, 0.06, 0, 0xc98a5a);
      b.rund(0.09, 0.12, 0.12, -0.25, 0xffffff, { seg: 10, seg2: 7 });
      b.rund(0.05, 0.12, 0.12, -0.32, 0x17151c, { seg: 8, seg2: 6 });
      // Augenklappe, Kopftuch, Zopf
      b.rund(0.1, -0.12, 0.12, -0.26, 0x17151c, { s: [1, 1, 0.4], seg: 10, seg2: 7 });
      b.ring(0.31, 0.012, 0, 0.14, 0, 0x17151c, { rx: 1.4, rz: -0.3, seg: 5, seg2: 22 });
      b.ring(0.08, 0.015, 0.03, -0.08, -0.27, 0x7a1e1e, { seg: 6, seg2: 10, rz: Math.PI });
      b.setze(new THREE.SphereGeometry(0.335, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.46), 0xd83a3a, 0, 0.08, 0);
      for (const y of [0.3, 0.14, -0.02]) b.rund(0.03, -0.2, y + 0.04, -0.17, 0xffffff, { seg: 5, seg2: 4 });
      b.rund(0.1, 0.05, 0.22, 0.32, 0xd83a3a, { seg: 8, seg2: 5 });
      b.box(0.08, 0.3, 0.03, 0.14, 0.05, 0.34, 0xd83a3a, { rz: -0.3 });
      for (let i = 0; i < 5; i++) b.rund(0.09 - i * 0.008, -0.1, -0.05 - i * 0.12, 0.28 + i * 0.02, 0x241812, { seg: 8, seg2: 5 });
      b.ring(0.07, 0.02, -0.33, -0.02, 0, 0xf2c94b, { seg: 6, seg2: 10, ry: Math.PI / 2 });
    } },
    extra: { at: [0.42, 1.28, 0.02], f: b => {
      // Der Papagei auf der Schulter
      b.rund(0.14, 0, 0.14, 0, 0x2fd46a, { s: [0.9, 1.15, 0.9] });
      b.rund(0.11, 0, 0.32, -0.02, 0xf03a3a);
      b.kegel(0.05, 0.12, 0, 0.3, -0.13, 0xffc21a, { rx: -1.9, seg: 6 });
      b.rund(0.03, 0.06, 0.35, -0.09, 0xffffff, { seg: 5, seg2: 4 });
      b.rund(0.03, -0.06, 0.35, -0.09, 0xffffff, { seg: 5, seg2: 4 });
      b.weich(0.1, 0.34, 0.06, 0, 0.0, 0.16, 0x2a8cf0, { rx: 0.6, r: 0.02 });
    } },
    armL: { at: [-0.36, 1.12, 0], f: b => {
      b.weich(0.17, 0.46, 0.17, 0, -0.18, 0, 0xc98a5a);
      b.zyl(0.1, 0.1, 0.06, 0, -0.43, 0, 0x6c3e1e, { seg: 10 });
      // Haken
      b.ring(0.08, 0.018, 0.07, -0.54, 0, 0xc4ced8, { seg: 5, seg2: 12, rz: -0.4 });
    } },
    armR: { at: [0.36, 1.12, 0], f: b => { b.weich(0.17, 0.46, 0.17, 0, -0.18, 0, 0xc98a5a); b.rund(0.095, 0, -0.45, 0, 0xc98a5a, { seg: 8, seg2: 6 }); } },
    beinL: { at: [-0.15, 0.62, 0], f: b => { b.weich(0.24, 0.32, 0.26, 0, -0.14, 0, 0x2a4a8a); b.zyl(0.09, 0.05, 0.3, 0, -0.42, 0, 0xa8743a, { seg: 8 }); } },
    beinR: { at: [0.15, 0.62, 0], f: b => { b.weich(0.24, 0.34, 0.26, 0, -0.15, 0, 0x2a4a8a); b.weich(0.26, 0.3, 0.36, 0, -0.44, -0.03, 0x241812); } }
  },
  blorp: {
    gang: 'hopf',
    rumpf: { at: [0, 0.6, 0], f: b => {
      b.rund(0.34, 0, 0.14, 0, [0xc4d0e0, 0xeff4fa], { s: [1, 1.15, 0.85] });
      b.box(0.34, 0.05, 0.05, 0, 0.14, -0.3, 0x3af07a);
      b.rund(0.05, 0, 0.3, -0.27, 0xffd21f, { seg: 6, seg2: 4 });
    } },
    kopf: { at: [0, 1.22, 0], f: b => {
      b.rund(0.5, 0, 0.1, 0, [0x3cc95a, 0x8af07a], { s: [1.12, 0.95, 1] });
      for (const [x, y, r] of [[-0.25, 0.2, 0.15], [0.25, 0.2, 0.15], [0, 0.38, 0.11]]) {
        b.rund(r, x, y, -0.37, 0xffffff, { seg: 10, seg2: 7 });
        b.rund(r * 0.55, x, y, -0.37 - r * 0.72, 0x2a0a4a, { seg: 8, seg2: 6 });
      }
      b.ring(0.14, 0.02, 0, -0.1, -0.42, 0x176a2c, { seg: 6, seg2: 10, rz: Math.PI });
      for (const sx of [-1, 1]) {
        b.zyl(0.015, 0.02, 0.36, sx * 0.25, 0.58, 0, 0x2a9a44, { seg: 6, rz: -sx * 0.3 });
        b.rund(0.06, sx * 0.31, 0.75, 0, 0xffe43a, { seg: 8, seg2: 6 });
      }
      // Kapitänsmützchen für Außerirdische
      b.zyl(0.2, 0.22, 0.09, 0, 0.56, 0, 0x2556b8, { seg: 14 });
      b.box(0.22, 0.03, 0.14, 0, 0.5, -0.2, 0x17151c);
    } },
    armL: { at: [-0.34, 0.85, 0], f: b => { b.zyl(0.05, 0.06, 0.4, -0.05, -0.18, 0, 0x5ee070, { seg: 8 }); b.rund(0.1, -0.08, -0.42, 0, 0x8af07a, { seg: 8, seg2: 6 }); } },
    armR: { at: [0.34, 0.85, 0], f: b => { b.zyl(0.05, 0.06, 0.4, 0.05, -0.18, 0, 0x5ee070, { seg: 8 }); b.rund(0.1, 0.08, -0.42, 0, 0x8af07a, { seg: 8, seg2: 6 }); } },
    beinL: { at: [-0.14, 0.38, 0], f: b => { b.zyl(0.07, 0.08, 0.26, 0, -0.12, 0, 0xc4d0e0, { seg: 8 }); b.weich(0.24, 0.1, 0.34, 0, -0.3, -0.05, 0x7a4ee0); } },
    beinR: { at: [0.14, 0.38, 0], f: b => { b.zyl(0.07, 0.08, 0.26, 0, -0.12, 0, 0xc4d0e0, { seg: 8 }); b.weich(0.24, 0.1, 0.34, 0, -0.3, -0.05, 0x7a4ee0); } }
  },
  gisela: {
    gang: 'watschel',
    rumpf: { at: [0, 0.62, 0], f: b => {
      b.rund(0.46, 0, 0.14, 0.08, [0xd8dee6, 0xffffff], { s: [0.95, 1.05, 1.3] });
      b.kegel(0.22, 0.5, 0, 0.1, 0.72, 0x7c8694, { rx: 1.7, seg: 8 });
    } },
    kopf: { at: [0, 1.2, -0.2], f: b => {
      b.rund(0.33, 0, 0.04, 0, 0xffffff);
      augen(b, 0.15, 0.1, -0.24, 0.09, 0, 0xe8c810);
      b.rund(0.05, -0.15, 0.1, -0.33, 0x121216, { seg: 6, seg2: 4 });
      b.rund(0.05, 0.15, 0.1, -0.33, 0x121216, { seg: 6, seg2: 4 });
      // Böse Augenbrauen und ein großer Schnabel
      b.box(0.24, 0.05, 0.08, -0.15, 0.23, -0.3, 0x3a3f4a, { rz: -0.42 });
      b.box(0.24, 0.05, 0.08, 0.15, 0.23, -0.3, 0x3a3f4a, { rz: 0.42 });
      b.kegel(0.13, 0.42, 0, -0.04, -0.45, 0xffc21a, { rx: -Math.PI / 2, seg: 10 });
      b.rund(0.05, 0, -0.1, -0.5, 0xe8301c, { seg: 6, seg2: 4 });
      // Das geklaute Fischbrötchen
      b.rund(0.2, 0.12, -0.16, -0.58, 0xe8b468, { s: [1.5, 0.5, 0.75] });
      b.box(0.42, 0.04, 0.2, 0.12, -0.14, -0.58, 0x9dd64a);
      b.rund(0.18, 0.12, -0.12, -0.58, 0xf28a5a, { s: [1.5, 0.3, 0.7] });
    } },
    armL: { at: [-0.42, 1.0, 0.05], f: b => { b.rund(0.42, -0.18, -0.12, 0.08, [0x7c8694, 0xb4bcc8], { s: [0.5, 0.18, 0.75], rz: 0.25 }); b.rund(0.2, -0.45, -0.2, 0.15, 0x3a3f4a, { s: [0.7, 0.14, 0.6], rz: 0.25, seg: 8, seg2: 6 }); } },
    armR: { at: [0.42, 1.0, 0.05], f: b => { b.rund(0.42, 0.18, -0.12, 0.08, [0x7c8694, 0xb4bcc8], { s: [0.5, 0.18, 0.75], rz: -0.25 }); b.rund(0.2, 0.45, -0.2, 0.15, 0x3a3f4a, { s: [0.7, 0.14, 0.6], rz: -0.25, seg: 8, seg2: 6 }); } },
    beinL: { at: [-0.15, 0.3, 0.05], f: b => { b.zyl(0.04, 0.04, 0.2, 0, -0.08, 0, 0xffa21a, { seg: 6 }); b.weich(0.24, 0.07, 0.34, 0, -0.2, -0.06, 0xffa21a); } },
    beinR: { at: [0.15, 0.3, 0.05], f: b => { b.zyl(0.04, 0.04, 0.2, 0, -0.08, 0, 0xffa21a, { seg: 6 }); b.weich(0.24, 0.07, 0.34, 0, -0.2, -0.06, 0xffa21a); } }
  }
};

// --------------------------- Hilfen, Münzen ---------------------------

const MUENZE_FORM = () => bau(b => {
  b.zyl(0.42, 0.42, 0.1, 0, 0, 0, 0xffc21a, { seg: 20, rx: Math.PI / 2 });
  b.ring(0.37, 0.05, 0, 0, 0.05, 0xffe45a, { seg: 6, seg2: 20 });
  b.ring(0.37, 0.05, 0, 0, -0.05, 0xffe45a, { seg: 6, seg2: 20 });
  // Der Anker auf der Münze
  for (const z of [-0.06, 0.06]) {
    b.box(0.05, 0.36, 0.02, 0, 0, z, 0xc98a0a);
    b.box(0.2, 0.05, 0.02, 0, 0.1, z, 0xc98a0a);
    b.box(0.26, 0.05, 0.02, 0, -0.16, z, 0xc98a0a);
    b.box(0.05, 0.1, 0.02, -0.12, -0.11, z, 0xc98a0a);
    b.box(0.05, 0.1, 0.02, 0.12, -0.11, z, 0xc98a0a);
  }
});

const HILFE_FORM = {
  magnet: () => bau(b => {
    b.setze(new THREE.TorusGeometry(0.3, 0.11, 8, 14, Math.PI), 0xf0382e, 0, 0.05, 0, {});
    b.zyl(0.11, 0.11, 0.26, -0.3, -0.08, 0, 0xf0382e, { seg: 10 });
    b.zyl(0.11, 0.11, 0.26, 0.3, -0.08, 0, 0xf0382e, { seg: 10 });
    b.zyl(0.115, 0.115, 0.16, -0.3, -0.28, 0, 0xe8ecf2, { seg: 10 });
    b.zyl(0.115, 0.115, 0.16, 0.3, -0.28, 0, 0xe8ecf2, { seg: 10 });
  }),
  wanne: () => bau(b => {
    b.rund(0.4, 0, 0, 0, [0xd8e4ec, 0xffffff], { s: [0.8, 0.5, 1.2] });
    b.rund(0.31, 0, 0.13, 0, 0x4ab8e8, { s: [0.8, 0.12, 1.2] });
    for (const [x, z] of [[-0.2, -0.3], [0.2, -0.3], [-0.2, 0.3], [0.2, 0.3]]) b.rund(0.05, x, -0.2, z, 0xf2c21a, { seg: 6, seg2: 4 });
    for (const sx of [-1, 1]) b.rund(0.22, sx * 0.45, 0.2, 0.05, 0xffffff, { s: [1, 0.22, 0.55], rz: sx * 0.5, seg: 8, seg2: 6 });
  }),
  federn: () => bau(b => {
    for (const [rz, f] of [[-0.45, 0xffffff], [0, 0xbcd4ff], [0.45, 0xffffff]]) {
      b.rund(0.32, Math.sin(rz) * -0.2, Math.cos(rz) * 0.15, 0, f, { s: [0.32, 1, 0.14], rz, seg: 8, seg2: 8 });
      b.box(0.02, 0.5, 0.02, Math.sin(rz) * -0.2, Math.cos(rz) * 0.1 - 0.15, 0.04, 0x7c8694, { rz });
    }
  }),
  stiefel: () => bau(b => {
    b.weich(0.26, 0.42, 0.26, 0, 0.1, 0, [0x28b84a, 0x5fe06a]);
    b.weich(0.28, 0.14, 0.46, 0, -0.18, -0.09, 0x28b84a);
    for (let i = 0; i < 3; i++) b.ring(0.11, 0.025, 0, -0.3 - i * 0.07, -0.05, 0xc4ced8, { rx: Math.PI / 2, seg: 5, seg2: 10 });
  }),
  goldfisch: () => bau(b => {
    b.rund(0.28, 0, 0, 0, 0xffa22e, { s: [0.55, 0.9, 1.3] });
    b.kegel(0.22, 0.32, 0, 0, 0.46, 0xffc95a, { rx: Math.PI / 2 + Math.PI, seg: 8, s: [0.3, 1, 1] });
    b.kegel(0.1, 0.2, 0, 0.3, 0.02, 0xffc95a, { seg: 6, s: [0.3, 1, 1.4] });
    b.rund(0.07, 0.13, 0.05, -0.2, 0xffffff, { seg: 8, seg2: 6 });
    b.rund(0.07, -0.13, 0.05, -0.2, 0xffffff, { seg: 8, seg2: 6 });
    b.rund(0.04, 0.17, 0.05, -0.22, 0x17151c, { seg: 6, seg2: 4 });
    b.rund(0.04, -0.17, 0.05, -0.22, 0x17151c, { seg: 6, seg2: 4 });
  }),
  ring: () => bau(b => {
    for (let i = 0; i < 8; i++) {
      const w = (i / 8) * Math.PI * 2;
      b.rund(0.15, Math.cos(w) * 0.32, Math.sin(w) * 0.32, 0, i % 2 ? 0xffffff : 0xf0382e, { seg: 10, seg2: 7 });
    }
  }),
  broetchen: () => bau(b => {
    b.rund(0.26, 0, -0.1, 0, 0xe8b468, { s: [1.4, 0.45, 0.8] });
    b.rund(0.25, 0, 0.14, 0, [0xd89a4a, 0xf4c67e], { s: [1.4, 0.6, 0.8] });
    b.box(0.72, 0.03, 0.34, 0, 0, 0, 0x9dd64a);
    b.rund(0.2, 0, 0.03, 0, 0xf28a5a, { s: [1.75, 0.3, 0.75] });
  })
};

// Der Wimpel im Ziel und der Bogen
const ZIEL_FORM = () => bau(b => {
  for (const sx of [-1, 1]) b.zyl(0.18, 0.2, 6.2, sx * 5.2, 3.1, 0, [0x2556b8, 0x3f7ae8], { seg: 10 });
  b.weich(10.8, 1.3, 0.3, 0, 6.2, 0, 0xf8f4e8, { r: 0.08 });
  for (let i = 0; i < 18; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2) b.box(0.6, 0.65, 0.32, -5.1 + i * 0.6, 5.9 + j * 0.65, 0, 0x1c1c22);
  b.platte(-4, 4, 0.05, -1.5, 1.5, 0xf8f4e8, 2);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2) b.box(1, 0.02, 1, -3.5 + i, 0.07, -1 + j, 0x1c1c22);
});

// --------------------------- Die fünf Welten ---------------------------

// Zeichnet viele kleine Fenster an eine Hauswand (nach innen zur Strecke)
function fenster(b, seite, x, y0, z0, spalten, reihen, dz, dy, farbe, rahmen) {
  for (let i = 0; i < spalten; i++) for (let j = 0; j < reihen; j++) {
    const z = z0 + i * dz, y = y0 + j * dy;
    if (rahmen) b.box(0.08, 1.15, 0.85, x, y, z, rahmen);
    b.box(0.1, 0.95, 0.65, x + seite * 0.03, y, z, farbe);
  }
}

function kisteForm(b, x, y, z, g, h = 0xc98f4e, d = 0x8e5e2a) {
  b.weich(g, g, g, x, y + g / 2, z, [d, h], { r: g * 0.06 });
  b.box(g * 1.02, g * 0.1, g * 0.1, x, y + g * 0.92, z + g * 0.46, d);
  b.box(g * 1.02, g * 0.1, g * 0.1, x, y + g * 0.08, z + g * 0.46, d);
  b.box(g * 0.1, g, g * 0.1, x - g * 0.46, y + g * 0.5, z + g * 0.46, d);
  b.box(g * 0.1, g, g * 0.1, x + g * 0.46, y + g * 0.5, z + g * 0.46, d);
}

// Die Hindernis-Grundformen. Die Streifen zeigen immer, was zu tun ist.
function niedrigBasis(b, f1 = 0xffc812, f2 = 0x17171c) {
  streifen(b, 2.3, 0.34, 0, 0.88, 0.5, f1, f2, 8, 0.08);
  b.box(0.08, 1.05, 0.08, -1.12, 0.52, 0.5, f2);
  b.box(0.08, 1.05, 0.08, 1.12, 0.52, 0.5, f2);
}
function hochBasis(b, pfosten, f1 = 0xf03a2e, f2 = 0xf8f4ec) {
  // Eine Wimpelleine zwischen zwei Masten: Unten bleibt Platz zum Durchrutschen
  for (const x of [-1.15, 1.15]) {
    b.zyl(0.09, 0.12, 3.3, x, 1.65, 0, pfosten, { seg: 8 });
    b.rund(0.15, x, 3.35, 0, f1, { seg: 8, seg2: 6 });
  }
  b.box(2.4, 0.06, 0.06, 0, 2.02, 0, 0x2a2a30);
  for (let i = 0; i < 6; i++) {
    b.kegel(0.21, 0.78, -1 + i * 0.4, 1.6, 0, i % 2 ? f2 : f1, { seg: 3, rx: Math.PI, s: [1, 1, 0.25] });
  }
}

// Das Podest: ein Block aus Steinen mit breiter Rampe, keine Kiste und kein Wagen.
// Nebeneinander stehende Podeste wachsen zu einer einzigen Fläche zusammen.
function baueContainer(lang, rampe, farbe, dunkel, stil) {
  return bau(b => {
    const start = rampe || 0;
    const koerper = lang - start;
    const breit = 2.52;
    b.box(breit, DACH_HOCH - 0.1, koerper, 0, (DACH_HOCH - 0.1) / 2, -start - koerper / 2, [dunkel, farbe]);
    // Unregelmäßige Steine an den Seiten und vorne
    const z = wuerfel(Math.round(lang * 13 + start * 7 + farbe));
    const steine = [farbe, dunkel, stil.stein || farbe];
    for (let reihe = 0; reihe < 3; reihe++) {
      const y = 0.45 + reihe * 0.8;
      for (const seite of [-1, 1]) {
        for (let w = -start - z.von(0.3, 1.2); w > -lang + 0.6; w -= z.von(1.5, 2.6)) {
          b.box(0.06, z.von(0.5, 0.68), z.von(1, 1.6), seite * (breit / 2 + 0.02), y, w, steine[Math.floor(z() * 3)]);
        }
      }
      for (let x = -0.85 + (reihe % 2) * 0.35; x < 1.1; x += 0.85) {
        b.box(z.von(0.62, 0.78), z.von(0.5, 0.68), 0.06, x, y, -start + 0.02, steine[Math.floor(z() * 3)]);
      }
    }
    // Die begehbare Oberseite steht etwas über
    b.weich(breit + 0.1, 0.24, koerper + 0.1, 0, DACH_HOCH - 0.12, -start - koerper / 2, stil.oben || farbe, { r: 0.06 });
    if (stil.rand) for (const seite of [-1, 1]) b.box(0.08, 0.06, koerper, seite * (breit / 2 - 0.05), DACH_HOCH + 0.02, -start - koerper / 2, stil.rand);
    if (rampe) {
      const laenge = Math.hypot(rampe, DACH_HOCH);
      const winkel = Math.atan2(DACH_HOCH, rampe);
      b.box(breit, 0.14, laenge, 0, DACH_HOCH / 2 - 0.07, -rampe / 2, stil.rampe || [0xb08a58, 0xd8b078], { rx: winkel });
      // Unter der Rampe ist alles voll: Wie ein Keil aus Steinen
      const stufen = 7;
      for (let i = 0; i < stufen; i++) {
        const u = (i + 0.5) / stufen;
        const h = DACH_HOCH * u - 0.1;
        if (h > 0.05) b.box(breit - 0.04, h, rampe / stufen + 0.01, 0, h / 2, -rampe * u, [dunkel, steine[i % 3]]);
      }
      if (stil.rand) for (const seite of [-1, 1]) b.box(0.1, 0.07, laenge, seite * (breit / 2 - 0.05), DACH_HOCH / 2 + 0.03, -rampe / 2, stil.rand, { rx: winkel });
      // Leuchtende Pfeile zeigen: Hier geht es hoch
      for (let i = 0; i < 3; i++) {
        const u = 0.22 + i * 0.28;
        const y = DACH_HOCH * u + 0.03, w = -rampe * u;
        b.box(0.26, 0.03, 0.72, -0.25, y, w, stil.pfeil || 0xfff6c8, { ry: -0.75, rx: winkel });
        b.box(0.26, 0.03, 0.72, 0.25, y, w, stil.pfeil || 0xfff6c8, { ry: 0.75, rx: winkel });
      }
    }
  });
}

// Der Weg ist eine breite Fläche ohne Schienen. Nur kleine Punkte deuten die drei Spuren an.
function wegPunkte(b, farbe, r = 0.13, abstand = 3) {
  for (let z = -15 + abstand / 2; z < 15; z += abstand) {
    for (const x of [-SPUR / 2, SPUR / 2]) b.zyl(r, r, 0.04, x, 0.03, z, farbe, { seg: 8 });
  }
}
function pflaster(b, x0, x1, farben, anzahl, startwert, groesse = 1) {
  const z = wuerfel(startwert);
  for (let i = 0; i < anzahl; i++) {
    // Einfache Quader: Sie liegen flach am Boden, runde Kanten würde man nicht sehen, das Handy aber schon
    b.box(z.von(0.45, 0.95) * groesse, 0.05, z.von(0.35, 0.75) * groesse, z.von(x0, x1), 0.015, z.von(-14.6, 14.6), farben[i % farben.length], { ry: z.von(-0.3, 0.3) });
  }
}

const WELT_BAU = [
  // ------------------ 1. MORGENHAFEN ------------------
  {
    himmel: { oben: 0x6fa8e8, mitte: 0xf8b9a0, unten: 0xffdcb0, nebel: 0xffcfae, nebelVon: 70, nebelBis: 195 },
    licht: { hoch: 0xfff3e0, tief: 0xb07a8a, stark: 1.45, sonne: 0xfff0d0, sonneStark: 1.7 },
    himmelsBild: b => {
      b.rund(26, -80, 22, -310, 0xfff4c8, { seg: 20, seg2: 12 });
      for (const [x, y, z, s] of [[-180, 70, -300, 1.4], [60, 95, -320, 1], [190, 60, -300, 1.2], [-40, 125, -310, 0.8]]) {
        for (const [dx, dy, r] of [[0, 0, 18], [20, 3, 14], [-22, 2, 13], [40, -3, 9], [-40, -3, 9]]) b.rund(r * s, x + dx * s, y + dy * s, z, 0xfff1e6, { seg: 10, seg2: 6, s: [1.3, 0.62, 1] });
      }
      // Hügel und Stadt ganz hinten
      for (let i = -9; i < 10; i++) b.box(18 + (i * 7 % 13 + 13) % 13, 14 + (i * 13 % 21 + 21) % 21, 4, i * 26, 8, -318, [0xd89a8e, 0xe8b09a]);
    },
    boden: b => {
      // Links das Hafenbecken, rechts das Lagergelände, dazwischen ein breiter Kai aus Kopfsteinpflaster
      b.platte(-90, -8.4, -0.5, 15, -15, [0x2e8fb5, 0x2e8fb5]);
      for (let i = 0; i < 6; i++) b.box(5 + i % 3 * 3, 0.01, 0.24, -14 - i * 7, -0.44, 11 - i * 5, 0x9fe0ea);
      b.platte(-8.4, 90, -0.02, 15, -15, 0xa89a8a);
      b.box(0.5, 0.9, 30, -8.3, -0.3, 0, 0x6e5a4a);
      for (let z = -13; z <= 13; z += 5) b.zyl(0.28, 0.3, 1.2, -8.45, 0.05, z, 0x4e3b2a, { seg: 8 });
      b.platte(-4.2, 4.2, 0, 15, -15, 0xc9bba4);
      pflaster(b, -4, 4, [0xb6a890, 0xd8cab2, 0xbfb199, 0xa89a84], 120, 11);
      for (const sx of [-1, 1]) b.box(0.26, 0.12, 30, sx * 4.25, 0.03, 0, 0x7e7264);
      wegPunkte(b, 0xf2ece0);
    },
    deko: [
      { seite: 1, x: 12.5, schritt: [13, 20], formen: [
        b => { // Backstein-Speicher
          b.box(10, 13, 11, 5, 6.5, 0, [0x9c4a34, 0xb85a3e]);
          b.kegel(8.5, 4.5, 5, 15, 0, 0x4a5a6a, { seg: 4, ry: Math.PI / 4, s: [1, 1, 0.92] });
          fenster(b, -1, -0.03, 2.4, -4, 4, 3, 2.7, 3.6, 0x7fb6d0, 0xe8dcc8);
          b.box(0.2, 1.8, 9.8, -0.1, 11.5, 0, 0xe8dcc8);
          b.box(0.2, 3.2, 2.4, -0.05, 1.6, 4, 0x4e3322);
        },
        b => { // Bunter Speicher
          b.box(9, 10, 9, 4.5, 5, 0, [0x3f7a9a, 0x57a0c4]);
          fenster(b, -1, -0.03, 2.4, -3, 3, 2, 3, 3.6, 0xfff0b8, 0xf4f0e6);
          b.kegel(7.4, 3.4, 4.5, 11.7, 0, 0xa83c2c, { seg: 4, ry: Math.PI / 4 });
        },
        b => { // Roter Hafenkran
          b.box(0.5, 16, 0.5, 2, 8, -3, 0xd8402e);
          b.box(0.5, 16, 0.5, 2, 8, 3, 0xd8402e);
          b.box(0.5, 16, 0.5, 8, 8, -3, 0xd8402e);
          b.box(0.5, 16, 0.5, 8, 8, 3, 0xd8402e);
          for (let y = 3; y < 16; y += 4) { b.box(6.4, 0.3, 0.3, 5, y, -3, 0xb83020); b.box(6.4, 0.3, 0.3, 5, y, 3, 0xb83020); }
          b.box(7, 1.2, 7, 5, 16.5, 0, 0xf4c21a);
          b.box(22, 0.9, 0.9, -2, 18, 0, 0xd8402e);
          b.box(3, 2.2, 3, 6, 18.7, 0, 0xf4f0e6);
          b.box(0.1, 6, 0.1, -10, 15, 0, 0x2a2a30);
          b.box(3, 1.4, 1.6, -10, 11.6, 0, 0x2f7ad0);
        },
        b => { // Fässer-Pyramide und Fischernetz
          for (let reihe = 0; reihe < 3; reihe++) for (let i = 0; i < 4 - reihe; i++) {
            b.zyl(0.8, 0.8, 2.2, 2.4 + reihe * 0.85 + i * 1.7, 0.8 + reihe * 1.4, 0, [0x7a5228, 0xa87a42], { rx: Math.PI / 2, seg: 12 });
            b.ring(0.8, 0.05, 2.4 + reihe * 0.85 + i * 1.7, 0.8 + reihe * 1.4, 0.7, 0x2a2a2e, { seg: 5, seg2: 14 });
            b.ring(0.8, 0.05, 2.4 + reihe * 0.85 + i * 1.7, 0.8 + reihe * 1.4, -0.7, 0x2a2a2e, { seg: 5, seg2: 14 });
          }
          b.box(0.14, 5, 0.14, 0.7, 2.5, 2, 0x6e4a26);
          b.box(0.14, 5, 0.14, 0.7, 2.5, 5.5, 0x6e4a26);
          for (let y = 1.4; y < 5; y += 0.5) b.box(0.03, 0.03, 3.5, 0.7, y, 3.75, 0xe8dcb8);
          for (let w = 2.2; w < 5.5; w += 0.5) b.box(0.03, 3.6, 0.03, 0.7, 3.2, w, 0xe8dcb8);
        },
        b => { // Laterne und Poller
          b.zyl(0.1, 0.14, 5.4, 0, 2.7, 0, 0x26303a, { seg: 8 });
          b.box(1.4, 0.1, 0.1, -0.7, 5.4, 0, 0x26303a);
          b.rund(0.3, -1.4, 5.2, 0, 0xfff0a8);
          b.zyl(0.28, 0.36, 0.8, 2, 0.4, 3, 0x26303a, { seg: 10 });
          b.zyl(0.42, 0.42, 0.12, 2, 0.86, 3, 0x26303a, { seg: 10 });
        }
      ] },
      { seite: -1, x: 15, schritt: [20, 42], formen: [
        b => { // Fischkutter
          b.weich(4, 2.2, 11, 0, 0.6, 0, [0x24406e, 0x2f5ea0], { r: 0.6 });
          b.box(3.9, 0.3, 10.8, 0, 1.75, 0, 0xf4f0e6);
          b.weich(2.4, 2.2, 3, 0, 3, 1.5, 0xf4f0e6, { r: 0.2 });
          b.box(2.5, 0.8, 0.1, 0, 3.4, 0, 0x7fb6d0);
          b.zyl(0.1, 0.12, 6, 0, 5, -2, 0x6e4a26, { seg: 8 });
          b.box(3, 0.1, 0.1, 0, 6, -2, 0x6e4a26);
          b.kegel(0.8, 1.6, 0, 8.4, -2, 0xf0382e, { seg: 3, ry: 0.5, s: [1, 1, 0.1] });
        },
        b => { // Leuchtturm
          b.zyl(1.6, 2.6, 15, 0, 7, 0, [0xf4f0e6, 0xf4f0e6], { seg: 14 });
          for (const y of [3, 8.5]) b.zyl(2.25 - y * 0.06, 2.45 - y * 0.06, 2.6, 0, y, 0, 0xe0402e, { seg: 14 });
          b.zyl(2.1, 2.1, 0.3, 0, 14.6, 0, 0x26303a, { seg: 14 });
          b.zyl(1.1, 1.1, 1.8, 0, 15.6, 0, 0xfff4a8, { seg: 12 });
          b.kegel(1.4, 1.5, 0, 17.3, 0, 0xe0402e, { seg: 12 });
          b.zyl(4, 5, 1.6, 0, -0.2, 0, 0x7a6e62, { seg: 12 });
        },
        b => { // Boje
          b.kegel(0.9, 2.2, 0, 0.7, 0, 0xe8402e, { seg: 10 });
          b.zyl(1, 1, 0.3, 0, -0.3, 0, 0xf4f0e6, { seg: 12 });
          b.rund(0.2, 0, 2, 0, 0xfff4a8, { seg: 8, seg2: 6 });
        }
      ] }
    ],
    hindernis: {
      J: b => { // Kisten
        kisteForm(b, -0.62, 0, 0, 1.06);
        kisteForm(b, 0.55, 0, 0, 0.96);
        niedrigBasis(b);
      },
      S: b => hochBasis(b, 0x4a5563),
      W: b => { // Poller-Turm aus Kisten
        kisteForm(b, 0, 0, 0, 1.9, 0xc98f4e, 0x8e5e2a);
        kisteForm(b, 0.1, 1.9, 0.1, 1.5, 0x7d9fbc, 0x466a88);
      },
      fall: { // Gisela wirft Stiefel
        wurf: b => { b.weich(0.6, 1, 0.6, 0, 0.5, 0, [0x24303c, 0x3c4e60]); b.weich(0.66, 0.34, 1.1, 0, 0.17, -0.25, 0x24303c); }
      }
    },
    container: [
      { farbe: 0xb0a896, dunkel: 0x726c60, stein: 0x938b7c, oben: 0xc29a68, rampe: [0xa8824e, 0xd0a870] },
      { farbe: 0x9aa6a8, dunkel: 0x626c70, stein: 0x7f8c90, oben: 0xb08a58, rampe: [0xa8824e, 0xd0a870] }
    ],
    wasser: 0x9fe0ea
  },
  // ------------------ 2. STRANDPROMENADE ------------------
  {
    himmel: { oben: 0x3fa9f0, mitte: 0x9fdcf8, unten: 0xe8f6f4, nebel: 0xdff2f0, nebelVon: 75, nebelBis: 200 },
    licht: { hoch: 0xffffff, tief: 0xc8b890, stark: 1.55, sonne: 0xfffbe8, sonneStark: 1.8 },
    himmelsBild: b => {
      b.rund(20, 110, 150, -310, 0xfffbe0, { seg: 18, seg2: 12 });
      for (const [x, y, z, s] of [[-160, 95, -310, 1.3], [40, 120, -320, 0.9], [180, 80, -310, 1.1]]) {
        for (const [dx, dy, r] of [[0, 0, 18], [20, 3, 14], [-22, 2, 13], [40, -3, 9], [-40, -3, 9]]) b.rund(r * s, x + dx * s, y + dy * s, z, 0xffffff, { seg: 10, seg2: 6, s: [1.3, 0.62, 1] });
      }
      for (let i = -3; i < 1; i++) b.kegel(40 + i * 3, 30 + i * 3, -80 + i * 48, 10, -320, [0x8ac0b8, 0xa4d4c8], { seg: 7 });
    },
    boden: b => {
      b.platte(-95, -22, -0.5, 15, -15, 0x1fb5d0);
      b.platte(-30, -12, -0.45, 15, -15, 0x57d4dc);
      for (let i = 0; i < 6; i++) b.box(7, 0.01, 0.3, -30 - i * 7, -0.42, 11 - i * 5, 0xf0fbfa);
      b.platte(-22, 95, -0.12, 15, -15, 0xf0d898);
      for (let i = 0; i < 9; i++) b.rund(0.8, -19 + i * 5, -0.1, -13 + (i * 11) % 28, 0xe8cc88, { s: [1.3, 0.14, 1], seg: 8, seg2: 5 });
      // Ein Weg aus festem, hellem Sand mit Muscheln und Fußspuren
      b.platte(-4.2, 4.2, 0, 15, -15, 0xf6e2b4);
      pflaster(b, -4, 4, [0xecd6a2, 0xfbeac0], 46, 22, 1.5);
      const z = wuerfel(33);
      for (let i = 0; i < 14; i++) {
        const x = z.von(-3.8, 3.8), w = z.von(-14, 14);
        b.rund(0.14, x, 0.03, w, [0xf08aa0, 0x5ad0d8, 0xffc070][i % 3], { s: [1, 0.3, 0.8], seg: 8, seg2: 5 });
      }
      for (let i = 0; i < 6; i++) {
        const x = z.von(-3.5, 3.5), w = z.von(-13, 13);
        b.rund(0.14, x, 0.02, w, 0xdcc48e, { s: [0.7, 0.1, 1.2], seg: 8, seg2: 4 });
        b.rund(0.14, x + 0.3, 0.02, w - 0.7, 0xdcc48e, { s: [0.7, 0.1, 1.2], seg: 8, seg2: 4 });
      }
      for (const sx of [-1, 1]) for (let w = -13; w < 15; w += 4) { b.zyl(0.07, 0.09, 0.8, sx * 4.4, 0.4, w, 0xa87a48, { seg: 6 }); b.box(0.04, 0.04, 4, sx * 4.4, 0.72, w + 2, 0xf4efe0); }
      wegPunkte(b, 0xf0589a, 0.12);
    },
    deko: [
      { seite: 1, x: 9.5, schritt: [8, 13], formen: [
        b => { // Palme
          b.zyl(0.2, 0.38, 8, 0.6, 4, 0, [0x8a6238, 0xa87a48], { rz: -0.14, seg: 8 });
          for (let i = 0; i < 7; i++) {
            const w = i / 7 * Math.PI * 2;
            b.weich(4, 0.1, 1, 1.2 + Math.cos(w) * 1.7, 7.8 - 0.28, Math.sin(w) * 1.7, [0x2aa84a, 0x53d060], { ry: -w, rz: 0.42, r: 0.03, s: [1, 1, 1] });
          }
          b.rund(0.3, 1.1, 7.7, 0.3, 0x6e4a26, { seg: 8, seg2: 6 });
        },
        b => { // Strandkorb
          b.weich(2.2, 2.6, 1.6, 0, 1.3, 0, [0xefe2bc, 0xf8f0d8], { r: 0.3 });
          b.box(1.7, 1.7, 0.6, 0, 1.25, -0.7, 0x2f7ad0);
          for (const y of [0.6, 1.2, 1.8]) b.box(1.72, 0.2, 0.62, 0, y, -0.72, 0xf8f8f8);
          b.weich(2.3, 0.3, 2.2, 0, 0.1, -0.2, 0xd8bf90);
        },
        b => { // Sonnenschirm mit Handtuch
          b.zyl(0.05, 0.05, 3.2, 0, 1.6, 0, 0xf4f0e6, { seg: 6 });
          for (let i = 0; i < 8; i++) {
            const w = i / 8 * Math.PI * 2;
            b.kegel(0.95, 0.75, Math.cos(w) * 0.8, 3.1, Math.sin(w) * 0.8, i % 2 ? 0xffffff : 0xf0382e, { seg: 3, ry: -w + Math.PI / 2, rz: 0.5, rx: 0, s: [1, 1, 0.5] });
          }
          b.rund(0.2, 0, 3.4, 0, 0xfff4a8, { seg: 8, seg2: 6 });
          b.box(1.1, 0.04, 2.2, -1.2, 0.02, 0.6, 0x2fb8d0);
        },
        b => { // Eisbude
          b.weich(4, 3, 4, 2, 1.5, 0, [0x4ad0d0, 0x8af0e0], { r: 0.2 });
          for (let i = 0; i < 6; i++) b.box(0.74, 0.22, 4.2, 0.2 + i * 0.74, 3.2, 0, i % 2 ? 0xffffff : 0xf0589a);
          b.kegel(0.55, 1.2, -0.3, 4.6, 0, 0xe8b468, { seg: 8, rx: Math.PI });
          b.rund(0.6, -0.3, 5.3, 0, 0xf8a4c0, { seg: 10, seg2: 7 });
        },
        b => { // Wasserball-Stapel und Surfbrett
          b.weich(0.6, 4, 0.12, 0, 2, 0, [0xf0589a, 0xffd21f], { rx: -0.1, r: 0.05 });
          b.weich(0.6, 3.6, 0.12, 0.9, 1.8, 0, [0x3fa9f0, 0x52e0c8], { rx: -0.1, r: 0.05 });
        }
      ] },
      { seite: 1, x: 22, schritt: [26, 44], formen: [
        b => { // Kleines Hotel
          b.box(10, 12, 10, 5, 6, 0, [0xfff4d8, 0xfff8e8]);
          for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { b.box(0.1, 1.5, 1.5, 0, 2.2 + j * 3.6, -3 + i * 3, 0x2fa8d8); b.box(0.5, 0.15, 1.8, -0.2, 1.2 + j * 3.6, -3 + i * 3, 0xf0589a); }
          b.box(10.5, 0.5, 10.5, 5, 12.2, 0, 0xf0589a);
        },
        b => { // Riesenrad am Horizont
          b.ring(9, 0.24, 0, 11, 0, 0xf0589a, { ry: Math.PI / 2, seg: 6, seg2: 28 });
          for (let i = 0; i < 8; i++) {
            const w = i / 8 * Math.PI * 2;
            b.box(0.14, 18, 0.14, 0, 11, 0, 0xf4f4f8, { rx: w });
            b.weich(1, 1.1, 1.3, 0, 11 + Math.sin(w) * 9 - 0.5, Math.cos(w) * 9, [0xffd21f, 0xf0589a, 0x3fa9f0, 0x52e0c8][i % 4]);
          }
          b.box(0.4, 13, 0.4, 0, 5.5, 3, 0xd8dce4, { rx: 0.4 });
          b.box(0.4, 13, 0.4, 0, 5.5, -3, 0xd8dce4, { rx: -0.4 });
        }
      ] },
      { seite: -1, x: 9, schritt: [14, 24], formen: [
        b => { // Rettungsturm
          for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(0.15, 3.6, 0.15, x, 1.8, z, 0xf8f4ec);
          b.weich(2.6, 1.6, 2.6, 0, 4.2, 0, 0xf8f4ec, { r: 0.1 });
          b.box(2.7, 0.5, 2.7, 0, 3.7, 0, 0xf0382e);
          b.box(3.2, 0.2, 3.2, 0, 5.1, 0, 0xf0382e);
          b.box(0.05, 2.2, 0.05, 0, 6.2, 0, 0x26303a);
          b.box(1, 0.6, 0.05, 0.5, 7, 0, 0xf0382e);
        },
        b => { // Sandburg
          b.kegel(1.4, 1.2, 0, 0.5, 0, 0xe8cc88, { seg: 8 });
          for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { b.zyl(0.32, 0.36, 1, x, 0.5, z, 0xe8cc88, { seg: 8 }); b.kegel(0.4, 0.5, x, 1.25, z, 0xd8bc78, { seg: 8 }); }
          b.box(0.03, 0.8, 0.03, 0, 1.4, 0, 0x4a3a2a);
          b.box(0.4, 0.26, 0.02, 0.2, 1.68, 0, 0xf0382e);
        }
      ] },
      { seite: -1, x: 30, schritt: [30, 55], formen: [
        b => { // Segelboot draußen
          b.weich(1.4, 0.9, 5, 0, 0.1, 0, 0xf8f4ec, { r: 0.3 });
          b.box(0.1, 8, 0.1, 0, 4.4, 0, 0x6e4a26);
          b.kegel(1.8, 6.6, 0, 4.8, 1.1, 0xf0382e, { seg: 3, s: [0.08, 1, 1], ry: 0 });
        }
      ] }
    ],
    hindernis: {
      J: b => { // Sandburg-Mauer mit Warnband
        b.weich(2.2, 0.88, 0.9, 0, 0.44, 0, [0xd8bc78, 0xf0d898], { r: 0.1 });
        for (const x of [-0.8, 0, 0.8]) b.zyl(0.18, 0.22, 0.32, x, 0.98, 0, 0xf0d898, { seg: 8 });
        niedrigBasis(b);
      },
      S: b => { // Handtuch an der Wäscheleine
        hochBasis(b, 0xf4f0e6);
        b.box(0.8, 0.9, 0.05, -0.6, 2.2, 0, 0x2fb8d0);
        b.box(0.8, 1, 0.05, 0.5, 2.2, 0, 0xf0589a);
      },
      W: b => { // Riesige Eistüte
        b.kegel(0.8, 2.2, 0, 1.15, 0, [0xc88a42, 0xeec07a], { seg: 10, rx: Math.PI });
        b.rund(0.9, 0, 2.6, 0, 0xf8a4c0, { seg: 14, seg2: 9 });
        b.rund(0.62, 0.1, 3.25, -0.05, 0xfff2c8, { seg: 12, seg2: 8 });
        b.rund(0.18, 0.15, 3.82, -0.1, 0xe02a3a, { seg: 8, seg2: 6 });
      },
      fall: { wurf: b => { b.rund(0.55, 0, 0.5, 0, 0x8a5a26, { seg: 10, seg2: 7 }); b.box(0.7, 0.06, 0.7, 0, 0.8, 0, 0x2aa84a); } }
    },
    container: [
      { farbe: 0xf0d69a, dunkel: 0xc8a564, stein: 0xe0c07e, oben: 0x62d8d0, rampe: [0xc8a060, 0xf0d090] },
      { farbe: 0xf0d69a, dunkel: 0xc8a564, stein: 0xe0c07e, oben: 0xf88ba0, rampe: [0xc8a060, 0xf0d090] }
    ],
    wasser: 0xf0fbfa
  },
  // ------------------ 3. FISCHMARKT ------------------
  {
    himmel: { oben: 0x130b35, mitte: 0x2e1a5e, unten: 0x7a3c88, nebel: 0x44265f, nebelVon: 55, nebelBis: 170 },
    licht: { hoch: 0x9a8ae8, tief: 0x382a60, stark: 1.5, sonne: 0xffc8e0, sonneStark: 1.3 },
    himmelsBild: b => {
      b.rund(18, 70, 120, -310, 0xfff4d8, { seg: 18, seg2: 12 });
      b.rund(16, 62, 124, -304, 0x2e1a5e, { seg: 16, seg2: 10 });
      for (let i = 0; i < 60; i++) {
        const w = i * 2.399, r = 80 + (i * 37) % 240;
        b.box(0.9, 0.9, 0.9, Math.cos(w) * r, 60 + (i * 53) % 150, -300, 0xfff8e0);
      }
      for (let i = -9; i < 10; i++) b.box(20, 20 + (i * 13 % 25 + 25) % 25, 4, i * 28, 10, -318, [0x1a0f3a, 0x2c1a55]);
    },
    boden: b => {
      b.platte(-90, 90, -0.02, 15, -15, 0x352b5c);
      for (let i = 0; i < 16; i++) b.weich(1.2, 0.05, 0.8, ((i * 37) % 26) - 13 + (i % 2 ? 11 : -11), 0, -14 + i * 1.9, 0x46386e, { r: 0.02 });
      // Ein breiter Marktplatz aus Pflastersteinen
      b.platte(-4.2, 4.2, 0, 15, -15, 0x4c3e78);
      pflaster(b, -4, 4, [0x63548e, 0x6e5e9e, 0x58497f, 0x756aa8], 120, 44);
      for (const sx of [-1, 1]) b.box(0.2, 0.1, 30, sx * 4.25, 0.03, 0, 0x2c2256);
      wegPunkte(b, 0x35f0e0, 0.14);
    },
    deko: [
      { seite: 1, x: 8.6, schritt: [10, 16], formen: [
        b => { // Marktstand: Fisch
          for (const [x, z] of [[0, -2], [0, 2], [3, -2], [3, 2]]) b.box(0.14, 3.6, 0.14, x, 1.8, z, 0x6e4a26);
          for (let i = 0; i < 7; i++) b.box(3.5, 0.14, 0.72, 1.5, 3.65 + i * 0.05, -2.1 + i * 0.7, i % 2 ? 0xf4f0e6 : 0x3ad8c8, { rz: -0.14 });
          b.box(3, 1, 4, 1.5, 0.5, 0, 0x6e4a26);
          b.box(3.1, 0.14, 4.1, 1.5, 1.05, 0, 0xa8e0f0);
          for (let i = 0; i < 5; i++) { b.rund(0.3, 0.8 + (i % 2) * 1.2, 1.25, -1.4 + i * 0.7, i % 2 ? 0xff8a5a : 0x9ac8e8, { s: [0.5, 0.4, 1.3], seg: 8, seg2: 6 }); }
          b.rund(0.22, -0.05, 3.1, -1, 0xffa83a, { seg: 8, seg2: 6 });
          b.rund(0.22, -0.05, 3.1, 1, 0xffa83a, { seg: 8, seg2: 6 });
        },
        b => { // Holzhaus mit leuchtenden Fenstern
          b.box(8, 11, 8, 4, 5.5, 0, [0x2a2050, 0x40307a]);
          b.kegel(6.6, 3.4, 4, 12.7, 0, 0x1c1438, { seg: 4, ry: Math.PI / 4 });
          fenster(b, -1, -0.03, 2.4, -2.7, 3, 3, 2.7, 3.1, 0xffcf6a, 0x1c1438);
          b.box(0.2, 1.2, 6, -0.3, 10.2, 0, 0xf03aa0);
        },
        b => { // Neon-Riesenfisch als Schild
          b.box(0.3, 7, 0.3, 0, 3.5, 0, 0x26203e);
          b.rund(1.4, -0.2, 7.4, 0, 0xff4ab0, { s: [0.2, 0.9, 1.7] });
          b.kegel(1.1, 1.4, -0.2, 7.4, 2.8, 0x35f0e0, { seg: 3, rx: -Math.PI / 2, s: [0.2, 1, 1] });
          b.rund(0.24, -0.45, 7.7, -1.3, 0xffffff, { seg: 8, seg2: 6 });
          b.rund(0.12, -0.6, 7.7, -1.35, 0x121216, { seg: 6, seg2: 4 });
        },
        b => { // Kistenstapel Eis und Hummer
          kisteForm(b, 0, 0, 0, 1.3, 0x6e5a9c, 0x4a3a78);
          kisteForm(b, 1.4, 0, 0.2, 1.2, 0x6e5a9c, 0x4a3a78);
          kisteForm(b, 0.6, 1.3, 0, 1.1, 0x6e5a9c, 0x4a3a78);
          b.rund(0.4, 0.6, 2.7, 0, 0xf0442e, { s: [0.7, 0.5, 1.2] });
        }
      ] },
      { seite: -1, x: 8.6, schritt: [10, 16], formen: [
        b => { // Lichterkette
          b.box(0.14, 6.5, 0.14, 0, 3.25, 0, 0x26203e);
          b.box(0.1, 0.1, 14, 0, 6.5, -6, 0x26203e);
          for (let i = 0; i < 8; i++) b.rund(0.26, 0, 6.18 - Math.sin(i / 7 * Math.PI) * 0.8, -i * 1.8, [0xffc83a, 0xff5ab0, 0x35f0e0][i % 3], { seg: 8, seg2: 6 });
        },
        b => { // Marktstand Obst und Eis
          for (const [x, z] of [[0, -2], [0, 2], [3, -2], [3, 2]]) b.box(0.14, 3.6, 0.14, x, 1.8, z, 0x6e4a26);
          for (let i = 0; i < 7; i++) b.box(3.5, 0.14, 0.72, 1.5, 3.65 + i * 0.05, -2.1 + i * 0.7, i % 2 ? 0xf4f0e6 : 0xf0408a, { rz: -0.14 });
          b.box(3, 1, 4, 1.5, 0.5, 0, 0x6e4a26);
          for (let i = 0; i < 6; i++) b.rund(0.28, 0.8 + (i % 3) * 0.7, 1.25, -1.5 + i * 0.6, [0xf0442e, 0xffc83a, 0x53d060][i % 3], { seg: 8, seg2: 6 });
        },
        b => { // Haus
          b.box(9, 13, 9, 4.5, 6.5, 0, [0x1f1a48, 0x35286e]);
          fenster(b, -1, -0.03, 2.4, -3, 3, 3, 3, 3.3, 0xff8ac0, 0x1c1438);
          b.kegel(7.4, 3.8, 4.5, 15, 0, 0x1c1438, { seg: 4, ry: Math.PI / 4 });
        }
      ] }
    ],
    hindernis: {
      J: b => { // Eisgekühlte Fischkiste
        b.weich(2.2, 0.82, 0.9, 0, 0.41, 0, [0x4a3a78, 0x7a68b0], { r: 0.06 });
        for (let i = 0; i < 5; i++) b.rund(0.2, -0.8 + i * 0.4, 0.88, (i % 2) * 0.2 - 0.1, i % 2 ? 0xff8a5a : 0x9ac8e8, { s: [1.3, 0.5, 0.7], seg: 8, seg2: 6 });
        niedrigBasis(b);
      },
      S: b => { // Fischgirlande zwischen zwei Stangen
        hochBasis(b, 0x4a3a78);
        for (let i = 0; i < 4; i++) { b.box(0.03, 0.6, 0.03, -0.9 + i * 0.6, 2.05, 0, 0xc8c8d8); b.rund(0.18, -0.9 + i * 0.6, 2.42, 0, 0x9ac8e8, { s: [0.5, 0.9, 1], seg: 8, seg2: 6 }); }
      },
      W: b => { // Säule mit Neon-Riesenkrabbe
        b.weich(1.9, 3.1, 1.3, 0, 1.55, 0, [0x3a2a6a, 0x5a4a98], { r: 0.1 });
        b.box(1.95, 0.1, 1.35, 0, 0.9, 0, 0x35f0e0);
        b.box(1.95, 0.1, 1.35, 0, 2.4, 0, 0xff4ab0);
        b.rund(0.54, 0, 3.4, 0, 0xff5a3a, { s: [1.25, 0.72, 0.9] });
        for (const sx of [-1, 1]) { b.rund(0.18, sx * 0.25, 3.8, -0.15, 0xffffff, { seg: 8, seg2: 6 }); b.rund(0.09, sx * 0.25, 3.8, 0.0, 0x121216, { seg: 6, seg2: 4 }); }
      },
      laterne: b => { // Hängende Laterne, Unterkante bei 1.12
        b.box(0.05, 3, 0.05, 0, 4.1, 0, 0xc8c8d8);
        b.weich(1.6, 1.8, 1.6, 0, 2.05, 0, [0xff8a2a, 0xffd86a], { r: 0.4 });
        streifen(b, 1.7, 0.32, 0, 1.28, 0.75, 0xf03a2e, 0xf8f4ec, 6, 0.14);
        b.zyl(0.5, 0.5, 0.14, 0, 3.02, 0, 0x26203e, { seg: 10 });
        b.zyl(0.5, 0.5, 0.14, 0, 1.15, 0, 0x26203e, { seg: 10 });
      },
      fall: { wurf: b => { b.rund(0.6, 0, 0.42, 0, 0xfaf4e4, { s: [1.3, 0.7, 1.3], seg: 10, seg2: 7 }); b.rund(0.3, 0, 0.6, 0, 0xffc21a, { seg: 8, seg2: 6 }); } }
    },
    container: [
      { farbe: 0x6a5ab0, dunkel: 0x3a2e78, stein: 0x54479a, oben: 0x8a7ad0, rampe: [0x4a3a78, 0x7a68b0], rand: 0x35f0e0 },
      { farbe: 0x7a4aa0, dunkel: 0x48286e, stein: 0x643a8a, oben: 0xa868c8, rampe: [0x4a3a78, 0x7a68b0], rand: 0xff4ab0 }
    ],
    wasser: 0x46386e
  },
  // ------------------ 4. STURMSCHIFF ------------------
  {
    himmel: { oben: 0x162a38, mitte: 0x34545e, unten: 0x71907e, nebel: 0x4e6f6d, nebelVon: 45, nebelBis: 155 },
    licht: { hoch: 0xbfe0d8, tief: 0x263a3a, stark: 1.25, sonne: 0xd8f4e8, sonneStark: 1.15 },
    himmelsBild: b => {
      for (const [x, y, z, s] of [[-160, 75, -300, 1.8], [30, 105, -310, 1.6], [180, 62, -300, 1.9], [-40, 40, -300, 1.5], [110, 140, -310, 1.3], [-120, 150, -310, 1.2]]) {
        for (const [dx, dy, r] of [[0, 0, 18], [20, 3, 14], [-22, 2, 13], [40, -3, 9], [-40, -3, 9]]) b.rund(r * s, x + dx * s, y + dy * s, z, 0x1f3744, { seg: 10, seg2: 6, s: [1.3, 0.62, 1] });
      }
      for (let i = -9; i < 10; i++) b.kegel(26, 13 + (i * 7 % 10 + 10) % 10, i * 34, 0, -320, [0x2a4a4a, 0x466f6a], { seg: 5 });
    },
    boden: b => {
      b.platte(-95, -8.3, -2.4, 15, -15, 0x1b4a52);
      b.platte(8.3, 95, -2.4, 15, -15, 0x1b4a52);
      for (let i = 0; i < 8; i++) {
        const sx = i % 2 ? 1 : -1;
        b.rund(2.6, sx * (13 + i * 3), -2.5, -13 + i * 3.7, 0x2f6e72, { s: [2, 0.2, 0.9], seg: 8, seg2: 5 });
        b.box(5, 0.03, 0.2, sx * (13 + i * 3), -2.16, -13 + i * 3.7, 0xd8ecec);
      }
      // Das Deck: lange Planken in Laufrichtung, darauf nur Messingnägel als Spurhinweis
      b.platte(-8.3, 8.3, 0, 15, -15, 0x96784f);
      for (let x = -8; x < 8.5; x += 0.8) b.box(0.05, 0.03, 30, x, 0.015, 0, 0x5e4a30);
      const z = wuerfel(55);
      for (let i = 0; i < 26; i++) b.box(0.74, 0.02, z.von(1.5, 5), Math.round(z.von(-10, 10)) * 0.8 + 0.4, 0.012, z.von(-13, 13), i % 2 ? 0xa88a60 : 0x876a44);
      for (const sx of [-1, 1]) {
        b.box(0.4, 2.6, 30, sx * 8.4, -1.25, 0, 0x4a2a2a);
        b.box(0.4, 0.3, 30, sx * 8.4, 0.2, 0, 0xc8a66a);
        b.box(0.1, 0.1, 30, sx * 8.2, 1.3, 0, 0xc8a66a);
        for (let w = -13; w < 15; w += 4) b.box(0.1, 1.3, 0.1, sx * 8.2, 0.7, w, 0xc8a66a);
      }
      wegPunkte(b, 0xe4dcc8, 0.12);
    },
    deko: [
      { seite: 1, x: 6.3, schritt: [9, 18], formen: [
        b => { // Fässer und Taue
          b.zyl(0.5, 0.5, 1.2, 0, 0.6, 0, [0x6e4a26, 0x8e6a3a], { seg: 12 });
          b.ring(0.5, 0.04, 0, 0.3, 0, 0x2a2a2e, { rx: Math.PI / 2, seg: 5, seg2: 14 });
          b.ring(0.5, 0.04, 0, 0.9, 0, 0x2a2a2e, { rx: Math.PI / 2, seg: 5, seg2: 14 });
          b.zyl(0.44, 0.44, 1, 1.05, 0.5, 0.45, [0x6e4a26, 0x8e6a3a], { seg: 12 });
        },
        b => { // Rettungsboot
          b.weich(1.5, 0.7, 4, 0.4, 1.8, 0, [0xe8e0d0, 0xf8f4ec], { r: 0.25 });
          b.box(1.56, 0.12, 4.05, 0.4, 1.56, 0, 0xe0442e);
          for (const z of [-1.5, 1.5]) { b.box(0.12, 1.7, 0.12, 0.3, 0.85, z, 0x26303a); b.box(0.12, 1.7, 0.12, 1.1, 0.85, z, 0x26303a); }
        }
      ] },
      { seite: -1, x: 6.3, schritt: [11, 20], formen: [
        b => { // Ankerwinde
          b.zyl(0.5, 0.5, 1.5, 0, 0.8, 0, 0x45505e, { rz: Math.PI / 2, seg: 12 });
          b.box(1.8, 0.2, 1, 0, 0.1, 0, 0x26303a);
          b.ring(0.3, 0.1, -0.1, 0.8, 0, 0xc8a66a, { ry: Math.PI / 2, seg: 6, seg2: 14 });
        },
        b => { // Kajüte
          b.box(2.4, 3, 7, 0.6, 1.5, 0, [0x5a3a26, 0x7d5436]);
          for (const z of [-2, 0, 2]) { b.ring(0.45, 0.08, -0.63, 1.8, z, 0xc8a66a, { ry: Math.PI / 2, seg: 6, seg2: 14 }); b.zyl(0.4, 0.4, 0.05, -0.62, 1.8, z, 0xffe39a, { rz: Math.PI / 2, seg: 12 }); }
          b.box(2.8, 0.25, 7.4, 0.6, 3.1, 0, 0xa58a68);
        }
      ] },
      { seite: 1, x: 4.5, schritt: [55, 80], formen: [
        b => { // Mast mit zerfetztem Segel
          b.zyl(0.28, 0.4, 24, 5, 12, 0, 0x5a3a26, { seg: 10 });
          b.box(16, 0.26, 0.26, 0, 19, 0, 0x5a3a26);
          b.box(14, 8, 0.1, 0.5, 14.8, 0, [0xd8cca8, 0xe8dcb8]);
          b.kegel(2.5, 3.5, -3, 11.7, 0, 0x34545e, { seg: 3, s: [1, 1, 0.12] });
          b.kegel(2, 2.6, 4, 11.2, 0, 0x34545e, { seg: 3, s: [1, 1, 0.12] });
          b.box(7, 0.3, 0.3, 5, 24.2, 0, 0x5a3a26);
        }
      ] },
      { seite: -1, x: 25, schritt: [45, 70], formen: [
        b => { // Eisberg-Felsen im Meer
          b.kegel(7, 12, 0, 3, 0, [0x35525a, 0x5a7c7a], { seg: 5 });
          b.kegel(4, 8, 5, 1, 2, [0x2a464e, 0x4e6e6c], { seg: 5 });
        }
      ] }
    ],
    hindernis: {
      J: b => { // Seekisten und Tau
        b.zyl(0.45, 0.45, 2.2, 0, 0.45, 0, [0x6e4a26, 0x9a7040], { rz: Math.PI / 2, seg: 12 });
        for (const x of [-0.7, 0, 0.7]) b.ring(0.47, 0.05, x, 0.45, 0, 0xc8a66a, { ry: Math.PI / 2, seg: 5, seg2: 14 });
        niedrigBasis(b);
      },
      S: b => { // Tiefhängendes Segel an einer Spiere
        hochBasis(b, 0x4e3a26);
        b.zyl(0.1, 0.1, 2.6, 0, 3, 0, 0x5a3a26, { rz: Math.PI / 2, seg: 8 });
        b.box(2.2, 0.9, 0.04, 0, 2.3, 0, 0xe8dcb8);
      },
      W: b => { // Eine Kanone auf Lafette
        b.weich(2, 1, 2, 0, 0.5, 0, [0x5a3a26, 0x7d5436], { r: 0.1 });
        b.zyl(0.42, 0.6, 2.7, 0, 1.5, 0.2, [0x26262e, 0x3c3c46], { rx: Math.PI / 2 + 0.3, seg: 12 });
        b.rund(0.4, 0, 2.4, 0.5, 0x1c1c22, { seg: 10, seg2: 6 });
        kisteForm(b, 0, 1.0, 0, 1.2, 0x8a7050, 0x5a4830);
        b.zyl(0.6, 0.6, 0.2, -1.1, 0.6, 0.6, 0x4e3a26, { rz: Math.PI / 2 });
        b.zyl(0.6, 0.6, 0.2, 1.1, 0.6, 0.6, 0x4e3a26, { rz: Math.PI / 2 });
      },
      welle: b => { // Eine Wand aus Wasser über alle Spuren
        for (let i = -3; i <= 3; i++) {
          const x = i * 1.25;
          b.rund(1.1, x, 0.3, 0, [0x1f7f8c, 0x56c0c8], { s: [1.05, 0.75, 0.6], seg: 12, seg2: 8 });
          b.rund(0.42, x + 0.3, 1.0, -0.05, 0xf4fbfb, { s: [1.2, 0.5, 0.7], seg: 8, seg2: 5 });
        }
        for (let i = -3; i <= 3; i++) b.box(1.3, 0.1, 0.08, i * 1.25, 0.9, 0.56, i % 2 ? 0xf2c21a : 0x1c1c22);
      },
      fall: {
        blitz: b => { // Rauchender Fleck nach dem Blitz
          b.rund(0.9, 0, 0.32, 0, 0x26262e, { s: [1.1, 0.34, 1.1], seg: 12, seg2: 6 });
          b.kegel(0.34, 1.1, -0.2, 0.55, 0, 0xffe45a, { seg: 6 });
          b.kegel(0.26, 0.8, 0.28, 0.42, 0.1, 0xff8a2a, { seg: 6 });
        },
        wurf: b => { b.zyl(0.5, 0.5, 0.9, 0, 0.45, 0, [0x6e4a26, 0x9a7040], { seg: 12 }); b.rund(0.42, 0, 1, 0, 0x7fd0e0, { s: [1, 0.3, 1], seg: 10, seg2: 6 }); }
      }
    },
    container: [
      { farbe: 0x8e6a3a, dunkel: 0x5a4024, stein: 0x745430, oben: 0xc8a06a, rampe: [0x8e6a3a, 0xc8a06a] },
      { farbe: 0x7a6a58, dunkel: 0x4a4034, stein: 0x625444, oben: 0xb89464, rampe: [0x8e6a3a, 0xc8a06a] }
    ],
    wasser: 0xd8ecec
  },
  // ------------------ 5. MONDHAFEN ------------------
  {
    himmel: { oben: 0x04030f, mitte: 0x0d0a26, unten: 0x25205a, nebel: 0x1b173f, nebelVon: 70, nebelBis: 195 },
    licht: { hoch: 0xbfc8ff, tief: 0x2a2a58, stark: 1.3, sonne: 0xffffff, sonneStark: 1.7 },
    himmelsBild: b => {
      // Die Erde!
      b.rund(38, -110, 105, -310, [0x2a70e0, 0x4aa8f8], { seg: 22, seg2: 14 });
      for (const [x, y, r] of [[-125, 120, 14], [-92, 93, 11], [-120, 83, 8], [-80, 127, 8]]) b.rund(r, x, y, -276, 0x4ec07a, { s: [1.3, 0.8, 0.6], seg: 10, seg2: 6 });
      for (const [x, y, r] of [[-132, 97, 9], [-100, 117, 7], [-84, 107, 6]]) b.rund(r, x, y, -272, 0xf8fafe, { s: [1.5, 0.4, 0.5], seg: 10, seg2: 6 });
      for (let i = 0; i < 130; i++) {
        const w = i * 2.399, r = 30 + (i * 37) % 320;
        const g = i % 5 === 0 ? 1.5 : 0.8;
        b.box(g, g, g, Math.cos(w) * r, 20 + (i * 53) % 220, -300, 0xffffff);
      }
      for (let i = -8; i < 9; i++) b.kegel(40, 20 + (i * 9 % 14 + 14) % 14, i * 42, 0, -320, [0x3a3858, 0x585678], { seg: 6 });
    },
    boden: b => {
      b.platte(-95, 95, -0.05, 15, -15, 0x8a889c);
      for (let i = 0; i < 12; i++) {
        const sx = i % 2 ? 1 : -1, x = sx * (11 + (i * 17) % 40), z = -13 + i * 2.3, r = 1 + (i % 4) * 0.8;
        b.ring(r, 0.25, x, -0.05, z, 0xa4a2b6, { rx: Math.PI / 2, s: [1, 1, 0.5], seg: 6, seg2: 14 });
        b.rund(r * 0.9, x, -0.12, z, 0x6a687e, { s: [1, 0.06, 1], seg: 12, seg2: 4 });
      }
      // Ein festgetretener Pfad im Mondstaub mit leuchtenden Punkten
      b.platte(-4.2, 4.2, 0, 15, -15, 0x5e5c78);
      pflaster(b, -4, 4, [0x6e6c8a, 0x535170, 0x7a7896], 70, 66, 1.3);
      wegPunkte(b, 0x4ae0ff, 0.15);
    },
    deko: [
      { seite: 1, x: 9, schritt: [14, 24], formen: [
        b => { // Kuppel
          b.setze(new THREE.SphereGeometry(5, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), [0xc8d0e8, 0xecf0fa], 5, 0, 0);
          b.ring(5, 0.2, 5, 0.1, 0, 0x4ae0ff, { rx: Math.PI / 2, seg: 6, seg2: 28 });
          for (let i = 0; i < 4; i++) b.rund(0.5, 0.3 + i * 0.2, 1.2 + i * 0.9, -3 + i * 2, 0xffd86a, { seg: 8, seg2: 6 });
        },
        b => { // Rakete auf Startrampe
          b.zyl(1, 1.5, 7, 3, 5, 0, [0xecf0fa, 0xffffff], { seg: 14 });
          b.kegel(1, 2.6, 3, 9.8, 0, 0xf0382e, { seg: 14 });
          b.ring(0.55, 0.13, 3, 6, -1.14, 0x4e5a78, { seg: 6, seg2: 14 });
          b.zyl(0.5, 0.5, 0.06, 3, 6, -1.14, 0x7fd8ff, { rx: Math.PI / 2 });
          for (let i = 0; i < 3; i++) { const w = i / 3 * Math.PI * 2; b.kegel(1, 2.2, 3 + Math.cos(w) * 1.6, 1.5, Math.sin(w) * 1.6, 0xf0382e, { seg: 3, s: [0.14, 1, 1], ry: -w }); }
          b.box(1.2, 10, 1.2, 6.8, 5, 0, 0x4e5a78);
        },
        b => { // Parabolantenne
          b.box(0.4, 4, 0.4, 0, 2, 0, 0x8a96b0);
          b.setze(new THREE.SphereGeometry(2.4, 16, 6, 0, Math.PI * 2, 0, Math.PI * 0.4), 0xecf0fa, 0, 5.2, 0, { rx: 0.9, rz: 0.4, s: [1, 0.6, 1] });
          b.rund(0.2, -0.7, 5.8, -1.5, 0xff4a4a, { seg: 8, seg2: 6 });
        },
        b => { // Mondfrachter
          b.weich(6, 3, 9, 4, 2, 0, [0x5a6088, 0x8a96c0], { r: 0.4 });
          for (const z of [-3, 3]) for (const x of [1.5, 6.5]) b.zyl(0.35, 0.35, 1.4, x, 0.7, z, 0x26263a);
          b.box(0.1, 0.5, 5, 0.9, 2.4, 0, 0x4ae0ff);
        }
      ] },
      { seite: -1, x: 10, schritt: [16, 28], formen: [
        b => { // Mondfelsen
          b.kegel(2.2, 4.4, 0, 1.5, 0, [0x6a687e, 0xa4a2b6], { seg: 6 });
          b.kegel(1.3, 2.4, 1.8, 0.8, 0.8, [0x6a687e, 0xa4a2b6], { seg: 6 });
        },
        b => { // Astronaut winkt mit Flagge
          b.weich(0.7, 0.9, 0.5, 0, 1.35, 0, 0xf4f4f8);
          b.rund(0.42, 0, 2.1, 0, 0xf4f4f8);
          b.rund(0.3, 0.05, 2.1, -0.2, 0xffc21a, { seg: 10, seg2: 6 });
          b.weich(0.26, 0.9, 0.3, -0.18, 0.5, 0, 0xf4f4f8);
          b.weich(0.26, 0.9, 0.3, 0.18, 0.5, 0, 0xf4f4f8);
          b.box(0.06, 3, 0.06, 1, 1.5, 0, 0xc8d0e8);
          b.box(1.2, 0.7, 0.03, 1.6, 2.6, 0, 0xf2b84b);
        },
        b => { // Riesenkrater-Rand
          b.ring(6, 0.8, 5, 0, 0, 0xa4a2b6, { rx: Math.PI / 2, s: [1, 1, 0.8], seg: 8, seg2: 18 });
        },
        b => { // Glühende Lichter
          b.zyl(0.1, 0.14, 5, 0, 2.5, 0, 0x4e5a78, { seg: 8 });
          b.rund(0.34, 0, 5.2, 0, 0x4ae0ff, { seg: 10, seg2: 7 });
        }
      ] }
    ],
    hindernis: {
      J: b => { // Flacher Roboter mit Laserzaun
        b.box(0.12, 1, 0.12, -1.1, 0.5, 0, 0x8a96b0);
        b.box(0.12, 1, 0.12, 1.1, 0.5, 0, 0x8a96b0);
        b.weich(2.2, 0.56, 0.7, 0, 0.32, 0, [0x4e5a78, 0x8a96c0], { r: 0.1 });
        niedrigBasis(b);
      },
      S: b => { // Laserschranke
        hochBasis(b, 0x4e5a78);
        for (const y of [1.9, 2.3, 2.7]) b.box(2.2, 0.08, 0.08, 0, y, 0, 0xff4ab0);
      },
      W: b => { // Fracht-Kapsel
        b.zyl(0.95, 0.95, 2.4, 0, 1.2, 0, [0xc8d0e8, 0xf4f6fc], { seg: 16 });
        b.setze(new THREE.SphereGeometry(0.95, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xf4f6fc, 0, 2.4, 0);
        b.ring(0.96, 0.05, 0, 1.2, 0, 0xf0382e, { rx: Math.PI / 2, seg: 6, seg2: 18 });
        b.ring(0.96, 0.05, 0, 2.2, 0, 0x4ae0ff, { rx: Math.PI / 2, seg: 6, seg2: 18 });
      },
      fall: {
        meteor: b => {
          b.rund(0.82, 0, 0.42, 0, [0x4a3a3a, 0x7a5a4a], { seg: 8, seg2: 5, s: [1.1, 0.62, 1.1] });
          b.rund(0.3, 0.3, 0.74, 0, 0xff8a2a, { seg: 6, seg2: 4 });
          b.rund(0.2, -0.3, 0.68, -0.2, 0xffd21f, { seg: 6, seg2: 4 });
        },
        wurf: b => { b.weich(1, 0.82, 1, 0, 0.41, 0, 0xc8d0e8); b.box(1.02, 0.1, 1.02, 0, 0.5, 0, 0xf0382e); }
      }
    },
    container: [
      { farbe: 0xa8a6ba, dunkel: 0x68667c, stein: 0x8a889e, oben: 0x4e5a78, rampe: [0x4e5a78, 0x8a96c0], rand: 0x4ae0ff, pfeil: 0x8af0ff },
      { farbe: 0x9c98c0, dunkel: 0x5e5a84, stein: 0x7c78a4, oben: 0x4e5a78, rampe: [0x4e5a78, 0x8a96c0], rand: 0x4ae0ff, pfeil: 0x8af0ff }
    ],
    wasser: 0xa4a2b6
  }
];

// Sachen, die in mehreren Welten gleich sind
const KUGEL_FARBEN = [[0x7a746a, 0xb0a898], [0xb8945c, 0xe4c88c], [0x54488a, 0x8a7cc0], [0x4e5e4a, 0x8a9a78], [0x6a6880, 0xb4b2c8]];
const KUGEL_R = 1.3;

const GEMEINSAM = {
  kugel: w => bau(b => { // Die große Steinkugel rollt auf dich zu. Sie ist schlecht gelaunt.
    const [dunkel, hell] = KUGEL_FARBEN[w];
    b.rund(KUGEL_R, 0, 0, 0, [dunkel, hell], { seg: 18, seg2: 12 });
    // Rillen rundherum, damit man das Rollen gut sieht
    for (const [rx, ry] of [[0, Math.PI / 2], [0, Math.PI / 2 + 1.05], [0, Math.PI / 2 - 1.05]]) b.ring(KUGEL_R - 0.01, 0.05, 0, 0, 0, dunkel, { rx, ry, seg: 5, seg2: 26 });
    const z = wuerfel(77 + w);
    for (let i = 0; i < 10; i++) {
      const u = z.von(0, Math.PI * 2), v = z.von(-1.2, 1.2);
      const x = Math.cos(u) * Math.cos(v), y = Math.sin(v), t = Math.sin(u) * Math.cos(v);
      b.rund(z.von(0.18, 0.34), x * KUGEL_R, y * KUGEL_R, t * KUGEL_R, i % 2 ? dunkel : hell, { seg: 7, seg2: 5, s: [1, 1, 1] });
    }
    // Ein böses Gesicht, zweimal, damit es beim Rollen immer wieder auftaucht
    for (const seite of [1, -1]) {
      const v = seite * 1.26;
      for (const sx of [-1, 1]) {
        b.rund(0.17, sx * 0.42, 0.22 * seite, v - seite * 0.1, 0x201c20, { seg: 8, seg2: 6 });
        b.box(0.5, 0.11, 0.14, sx * 0.42, 0.5 * seite, v - seite * 0.14, 0x201c20, { rz: sx * -0.4 * seite });
      }
      b.box(0.8, 0.14, 0.14, 0, -0.42 * seite, v - seite * 0.08, 0x201c20);
      for (let i = -1; i <= 1; i++) b.box(0.16, 0.13, 0.14, i * 0.26, -0.33 * seite, v - seite * 0.03, 0xe8e4d8);
    }
  }),
  B: () => bau(b => { // Wasserball
    const f = [0xf0382e, 0xffffff, 0xffd21f, 0xffffff, 0x2f7ad0, 0xffffff];
    for (let i = 0; i < 6; i++) b.setze(new THREE.SphereGeometry(0.6, 8, 12, i / 6 * Math.PI * 2, Math.PI * 2 / 6), f[i], 0, 0, 0);
  }),
  schleuder: () => bau(b => { // Riesiger Schwimmring als Sprungfeder
    for (let i = 0; i < 12; i++) {
      const w = (i / 12) * Math.PI * 2;
      b.rund(0.44, Math.cos(w) * 0.82, 0.26, Math.sin(w) * 0.82, i % 2 ? 0xffffff : 0xf03a9a, { seg: 10, seg2: 7, s: [1, 0.7, 1] });
    }
    b.zyl(0.75, 0.75, 0.1, 0, 0.3, 0, 0x4ad8ff, { seg: 18 });
    for (let i = 0; i < 2; i++) {
      const z = -0.25 + i * 0.5;
      b.box(0.3, 0.02, 0.5, 0, 0.36, z, 0xffffff);
      b.box(0.3, 0.02, 0.4, -0.14, 0.36, z - 0.2, 0xffffff, { ry: -0.7 });
      b.box(0.3, 0.02, 0.4, 0.14, 0.36, z - 0.2, 0xffffff, { ry: 0.7 });
    }
  }),
  oel: () => bau(b => {
    for (const [x, z, r] of [[0, 0, 1.05], [-0.5, 0.7, 0.55], [0.6, -0.6, 0.6], [0.4, 0.8, 0.4]]) b.rund(r, x, 0.03, z, 0x2ae0a8, { s: [1, 0.03, 1], seg: 14, seg2: 5 });
    b.rund(0.22, -0.3, 0.1, 0.1, 0xc8fff0, { s: [1.3, 0.1, 0.8], seg: 8, seg2: 4 });
    // Fischgräte
    b.box(0.05, 0.03, 0.9, 0.2, 0.08, -0.05, 0xf4f4f0);
    for (let i = 0; i < 3; i++) b.box(0.3, 0.03, 0.04, 0.2, 0.08, -0.3 + i * 0.25, 0xf4f4f0);
  }),
  warnring: () => { // Roter Ring, der warnt
    return new THREE.RingGeometry(0.72, 1.04, 28);
  }
};

// Thumbnails für Hilfe-Fenster: Dieselben Formen nur kleiner
function formFuerRegel(art) {
  if (art === 'J') return bau(WELT_BAU[0].hindernis.J);
  if (art === 'S') return bau(WELT_BAU[0].hindernis.S);
  if (art === 'W') return bau(WELT_BAU[0].hindernis.W);
  if (art === 'M') return GEMEINSAM.kugel(0);
  if (art === 'C') { const stil = WELT_BAU[0].container[0]; const g = baueContainer(14, 7, stil.farbe, stil.dunkel, stil); g.translate(0, 0, 7); return g; }
  return null;
}
