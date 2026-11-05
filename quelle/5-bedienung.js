// --------------------------- Ton ---------------------------

const ton = {
  ctx: null,
  an() {
    if (!this.ctx) {
      const AudioClass = window.AudioContext || window.webkitAudioContext;
      if (AudioClass) this.ctx = new AudioClass();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  },
  piep(frequenz, dauer, lautstaerke = 0.05, art = 'square', start = 0, ziel = 0) {
    if (!daten.ton || !this.ctx || this.ctx.state !== 'running') return;
    const jetzt = this.ctx.currentTime + start;
    const osc = this.ctx.createOscillator();
    const hull = this.ctx.createGain();
    osc.type = art;
    osc.frequency.setValueAtTime(frequenz, jetzt);
    if (ziel) osc.frequency.exponentialRampToValueAtTime(ziel, jetzt + dauer);
    hull.gain.setValueAtTime(lautstaerke, jetzt);
    hull.gain.exponentialRampToValueAtTime(0.0008, jetzt + dauer);
    osc.connect(hull).connect(this.ctx.destination);
    osc.start(jetzt);
    osc.stop(jetzt + dauer + 0.02);
  },
  muenzZeit: 0, muenzStufe: 0,
  // Viele Münzen hintereinander klingen immer höher
  muenze(zeit) {
    this.muenzStufe = zeit - this.muenzZeit < 0.55 ? Math.min(this.muenzStufe + 1, 14) : 0;
    this.muenzZeit = zeit;
    const f = 880 * Math.pow(2, this.muenzStufe / 12);
    this.piep(f, 0.05, 0.022, 'square');
    this.piep(f * 1.5, 0.09, 0.02, 'square', 0.04);
  },
  wusch() { this.piep(520, 0.09, 0.016, 'triangle', 0, 240); },
  hopp() { this.piep(300, 0.14, 0.03, 'square', 0, 740); },
  rutsch() { this.piep(420, 0.2, 0.02, 'sawtooth', 0, 150); },
  landen() { this.piep(140, 0.07, 0.03, 'triangle', 0, 70); },
  bumm() { this.piep(170, 0.11, 0.05, 'square', 0, 90); },
  autsch() { this.piep(240, 0.3, 0.09, 'sawtooth', 0, 55); this.piep(110, 0.24, 0.06, 'square', 0.02, 45); },
  rettung() { [392, 523, 392].forEach((f, i) => this.piep(f, 0.1, 0.05, 'square', i * 0.07)); },
  hilfe() { [523, 659, 784, 1047].forEach((f, i) => this.piep(f, 0.09, 0.04, 'square', i * 0.06)); },
  rakete() { this.piep(180, 1, 0.05, 'sawtooth', 0, 900); },
  kette(n) { const f = 523 * Math.pow(2, n / 12); this.piep(f, 0.09, 0.04, 'square'); this.piep(f * 1.5, 0.14, 0.04, 'square', 0.08); },
  boing() { this.piep(200, 0.35, 0.05, 'sine', 0, 980); },
  flutsch() { this.piep(800, 0.22, 0.035, 'sine', 0, 180); },
  hupe() { this.piep(330, 0.14, 0.04, 'square'); this.piep(262, 0.26, 0.04, 'square', 0.16); },
  donner() { this.piep(1800, 0.05, 0.05, 'sawtooth', 0, 200); this.piep(80, 0.5, 0.09, 'sawtooth', 0.02, 36); },
  rumms() { this.piep(150, 0.2, 0.07, 'square', 0, 50); },
  fanfare() { [659, 784, 1047, 1319].forEach((f, i) => this.piep(f, 0.12, 0.05, 'square', i * 0.08)); },
  verloren() { [392, 330, 262, 196].forEach((f, i) => this.piep(f, 0.17, 0.06, 'square', i * 0.12)); },
  geschafft() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.piep(f, 0.13, 0.055, 'square', i * 0.09)); },
  zaehlen(n) { this.piep(n === 0 ? 880 : 440, 0.14, 0.05, 'square'); }
};

const musik = {
  lied: null, schritt: 0, naechste: 0, uhr: null, schnell: 1,
  starte(weltNr, boss) {
    this.stoppe();
    if (!ton.ctx) return;
    this.lied = MUSIK[weltNr % MUSIK.length];
    this.schnell = boss ? 1.14 : 1;
    this.schritt = 0;
    this.naechste = ton.ctx.currentTime + 0.1;
    this.uhr = setInterval(() => this.takt(), 60);
  },
  stoppe() {
    if (this.uhr) clearInterval(this.uhr);
    this.uhr = null;
  },
  takt() {
    if (!ton.ctx || ton.ctx.state !== 'running') return;
    const jetzt = ton.ctx.currentTime;
    const dauer = 60 / (this.lied.bpm * this.schnell) / 2;
    if (this.naechste < jetzt) this.naechste = jetzt + 0.02;
    while (this.naechste < jetzt + 0.2) {
      if (daten.musik) this.note(this.schritt, this.naechste - jetzt, dauer);
      this.schritt++;
      this.naechste += dauer;
    }
  },
  note(nr, start, dauer) {
    const hz = n => 440 * Math.pow(2, (n - 69) / 12);
    const l = this.lied;
    const takt = Math.floor(nr / 8);
    const bass = l.bass[takt % l.bass.length];
    if (nr % 2 === 0) ton.piep(hz(nr % 4 === 0 ? bass : bass + 12), dauer * 1.6, 0.03, 'triangle', start);
    let hoehe = 0;
    if (l.lied) hoehe = l.lied[nr % l.lied.length];
    else {
      const akkord = l.akkorde[takt % l.akkorde.length];
      const folge = [0, 1, 2, 1, 2, 0, 1, 2];
      hoehe = akkord[folge[nr % 8]] + (nr % 16 >= 12 ? 12 : 0);
    }
    if (hoehe) ton.piep(hz(hoehe), dauer * 0.85, l.weich ? 0.02 : 0.013, l.weich ? 'triangle' : 'square', start);
  }
};

