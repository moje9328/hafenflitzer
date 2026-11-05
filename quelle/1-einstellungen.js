// =====================================================================
//  HIER KANNST DU ALLES ÄNDERN
// =====================================================================

// Diese Adresse steckt in den Links, die man an Freunde schickt
const SPIEL_ADRESSE = 'https://moje9328.github.io/hafenflitzer/';

// Die drei Schwierigkeiten.
// herzen = Leben, tempo = Laufgeschwindigkeit mal, abstand = Luft zwischen den Hindernissen mal, faktor = Punkte mal
const STUFEN = {
  leicht: { name: 'Leicht', herzen: 5, tempo: 0.88, abstand: 1.18, faktor: 1, text: '5 Herzen, gemütliches Tempo und viel Platz zwischen den Hindernissen.' },
  normal: { name: 'Normal', herzen: 3, tempo: 1, abstand: 1, faktor: 1.5, text: '3 Herzen und 1,5-fache Punkte.' },
  profi: { name: 'Profi', herzen: 2, tempo: 1.12, abstand: 0.92, faktor: 2, text: '2 Herzen, hohes Tempo und doppelte Punkte.' }
};

// Die fünf Welten. schwere = wie stark es dich nach unten zieht, luft = wie viel länger es zwischen Hindernissen Luft braucht
const WELTEN = [
  { name: 'MORGENHAFEN', farbe: '#f0906a', schwere: 1, luft: 1,
    text: 'Es geht los am Kai: Kisten, Steinpodeste und riesige Steinkugeln, die auf dich zurollen.' },
  { name: 'STRANDPROMENADE', farbe: '#39b8d8', schwere: 1, luft: 1,
    text: 'Wasserbälle kullern quer über den Weg. Schwimmringe schleudern dich hoch in die Luft.' },
  { name: 'FISCHMARKT', farbe: '#b06ae8', schwere: 1, luft: 1,
    text: 'Nachts auf dem Markt schwingen Laternen hin und her, und Fischöl lässt dich ausrutschen.' },
  { name: 'STURMSCHIFF', farbe: '#3fae8c', schwere: 1, luft: 1,
    text: 'Das Deck schaukelt. Wellen rollen auf dich zu, und wo es rot leuchtet, schlägt gleich der Blitz ein.' },
  { name: 'MONDHAFEN', farbe: '#7f8cf0', schwere: 0.62, luft: 1.18,
    text: 'Fast keine Schwerkraft: Du springst weit und lange. Dafür regnet es Meteoriten.' }
];

