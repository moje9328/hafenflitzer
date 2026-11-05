#!/usr/bin/env python3
# Baut aus den Teilen in diesem Ordner die fertige index.html. Aufruf: python3 quelle/baue.py
import pathlib
q = pathlib.Path(__file__).parent
kopf = (q / 'kopf.html').read_text()
spiel = '\n'.join((q / n).read_text() for n in ['1-einstellungen.js', '2-logik.js', '3-modelle.js', '4-grafik.js', '5-bedienung.js'])
fertig = kopf.replace('%%SCHRIFT%%', (q / 'schrift.txt').read_text()).replace('%%THREE%%', (q / 'three.min.js').read_text()).replace('%%SPIEL%%', spiel)
(q.parent / 'index.html').write_text(fertig)
print('index.html:', len(fertig) // 1024, 'KB')