// --------------------------- Hauptschleife ---------------------------

let modus = 'menue';      // menue, fenster, lauf, zaehlen
let letzteZeit = 0, vorrat = 0, zaehlRest = 0, zaehlAnzeige = -1;

function schleife(zeit) {
  requestAnimationFrame(schleife);
  let dt = (zeit - letzteZeit) / 1000;
  letzteZeit = zeit;
  if (!(dt > 0)) dt = 1 / 60;
  dt = Math.min(dt, 0.05);

  if (modus === 'lauf') {
    vorrat += dt;
    while (vorrat >= TAKT) {
      schritt(TAKT);
      vorrat -= TAKT;
      if (modus !== 'lauf') break;
    }
    if (s.tot > 1.4 && modus === 'lauf') zeigeEnde();
    else if (s.ergebnis === 'geschafft' && modus === 'lauf') zeigeGeschafft();
  } else if (modus === 'menue') {
    s.tempo = 8;
    s.dist += 8 * dt;
    s.stolpern = 0;
    if (Array.isArray(s.k.muenzen) && s.k.muenzen.length === 0) { /* Das Menü bleibt ruhig */ }
  } else if (modus === 'zaehlen') {
    zaehlRest -= dt;
    const n = Math.ceil(zaehlRest);
    if (n !== zaehlAnzeige) { zaehlAnzeige = n; if (n > 0) { $('zaehler').textContent = n; $('zaehler').hidden = false; ton.zaehlen(n); } }
    if (zaehlRest <= 0) { $('zaehler').hidden = true; ton.zaehlen(0); modus = 'lauf'; vorrat = 0; }
  }
  if (grafikBereit) {
    if (modus === 'lauf' || modus === 'menue' || modus === 'zaehlen' || modus === 'fenster') zeichneBild(modus === 'fenster' || modus === 'zaehlen' ? 0.0001 : dt);
  }
  zeigeHud();
}

// --------------------------- Anzeige im Spiel ---------------------------

let hudStand = '';
let lehrText = '';
let lehrRest = 0;

const LEHRE = {
  J: ['Gelb-schwarz: Wisch nach OBEN und spring drüber!', 'Gelb-schwarz: PFEIL HOCH und drüberspringen!'],
  S: ['Rot-weiß: Wisch nach UNTEN und rutsch drunter durch!', 'Rot-weiß: PFEIL RUNTER und drunter durchrutschen!'],
  W: ['Alles andere: Wisch zur SEITE und weich aus!', 'Alles andere: PFEIL LINKS oder RECHTS und ausweichen!'],
  C: ['Über die Rampe aufs Dach!', 'Über die Rampe aufs Dach!'],
  M: ['Das kommt dir entgegen. WEG DA!', 'Das kommt dir entgegen. WEG DA!'],
  F: ['Roter Ring: Dort landet gleich etwas!', 'Roter Ring: Dort landet gleich etwas!'],
  B: ['Der Ball kullert in deine Bahn!', 'Der Ball kullert in deine Bahn!'],
  L: ['Laterne schwingt. Rutsch drunter durch!', 'Laterne schwingt. Rutsch drunter durch!'],
  Z: ['Welle von vorne: Wisch nach OBEN!', 'Welle von vorne: PFEIL HOCH!']
};

function zeigeLehre() {
  const st = s;
  if (!st.k || modus !== 'lauf') return;
  for (let i = st.teilIndex; i < st.k.teile.length; i++) {
    const o = st.k.teile[i];
    if (o.d > st.dist + st.tempo * 2.4) break;
    if (o.d < st.dist) continue;
    if (!LEHRE[o.art] || daten.gesehen[o.art]) continue;
    daten.gesehen[o.art] = true;
    speichere();
    lehrText = LEHRE[o.art][hatTouch ? 0 : 1];
    lehrRest = 2.6;
    break;
  }
}

function zeigeHud() {
  const st = s;
  const istSpiel = modus === 'lauf' || modus === 'zaehlen';
  const anzeige = $('hud');
  anzeige.hidden = !(istSpiel || (modus === 'fenster' && st && st.k && !$('fPause').hidden));
  if (anzeige.hidden) return;
  if (modus === 'lauf') { zeigeLehre(); if (lehrRest > 0) lehrRest -= 1 / 60; }
  const stand = [
    Math.floor(st.punkte), st.kette, st.goldfisch > 0, st.muenzenHier, st.herzen, st.ring,
    st.meldung && st.meldung.text, st.blase && st.blase.text, lehrRest > 0 ? lehrText : '',
    Math.floor((st.magnet + 0.99)), Math.floor(st.stiefel + 0.99), Math.floor(st.goldfisch + 0.99), Math.floor(st.flug + 0.99), Math.round((st.dist / (st.endlos ? st.naechsteWeltBei : st.ziel)) * 200)
  ].join('|');
  if (stand === hudStand) return;
  hudStand = stand;
  $('punkte').textContent = zahl(st.punkte);
  $('muenzen').textContent = zahl(st.muenzenHier);
  const faktor = st.kette * (st.goldfisch > 0 ? 2 : 1);
  $('kette').textContent = 'x' + faktor;
  $('kette').classList.toggle('heiss', faktor >= 4);
  const herz = $('herzen');
  const hText = '<svg aria-hidden="true"><use href="#herz"/></svg>'.repeat(Math.max(0, st.herzen)) + (st.ring ? '<svg class="ringsymbol" aria-hidden="true"><use href="#ringsym"/></svg>' : '');
  if (herz.dataset.t !== hText) { herz.dataset.t = hText; herz.innerHTML = hText; }
  herz.setAttribute('aria-label', st.herzen + ' Herzen');
  $('wegBalken').style.width = begrenzt(st.endlos ? (st.dist - (st.naechsteWeltBei - ENDLOS_WELT_METER)) / ENDLOS_WELT_METER : st.dist / st.ziel, 0, 1) * 100 + '%';
  $('wegName').textContent = st.endlos ? WELTEN[st.welt].name + ' · RUNDE ' + st.weltStufe : 'LEVEL ' + st.levelNr + (istBoss() ? ' · GISELA' : '');
  zeigeHilfenLeiste();
  const meld = $('meldung');
  const lehr = lehrRest > 0 ? lehrText : '';
  $('lehre').hidden = !lehr;
  if (lehr) $('lehre').textContent = lehr;
  if (st.meldung) { meld.textContent = st.meldung.text; meld.hidden = false; }
  else meld.hidden = true;
  const b = $('blase');
  if (st.blase) { b.textContent = st.blase.text; b.hidden = false; }
  else b.hidden = true;
}

