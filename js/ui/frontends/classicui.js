// helper to stop events - works with MooTools Event wrappers and native events
function _qwebirc_stopEvent(e) {
  if (!e) return;
  try {
    if (e.stop) { e.stop(); return; }
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  } catch (ignore) {}
}

qwebirc.ui.CLASSICUI = new Class({
  Extends: qwebirc.ui.RootUI,
  initialize: function(parentElement, theme, options) {
    this.parent(parentElement, qwebirc.ui.QUI.Window, "classicui", options);
    this.theme = theme;
    this.parentElement = parentElement;
    this.setModifiableStylesheet("classicui");
    this.client = null; // Reference to IRC client for typing
    // Later repair check for pane tab close buttons (Options / Embed / About)
    try {
      var self = this;
      window.addEvent && window.addEvent('qwebirc:languageChanged', function(){ self.__repairPaneTabCloses && self.__repairPaneTabCloses(); });
      this.__repairPaneTabCloses = function(){
        try {
          (self.windowArray||[]).forEach(function(w){
            if(!w) return;
            if(w.pane && (w.pane.type=='optionspane' || w.pane.type=='embeddedwizard' || w.pane.type=='aboutpane')) {
              if(w._ensureTabClose) w._ensureTabClose(w.type, w._baseName || w.name);
              if(w.tabclose) {
                // Classic theme: prefer simple × fallback instead of SVG icons
                try { w.tabclose.set('text','×'); } catch(e) { try { w.tabclose.set('html','×'); } catch(_) {} }
              }
            }
          });
        } catch(e) {}
      };
    } catch(e) {}
  },
  postInitialize: function() {
  this.qjsui = new qwebirc.ui.CLASSICUI.JSUI("qwebirc-classicui", this.parentElement);
    this.qjsui.addEvent("reflow", function() {
      var w = this.getActiveWindow();
      if($defined(w))
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
      var event = x;
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

  if(up) {
        this.nextWindow();
      } else if(down) {
        this.prevWindow();
      }
  _qwebirc_stopEvent(event);
    }.bind(this);
    this.qjsui.left.addEvent("mousewheel", scrollHandler);
    this.qjsui.top.addEvent("mousewheel", scrollHandler);

    this.createInput();
    this.reflow();
    for(var i=50;i<1000;i+=50)
      this.reflow.delay(i, true);
    for(var i=1000;i<2000;i+=100)
      this.reflow.delay(i);
    for(var i=2000;i<15000;i+=500)
      this.reflow.delay(i);

    this.setSideTabs(this.uiOptions.SIDE_TABS);

    // Live re-translation for open nick menu (parity with QUI)
    if(!this.__nickMenuLangListenerAdded) {
      this.__nickMenuLangListenerAdded = true;
      var self = this;
      var refreshOpenNickMenu = function() {
        try {
          if(!self.__openNickMenu || !self.__openNickMenu.container || !self.__openNickMenu.container.parentNode) return;
          var cont = self.__openNickMenu.container;
          var nick = self.__openNickMenu.nick;
          // Re-label all links
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

    // Hide connect status in typing bar when signedOn fires (parity with QUI)
    this.addEvent && this.addEvent('signedOn', function() {
      if(window.qwebircConnectStatus) {
        window.qwebircConnectStatus.hide();
      }
    });

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
      document.removeEventListener && document.removeEventListener("mousedown", hideEvent);
    };
    var hideEvent = function() { dropdownMenu.hide(); };

    dropdownMenu.hide();
    // Append to body to allow absolute positioning independent of nested layout
    try {
      document.body.appendChild(dropdownMenu);
      if(!dropdownMenu.className.contains) dropdownMenu.addClass && dropdownMenu.addClass('dropdownmenu');
      // If Classic UI root exists in document, mark overlay so scoped CSS applies
      try {
        var node = this.parentElement;
        var foundRoot = false;
        while(node && node !== document.documentElement) {
          try { if(node.classList && node.classList.contains('qwebirc-classicui')) { foundRoot = true; break; } } catch(_) {}
          node = node.parentNode;
        }
        if(foundRoot) {
          try { dropdownMenu.addClass && dropdownMenu.addClass('qwebirc-classicui'); } catch(_) {}
        }
      } catch(_) {}
    } catch(e) { this.parentElement.appendChild(dropdownMenu); }

  var buildEntries = function() {
      dropdownMenu.empty && dropdownMenu.empty();
      this.UICommands.forEach(function(x) {
        var label = (typeof x[0] === 'function') ? x[0]() : x[0];
        var fn = x[1];
  var e = new Element("a");
  e.addEvent("mousedown", function(ev) { _qwebirc_stopEvent(ev); });
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
        if(this.__menuCache) {
          this.UICommands = this.__menuCache.map(function(entry){
            return [(typeof entry[0] === 'function') ? entry[0] : entry[0], entry[1]];
          });
        }
        buildEntries();
      }.bind(this));
    }
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
    // i18n helper for small keys
    var __t = function(key, fallback) {
      try {
        var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
        var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang] && window.qwebirc.i18n[lang].options;
        if(i18n && i18n[key]) return i18n[key];
      } catch(e) {}
      return fallback;
    };
    var menuTitle = __t('MENU', 'menu');
    var menuImg = new Element("img", {src: qwebirc.global.staticBaseURL + "images/icon.png", title: menuTitle, alt: menuTitle});
    dropdown.appendChild(menuImg);
    dropdown.setStyle("opacity", 1);
    // update title/alt on language change
    if(window.qwebirc && typeof window.qwebirc.registerTranslator === 'function') {
      window.qwebirc.registerTranslator(function(){
        try { var t = __t('MENU','menu'); if(menuImg && menuImg.set) { menuImg.set('title', t); menuImg.set('alt', t); } } catch(e) {}
      });
    }
    window.addEventListener && window.addEventListener('qwebirc:languageChanged', function(){ try { var t = __t('MENU','menu'); if(menuImg && menuImg.set) { menuImg.set('title', t); menuImg.set('alt', t); } } catch(e) {} });

    this.outerTabs.appendChild(dropdown);
    dropdownMenu.show = function(x) {
      _qwebirc_stopEvent(x);

      if(dropdownMenu.visible) { dropdownMenu.hide(); return; }
      dropdownMenu.setStyles && dropdownMenu.setStyles({display: "block", visibility: "hidden"});
      try {
        var tabPos = dropdown.getPosition();
        var tabSize = dropdown.getSize();
        var menuSize = dropdownMenu.getSize();
        var top = tabPos.y + tabSize.y + 4;
        var left = tabPos.x;
        var viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        if(left + menuSize.x > viewportWidth - 4) {
          left = Math.max(4, viewportWidth - menuSize.x - 4);
        }
        if(top + menuSize.y > window.innerHeight - 4) {
          var altTop = tabPos.y - menuSize.y - 4;
          if(altTop > 4) top = altTop;
        }
        dropdownMenu.setStyles && dropdownMenu.setStyles({left: left + "px", top: top + "px"});
      } catch(e) {}
      dropdownMenu.setStyle && dropdownMenu.setStyle("visibility", "visible");
      dropdownMenu.visible = true;
      document.addEventListener && document.addEventListener("mousedown", hideEvent);
    }.bind(this);
  dropdown.addEvent("mousedown", function(e) { _qwebirc_stopEvent(e); });
    dropdown.addEvent("click", dropdownMenu.show);
  },
  createInput: function() {
    var form = new Element("form");
    this.input.appendChild(form);
    
    form.addClass("input");

  // Emoji Picker Button (full implementation portiert aus qui.js)
  var emojiBtn = new Element("button", { type: "button", html: "😊" });
  emojiBtn.addClass("emoji-picker-btn");
  // Dynamic size: 1em
  emojiBtn.setStyles({ position: "absolute", left: "5px", bottom: "5px", zIndex: 10, background: "none", border: "none", cursor: "pointer", fontSize: "1em", padding: "0 4px" });
  form.appendChild(emojiBtn);

  // Input box with left padding for emoji button
  var inputbox = new Element("input");
  inputbox.setStyle("paddingLeft", "32px");

  // Emoji Picker Overlay
  var emojiOverlay = new Element("div");
  emojiOverlay.addClass("emoji-picker-overlay");
  // Dynamic size: 1em
  emojiOverlay.setStyles({ display: "none", position: "absolute", left: "0", bottom: "40px", zIndex: 1000, background: "#fff", border: "1px solid #ccc", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", padding: "8px", minWidth: "220px", maxHeight: "220px", overflowY: "auto", fontSize: "1em" });
  form.appendChild(emojiOverlay);

    // Emoji Kategorien und Emojis (bereinigt: entfernt U+FFFD / '�' Einträge)
    var emojiCategories = [
      { nameKey: "EMOJI_CAT_SMILEYS", name: "Smileys & People", icon: "😃", emojis: [
        "😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚",
        "😋","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😪",
        "🤤","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶","🤯","🤠","🥳","😎","🤓","🧐","😕"
      ,
      // Hand emojis with skin tone modifiers
      "👍","👎","👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","🫵","🫱","🫲","🫳","🫴","👏","🙌","👐","🤲","🙏","✍️","💅","🤳","💪","🦵","🦶","👂","🦻","👃"
      ] },
      { nameKey: "EMOJI_CAT_ANIMALS", name: "Animals & Nature", icon: "🐻", emojis: [
        "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🦄","🐔","🐧","🐦","🐤",
        "🐣","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦓","🦍","🐢","🐍","🦎","🦂","🦀","🦞","🦐","🦑","🐙"
      ] },
      { nameKey: "EMOJI_CAT_FOOD", name: "Food & Drink", icon: "🍎", emojis: [
        "🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥝","🍅","🍆","🥑",
        "🥦","🥬","🥒","🌶️","🌽","🥕","🧄","🧅","🥔","🍠","🥐","🥯","🍞","🥖","🥨","🧀","🥚","🍳","🥞"
      ] },
      { nameKey: "EMOJI_CAT_TRAVEL", name: "Travel & Places", icon: "✈️", emojis: [
        "🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🚚","🚛","🚜","🛵","🏍️","🚲","🛴","🚨","🚔","🚍",
        "🚘","🚖","🚡","🚠","🚟","🚃","🚋","🚞","🚝","🚄","🚅","🚈","🚂","🚆","🚇","🚊","🚉","✈️","🛫","🛬",
        "🛩️","💺","🛰️","🚀","🛸","🚁","⛵","🛶","🚤","🛥️","🛳️","⛴️","🚢","⚓","🪝","⛽","🚧","🚦","🚥","🚏"
      ] },
      { nameKey: "EMOJI_CAT_OBJECTS", name: "Objects", icon: "💡", emojis: [
        "⌚","📱","📲","💻","⌨️","🖥️","🖨️","🖱️","🖲️","🕹️","🗜️","💽","💾","💿","📀","📼","📷","📸","📹","🎥",
        "📽️","🎞️","📞","☎️","📟","📠","📺","📻","🎙️","🎚️","🎛️","⏱️","⏲️","⏰","🕰️","⌛","⏳","📡","🔋","🔌"
      ] },
      { nameKey: "EMOJI_CAT_FLAGS", name: "Flags", icon: "🏳️", emojis: [
        "🏳️","🏴","🏁","🚩","🏳️‍🌈","🏳️‍⚧️","🇦🇹","🇩🇪","🇨🇭","🇺🇸","🇬🇧","🇫🇷","🇮🇹","🇪🇸","🇵🇱","🇳🇱","🇸🇪","🇳🇴","🇩🇰","🇫🇮",
        "🇨🇦","🇧🇷","🇦🇷","🇲🇽","🇯🇵","🇨🇳","🇰🇷","🇦🇺","🇳🇿","🇮🇳","🇹🇷","🇷🇺","🇺🇦","🇮🇱","🇪🇬","🇿🇦","🇸🇦","🇦🇪","🇶🇦","🇸🇬"
      ] },
      { nameKey: "EMOJI_CAT_SYMBOLS", name: "Symbols", icon: "❤️",
        emojis: [
          "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟",
          "☮️","✝️","☪️","🕉️","☸️","✡️","🔯","🕎","☯️","☦️","🛐","⛎","♈","♉","♊","♋","♌","♍","♎","♏",
          "♐","♑","♒","♓","🆔","⚛️","🉑","☢️","☣️","📴","📳","🈶","🈚","🈸","🈺","🈷️","✴️","🆚","💮","🉐",
          "©️","®️","™️","ℹ️","🔞","🚭","☑️","✅","✔️","❌","❎","➕","➖","➗","➰","➿","🔟","#️⃣","*️⃣","0️⃣",
          "1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔢","🔣","🔤","🔡","🔠","🔽","🔼","🔺","🔻","🔸","🔹",
          // Weitere Symbole
          "⬆️","⬇️","⬅️","➡️","↗️","↘️","↙️","↖️","↩️","↪️","⤴️","⤵️","🔀","🔁","🔂","🔄","🔃","🔚","🔙","🔛",
          "🔜","🔝","🛑","⏏️","⏩","⏪","⏫","⏬","⏭️","⏮️","⏸️","⏹️","⏺️","⏯️","▪️","▫️","◾","◽","◼️","◻️",
          "⬛","⬜","🔳","🔲","◉","◯","◐","◑","◒","◓","◔","◕","⚫","⚪","🔘","🔴","🔵","🔺","🔻","🔸","🔹",
          "🔶","🔷","🔈","🔉","🔊","🔇","🔕","🔔"
        ]
      }
    ];
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
          if(e && e.preventDefault) e.preventDefault();
          activeCategory = idx;
          renderEmojiPicker();
        });
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
        var handBase = "\u001d\u001d\u001d\u001d\u001d";
  // Default hand emoji for display (thumbs up)
        var handEmoji = "\u001d\u001d\u001d\u001d\u001d";
  // Default assignment
        handEmoji = "👍";
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
            if(e && e.preventDefault) e.preventDefault();
            window.activeSkinTone = idx;
            renderEmojiPicker();
          });
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
              if(e.preventDefault) e.preventDefault();
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
      if(e && e.preventDefault) e.preventDefault();
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
    this.addEvent("signedOn", function(client) {
      // store IRC client reference so typing TAGMSGs can be sent (parity with QUI)
      try { this.client = client; } catch(e) {}
      // i18n-aware placeholder
      try {
        var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
        var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang] && window.qwebirc.i18n[lang].options;
        inputbox.placeholder = (i18n && i18n.INPUT_PLACEHOLDER) ? i18n.INPUT_PLACEHOLDER : 'chat here! you can also use commands, like /JOIN';
      } catch(e) { inputbox.placeholder = 'chat here! you can also use commands, like /JOIN'; }
      var d = function() { inputbox.addClass("input-flash"); }.delay(250);
      var d = function() { inputbox.removeClass("input-flash"); }.delay(500);
      var d = function() { inputbox.addClass("input-flash"); }.delay(750);
      var d = function() { inputbox.removeClass("input-flash"); }.delay(1000);
      var d = function() { inputbox.addClass("input-flash"); }.delay(1250);
      var d = function() { inputbox.removeClass("input-flash"); }.delay(1750);
    });
  form.appendChild(inputbox);
  this.inputbox = inputbox;
  this.inputbox.maxLength = 470;
    // Language-aware placeholder handling (registerTranslator compatibility)
    if(window.qwebirc && typeof window.qwebirc.registerTranslator === 'function') {
      window.qwebirc.registerTranslator(function(){
        try {
          var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
          var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang] && window.qwebirc.i18n[lang].options;
          if(i18n && i18n.INPUT_PLACEHOLDER) inputbox.placeholder = i18n.INPUT_PLACEHOLDER;
        } catch(e) {}
      });
    }
    window.addEventListener && window.addEventListener('qwebirc:languageChanged', function(ev){
      try {
        var lang = ev && ev.detail && ev.detail.lang ? ev.detail.lang : ((window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en');
        var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang] && window.qwebirc.i18n[lang].options;
        if(i18n && i18n.INPUT_PLACEHOLDER) inputbox.placeholder = i18n.INPUT_PLACEHOLDER;
      } catch(e) {}
    });

  // Emoji picker removed from Classic (functionality exists in QUI frontend)

    var sendInput = function() {
      if(inputbox.value == "") return;
      this.resetTabComplete();
      this.getActiveWindow().historyExec(inputbox.value);
      inputbox.value = "";
      inputbox.placeholder = "";
      // If typing indicator code present, send done
      if(this._sendTypingTagmsg) this._sendTypingTagmsg('done');
    }.bind(this);

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
    
  form.addEvent("submit", function(e) { _qwebirc_stopEvent(e); sendInput(); });

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

  _qwebirc_stopEvent(e);
        e.preventDefault();
        return;
      } else {
        return;
      }
      
      this.resetTabComplete();
      if((cvalue != "") && (this.lastcvalue != cvalue))
        this.commandhistory.addLine(cvalue, true);
      
      var result = resultfn.bind(this.commandhistory)();
      
  _qwebirc_stopEvent(e);
      e.preventDefault();

      if(!result)
        result = "";
      this.lastcvalue = result;
        
      inputbox.value = result;
      qwebirc.util.setAtEnd(inputbox);
    }.bind(this));

    /* Typing-Indicator (TAGMSG @+typing) - portiert aus qui.js */
  this._sendTypingTagmsg = function(state) {
      try {
        if (typeof inputbox !== 'undefined' && inputbox.value && inputbox.value.trim().charAt(0) === '/') return;
        var win = this.getActiveWindow();
        if(!win) return;
        var target = win.name;
        if(win.type == qwebirc.ui.WINDOW_CHANNEL || win.type == qwebirc.ui.WINDOW_QUERY) {
          if(this.client && this.client.send) {
            if(this.client.activeCaps && this.client.activeCaps.indexOf("message-tags") !== -1) {
              this.client.send("@+typing=" + state + " TAGMSG " + target);
            }
          }
        }
      } catch(e) {}
    }.bind(this);

  // Compatibility: expose same public method name as QUI so other code can call it
  try { this.sendTypingTagmsg = this._sendTypingTagmsg; } catch(e) {}

    var typingTimeout = null;
    var typingInterval = null;
    var lastTypingState = "done";
    var TYPING_INTERVAL = 1000;
    var PAUSE_DELAY = 2000;

    var startTypingInterval = function() {
      if (typingInterval) return;
      if(inputbox.value.length > 0 && lastTypingState !== "active") {
        this._sendTypingTagmsg("active");
        lastTypingState = "active";
      }
      typingInterval = setInterval(function() {
        if(inputbox.value.length > 0) {
          if(lastTypingState !== "active") {
            this._sendTypingTagmsg("active");
            lastTypingState = "active";
          }
        } else {
          stopTypingInterval();
        }
      }.bind(this), TYPING_INTERVAL);
    }.bind(this);

    var stopTypingInterval = function() {
      if (typingInterval) { clearInterval(typingInterval); typingInterval = null; }
    };

    var typingHandler = function(e) {
      var win = this.getActiveWindow();
      if(!win || (win.type != qwebirc.ui.WINDOW_CHANNEL && win.type != qwebirc.ui.WINDOW_QUERY)) return;
      if(typingTimeout) clearTimeout(typingTimeout);
      if(inputbox.value.length > 0) {
        startTypingInterval();
        if(typingTimeout) clearTimeout(typingTimeout);
        typingTimeout = setTimeout(function() {
          if(lastTypingState !== "done" && lastTypingState !== "paused") {
            this._sendTypingTagmsg("paused");
            lastTypingState = "paused";
          }
        }.bind(this), PAUSE_DELAY);
      } else {
        stopTypingInterval();
        if(lastTypingState !== "done") {
          this._sendTypingTagmsg("done");
          lastTypingState = "done";
        }
        if(typingTimeout) clearTimeout(typingTimeout);
      }
    }.bind(this);
    inputbox.addEvent("input", typingHandler);

    inputbox.addEvent("keydown", function() {
      if(inputbox.value.length > 0) {
        startTypingInterval();
        if(typingTimeout) clearTimeout(typingTimeout);
        typingTimeout = setTimeout(function() {
          stopTypingInterval();
          if(lastTypingState !== "done" && lastTypingState !== "paused") {
            this._sendTypingTagmsg("paused");
            lastTypingState = "paused";
          }
        }.bind(this), PAUSE_DELAY);
      } else {
        stopTypingInterval();
        if(lastTypingState !== "done") {
          this._sendTypingTagmsg("done");
          lastTypingState = "done";
        }
        if(typingTimeout) clearTimeout(typingTimeout);
      }
    }.bind(this));
  },
  setLines: function(lines) {
    this.lines.parentNode.replaceChild(lines, this.lines);
    this.qjsui.middle = this.lines = lines;
  },
  setChannelItems: function(nicklist, topic) {
    if(!$defined(nicklist)) {
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

qwebirc.ui.CLASSICUI.JSUI = new Class({
  Implements: [Events],
  initialize: function(class_, parent, sizer) {
    this.parent = parent;
    this.sizer = $defined(sizer)?sizer:parent;

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
    if(!delay)
      delay = 1;
      
    if(this.reflowevent)
      $clear(this.reflowevent);
    this.__reflow();
    this.reflowevent = this.__reflow.delay(delay, this);
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

qwebirc.ui.CLASSICUI.Window = new Class({
  Extends: qwebirc.ui.Window,
  
  initialize: function(parentObject, client, type, name, identifier) {
    this.parent(parentObject, client, type, name, identifier);

    this.tab = new Element("a");
    this.tab.addClass("tab");
    this.tab.addEvent("focus", function() { this.blur() }.bind(this.tab));;

    this.spaceNode = document.createTextNode(" ");
    parentObject.tabs.appendChild(this.tab);
    parentObject.tabs.appendChild(this.spaceNode);

    if(type != qwebirc.ui.WINDOW_STATUS && type != qwebirc.ui.WINDOW_CONNECT) {
      var tabclose = new Element("span");
      this.tabclose = tabclose;
      // use multiplication sign as a nicer close glyph (QUI falls back to × as well)
      tabclose.set("text", "×");
      tabclose.addClass("tabclose");
      var close = function(e) {
        _qwebirc_stopEvent(e);

        if(this.closed)
          return;

        if(type == qwebirc.ui.WINDOW_CHANNEL)
          this.client.exec("/PART " + name);

        this.close();

        //parentObject.inputbox.focus();
      }.bind(this);

      tabclose.addEvent("click", close);
      this.tab.addEvent("mouseup", function(e) {
        var button = 1;

        if(Browser.Engine.trident)
          button = 4;

        if(e.event.button == button)
          close(e);
      }.bind(this));

      this.tab.appendChild(tabclose);
    } else {
      this.tabclose = null;
    }

    this.tab.appendText(name);
    this.tab.addEvent("click", function(e) {
      _qwebirc_stopEvent(e);
      
      if(this.closed)
        return;
        
      parentObject.selectWindow(this);
    }.bind(this));
    // Register translator for system tabs (live-update titles/topics on language change)
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
    window.addEventListener && window.addEventListener('qwebirc:languageChanged', function(){
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

  // status window: no spinner decoration in Classic theme (spinner handled by MochaUI elsewhere)

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
    // Typing indicator state (portiert aus qui.js)
    this._typingUsers = {};
    this._typingTimeouts = {};

    // Helper: render nick (keeps parity with QUI)
    this._renderNick = function(nick) {
      try {
        // if nick is the local user, emphasize
        if (this.client && this.client.nickname && this.client.nickname.toLowerCase() === nick.toLowerCase()) {
          return '<strong>' + nick + '</strong>';
        }
      } catch(e) {}
      return nick;
    };

    this._updateTypingBar = function() {
      try {
        if(!this._typingBar) {
          var inputForm = document.querySelectorAll('.input form')[0];
          if (inputForm) {
            var typingBar = new Element('div', {'class': 'qwebirc-typing-bar'});
            typingBar.inject(inputForm, 'before');
            this._typingBar = typingBar;
          }
        }
        if (!this._typingBar) return;

        var nicks = Object.keys(this._typingUsers).filter(function(nick) {
          return this._typingUsers[nick] === 'active';
        }.bind(this));

        if (nicks.length === 0) {
          this._typingBar.set('text', '');
          this._typingBar.removeClass('active');
          this._typingBar.removeClass('paused');
          this._typingBar.addClass('qwebirc-typing-bar');
          return;
        }

        var nickHtml = nicks.map(this._renderNick.bind(this)).join(', ');
        var text = nickHtml + ' <span class="typing-dots"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></span>';
        this._typingBar.set('html', text);
        this._typingBar.removeClass('paused');
        this._typingBar.addClass('qwebirc-typing-bar');
        this._typingBar.addClass('active');
      } catch(e) {}
    };

    // Hauptfunktion: Event-Verarbeitung für eingehende TAGMSGs
    this.showTypingBar = function(event) {
      try {
        if (!event.tags || !event.tags.typing) return;
        var typingState = event.tags.typing;
        var nick = event.user ? event.user.split('!')[0] : null;
        if(!nick) return;

        var hideDelay = 5000;
        if (this._typingTimeouts[nick]) {
          clearTimeout(this._typingTimeouts[nick]);
        }
        if (typingState === 'active') {
          this._typingUsers[nick] = 'active';
          this._typingTimeouts[nick] = setTimeout(function() {
            delete this._typingUsers[nick];
            this._updateTypingBar();
          }.bind(this), hideDelay);
        } else if (typingState === 'paused') {
          this._typingUsers[nick] = 'paused';
          this._typingTimeouts[nick] = setTimeout(function() {
            delete this._typingUsers[nick];
            this._updateTypingBar();
          }.bind(this), hideDelay);
        } else if (typingState === 'done') {
          delete this._typingUsers[nick];
          if (this._typingTimeouts[nick]) {
            clearTimeout(this._typingTimeouts[nick]);
            delete this._typingTimeouts[nick];
          }
        }
        this._updateTypingBar();
      } catch(e) {}
    };
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

    if(!this.client.nickOnChanHasPrefix(this.client.nickname, this.name, "@")) {
/*      var cmodes = this.client.getChannelModes(channel);
      if(cmodes.indexOf("t")) {*/
        try {
          var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
          var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang];
          var t = function(key, fallback){ return (i18n && i18n.options && i18n.options[key]) ? i18n.options[key] : (fallback || key); };
          alert(t('NEED_CHANOP','Sorry, you need to be a channel operator to change the topic!'));
        } catch(e) { alert('Sorry, you need to be a channel operator to change the topic!'); }
        return;
      /*}*/
    }
    try {
      var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
      var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang];
      var tt = function(key, fallback){ return (i18n && i18n.options && i18n.options[key]) ? i18n.options[key] : (fallback || key); };
      var newTopic = prompt(tt('CHANGE_TOPIC_OF','Change topic of {name} to:').replace('{name}', this.name), this.topic.topicText);
    } catch(e) {
      var newTopic = prompt('Change topic of ' + this.name + ' to:', this.topic.topicText);
    }
    if(newTopic === null)
      return;

    this.client.exec("/TOPIC " + newTopic);
  },
  reflow: function() {
    this.parentObject.reflow();
  },
  onResize: function() {
    if(this.scrolleddown) {
      if(Browser.Engine.trident) {
        this.scrollToBottom.delay(5, this);
      } else {
        this.scrollToBottom();
      }
    } else if($defined(this.scrollpos)) {
      if(Browser.Engine.trident) {
        this.getScrollParent().scrollTo(this.scrollpos.x, this.scrollpos.y);
      } else {
        this.getScrollParent().scrollTo.delay(5, this, [this.scrollpos.x, this.scrollpos.y]);
      }
    }
  },
  createMenu: function(nick, parent) {
    var e = new Element("div");
    parent.appendChild(e);
    e.addClass("menu");
    
  var nickArray = [nick];
  // Store reference for live re-translation
  this.__openNickMenu = {container: e, nick: nick};
  qwebirc.ui.MENU_ITEMS.forEach(function(x) {
      if(!x.predicate || x.predicate !== true && !x.predicate.apply(this, nickArray))
        return;
      
      var e2 = new Element("a");
      e.appendChild(e2);

  var label = (typeof x.text === 'function') ? x.text() : x.text;
  e2.set("text", "- " + label);
  // store reference for live re-translation
  try { e2.__menuItem = x; } catch(e) {}

      e2.addEvent("focus", function() { this.blur() }.bind(e2));
  e2.addEvent("click", function(ev) { _qwebirc_stopEvent(ev); this.menuClick(x.fn); }.bind(this));
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
    var realNick = this.client.stripPrefix(nick);
    
    var e = new Element("a");
    qwebirc.ui.insertAt(position, this.nicklist, e);
    var span = new Element("span");
    if(this.parentObject.uiOptions.NICK_COLOURS) {
      var colour = realNick.toHSBColour(this.client);
      if($defined(colour))
        span.setStyle("color", colour.rgbToHex());
    }
    span.set("text", nick);
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
  _qwebirc_stopEvent(x);
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
      t.topicText = topic;
      if (topic) {
        this.parent(topic, t);
      } else {
        try {
          var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
          var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang] && window.qwebirc.i18n[lang].options;
          var noTopic = (i18n && i18n.NO_TOPIC) ? i18n.NO_TOPIC : '(no topic set)';
          t.appendChild(document.createTextNode(noTopic));
        } catch(e) { t.appendChild(document.createTextNode('(no topic set)')); }
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
    this.parentObject.qjsui.showChannel($defined(this.nicklist), this.parentObject.uiOptions.SHOW_NICKLIST);

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
          if($defined(colour))
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

// Helpers copied from qui.js to provide parity
qwebirc.ui.CLASSICUI.Window.prototype._i18nKeyFor = function() {
  if(this.type == qwebirc.ui.WINDOW_STATUS) return 'TAB_STATUS';
  if(this.type == qwebirc.ui.WINDOW_CONNECT || this.identifier == '_Connect' || (this.pane && this.pane.type == 'connectpane')) return 'TAB_CONNECT';
  if(this.pane && this.pane.type == 'optionspane') return 'TAB_OPTIONS';
  if(this.pane && this.pane.type == 'embeddedwizard') return 'TAB_EMBED';
  if(this.pane && this.pane.type == 'aboutpane') return 'TAB_ABOUT';
  return null;
};

qwebirc.ui.CLASSICUI.Window.prototype._applyTranslatedTitle = function() {
  var key = this._i18nKeyFor();
  if(!key) return;
  var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
  var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang];
  if(i18n && i18n.options && i18n.options[key]) {
    this.setTitle(i18n.options[key]);
  }
};

qwebirc.ui.CLASSICUI.Window.prototype.setTitle = function(newTitle) {
  this.name = newTitle;
  if(this.tab) {
    this._ensureTabClose && this._ensureTabClose(this.type, this._baseName || this.name);
    var close = this.tabclose;
    try { this.tab.empty(); } catch(e) {}
    this.tab.appendText(newTitle);
    if(close) this.tab.appendChild(close);
  }
  if(this.active) {
    try { document.title = newTitle + ' - ' + this.parentObject.options.appTitle; } catch(e) {}
  }
};

qwebirc.ui.CLASSICUI.Window.prototype._ensureTabClose = function(type, originalName) {
  if(type == qwebirc.ui.WINDOW_STATUS || type == qwebirc.ui.WINDOW_CONNECT) { this.tabclose = null; return; }
  if(this.tabclose && this.tabclose.parentNode === this.tab && this.tabclose.getElement && this.tabclose.getElement('svg')) {
    // ok
  } else {
    if(!this.tabclose) this.tabclose = new Element('span');
    if(!this.tabclose.getElement || !this.tabclose.getElement('svg')) {
      try { this.tabclose.empty(); } catch(e) {}
    }
  }
  var tabclose = this.tabclose || new Element('span');
  tabclose.addClass('tabclose');
  // Classic theme: always use × fallback for simplicity and consistent look
  try { tabclose.empty && tabclose.empty(); } catch(e) {}
  try { tabclose.set('text', '×'); } catch(e) { try { tabclose.set('html', '×'); } catch(_) {} }
  // Ensure a single close handler is bound (MooTools or native fallback).
  try {
    var alreadyBound = (tabclose.retrieve && tabclose.retrieve('qwebirc-close-bound')) || tabclose.__qwebircCloseBound;
  } catch(e) { var alreadyBound = tabclose.__qwebircCloseBound; }
  if(!alreadyBound) {
    var closeHandler = function(e) {
      _qwebirc_stopEvent(e);
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
};

// Connect status object (export) – minimal implementation similar to qui.js
var connectStatus = {
  interval: null,
  step: 0,
  typingBar: null,
  show: function() {
    if (this.interval) return;
    var typingBar = document.querySelector('.qwebirc-typing-bar');
    if (!typingBar) {
      var inputForm = $$('.input form')[0];
      if (inputForm) {
  typingBar = new Element('div', {'class': 'qwebirc-typing-bar active'});
  // mark this bar as the connect-status bar so it can be removed safely
  try { typingBar.setAttribute('data-connect-status', '1'); } catch(e) {}
  typingBar.inject(inputForm, 'before');
      }
    }
    if (!typingBar) return;
    this.typingBar = typingBar;
    typingBar.addClass && typingBar.addClass('active');
    var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
    var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang] && window.qwebirc.i18n[lang].options;
    var lbl = (i18n && i18n.TRYING_TO_CONNECT) ? i18n.TRYING_TO_CONNECT : 'Trying to connect server';
    typingBar.set && typingBar.set('html', lbl + ' <span class="typing-dots"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></span>');
  },
  hide: function() {
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
    // Only remove typing bars that were created for connect status. Regular
    // typing-indicator bars (from other clients) should not be removed here.
    var bars = document.querySelectorAll('.qwebirc-typing-bar[data-connect-status]');
    bars.forEach(function(bar) {
      try { bar.classList && bar.classList.remove('active'); } catch(e) {}
      try { bar.style && (bar.style.display = 'none'); } catch(e) {}
      if (bar.parentNode) try { bar.parentNode.removeChild(bar); } catch(e) {}
    });
    this.typingBar = null;
  }
};
window.qwebircConnectStatus = connectStatus;

/* Backwards compatibility: older code expects qwebirc.ui.QUI */
qwebirc.ui.QUI = qwebirc.ui.CLASSICUI;