// Die Level. laenge in Metern, v0 und v1 = Tempo am Anfang und am Ende, luft = Sekunden zwischen den Hindernissen.
// muster: was vorkommen darf (kugel = Steinkugel rollt auf dich zu, container und dachzug = Steinpodeste). Die Namen stehen weiter unten bei MUSTER_BAU.
// boss: Möwe Gisela wirft mit Sachen. ziel: Sie wird am Ende eingeholt.
const LEVEL = [
  // Morgenhafen
  { name: 'Erster Sprint',   laenge: 420, v0: 11.5, v1: 13, luft: 2.0, muster: ['seite', 'sprung', 'seite', 'rutsch'], lehre: true },
  { name: 'Kistenlager',     laenge: 520, v0: 12.5, v1: 14, luft: 1.8, muster: ['seite', 'sprung', 'rutsch', 'wand2', 'container'] },
  { name: 'Aufs Podest',   laenge: 620, v0: 13, v1: 15, luft: 1.7, muster: ['container', 'container', 'wand2', 'sprung', 'rutsch', 'dachzug'] },
  { name: 'Steinschlag!',   laenge: 680, v0: 13.5, v1: 15.5, luft: 1.6, muster: ['kugel', 'kugel', 'wand2', 'sprungreihe', 'container', 'tor'] },
  { name: 'Hochbetrieb',     laenge: 760, v0: 14, v1: 16, luft: 1.5, muster: ['kugel', 'tor', 'dachzug', 'rutschreihe', 'slalom', 'wand2'] },
  { name: 'Gisela am Kai',   laenge: 700, v0: 14.5, v1: 16.5, luft: 1.6, muster: ['wurf', 'wurf', 'wand2', 'sprung', 'rutsch', 'kugel'], boss: true },
  // Strandpromenade
  { name: 'Sonnencreme',     laenge: 640, v0: 14.5, v1: 16.5, luft: 1.6, muster: ['ball', 'seite', 'sprung', 'ring', 'rutsch'] },
  { name: 'Ball über alles', laenge: 720, v0: 15, v1: 17, luft: 1.5, muster: ['ball', 'ball', 'wand2', 'sprungreihe', 'container', 'ring'] },
  { name: 'Hoch hinaus',     laenge: 780, v0: 15.5, v1: 17.5, luft: 1.45, muster: ['ring', 'ring', 'dachzug', 'ball', 'tor', 'rutschreihe'] },
  { name: 'Kullerkugel',     laenge: 820, v0: 16, v1: 18, luft: 1.4, muster: ['kugel', 'ball', 'slalom', 'dachzug', 'ring', 'tor'] },
  { name: 'Volle Promenade', laenge: 880, v0: 16.5, v1: 18.5, luft: 1.35, muster: ['slalom', 'kugel', 'ball', 'tor', 'rutschreihe', 'sprungreihe', 'dachzug'] },
  { name: 'Gisela am Strand', laenge: 800, v0: 16.5, v1: 18.5, luft: 1.45, muster: ['wurf', 'wurf', 'ball', 'wand2', 'tor', 'kugel'], boss: true },
  // Fischmarkt
  { name: 'Nachtschicht',    laenge: 760, v0: 16.5, v1: 18.5, luft: 1.45, muster: ['laterne', 'pfuetze', 'seite', 'rutsch', 'sprung'] },
  { name: 'Lampenfieber',    laenge: 820, v0: 17, v1: 19, luft: 1.4, muster: ['laterne', 'laterne', 'wand2', 'pfuetze', 'container'] },
  { name: 'Glitschig',       laenge: 880, v0: 17.5, v1: 19.5, luft: 1.35, muster: ['pfuetze', 'pfuetze', 'tor', 'laterne', 'dachzug', 'sprungreihe'] },
  { name: 'Rollende Steine',     laenge: 920, v0: 18, v1: 20, luft: 1.3, muster: ['kugel', 'laterne', 'slalom', 'dachzug', 'rutschreihe'] },
  { name: 'Marktschluss',    laenge: 980, v0: 18.5, v1: 20.5, luft: 1.25, muster: ['slalom', 'kugel', 'laterne', 'tor', 'pfuetze', 'dachzug', 'sprungreihe'] },
  { name: 'Gisela im Neon',  laenge: 900, v0: 18.5, v1: 20.5, luft: 1.35, muster: ['wurf', 'wurf', 'laterne', 'tor', 'kugel', 'wand2'], boss: true },
  // Sturmschiff
  { name: 'Windstärke 8',    laenge: 860, v0: 18.5, v1: 20.5, luft: 1.4, muster: ['welle', 'seite', 'blitz', 'rutsch', 'sprung'] },
  { name: 'Land unter',      laenge: 920, v0: 19, v1: 21, luft: 1.35, muster: ['welle', 'welle', 'wand2', 'container', 'blitz'] },
  { name: 'Blitzableiter',   laenge: 980, v0: 19.5, v1: 21.5, luft: 1.3, muster: ['blitz', 'blitz', 'tor', 'welle', 'dachzug', 'rutschreihe'] },
  { name: 'Fels über Bord', laenge: 1040, v0: 20, v1: 22, luft: 1.25, muster: ['kugel', 'welle', 'slalom', 'blitz', 'dachzug'] },
  { name: 'Klabautermann',   laenge: 1100, v0: 20.5, v1: 22.5, luft: 1.2, muster: ['slalom', 'kugel', 'welle', 'blitz', 'tor', 'sprungreihe', 'dachzug'] },
  { name: 'Gisela im Sturm', laenge: 1000, v0: 20.5, v1: 22.5, luft: 1.3, muster: ['wurf', 'wurf', 'welle', 'tor', 'kugel', 'blitz'], boss: true },
  // Mondhafen
  { name: 'Kleiner Schritt', laenge: 960, v0: 20, v1: 22, luft: 1.3, muster: ['meteor', 'seite', 'sprung', 'rutsch', 'ring'] },
  { name: 'Meteoritenregen', laenge: 1020, v0: 20.5, v1: 22.5, luft: 1.25, muster: ['meteor', 'meteor', 'wand2', 'container', 'ring'] },
  { name: 'Laserschranke',   laenge: 1080, v0: 21, v1: 23, luft: 1.2, muster: ['rutschreihe', 'sprungreihe', 'meteor', 'tor', 'dachzug'] },
  { name: 'Mondkugeln',      laenge: 1140, v0: 21.5, v1: 24, luft: 1.18, muster: ['kugel', 'meteor', 'slalom', 'dachzug', 'ring', 'tor'] },
  { name: 'Letzte Rakete',   laenge: 1220, v0: 22, v1: 25, luft: 1.15, muster: ['slalom', 'kugel', 'meteor', 'tor', 'rutschreihe', 'sprungreihe', 'dachzug'] },
  { name: 'Das letzte Brötchen', laenge: 1300, v0: 22, v1: 25, luft: 1.2, muster: ['wurf', 'wurf', 'meteor', 'tor', 'kugel', 'slalom'], boss: true }
];