function zeigeHilfenLeiste() {
  const st = s;
  const eintraege = [['magnet', st.magnet], ['ente', st.flug], ['stiefel', st.stiefel], ['goldfisch', st.goldfisch]];
  const leiste = $('hilfenLeiste');
  const html = eintraege.filter(e => e[1] > 0).map(([art, rest]) => {
    const voll = hilfeDauer(art);
    return '<span class="pille" style="--f:' + HILFEN[art].farbe + '"><b>' + HILFEN[art].name + '</b><i style="width:' + Math.round(begrenzt(rest / voll, 0, 1) * 100) + '%"></i></span>';
  }).join('');
  if (leiste.dataset.t !== html) { leiste.dataset.t = html; leiste.innerHTML = html; }
}

function zeigeUebergang() {
  const u = $('uebergang');
  u.classList.remove('an');
  void u.offsetWidth;
  u.classList.add('an');
}

// --------------------------- Eingabe ---------------------------

const hatTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
let wischStart = null;
const WISCH_MIN = 22;

// Eine Wischbewegung ist genau eine Aktion. Eine weitere gibt es erst, wenn der Finger die Richtung ändert.
function wischRichtung(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'rechts' : 'links';
  return dy < 0 ? 'hoch' : 'runter';
}
function wischAusfuehren(richtung) {
  if (richtung === 'rechts') nachRechts();
  else if (richtung === 'links') nachLinks();
  else if (richtung === 'hoch') springe();
  else rutsche();
}

$('bild').addEventListener('pointerdown', e => {
  if (modus !== 'lauf') return;
  ton.an();
  wischStart = { x: e.clientX, y: e.clientY, id: e.pointerId, letzte: '' };
  try { $('bild').setPointerCapture(e.pointerId); } catch (fehler) {}
  e.preventDefault();
});
$('bild').addEventListener('pointermove', e => {
  if (!wischStart || e.pointerId !== wischStart.id) return;
  const dx = e.clientX - wischStart.x, dy = e.clientY - wischStart.y;
  if (Math.hypot(dx, dy) < WISCH_MIN) return;
  const richtung = wischRichtung(dx, dy);
  wischStart.x = e.clientX;
  wischStart.y = e.clientY;
  if (richtung === wischStart.letzte) return;
  wischStart.letzte = richtung;
  if (modus === 'lauf') wischAusfuehren(richtung);
});
const wischEnde = () => { wischStart = null; };
$('bild').addEventListener('pointerup', wischEnde);
$('bild').addEventListener('pointercancel', wischEnde);

// Auch das Mausrad und die Tastatur funktionieren
document.addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  const k = e.key;
  if (k === 'm' || k === 'M') { schalteTon(); return; }
  if (k === 'p' || k === 'P' || k === 'Escape') {
    if (modus === 'lauf' || modus === 'zaehlen') pausiere();
    else if (modus === 'fenster' && !$('fPause').hidden) weiter();
    return;
  }
  if (modus !== 'lauf') return;
  if (e.repeat) return;
  ton.an();
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') { nachLinks(); e.preventDefault(); }
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') { nachRechts(); e.preventDefault(); }
  else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ') { springe(); e.preventDefault(); }
  else if (k === 'ArrowDown' || k === 's' || k === 'S' || k === 'Shift') { rutsche(); e.preventDefault(); }
});

