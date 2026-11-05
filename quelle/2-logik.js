// --------------------------- Die Strecke bauen ---------------------------
//
// Jedes Hindernis steht in einer Spur an einer festen Stelle d (Meter).
// Arten: niedrig (J) drüberspringen, hoch (S) drunter durchrutschen, wand (W) ausweichen,
// dach (C) ein Container, auf den man laufen kann, faehrt (M) kommt entgegen,
// ball (B) kullert quer, laterne (L) schwingt quer, welle (Z) rollt über alle Spuren, faellt (F) landet von oben.
//
// Alles, was sich bewegt, hängt am zurückgelegten Weg des Spielers. So ist es bei jedem Tempo fair
// und kommt genau an der geplanten Stelle an.

const HOEHEN = {
  J: { y0: 0, y1: 1.05, t: 0.5 },
  S: { y0: 1.12, y1: 3.0, t: 0.35 },
  W: { y0: 0, y1: 3.2, t: 0.9 },
  M: { y0: 0, y1: 2.5, t: 1.6, vr: 0.55 },
  B: { y0: 0, y1: 1.15, t: 0.7 },
  L: { y0: 1.12, y1: 3.0, t: 0.45 },
  Z: { y0: 0, y1: 1.0, t: 0.8, vr: 0.5 },
  F: { y0: 0, y1: 1.0, t: 0.8 }
};

class Kurs {
  constructor(seed, stufe, istEndlos) {
    this.z = wuerfel(seed);
    this.stufe = stufe;
    this.endlos = istEndlos;
    this.teile = [];       // Hindernisse, sortiert nach d
    this.muenzen = [];     // Münzen
    this.hilfen = [];      // Hilfen und Spezialfelder
    this.boegen = [];      // Zielbogen, Weltwechsel
    this.bis = 0;
    this.pfad = 1;
    this.muenzenGesamt = 0;
    this.seitHilfe = 0;
  }
  teil(art, spur, d, extra = {}) {
    const h = HOEHEN[art];
    const o = Object.assign({ art, spur, d, y0: h ? h.y0 : 0, y1: h ? h.y1 : DACH_HOCH, t: h ? h.t : 1, vr: h && h.vr || 0, welt: this.welt, vorbei: false, weg: 0 }, extra);
    this.teile.push(o);
    return o;
  }
  muenzeReihe(spur, von, bis, y = 0.9, schritt = 3) {
    for (let d = von; d <= bis; d += schritt) { this.muenzen.push({ spur, d, y, weg: false }); this.muenzenGesamt++; }
  }
  muenzeBogen(spur, mitte, weite, hoch, basis = 0.9) {
    for (let i = -3; i <= 3; i++) {
      const u = i / 3;
      this.muenzen.push({ spur, d: mitte + u * weite, y: basis + (1 - u * u) * hoch, weg: false });
      this.muenzenGesamt++;
    }
  }
  andere(spur) { return [0, 1, 2].filter(x => x !== spur); }
  // Die nächste Spur auf dem sicheren Weg: nie mehr als eine Spur auf einmal
  nachbar() {
    const p = this.pfad;
    return p === 1 ? this.z.wahl([0, 2]) : 1;
  }
  bewege() {
    if (this.z() < 0.55) this.pfad = this.nachbar();
    return this.pfad;
  }
}