// Die Figuren. level = ab diesem geschafften Level frei (0 = von Anfang an), sterne = Alternative für die Geheimfigur.
const FIGUREN = {
  fiete: { name: 'Hein Fiete', level: 0, kann: 'Kann nichts Besonderes. Das aber sehr gut.', spruch: 'Moin. Wo ist mein Brötchen?', treffer: ['DONNERWETTER!', 'MEIN KREUZ!', 'KLABAUTER!'],
    sprungName: 'Seemannssprung', sprungText: 'Ganz normal und zuverlässig.' },
  kalle: { name: 'Krabbe Kalle', level: 0, kann: 'Läuft seitwärts: wechselt die Spur viel schneller.', spruch: 'Ich laufe halt anders.', treffer: ['ZWICK!', 'AU, MEIN PANZER!', 'NICHT SCHON WIEDER!'], spurTempo: 1.45,
    sprungName: 'Krabbenhopser', sprungText: 'Flach und blitzschnell wieder unten.', sprung: 0.92, schwereMal: 1.25 },
  hilde: { name: 'Oma Hilde', level: 3, kann: 'Startet mit Rettungsring: die Handtasche fängt den ersten Treffer ab.', spruch: 'Früher war der Kai aufgeräumter!', treffer: ['UNVERSCHÄMTHEIT!', 'MEINE HÜFTE!', 'ICH BESCHWERE MICH!'], startRing: true,
    sprungName: 'Handtaschen-Schwung', sprungText: 'Nochmal nach oben wischen: In der Luft gibt es einen kleinen Extrasprung.', luftSpruenge: 1, luftKraft: 0.62 },
  rudi: { name: 'Rollmops Rudi', level: 6, kann: 'Rollt: rutscht viel länger unter Sachen durch.', spruch: 'Ich bin nicht dick, ich bin aerodynamisch.', treffer: ['WUFF!', 'RÖCHEL!', 'WO IST DIE WURST?!'], rutsch: 1.5, rollt: true,
    sprungName: 'Bauchplatscher', sprungText: 'In der Luft nach unten wischen: Er zertrümmert kleine Hindernisse vor sich.', platsch: true },
  erna: { name: 'Ente Erna', level: 9, kann: 'Hat immer einen Schwimmring dabei. Man weiß ja nie.', spruch: 'Quietsch.', treffer: ['QUIETSCH!', 'QUIEEETSCH!', 'QUÄK?!'],
    sprungName: 'Gleitflug', sprungText: 'Sinkt nach dem Sprung ganz langsam.', schweben: 0.6 },
  bert: { name: 'Dosen-Bert', level: 12, kann: 'Aus Blech: zieht nahe Münzen von selbst an.', spruch: 'Haltbar bis 2097.', treffer: ['KLONK!', 'DELLE!', 'FEHLER 404: BEIN!'], anziehen: 3.2,
    sprungName: 'Federsprung', sprungText: 'Gleich nach der Landung nochmal springen geht höher, bis zu dreimal.', kettenSprung: true },
  bodo: { name: 'Bockwurst Bodo', level: 16, kann: 'Heiß begehrt: bekommt immer 15 % mehr Punkte.', spruch: 'Mit Senf bin ich unschlagbar.', treffer: ['GEPLATZT!', 'MEIN SENF!', 'ICH BIN EINE WURST!'], punkte: 1.15,
    sprungName: 'Wurst-Weitsprung', sprungText: 'Etwas höher und besonders weit.', sprung: 1.05, schwereMal: 0.8 },
  quentin: { name: 'Qualle Quentin', level: 20, kann: 'Hat keine Knochen und deshalb keine Angst.', spruch: 'Ich habe kein Gehirn und bin trotzdem hier.', treffer: ['BLOBB!', 'WABBEL!', 'NESSEL-ALARM!'],
    sprungName: 'Wabbel-Hochsprung', sprungText: 'Springt von allen am höchsten.', sprung: 1.25 },
  pia: { name: 'Piratin Pia', level: 25, kann: 'Schatzsucherin: jede Münze gibt doppelt so viele Taler.', spruch: 'Arrr. Das Holzbein ist Absicht.', treffer: ['ARRR!', 'MEIN HOLZBEIN!', 'KIELHOLEN!'], taler: 2,
    sprungName: 'Enterhaken', sprungText: 'Nochmal nach oben wischen: Sie hängt sich kurz in die Luft.', luftSpruenge: 1, haken: true },
  blorp: { name: "Käpt'n Blorp", level: 30, kann: 'Außerirdische Technik: Hilfen halten anderthalbmal so lange.', spruch: 'Blorp blorp. Ich komme in Frieden.', treffer: ['BLORP?!', 'SCHADE, ERDE!', 'ZIRP!'], hilfe: 1.5,
    sprungName: 'Schwebesprung', sprungText: 'Bleibt ganz oben von selbst kurz stehen.', schweber: true },
  gisela: { name: 'Möwe Gisela', level: 99, sterne: 75, kann: 'Die Diebin persönlich. Spielt sich frech.', spruch: 'MEINS! MEINS! MEINS!', treffer: ['KRÄÄÄH!', 'MEINS!', 'DAS WAR MEIN BRÖTCHEN!'],
    sprungName: 'Flügelschlag', sprungText: 'Kann in der Luft noch zweimal springen.', luftSpruenge: 2 }
};