document.addEventListener('visibilitychange', () => { if (document.hidden && (modus === 'lauf' || modus === 'zaehlen')) pausiere(); });
window.addEventListener('blur', () => { if (modus === 'lauf' || modus === 'zaehlen') pausiere(); });
window.addEventListener('resize', passeGroesseAn);
window.addEventListener('orientationchange', () => setTimeout(passeGroesseAn, 200));
// Kein Rauszoomen und kein Zurück-Wischen
document.addEventListener('touchmove', e => { if (modus === 'lauf') e.preventDefault(); }, { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());

// --------------------------- Fenster ---------------------------

const FENSTER = ['fStart', 'fLevels', 'fFiguren', 'fWerkstatt', 'fAuftraege', 'fListe', 'fHilfe', 'fPause', 'fGeschafft', 'fEnde', 'fTeilen'];
let vorTeilen = 'fStart';

function zeigeFenster(name) {
  if (modus !== 'menue' || name === 'fPause' || name === 'fGeschafft' || name === 'fEnde') {
    if (!['fStart', 'fLevels', 'fFiguren', 'fWerkstatt', 'fAuftraege', 'fListe', 'fHilfe'].includes(name) || modus === 'lauf') modus = 'fenster';
  }
  musik.stoppe();
  wischStart = null;
  document.body.classList.remove('imSpiel');
  document.activeElement && document.activeElement.blur();
  $('fenster').hidden = false;
  $('zaehler').hidden = true;
  $('fenster').classList.toggle('imMenue', modus === 'menue');
  for (const f of FENSTER) $(f).hidden = f !== name;
  $('fenster').scrollTop = 0;
  if (name === 'fStart') baueStart();
  if (name === 'fLevels') baueLevels();
  if (name === 'fFiguren') baueFiguren();
  if (name === 'fWerkstatt') baueWerkstatt();
  if (name === 'fAuftraege') baueAuftraege();
  if (name === 'fListe') baueListe();
  if (name === 'fHilfe') baueHilfe();
  if (name === 'fPause') zeigeMusikKnopf();
  if (!hatTouch) {
    const knopf = $(name).querySelector('.btn.main, .btn');
    if (knopf) knopf.focus({ preventScroll: true });
  }
}

function schliesseFenster() {
  $('fenster').hidden = true;
  modus = 'lauf';
  document.body.classList.add('imSpiel');
  document.activeElement && document.activeElement.blur();
  letzteZeit = performance.now();
  vorrat = 0;
  hudStand = '';
  musik.starte(s.welt, istBoss());
}

function baueStufenKnoepfe() {
  for (const gruppe of document.querySelectorAll('.stufen')) {
    gruppe.textContent = '';
    for (const [schluessel, stufe] of Object.entries(STUFEN)) {
      const k = document.createElement('button');
      k.type = 'button';
      k.textContent = stufe.name;
      k.dataset.stufe = schluessel;
      k.addEventListener('click', () => waehleStufe(schluessel));
      gruppe.append(k);
    }
  }
}

function waehleStufe(schluessel) {
  daten.stufe = schluessel;
  speichere();
  zeigeStufe();
  if (!$('fStart').hidden) baueStart();
  if (!$('fLevels').hidden) baueLevels();
  if (!$('fListe').hidden) baueListe();
}

function zeigeStufe() {
  for (const k of document.querySelectorAll('.stufen button')) {
    k.setAttribute('aria-pressed', String(k.dataset.stufe === daten.stufe));
  }
  for (const t of document.querySelectorAll('.js-stufentext')) t.textContent = STUFEN[daten.stufe].text;
  for (const t of document.querySelectorAll('.js-rekord')) t.textContent = zahl(fortschritt().rekord);
  for (const t of document.querySelectorAll('.js-taler')) t.textContent = zahl(daten.taler);
}

let offenesDuell = null;

function baueStart() {
  zeigeStufe();
  const f = fortschritt();
  const duell = offenesDuell && offenesDuell.stufe === daten.stufe ? offenesDuell : null;
  $('duell').hidden = !offenesDuell;
  if (offenesDuell) {
    $('duellTitel').textContent = grossName(offenesDuell.name) + ' FORDERT DICH HERAUS';
    $('duellText').textContent = zahl(offenesDuell.punkte) + ' Punkte bis Level ' + offenesDuell.level + ' auf Stufe ' + STUFEN[offenesDuell.stufe].name + '. Schaffst du mehr?';
  }
  const ziel = Math.min(f.frei, LEVEL.length);
  $('losKnopf').textContent = duell ? 'Herausforderung annehmen' : f.frei > 1 ? 'Weiter ab Level ' + ziel : 'Spielen';
  $('losKnopf').dataset.level = ziel;
  $('startFigur').textContent = figurJetzt().name;
  $('figurKnopfText').textContent = 'Figuren';
}

function baueLevels() {
  zeigeStufe();
  const liste = $('levelListe');
  liste.textContent = '';
  const f = fortschritt();
  for (let w = 0; w < WELTEN.length; w++) {
    const kopf = document.createElement('p');
    kopf.className = 'welt';
    const punkt = document.createElement('i');
    punkt.style.background = WELTEN[w].farbe;
    kopf.append(punkt, WELTEN[w].name);
    liste.append(kopf);
    const raster = document.createElement('div');
    raster.className = 'raster';
    for (let i = 0; i < 6; i++) {
      const nr = w * 6 + i + 1;
      const k = document.createElement('button');
      k.type = 'button';
      k.className = 'feldchen' + (nr === Math.min(f.frei, LEVEL.length) ? ' aktuell' : '') + (i === 5 ? ' bossfeld' : '');
      k.disabled = nr > f.frei;
      const anzahl = f.sterne[nr] || 0;
      k.setAttribute('aria-label', 'Level ' + nr + ' ' + LEVEL[nr - 1].name + (k.disabled ? ', noch gesperrt' : ', ' + anzahl + ' von 3 Sternen'));
      const zahlText = document.createElement('span');
      zahlText.textContent = nr;
      const mini = document.createElement('span');
      mini.className = 'ministerne';
      for (let n = 0; n < 3; n++) mini.append(sternBild(n < anzahl));
      k.append(zahlText, mini);
      k.addEventListener('click', () => starte(nr));
      raster.append(k);
    }
    liste.append(raster);
  }
}

function sternBild(an) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', '#stern');
  svg.append(use);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  if (an) svg.setAttribute('class', 'an');
  return svg;
}