// Jedes Muster bekommt die Strecke und die Stelle d und gibt zurück, wie viele Meter es braucht.
const MUSTER_BAU = {
  // Ein Hindernis, daneben frei
  seite(k, d) {
    const p = k.bewege();
    const frei = k.z.wahl(k.andere(p));
    k.teil(k.z.wahl(['J', 'W', 'S']), frei, d);
    k.muenzeReihe(p, d - 12, d + 3);
    return 6;
  },
  sprung(k, d) {
    const p = k.bewege();
    k.teil('J', p, d);
    if (k.z() < 0.5) k.teil('J', k.z.wahl(k.andere(p)), d);
    k.muenzeBogen(p, d, 5, 2);
    return 6;
  },
  rutsch(k, d) {
    const p = k.bewege();
    k.teil('S', p, d);
    if (k.z() < 0.5) k.teil('S', k.z.wahl(k.andere(p)), d);
    k.muenzeReihe(p, d - 6, d + 6, 0.55, 2.4);
    return 6;
  },
  sprungreihe(k, d) {
    for (const sp of [0, 1, 2]) k.teil('J', sp, d);
    k.muenzeBogen(k.pfad, d, 5, 2);
    return 7;
  },
  rutschreihe(k, d) {
    for (const sp of [0, 1, 2]) k.teil('S', sp, d);
    k.muenzeReihe(k.pfad, d - 6, d + 6, 0.55, 2.4);
    return 7;
  },
  // Zwei Spuren gesperrt, die dritte ist frei
  wand2(k, d) {
    const p = k.bewege();
    for (const sp of k.andere(p)) k.teil('W', sp, d);
    k.muenzeReihe(p, d - 9, d + 3);
    return 6;
  },
  // Zwei Wände und in der offenen Spur muss man springen oder rutschen
  tor(k, d) {
    const p = k.bewege();
    for (const sp of k.andere(p)) k.teil('W', sp, d);
    if (k.z() < 0.5) { k.teil('J', p, d); k.muenzeBogen(p, d, 5, 2); }
    else { k.teil('S', p, d); k.muenzeReihe(p, d - 6, d + 6, 0.55, 2.4); }
    return 7;
  },
  // Schlangenlinie: mehrere Wände hintereinander
  slalom(k, d, tempo, luft) {
    const anzahl = k.z.ganz(3, 4);
    const schritt = Math.max(tempo * Math.max(0.72, luft * 0.62), 11);
    let stelle = d;
    for (let i = 0; i < anzahl; i++) {
      const p = k.nachbar();
      k.pfad = p;
      for (const sp of k.andere(p)) k.teil('W', sp, stelle);
      k.muenzeReihe(p, stelle - 3, stelle + 3);
      stelle += schritt;
    }
    return stelle - schritt - d + 6;
  },
  // Container in einer Spur daneben, mit Rampe. Oben gibt es Münzen.
  container(k, d) {
    const p = k.bewege();
    const sp = k.z.wahl(k.andere(p));
    const lang = k.z.wahl([14, 20, 26]);
    const rampe = k.z() < 0.7;
    k.teil('C', sp, d, { lang, rampe: rampe ? 7 : 0, y1: DACH_HOCH, t: lang / 2 });
    if (rampe) k.muenzeReihe(sp, d + 8, d + lang - 1, DACH_HOCH + 0.9);
    k.muenzeReihe(p, d, d + 9);
    return lang + 4;
  },
  // Alle drei Spuren sind voll: Rein kommt man nur über die Rampe, oben läuft man übers Dach
  dachzug(k, d) {
    const p = k.bewege();
    const lang = k.z.wahl([22, 30, 38]);
    for (const sp of [0, 1, 2]) {
      const hatRampe = sp === p;
      k.teil('C', sp, hatRampe ? d : d + 7, { lang: hatRampe ? lang + 7 : lang, rampe: hatRampe ? 7 : 0, y1: DACH_HOCH, t: lang / 2, zug: true });
    }
    k.muenzeReihe(p, d + 2, d + lang + 3, DACH_HOCH + 0.9, 3);
    // Oben kann man ruhig die Spur wechseln: Für Mutige liegen dort Bonusmünzen
    const neben = k.z.wahl(k.andere(p));
    if (Math.abs(neben - p) === 1) k.muenzeReihe(neben, d + 12, d + 12 + lang / 2, DACH_HOCH + 0.9, 3);
    return lang + 10;
  },
  // Kommt entgegen. Die Spur wird rechtzeitig vorher angekündigt.
  stapler(k, d) {
    const p = k.bewege();
    const sp = k.z.wahl(k.andere(p));
    k.teil('M', sp, d, { hupe: true });
    if (k.z() < 0.3) { const dritte = k.andere(p).find(x => x !== sp); k.teil('W', dritte, d); }
    k.muenzeReihe(p, d - 12, d + 6);
    return 8;
  },
  // Wasserball: kullert von der Seite und ist an der Stelle d in der gewählten Spur. Man kann drüberspringen.
  ball(k, d) {
    const p = k.bewege();
    const sp = k.z.wahl(k.andere(p));
    k.teil('B', sp, d, { von: k.z() < 0.5 ? -1 : 1, schwung: 5 });
    k.muenzeReihe(p, d - 9, d + 3);
    return 8;
  },
  // Schwimmring: Schleudert dich hoch. Oben hängen viele Münzen.
  ring(k, d) {
    const p = k.bewege();
    k.hilfen.push({ typ: 'schleuder', spur: p, d, y: 0, weg: false });
    k.muenzeBogen(p, d + 13, 12, 5.5, 1.5);
    const seite = k.z.wahl(k.andere(p));
    k.teil('J', seite, d + 8);
    return 22;
  },
  // Laterne: schwingt quer. Darunter kann man durchrutschen.
  laterne(k, d) {
    const p = k.bewege();
    const sp = k.z.wahl(k.andere(p));
    k.teil('L', sp, d, { von: sp < 1 ? 1 : -1, schwung: 3.4 });
    k.muenzeReihe(p, d - 9, d + 3);
    return 8;
  },
  // Fischöl: harmlos, aber man rutscht automatisch ein Stück.
  pfuetze(k, d) {
    const p = k.bewege();
    k.hilfen.push({ typ: 'oel', spur: p, d, y: 0, weg: false });
    k.teil('S', p, d + 6);
    k.muenzeReihe(p, d + 1, d + 12, 0.55, 2.4);
    return 12;
  },
  // Welle: kommt auf allen Spuren entgegen und muss übersprungen werden
  welle(k, d) {
    k.teil('Z', 1, d, { breit: true });
    k.muenzeBogen(k.pfad, d, 5, 2);
    return 8;
  },
  // Blitz, Meteorit, Wurfsachen: Ein roter Ring warnt, dann landet es dort
  blitz(k, d) { return fallMuster(k, d, 'blitz'); },
  meteor(k, d) { return fallMuster(k, d, 'meteor'); },
  wurf(k, d) { return fallMuster(k, d, 'wurf'); }
};

