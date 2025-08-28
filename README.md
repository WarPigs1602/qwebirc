
# qwebirc – Modern Web IRC Client

![CI](https://github.com/qwebirc/qwebirc/workflows/CI/badge.svg)

qwebirc is a web-based IRC client built with Python (Twisted) and a lightweight JavaScript UI layer. It focuses on a responsive UX, live language switching and a customizable theme system.

## Key Features

- Multiple window/tab layout (channels, queries, status & custom panes)
- Live language switching (JSON based i18n) without reload
- Options / Embed Wizard / About panes (custom window system)
- Uniform SVG close buttons across tabs and panes (fallback to × when SVG unavailable)
- Typing indicators using IRCv3 `TAGMSG +typing` capability
- Emoji picker with categories and skin tone selector
- Nick colouring, last position markers, highlight detection
- Configurable hue / theming via modifiable stylesheet (`qui.mcss` variables)
- Client-side option persistence & URL-serialisable options
- Minimal dependencies – plain ES5-era JavaScript (MooTools style classes) and Twisted backend
- Graceful degradation if minification or SVG not supported

## Quick Start

### 1. Clone
```
git clone https://github.com/WarPigs1602/qwebirc.git
cd qwebirc
```

### 2. Python Environment (recommended)
```
python3 -m venv venv
source venv/bin/activate
```
Requires Python 3.9+ (earlier may work but not tested recently).

### 3. Install Dependencies
```
pip install -r requirements.txt
```

### 4. Configure
```
cp config.py.example config.py
$EDITOR config.py
```
Minimum: set IRC network host/port. Enable `SASL_LOGIN_ENABLED = True` to show SASL user/pass fields in the connect dialog.

### 5. (Optional) Build / Minify
```
./compile.py
```
If available, `uglifyjs` minifies aggregated JS. Install globally if missing:
```
npm install -g uglify-js
```
If minification fails, original sources are used (a warning is logged).

### 6. Run
```
./run.py
```
Visit: http://localhost:9090/
 
## Development Workflow

For rapid iteration avoid rebuilding every change:

Create debug symlinks so the app serves raw sources:
```
cd static/js
ln -s ../../js debug || true
cd ../css
ln -s ../../css debug || true
```
Then browse to `http://<host>/quidebug.html` (loads unminified/individual files, easier to debug in dev tools).

### Hot Tips
* Use browser dev tools to inspect dynamically created tabs: `a.tab`, close buttons: `span.tabclose > svg`.
* Language switching: dispatch a custom event `qwebirc:languageChanged` with `{detail:{lang:'de'}}` to preview translations.
* The typing indicator appears only when the IRC server negotiated the `message-tags` capability.

## Theming & Modifiable Stylesheet

`qui.mcss` acts like a macro stylesheet. At runtime colour variables (hue/lightness/saturation) are substituted. Changing Options → “Adjust user interface hue” updates the active stylesheet without page reload.

To add a new adjustable variable:
1. Add placeholder in `css/qui.mcss` (e.g. `$(my_new_colour)`)
2. Extend the set in code (see `setModifiableStylesheetValues` usage)
3. Optionally expose a UI option.

## Internationalisation (i18n)

Language data: `locales/index.json` + per-language JSON files, loaded on demand.

Add a language:
1. Add its code & label to `locales/index.json`
2. Create `<code>.json` by copying an existing file
3. Only missing keys fall back to English.

UI listens for translator callbacks and the custom DOM event `qwebirc:languageChanged` so panes/tabs retitle instantly.

## Options System

Options defined in `options.js` -> `qwebirc.config.DEFAULT_OPTIONS`. Each entry: `[id, KEY, Default Label, defaultValue, (optional extras)]`.
Labels are replaced at runtime by i18n values (keys like `TAB_OPTIONS`, `SAVE`, etc.).

To add an option:
1. Add to `DEFAULT_OPTIONS`
2. Provide translations
3. (If needed) implement `applyChanges` in extras.

## Embed Wizard

Guides site owners to generate parameters for embedding qwebirc into their own pages. The wizard’s pane type is `embeddedwizard` and auto-translates its steps.

## Emoji Picker
Activated via the small smiley button inside the input area. Features categories, scrollable grid, and skin tone variants for hand emojis.

## SVG Close Buttons
All tabs (except Status / Connect) and custom panes show a uniform SVG “X” icon. If SVG fails, a typographic × appears. Styling in `.tabclose svg` inside `qui.mcss`.

## Typing Indicator
Shows active typers in channel/query if the server supports message tags + the `+typing` tag. Emits periodic updates while user is typing and transitions to paused/done after inactivity.

## Minification / Build
`./compile.py` aggregates & minifies JS and copies locale data under `static/`. Safe to run repeatedly; unminified sources served if minification fails.

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| No SVG close icon (shows ×) | Missing SVG support or CSP blocks inline SVG | Check console for warnings; relax CSP or accept fallback |
| Language does not change some labels | Missing key in locale file | Add key to language JSON (falls back to English otherwise) |
| Typing indicator never appears | Server lacks `message-tags` / `+typing` capability | Verify CAP negotiation or disable feature |
| Emoji picker not closing | Outside click handler blocked by overlay styles | Inspect z-index and event propagation |

## Contributing

Pull requests welcome. Please:
1. Keep patches focused (one feature/fix)
2. Add/update translations where keys change
3. Avoid introducing heavy new dependencies
4. Run `./compile.py` if you adjust bundling logic

## Security Notes

Be mindful of user-supplied strings inserted into the DOM. Existing code tries to sanitise where needed, but review any new dynamic HTML. If deploying behind a CSP, permit inline SVG or ensure the fallback text close button is acceptable.

## License

See `LICENCE` file.