function baueFiguren() {
  const sterne = sterneGesamt();
  const hoechst = hoechstesLevel();
  $('figurenText').textContent = 'Geschafft bis Level ' + hoechst + ', dazu ' + sterne + ' von ' + (LEVEL.length * 3) + ' Sternen. Neue Figuren gibt es, wenn du weit genug kommst.';
  const liste = $('figurenListe');
  liste.textContent = '';
  for (const [name, def] of Object.entries(FIGUREN)) {
    const k = document.createElement('button');
    k.type = 'button';
    k.className = 'figurKnopf';
    const istFrei = figurFrei(name);
    k.disabled = !istFrei;
    k.setAttribute('aria-pressed', String(daten.figur === name));
    const bild = figurFoto(name);
    const titel = document.createElement('span');
    titel.className = 'figurName';
    titel.textContent = def.name;
    const info = document.createElement('small');
    if (istFrei) info.textContent = daten.figur === name ? 'GEWÄHLT' : 'WÄHLEN';
    else info.textContent = def.sterne ? def.sterne + ' STERNE' : 'AB LEVEL ' + def.level;
    const kann = document.createElement('em');
    kann.textContent = istFrei ? def.kann : (def.sterne ? 'Eine geheime Figur. Wer sie wohl ist?' : '???');
    k.setAttribute('aria-label', def.name + (istFrei ? '' : ', noch gesperrt'));
    k.append(bild, titel, info, kann);
    k.addEventListener('click', () => {
      daten.figur = name;
      speichere();
      zieheFigurAn(name);
      if (s) s.fig = FIGUREN[name];
      baueFiguren();
    });
    liste.append(k);
  }
}

function baueWerkstatt() {
  zeigeStufe();
  const liste = $('werkstattListe');
  liste.textContent = '';
  for (const art of WERKSTATT) {
    const stufe = daten.werkstatt[art] || 0;
    const zeile = document.createElement('div');
    zeile.className = 'wzeile';
    const bild = formFoto('h' + art, formVon('hilfe_' + art, HILFE_FORM[art]), 2.6, 0.3, 0, 0.6);
    const text = document.createElement('div');
    text.className = 'wtext';
    const name = document.createElement('strong');
    name.textContent = HILFEN[art].name;
    const stufen = document.createElement('span');
    stufen.className = 'wstufen';
    for (let i = 0; i < WERKSTATT_PREISE.length; i++) {
      const p = document.createElement('i');
      if (i < stufe) p.className = 'an';
      stufen.append(p);
    }
    const dauer = document.createElement('small');
    dauer.textContent = 'Hält ' + (hilfeDauer(art).toFixed(1).replace('.0', '').replace('.', ',')) + ' Sekunden';
    text.append(name, stufen, dauer);
    const k = document.createElement('button');
    k.type = 'button';
    k.className = 'btn wkauf';
    if (stufe >= WERKSTATT_PREISE.length) { k.textContent = 'Voll'; k.disabled = true; }
    else {
      const preis = WERKSTATT_PREISE[stufe];
      k.textContent = zahl(preis) + ' Taler';
      k.disabled = daten.taler < preis;
      k.addEventListener('click', () => {
        if (daten.taler < preis) return;
        daten.taler -= preis;
        daten.werkstatt[art] = stufe + 1;
        speichere();
        ton.an();
        ton.hilfe();
        baueWerkstatt();
      });
    }
    zeile.append(bild, text, k);
    liste.append(zeile);
  }
}

function baueAuftraege() {
  const liste = $('auftragListe');
  liste.textContent = '';
  for (const offen of daten.auftraege.offen) {
    const def = auftragDef(offen.nr);
    const z = document.createElement('li');
    const t = document.createElement('span');
    t.textContent = def.text;
    const lohn = document.createElement('b');
    lohn.textContent = '+' + zahl(def.taler);
    const balken = document.createElement('i');
    const voll = document.createElement('u');
    voll.style.width = begrenzt(offen.stand / def.ziel, 0, 1) * 100 + '%';
    balken.append(voll);
    const stand = document.createElement('small');
    stand.textContent = zahl(Math.min(offen.stand, def.ziel)) + ' / ' + zahl(def.ziel);
    z.append(t, lohn, balken, stand);
    liste.append(z);
  }
}

function baueListe() {
  zeigeStufe();
  const liste = $('liste');
  liste.textContent = '';
  const f = fortschritt();
  const eintraege = daten.freunde.filter(x => x.stufe === daten.stufe).map(x => ({ name: x.name, punkte: x.punkte, freund: x }));
  eintraege.push({ name: daten.name ? daten.name + ' (du)' : 'Du', punkte: f.rekord, ich: true });
  eintraege.sort((a, b) => b.punkte - a.punkte);
  eintraege.forEach((e, i) => {
    const zeile = document.createElement('li');
    if (e.ich) zeile.className = 'ich';
    const platz = document.createElement('span');
    platz.className = 'platz';
    platz.textContent = i + 1;
    const wer = document.createElement('span');
    wer.className = 'wer';
    wer.textContent = e.name;
    const wie = document.createElement('span');
    wie.className = 'wie';
    wie.textContent = zahl(e.punkte);
    zeile.append(platz, wer, wie);
    if (e.freund) {
      const weg = document.createElement('button');
      weg.type = 'button';
      weg.className = 'weg';
      weg.textContent = '×';
      weg.setAttribute('aria-label', e.name + ' aus der Liste entfernen');
      weg.addEventListener('click', () => {
        daten.freunde = daten.freunde.filter(x => x !== e.freund);
        speichere();
        baueListe();
      });
      zeile.append(weg);
    } else {
      const platzhalter = document.createElement('span');
      platzhalter.className = 'platzhalter';
      zeile.append(platzhalter);
    }
    liste.append(zeile);
  });
  $('listeTeilen').hidden = f.rekord <= 0;
}