function fallMuster(k, d, skin) {
  const p = k.bewege();
  const andere = k.andere(p);
  const eins = k.z.wahl(andere);
  k.teil('F', eins, d, { skin });
  if (k.z() < 0.45) k.teil('F', andere.find(x => x !== eins), d + (k.z() < 0.5 ? 0 : 5), { skin });
  k.muenzeReihe(p, d - 9, d + 3);
  return 8;
}

const LUFT_MIN = 1.06;      // Selbst bei hohem Tempo immer mindestens so viele Sekunden Reaktionszeit

// Erzeugt die Strecke von k.bis bis zur Stelle bis.
function bauAbschnitt(k, bis, plan) {
  let d = k.bis;
  let letztes = '';
  while (d < bis) {
    const fortschritt = begrenzt((d - plan.start) / plan.laenge, 0, 1);
    const tempo = (plan.v0 + (plan.v1 - plan.v0) * fortschritt) * k.stufe.tempo;
    const luft = Math.max(plan.luft * k.stufe.abstand, LUFT_MIN) * plan.weltLuft;
    // Nicht zweimal dasselbe schwere Muster nacheinander
    let name = k.z.wahl(plan.muster);
    if (name === letztes) name = k.z.wahl(plan.muster);
    letztes = name;
    k.welt = plan.welt;
    const braucht = MUSTER_BAU[name](k, d, tempo, luft);
    d += braucht;
    // Hilfe in die Lücke legen
    k.seitHilfe += braucht + tempo * luft;
    if (k.seitHilfe > plan.hilfeAlle) {
      k.seitHilfe = 0;
      const typ = k.z.wahl(plan.hilfeArten);
      k.hilfen.push({ typ, spur: k.pfad, d: d + tempo * luft * 0.45, y: 1.1, weg: false });
    }
    d += tempo * luft;
  }
  k.bis = d;
}

function levelPlan(nr, stufe) {
  const L = LEVEL[nr - 1];
  const w = Math.floor((nr - 1) / 6);
  const arten = ['magnet', 'goldfisch', 'ring', 'stiefel', 'ente'];
  if (nr >= 4) arten.push('broetchen');
  return { start: 0, laenge: L.laenge, v0: L.v0, v1: L.v1, luft: L.luft, muster: L.muster, welt: w, weltLuft: WELTEN[w].luft, hilfeAlle: 170, hilfeArten: arten };
}

function endlosPlan(stufeNr, start) {
  const w = (stufeNr - 1) % WELTEN.length;
  const reihe = LEVEL.slice(w * 6, w * 6 + 6).filter(x => !x.boss);
  const muster = reihe[reihe.length - 1].muster.concat(reihe[reihe.length - 2].muster);
  const v0 = Math.min(13 + (stufeNr - 1) * 2.4, 27);
  return { start, laenge: ENDLOS_WELT_METER, v0, v1: Math.min(v0 + 2.4, 30), luft: Math.max(1.55 - (stufeNr - 1) * 0.07, 1.12), muster, welt: w, weltLuft: WELTEN[w].luft, hilfeAlle: 190, hilfeArten: ['magnet', 'goldfisch', 'ring', 'stiefel', 'ente', 'broetchen'] };
}

// --------------------------- Spielzustand ---------------------------

let s = null;   // Der aktuelle Lauf

function neuerZustand(levelNr, endlos) {
  const stufe = STUFEN[daten.stufe];
  const fig = figurJetzt();
  const f = {
    stufe, fig, levelNr, endlos,
    k: null, plan: null, welt: 0, weltStufe: 1, naechsteWeltBei: 0,
    dist: 0, tempo: 0, x: 0, spur: 1, xVorher: 0, y: 0, vy: 0, boden: 0, amBoden: true, rutsch: 0, sprungNochmal: false,
    tempoFaktor: 1, schutz: 0, stolpern: 0, flug: 0, flugHoehe: 0, zeit: 0, wechselZeit: 9, aufDach: false, warAufDach: false,
    herzen: stufe.herzen, ring: !!fig.startRing, punkte: 0, muenzenHier: 0, kette: 1, kettenStand: 0, getroffenHier: 0,
    magnet: 0, stiefel: 0, goldfisch: 0, teilIndex: 0,
    meldung: null, blase: null, fertig: 0, tot: 0, ergebnis: null, rekordAmStart: fortschritt().rekord,
    talerHier: 0, ziel: Infinity, statBot: { sprung: 0, rutsch: 0, treffer: 0, seite: 0, muenzen: 0 }, angezeigt: {}
  };
  return f;
}

