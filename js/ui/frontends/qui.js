qwebirc.ui.QUI = new Class({
  Extends: qwebirc.ui.RootUI,
  initialize: function(parentElement, theme, options) {
    this.parent(parentElement, qwebirc.ui.QUI.Window, "qui", options);
    this.theme = theme;
    this.parentElement = parentElement;
    this.setModifiableStylesheet("qui");
  this.client = null; // Reference to IRC client for typing
  // Later repair check for pane tab close buttons (Options / Embed / About)
    try {
      var self = this;
      window.addEvent('qwebirc:languageChanged', function(){ self.__repairPaneTabCloses && self.__repairPaneTabCloses(); });
      this.__repairPaneTabCloses = function(){
        try {
          (self.windowArray||[]).forEach(function(w){
            if(!w) return;
            if(w.pane && (w.pane.type=='optionspane' || w.pane.type=='embeddedwizard' || w.pane.type=='aboutpane')) {
              if(w._ensureTabClose) w._ensureTabClose(w.type, w._baseName || w.name);
              if(w.tabclose && !w.tabclose.getElement('svg')) {
                w.tabclose.set('html','<svg viewBox="0 0 14 14" width="14" height="14" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><line x1="3" y1="3" x2="11" y2="11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="11" y1="3" x2="3" y2="11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>');
              }
            }
          });
        } catch(e) {}
      };
    } catch(e) {}
  // Gemeinsamer Event-Stopper: direkte Nutzung von qwebirc.ui.util.stopEvent (kein Wrapper)
  },
  postInitialize: function() {
    this.qjsui = new qwebirc.ui.QUI.JSUI("qwebirc-qui", this.parentElement);
    this.qjsui.addEvent("reflow", function() {
      var w = this.getActiveWindow();
  if(w != null)
        w.onResize();
    }.bind(this));
    this.qjsui.top.addClass("outertabbar");
    this.qjsui.left.addClass("outertabbar");

    this.qjsui.top.addClass("outertabbar_top");
    this.qjsui.left.addClass("outertabbar_left");

    this.qjsui.bottom.addClass("input");
    this.qjsui.right.addClass("nicklist");
    this.qjsui.topic.addClass("topic");
    this.qjsui.middle.addClass("lines");
    
    this.outerTabs = new Element("div");
    this.sideTabs = null;

    this.tabs = new Element("div");
    this.tabs.addClass("tabbar");
    
    this.__createDropdownMenu();

    this.outerTabs.appendChild(this.tabs);
    this.origtopic = this.topic = this.qjsui.topic;
    this.lines = this.qjsui.middle;
    this.orignicklist = this.nicklist = this.qjsui.right;
    
    this.input = this.qjsui.bottom;
    this.reflow = this.qjsui.reflow.bind(this.qjsui);

    var scrollHandler = function(x) {
      var event = x || window.event;
      // Normalisieren des Mausrad-Werts falls MooTools Wrapper fehlt
      if(event && event.wheel == null) {
        if(typeof event.wheelDelta !== 'undefined') event.wheel = event.wheelDelta;
        else if(typeof event.deltaY !== 'undefined') event.wheel = -event.deltaY;
      }
      var up, down;
      if(this.sideTabs) {
        var p = this.qjsui.left;

        /* don't scroll if we're scrollable */
        if(p.getScrollSize().y > p.clientHeight)
          return;

        up = event.wheel < 0;
        down = event.wheel > 0;
      } else {
        up = event.wheel > 0;
        down = event.wheel < 0;
      }

  if(up) this.nextWindow();
  else if(down) this.prevWindow();
  qwebirc.ui.util.stopEvent(event);
    }.bind(this);
    this.qjsui.left.addEvent("mousewheel", scrollHandler);
    this.qjsui.top.addEvent("mousewheel", scrollHandler);

    this.createInput();
    this.reflow();
    // Gestaffelte Reflows zur Stabilisierung des Layouts -> native setTimeout
  qwebirc.ui.util.scheduleReflowBatches(this, function(full){ this.reflow(full); });

    this.setSideTabs(this.uiOptions.SIDE_TABS);

    // --- Dynamische mobile Höhe (verhindert Scroll-Springen bei Tastatur / URL-Bar) ---
    (function(){
      try {
        var self = this;
        var root = document.documentElement; // :root für --app-vh
        var supportsVV = typeof window.visualViewport !== 'undefined';
        var lastVH = null;
        var updateVH = function(reason){
          try {
            var vv = window.visualViewport;
            var h = (supportsVV && vv) ? vv.height : window.innerHeight;
            // Rundung zur Verringerung von jitter
            var rounded = Math.round(h * 100) / 100;
            if(lastVH === rounded) return; // keine Änderung -> skip
            lastVH = rounded;
            root.style.setProperty('--app-vh', rounded + 'px');
            // kleineren async Reflow anstoßen
            setTimeout(function(){ try { self.reflow && self.reflow(); } catch(e) {} }, 10);
          } catch(e) {}
        };
        updateVH('init');
        if(supportsVV) {
          window.visualViewport.addEventListener('resize', function(){ updateVH('vv-resize'); });
          window.visualViewport.addEventListener('scroll', function(){ updateVH('vv-scroll'); });
        } else {
          window.addEvent('resize', function(){ updateVH('win-resize'); });
        }
        // Keyboard Fokus Events (häufige Ursache für Sprung)
        window.addEventListener('focusin', function(e){ if(e && e.target && e.target.tagName==='INPUT') updateVH('focusin'); });
        window.addEventListener('orientationchange', function(){ setTimeout(function(){ updateVH('orientation'); }, 60); });
      } catch(e) {}
    }).bind(this)();

    // Live re-translation for open nick menu
    if(!this.__nickMenuLangListenerAdded) {
      this.__nickMenuLangListenerAdded = true;
      var self = this;
      var refreshOpenNickMenu = function() {
        try {
          if(!self.__openNickMenu || !self.__openNickMenu.container || !self.__openNickMenu.container.parentNode) return;
          var cont = self.__openNickMenu.container;
          var nick = self.__openNickMenu.nick;
          // Alle Links neu beschriften
          var links = cont.getElementsByTagName('a');
          for(var i=0;i<links.length;i++) {
            var a = links[i];
            var item = a.__menuItem;
            if(!item) continue;
            try {
              var lbl = (typeof item.text === 'function') ? item.text() : item.text;
              a.set('text', '- ' + lbl);
            } catch(e) {}
          }
        } catch(e) {}
      };
      if(window.qwebirc && typeof window.qwebirc.registerTranslator === 'function') {
        window.qwebirc.registerTranslator(function(){ refreshOpenNickMenu(); });
      }
      window.addEventListener('qwebirc:languageChanged', function(){ refreshOpenNickMenu(); });
    }

  // Hide connect status in typing bar when signedOn fires
    this.addEvent && this.addEvent('signedOn', function() {
      if(qwebirc.ui.util && qwebirc.ui.util.connectStatus) qwebirc.ui.util.connectStatus.hide();
    });

    // Nicklist Toggle (für alle Geräte inkl. Desktop)
    try {
      if(!this.__nicklistToggleAdded) {
        this.__nicklistToggleAdded = true;
        var self = this;
        var btnTitle = function(){
          try {
            var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
            var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang] && window.qwebirc.i18n[lang].options;
            return (i18n && i18n.TOGGLE_NICKLIST) ? i18n.TOGGLE_NICKLIST : 'Nicklist';
          } catch(e) { return 'Nicklist'; }
        };
        var toggleBtn = new Element('button', { type: 'button', 'class': 'nicklist-toggle', text: '👥' });
        toggleBtn.set('title', btnTitle());
        toggleBtn.setAttribute && toggleBtn.setAttribute('aria-label', btnTitle());
        this.__nicklistToggle = toggleBtn;
    this.__positionNicklistToggle = function(){
          try {
      var host = self.sideTabs ? self.qjsui.left : (self.tabs || self.outerTabs || self.qjsui.top);
            if(self.__nicklistToggle.parentNode !== host) host.appendChild(self.__nicklistToggle);
            self.__nicklistToggle.addClass(self.sideTabs ? 'nicklist-toggle-side' : 'nicklist-toggle-top');
            try { host.appendChild(self.__nicklistToggle); } catch(_) {}
            if(self.__nicklistToggleObserverHost !== host) {
              if(self.__nicklistToggleObserver) { try { self.__nicklistToggleObserver.disconnect(); } catch(_) {} }
              self.__nicklistToggleObserverHost = host;
              try {
                self.__nicklistToggleObserver = new MutationObserver(function(){
                  try {
                    var btn = self.__nicklistToggle;
                    if(!btn) return;
                    var p = btn.parentNode;
                    if(!p) return;
                    if(p.lastChild !== btn) {
                      p.appendChild(btn);
                    }
                  } catch(e) {}
                });
                self.__nicklistToggleObserver.observe(host, {childList:true});
              } catch(e) {}
            }
          } catch(_) {}
        };
        this.__positionNicklistToggle();
        var updateState = function(forceReflow){
          var visible = !!self.uiOptions.SHOW_NICKLIST;
            try { toggleBtn.setAttribute('aria-pressed', visible ? 'true' : 'false'); } catch(_) {}
            if(visible) toggleBtn.addClass('active'); else toggleBtn.removeClass('active');
          // Klassen direkt auf nicklist Panel setzen
          try {
            var nl = self.qjsui && self.qjsui.right;
            if(nl) {
              if(visible) { nl.addClass('nicklist-touch-open'); nl.removeClass('nicklist-touch-closed'); }
              else { nl.removeClass('nicklist-touch-open'); nl.addClass('nicklist-touch-closed'); }
            }
          } catch(_) {}
          if(forceReflow) self.reflow();
        };
        this.updateNicklistToggleVisibility = function(){
          try {
            if(!self.__nicklistToggle) return;
            var w = self.getActiveWindow && self.getActiveWindow();
            var show = false;
            if(w && (w.type == qwebirc.ui.WINDOW_CHANNEL || w.type == qwebirc.ui.WINDOW_QUERY || w.type == qwebirc.ui.WINDOW_MESSAGES)) {
              if(w.nicklist != null) show = true;
            }
            self.__nicklistToggle.setStyle('display', show ? 'inline-flex' : 'none');
          } catch(e) {}
        };
        toggleBtn.addEvent('click', function(e){
          qwebirc.ui.util.stopEvent(e);
          self.uiOptions.SHOW_NICKLIST = !self.uiOptions.SHOW_NICKLIST;
          var w = self.getActiveWindow && self.getActiveWindow();
          if(w) self.qjsui.showChannel((w.nicklist != null), self.uiOptions.SHOW_NICKLIST);
          updateState(true);
          self.updateNicklistToggleVisibility && self.updateNicklistToggleVisibility();
        });
        var refreshTitle = function(){ try { toggleBtn.set('title', btnTitle()); toggleBtn.setAttribute('aria-label', btnTitle()); } catch(e) {} };
        if(window.qwebirc && typeof window.qwebirc.registerTranslator === 'function') {
          window.qwebirc.registerTranslator(function(){ refreshTitle(); });
        }
        window.addEventListener('qwebirc:languageChanged', function(){ refreshTitle(); });
        updateState(false);
  this.updateNicklistToggleVisibility && this.updateNicklistToggleVisibility();
        // Keyboard Shortcut Alt+L
        try {
          window.addEventListener('keydown', function(ev){
            if(ev.altKey && !ev.shiftKey && !ev.metaKey && !ev.ctrlKey && (ev.key === 'l' || ev.key === 'L')) {
              ev.preventDefault();
              toggleBtn.fireEvent ? toggleBtn.fireEvent('click', ev) : toggleBtn.click();
            }
          });
        } catch(_) {}
      }
    } catch(e) {}

  },
  newWindow: function(client, type, name) {
    var w = this.parent(client, type, name);
    w.setSideTabs(this.sideTabs);
    return w;
  },
  __createDropdownMenu: function() {
    var dropdownMenu = new Element("span");
    dropdownMenu.addClass("dropdownmenu");
    
    dropdownMenu.hide = function() {
      dropdownMenu.setStyle("display", "none");
      dropdownMenu.visible = false;
      document.removeEvent("mousedown", hideEvent);
    }.bind(this);
    var hideEvent = function() { dropdownMenu.hide(); };
    
  dropdownMenu.hide();
  // Append to body to allow absolute positioning independent of nested layout (fixes custom pages placing it at bottom)
    try { 
      document.body.appendChild(dropdownMenu); 
      if(!dropdownMenu.className.contains('dropdownmenu')) dropdownMenu.addClass('dropdownmenu');
    } catch(e) { this.parentElement.appendChild(dropdownMenu); }
    
    var buildEntries = function() {
      dropdownMenu.empty();
      this.UICommands.forEach(function(x) {
        var label = (typeof x[0] === 'function') ? x[0]() : x[0];
        var fn = x[1];
        var e = new Element("a");
  e.addEvent("mousedown", function(ev) { qwebirc.ui.util.stopEvent(ev); }.bind(this));
        e.addEvent("click", function() {
          dropdownMenu.hide();
          fn();
        });
        e.set("text", label);
        dropdownMenu.appendChild(e);
      }.bind(this));
    }.bind(this);
    buildEntries();
    // Rebuild on language change
    if(window.qwebirc && typeof window.qwebirc.registerTranslator === 'function') {
      window.qwebirc.registerTranslator(function(){
        // Recreate UICommands from cache in BaseUI if available
        if(this.__menuCache) {
          // Convert cached entries into materialized labels
          this.UICommands = this.__menuCache.map(function(entry){
            return [(typeof entry[0] === 'function') ? entry[0] : entry[0], entry[1]];
          });
        }
        buildEntries();
      }.bind(this));
    }
  // Fallback: explicitly listen for language event (if translator does not fire)
    window.addEventListener('qwebirc:languageChanged', function(){
      if(this.__menuCache) {
        this.UICommands = this.__menuCache.map(function(entry){
          return [(typeof entry[0] === 'function') ? entry[0] : entry[0], entry[1]];
        });
      }
      buildEntries();
    }.bind(this));
    
    var dropdown = new Element("div");
    dropdown.addClass("dropdown-tab");
  dropdown.appendChild(new Element("img", {src: qwebirc.global.staticBaseURL + "images/icon.png", title: "menu", alt: "menu"}));
    dropdown.setStyle("opacity", 1);

    this.outerTabs.appendChild(dropdown);
    dropdownMenu.show = function(x) {
  qwebirc.ui.util.stopEvent(x);

      if(dropdownMenu.visible) {
        dropdownMenu.hide();
        return;
      }
      // Make it measurable first (hidden visibility)
  dropdownMenu.setStyles({display: "block", visibility: "hidden"});
      // Compute desired coordinates (below the dropdown tab)
      try {
        var tabPos = dropdown.getPosition();
        var tabSize = dropdown.getSize();
        var menuSize = dropdownMenu.getSize();
        var top = tabPos.y + tabSize.y + 4; // 4px gap below tab
        var left = tabPos.x; // align left edges
        // If menu would overflow right edge, shift left
        var viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        if(left + menuSize.x > viewportWidth - 4) {
          left = Math.max(4, viewportWidth - menuSize.x - 4);
        }
        // Prevent going above top (shouldn't normally)
        if(top + menuSize.y > window.innerHeight - 4) {
          // If not enough space below, try placing above
            var altTop = tabPos.y - menuSize.y - 4;
            if(altTop > 4) top = altTop; // only if fits
        }
        dropdownMenu.setStyles({left: left + "px", top: top + "px"});
      } catch(e) {}
      // Finally show
      dropdownMenu.setStyle("visibility", "visible");
      dropdownMenu.visible = true;
      
      document.addEvent("mousedown", hideEvent);
    }.bind(this);
  dropdown.addEvent("mousedown", function(e) { qwebirc.ui.util.stopEvent(e); }.bind(this));
    dropdown.addEvent("click", dropdownMenu.show);
  },
  createInput: function() {
    var form = new Element("form");
    this.input.appendChild(form);
    form.addClass("input");

    // Emoji Picker Button
  var emojiBtn = new Element("button", { type: "button", html: "😊" });
  emojiBtn.addClass("emoji-picker-btn");
  // Initial styles; tatsächliche Größe wird nach Messung angepasst
  emojiBtn.setStyles({ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "1.1em", padding: 0, lineHeight: 1 });
  form.appendChild(emojiBtn);

  // Input box mit ausreichend linkem Padding (Fallback, wird unten evtl. überschrieben)
    var inputbox = new Element("input");
    inputbox.setStyle("paddingLeft", "2.4em");
    this.addEvent("signedOn", function(client) {
      this.getStatusWindow(client).lines.removeClass("spinner");
      var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
      var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang] && window.qwebirc.i18n[lang].options;
      inputbox.placeholder = (i18n && i18n.INPUT_PLACEHOLDER) || "chat here! you can also use commands, like /JOIN";
      (function(box){
        var times=[250,500,750,1000,1250,1750];
        times.forEach(function(t,i){ setTimeout(function(){ if(!box) return; if(i%2===0) box.addClass('input-flash'); else box.removeClass('input-flash'); }, t); });
      })(inputbox);
    });
    form.appendChild(inputbox);
    this.inputbox = inputbox;
    this.inputbox.maxLength = 470;
  // Language change -> update placeholder
    if(window.qwebirc && typeof window.qwebirc.registerTranslator === 'function') {
      window.qwebirc.registerTranslator(function(){
        var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
        var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang] && window.qwebirc.i18n[lang].options;
        if(i18n && i18n.INPUT_PLACEHOLDER) inputbox.placeholder = i18n.INPUT_PLACEHOLDER;
      });
    }
  // Fallback: react directly to language change event (if translator ordering doesn't apply)
    window.addEventListener('qwebirc:languageChanged', function(ev){
      try {
        var lang = ev && ev.detail && ev.detail.lang ? ev.detail.lang : ((window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en');
        var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang] && window.qwebirc.i18n[lang].options;
        if(i18n && i18n.INPUT_PLACEHOLDER) inputbox.placeholder = i18n.INPUT_PLACEHOLDER;
      } catch(e) {}
    });

    // Emoji Picker Overlay
  var emojiOverlay = new Element("div");
  emojiOverlay.addClass("emoji-picker-overlay");
  // Dynamic size: 1em
  emojiOverlay.setStyles({ display: "none", position: "absolute", left: "0", bottom: "40px", zIndex: 1000, background: "#fff", border: "1px solid #ccc", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", padding: "8px", minWidth: "220px", maxHeight: "220px", overflowY: "auto", fontSize: "1em" });
  form.appendChild(emojiOverlay);

  // Gemeinsame Emoji-Kategorien aus Utility
  var emojiCategories = (qwebirc.ui.util && qwebirc.ui.util.emojiCategories) ? qwebirc.ui.util.emojiCategories : [];
    var activeCategory = 0;

    function __tEmoji(key, fallback) {
      try {
        var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
        var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang] && window.qwebirc.i18n[lang].options;
        if(i18n && i18n[key]) return i18n[key];
      } catch(e) {}
      return fallback;
    }
    function renderEmojiPicker() {
      emojiOverlay.empty();
      var cat = emojiCategories[activeCategory];
      // emojiOverlay darf nicht scrollen
      emojiOverlay.setStyle('overflowY', 'visible');
      emojiOverlay.setStyle('maxHeight', 'none');
  // Wrapper for fixed header (categories + optional colour selection)
      var header = new Element("div");
      header.setStyles({ position: "relative", zIndex: 2, background: "#fff", padding: "0 0 4px 0", borderBottom: "1.5px solid #3a3f4b" });
      // Kategorienleiste
      var catBar = new Element("div");
      catBar.setStyles({ display: "flex", gap: "8px", margin: "8px 0 0 0", paddingBottom: "6px" });
      emojiCategories.forEach(function(catItem, idx) {
        var btn = new Element("button");
        btn.set("type", "button");
        btn.set("text", catItem.icon);
        var translatedCatName = __tEmoji(catItem.nameKey, catItem.name);
        btn.set("title", translatedCatName);
  // Dynamic size: 1em
        btn.setStyles({ background: idx===activeCategory?"#ececff":"none", border: "none", fontSize: "1em", cursor: "pointer", borderRadius: "4px", padding: "2px 6px", color: idx===activeCategory?"#232634":"#888" });
        btn.addEvent("click", function(e) {
          qwebirc.ui.util.stopEvent(e);
          activeCategory = idx;
          renderEmojiPicker();
        }.bind(this));
        catBar.appendChild(btn);
      });
      header.appendChild(catBar);
  // Colour (skin tone) selection for Smileys & People
      var skinBar = null;
    if(cat.nameKey === "EMOJI_CAT_SMILEYS") {
        var skinTones = [
      { labelKey: "EMOJI_SKIN_DEFAULT", label: "Default", code: "" },
      { labelKey: "EMOJI_SKIN_LIGHT", label: "Light", code: "\uD83C\uDFFB" },
      { labelKey: "EMOJI_SKIN_MEDLIGHT", label: "Medium-Light", code: "\uD83C\uDFFC" },
      { labelKey: "EMOJI_SKIN_MEDIUM", label: "Medium", code: "\uD83C\uDFFD" },
      { labelKey: "EMOJI_SKIN_DARK", label: "Dark", code: "\uD83C\uDFFE" },
      { labelKey: "EMOJI_SKIN_VERYDARK", label: "Very Dark", code: "\uD83C\uDFFF" }
        ];
  // Default Hand-Emoji (Daumen hoch)
  var handEmoji = "👍";
        skinBar = new Element("div");
        skinBar.setStyles({ display: "flex", gap: "6px", margin: "8px 0 0 0", alignItems: "center" });
        skinTones.forEach(function(tone, idx) {
          var btn = new Element("button");
          btn.set("type", "button");
          var toneLabel = __tEmoji(tone.labelKey, tone.label);
          btn.set("title", toneLabel);
          // Hand-Emoji mit Hautton
          var showHand = handEmoji;
          if(idx > 0) {
            try {
              showHand = handEmoji + String.fromCodePoint(0x1F3FB + idx - 1);
            } catch(e) {}
          }
          btn.set("text", showHand);
          btn.setStyles({ width: "28px", height: "28px", background: "none", border: "none", cursor: "pointer", outline: "none", padding: 0, fontSize: "22px" });
          btn.addEvent("click", function(e) {
            qwebirc.ui.util.stopEvent(e);
            window.activeSkinTone = idx;
            renderEmojiPicker();
          }.bind(this));
          skinBar.appendChild(btn);
        });
        header.appendChild(skinBar);
      }
      emojiOverlay.appendChild(header);
  // Scrollable area for emojis
      var perRow = 10;
      var numRows = Math.ceil(cat.emojis.length / perRow);
      var maxRows = 7;
      var emojiScroll = new Element("div");
      emojiScroll.setStyles({
        maxHeight: (numRows > maxRows ? (maxRows*38+8) : 'none') + 'px',
        overflowY: numRows > maxRows ? 'auto' : 'visible',
        marginTop: '8px',
        paddingRight: '2px'
      });
  // Hand emojis that support skin tones
      var handEmojis = [
        "👍","👎","👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","🫵","🫱","🫲","🫳","🫴","👏","🙌","👐","🤲","🙏","✍️","💅","🤳","💪","🦾","🦵","🦶","👂","🦻","👃"
      ];
  var skinToneCode = (typeof window.activeSkinTone !== 'undefined' && cat.nameKey === "EMOJI_CAT_SMILEYS") ? window.activeSkinTone : 0;
      var emojiGrid = new Element("ul");
      emojiGrid.setStyles({ listStyle: "none", padding: "0", margin: "0" });
      for(var i=0; i<cat.emojis.length; i+=perRow) {
        var rowLi = new Element("li");
        rowLi.setStyles({ marginBottom: "4px", whiteSpace: "nowrap" });
        cat.emojis.slice(i, i+perRow).forEach(function(emoji) {
          var emojiBtn = new Element("button");
          emojiBtn.set("type", "button");
          // Hautfarbe nur bei Hand-Emojis
          var showEmoji = emoji;
          if(cat.nameKey === "EMOJI_CAT_SMILEYS" && skinToneCode && handEmojis.indexOf(emoji) !== -1) {
            try {
              showEmoji = emoji + String.fromCodePoint(0x1F3FB + skinToneCode - 1);
            } catch(e) {}
          }
          emojiBtn.set("text", showEmoji);
          emojiBtn.setStyles({ fontSize: "22px", background: "none", border: "none", cursor: "pointer", padding: "3px 4px", borderRadius: "5px", display: "inline-block" });
          emojiBtn.addEvent("click", function(e) {
            if(e) {
              qwebirc.ui.util.stopEvent(e);
              if(e.stopPropagation) e.stopPropagation();
            }
            try {
              insertAtCursor(inputbox, showEmoji);
              emojiOverlay.setStyle("display", "none");
              inputbox.focus();
            } catch (err) {}
          });
          rowLi.appendChild(emojiBtn);
        });
        emojiGrid.appendChild(rowLi);
      }
      emojiScroll.appendChild(emojiGrid);
      emojiOverlay.appendChild(emojiScroll);
    }

    function insertAtCursor(input, text) {
      var start = input.selectionStart, end = input.selectionEnd;
      var value = input.value;
      input.value = value.substring(0, start) + text + value.substring(end);
      input.selectionStart = input.selectionEnd = start + text.length;
      input.dispatchEvent(new Event('input'));
    }

    emojiBtn.addEvent("click", function(e) {
  qwebirc.ui.util.stopEvent(e);
      if(emojiOverlay.getStyle("display") === "none") {
        renderEmojiPicker();
        emojiOverlay.setStyle("display", "block");
      } else {
        emojiOverlay.setStyle("display", "none");
      }
    });
  // Close picker on outside click
    document.addEventListener("mousedown", function(e) {
      if(!e) return;
      var target = e.target || e.srcElement;
      if(!emojiOverlay || !emojiBtn) return;
      if(typeof emojiOverlay.contains === "function" && typeof emojiBtn.contains === "function") {
        if(!emojiOverlay.contains(target) && !emojiBtn.contains(target)) {
          emojiOverlay.setStyle("display", "none");
        }
      }
    });
    // Setze IRC-Client-Referenz beim ersten connect
    this.addEvent("signedOn", function(client) {
      this.client = client;
    });

    var sendInput = function() {
      if(inputbox.value == "")
        return;
      this.resetTabComplete();
      this.getActiveWindow().historyExec(inputbox.value);
      inputbox.value = "";
      inputbox.placeholder = "";
      // Sende "done"-Status nach dem Senden
      if (typingTimeout) clearTimeout(typingTimeout);
      lastTypingState = "done";
      this.sendTypingTagmsg("done");
    }.bind(this);

    // Hilfsfunktion: Sende TAGMSG mit typing-Status
    this.sendTypingTagmsg = function(state) {
      // Typing-Indicator bei Befehlen (Eingaben mit /) deaktivieren
      if (typeof inputbox !== 'undefined' && inputbox.value && inputbox.value.trim().charAt(0) === '/') {
        return;
      }
      var win = this.getActiveWindow();
      if(!win) return;
      var target = win.name;
      // Only support channel or query
      if(win.type == qwebirc.ui.WINDOW_CHANNEL || win.type == qwebirc.ui.WINDOW_QUERY) {
        if(this.client && this.client.send) {
          // Check whether message-tags capability is active
          if(this.client.activeCaps && this.client.activeCaps.indexOf("message-tags") !== -1) {
            this.client.send("@+typing=" + state + " TAGMSG " + target);
          }
        }
      }
    };

    // Typing-Status-Logik
    var typingTimeout = null;
    var typingInterval = null;
    var lastTypingState = "done";
    var typingInterval = null;
    var TYPING_INTERVAL = 1000; // ms
    var PAUSE_DELAY = 2000; // ms
    var typingTimeout = null;

    var startTypingInterval = function() {
      if (typingInterval) return;
  // Send immediately to avoid delay
      if(inputbox.value.length > 0 && lastTypingState !== "active") {
        this.sendTypingTagmsg("active");
        lastTypingState = "active";
      }
      typingInterval = setInterval(function() {
        if(inputbox.value.length > 0) {
          if(lastTypingState !== "active") {
            this.sendTypingTagmsg("active");
            lastTypingState = "active";
          }
        } else {
          stopTypingInterval();
        }
      }.bind(this), TYPING_INTERVAL);
    }.bind(this);

    var stopTypingInterval = function() {
      if (typingInterval) {
        clearInterval(typingInterval);
        typingInterval = null;
      }
    };

    var typingHandler = function(e) {
      var win = this.getActiveWindow();
      if(!win || (win.type != qwebirc.ui.WINDOW_CHANNEL && win.type != qwebirc.ui.WINDOW_QUERY)) {
        return;
      }
      if(typingTimeout) clearTimeout(typingTimeout);
      if(inputbox.value.length > 0) {
        startTypingInterval();
        if(typingTimeout) clearTimeout(typingTimeout);
        typingTimeout = setTimeout(function() {
          if(lastTypingState !== "done" && lastTypingState !== "paused") {
            this.sendTypingTagmsg("paused");
            lastTypingState = "paused";
          }
        }.bind(this), PAUSE_DELAY);
      } else {
        stopTypingInterval();
        if(lastTypingState !== "done") {
          this.sendTypingTagmsg("done");
          lastTypingState = "done";
        }
        if(typingTimeout) clearTimeout(typingTimeout);
      }
    }.bind(this);
    inputbox.addEvent("input", typingHandler);

  // Also start interval on keydown in case input event is not triggered
    inputbox.addEvent("keydown", function() {
      if(inputbox.value.length > 0) {
        startTypingInterval();
        if(typingTimeout) clearTimeout(typingTimeout);
        typingTimeout = setTimeout(function() {
          stopTypingInterval();
          if(lastTypingState !== "done" && lastTypingState !== "paused") {
            this.sendTypingTagmsg("paused");
            lastTypingState = "paused";
          }
        }.bind(this), PAUSE_DELAY);
      } else {
        stopTypingInterval();
        if(lastTypingState !== "done") {
          this.sendTypingTagmsg("done");
          lastTypingState = "done";
        }
        if(typingTimeout) clearTimeout(typingTimeout);
      }
    }.bind(this));

    if(!qwebirc.util.deviceHasKeyboard()) {
      inputbox.addClass("mobile-input");
      var inputButton = new Element("input", {type: "button"});
      inputButton.addClass("mobile-button");
      inputButton.addEvent("click", function() {
        sendInput();
        inputbox.focus();
      });
      inputButton.value = ">";
      this.input.appendChild(inputButton);
      var reflowButton = function() {
        var containerSize = this.input.getSize();
        var buttonSize = inputButton.getSize();
        
        var buttonLeft = containerSize.x - buttonSize.x - 5; /* lovely 5 */

        inputButton.setStyle("left", buttonLeft);
        inputbox.setStyle("width", buttonLeft - 5);
        inputButton.setStyle("height", containerSize.y);
      }.bind(this);
      this.qjsui.addEvent("reflow", reflowButton);
    } else {
      inputbox.addClass("keyboard-input");
    }
    
    form.addEvent("submit", function(e) {
  qwebirc.ui.util.stopEvent(e);
  sendInput();
  emojiOverlay.setStyle("display", "none");
    });

    var reset = this.resetTabComplete.bind(this);
    inputbox.addEvent("focus", reset);
    inputbox.addEvent("mousedown", reset);
    inputbox.addEvent("keypress", reset);

    inputbox.addEvent("keydown", function(e) {
      var resultfn;
      var cvalue = inputbox.value;

      if(e.alt || e.control || e.meta)
        return;

      if(e.key == "up" && !e.shift) {
        resultfn = this.commandhistory.upLine;
      } else if(e.key == "down" && !e.shift) {
        resultfn = this.commandhistory.downLine;
      } else if(e.key == "tab") {
        this.tabComplete(inputbox, e.shift);

  qwebirc.ui.util.stopEvent(e);
        return;
      } else {
        return;
      }
      
      this.resetTabComplete();
      if((cvalue != "") && (this.lastcvalue != cvalue))
        this.commandhistory.addLine(cvalue, true);
      
      var result = resultfn.bind(this.commandhistory)();
      
  qwebirc.ui.util.stopEvent(e);

      if(!result)
        result = "";
      this.lastcvalue = result;
        
      inputbox.value = result;
      qwebirc.util.setAtEnd(inputbox);
    }.bind(this));
  },
  setLines: function(lines) {
    this.lines.parentNode.replaceChild(lines, this.lines);
    this.qjsui.middle = this.lines = lines;
  },
  setChannelItems: function(nicklist, topic) {
  if(nicklist == null) {
      nicklist = this.orignicklist;
      topic = this.origtopic;
    }
    this.nicklist.parentNode.replaceChild(nicklist, this.nicklist);
    this.qjsui.right = this.nicklist = nicklist;

    this.topic.parentNode.replaceChild(topic, this.topic);
    this.qjsui.topic = this.topic = topic;
  },
  setSideTabs: function(value) {
    if(value === this.sideTabs)
      return;

    if(this.sideTabs === true) {
      this.qjsui.left.removeChild(this.outerTabs);
    } else if(this.sideTabs === false) {
      this.qjsui.top.removeChild(this.outerTabs);
    }
    if(value) {
      this.qjsui.left.appendChild(this.outerTabs);
      this.qjsui.top.style.display = "none";
      this.qjsui.left.style.display = "";
    } else {
      this.qjsui.top.appendChild(this.outerTabs);
      this.qjsui.top.style.display = "";
      this.qjsui.left.style.display = "none";
    }
    this.sideTabs = value;
    this.windows.each(function(k, v) {
      v.each(function(k, v2) {
        v2.setSideTabs(value);
      });
    });
  }
});