let hilfeGebaut = false;
function baueHilfe() {
  if (hilfeGebaut) return;
  hilfeGebaut = true;
  $('hilfeSteuerung').textContent = hatTouch
    ? 'Wische nach links oder rechts, um die Spur zu wechseln. Nach oben zum Springen, nach unten zum Rutschen.'
    : 'Pfeiltasten oder W A S D: links und rechts wechselt die Spur, hoch springt, runter rutscht. Leertaste springt auch. P ist Pause, M ist Ton.';
  const regel = $('legendeRegel');
  const eintraege = [
    ['J', 'Gelb-schwarz: drüberspringen', 4.7, 1.5, 0.4],
    ['S', 'Rot-weiß: drunter durchrutschen', 6.2, 1.2, 1.5],
    ['W', 'Alles andere: ausweichen', 7.5, 1.3, 1.6],
    ['C', 'Container: über die Rampe aufs Dach', 22, 7, 1]
  ];
  for (const [art, text, ent, hoehe, oben] of eintraege) {
    const z = document.createElement('li');
    // Die Hindernisse zeigen ihre Warnseite zum Spieler, also dreht die Vorschau sie zur Kamera
    const f = formFoto(art, formFuerRegel(art), ent, hoehe, oben, Math.PI + (art === 'C' ? 0.75 : 0.4));
    const t = document.createElement('span');
    t.textContent = text;
    z.append(f, t);
    regel.append(z);
  }
  const hilfen = $('legendeHilfen');
  for (const [art, def] of Object.entries(HILFEN)) {
    const z = document.createElement('li');
    const f = formFoto('h' + art, formVon('hilfe_' + art, HILFE_FORM[art]), 2.6, 0.3, 0, 0.6);
    const t = document.createElement('span');
    const fett = document.createElement('strong');
    fett.textContent = def.name + ': ';
    t.append(fett, def.text);
    z.append(f, t);
    hilfen.append(z);
  }
  const wl = $('weltenListe');
  for (const w of WELTEN) {
    const zeile = document.createElement('li');
    const inhalt = document.createElement('span');
    const fett = document.createElement('strong');
    fett.textContent = w.name.charAt(0) + w.name.slice(1).toLocaleLowerCase('de-DE') + ': ';
    inhalt.append(fett, w.text);
    zeile.append(inhalt);
    wl.append(zeile);
  }
}

// --------------------------- Spiel starten und beenden ---------------------------

function starte(levelNr, endlos = false) {
  ton.an();
  offenesDuell = null;
  if (grafikBereit) alleFrei();
  s = neuerZustand(levelNr, endlos);
  ladeLevel(levelNr, endlos);
  if (grafikBereit) { zieheWeltAn(s.welt); zieheFigurAn(daten.figur); }
  kamX = 0; kamY = 0; kamDrehung = 0;
  hudStand = '';
  lehrRest = 0;
  schliesseFenster();
  if (!daten.gesehen.start) {
    daten.gesehen.start = true;
    speichere();
    lehrText = hatTouch ? 'Wische nach links, rechts, oben oder unten.' : 'Pfeiltasten: links, rechts, hoch und runter.';
    lehrRest = 3.2;
  }
  if (!endlos) {
    const L = LEVEL[levelNr - 1];
    melde(grossName(L.name), 2.2);
    if (L.boss) sage('KRÄH! DU KRIEGST MICH NIE!', 2.5);
    else if (levelNr === 1) sage(s.fig.spruch, 2.6);
  } else {
    melde('DAUERLAUF', 1.8);
    sage(s.fig.spruch, 2.4);
  }
}

function pausiere() {
  if (modus !== 'lauf' && modus !== 'zaehlen') return;
  if (s.tot || s.fertig) return;
  merkeRekord();
  $('pausePunkte').textContent = zahl(s.punkte);
  zeigeFenster('fPause');
}

function weiter() {
  schliesseFenster();
  modus = 'zaehlen';
  zaehlRest = 3;
  zaehlAnzeige = -1;
  $('zaehler').hidden = true;
}

function zeigeGeschafft() {
  const st = s;
  const sterne = $('geschafftSterne');
  sterne.textContent = '';
  sterne.setAttribute('aria-label', st.sterneHier + ' von 3 Sternen');
  for (let i = 0; i < 3; i++) sterne.append(sternBild(i < st.sterneHier));
  $('geschafftTitel').textContent = istBoss() ? 'GISELA EINGEHOLT' : 'LEVEL ' + st.levelNr + ' GESCHAFFT';
  $('gMuenzen').textContent = st.muenzenHier + ' / ' + st.k.muenzenGesamt;
  $('gTaler').textContent = '+' + zahl(st.talerHier);
  $('gBonus').textContent = '+' + zahl(st.bonus);
  $('gPunkte').textContent = zahl(st.punkte);
  const dialog = $('gDialog');
  dialog.hidden = !istBoss();
  if (istBoss()) dialog.textContent = '„' + SPRUECHE.gisela[Math.floor((st.levelNr - 1) / 6)].join(' ') + '“';
  const neu = st.neuFrei || [];
  $('gNeu').hidden = !neu.length;
  if (neu.length) {
    const n = neu[0];
    $('gNeuBild').textContent = '';
    $('gNeuBild').append(figurFoto(n));
    $('gNeuName').textContent = FIGUREN[n].name;
    $('gNeuText').textContent = FIGUREN[n].kann;
    $('gNeuKnopf').dataset.figur = n;
    $('gNeuKnopf').textContent = 'Gleich spielen';
    ton.fanfare();
  }
  const tipp = [];
  if (st.sterneHier < 3) {
    if (st.getroffenHier) tipp.push('Ohne Treffer gibt es einen Stern.');
    if (st.coinsAnteil < 0.6) tipp.push('Sammle mindestens 60 % der Münzen für einen Stern.');
  }
  if (st.levelNr === LEVEL.length) tipp.push('Du hast das letzte Brötchen! Jetzt bleibt nur noch der Dauerlauf.');
  $('gTipp').textContent = tipp.join(' ');
  $('gTipp').hidden = !tipp.length;
  const hatNaechstes = st.levelNr < LEVEL.length;
  $('naechstesKnopf').textContent = hatNaechstes ? 'Level ' + (st.levelNr + 1) + ': ' + LEVEL[st.levelNr].name : 'Dauerlauf starten';
  zeigeFenster('fGeschafft');
}