function ladeLevel(nr, endlos = false) {
  const st = s;
  st.levelNr = nr;
  st.endlos = endlos;
  st.dist = 0;
  st.x = 0; st.xVorher = 0; st.spur = 1; st.y = 0; st.vy = 0; st.boden = 0; st.amBoden = true; st.rutsch = 0;
  st.flug = 0; st.flugHoehe = 0; st.schutz = 0; st.stolpern = 0; st.tempoFaktor = 1;
  st.magnet = 0; st.stiefel = 0; st.goldfisch = 0;
  st.muenzenHier = 0; st.getroffenHier = 0; st.teilIndex = 0; st.fertig = 0; st.tot = 0; st.ergebnis = null; st.zeit = 0;
  const seed = endlos ? (Math.random() * 1e9) | 0 : 4021 + nr * 977 + STUFEN_NAMEN.indexOf(daten.stufe) * 31;
  st.k = new Kurs(seed, st.stufe, endlos);
  st.k.bis = LEVEL_START_METER(nr, endlos);
  if (endlos) {
    st.weltStufe = 1;
    st.plan = endlosPlan(1, 0);
    st.welt = 0;
    st.naechsteWeltBei = ENDLOS_WELT_METER;
    bauAbschnitt(st.k, 240, st.plan);
    st.ziel = Infinity;
  } else {
    st.plan = levelPlan(nr, st.stufe);
    st.welt = st.plan.welt;
    bauAbschnitt(st.k, st.plan.laenge - 30, st.plan);
    st.ziel = Math.max(st.plan.laenge, st.k.bis + 30);
    st.k.boegen.push({ d: st.ziel, typ: 'ziel' });
  }
  st.tempo = st.plan.v0 * st.stufe.tempo;
}

function LEVEL_START_METER(nr, endlos) { return endlos ? 70 : LEVEL[nr - 1].lehre ? 70 : 55; }

const istBoss = () => !s.endlos && LEVEL[s.levelNr - 1].boss;

// --------------------------- Eingaben im Spiel ---------------------------

function nachLinks() { lenke(-1); }
function nachRechts() { lenke(1); }
function lenke(richtung) {
  if (!s || s.tot || s.fertig) return;
  const neu = begrenzt(s.spur + richtung, 0, 2);
  if (neu === s.spur) { if (ton) ton.bumm(); return; }
  s.spurVorher = s.spur;
  s.spur = neu;
  s.wechselZeit = 0;
  ton.wusch();
}
function springe() {
  if (!s || s.tot || s.fertig || s.flug > 0) return;
  if (s.amBoden) {
    s.rutsch = 0;
    s.vy = SPRUNG_V * sprungFaktor();
    s.amBoden = false;
    s.sprungNochmal = !!s.fig.doppel;
    s.statBot.sprung++;
    zaehle('sprung');
    ton.hopp();
  } else if (s.sprungNochmal) {
    s.sprungNochmal = false;
    s.vy = SPRUNG_V * 0.85 * sprungFaktor();
    ton.hopp();
  } else {
    s.sprungPuffer = 0.14;   // Kurz vor der Landung gedrückt: Gilt, sobald die Füße unten sind
  }
}
function rutsche() {
  if (!s || s.tot || s.fertig || s.flug > 0) return;
  if (!s.amBoden) s.vy = Math.min(s.vy, -24);   // In der Luft: schnell nach unten
  s.rutsch = RUTSCH_DAUER * (s.fig.rutsch || 1);
  s.statBot.rutsch++;
  zaehle('rutsch');
  ton.rutsch();
}
function sprungFaktor() {
  const w = s ? WELTEN[s.welt] : WELTEN[0];
  return (s.stiefel > 0 ? 1.42 : 1) * (s.fig.sprung || 1) * (w.schwere < 1 ? 0.84 : 1);
}

// --------------------------- Hindernisse: Wo sind sie gerade? ---------------------------

function teilZ(o, dist) {
  if (o.vr) return o.d + (o.d - dist) * o.vr;
  return o.d;
}
function teilX(o, dist) {
  if (o.breit) return 0;
  const x = SPUR_X[o.spur];
  if (o.art === 'B' || o.art === 'L') {
    const rest = o.d - dist;
    if (o.art === 'B') return x + o.von * Math.max(0, rest) * 0.38;   // Kullert ein und bleibt dann weiter rollend
    return x + o.von * Math.sin(Math.max(0, rest) * 0.18) * o.schwung;
  }
  return x;
}
// Die Oberfläche eines Containers an der Stelle dist
function dachHoehe(o, dist) {
  const z = dist - o.d;
  if (z < 0 || z > o.lang) return -1;
  if (o.rampe && z < o.rampe) return o.y1 * (z / o.rampe);
  return o.y1;
}
// Ein fallendes Teil landet kurz bevor der Spieler dort ist
function fallY(o, dist) {
  const rest = o.d - dist - s.tempo * 0.55;
  return rest > 0 ? rest * 1.1 : 0;
}

function sichtbar(o, dist) {
  return dist > o.d - 190 && dist < (o.lang ? o.d + o.lang + 15 : o.d + 15);
}