qwebirc.ui.QUI.JSUI = new Class({
  Implements: [Events],
  initialize: function(class_, parent, sizer) {
    this.parent = parent;
  this.sizer = (sizer != null) ? sizer : parent;

    this.class_ = class_;
    this.create();
    
    this.reflowevent = null;
    
    window.addEvent("resize", function() {
      this.reflow(100);
    }.bind(this));
  },
  applyClasses: function(pos, l) {
    l.addClass("dynamicpanel");    
    l.addClass(this.class_);
    l.addClass(pos + "boundpanel");
  },
  create: function() {
    var XE = function(pos) {
      var element = new Element("div");
      this.applyClasses(pos, element);
      
      this.parent.appendChild(element);
      return element;
    }.bind(this);
    
    this.top = XE("top");
    this.left = XE("left");
    this.topic = XE("topic");
    this.middle = XE("middle");
    this.right = XE("right");
    this.bottom = XE("bottom");
  },
  reflow: function(delay) {
    if(!delay) delay = 1;
    if(this.reflowevent) { try { clearTimeout(this.reflowevent); } catch(e) {} this.reflowevent = null; }
    this.__reflow();
    var self = this;
    this.reflowevent = setTimeout(function(){ self.__reflow(); }, delay);
  },
  __reflow: function() {
    var bottom = this.bottom;
    var middle = this.middle;
    var right = this.right;
    var topic = this.topic;
    var top = this.top;
    var left = this.left;

    /* |----------------------------------------------|
     * | top                                          |
     * |----------------------------------------------|
     * | left | topic                         | right |
     * |      |-------------------------------|       |
     * |      | middle                        |       |
     * |      |                               |       |
     * |      |                               |       |
     * |      |---------------------------------------|
     * |      | bottom                                |
     * |----------------------------------------------|
     */

    var topicsize = topic.getSize();
    var topsize = top.getSize();
    var rightsize = right.getSize();
    var bottomsize = bottom.getSize();
    var leftsize = left.getSize();
    var docsize = this.sizer.getSize();
    
    var mheight = (docsize.y - topsize.y - bottomsize.y - topicsize.y);
    var mwidth = (docsize.x - rightsize.x - leftsize.x);

    left.setStyle("top", topsize.y);
    topic.setStyle("top", topsize.y);
    topic.setStyle("left", leftsize.x);
    topic.setStyle("width", docsize.x - leftsize.x);
    
    middle.setStyle("top", (topsize.y + topicsize.y));
    middle.setStyle("left", leftsize.x);
    if(mheight > 0) {
      middle.setStyle("height", mheight);
      right.setStyle("height", mheight);
    }
    
    if(mwidth > 0)
      middle.setStyle("width", mwidth);
    right.setStyle("top", (topsize.y + topicsize.y));

    bottom.setStyle("left",  leftsize.x);
    this.fireEvent("reflow");
  },
  showChannel: function(state, nicklistVisible) {
    var display = "none";
    if(state)
      display = "block";

    this.right.setStyle("display", nicklistVisible ? display : "none");
    this.topic.setStyle("display", display);
  },
  showInput: function(state) {
    this.bottom.isVisible = state;
    this.bottom.setStyle("display", state?"block":"none");
  }
});