function zeigeEnde() {
  const st = s;
  merkeRekord();
  const f = fortschritt();
  const neu = st.punkte > st.rekordAmStart && st.punkte > 0;
  $('neuerRekord').hidden = !neu;
  $('eSpruch').textContent = SPRUECHE.ende[Math.floor(Math.random() * SPRUECHE.ende.length)];
  $('ePunkte').textContent = zahl(st.punkte);
  $('eMuenzen').textContent = st.muenzenHier;
  $('eLevelName').textContent = st.endlos ? 'Erreichte Runde' : 'Level';
  $('eLevel').textContent = st.endlos ? st.weltStufe : st.levelNr;
  $('eRekord').textContent = zahl(f.rekord);

  // Was bringt mich zurück ans Spiel? Der nächste Freund oder der eigene Rekord
  const freunde = daten.freunde.filter(x => x.stufe === daten.stufe);
  const ueber = freunde.filter(x => x.punkte > st.punkte).sort((a, b) => a.punkte - b.punkte)[0];
  const eDuell = $('eDuell');
  eDuell.hidden = false;
  if (ueber) eDuell.textContent = 'Noch ' + zahl(ueber.punkte - st.punkte + 1) + ' Punkte, dann liegst du vor ' + ueber.name + '.';
  else if (freunde.length) eDuell.textContent = 'Du liegst vor allen Freunden in deiner Liste. Schick ihnen deinen Link, damit sie nachlegen.';
  else if (!neu && f.rekord > st.punkte) eDuell.textContent = 'Noch ' + zahl(f.rekord - st.punkte + 1) + ' Punkte bis zu deinem Rekord.';
  else eDuell.textContent = 'Schick deinen Rekord an Freunde. Wer schlägt dich?';

  const nochmal = $('nochmalKnopf');
  if (st.endlos) {
    nochmal.textContent = 'Nochmal Dauerlauf';
    nochmal.dataset.level = 1;
    nochmal.dataset.endlos = '1';
  } else {
    nochmal.textContent = 'Nochmal Level ' + st.levelNr;
    nochmal.dataset.level = st.levelNr;
    nochmal.dataset.endlos = '';
  }
  $('endeTeilen').hidden = f.rekord <= 0;
  zeigeFenster('fEnde');
}

function zumMenue() {
  merkeRekord();
  bereiteMenueVor();
  zeigeFenster('fStart');
}

function bereiteMenueVor() {
  if (grafikBereit) alleFrei();
  modus = 'menue';
  s = neuerZustand(1, false);
  s.k = new Kurs(1, s.stufe, false);
  s.plan = levelPlan(1, s.stufe);
  s.welt = Math.min(Math.floor((Math.min(fortschritt().frei, LEVEL.length) - 1) / 6), WELTEN.length - 1);
  s.ziel = Infinity;
  s.tempo = 8;
  if (grafikBereit) { zieheWeltAn(s.welt); zieheFigurAn(daten.figur); }
}

// --------------------------- Freunde herausfordern ---------------------------

function reinerName(text) {
  // Nur sichtbare Zeichen und nicht zu lang: Der Name kommt aus einem fremden Link
  const sauber = String(text == null ? '' : text).normalize('NFC').replace(/[\p{C}<>]/gu, '').trim();
  return Array.from(sauber).slice(0, 12).join('');
}

function linkBauen() {
  const f = fortschritt();
  const teile = new URLSearchParams({
    name: reinerName($('nameFeld').value) || 'Ein Freund',
    punkte: f.rekord,
    level: f.rekordLevel || 1,
    stufe: daten.stufe
  });
  return SPIEL_ADRESSE + '#' + teile.toString();
}

function oeffneTeilen(zurueck) {
  vorTeilen = zurueck;
  const f = fortschritt();
  $('nameFeld').value = daten.name;
  $('teilenStatus').textContent = '';
  $('linkFeld').hidden = true;
  $('teilenText').textContent = 'Du teilst deinen Rekord: ' + zahl(f.rekord) + ' Punkte auf Stufe ' + STUFEN[daten.stufe].name + '. Wer den Link öffnet, sieht dein Ergebnis und kann es angreifen.';
  zeigeFenster('fTeilen');
}

async function teile() {
  const f = fortschritt();
  daten.name = reinerName($('nameFeld').value);
  speichere();
  const adresse = linkBauen();
  const text = 'Ich habe ' + zahl(f.rekord) + ' Punkte in Hafenflitzer (Stufe ' + STUFEN[daten.stufe].name + '). Schaffst du mehr?';
  const status = $('teilenStatus');
  status.textContent = '';
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Hafenflitzer', text, url: adresse });
      return;
    }
    await navigator.clipboard.writeText(text + ' ' + adresse);
    status.textContent = 'Link kopiert! Füge ihn jetzt im Chat ein.';
  } catch (error) {
    if (error.name === 'AbortError') return;
    const feld = $('linkFeld');
    feld.value = adresse;
    feld.hidden = false;
    feld.select();
    status.textContent = 'Kopiere diesen Link:';
  }
}

