# mwebirc – Moderner Web‑IRC‑Client (ehemals qwebirc)

![CI](https://github.com/WarPigs1602/mwebirc/workflows/CI/badge.svg)

mwebirc (ehemals qwebirc) ist ein schneller, wenig abhängiger, webbasierter IRC‑Client, geschrieben in Python (Twisted) mit einem kompakten ES5‑stilsicheren JavaScript‑Frontend. Er wurde entwickelt für:

* Echtzeit‑Interaktion (niedrige Latenz im Update‑Pipeline)
* Live‑Sprachwechsel ohne vollständiges Neuladen der Seite
* Einfache Gestaltung & White‑Label‑Einbettung
* Betrieb hinter Reverse‑Proxys / Load‑Balancern

---
## Inhaltsverzeichnis
1. Merkmale
2. Architekturüberblick
3. Schnellstart
4. Konfiguration & WEBIRC / Gateway‑Identität
5. Entwicklungsworkflow
6. Theming (anpassbares Stylesheet)
7. Internationalisierung (i18n)
8. Optionssystem
9. Embed‑Assistent
10. Emoji‑ & Tippen‑Unterstützung
11. Build / Minifizierung
12. Session‑ & Transportmodell
13. Deployment‑Hinweise (Reverse Proxy, TLS, Skalierung)
14. Troubleshooting Matrix
15. Mitwirkungsrichtlinien
16. Sicherheitsaspekte
17. Lizenz

---
## 1. Hauptmerkmale

* Multi‑Fenster / Tab‑Modell (Channels, Queries, Status, Hilfsfenster)
* Live‑Sprachwechsel (JSON i18n) – kein Neuladen, Events propagieren Updates
* IRCv3‑Funktionen: Nachrichtentags (typing), SASL (optional)
* Dynamisches Nick‑Kontextmenü (berechtigungsabhängig, bei Sprachwechsel neu beschriftet)
* Theme‑Hue & variablengetriebene CSS via `qui.mcss`
* URL‑serialisierbare Optionen & lokale Persistenz
* Sauberer Fallback: falls JS‑Minifizierung oder SVG fehlschlägt, werden Fallbacks genutzt
* Emoji‑Picker (Kategorien, Hautfarbvarianten)
* Hervorhebungs‑Erkennung, Last‑read‑Marker, Nick‑Färbung
* Plugable WEBIRC / CGIIRC / HMAC‑Modi zum Weiterleiten echter Client‑IP/Hostname
* Minimale externe Laufzeitabhängigkeiten (Twisted + Standardbibliothek)

---
## 2. Architekturüberblick

| Schicht | Zweck | Hinweise |
|--------|-------|---------|
| Browser JS (ES5‑Stil) | UI‑Rendering, Event‑Handling, Option‑Persistenz, i18n‑Updates | Kein Framework‑Lock‑in; nutzt leichte Klassenmuster ähnlich MooTools |
| AJAX / (optional) WebSocket‑Transport | Zustellung von IRC‑Events, Übermittlung von Benutzerkommandos | WebSocket bietet niedrigere Latenz; AJAX Long‑Poll ist Fallback |
| Twisted HTTP Engines (`ajaxengine`, `staticengine`, etc.) | Session‑Management, Polling, statische Asset‑Bereitstellung | Jede IRC‑Session multiplexed Subscriber‑Kanäle |
| IRC‑Client (`qwebirc/ircclient.py`) | Twisted‑basierte IRC‑Protokoll‑Handhabung + CAP + SASL | Abstrahiert via Factory, unterstützt ausgehendes IP‑Binding |
| Config‑Layer (`config.py`) | Deployment & Feature‑Schalter | Python‑Datei – dynamische Logik möglich |
| i18n‑Loader | Lädt Locale‑JSONs bei Bedarf, nicht alle auf einmal | Laufzeit‑Übersetzer‑Callbacks für Live‑Updates |

Sessions puffern ausgehende Events; Subscriber (AJAX Poll oder WebSocket) entleeren diese. Disconnect‑Events werden in die Queue gestellt, damit der Client beim nächsten Poll Fehlergründe anzeigen kann.

---
## 3. Schnellstart

### 3.1 Klonen
```
git clone https://github.com/WarPigs1602/mwebirc.git
cd mwebirc
```

### 3.2 Python‑Umgebung (empfohlen)
```
python3 -m venv venv
source venv/bin/activate
```
Benötigt Python 3.9+ (ältere Versionen können funktionieren, werden aber nicht kontinuierlich getestet).

### 3.3 Abhängigkeiten installieren
```
pip install -r requirements.txt
```

### 3.4 Konfigurieren
```
cp config.py.example config.py
$EDITOR config.py
```
Mindesteinstellungen: `IRCSERVER`, `IRCPORT`. Optional: `SASL_LOGIN_ENABLED = True` aktivieren.

### 3.5 (Optional) Build / Minifizierung
```
./compile.py
```
Wenn `uglify-js` global installiert ist, werden JS‑Bundles minifiziert:
```
npm install -g uglify-js
```
Fehlschläge fallen auf unminifizierte Quellen zurück (Warnung wird geloggt, Ausführung läuft weiter).

### 3.6 Starten
```
./run.py
```
Im Browser: http://localhost:9090/

---
## 4. Konfiguration & WEBIRC / Gateway‑Identität

Editiere `config.py` (kopiert aus dem Beispiel). Nützliche Konfigurationsschlüssel:

| Einstellung | Zweck | Hinweise |
|------------|-------|---------|
| `IRCSERVER`, `IRCPORT`, `SSLPORT` | Ziel‑IRC‑Netzwerk | `SSLPORT` überschreibt `IRCPORT`, wenn gesetzt |
| `WEBIRC_MODE` | Einer von: `webirc`, `cgiirc`, `hmac`, `None`/`WEBIRC_REALNAME` | Kontrolliert, wie Client‑IP/Hostname weitergegeben wird |
| `WEBIRC_PASSWORD` | Shared Secret für `webirc` / `cgiirc` Modi | Muss mit IRCd‑Konfiguration übereinstimmen |
| `WEBIRC_GATEWAY` | Gateway‑Name, der im WEBIRC‑Befehl gesendet wird | Standard: System‑Hostname, falls nicht gesetzt |
| `OUTGOING_IP` | Lokales ausgehendes Socket binden | Für Multi‑Homed Hosts |
| `IDENT` | Statischer Ident oder `IDENT_HEX` / `IDENT_NICKNAME` | Hex kodiert Benutzer‑IP bei `IDENT_HEX` |
| `SASL_LOGIN_ENABLED` | Zeigt SASL‑Felder im Verbindungsdialog | Aktuell nur SASL PLAIN |
| `UPDATE_FREQ` | Minimale Sekunden zwischen ausgehenden Batches | Drosselt UI‑Flood |
| `MAXBUFLEN`, `MAXLINELEN` | Sicherheitslimits für Puffer / Zeilen | Verhindert unkontrollierten Speicherverbrauch |
| `DNS_TIMEOUT` | PTR Lookup Timeout | Beeinflusst Hostname‑Auflösung in WEBIRC‑Modi |
| `STATIC_BASE_URL` / `DYNAMIC_BASE_URL` | Präfix‑Umschreibung für Assets / AJAX | Leer für einfache Single‑Instance Setups |

> Tipp: Für `WEBIRC_MODE = "webirc"` stelle sicher, dass dein IRCd das passende Passwort und Gateway‑Host konfiguriert hat. Der Client sendet: `WEBIRC <password> <gateway> <resolved-hostname> <ip>`.

---
## 5. Entwicklungsworkflow

Roh‑, ungebündelte Dateien bereitstellen für einfacheres Debugging:
```
cd static/js && ln -s ../../js debug || true
cd ../css && ln -s ../../css debug || true
```
Dann besuchen: `http://<host>/quidebug.html`.

Hot‑Tips:
* Inspect Tabs: `a.tab`; Close‑Button SVG: `.tabclose svg`.
* Live Sprachvorschau triggern: `window.dispatchEvent(new Event('qwebirc:languageChanged'))` (oder Translator Hook verwenden).
* Latenz messen: DevTools → Network → Long‑Poll‑Dauer oder WebSocket‑Frames beobachten.

---
## 6. Theming (anpassbares Stylesheet)

`css/qui.mcss` enthält Platzhalter wie `$(base_hue)`. Laufzeitcode ersetzt Werte und injiziert das generierte Stylesheet. Das Ändern des Hue‑Sliders aktualisiert live.

Schritt zum Hinzufügen einer Variable:
1. Platzhalter in `qui.mcss` einfügen
2. Substitutionsmap im JS‑Code erweitern
3. Optional Benutzeroption hinzufügen

---
## 7. Internationalisierung (i18n)

* Index: `locales/index.json`
* Sprachdateien: `locales/<code>.json`
* Fehlende Schlüssel fallen sauber auf Englisch zurück.
* UI lauscht auf Translator‑Callbacks + `qwebirc:languageChanged` DOM‑Event.
* Offene Nick‑Menüs werden live neu beschriftet; wenn ein Menü während des Wechsels offen ist, aktualisiert es sich in‑place.

Sprache hinzufügen:
```
cp locales/en.json locales/<new>.json
```
Übersetze Keys; füge einen Eintrag in `index.json` hinzu.

---
## 8. Optionssystem

Definiert in JavaScript (`options.js`) als Array. Zur Laufzeit werden Labels durch i18n Werte ersetzt. Optionen können Hooks deklarieren um Änderungen anzuwenden (z. B. Theme‑Hue, Layout‑Wechsel).

Option hinzufügen: Array erweitern, Übersetzungsschlüssel hinzufügen, Nebenwirkungen implementieren.

---
## 9. Embed‑Assistent

Der Embed‑Assistent erzeugt kopierbare `<iframe>`‑ oder Script‑Integrationsbeispiele für Seitenbetreiber. Er verwendet die gleiche Übersetzer‑Pipeline – neue Übersetzungsschlüssel erscheinen automatisch, wenn sie zur Locale‑JSON hinzugefügt werden.

---
## 10. Emoji‑ & Tippen‑Unterstützung

* Emoji‑Picker: Kategorien + Hautfarbe; eingefügt als Unicode.
* Tippen‑Anzeige: benötigt verhandelte CAP `message-tags`; nutzt `TAGMSG` mit `+typing` Tags um Zustände anzuzeigen.

---
## 11. Build / Minifizierung

`compile.py` konkateniziert Kern‑JS, minifiziert optional und kopiert Locales & statische Assets. Es ist idempotent; kann mehrfach ausgeführt werden. Falls Minifizierung fehlschlägt, wird das unminifizierte Bundle verwendet.

---
## 12. Session‑ & Transportmodell

* Jede IRC‑Verbindung ist ein `IRCSession`‑Objekt.
* Subscriptions repräsentieren aktive Long‑Poll‑Requests oder einen WebSocket‑Kanal.
* Events werden an einen Puffer angehängt; Flush‑Scheduling respektiert `UPDATE_FREQ`.
* Bei Disconnect wird ein finales Event in die Queue gestellt; wenn kein Subscriber angehängt ist, bleibt der Puffer kurz bestehen, sodass sich Clients beim Re‑Subscribe den Inhalt holen können.
* WebSocket Engine spiegelt die AJAX‑Channel Semantik.

---
## 13. Deployment‑Hinweise

### Reverse Proxy (nginx Beispiel)
```
location / { proxy_pass http://127.0.0.1:9090; proxy_set_header X-Forwarded-For $remote_addr; }
```
Wenn du `FORWARDED_FOR_HEADER` und `FORWARDED_FOR_IPS` setzt, kann die Anwendung diesem Header vertrauen.

### TLS
Beende TLS am Proxy; intern plain HTTP auf 127.0.0.1:9090 laufen lassen.

### Skalierung
Starte mehrere Worker‑Prozesse auf verschiedenen Ports hinter einem Load‑Balancer. Session‑Stickiness (Cookie oder IP‑Hash) empfohlen, damit eine IRC‑Session an einen Backend gebunden bleibt.

---
## 14. Troubleshooting

| Symptom | Wahrscheinliche Ursache | Maßnahme |
|--------|------------------------|---------|
| SVG × Fallback Anzeige | CSP oder fehlende SVG‑Unterstützung | CSP lockern / Fallback akzeptieren |
| Fehlende Übersetzungen | Schlüssel fehlt in Sprachdatei | Key hinzufügen; Englisch als Fallback |
| Tippen Anzeige fehlt | Server hat `message-tags` nicht bestätigt | CAP Negotiation Logs prüfen |
| WebSocket wird nicht verwendet | Kein Autobahn / Proxy‑Fallback | Autobahn installieren, Proxy prüfen |
| Echte IP nicht weitergeleitet | Falsche `WEBIRC_MODE` / Passwort | IRCd WEBIRC Block & Passwort prüfen |
| Disconnect‑Meldung fehlt | Client hat sich nach Puffer‑Purge resubscribed | Puffer‑Retention erhöhen oder WebSocket aktivieren |

---
## 15. Mitwirkungsrichtlinien

1. Kleine, fokussierte Pull Requests (eine logische Änderung).
2. Übersetzungsschlüssel aktualisieren / hinzufügen, wenn UI‑Text geändert wird.
3. Vermeide große neue Abhängigkeiten; halte den Footprint minimal.
4. Führe `./compile.py` aus, wenn du Bundling oder Locale‑Pipeline änderst.
5. Füge Notizen in diese README ein, wenn du benutzer‑sichtbare Features hinzufügst.

Qualitätschecks (empfohlen):
```
python -m py_compile $(git ls-files '*.py')
```

---
## 16. Sicherheitsaspekte

* Vorsicht bei HTML‑Injection; dynamische Fragmente sanitizen.
* Erwäge ein CSP Header (erlaube `data:` für Inline‑SVG wenn benutzt).
* In Produktion hinter einen Reverse‑Proxy, der untrusted `X-Forwarded-*` Header entfernt bevor er vertrauenswürdige wieder einfügt.
* Rate‑Limiting Verbindungsversuche am Proxy oder Firewall‑Layer in Erwägung ziehen.

---
## 17. Lizenz

Siehe die Datei `LICENCE`.

---
### Danksagungen & Historie
Ursprünglich abgeleitet von qwebirc; modernisiert für Live‑Übersetzung, Theming und reduzierten Abhängigkeitsumfang.

---
### Roadmap (indikativ)
* Optionaler WebSocket‑Only Modus
* IRCv3 Batch & chghost Unterstützung
* Dark Mode Variable Set
* Client‑seitige Accessibility Verbesserungen (ARIA Roles)

Contributions willkommen.