qwebirc.ui.QUI.Window = new Class({
  Extends: qwebirc.ui.Window,
  
  initialize: function(parentObject, client, type, name, identifier) {
    this.parent(parentObject, client, type, name, identifier);
  // Store original names for later re-translation (only for fixed system panes)
  this._baseName = name;

  // Typing bar for channel and query windows
    if(type == qwebirc.ui.WINDOW_CHANNEL || type == qwebirc.ui.WINDOW_QUERY) {
  // Legacy Typing-Bar State entfernt – jetzt zentraler Manager

      // Hilfsfunktion: Nickname mit Farbe als HTML
      this._renderNick = function(nick) {
        if (this.nicksColoured && typeof nick.toHSBColour === 'function') {
          var color = nick.toHSBColour(this.client);
          if (color) {
            return '<span style="color:' + color.rgbToHex() + '">' + nick + '</span>';
          }
        }
        return '<span>' + nick + '</span>';
      };

  // Gemeinsamer TypingBarManager
  this.__typingManager = new qwebirc.ui.util.TypingBarManager(this);
  this.showTypingBar = function(event){ this.__typingManager.handleTag(event); };
    }


    this.tab = new Element("a");
    this.tab.addClass("tab");
    this.tab.addEvent("focus", function() { this.blur() }.bind(this.tab));

    this.spaceNode = document.createTextNode(" ");

  // Sort tabs: 1. Others (except channel/query) alphabetically, 2. Channels alphabetically, 3. Queries alphabetically at the end
    this.tab.windowType = type;
  // Set query nick as attribute for sorting
    if(type === qwebirc.ui.WINDOW_QUERY && typeof name === 'string') {
      this.tab.setAttribute('data-querynick', name);
    }
  // Set channel name as attribute for sorting
    if(type === qwebirc.ui.WINDOW_CHANNEL && typeof name === 'string') {
      this.tab.setAttribute('data-channel', name);
    }
    var allTabs = Array.from(parentObject.tabs.childNodes).filter(function(node) {
      return node.nodeType === 1 && node.classList.contains("tab");
    });
    allTabs.push(this.tab);
    // Gruppieren
    var statusTabs = allTabs.filter(function(tab) {
      return tab.windowType === qwebirc.ui.WINDOW_STATUS;
    });
    var channelTabs = allTabs.filter(function(tab) {
      return tab.windowType === qwebirc.ui.WINDOW_CHANNEL;
    });
    var queryTabs = allTabs.filter(function(tab) {
      return tab.windowType === qwebirc.ui.WINDOW_QUERY;
    });
    var otherTabs = allTabs.filter(function(tab) {
      return tab.windowType !== qwebirc.ui.WINDOW_CHANNEL && tab.windowType !== qwebirc.ui.WINDOW_QUERY && tab.windowType !== qwebirc.ui.WINDOW_STATUS;
    });
    // Sortieren
    otherTabs.sort(function(a, b) {
      return a.textContent.localeCompare(b.textContent, undefined, {sensitivity: 'base'});
    });
    channelTabs.sort(function(a, b) {
      // Sortiere alphabetisch, case-insensitive, Channel-Prefixe ignorieren (wie im IRC)
      function stripPrefix(name) {
        return name.replace(/^[#&!+]+/, '');
      }
      // Versuche, den echten Channelnamen aus data-channel zu nehmen, sonst fallback auf Text
      var aName = a.getAttribute && a.getAttribute('data-channel') ? a.getAttribute('data-channel') : a.textContent.trim();
      var bName = b.getAttribute && b.getAttribute('data-channel') ? b.getAttribute('data-channel') : b.textContent.trim();
      var an = stripPrefix(aName).toLowerCase();
      var bn = stripPrefix(bName).toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });
    queryTabs.sort(function(a, b) {
      // Querys auch alphabetisch, case-insensitive sortieren, Nick aus Attribut wenn vorhanden
      var aNick = a.getAttribute && a.getAttribute('data-querynick') ? a.getAttribute('data-querynick') : a.textContent.trim();
      var bNick = b.getAttribute && b.getAttribute('data-querynick') ? b.getAttribute('data-querynick') : b.textContent.trim();
      var an = aNick.toLowerCase();
      var bn = bNick.toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });
    // Alle Tabs entfernen
    allTabs.forEach(function(tab) {
      if (tab.parentNode === parentObject.tabs) parentObject.tabs.removeChild(tab);
    });
  // Order: Status, Channels, Queries, Others
  var sortedTabs = statusTabs.concat(channelTabs, queryTabs, otherTabs);
    sortedTabs.forEach(function(tab) {
      parentObject.tabs.appendChild(tab);
    });
  // Insert space node after this tab
    parentObject.tabs.insertBefore(this.spaceNode, this.tab.nextSibling);

  // Close button (initially created, properly positioned after text later)
  this._ensureTabClose(type, name);

    this.tab.appendText(name);
  // After adding the text move the close button to the end (or beginning for side tabs) if needed
    if(this.tabclose) {
      try {
        if(this.parentObject.sideTabs) {
          // For side tabs: close button first (CSS float right handles alignment)
          this.tab.insertBefore(this.tabclose, this.tab.firstChild);
        } else {
          // Horizontale Tabs: Close-Button am Ende
          this.tab.appendChild(this.tabclose);
        }
      } catch(e) {}
    }
  // Add tab icon (SVG) for special panes
    (function(){
      try {
        var paneType = (this.pane && this.pane.type) ? this.pane.type : (this.identifier||'');
        var iconClass = null;
        // Mapping pane type -> icon (simple inline SVG path/lines)
        var svgns = 'http://www.w3.org/2000/svg';
        var makeIcon = function(kind){
          var svg = document.createElementNS(svgns,'svg');
          svg.setAttribute('viewBox','0 0 16 16');
          svg.setAttribute('width','16');
          svg.setAttribute('height','16');
          svg.setAttribute('class','tabicon');
          if(kind==='options') {
            var c = document.createElementNS(svgns,'circle'); c.setAttribute('cx','8'); c.setAttribute('cy','8'); c.setAttribute('r','5'); c.setAttribute('fill','none'); c.setAttribute('stroke','currentColor'); c.setAttribute('stroke-width','2'); svg.appendChild(c);
            var r = document.createElementNS(svgns,'rect'); r.setAttribute('x','7'); r.setAttribute('y','3'); r.setAttribute('width','2'); r.setAttribute('height','4'); r.setAttribute('fill','currentColor'); svg.appendChild(r);
          } else if(kind==='embed') {
            var r2 = document.createElementNS(svgns,'rect'); r2.setAttribute('x','2'); r2.setAttribute('y','4'); r2.setAttribute('width','12'); r2.setAttribute('height','8'); r2.setAttribute('rx','1'); r2.setAttribute('fill','none'); r2.setAttribute('stroke','currentColor'); r2.setAttribute('stroke-width','1.6'); svg.appendChild(r2);
            var p = document.createElementNS(svgns,'path'); p.setAttribute('d','M6 6l-2 2 2 2M10 6l2 2-2 2'); p.setAttribute('fill','none'); p.setAttribute('stroke','currentColor'); p.setAttribute('stroke-width','1.6'); p.setAttribute('stroke-linecap','round'); p.setAttribute('stroke-linejoin','round'); svg.appendChild(p);
          } else if(kind==='about') {
            var circle = document.createElementNS(svgns,'circle'); circle.setAttribute('cx','8'); circle.setAttribute('cy','8'); circle.setAttribute('r','6'); circle.setAttribute('fill','none'); circle.setAttribute('stroke','currentColor'); circle.setAttribute('stroke-width','1.6'); svg.appendChild(circle);
            var line = document.createElementNS(svgns,'line'); line.setAttribute('x1','8'); line.setAttribute('y1','5'); line.setAttribute('x2','8'); line.setAttribute('y2','9'); line.setAttribute('stroke','currentColor'); line.setAttribute('stroke-width','1.6'); line.setAttribute('stroke-linecap','round'); svg.appendChild(line);
            var dot = document.createElementNS(svgns,'circle'); dot.setAttribute('cx','8'); dot.setAttribute('cy','11'); dot.setAttribute('r','0.8'); dot.setAttribute('fill','currentColor'); svg.appendChild(dot);
          } else {
            return null;
          }
          return svg;
        };
        if(paneType==='optionspane') iconClass='options';
        else if(paneType==='embeddedwizard') iconClass='embed';
        else if(paneType==='aboutpane') iconClass='about';
        if(iconClass) {
          // Add icon only if none exists yet and tab not already text-only
          if(!this.tab.getElement('svg.tabicon')) {
            var icon = makeIcon(iconClass);
            if(icon) {
              // Insert before text (after possible close button for side tabs?)
              if(this.parentObject.sideTabs) {
                this.tab.insertBefore(icon, this.tab.firstChild);
              } else {
                // Text ist erstes Child; Icon davor
                this.tab.insertBefore(icon, this.tab.firstChild);
              }
              this.tab.addClass('tab-has-icon');
              this.tab.addClass('tab-icon-' + iconClass);
            }
          }
        }
      } catch(err) {}
    }).bind(this)();
    this.tab.addEvent("click", function(e) {
  qwebirc.ui.util.stopEvent(e);
      
      if(this.closed)
        return;
        
      parentObject.selectWindow(this);
    }.bind(this));
  // Register translator for system tabs
    if(window.qwebirc && typeof window.qwebirc.registerTranslator === 'function') {
      window.qwebirc.registerTranslator(function(){
        try { this._applyTranslatedTitle(); } catch(e) {}
        try {
          if(this.type == qwebirc.ui.WINDOW_CHANNEL && this.topic) {
            this.updateTopic(this.topic.topicText || "");
          }
        } catch(e) {}
      }.bind(this));
    }
    window.addEventListener('qwebirc:languageChanged', function(){
      try { this._applyTranslatedTitle(); } catch(e) {}
      try {
        if(this.type == qwebirc.ui.WINDOW_CHANNEL && this.topic) {
          this.updateTopic(this.topic.topicText || "");
        }
      } catch(e) {}
    }.bind(this));
    

    this.lines = new Element("div");
    this.parentObject.qjsui.applyClasses("middle", this.lines);
    this.lines.addClass("lines");

  // Entferne spinner-Grafik beim Verbinden
  // if(type == qwebirc.ui.WINDOW_STATUS)
  //   this.lines.addClass("spinner");
// Gemeinsamer ConnectStatus wird nur über qwebirc.ui.util.connectStatus referenziert

    if(type != qwebirc.ui.WINDOW_CUSTOM && type != qwebirc.ui.WINDOW_CONNECT)
      this.lines.addClass("ircwindow");
    
    this.lines.addEvent("scroll", function() {
      this.scrolleddown = this.scrolledDown();
      this.scrollpos = this.getScrollParent().getScroll();
    }.bind(this));
    
    if(type == qwebirc.ui.WINDOW_CHANNEL) {
      this.topic = new Element("div");
      this.parentObject.qjsui.applyClasses("topic", this.topic);
      this.topic.addClass("topic");
      this.topic.addClass("tab-invisible");
      this.topic.set("html", "&nbsp;");
      this.topic.addEvent("dblclick", this.editTopic.bind(this));
      this.parentObject.qjsui.applyClasses("topic", this.topic);

      this.prevNick = null;
      this.nicklist = new Element("div");
      this.nicklist.addClass("nicklist");
      this.nicklist.addClass("tab-invisible");
      this.nicklist.addEvent("click", this.removePrevMenu.bind(this));
      this.parentObject.qjsui.applyClasses("right", this.nicklist);

      this.updateTopic("");
    }
    
    this.nicksColoured = this.parentObject.uiOptions.NICK_COLOURS;
    this.reflow();
  },
  rename: function(name) {
    var newNode = document.createTextNode(name);
    if(this.parentObject.sideTabs) {
      this.tab.replaceChild(newNode, this.tab.childNodes[1]);
    } else {
      this.tab.replaceChild(newNode, this.tab.firstChild);
    }
  },
  editTopic: function() {
    if(this.type != qwebirc.ui.WINDOW_CHANNEL)
      return;
    var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
    var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang] && window.qwebirc.i18n[lang].options;
    var t = function(key, fallback){ return (i18n && i18n[key]) ? i18n[key] : (fallback || key); };

    if(!this.client.nickOnChanHasPrefix(this.client.nickname, this.name, "@")) {
      alert(t('NEED_CHANOP','Sorry, you need to be a channel operator to change the topic!'));
      return;
    }
    var promptMsg = t('CHANGE_TOPIC_OF','Change topic of {name} to:').replace('{name}', this.name);
    var newTopic = prompt(promptMsg, this.topic.topicText);
    if(newTopic === null)
      return;

    this.client.exec("/TOPIC " + newTopic);
  },
  reflow: function() {
    this.parentObject.reflow();
  },
  onResize: function() {
    if(this.scrolleddown) {
      // kleiner Delay für Layout Stabilität
  var self=this; setTimeout(function(){ self.scrollToBottom(); },5);
    } else if(this.scrollpos != null) {
  var self=this; setTimeout(function(){ try { self.getScrollParent().scrollTo(self.scrollpos.x, self.scrollpos.y); } catch(e) {} },5);
    }
  },
  createMenu: function(nick, parent) {
    var e = new Element("div");
    parent.appendChild(e);
    e.addClass("menu");
  // Store reference for live re-translation
  this.__openNickMenu = {container: e, nick: nick};
    
    var nickArray = [nick];
    qwebirc.ui.MENU_ITEMS.forEach(function(x) {
      if(!x.predicate || x.predicate !== true && !x.predicate.apply(this, nickArray))
        return;
      
      var e2 = new Element("a");
      e.appendChild(e2);
  var label = (typeof x.text === 'function') ? x.text() : x.text;
  e2.set("text", "- " + label);
  e2.__menuItem = x; // for later re-translation

      e2.addEvent("focus", function() { this.blur() }.bind(e2));
  e2.addEvent("click", function(ev) { qwebirc.ui.util.stopEvent(ev); this.menuClick(x.fn); }.bind(this));
    }.bind(this));
    return e;
  },
  menuClick: function(fn) {
    /*
    this.prevNick.removeChild(this.prevNick.menu);
    this.prevNick.menu = null;
    */
    fn.bind(this)(this.prevNick.realNick);
    this.removePrevMenu();
  },
  moveMenuClass: function() {
    if(!this.prevNick)
      return;
    if(this.nicklist.firstChild == this.prevNick) {
      this.prevNick.removeClass("selected-middle");
    } else {
      this.prevNick.addClass("selected-middle");
    }
  },
  removePrevMenu: function() {
    if(!this.prevNick)
      return;

    this.prevNick.removeClass("selected");
    this.prevNick.removeClass("selected-middle");
    if(this.prevNick.menu)
      this.prevNick.removeChild(this.prevNick.menu);
    this.prevNick = null;
  },
  nickListAdd: function(nick, position) {
  // Show only the highest prefix
    var realNick = this.client.stripPrefix(nick);
    var prefix = nick.charAt(0);
    var prefixClass = "";
    var prefixSymbol = "";
    switch(prefix) {
      case "~": prefixClass = "prefix-owner"; prefixSymbol = "👑"; break;
      case "&": prefixClass = "prefix-admin"; prefixSymbol = "★"; break;
      case "@": prefixClass = "prefix-op"; prefixSymbol = "●"; break;
      case "%": prefixClass = "prefix-halfop"; prefixSymbol = "◑"; break;
      case "+": prefixClass = "prefix-voice"; prefixSymbol = "➤"; break;
      case ' ': case '': prefixClass = "prefix-none"; prefixSymbol = ""; break;
      default: prefixClass = "prefix-unknown"; prefixSymbol = prefix ? prefix : ""; break; // Buchstabe wieder anzeigen
    }
    var e = new Element("a");
    qwebirc.ui.insertAt(position, this.nicklist, e);
    // Nur ein Prefix-Symbol mit Abstand
    if(prefixSymbol) {
      var prefixSpan = new Element("span");
      prefixSpan.addClass(prefixClass);
      prefixSpan.setStyle("display", "inline-block");
      prefixSpan.setStyle("width", "16px");
      prefixSpan.setStyle("text-align", "center");
      prefixSpan.set("text", prefixSymbol);
      e.appendChild(prefixSpan);
    } else {
  // Keep space so everything stays aligned
      var emptySpan = new Element("span");
      emptySpan.setStyle("display", "inline-block");
      emptySpan.setStyle("width", "16px");
      e.appendChild(emptySpan);
    }
    var span = new Element("span");
    if(this.parentObject.uiOptions.NICK_COLOURS) {
      var colour = realNick.toHSBColour(this.client);
  if(colour != null)
        span.setStyle("color", colour.rgbToHex());
    }
    span.set("text", realNick);
    e.appendChild(span);
    e.realNick = realNick;
    
    e.addEvent("click", function(x) {
      if(this.prevNick == e) {
        this.removePrevMenu();
        return;
      }
      
      this.removePrevMenu();
      this.prevNick = e;
      e.addClass("selected");
      this.moveMenuClass();
      e.menu = this.createMenu(e.realNick, e);
  qwebirc.ui.util.stopEvent(x);
    }.bind(this));
    
    e.addEvent("focus", function() { this.blur() }.bind(e));
    this.moveMenuClass();
    return e;
  },
  nickListRemove: function(nick, stored) {
    this.nicklist.removeChild(stored);
    this.moveMenuClass();
  },
  updateTopic: function(topic) {
    var t = this.topic;
    
    while(t.firstChild)
      t.removeChild(t.firstChild);

    var suffix;
    if(this.type == qwebirc.ui.WINDOW_CHANNEL) {
      suffix = ": ";
    } else {
      suffix = "";
    }
    qwebirc.ui.Colourise(this.name + suffix, t, null, null, this);

    if(this.type == qwebirc.ui.WINDOW_CHANNEL) {
      var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
      var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang] && window.qwebirc.i18n[lang].options;
      var tt = function(key, fallback){ return (i18n && i18n[key]) ? i18n[key] : (fallback || key); };
      t.topicText = topic;
      if (topic) {
        this.parent(topic, t);
      } else {
        t.appendChild(document.createTextNode(tt('NO_TOPIC','(no topic set)')));
      }
    }

    this.reflow();
  },
  select: function() {
    var inputVisible = this.type != qwebirc.ui.WINDOW_CONNECT && this.type != qwebirc.ui.WINDOW_CUSTOM;
    
    this.tab.removeClass("tab-unselected");
    this.tab.addClass("tab-selected");

    this.parentObject.setLines(this.lines);
    this.parentObject.setChannelItems(this.nicklist, this.topic);
    this.parentObject.qjsui.showInput(inputVisible);
  this.parentObject.qjsui.showChannel((this.nicklist != null), this.parentObject.uiOptions.SHOW_NICKLIST);

    this.reflow();
    
    this.parent();
    
    if(inputVisible)
      this.parentObject.inputbox.focus();

    if(this.type == qwebirc.ui.WINDOW_CHANNEL && this.nicksColoured != this.parentObject.uiOptions.NICK_COLOURS) {
      this.nicksColoured = this.parentObject.uiOptions.NICK_COLOURS;
      
      var nodes = this.nicklist.childNodes;
      if(this.parentObject.uiOptions.NICK_COLOURS) {
        for(var i=0;i<nodes.length;i++) {
          var e = nodes[i], span = e.firstChild;
          var colour = e.realNick.toHSBColour(this.client);
          if(colour != null)
            span.setStyle("color", colour.rgbToHex());
        };
      } else {
        for(var i=0;i<nodes.length;i++) {
          var span = nodes[i].firstChild;
          span.setStyle("color", null);
        };
      }
    }
  },
  deselect: function() {
    this.parent();
    
    this.tab.removeClass("tab-selected");
    this.tab.addClass("tab-unselected");
  },
  close: function() {
    this.parent();
    
    this.parentObject.tabs.removeChild(this.tab);
    this.parentObject.tabs.removeChild(this.spaceNode);
    this.reflow();
  },
  addLine: function(type, line, colourClass) {
    var e = new Element("div");

    if(colourClass) {
      e.addClass(colourClass);
    } else if(this.lastcolour) {
      e.addClass("linestyle1");
    } else {
      e.addClass("linestyle2");
    }
    this.lastcolour = !this.lastcolour;

    this.parent(type, line, colourClass, e);
  },
  setHilighted: function(state) {
    var laststate = this.hilighted;
    
    this.parent(state);

    if(state == laststate)
      return;
      
    this.tab.removeClass("tab-hilight-activity");
    this.tab.removeClass("tab-hilight-us");
    this.tab.removeClass("tab-hilight-speech");
    
    switch(this.hilighted) {
      case qwebirc.ui.HILIGHT_US:
        this.tab.addClass("tab-hilight-us");
        break;
      case qwebirc.ui.HILIGHT_SPEECH:
        this.tab.addClass("tab-hilight-speech");
        break;
      case qwebirc.ui.HILIGHT_ACTIVITY:
        this.tab.addClass("tab-hilight-activity");
        break;
    }
  },
  setSideTabs: function(value) {
    if(this.tabclose === null)
      return;
    this.tab.removeChild(this.tabclose);
    if(value) {
      this.tab.insertBefore(this.tabclose, this.tab.firstChild);
    } else {
      this.tab.appendChild(this.tabclose);
    }
  }
});

