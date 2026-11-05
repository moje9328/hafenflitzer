// --------------------------- 3D-Bild ---------------------------

let grafikBereit = false;
let renderer, szene, kamera, licht, sonne, himmelGruppe, himmelKugel, himmelBild;
const KRUMM = { value: new THREE.Vector2(0, 0) };
let MAT, MAT_KONTUR, MAT_LEUCHT, MAT_GLAS, MAT_WARN, MAT_SCHATTEN;
let muenzenMesh, funkenPunkte, wetterPunkte;
let spieler = null;     // Die Figur im Bild
let spielerName = '';
let weltJetzt = -1;
let weltFormen = null;
let bildGroesse = { b: 1, h: 1, hoch: false };
let bildQualitaet = 1;
let wackeln = 0;
let blitzHell = 0;
let bildZeit = 0;
let giselaBild = null;
let kamX = 0, kamY = 0, kamDrehung = 0;

// Biegt die Welt in die Ferne: Die Strecke macht sanfte Kurven und verschwindet hinter dem Horizont
function biege(m) {
  m.onBeforeCompile = s => {
    s.uniforms.uKrumm = KRUMM;
    s.vertexShader = 'uniform vec2 uKrumm;\n' + s.vertexShader.replace('#include <project_vertex>',
      THREE.ShaderChunk.project_vertex.replace('gl_Position = projectionMatrix * mvPosition;',
        'float tiefe = mvPosition.z; mvPosition.x += tiefe * tiefe * uKrumm.x; mvPosition.y += tiefe * tiefe * uKrumm.y; gl_Position = projectionMatrix * mvPosition;'));
  };
  return m;
}