// --------------------------- Ein Rechenschritt ---------------------------

function schritt(dt) {
  const st = s;
  st.zeit += dt;
  st.wechselZeit += dt;
  if (st.tot > 0) { st.tot += dt; st.tempo *= 1 - 3 * dt; st.dist += st.tempo * dt; bewegeSpieler(dt, true); return; }

  // Tempo
  const fortschrittWert = begrenzt((st.dist - st.plan.start) / st.plan.laenge, 0, 1);
  let ziel = (st.plan.v0 + (st.plan.v1 - st.plan.v0) * fortschrittWert) * st.stufe.tempo;
  st.tempoFaktor = Math.min(1, st.tempoFaktor + dt * 0.5);
  if (st.fertig > 0) { st.fertig += dt; ziel *= Math.max(0.15, 1 - st.fertig * 0.6); }
  st.tempo = ziel * (st.flug > 0 ? 1.35 : 1) * st.tempoFaktor;
  const vorher = st.dist;
  st.dist += st.tempo * dt;
  zaehleMeter(st.dist - vorher);
  punkte((st.dist - vorher) * 1.2);

  // Endlos: Nachschub und Weltwechsel
  if (st.endlos) {
    if (st.k.bis < st.dist + 240) {
      if (st.k.bis >= st.naechsteWeltBei) {
        // Erst wenn alles aus der alten Welt vorbei ist, kommt der Bogen in die nächste
        const bogen = st.k.bis + 22;
        st.weltStufe++;
        st.k.boegen.push({ d: bogen, typ: 'welt', welt: (st.weltStufe - 1) % WELTEN.length });
        st.k.bis = bogen + 38;
        st.naechsteWeltBei = bogen + ENDLOS_WELT_METER;
        st.plan = endlosPlan(st.weltStufe, st.k.bis);
      }
      bauAbschnitt(st.k, st.k.bis + 200, st.plan);
    }
    aufraeumen();
  }

  // Timer
  st.schutz = Math.max(0, st.schutz - dt);
  st.stolpern = Math.max(0, st.stolpern - dt);
  st.magnet = Math.max(0, st.magnet - dt);
  st.stiefel = Math.max(0, st.stiefel - dt);
  st.goldfisch = Math.max(0, st.goldfisch - dt);
  if (st.flug > 0) { st.flug = Math.max(0, st.flug - dt); if (st.flug === 0) { st.schutz = Math.max(st.schutz, 1.2); st.vy = 0; st.amBoden = false; } }
  if (st.rutsch > 0) st.rutsch = Math.max(0, st.rutsch - dt);
  if (st.meldung) { st.meldung.zeit -= dt; if (st.meldung.zeit <= 0) st.meldung = null; }
  if (st.blase) { st.blase.zeit -= dt; if (st.blase.zeit <= 0) st.blase = null; }

  bewegeSpieler(dt, false);
  pruefeTeile();
  pruefeSammeln(dt);

  // Weltwechsel im Dauerlauf
  for (const b of st.k.boegen) {
    if (b.typ === 'welt' && !b.durch && st.dist >= b.d) {
      b.durch = true;
      st.welt = b.welt;
      melde(WELTEN[st.welt].name, 2.2);
      if (grafikBereit) weltWechselBild(st.welt);
      musik.starte(st.welt, false);
      ton.fanfare();
    }
  }

  // Ziel
  if (!st.fertig && st.dist >= st.ziel) levelFertig();
  if (st.fertig > 2.2 && !st.ergebnis) { st.ergebnis = 'geschafft'; }
}

function bewegeSpieler(dt, stumm) {
  const st = s;
  st.xVorher = st.x;
  const zielX = SPUR_X[st.spur];
  const v = WECHSEL_TEMPO * (st.fig.spurTempo || 1);
  if (st.x < zielX) st.x = Math.min(zielX, st.x + v * dt);
  else if (st.x > zielX) st.x = Math.max(zielX, st.x - v * dt);

  if (st.flug > 0) {
    st.flugHoehe += (6.2 - st.flugHoehe) * Math.min(1, dt * 4);
    st.y = st.flugHoehe;
    return;
  }
  st.flugHoehe = 0;
  if (st.sprungPuffer > 0) st.sprungPuffer -= dt;

  // Boden unter den Füßen
  const boden = bodenUnter(st.x, st.dist, st.y);
  st.boden = boden;
  const schwere = SCHWERE * WELTEN[st.welt].schwere * (st.vy < 0 ? (st.fig.schweben || 1) : 1);
  st.vy -= schwere * dt;
  st.y += st.vy * dt;
  if (st.y <= boden) {
    if (!st.amBoden && st.vy < -8 && !stumm) { ton.landen(); staub(); }
    st.y = boden;
    st.vy = 0;
    st.amBoden = true;
    st.sprungNochmal = false;
    if (st.sprungPuffer > 0) { st.sprungPuffer = 0; springe(); }
  } else if (st.y > boden + 0.25) {
    st.amBoden = false;
  }
  st.aufDach = st.amBoden && boden > DACH_HOCH - 0.2;
  if (st.aufDach && !st.warAufDach) zaehle('dach');
  st.warAufDach = st.aufDach;
}