// Wurde das Spiel über den Link eines Freundes geöffnet?
function leseHerausforderung() {
  if (location.hash.length < 2) return;
  const teile = new URLSearchParams(location.hash.slice(1));
  const name = reinerName(teile.get('name'));
  const punkte = Number(teile.get('punkte'));
  const level = Number(teile.get('level'));
  const stufe = teile.get('stufe');
  try { history.replaceState(null, '', location.pathname + location.search); } catch (error) {}
  if (!name || !Number.isInteger(punkte) || punkte < 1 || punkte > 99999999) return;
  if (!Number.isInteger(level) || level < 1 || level > 9999) return;
  if (!hatEigen(STUFEN, stufe)) return;
  const bekannt = daten.freunde.find(f => f.name === name && f.stufe === stufe);
  if (bekannt) bekannt.punkte = Math.max(bekannt.punkte, punkte);
  else daten.freunde.push({ name, punkte, level, stufe });
  daten.freunde.sort((a, b) => b.punkte - a.punkte);
  daten.freunde = daten.freunde.slice(0, 30);
  daten.stufe = stufe;
  speichere();
  offenesDuell = { name, punkte, level, stufe };
}

// --------------------------- Knöpfe ---------------------------

function schalteTon() {
  daten.ton = !daten.ton;
  speichere();
  zeigeTon();
  ton.an();
  ton.hopp();
}
function zeigeTon() {
  $('tonKnopf').classList.toggle('stumm', !daten.ton);
  $('tonKnopf').setAttribute('aria-label', daten.ton ? 'Ton ausschalten' : 'Ton einschalten');
}
function zeigeMusikKnopf() { $('pauseMusik').textContent = daten.musik ? 'Musik ausschalten' : 'Musik einschalten'; }

for (const k of document.querySelectorAll('[data-oeffne]')) {
  k.addEventListener('click', () => {
    if (k.dataset.oeffne === 'fStart' && modus !== 'menue') { zumMenue(); return; }
    zeigeFenster(k.dataset.oeffne);
  });
}
$('losKnopf').addEventListener('click', e => starte(Number(e.currentTarget.dataset.level) || 1));
$('endlosKnopf').addEventListener('click', () => starte(1, true));
$('tonKnopf').addEventListener('click', schalteTon);
$('pauseKnopf').addEventListener('click', () => { ton.an(); pausiere(); });
$('weiterKnopf').addEventListener('click', weiter);
$('pauseMusik').addEventListener('click', () => { daten.musik = !daten.musik; speichere(); zeigeMusikKnopf(); });
$('pauseNeu').addEventListener('click', () => { merkeRekord(); starte(s.endlos ? 1 : s.levelNr, s.endlos); });
$('pauseMenue').addEventListener('click', zumMenue);
$('geschafftMenue').addEventListener('click', zumMenue);
$('naechstesKnopf').addEventListener('click', () => {
  if (s.levelNr >= LEVEL.length) { starte(1, true); return; }
  starte(s.levelNr + 1);
});
$('gNeuKnopf').addEventListener('click', e => {
  const n = e.currentTarget.dataset.figur;
  if (hatEigen(FIGUREN, n)) { daten.figur = n; speichere(); }
  if (s.levelNr >= LEVEL.length) starte(1, true); else starte(s.levelNr + 1);
});
$('nochmalKnopf').addEventListener('click', e => starte(Number(e.currentTarget.dataset.level) || 1, e.currentTarget.dataset.endlos === '1'));
$('endeTeilen').addEventListener('click', () => oeffneTeilen('fEnde'));
$('listeTeilen').addEventListener('click', () => oeffneTeilen('fListe'));
$('teilenKnopf').addEventListener('click', teile);
$('teilenZurueck').addEventListener('click', () => zeigeFenster(vorTeilen));

// --------------------------- Start ---------------------------

leseHerausforderung();
baueStufenKnoepfe();
zeigeTon();
if (!grafikStart()) {
  $('keinBild').hidden = false;
} else {
  bereiteMenueVor();
  $('bild').addEventListener('webglcontextlost', e => { e.preventDefault(); if (modus === 'lauf') pausiere(); $('keinBild').hidden = false; $('keinBildText').textContent = 'Das Bild ist kurz ausgefallen. Lade die Seite bitte neu.'; });
  zeigeFenster('fStart');
  if (document.fonts && document.fonts.load) document.fonts.load('10px "Press Start 2P"');
  requestAnimationFrame(zeit => { letzteZeit = zeit; schleife(zeit); });
}

if ('serviceWorker' in navigator && window.isSecureContext && location.protocol !== 'file:' && !location.search.includes('test')) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* Das Spiel läuft auch so */ });
}

// Nur für den Testlauf: Wird im normalen Spiel nie benutzt.
if (location.search.includes('test')) window.__spiel = {
  s: () => s, modus: () => modus, zeichen: () => ({ aufrufe: renderer.info.render.calls, dreiecke: renderer.info.render.triangles, aktive: aktive.size }), starte, schritt, TAKT, lenke, springe, rutsche, daten, zeichneBild, levelFertig, speichere, weltWechselBild, zumMenue, icon: g => { const c = document.createElement('canvas'); c.width = c.height = g; c.getContext('2d').drawImage(figurFoto('gisela'), 0, 0, g, g); return c; }, zeigeFenster, zeigeGeschafft, zeigeEnde, teilZ, teilX, dachHoehe, fallY, setzeModus: m => { modus = m; }
};