function grafikStart() {
  const leinwand = $('bild');
  try {
    renderer = new THREE.WebGLRenderer({ canvas: leinwand, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (fehler) {
    return false;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  szene = new THREE.Scene();
  szene.fog = new THREE.Fog(0xffffff, 60, 190);
  kamera = new THREE.PerspectiveCamera(60, 1, 0.3, 700);
  szene.add(kamera);

  const stufen = new THREE.DataTexture(new Uint8Array([120, 195, 255]), 3, 1, THREE.RedFormat);
  stufen.minFilter = stufen.magFilter = THREE.NearestFilter;
  stufen.needsUpdate = true;
  MAT = biege(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: stufen }));
  MAT_LEUCHT = biege(new THREE.MeshBasicMaterial({ vertexColors: true }));
  MAT_GLAS = biege(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.24, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  MAT_WARN = biege(new THREE.MeshBasicMaterial({ color: 0xff2a1e, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
  MAT_SCHATTEN = biege(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
  // Schwarzer Rand um die Figuren: Eine etwas größere Hülle, von innen gesehen
  MAT_KONTUR = new THREE.MeshBasicMaterial({ color: 0x17151c, side: THREE.BackSide, fog: false });
  MAT_KONTUR.onBeforeCompile = s => {
    s.uniforms.uKrumm = KRUMM;
    s.vertexShader = 'uniform vec2 uKrumm;\n' + s.vertexShader
      .replace('#include <begin_vertex>', 'vec3 transformed = position + normal * 0.022;')
      .replace('#include <project_vertex>', THREE.ShaderChunk.project_vertex.replace('gl_Position = projectionMatrix * mvPosition;',
        'float tiefe = mvPosition.z; mvPosition.x += tiefe * tiefe * uKrumm.x; mvPosition.y += tiefe * tiefe * uKrumm.y; gl_Position = projectionMatrix * mvPosition;'));
  };

  licht = new THREE.HemisphereLight(0xffffff, 0x888888, 1.4);
  sonne = new THREE.DirectionalLight(0xffffff, 1.6);
  sonne.position.set(5, 11, 6);
  szene.add(licht, sonne);

  // Der Himmel hängt an der Kamera
  himmelGruppe = new THREE.Group();
  const kugelForm = new THREE.SphereGeometry(420, 24, 16);
  kugelForm.setAttribute('color', new THREE.BufferAttribute(new Float32Array(kugelForm.attributes.position.count * 3), 3));
  himmelKugel = new THREE.Mesh(kugelForm, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  himmelKugel.renderOrder = -10;
  himmelGruppe.add(himmelKugel);
  szene.add(himmelGruppe);

  // Münzen: viele auf einmal in einem einzigen Zeichen-Auftrag
  muenzenMesh = new THREE.InstancedMesh(MUENZE_FORM(), MAT_LEUCHT, 260);
  muenzenMesh.frustumCulled = false;
  muenzenMesh.count = 0;
  szene.add(muenzenMesh);

  baueSchatten();
  baueFunken();
  baueWetter();
  grafikBereit = true;
  passeGroesseAn();
  return true;
}

// --------------------------- Einzelteile im Bild verwalten ---------------------------

const lager = new Map();      // Formen merken, damit sie nur einmal gebaut werden
const frei = new Map();       // Unbenutzte Meshes pro Form
const aktive = new Set();     // Was gerade im Bild ist

function formVon(schluessel, machen) {
  if (!lager.has(schluessel)) lager.set(schluessel, machen());
  return lager.get(schluessel);
}

function holeMesh(schluessel, machen, material = MAT) {
  const f = frei.get(schluessel);
  let m;
  if (f && f.length) m = f.pop();
  else {
    m = new THREE.Mesh(formVon(schluessel, machen), material);
    m.frustumCulled = false;
    m.userData.schluessel = schluessel;
    szene.add(m);
  }
  m.visible = true;
  m.rotation.set(0, 0, 0);
  m.scale.set(1, 1, 1);
  aktive.add(m);
  return m;
}

function gibFrei(m) {
  if (!m) return;
  m.visible = false;
  aktive.delete(m);
  const k = m.userData.schluessel;
  if (!frei.has(k)) frei.set(k, []);
  frei.get(k).push(m);
}

function alleFrei() {
  for (const m of Array.from(aktive)) gibFrei(m);
  bodenListe.length = 0;
  dekoListe.length = 0;
  dekoNaechste = {};
  teilCursor = 0;
  sichtbareTeile.clear();
  sichtbareHilfen.clear();
  sichtbareBoegen.clear();
}

// --------------------------- Welt anziehen ---------------------------

function faerbeHimmel(w) {
  const h = WELT_BAU[w].himmel;
  const form = himmelKugel.geometry;
  const pos = form.attributes.position, col = form.attributes.color;
  const oben = new THREE.Color(h.oben), mitte = new THREE.Color(h.mitte), unten = new THREE.Color(h.unten);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const u = begrenzt(pos.getY(i) / 420, -0.1, 1);
    if (u < 0.18) c.copy(unten).lerp(mitte, Math.max(0, u) / 0.18);
    else c.copy(mitte).lerp(oben, (u - 0.18) / 0.5 > 1 ? 1 : (u - 0.18) / 0.5);
    col.setXYZ(i, c.r, c.g, c.b);
  }
  col.needsUpdate = true;
}

function zieheWeltAn(w) {
  if (!grafikBereit) return;
  weltJetzt = w;
  const W = WELT_BAU[w];
  const h = W.himmel;
  szene.fog.color.set(h.nebel);
  szene.fog.near = h.nebelVon;
  szene.fog.far = h.nebelBis;
  licht.color.set(W.licht.hoch);
  licht.groundColor.set(W.licht.tief);
  licht.intensity = W.licht.stark;
  sonne.color.set(W.licht.sonne);
  sonne.intensity = W.licht.sonneStark;
  faerbeHimmel(w);
  if (himmelBild) himmelGruppe.remove(himmelBild);
  himmelBild = new THREE.Mesh(formVon('himmel' + w, () => bau(W.himmelsBild)), MAT_HIMMEL());
  himmelBild.frustumCulled = false;
  himmelBild.renderOrder = -9;
  himmelGruppe.add(himmelBild);
  zeigeWetter(w);
}

let _matHimmel = null;
function MAT_HIMMEL() {
  if (!_matHimmel) _matHimmel = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, depthWrite: false });
  return _matHimmel;
}

// --------------------------- Boden und Umgebung ---------------------------

const bodenListe = [];
const BODEN_L = 30;

function pflegeBoden() {
  const dist = s.dist;
  // Boden ab dem Stück, das gerade hinter uns liegt, bis weit nach vorne
  const startNr = Math.floor(dist / BODEN_L) - 1;
  for (let i = bodenListe.length - 1; i >= 0; i--) {
    const m = bodenListe[i];
    if (m.userData.nr < startNr) { gibFrei(m); bodenListe.splice(i, 1); }
  }
  for (let nr = startNr; nr <= startNr + 8; nr++) {
    if (bodenListe.some(m => m.userData.nr === nr)) continue;
    const w = weltJetzt;
    const m = holeMesh('boden' + w, () => bau(WELT_BAU[w].boden));
    m.userData.nr = nr;
    bodenListe.push(m);
  }
  for (const m of bodenListe) m.position.set(0, 0, -(m.userData.nr * BODEN_L + BODEN_L / 2 - dist));
}

const dekoListe = [];
let dekoNaechste = {};
let dekoZufall = wuerfel(12345);

function pflegeDeko() {
  const dist = s.dist;
  const w = weltJetzt;
  const reihen = WELT_BAU[w].deko;
  reihen.forEach((reihe, i) => {
    const schl = w + ':' + i;
    if (dekoNaechste[schl] === undefined) dekoNaechste[schl] = dist - 20 + dekoZufall() * 10;
    while (dekoNaechste[schl] < dist + 190) {
      const f = Math.floor(dekoZufall() * reihe.formen.length);
      const m = holeMesh('deko' + w + '_' + i + '_' + f, () => bau(reihe.formen[f]));
      m.position.x = reihe.seite * reihe.x;
      m.position.y = 0;
      // Die Häuser schauen immer zur Strecke, also wird die rechte Seite einfach gedreht
      if (reihe.seite < 0) m.rotation.y = Math.PI;
      m.userData.d = dekoNaechste[schl];
      dekoListe.push(m);
      dekoNaechste[schl] += reihe.schritt[0] + dekoZufall() * (reihe.schritt[1] - reihe.schritt[0]);
    }
  });
  for (let i = dekoListe.length - 1; i >= 0; i--) {
    const m = dekoListe[i];
    if (m.userData.d < dist - 14) { gibFrei(m); dekoListe.splice(i, 1); continue; }
    m.position.z = -(m.userData.d - dist);
  }
}

// --------------------------- Hindernisse, Münzen, Hilfen im Bild ---------------------------

let teilCursor = 0;
const sichtbareTeile = new Map();
const sichtbareHilfen = new Map();
const sichtbareBoegen = new Map();

function hindernisForm(o) {
  const w = weltJetzt;
  const W = WELT_BAU[w];
  if (o.art === 'C') {
    const nr = (Math.floor(o.d * 7.3) + o.spur) % W.container.length;
    const stil = W.container[Math.abs(nr)];
    const schl = 'c' + w + '_' + nr + '_' + o.lang + '_' + o.rampe;
    return [schl, () => baueContainer(o.lang, o.rampe, stil.farbe, stil.dunkel, stil)];
  }
  if (o.art === 'F') {
    const skin = o.skin || 'wurf';
    const f = W.hindernis.fall[skin] || W.hindernis.fall.wurf;
    return ['f' + w + skin, () => bau(f)];
  }
  if (o.art === 'M') return ['kugel' + w, () => GEMEINSAM.kugel(w)];
  if (o.art === 'B') return ['ball', GEMEINSAM.B];
  if (o.art === 'L') return ['lat', () => bau(WELT_BAU[2].hindernis.laterne)];
  if (o.art === 'Z') return ['welle', () => bau(WELT_BAU[3].hindernis.welle)];
  const f = W.hindernis[o.art];
  return [o.art + w, () => bau(f)];
}

function pflegeTeile() {
  const st = s, dist = st.dist, k = st.k;
  if (teilCursor > k.teile.length) teilCursor = 0;
  for (let i = Math.min(st.teilIndex, teilCursor); i < k.teile.length; i++) {
    const o = k.teile[i];
    if (o.d > dist + 200) break;
    if (o.welt !== undefined && o.welt !== weltJetzt) continue;
    if (!sichtbareTeile.has(o) && !o.geloest && sichtbar(o, dist)) {
      const [schl, machen] = hindernisForm(o);
      const m = holeMesh(schl, machen);
      sichtbareTeile.set(o, m);
      if (o.art === 'F') {
        const ring = holeMesh('warn', GEMEINSAM.warnring, MAT_WARN);
        ring.rotation.x = -Math.PI / 2;
        m.userData.ring = ring;
      }
      if (o.art === 'M') {
        const schatten = holeMesh('kugelschatten', () => schattenForm(1.7), MAT_SCHATTEN);
        schatten.rotation.x = -Math.PI / 2;
        m.userData.ring = schatten;
      }
    }
  }
  for (const [o, m] of sichtbareTeile) {
    const z = teilZ(o, dist);
    if ((o.lang ? z + o.lang : z) < dist - 12 || (o.vr && z < dist - 25)) {
      if (m.userData.ring) { gibFrei(m.userData.ring); m.userData.ring = null; }
      gibFrei(m);
      sichtbareTeile.delete(o);
      o.geloest = true;
      continue;
    }
    const x = teilX(o, dist);
    m.position.set(x, 0, -(z - dist));
    m.rotation.set(0, 0, 0);
    m.scale.set(1, 1, 1);
    if (o.art === 'B') {
      m.position.y = 0.6 + Math.abs(Math.sin(bildZeit * 3.4)) * 0.18;
      m.rotation.set(bildZeit * 4, 0, bildZeit * 3);
    }
    if (o.art === 'L') {
      const rest = Math.max(0, o.d - dist);
      m.rotation.z = Math.cos(rest * 0.18) * 0.14;
    }
    if (o.art === 'M') {
      // Die Kugel rollt: Dreht sich genau so schnell, wie sie vorankommt
      m.position.y = KUGEL_R + Math.abs(Math.sin(dist * 0.9)) * 0.06;
      m.rotation.x = dist * o.vr * 1.6 / KUGEL_R;
      const rest = z - dist;
      if (m.userData.ring) m.userData.ring.position.set(x, 0.05, -rest);
      if (rest < 70 && rest > -6 && Math.random() < 0.3) funkenBei(x + (Math.random() - 0.5) * 2, 0.15, -rest - 1.1, 0xd8c8a8, 1, 1.6);
      if (Math.abs(rest) < 16 && !o.geruettelt) { o.geruettelt = true; wackle(0.16); }
    }
    if (o.art === 'Z') {
      const rest = (z - dist);
      m.scale.y = begrenzt(1.5 - rest / 150, 0.45, 1.25);
      m.position.y = Math.sin(bildZeit * 4) * 0.05;
    }
    if (o.art === 'F') {
      const y = fallY(o, dist);
      m.position.y = y;
      m.visible = y < 60;
      if (o.skin === 'blitz' && y > 0) m.visible = false;
      const ring = m.userData.ring;
      if (ring) {
        ring.position.set(x, 0.09, -(o.d - dist));
        ring.visible = y > 0 || bildZeit % 0.3 < 0.2;
        const puls = 1 + Math.sin(bildZeit * 12) * 0.08;
        ring.scale.set(puls, puls, 1);
        if (y === 0 && !o.gelandet) {
          o.gelandet = true;
          if (o.skin === 'blitz') { blitzHell = 1; ton.donner(); }
          else ton.rumms();
          wackle(0.25);
          if (Math.abs(o.d - dist) < 40) funkenBei(x, 0.3, -(o.d - dist), 0xffc060, 14);
          gibFrei(ring);
          m.userData.ring = null;
        }
      }
    }
    if (o.hupe && !o.gehupt && o.d - dist < st.tempo * 2.4) { o.gehupt = true; ton.rumpel(); }
    if (o.weg) {
      const t = st.zeit - o.weg;
      m.position.y += t * 7 - t * t * 8;
      m.position.x += (x >= st.x ? 1 : -1) * t * 8;
      m.rotation.x = t * 8;
      m.rotation.z = t * 6;
      if (t > 1.1) m.visible = false;
    }
  }
}

function pflegeMuenzen() {
  const dist = s.dist;
  const liste = s.k.muenzen;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const achse = new THREE.Vector3(0, 1, 0);
  const pos = new THREE.Vector3();
  const skal = new THREE.Vector3(1, 1, 1);
  q.setFromAxisAngle(achse, bildZeit * 3.6);
  let n = 0;
  for (let i = 0; i < liste.length && n < 260; i++) {
    const c = liste[i];
    const rest = c.d - dist;
    if (c.weg || rest < -8 || rest > 135) continue;
    const x = c.magX !== undefined ? c.magX : SPUR_X[c.spur];
    pos.set(x, c.y + Math.sin(bildZeit * 3 + c.d) * 0.06, -rest);
    const g = 1;
    skal.set(g, g, g);
    m.compose(pos, q, skal);
    muenzenMesh.setMatrixAt(n++, m);
  }
  muenzenMesh.count = n;
  muenzenMesh.instanceMatrix.needsUpdate = true;
}

function pflegeHilfen() {
  const dist = s.dist;
  for (const h of s.k.hilfen) {
    const rest = h.d - dist;
    if (rest > 130 || rest < -10) continue;
    if (h.weg && !h.benutzt) {
      const alt = sichtbareHilfen.get(h);
      if (alt) { gibFrei(alt.a); if (alt.b) gibFrei(alt.b); sichtbareHilfen.delete(h); }
      continue;
    }
    if (!sichtbareHilfen.has(h)) {
      let a, b = null;
      if (h.typ === 'schleuder') a = holeMesh('schleuder', GEMEINSAM.schleuder);
      else if (h.typ === 'oel') a = holeMesh('oel', GEMEINSAM.oel);
      else {
        a = holeMesh('hilfe_' + h.typ, HILFE_FORM[h.typ]);
        b = holeMesh('kugel', () => new THREE.SphereGeometry(0.8, 18, 12), MAT_GLAS);
      }
      sichtbareHilfen.set(h, { a, b });
    }
    const e = sichtbareHilfen.get(h);
    const x = SPUR_X[h.spur];
    if (h.typ === 'schleuder' || h.typ === 'oel') {
      e.a.position.set(x, 0.02, -rest);
      if (h.typ === 'schleuder' && h.benutzt) {
        const t = s.zeit - h.benutzt;
        const g = 1 + Math.exp(-t * 6) * Math.sin(t * 30) * 0.3;
        e.a.scale.set(g, 2 - g, g);
      }
    } else {
      const y = h.y + 0.25 + Math.sin(bildZeit * 3) * 0.12;
      e.a.position.set(x, y, -rest);
      e.a.rotation.y = bildZeit * 2.2;
      e.b.position.set(x, y, -rest);
      const g = 1 + Math.sin(bildZeit * 5) * 0.06;
      e.b.scale.set(g, g, g);
    }
  }
  for (const [h, e] of sichtbareHilfen) {
    if (h.d - dist < -10 || (h.weg && !h.benutzt)) {
      gibFrei(e.a);
      if (e.b) gibFrei(e.b);
      sichtbareHilfen.delete(h);
    }
  }
}

function pflegeBoegen() {
  for (const b of s.k.boegen) {
    const rest = b.d - s.dist;
    if (rest > 190 || rest < -10) continue;
    if (!sichtbareBoegen.has(b)) sichtbareBoegen.set(b, holeMesh('ziel', ZIEL_FORM));
    sichtbareBoegen.get(b).position.set(0, 0, -rest);
  }
  for (const [b, m] of sichtbareBoegen) {
    if (b.d - s.dist < -10) { gibFrei(m); sichtbareBoegen.delete(b); }
  }
}

// --------------------------- Die Figur ---------------------------

function baueFigur(name) {
  const def = FIGUR_BAU[name];
  const wurzel = new THREE.Group();
  const koerper = new THREE.Group();
  wurzel.add(koerper);
  const teile = {};
  for (const teil of ['rumpf', 'kopf', 'armL', 'armR', 'beinL', 'beinR', 'extra']) {
    if (!def[teil]) continue;
    const pivot = new THREE.Group();
    pivot.position.set(def[teil].at[0], def[teil].at[1], def[teil].at[2]);
    const form = formVon('fig_' + name + '_' + teil, () => bau(def[teil].f));
    const m = new THREE.Mesh(form, MAT);
    const rand = new THREE.Mesh(form, MAT_KONTUR);
    m.frustumCulled = rand.frustumCulled = false;
    pivot.add(rand, m);
    koerper.add(pivot);
    teile[teil] = pivot;
    pivot.userData.y = def[teil].at[1];
  }
  return { wurzel, koerper, teile, gang: def.gang, name };
}

function zieheFigurAn(name) {
  if (!grafikBereit) return;
  if (spieler && spielerName === name) return;
  if (spieler) szene.remove(spieler.wurzel);
  spieler = baueFigur(name);
  spielerName = name;
  szene.add(spieler.wurzel);
}

// Bewegt Arme, Beine und Kopf je nach Gangart
function animiereFigur(f, o) {
  const t = o.phase;
  const T = f.teile;
  const zuruecksetzen = p => { if (p) { p.rotation.set(0, 0, 0); p.position.y = p.userData.y; } };
  for (const p of Object.values(T)) zuruecksetzen(p);
  f.koerper.rotation.set(0, 0, 0);
  f.koerper.position.set(0, 0, 0);
  f.koerper.scale.set(1, 1, 1);
  const sw = Math.sin(t), sw2 = Math.sin(t * 2);
  const g = o.gang || f.gang;
  if (o.rutscht) {
    if (f.name === 'rudi') {
      // Rudi rollt wie ein Ball
      f.koerper.position.y = 0.72;
      for (const p of Object.values(T)) p.position.y = p.userData.y - 0.72;
      f.koerper.rotation.x = -bildZeit * 16;
      return;
    }
    f.koerper.rotation.x = 1.15;
    f.koerper.position.y = 0.32;
    f.koerper.position.z = 0.3;
    if (T.armL) T.armL.rotation.x = 2.5;
    if (T.armR) T.armR.rotation.x = 2.5;
    if (T.beinL) T.beinL.rotation.x = -0.5 + sw * 0.1;
    if (T.beinR) T.beinR.rotation.x = -0.15 - sw * 0.1;
    if (T.kopf) T.kopf.rotation.x = -0.7;
    return;
  }
  if (o.fliegt) {
    // Sitzt in der Badewanne und winkt
    f.koerper.position.y = 0.32;
    f.koerper.rotation.x = -0.12;
    if (T.armL) T.armL.rotation.x = 2.8 + sw2 * 0.25;
    if (T.armR) T.armR.rotation.x = 2.8 - sw2 * 0.25;
    if (T.beinL) T.beinL.rotation.x = 1.25;
    if (T.beinR) T.beinR.rotation.x = 1.25;
    return;
  }
  if (o.springt) {
    const v = o.vy || 0;
    if (T.armL) { T.armL.rotation.x = 2.6; T.armL.rotation.z = -0.3; }
    if (T.armR) { T.armR.rotation.x = v > 0 ? 2.8 : 1.6; T.armR.rotation.z = 0.3; }
    if (T.beinL) T.beinL.rotation.x = v > 0 ? -1.1 : -0.5;
    if (T.beinR) T.beinR.rotation.x = v > 0 ? 0.5 : -0.2;
    f.koerper.rotation.x = v > 0 ? -0.2 : 0.1;
    // Extrasprung in der Luft: ein Salto. Beim Bauchplatscher: Bauch voran.
    if (o.salto) { f.koerper.position.y = 0.8; f.koerper.rotation.x = -o.salto * Math.PI * 2; for (const p of Object.values(T)) p.position.y = p.userData.y - 0.8; }
    if (o.ball) { f.koerper.rotation.x = 1.3; f.koerper.position.y = 0.6; }
    return;
  }
  if (g === 'lauf' || g === 'humpel') {
    const a = g === 'humpel' ? 0.75 : 1;
    if (T.beinL) T.beinL.rotation.x = sw * 1.05 * a;
    if (T.beinR) T.beinR.rotation.x = -sw * 1.05;
    if (T.armL) T.armL.rotation.x = -sw * 1.0;
    if (T.armR) T.armR.rotation.x = sw * 1.0;
    f.koerper.position.y = Math.abs(Math.cos(t)) * 0.1;
    f.koerper.rotation.x = -0.14;
    f.koerper.rotation.z = g === 'humpel' ? sw * 0.14 : sw * 0.03;
    if (T.kopf) T.kopf.rotation.x = 0.07;
    if (T.rumpf) T.rumpf.rotation.y = sw * 0.14;
  } else if (g === 'watschel') {
    if (T.beinL) T.beinL.rotation.x = sw * 0.75;
    if (T.beinR) T.beinR.rotation.x = -sw * 0.75;
    if (T.armL) { T.armL.rotation.x = -sw * 0.5; T.armL.rotation.z = -0.5 - Math.abs(sw) * 0.4; }
    if (T.armR) { T.armR.rotation.x = sw * 0.5; T.armR.rotation.z = 0.5 + Math.abs(sw) * 0.4; }
    f.koerper.rotation.z = sw * 0.2;
    f.koerper.position.y = Math.abs(sw) * 0.14;
    if (T.kopf) T.kopf.rotation.z = -sw * 0.12;
  } else if (g === 'seite') {
    // Krabbe: läuft quer, der Blick bleibt zur Seite gedreht
    f.koerper.rotation.y = 1.1 + Math.sin(t * 0.5) * 0.1;
    f.koerper.position.y = Math.abs(sw2) * 0.08;
    f.koerper.rotation.z = sw2 * 0.05;
    if (T.beinL) T.beinL.rotation.z = sw * 0.45;
    if (T.beinR) T.beinR.rotation.z = sw * 0.45;
    if (T.armL) { T.armL.rotation.z = 0.2 + sw2 * 0.22; T.armL.rotation.x = -0.1; }
    if (T.armR) { T.armR.rotation.z = -0.2 - sw2 * 0.22; T.armR.rotation.x = -0.1; }
  } else if (g === 'hopf') {
    const hopser = Math.abs(sw);
    f.koerper.position.y = hopser * 0.32;
    const dehnen = 1 + (hopser - 0.5) * 0.14;
    f.koerper.scale.set(2 - dehnen, dehnen, 2 - dehnen);
    if (T.beinL) T.beinL.rotation.x = sw * 0.9;
    if (T.beinR) T.beinR.rotation.x = -sw * 0.9;
    if (T.armL) T.armL.rotation.z = -0.5 - hopser * 0.7;
    if (T.armR) T.armR.rotation.z = 0.5 + hopser * 0.7;
  } else if (g === 'schweb') {
    f.koerper.position.y = 0.2 + sw * 0.15;
    const dehnen = 1 + sw * 0.1;
    if (T.rumpf) T.rumpf.scale.set(2 - dehnen, dehnen, 2 - dehnen);
    if (T.beinL) { T.beinL.rotation.x = sw * 0.5; T.beinL.rotation.z = sw2 * 0.2; }
    if (T.beinR) { T.beinR.rotation.x = -sw * 0.5; T.beinR.rotation.z = -sw2 * 0.2; }
    if (T.armL) { T.armL.rotation.x = -sw * 0.4; T.armL.rotation.z = -0.3; }
    if (T.armR) { T.armR.rotation.x = sw * 0.4; T.armR.rotation.z = 0.3; }
  }
}

let laufPhase = 0;
let schattenMesh = null;

function schattenForm(r) {
  const form = new THREE.CircleGeometry(r, 20);
  const n = form.attributes.position.count;
  const farben = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const x = form.attributes.position.getX(i), y = form.attributes.position.getY(i);
    farben[i * 4 + 3] = 0.48 * (1 - Math.hypot(x, y) / r);
  }
  form.setAttribute('color', new THREE.BufferAttribute(farben, 4));
  return form;
}

function baueSchatten() {
  schattenMesh = new THREE.Mesh(schattenForm(0.95), MAT_SCHATTEN);
  schattenMesh.rotation.x = -Math.PI / 2;
  schattenMesh.frustumCulled = false;
  szene.add(schattenMesh);
}

// --------------------------- Funken und Wetter ---------------------------

const FUNKEN_MAX = 120;
let funkenNr = 0;
const funkenDaten = [];

function kreisBild() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const v = g.createRadialGradient(16, 16, 2, 16, 16, 15);
  v.addColorStop(0, 'rgba(255,255,255,1)');
  v.addColorStop(0.5, 'rgba(255,255,255,0.8)');
  v.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = v;
  g.fillRect(0, 0, 32, 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function baueFunken() {
  const form = new THREE.BufferGeometry();
  form.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FUNKEN_MAX * 3).fill(-999), 3));
  form.setAttribute('color', new THREE.BufferAttribute(new Float32Array(FUNKEN_MAX * 3), 3));
  const m = new THREE.PointsMaterial({ size: 0.34, vertexColors: true, map: kreisBild(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  funkenPunkte = new THREE.Points(form, m);
  funkenPunkte.frustumCulled = false;
  szene.add(funkenPunkte);
  for (let i = 0; i < FUNKEN_MAX; i++) funkenDaten.push({ zeit: 0, vx: 0, vy: 0, vz: 0 });
}

function funkenBei(x, y, z, farbe, anzahl = 8, kraft = 5) {
  if (!grafikBereit) return;
  const pos = funkenPunkte.geometry.attributes.position, col = funkenPunkte.geometry.attributes.color;
  const c = new THREE.Color(farbe);
  for (let i = 0; i < anzahl; i++) {
    const n = funkenNr++ % FUNKEN_MAX;
    pos.setXYZ(n, x, y, z);
    col.setXYZ(n, c.r, c.g, c.b);
    const d = funkenDaten[n];
    d.zeit = 0.5 + Math.random() * 0.4;
    const w = Math.random() * Math.PI * 2;
    const k = kraft * (0.4 + Math.random() * 0.6);
    d.vx = Math.cos(w) * k;
    d.vz = Math.sin(w) * k;
    d.vy = 2 + Math.random() * kraft;
  }
}
function funken() { if (grafikBereit && s) funkenBei(s.x, s.y + 1.1, -0.4, 0xffd24a, 5, 4); }
function staub() { if (grafikBereit && s) funkenBei(s.x, s.y + 0.1, 0, 0xfff4e4, 7, 2.6); }

function pflegeFunken(dt) {
  const pos = funkenPunkte.geometry.attributes.position;
  let aktiv = false;
  for (let i = 0; i < FUNKEN_MAX; i++) {
    const d = funkenDaten[i];
    if (d.zeit <= 0) continue;
    d.zeit -= dt;
    aktiv = true;
    if (d.zeit <= 0) { pos.setXYZ(i, -999, -999, -999); continue; }
    d.vy -= 12 * dt;
    pos.setXYZ(i, pos.getX(i) + d.vx * dt, pos.getY(i) + d.vy * dt, pos.getZ(i) + d.vz * dt + (s ? s.tempo * dt : 0));
  }
  if (aktiv) pos.needsUpdate = true;
}

// Regen, Sterne, Sand: Punkte, die mitlaufen
const WETTER_N = 150;
let wetterArt = '';
let wetterTempo = 0;

function baueWetter() {
  const form = new THREE.BufferGeometry();
  const p = new Float32Array(WETTER_N * 3);
  for (let i = 0; i < WETTER_N; i++) { p[i * 3] = (Math.random() - 0.5) * 60; p[i * 3 + 1] = Math.random() * 28; p[i * 3 + 2] = -Math.random() * 80 + 8; }
  form.setAttribute('position', new THREE.BufferAttribute(p, 3));
  wetterPunkte = new THREE.Points(form, new THREE.PointsMaterial({ size: 0.16, color: 0xffffff, map: kreisBild(), transparent: true, opacity: 0.6, depthWrite: false, fog: false }));
  wetterPunkte.frustumCulled = false;
  szene.add(wetterPunkte);
}

function zeigeWetter(w) {
  const m = wetterPunkte.material;
  wetterArt = ['moewen', 'sand', 'funken', 'regen', 'staub'][w];
  wetterPunkte.visible = w !== 0;
  m.color.set([0xffffff, 0xfff4c8, 0xffc8f0, 0xbfe6f0, 0xc8d0ff][w]);
  m.size = [0.1, 0.14, 0.2, 0.15, 0.13][w];
  m.opacity = [0, 0.5, 0.8, 0.75, 0.7][w];
  wetterTempo = [0, 0.8, 1.5, 22, -0.6][w];
}

function pflegeWetter(dt) {
  if (!wetterPunkte.visible) return;
  const pos = wetterPunkte.geometry.attributes.position;
  const vor = s ? s.tempo * dt : 0;
  for (let i = 0; i < WETTER_N; i++) {
    let y = pos.getY(i) - wetterTempo * dt, z = pos.getZ(i) + vor * (wetterArt === 'regen' ? 1.2 : 0.75);
    if (y < 0) y += 28;
    if (y > 28) y -= 28;
    if (z > 8) z -= 88;
    pos.setY(i, y);
    pos.setZ(i, z);
    if (wetterArt === 'funken') pos.setX(i, pos.getX(i) + Math.sin(bildZeit + i) * dt * 0.5);
  }
  pos.needsUpdate = true;
}

// --------------------------- Gisela fliegt voraus ---------------------------

function pflegeGisela(dt) {
  if (!giselaBild) {
    giselaBild = baueFigur('gisela');
    szene.add(giselaBild.wurzel);
  }
  const f = giselaBild;
  const zeigen = modus !== 'menue' && s && !s.tot;
  // Sie startet oben in der Ferne, nicht mitten auf der Strecke
  if (!f.wurzel.visible || f.wurzel.position.lengthSq() === 0) f.wurzel.position.set(0, 10, -58);
  f.wurzel.visible = zeigen;
  if (!zeigen) return;
  const boss = istBoss();
  const fertig = s.fertig > 0;
  let z = boss ? -30 : -58;
  let y = boss ? 8.5 + Math.sin(bildZeit * 1.1) * 0.7 : 10 + Math.sin(bildZeit * 0.7) * 1.3;
  let x = Math.sin(bildZeit * 0.6) * 3.2;
  if (boss) {
    // Schwebt über der Spur, in der gleich etwas landet
    const nah = s.k.teile.find(o => o.art === 'F' && o.d > s.dist + s.tempo * 0.55 && o.d < s.dist + 70);
    if (nah) x = SPUR_X[nah.spur] * 0.9;
  }
  if (!s.endlos && !fertig) {
    const rest = s.ziel - s.dist;
    if (rest < 30) z = Math.max(z, -rest - 2);    // Am Ziel holt man sie ein
  }
  if (fertig) { z = -5 - s.fertig * 1.4; y = 4 + s.fertig * 2.4; x = 1.5; }
  f.wurzel.position.x += (x - f.wurzel.position.x) * Math.min(1, dt * 2.4);
  f.wurzel.position.y += (y - f.wurzel.position.y) * Math.min(1, dt * 2.4);
  f.wurzel.position.z += (z - f.wurzel.position.z) * Math.min(1, dt * 1.5);
  f.wurzel.rotation.y = Math.PI;
  f.wurzel.rotation.z = (x - f.wurzel.position.x) * 0.1;
  const T = f.teile;
  const flug = Math.sin(bildZeit * 13);
  if (T.armL) T.armL.rotation.z = -0.1 + flug * 0.8;
  if (T.armR) T.armR.rotation.z = 0.1 - flug * 0.8;
  if (T.beinL) T.beinL.rotation.x = 0.8;
  if (T.beinR) T.beinR.rotation.x = 0.8;
  f.wurzel.scale.setScalar(boss || fertig ? 1.5 : 2);
}

// --------------------------- Bild pro Frame ---------------------------

function weltWechselBild(w) {
  const sichtWaren = [];
  for (const [o, m] of sichtbareTeile) { if (o.welt === w) continue; if (m.userData.ring) gibFrei(m.userData.ring); gibFrei(m); sichtbareTeile.delete(o); o.geloest = true; sichtWaren.push(o); }
  for (const m of bodenListe) gibFrei(m);
  bodenListe.length = 0;
  for (const m of dekoListe) gibFrei(m);
  dekoListe.length = 0;
  dekoNaechste = {};
  zieheWeltAn(w);
  zeigeUebergang();
}

function wackle(k) { if (!wenigBewegung.matches) wackeln = Math.max(wackeln, k); }

function setzeKurve() {
  const d = s.dist;
  const w = weltJetzt;
  const stark = w === 3 ? 1.3 : 1;
  // Sanfte Kurven, die von selbst kommen und gehen
  const kx = (Math.sin(d * 0.0052) * 0.75 + Math.sin(d * 0.0137 + 1) * 0.25) * 0.00125 * stark;
  const ky = -0.00052 - Math.max(0, Math.sin(d * 0.0041 + 2)) * 0.00042;
  KRUMM.value.set(kx, ky);
}

function zeichneBild(dt) {
  bildZeit += dt;
  const st = s;
  if (st.welt !== weltJetzt && !st.endlos) {
    alleFrei();
    zieheWeltAn(st.welt);
  } else if (weltJetzt < 0) zieheWeltAn(st.welt);
  setzeKurve();
  pflegeBoden();
  pflegeDeko();
  pflegeTeile();
  pflegeMuenzen();
  pflegeHilfen();
  pflegeBoegen();
  pflegeFunken(dt);
  pflegeWetter(dt);
  pflegeGisela(dt);

  // Die Figur
  const f = spieler;
  const salto = st.zeit - st.saltoZeit;
  const y = st.y;
  laufPhase += dt * (st.tempo > 0 ? Math.max(9, st.tempo * 0.95) : 0) * (modus === 'menue' ? 0.8 : 1);
  f.wurzel.position.set(st.x, y, 0);
  f.wurzel.rotation.y = modus === 'menue' ? 0 : begrenzt((SPUR_X[st.spur] - st.x) * -0.08, -0.45, 0.45);
  const lehnen = begrenzt((SPUR_X[st.spur] - st.x) * -0.16, -0.32, 0.32);
  f.wurzel.rotation.z = lehnen;
  f.wurzel.rotation.x = st.stolpern > 0 ? Math.sin(st.stolpern * 12) * 0.25 : 0;
  animiereFigur(f, {
    phase: laufPhase,
    rutscht: st.rutsch > 0,
    fliegt: st.flug > 0,
    springt: !st.amBoden && st.flug <= 0 && st.y > st.boden + 0.3,
    vy: st.vy,
    salto: salto >= 0 && salto < 0.42 && !st.amBoden ? salto / 0.42 : 0,
    ball: st.stampf
  });
  if (st.tot > 0) {
    f.koerper.rotation.x = -1.5;
    f.koerper.position.y = 0.2;
  }
  // Blinkt nach einem Treffer, schimmert bei einem Ring
  f.wurzel.visible = st.schutz <= 0 || st.tot > 0 || (bildZeit * 14) % 1 > 0.35;
  pflegeZubehoer(f);

  // Kontakt-Schatten
  schattenMesh.position.set(st.x, Math.max(st.boden, 0) + 0.05, 0);
  const hoch = begrenzt(st.y - st.boden, 0, 5);
  const g = 1 - hoch * 0.13;
  schattenMesh.scale.set(g, g, 1);
  schattenMesh.visible = st.flug <= 0;

  // Kamera
  stelleKamera(dt);
  himmelGruppe.position.copy(kamera.position);
  blitzHell = Math.max(0, blitzHell - dt * 3.5);
  if (weltJetzt === 3 && !wenigBewegung.matches && Math.random() < dt * 0.09) blitzHell = 0.7;
  if (blitzHell > 0) {
    licht.intensity = WELT_BAU[weltJetzt].licht.stark + blitzHell * 2.6;
  } else licht.intensity = WELT_BAU[weltJetzt].licht.stark;

  renderer.render(szene, kamera);
  misseTempo(dt);
}

function stelleKamera(dt) {
  const st = s;
  // Wenn wir die Figur von vorne sehen, kommt auch das Licht von vorne
  if (modus === 'menue' || st.fertig > 0) sonne.position.set(-2, 8, -7);
  else sonne.position.set(5, 11, 6);
  const hoch = bildGroesse.hoch;
  const ab = hoch ? 8.6 : 7;
  const kh = hoch ? 5 : 3.7;
  if (modus === 'menue') {
    // Im Menü schauen wir der Figur von vorne ins Gesicht
    const breit = !hoch && bildGroesse.b > bildGroesse.h * 1.1;
    const wackel = Math.sin(bildZeit * 0.4) * 0.3;
    if (breit) {
      kamera.position.set(-0.7 + wackel, 1.55, -4.6);
      kamera.lookAt(1.9, 1.05, 0);
    } else {
      kamera.position.set(1.2 + wackel, 1.6, -5.4);
      kamera.lookAt(0, 1.75, 0);
    }
    return;
  }
  if (st.fertig > 0) {
    // Am Ziel läuft die Kamera nach vorne
    const u = Math.min(1, st.fertig * 0.7);
    const zielZ = ab + (-5.5 - ab) * u;
    kamera.position.set(st.x + Math.sin(u * 2.4) * 4, st.y + kh + (1.6 - kh) * u, zielZ);
    kamera.lookAt(st.x, st.y + 1, 0);
    return;
  }
  kamX += (st.x * 0.72 - kamX) * Math.min(1, dt * 7);
  const zielY = st.flug > 0 ? st.y : Math.min(st.y, 4) * 0.55;
  kamY += (zielY - kamY) * Math.min(1, dt * (st.amBoden ? 5 : 3));
  let wx = 0, wy = 0;
  if (wackeln > 0) {
    wackeln = Math.max(0, wackeln - dt * 2);
    wx = (Math.random() - 0.5) * wackeln * 0.6;
    wy = (Math.random() - 0.5) * wackeln * 0.5;
  }
  kamera.position.set(kamX + wx, kh + kamY + wy, ab);
  kamera.lookAt(kamX * 0.85, (hoch ? 0.1 : 1.5) + kamY, hoch ? -9 : -11);
  // Das Sturmschiff schaukelt
  const zielDreh = weltJetzt === 3 && !wenigBewegung.matches ? Math.sin(st.dist * 0.05) * 0.035 + Math.sin(st.dist * 0.11) * 0.012 : 0;
  kamDrehung += (zielDreh - kamDrehung) * Math.min(1, dt * 2);
  kamera.rotateZ(kamDrehung);
}

// Hilfen sichtbar an der Figur
let zubehoer = null;
function pflegeZubehoer(f) {
  const st = s;
  if (!zubehoer) {
    zubehoer = {
      wanne: new THREE.Mesh(formVon('flugwanne', () => bau(b => {
        // Die fliegende Badewanne, samt Wasserhahn und Quietscheente
        b.rund(1.05, 0, 0.3, 0, [0xc8d6e0, 0xffffff], { s: [0.86, 0.55, 1.28], seg: 18, seg2: 12 });
        b.ring(0.88, 0.075, 0, 0.74, 0, 0xffffff, { rx: Math.PI / 2, s: [1, 1.46, 1], seg: 6, seg2: 24 });
        b.rund(0.84, 0, 0.72, 0, 0x4ab8e8, { s: [1, 0.05, 1.42], seg: 16, seg2: 6 });
        for (const [x, z] of [[-0.55, -0.85], [0.55, -0.85], [-0.55, 0.85], [0.55, 0.85]]) b.rund(0.13, x, -0.22, z, 0xf2c21a, { seg: 8, seg2: 6 });
        b.zyl(0.05, 0.05, 0.42, 0, 0.98, -1.14, 0xd8dce4, { seg: 8 });
        b.box(0.08, 0.08, 0.3, 0, 1.17, -1.02, 0xd8dce4);
        b.rund(0.16, 0.56, 0.86, 0.72, 0xffdc2a, { seg: 8, seg2: 6 });
        b.rund(0.11, 0.56, 1.06, 0.62, 0xffdc2a, { seg: 8, seg2: 6 });
        b.rund(0.05, 0.56, 1.05, 0.52, 0xff8a1a, { seg: 6, seg2: 4 });
        for (let i = 0; i < 6; i++) b.rund(0.11 + (i % 2) * 0.05, -0.44 + i * 0.18, 0.78, 0.5 + ((i * 3) % 4) * 0.13, 0xffffff, { seg: 7, seg2: 5 });
      })), MAT),
      fluegelL: new THREE.Mesh(formVon('wflugel', () => bau(b => {
        b.rund(0.7, 0.62, 0, 0, 0xffffff, { s: [1, 0.12, 0.55], seg: 12, seg2: 7 });
        b.rund(0.42, 1.1, -0.02, 0.06, 0xdce6f0, { s: [1, 0.12, 0.55], seg: 10, seg2: 6 });
      })), MAT),
      fluegelR: new THREE.Mesh(formVon('wflugel', () => null), MAT),
      seil: new THREE.Mesh(formVon('hakenseil', () => bau(b => {
        b.box(0.04, 9, 0.04, 0, 4.5, 0, 0x6e4a26);
        b.ring(0.14, 0.03, 0, 0, 0, 0xc4ced8, { seg: 5, seg2: 10 });
      })), MAT),
      ring: new THREE.Mesh(formVon('fring', () => bau(b => {
        for (let i = 0; i < 12; i++) { const w = (i / 12) * Math.PI * 2; b.rund(0.17, Math.cos(w) * 0.76, 0, Math.sin(w) * 0.76, i % 2 ? 0xffffff : 0xf0382e, { seg: 10, seg2: 7 }); }
      })), MAT),
      magnet: new THREE.Mesh(formVon('fmag', HILFE_FORM.magnet), MAT),
      stiefelL: new THREE.Mesh(formVon('fsti', () => bau(b => { for (let i = 0; i < 3; i++) b.ring(0.2, 0.05, 0, i * 0.1, 0, 0xa8e8a0, { rx: Math.PI / 2, seg: 5, seg2: 12 }); })), MAT),
      stiefelR: new THREE.Mesh(formVon('fsti', () => null), MAT)
    };
    for (const m of Object.values(zubehoer)) { m.frustumCulled = false; szene.add(m); }
  }
  const z = zubehoer;
  const fliegt = st.flug > 0;
  z.wanne.visible = z.fluegelL.visible = z.fluegelR.visible = fliegt;
  if (fliegt) {
    const wippen = Math.sin(bildZeit * 4) * 0.08, kippen = Math.sin(bildZeit * 3) * 0.08, schlag = Math.sin(bildZeit * 22) * 0.75;
    z.wanne.scale.setScalar(0.85);
    z.fluegelL.scale.setScalar(0.72);
    z.fluegelR.scale.setScalar(0.72);
    z.wanne.position.set(st.x, st.y - 0.05 + wippen, 0);
    z.wanne.rotation.set(-0.06, 0, kippen);
    z.fluegelR.position.set(st.x + 0.72, st.y + 0.65 + wippen, 0.15);
    z.fluegelR.rotation.set(0, 0, kippen + schlag * 0.8 + 0.2);
    z.fluegelL.position.set(st.x - 0.72, st.y + 0.65 + wippen, 0.15);
    z.fluegelL.rotation.set(0, Math.PI, -(kippen - schlag * 0.8 - 0.2));
    if (Math.random() < 0.12) funkenBei(st.x, st.y + 0.1, 0.6, 0xbfe8ff, 1, 1.4);
  }
  // Pias Enterhaken
  z.seil.visible = !!st.fig.haken && st.haengen > 0;
  if (z.seil.visible) z.seil.position.set(st.x + 0.36, st.y + 1.55, 0);
  z.ring.visible = st.ring;
  if (st.ring) z.ring.position.set(st.x, st.y + 0.75, 0);
  z.magnet.visible = st.magnet > 0;
  if (st.magnet > 0) { z.magnet.position.set(st.x, st.y + 2.5, 0); z.magnet.rotation.set(0, bildZeit * 3, 0); }
  z.stiefelL.visible = z.stiefelR.visible = st.stiefel > 0;
  if (st.stiefel > 0) { z.stiefelL.position.set(st.x - 0.2, st.y + 0.02, 0); z.stiefelR.position.set(st.x + 0.2, st.y + 0.02, 0); }
}

// Wird das Bild zu langsam, rechnet das Spiel kleiner, damit es auf jedem Handy flüssig bleibt
let tempoSumme = 0, tempoAnzahl = 0;
function misseTempo(dt) {
  tempoSumme += dt;
  tempoAnzahl++;
  if (tempoAnzahl < 45) return;
  const mittel = tempoSumme / tempoAnzahl;
  tempoSumme = 0; tempoAnzahl = 0;
  if (mittel > 1 / 42 && bildQualitaet > 0.5) { bildQualitaet = Math.max(0.5, bildQualitaet - 0.15); passeGroesseAn(); renderer.render(szene, kamera); }
}

function passeGroesseAn() {
  if (!grafikBereit) return;
  const b = window.innerWidth, h = window.innerHeight;
  const hoch = h > b;
  bildGroesse = { b, h, hoch };
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2) * bildQualitaet);
  renderer.setSize(b, h, false);
  const a = b / h;
  kamera.aspect = a;
  // Auch auf schmalen Handys müssen alle drei Spuren ins Bild passen
  const halbBreit = Math.tan((hoch ? 45 : 58) * Math.PI / 360);
  const senkrecht = a >= 1 ? 52 : 2 * Math.atan(halbBreit / a) * 180 / Math.PI;
  kamera.fov = begrenzt(senkrecht, 46, 98);
  kamera.updateProjectionMatrix();
}

// --------------------------- Vorschau-Bilder ---------------------------

const bilderSpeicher = new Map();

// Rendert ein Modell einmal und legt das Bild auf eine kleine Leinwand
function fotoVon(schluessel, aufbauen, g = 256) {
  const leinwand = document.createElement('canvas');
  leinwand.width = leinwand.height = g;
  if (!grafikBereit) return leinwand;
  if (!bilderSpeicher.has(schluessel)) {
    const alt = renderer.getPixelRatio();
    const altB = renderer.domElement.width, altH = renderer.domElement.height;
    renderer.setPixelRatio(1);
    renderer.setSize(Math.max(g, window.innerWidth), Math.max(g, window.innerHeight), false);
    const bild = new THREE.Scene();
    bild.add(new THREE.HemisphereLight(0xffffff, 0x9a8a7a, 1.5));
    const lampe = new THREE.DirectionalLight(0xffffff, 1.7);
    lampe.position.set(-3, 5, -6);
    bild.add(lampe);
    const kam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    const alteKrumm = KRUMM.value.clone();
    KRUMM.value.set(0, 0);
    aufbauen(bild, kam);
    renderer.setRenderTarget(null);
    renderer.setViewport(0, 0, g, g);
    renderer.setScissor(0, 0, g, g);
    renderer.setScissorTest(true);
    renderer.clear();
    renderer.render(bild, kam);
    const speicher = document.createElement('canvas');
    speicher.width = speicher.height = g;
    const breite = renderer.domElement.height;
    speicher.getContext('2d').drawImage(renderer.domElement, 0, breite - g, g, g, 0, 0, g, g);
    bilderSpeicher.set(schluessel, speicher);
    renderer.setScissorTest(false);
    KRUMM.value.copy(alteKrumm);
    renderer.setPixelRatio(alt);
    passeGroesseAn();
  }
  leinwand.getContext('2d').drawImage(bilderSpeicher.get(schluessel), 0, 0, g, g);
  return leinwand;
}

function figurFoto(name) {
  return fotoVon('figur_' + name, (bild, kam) => {
    const f = baueFigur(name);
    bild.add(f.wurzel);
    animiereFigur(f, { phase: 0.65, gang: f.gang === 'seite' ? 'watschel' : f.gang });
    f.wurzel.rotation.y = name === 'kalle' ? -0.2 : 0.4;
    kam.position.set(0.4, 1.5, -4.3);
    kam.lookAt(0, 0.98, 0);
  });
}

function formFoto(schluessel, form, entfernung = 5.5, hoehe = 1.3, nachOben = 0, drehung = 0.5) {
  return fotoVon('form_' + schluessel, (bild, kam) => {
    const m = new THREE.Mesh(form, MAT);
    m.frustumCulled = false;
    m.rotation.y = drehung;
    bild.add(m);
    kam.position.set(0, hoehe + nachOben, -entfernung);
    kam.lookAt(0, nachOben, 0);
  });
}