// Die Hilfen zum Einsammeln. dauer in Sekunden.
const HILFEN = {
  magnet: { name: 'Münzmagnet', dauer: 9, farbe: '#ff4e4e', text: 'Zieht alle Münzen zu dir.' },
  wanne: { name: 'Flug-Badewanne', dauer: 3, farbe: '#7fd8ff', text: 'Eine Badewanne mit Flügeln hebt dich kurz über alles hinweg.' },
  stiefel: { name: 'Sprungstiefel', dauer: 10, farbe: '#5fe06a', text: 'Gummistiefel mit Feder: du springst viel höher.' },
  federn: { name: 'Möwenfedern', dauer: 10, farbe: '#d8e6ff', text: 'Du kannst in der Luft einmal extra springen.' },
  goldfisch: { name: 'Goldfisch', dauer: 11, farbe: '#ffa22e', text: 'Doppelte Punkte, solange er zappelt.' },
  ring: { name: 'Rettungsring', dauer: 0, farbe: '#ff8a8a', text: 'Fängt einen Treffer für dich ab.' },
  broetchen: { name: 'Fischbrötchen', dauer: 0, farbe: '#ffe2a8', text: 'Ein Herz zurück. Endlich!' }
};

// Werkstatt: Jede Stufe macht die Hilfe 25 % länger
const WERKSTATT_PREISE = [150, 400, 900, 2000];
const WERKSTATT = ['magnet', 'wanne', 'stiefel', 'federn', 'goldfisch'];
const WANNE_MAX = 5;   // Länger fliegt die Badewanne nie, auch nicht mit Werkstatt

