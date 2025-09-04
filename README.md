

# mwebirc – Modern Web IRC Client (formerly qwebirc)

![CI](https://github.com/WarPigs1602/mwebirc/workflows/CI/badge.svg)

mwebirc (formerly qwebirc) is a fast, low-dependency, web-based IRC client written in Python (Twisted) with a compact ES5-style JavaScript frontend. It is designed for:

* Real‑time interaction (low latency update pipeline)
* Live language switching without a full page refresh
* Easy theming & white‑label embedding
* Operating behind reverse proxies / load balancers

---
## Table of Contents
1. Features
2. Architecture Overview
3. Quick Start
4. Configuration & WEBIRC / Gateway Identity
5. Development Workflow
6. Theming (Modifiable Stylesheet)
7. Internationalisation (i18n)
8. Options System
9. Embed Wizard
10. Emoji & Typing Support
11. Build / Minification
12. Session & Transport Model
13. Deployment Notes (Reverse Proxy, TLS, Scaling)
14. Troubleshooting Matrix
15. Contributing Guidelines
16. Security Considerations
17. License

---
## 1. Key Features

* Multi-window / tab model (channels, queries, status, auxiliary panes)
* Live language switching (JSON i18n) – no reload, events propagate updates
* IRCv3 capabilities: message tags (typing), SASL (optional)
* Dynamic nick context menu (permission aware, retranslated on language change)
* Theme hue & variable-driven CSS via `qui.mcss`
* URL serialisable options & local persistence
* Clean degradation: if JS minification or SVG fails graceful fallbacks are used
* Emoji picker (categories, skin tone variants)
* Highlight detection, last-read markers, nick colouring
* Pluggable WEBIRC / CGIIRC / HMAC modes for forwarding real client IP/hostname
* Minimal external runtime deps (Twisted + standard library)

---
## 2. Architecture Overview

| Layer | Purpose | Notes |
|-------|---------|-------|
| Browser JS (ES5 style) | UI rendering, event handling, option persistence, i18n updates | No framework lock‑in; uses lightweight class patterns similar to MooTools |
| AJAX / (optional) WebSocket transport | Delivers IRC events, pushes user commands | WebSocket adds lower latency; AJAX long‑poll is fallback |
| Twisted HTTP engines (`ajaxengine`, `staticengine`, etc.) | Session management, polling, static asset serving | Each IRC session multiplexes subscriber channels |
| IRC client (`qwebirc/ircclient.py`) | Twisted-based IRC protocol handling + CAP + SASL | Abstracted via factory, supports outbound IP binding |
| Config layer (`config.py`) | Deployment & feature toggles | Python file – dynamic logic allowed |
| i18n loader | Loads locales JSON on demand, not all upfront | Runtime translator callbacks for live updates |

Sessions buffer outgoing events; subscribers (AJAX poll or WebSocket) drain them. Disconnect events are queued so the client can display failure reasons on next poll.

---
## 3. Quick Start

### 3.1 Clone
```
git clone https://github.com/WarPigs1602/mwebirc.git
cd mwebirc
```

### 3.2 Python Environment (Recommended)
```
python3 -m venv venv
source venv/bin/activate
```
Requires Python 3.9+ (earlier may work but are not continuously tested).

### 3.3 Install Dependencies
```
pip install -r requirements.txt
```

### 3.4 Configure
```
cp config.py.example config.py
$EDITOR config.py
```
Minimum edits: set `IRCSERVER`, `IRCPORT`. Optional: enable `SASL_LOGIN_ENABLED = True`.

### 3.5 (Optional) Build / Minify
```
./compile.py
```
If you have `uglify-js` installed globally it minifies the aggregated bundle:
```
npm install -g uglify-js
```
Failures fall back to original sources (warning logged, continues running).

### 3.6 Run
```
./run.py
```
Browse: http://localhost:9090/

---
## 4. Configuration & WEBIRC / Gateway Identity

Edit `config.py` (copied from the example). Useful keys:

| Setting | Purpose | Notes |
|---------|---------|-------|
| `IRCSERVER`, `IRCPORT`, `SSLPORT` | Target IRC network | `SSLPORT` overrides `IRCPORT` when set |
| `WEBIRC_MODE` | One of: `webirc`, `cgiirc`, `hmac`, `None`/`WEBIRC_REALNAME` | Controls how client IP/hostname is forwarded |
| `WEBIRC_PASSWORD` | Shared secret for `webirc` / `cgiirc` modes | Must match IRCd config |
| `WEBIRC_GATEWAY` | Gateway name sent in WEBIRC command | Defaults to system hostname if unset |
| `OUTGOING_IP` | Bind local outgoing socket | For multi-homed hosts |
| `IDENT` | Static ident or `IDENT_HEX` / `IDENT_NICKNAME` | Hex encodes user IP if `IDENT_HEX` |
| `SASL_LOGIN_ENABLED` | Shows SASL fields on connect dialog | SASL PLAIN only currently |
| `UPDATE_FREQ` | Minimum seconds between outbound batches | Throttles UI flood |
| `MAXBUFLEN`, `MAXLINELEN` | Safety limits for buffering / lines | Prevents runaway memory |
| `DNS_TIMEOUT` | PTR lookup timeout | Affects hostname resolution in WEBIRC modes |
| `STATIC_BASE_URL` / `DYNAMIC_BASE_URL` | Prefix rewriting for assets / AJAX | Empty for simple single-instance setups |

> Tip: For `WEBIRC_MODE = "webirc"` ensure your IRCd has the matching password and gateway host defined. The client sends: `WEBIRC <password> <gateway> <resolved-hostname> <ip>`.

---
## 5. Development Workflow

Serve raw, unbundled files for easier debugging:
```
cd static/js && ln -s ../../js debug || true
cd ../css && ln -s ../../css debug || true
```
Then visit: `http://<host>/quidebug.html`.

Hot tips:
* Inspect tabs: `a.tab`; close button SVG: `.tabclose svg`.
* Trigger live language preview: `window.dispatchEvent(new Event('qwebirc:languageChanged'))` (or use translator hooking).
* Measure latency: open dev tools → Network → observe long‑poll durations or WebSocket frames.

---
## 6. Theming (Modifiable Stylesheet)

`css/qui.mcss` contains placeholders like `$(base_hue)`. Runtime code substitutes values and injects a generated stylesheet. Changing the hue slider updates this live.

Add a variable:
1. Insert placeholder in `qui.mcss`
2. Extend the substitution map in the JS code
3. Optionally add a user option control

---
## 7. Internationalisation (i18n)

* Index: `locales/index.json`
* Language files: `locales/<code>.json`
* Missing keys gracefully fall back to English.
* UI listens to translator callbacks + `qwebirc:languageChanged` custom DOM event.
* Open nick menus are re-labelled live; if one is open during a switch it updates in place.

Add a language:
```
cp locales/en.json locales/<new>.json
```
Translate keys; add entry to `index.json`.

---
## 8. Options System

Defined in JavaScript (`options.js`) as an array. At runtime labels are replaced by i18n values. Options can declare hooks for applying changes (e.g. theme hue, layout switches).

Add an option: extend the array, supply translation key, implement any side‑effect logic.

---
## 9. Embed Wizard

The embed wizard pane produces copy‑paste `<iframe>` or script integration samples for site owners. It uses the same translation pipeline— new translation keys automatically appear if added to locale JSON.

---
## 10. Emoji & Typing Support

* Emoji picker: categories + skin tone cycle; inserted as plain Unicode.
* Typing indicator: requires negotiated CAP `message-tags`; uses `TAGMSG` with `+typing` tags to show states.

---
## 11. Build / Minification

`compile.py` concatenates core JS, optionally minifies, and copies locales & static assets. It is idempotent; you can run it repeatedly. If minification fails the unminified bundle is served.

---
## 12. Session & Transport Model

* Each IRC connection is an `IRCSession` object.
* Subscriptions represent active long‑poll requests or a WebSocket channel.
* Events are appended to a buffer; flush scheduling respects `UPDATE_FREQ`.
* On disconnect, a final event is queued; if no subscriber is attached the buffer persists briefly allowing the client to collect it after re‑subscribing.
* WebSocket engine mirrors the AJAX channel semantics.

---
## 13. Deployment Notes

### Reverse Proxy (nginx example)
```
location / { proxy_pass http://127.0.0.1:9090; proxy_set_header X-Forwarded-For $remote_addr; }
```
If you set `FORWARDED_FOR_HEADER` and `FORWARDED_FOR_IPS`, the application can trust that header for real client IP.

### TLS
Terminate TLS at the proxy; internally run plain HTTP on 127.0.0.1:9090.

### Scaling
Run multiple worker processes on different ports behind a load balancer. Stickiness (per cookie or IP hash) is recommended to keep an IRC session bound to one backend.

---
## 14. Troubleshooting

| Symptom | Likely Cause | Action |
|---------|--------------|--------|
| SVG × fallback showing | CSP or missing SVG support | Relax CSP / accept fallback |
| Missing translated labels | Key absent in language file | Add key; English fallback otherwise |
| Typing indicator absent | Server did not ACK `message-tags` | Inspect CAP negotiation logs |
| WebSocket not used | No Autobahn / browser fallback | Install Autobahn, check network/proxy |
| Real IP not forwarded | Misconfigured `WEBIRC_MODE` / password | Verify IRCd WEBIRC block & password |
| Disconnect message not shown | Client resubscribed after buffer purge | Increase buffer retention or enable WebSocket |

---
## 15. Contributing Guidelines

1. Small, focused pull requests (one logical change).
2. Update / add translation keys where UI text changes.
3. Avoid large new dependencies; keep footprint minimal.
4. Run `./compile.py` if you touch bundling or locales pipeline.
5. Add notes to this README when introducing user‑visible features.

Development quality checks (suggested):
```
python -m py_compile $(git ls-files '*.py')
```

---
## 16. Security Considerations

* Be cautious with any HTML injection; sanitise dynamic fragments.
* Consider adding a CSP header (allow `data:` for inline SVG if used).
* In production, run behind a reverse proxy that strips untrusted `X-Forwarded-*` headers before re-injecting trusted ones.
* Rate limit connection attempts at the proxy or firewall layer.

---
## 17. License

See the `LICENCE` file.

---
### Attributions & History
Originally derived from qwebirc; modernised for live translation, theming and reduced dependency surface.

---
### Roadmap (Indicative)
* Optional WebSocket-only mode
* IRCv3 batch & chghost support
* Dark mode variable set
* Client-side accessibility improvements (ARIA roles)

Contributions welcome.