function bodenUnter(x, dist, y) {
  let boden = 0;
  const k = s.k;
  for (let i = s.teilIndex; i < k.teile.length; i++) {
    const o = k.teile[i];
    if (o.d > dist + 1) break;
    if (o.art !== 'C') continue;
    if (Math.abs(x - SPUR_X[o.spur]) > 1.1) continue;
    const h = dachHoehe(o, dist);
    if (h < 0) continue;
    if (y >= h - 0.7 && h > boden) boden = h;
  }
  return boden;
}

function pruefeTeile() {
  const st = s;
  const k = st.k;
  // Schon lange vorbei? Dann nicht mehr anschauen.
  while (st.teilIndex < k.teile.length) {
    const o = k.teile[st.teilIndex];
    const ende = o.lang ? o.d + o.lang : o.d + 8;
    if (ende < st.dist - 14) st.teilIndex++; else break;
  }
  const h = st.rutsch > 0 ? RUTSCH_H : STEH_H;
  const unten = st.y, oben = st.y + h;
  for (let i = st.teilIndex; i < k.teile.length; i++) {
    const o = k.teile[i];
    const z = teilZ(o, st.dist);
    if (!o.vr && o.d > st.dist + 3 && o.art !== 'C') { if (o.d > st.dist + 60) break; continue; }
    if (o.weg) continue;
    const tiefe = o.lang ? 0 : o.t;
    if (o.art === 'C') {
      if (st.flug > 0) continue;
      const dach = dachHoehe(o, st.dist);
      if (dach < 0) continue;
      if (Math.abs(st.x - SPUR_X[o.spur]) >= BREITE_TREFFER) continue;
      if (st.y >= dach - 0.7) continue;
      if (st.schutz > 0) continue;
      if (Math.abs(st.xVorher - SPUR_X[o.spur]) >= BREITE_TREFFER - 0.02 || st.dist - o.d > 1) seitenStoss();
      else treffer(o);
      continue;
    }
    if (Math.abs(z - st.dist) > tiefe + 0.3) {
      // Vorbei: Knapp ausgewichen?
      if (!o.vorbei && st.dist > z + tiefe + 0.3) {
        o.vorbei = true;
        if (st.flug <= 0) knappPruefen(o);
      }
      continue;
    }
    if (st.flug > 0) continue;
    if (o.art === 'F' && fallY(o, st.dist) > 2) continue;
    const ox = teilX(o, st.dist);
    if (!o.breit && Math.abs(st.x - ox) >= BREITE_TREFFER) continue;
    if (oben <= o.y0 + 0.02 || unten >= o.y1) continue;
    if (st.schutz > 0) continue;
    if (!o.breit && Math.abs(st.xVorher - ox) >= BREITE_TREFFER - 0.02 && st.wechselZeit < 0.3) seitenStoss();
    else treffer(o);
  }
}

function knappPruefen(o) {
  const st = s;
  let knapp = false;
  if (o.art === 'J' && st.y > 0.4 && st.y - o.y1 < 0.55 && Math.abs(st.x - SPUR_X[o.spur]) < 1) knapp = true;
  if (o.art === 'Z' && st.y - o.y1 < 0.6) knapp = true;
  if ((o.art === 'S' || o.art === 'L') && st.rutsch > 0 && st.rutsch < 0.2 && Math.abs(st.x - teilX(o, st.dist)) < 1) knapp = true;
  if (!knapp && (o.art === 'W' || o.art === 'M' || o.art === 'F') && st.wechselZeit < 0.42 && Math.abs(st.x - SPUR_X[o.spur]) < SPUR + 0.3) knapp = true;
  if (knapp) {
    zaehle('knapp');
    kettenPlus(10);
    punkte(30, true);
    melde('KNAPP! +' + zahl(30 * aktuellerFaktor()), 0.7);
  } else {
    kettenPlus(3);
  }
}

function aktuellerFaktor() {
  return s.stufe.faktor * s.kette * (s.goldfisch > 0 ? 2 : 1) * (s.fig.punkte || 1);
}
function punkte(wert) { s.punkte += wert * aktuellerFaktor(); }

function kettenPlus(n) {
  const st = s;
  st.kettenStand += n;
  const schwelle = 25 + st.kette * 15;
  if (st.kettenStand >= schwelle && st.kette < 9) {
    st.kettenStand = 0;
    st.kette++;
    ton.kette(st.kette);
    melde('PUNKTE x' + st.kette, 0.9);
  }
}

function melde(text, zeit = 1.4) { s.meldung = { text, zeit, voll: zeit }; }
function sage(text, zeit = 1.5) { s.blase = { text, zeit }; }