// Figuren-Aufträge: Es sind immer drei offen. art: muenzen, sprung, rutsch, level, hilfe, meter, knapp, dach
const AUFTRAEGE = [
  { art: 'muenzen', ziel: 100, text: 'Sammle 100 Münzen', taler: 100 },
  { art: 'sprung', ziel: 30, text: 'Spring 30 Mal', taler: 100 },
  { art: 'rutsch', ziel: 20, text: 'Rutsche 20 Mal', taler: 100 },
  { art: 'level', ziel: 3, text: 'Schaffe 3 Level', taler: 150 },
  { art: 'hilfe', ziel: 5, text: 'Sammle 5 Hilfen ein', taler: 150 },
  { art: 'dach', ziel: 5, text: 'Lauf 5 Mal über ein Podest', taler: 150 },
  { art: 'meter', ziel: 3000, text: 'Lauf 3.000 Meter', taler: 200 },
  { art: 'knapp', ziel: 15, text: 'Weiche 15 Mal ganz knapp aus', taler: 200 },
  { art: 'muenzen', ziel: 500, text: 'Sammle 500 Münzen', taler: 250 },
  { art: 'level', ziel: 8, text: 'Schaffe 8 Level', taler: 300 },
  { art: 'sprung', ziel: 150, text: 'Spring 150 Mal', taler: 300 },
  { art: 'meter', ziel: 12000, text: 'Lauf 12.000 Meter', taler: 400 },
  { art: 'muenzen', ziel: 2000, text: 'Sammle 2.000 Münzen', taler: 500 },
  { art: 'hilfe', ziel: 30, text: 'Sammle 30 Hilfen ein', taler: 500 },
  { art: 'knapp', ziel: 100, text: 'Weiche 100 Mal ganz knapp aus', taler: 500 }
];

const SPRUECHE = {
  ende: [
    'Gisela lacht. Das klingt wie ein rostiges Tor.',
    'Das Brötchen ist weg. Aber die Hoffnung bleibt.',
    'Du warst nah dran. Also, relativ.',
    'Der Hafenarzt sagt: Kann passieren.',
    'Gisela frisst das Brötchen jetzt extra langsam.',
    'Einmal schütteln, weiterrennen!'
  ],
  gisela: [
    ['Na gut, hier hast du es!', 'Moment, das ist ja nur die Hälfte.', 'Die andere Hälfte habe ich noch. KRÄH!'],
    ['Du schon wieder?', 'Nimm die Gurke. Die mag ich sowieso nicht.', 'Das Brötchen behalte ich!'],
    ['Du bist zäh!', 'Hier, die Zwiebeln. Die brennen mir in den Augen.', 'Der Fisch bleibt bei mir!'],
    ['Lass mich in Ruhe!', 'Hier, die Remoulade. Viel Spaß damit.', 'Mir nach, wenn du dich traust!'],
    ['Na schön. Du hast gewonnen.', 'Hier ist das letzte Brötchen. Ehrlich.', 'Ist übrigens von vorgestern. KRÄH!']
  ]
};

// Die Musik: Akkorde als Tonnummern. 'lied' ist eine fertige Melodie.
// Welt 1 und 4 spielen alte Seemannslieder, die darf jeder verwenden.
const MUSIK = [
  { bpm: 140, lied: [69, 69, 69, 69, 69, 62, 65, 69, 67, 67, 67, 67, 67, 60, 64, 67, 69, 69, 69, 69, 69, 71, 72, 74, 72, 69, 67, 64, 62, 0, 62, 0], bass: [38, 36, 38, 36] },
  { bpm: 148, akkorde: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]], bass: [36, 41, 43, 36] },
  { bpm: 128, akkorde: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]], bass: [33, 29, 31, 28], weich: true },
  { bpm: 158, lied: [62, 0, 62, 65, 69, 0, 69, 67, 65, 0, 62, 65, 64, 0, 60, 64, 62, 0, 62, 65, 69, 0, 72, 69, 67, 65, 64, 60, 62, 0, 62, 0], bass: [38, 36, 34, 33] },
  { bpm: 120, akkorde: [[64, 67, 71], [60, 64, 67], [67, 71, 74], [62, 66, 69]], bass: [40, 36, 43, 38], weich: true }
];

// =====================================================================
//  AB HIER MUSST DU NORMALERWEISE NICHTS MEHR ÄNDERN
// =====================================================================

const SPEICHER = 'hafenflitzer-daten';
const SPUR = 2.5;                   // Abstand der drei Spuren
const SPUR_X = [-SPUR, 0, SPUR];
const TAKT = 1 / 120;               // Feine Rechenschritte
const SCHWERE = 34, SPRUNG_V = 12.4;
const RUTSCH_DAUER = 0.62;
const WECHSEL_TEMPO = 18;           // So schnell geht der Spurwechsel
const STEH_H = 1.65, RUTSCH_H = 0.8;
const BREITE_TREFFER = 1.22;        // Waagerechter Abstand, ab dem etwas trifft
const DACH_HOCH = 2.7;              // So hoch sind die Steinpodeste
const STUFEN_NAMEN = Object.keys(STUFEN);
const HERZEN_MAX = 6;
const ENDLOS_WELT_METER = 1300;