// Hilfsmethode: Mapping von Fenstertyp / Pane zu i18n-Key
qwebirc.ui.QUI.Window.prototype._i18nKeyFor = function() {
  if(this.type == qwebirc.ui.WINDOW_STATUS) return 'TAB_STATUS';
  if(this.type == qwebirc.ui.WINDOW_CONNECT || this.identifier == '_Connect' || (this.pane && this.pane.type == 'connectpane')) return 'TAB_CONNECT';
  if(this.pane && this.pane.type == 'optionspane') return 'TAB_OPTIONS';
  if(this.pane && this.pane.type == 'embeddedwizard') return 'TAB_EMBED';
  if(this.pane && this.pane.type == 'aboutpane') return 'TAB_ABOUT';
  return null;
};

qwebirc.ui.QUI.Window.prototype._applyTranslatedTitle = function() {
  var key = this._i18nKeyFor();
  if(!key) return; // Nicht systemdefiniert
  var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
  var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang];
  if(i18n && i18n.options && i18n.options[key]) {
    this.setTitle(i18n.options[key]);
  }
};

// Override setTitle to update tab text live
qwebirc.ui.QUI.Window.prototype.setTitle = function(newTitle) {
  this.name = newTitle;
  if(this.tab) {
    // Close-Button sicherstellen (inkl. Debug-Ausgabe bei Problemen)
    this._ensureTabClose(this.type, this._baseName || this.name);
    var close = this.tabclose;
    this.tab.empty();
    this.tab.appendText(newTitle);
  if(close) this.tab.appendChild(close);
  }
  if(this.active) {
    try { document.title = newTitle + ' - ' + this.parentObject.options.appTitle; } catch(e) {}
  }
};