// Seitlich dagegen: tut nicht weh, kostet aber die Punktekette und schubst zurück
function seitenStoss() {
  const st = s;
  st.spur = st.spurVorher != null ? st.spurVorher : st.spur;
  st.kette = Math.max(1, st.kette - 1);
  st.kettenStand = 0;
  st.stolpern = 0.35;
  st.schutz = Math.max(st.schutz, 0.35);
  st.tempoFaktor = Math.min(st.tempoFaktor, 0.82);
  st.statBot.seite++;
  ton.bumm();
  sage('HOPPLA!', 0.8);
  wackle(0.25);
}

function treffer(o) {
  const st = s;
  if (st.ring) {
    st.ring = false;
    st.schutz = 1.6;
    if (o.art === 'C') { st.y = o.y1 + 0.05; st.vy = 3; st.amBoden = false; }
    melde('RING GERETTET!', 1.1);
    ton.rettung();
    wackle(0.3);
    if (o.art !== 'C') o.weg = st.zeit;
    return;
  }
  st.herzen--;
  st.getroffenHier++;
  st.statBot.treffer++;
  st.kette = Math.max(1, Math.ceil(st.kette / 2));
  st.kettenStand = 0;
  st.schutz = 1.9;
  st.stolpern = 0.7;
  st.tempoFaktor = 0.45;
  st.rutsch = 0;
  if (o.art !== 'C' && o.art !== 'W') o.weg = st.zeit;
  // Gegen einen Container: Die Figur kraxelt oben drauf, statt drin festzustecken
  if (o.art === 'C') { st.y = o.y1 + 0.05; st.vy = 3; st.amBoden = false; }
  sage(st.fig.treffer[Math.floor(Math.random() * st.fig.treffer.length)], 1.2);
  ton.autsch();
  wackle(0.7);
  if (st.herzen <= 0) {
    st.tot = 0.001;
    st.vy = 7;
    st.amBoden = false;
    ton.verloren();
    musik.stoppe();
  }
}

function pruefeSammeln(dt) {
  const st = s;
  const k = st.k;
  // Münzen
  const reichweite = st.magnet > 0 ? 7 : (st.fig.anziehen || 0);
  for (let i = k.muenzen.length - 1; i >= 0; i--) {
    const m = k.muenzen[i];
    if (m.weg) continue;
    const abstand = m.d - st.dist;
    if (abstand > 30) continue;
    if (abstand < -6) continue;
    const mx = m.magX !== undefined ? m.magX : SPUR_X[m.spur];
    const my = m.y + 0;
    const spielerY = st.y + 0.9;
    if (reichweite && abstand < 24 && abstand > -2) {
      const dx = st.x - mx, dy = spielerY - my;
      const nah = st.magnet > 0 || (Math.abs(dx) < reichweite && abstand < reichweite + 5);
      if (nah) {
        m.magX = mx + dx * Math.min(1, dt * 10);
        m.magY = (m.magY || 0) + dy * Math.min(1, dt * 10);
        m.y += dy * Math.min(1, dt * 10);
        m.d -= abstand * Math.min(1, dt * 9);
      }
    }
    if (Math.abs(abstand) < 1.1 + st.tempo * dt && Math.abs(st.x - mx) < 1.25 && Math.abs(spielerY - my) < 1.7) {
      m.weg = true;
      m.wegZeit = st.zeit;
      nimmMuenze(m);
    }
  }
  // Hilfen
  for (const h of k.hilfen) {
    if (h.weg) continue;
    const abstand = h.d - st.dist;
    if (abstand > 3 || abstand < -3) continue;
    if (Math.abs(abstand) > 0.9 + st.tempo * dt) continue;
    if (Math.abs(st.x - SPUR_X[h.spur]) > 1.3) continue;
    if (h.typ === 'schleuder') {
      if (st.y > 1.5) continue;
      h.weg = true; h.benutzt = st.zeit;
      st.vy = 19 * (WELTEN[st.welt].schwere < 1 ? 0.8 : 1);
      st.amBoden = false;
      st.rutsch = 0;
      ton.boing();
      melde('BOING!', 0.8);
      continue;
    }
    if (h.typ === 'oel') {
      if (st.y > 0.5) continue;
      h.benutzt = st.zeit; h.weg = true;
      st.rutsch = RUTSCH_DAUER * 1.45;
      ton.flutsch();
      sage('FLUTSCH!', 0.8);
      kettenPlus(5);
      continue;
    }
    if (Math.abs(st.y + 0.9 - h.y) > 2.4 && st.flug <= 0) continue;
    h.weg = true;
    nimmHilfe(h.typ);
  }
}

function nimmMuenze() {
  const st = s;
  st.muenzenHier++;
  st.statBot.muenzen++;
  const wert = st.fig.taler || 1;
  st.talerHier += wert;
  daten.taler += wert;
  punkte(10);
  kettenPlus(1);
  zaehle('muenzen');
  ton.muenze(st.zeit);
  if (grafikBereit) funken(0.9);
}