const wenigBewegung = matchMedia('(prefers-reduced-motion: reduce)');
const $ = id => document.getElementById(id);
const zahl = n => Math.round(n).toLocaleString('de-DE');
const begrenzt = (wert, min, max) => Math.max(min, Math.min(max, wert));
const grossName = name => name.toLocaleUpperCase('de-DE');
const hatEigen = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

// Würfel mit fester Reihenfolge: Dasselbe Level sieht bei jedem Versuch gleich aus
function wuerfel(startwert) {
  let a = startwert >>> 0;
  const zufall = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  zufall.von = (min, max) => min + zufall() * (max - min);
  zufall.ganz = (min, max) => min + Math.floor(zufall() * (max - min + 1));
  zufall.wahl = liste => liste[Math.floor(zufall() * liste.length)];
  return zufall;
}

// --------------------------- Speichern ---------------------------

function leererFortschritt() { return { frei: 1, rekord: 0, rekordLevel: 0, sterne: {} }; }

function ladeDaten() {
  const leer = { name: '', stufe: 'normal', ton: true, musik: true, figur: 'fiete', freunde: [], fortschritt: {}, taler: 0, werkstatt: {}, auftraege: null, gesehen: {} };
  let roh = null;
  try { roh = JSON.parse(localStorage.getItem(SPEICHER)); } catch (error) {}
  const d = Object.assign(leer, roh && typeof roh === 'object' ? roh : {});
  if (!hatEigen(STUFEN, d.stufe)) d.stufe = 'normal';
  if (!hatEigen(FIGUREN, d.figur)) d.figur = 'fiete';
  if (!Array.isArray(d.freunde)) d.freunde = [];
  if (!d.fortschritt || typeof d.fortschritt !== 'object') d.fortschritt = {};
  if (!d.werkstatt || typeof d.werkstatt !== 'object') d.werkstatt = {};
  if (!d.gesehen || typeof d.gesehen !== 'object') d.gesehen = {};
  // Wer die alte Raketen-Ente schon verbessert hatte, behält das für die Badewanne
  if (d.werkstatt.ente && !d.werkstatt.wanne) d.werkstatt.wanne = d.werkstatt.ente;
  delete d.werkstatt.ente;
  if (!Number.isFinite(d.taler) || d.taler < 0) d.taler = 0;
  for (const stufe of STUFEN_NAMEN) {
    d.fortschritt[stufe] = Object.assign(leererFortschritt(), d.fortschritt[stufe]);
  }
  if (!d.auftraege || !Array.isArray(d.auftraege.offen)) d.auftraege = { offen: [0, 1, 2].map(i => ({ nr: i, stand: 0 })), naechster: 3 };
  return d;
}

const daten = ladeDaten();
function speichere() {
  try { localStorage.setItem(SPEICHER, JSON.stringify(daten)); } catch (error) {}
}
const fortschritt = () => daten.fortschritt[daten.stufe];

// Sterne zählen über alle Schwierigkeiten: pro Level zählt das beste Ergebnis
function sterneGesamt() {
  const bestes = {};
  for (const stufe of STUFEN_NAMEN) {
    for (const [nr, anzahl] of Object.entries(daten.fortschritt[stufe].sterne)) {
      bestes[nr] = Math.max(bestes[nr] || 0, anzahl);
    }
  }
  return Object.values(bestes).reduce((summe, n) => summe + n, 0);
}

// Das höchste geschaffte Level über alle Schwierigkeiten: Es schaltet die Figuren frei
function hoechstesLevel() {
  return Math.max(...STUFEN_NAMEN.map(st => daten.fortschritt[st].frei - 1));
}

function figurFrei(name) {
  const f = FIGUREN[name];
  if (f.sterne) return sterneGesamt() >= f.sterne;
  return hoechstesLevel() >= f.level;
}

const figurJetzt = () => FIGUREN[daten.figur];

function hilfeDauer(art) {
  const stufe = daten.werkstatt[art] || 0;
  const dauer = HILFEN[art].dauer * (1 + stufe * 0.25) * (figurJetzt().hilfe || 1);
  return art === 'wanne' ? Math.min(dauer, WANNE_MAX) : dauer;
}