// Internal helper: creates (or repairs) the SVG close button for a tab
qwebirc.ui.QUI.Window.prototype._ensureTabClose = function(type, originalName) {
  if(type == qwebirc.ui.WINDOW_STATUS || type == qwebirc.ui.WINDOW_CONNECT) {
    this.tabclose = null; return;
  }
  // Also reconstruct if element exists but is empty / has no SVG
  if(this.tabclose && this.tabclose.parentNode === this.tab && this.tabclose.getElement && this.tabclose.getElement('svg')) {
    // Alles gut
  } else {
    // Neu oder reparieren
    if(!this.tabclose) this.tabclose = new Element('span');
  // If empty or missing SVG: refill content
    if(!this.tabclose.getElement || !this.tabclose.getElement('svg')) {
      try { this.tabclose.empty(); } catch(e) {}
    }
  }
  var tabclose = this.tabclose || new Element('span');
  tabclose.addClass('tabclose');
  // Clean possible old content
  if(!tabclose.getElement('svg')) { try { tabclose.empty(); } catch(e) {} }
  // Vereinfachter SVG-Insert (alle Zielbrowser unterstützen SVG). Fallback nur für unerwartete Fehler.
  if(!tabclose.getElement('svg')) {
    var markup = '<svg viewBox="0 0 14 14" width="14" height="14" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">'
      + '<line x1="3" y1="3" x2="11" y2="11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />'
      + '<line x1="11" y1="3" x2="3" y2="11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />'
      + '</svg>';
    try { tabclose.set('html', markup); } catch(e) { tabclose.set('text','×'); }
  }
  // Defensive: ensure a single close handler is bound (supports MooTools Element or native DOM node)
  try {
    var alreadyBound = (tabclose.retrieve && tabclose.retrieve('qwebirc-close-bound')) || tabclose.__qwebircCloseBound;
  } catch(e) { var alreadyBound = tabclose.__qwebircCloseBound; }
  if(!alreadyBound) {
    var closeHandler = function(e){
      try { if(typeof Event !== 'undefined' && Event.prototype && e instanceof Event) { /* native event */ } else { /* MooTools Event wrapper */ } } catch(_) {}
  qwebirc.ui.util.stopEvent(e);
      try { if(this.closed) return; } catch(_) {}
      try { if(this.type == qwebirc.ui.WINDOW_CHANNEL && this.client) this.client.exec('/PART ' + (originalName || this.name)); } catch(_) {}
      try { this.close(); } catch(_) {}
    }.bind(this);
    try { if(tabclose.addEvent) tabclose.addEvent('click', closeHandler); else if(tabclose.addEventListener) tabclose.addEventListener('click', closeHandler, false); } catch(e) {}
    try { tabclose.store && tabclose.store('qwebirc-close-bound', true); } catch(e) {}
    tabclose.__qwebircCloseBound = true;
  }
  this.tabclose = tabclose;
  try {
    if(this.parentObject && this.parentObject.sideTabs) {
      if(tabclose.parentNode !== this.tab) this.tab.insertBefore(tabclose, this.tab.firstChild);
    } else {
      if(tabclose.parentNode !== this.tab) this.tab.appendChild(tabclose);
    }
  } catch(e) {}
  // Debug-Logging für Fallback entfernt
};