function nimmHilfe(typ) {
  const st = s;
  zaehle('hilfe');
  ton.hilfe();
  if (typ === 'broetchen') {
    st.herzen = Math.min(st.herzen + 1, HERZEN_MAX);
    sage('LECKER!', 1.2);
    melde('EIN HERZ MEHR', 1.2);
    return;
  }
  if (typ === 'ring') { st.ring = true; melde('RETTUNGSRING', 1.2); return; }
  if (typ === 'magnet') st.magnet = hilfeDauer('magnet');
  if (typ === 'stiefel') st.stiefel = hilfeDauer('stiefel');
  if (typ === 'goldfisch') st.goldfisch = hilfeDauer('goldfisch');
  if (typ === 'ente') {
    st.flug = hilfeDauer('ente');
    st.rutsch = 0;
    // Oben hängt eine Münzspur
    const k = st.k;
    const bis = st.dist + st.flug * st.tempo * 1.2;
    let spur = st.spur;
    for (let d = st.dist + 16; d < bis; d += 3) {
      if (Math.random() < 0.09) spur = begrenzt(spur + (Math.random() < 0.5 ? -1 : 1), 0, 2);
      k.muenzen.push({ spur, d, y: 7, weg: false, bonus: true });
      k.muenzenGesamt++;
    }
    ton.rakete();
  }
  melde(grossName(HILFEN[typ].name), 1.2);
}

// Teile, die weit hinter dem Spieler liegen, werden gelöscht (nur im endlosen Lauf wichtig)
function aufraeumen() {
  const st = s, k = st.k;
  if (st.zeit < 8 || Math.floor(st.dist) % 200 !== 0) return;
  const grenze = st.dist - 40;
  const ende = o => (o.lang ? o.d + o.lang : o.d);
  let weg = 0;
  while (weg < k.teile.length && ende(k.teile[weg]) < grenze && weg < st.teilIndex) weg++;
  if (weg > 0) { k.teile.splice(0, weg); st.teilIndex -= weg; }
  k.muenzen = k.muenzen.filter(m => m.d > grenze);
  k.hilfen = k.hilfen.filter(m => m.d > grenze);
  k.boegen = k.boegen.filter(m => m.d > grenze);
}

// --------------------------- Level geschafft ---------------------------

function levelFertig() {
  const st = s;
  st.fertig = 0.001;
  st.spur = 1;
  const f = fortschritt();
  const coinsAnteil = st.muenzenHier / Math.max(1, st.k.muenzenGesamt);
  let sterne = 1;
  if (coinsAnteil >= 0.6) sterne++;
  if (st.getroffenHier === 0) sterne++;
  st.sterneHier = sterne;
  st.coinsAnteil = coinsAnteil;
  const nr = st.levelNr;
  const bonus = 500 + nr * 80 + st.herzen * 150;
  st.bonus = Math.round(bonus * st.stufe.faktor);
  st.punkte += st.bonus;
  const vorherFrei = Object.keys(FIGUREN).filter(figurFrei);
  f.sterne[nr] = Math.max(f.sterne[nr] || 0, sterne);
  if (nr >= f.frei) f.frei = Math.min(nr + 1, LEVEL.length + 1);
  merkeRekord();
  zaehle('level');
  st.neuFrei = Object.keys(FIGUREN).filter(n => figurFrei(n) && !vorherFrei.includes(n));
  speichere();
  ton.geschafft();
  musik.stoppe();
  if (istBoss()) sage(SPRUECHE.gisela[Math.floor((nr - 1) / 6)][0], 2.2);
}

function merkeRekord() {
  const f = fortschritt();
  if (s && s.punkte > f.rekord) {
    f.rekord = Math.round(s.punkte);
    f.rekordLevel = s.endlos ? s.weltStufe : s.levelNr;
  }
  speichere();
}

// --------------------------- Aufträge ---------------------------

let meterSpeicher = 0;
function zaehleMeter(m) {
  meterSpeicher += m;
  if (meterSpeicher >= 10) { zaehle('meter', Math.floor(meterSpeicher)); meterSpeicher = meterSpeicher % 1; }
}
function zaehle(art, n = 1) {
  const a = daten.auftraege;
  for (let i = 0; i < a.offen.length; i++) {
    const offen = a.offen[i];
    const def = auftragDef(offen.nr);
    if (def.art !== art) continue;
    offen.stand += n;
    if (offen.stand >= def.ziel) {
      daten.taler += def.taler;
      melde('AUFTRAG: +' + def.taler + ' TALER', 2);
      ton.fanfare();
      a.offen[i] = { nr: a.naechster++, stand: 0 };
      speichere();
    }
  }
}
// Sind alle Aufträge durch, beginnen sie von vorn, nur größer
function auftragDef(nr) {
  const n = nr % AUFTRAEGE.length;
  const runde = Math.floor(nr / AUFTRAEGE.length);
  const a = AUFTRAEGE[n];
  if (!runde) return a;
  const mal = 1 + runde;
  return { art: a.art, ziel: a.ziel * mal, taler: a.taler * mal, text: a.text.replace(/[\d.]+/, zahl(a.ziel * mal)) };
}
