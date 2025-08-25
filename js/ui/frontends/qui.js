qwebirc.ui.QUI = new Class({
  Extends: qwebirc.ui.RootUI,
  initialize: function(parentElement, theme, options) {
    this.parent(parentElement, qwebirc.ui.QUI.Window, "qui", options);
    this.theme = theme;
    this.parentElement = parentElement;
    this.setModifiableStylesheet("qui");
  this.client = null; // Reference to IRC client for typing
  },
  postInitialize: function() {
    this.qjsui = new qwebirc.ui.QUI.JSUI("qwebirc-qui", this.parentElement);
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
      var event = new Event(x);
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
      event.stop();
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
    this.parentElement.appendChild(dropdownMenu);
    
    this.UICommands.forEach(function(x) {
      var text = x[0];
      var fn = x[1];
      var e = new Element("a");
      e.addEvent("mousedown", function(e) { new Event(e).stop(); });
      e.addEvent("click", function() {
        dropdownMenu.hide();
        fn();
      });
      e.set("text", text);
      dropdownMenu.appendChild(e);
    }.bind(this));
    
    var dropdown = new Element("div");
    dropdown.addClass("dropdown-tab");
    dropdown.appendChild(new Element("img", {src: qwebirc.global.staticBaseURL + "images/icon.png", title: "menu", alt: "menu"}));
    dropdown.setStyle("opacity", 1);

    this.outerTabs.appendChild(dropdown);
    dropdownMenu.show = function(x) {
      new Event(x).stop();

      if(dropdownMenu.visible) {
        dropdownMenu.hide();
        return;
      }

      dropdownMenu.setStyle("display", "inline-block");
      dropdownMenu.visible = true;
      
      document.addEvent("mousedown", hideEvent);
    }.bind(this);
    dropdown.addEvent("mousedown", function(e) { new Event(e).stop(); });
    dropdown.addEvent("click", dropdownMenu.show);
  },
  createInput: function() {
    var form = new Element("form");
    this.input.appendChild(form);
    form.addClass("input");

    // Emoji Picker Button
  var emojiBtn = new Element("button", { type: "button", html: "😊" });
  emojiBtn.addClass("emoji-picker-btn");
  // Dynamische Größe: 1em
  emojiBtn.setStyles({ position: "absolute", left: "5px", bottom: "5px", zIndex: 10, background: "none", border: "none", cursor: "pointer", fontSize: "1em", padding: "0 4px" });
  form.appendChild(emojiBtn);

    // Inputbox mit Padding links für Emoji-Button
    var inputbox = new Element("input");
    inputbox.setStyle("paddingLeft", "32px");
    this.addEvent("signedOn", function(client) {
      this.getStatusWindow(client).lines.removeClass("spinner");
      inputbox.placeholder = "chat here! you can also use commands, like /JOIN";
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

    // Emoji Picker Overlay
  var emojiOverlay = new Element("div");
  emojiOverlay.addClass("emoji-picker-overlay");
  // Dynamische Größe: 1em
  emojiOverlay.setStyles({ display: "none", position: "absolute", left: "0", bottom: "40px", zIndex: 1000, background: "#fff", border: "1px solid #ccc", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", padding: "8px", minWidth: "220px", maxHeight: "220px", overflowY: "auto", fontSize: "1em" });
  form.appendChild(emojiOverlay);

    // Emoji Kategorien und Emojis
    var emojiCategories = [
      { name: "Smileys & People", icon: "😃", emojis: [
  "😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚",
  "😋","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌",
  "😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐","😕",
  // Hand-Emojis mit Hauttönen
  "👍","👎","👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","🫵","🫱","🫲","🫳","🫴","👏","🙌","👐","🤲","🙏","✍️","💅","🤳","💪","🦾","🦵","🦶","👂","🦻","👃"
      ] },
      { name: "Animals & Nature", icon: "🐻", emojis: [
        "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🦄","🐔","🐧","🐦","🐤",
        "🐣","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦓","🦍","🐢","🐍","🦎","🦂","🦀","🦞","🦐","🦑","🐙","🦑"
      ] },
      { name: "Food & Drink", icon: "🍎", emojis: [
        "🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑",
        "🥦","🥬","🥒","🌶️","🌽","🥕","🧄","🧅","🥔","🍠","🥐","🥯","🍞","🥖","🥨","🧀","🥚","🍳","🥞"
      ] },
      { name: "Travel & Places", icon: "✈️", emojis: [
        "🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🚚","🚛","🚜","🛵","🏍️","🚲","🛴","🚨","🚔","🚍",
        "🚘","🚖","🚡","🚠","🚟","🚃","🚋","🚞","🚝","🚄","🚅","🚈","🚂","🚆","🚇","🚊","🚉","✈️","🛫","🛬",
        "🛩️","💺","🛰️","🚀","🛸","🚁","⛵","🛶","🚤","🛥️","🛳️","⛴️","🚢","⚓","🪝","⛽","🚧","🚦","🚥","🚏"
      ] },
      { name: "Objects", icon: "💡", emojis: [
        "⌚","📱","📲","💻","⌨️","🖥️","🖨️","🖱️","🖲️","🕹️","🗜️","💽","💾","💿","📀","📼","📷","📸","📹","🎥",
        "📽️","🎞️","📞","☎️","📟","📠","📺","📻","🎙️","🎚️","🎛️","⏱️","⏲️","⏰","🕰️","⌛","⏳","📡","🔋","🔌"
      ] },
      { name: "Flags", icon: "🏳️", emojis: [
        "🏳️","🏴","🏁","🚩","🏳️‍🌈","🏳️‍⚧️","🇦🇹","🇩🇪","🇨🇭","🇺🇸","🇬🇧","🇫🇷","🇮🇹","🇪🇸","🇵🇱","🇳🇱","🇸🇪","🇳🇴","🇩🇰","🇫🇮",
        "🇨🇦","🇧🇷","🇦🇷","🇲🇽","🇯🇵","🇨🇳","🇰🇷","🇦🇺","🇳🇿","🇮🇳","🇹🇷","🇷🇺","🇺🇦","🇮🇱","🇪🇬","🇿🇦","🇸🇦","🇦🇪","🇶🇦","🇸🇬"
      ] },
      { name: "Symbols", icon: "❤️",
        emojis: [
          "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟",
          "☮️","✝️","☪️","🕉️","☸️","✡️","🔯","🕎","☯️","☦️","🛐","⛎","♈","♉","♊","♋","♌","♍","♎","♏",
          "♐","♑","♒","♓","🆔","⚛️","🉑","☢️","☣️","📴","📳","🈶","🈚","🈸","🈺","🈷️","✴️","🆚","💮","🉐",
          "©️","®️","™️","ℹ️","🔞","🚭","☑️","✅","✔️","❌","❎","➕","➖","➗","➰","➿","🔟","#️⃣","*️⃣","0️⃣",
          "1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔢","🔣","🔤","🔡","🔠","🔽","🔼","🔺","🔻","🔸","🔹",
          // Weitere Symbole
          "⬆️","⬇️","⬅️","➡️","↗️","↘️","↙️","↖️","↩️","↪️","⤴️","⤵️","🔀","🔁","🔂","🔄","🔃","🔚","🔙","🔛",
          "🔜","🔝","🛑","⏏️","⏩","⏪","⏫","⏬","⏭️","⏮️","⏸️","⏹️","⏺️","⏯️","⏭️","⏮️","⏸️","⏹️","⏺️","⏯️",
          "▪️","▫️","◾","◽","◼️","◻️","⬛","⬜","🔳","🔲","◉","◯","◐","◑","◒","◓","◔","◕","⚫","⚪",
          "🔘","🔴","🔵","🔺","🔻","🔸","🔹","🔶","🔷","🔳","🔲","🔈","🔉","🔊","🔇","🔕","🔔","🔕","🔔","🔕"
        ]
      }
    ];
    var activeCategory = 0;

    function renderEmojiPicker() {
      emojiOverlay.empty();
      var cat = emojiCategories[activeCategory];
      // emojiOverlay darf nicht scrollen
      emojiOverlay.setStyle('overflowY', 'visible');
      emojiOverlay.setStyle('maxHeight', 'none');
      // Wrapper für feste Kopfzeile (Kategorien + ggf. Farbauswahl)
      var header = new Element("div");
      header.setStyles({ position: "relative", zIndex: 2, background: "#fff", padding: "0 0 4px 0", borderBottom: "1.5px solid #3a3f4b" });
      // Kategorienleiste
      var catBar = new Element("div");
      catBar.setStyles({ display: "flex", gap: "8px", margin: "8px 0 0 0", paddingBottom: "6px" });
      emojiCategories.forEach(function(catItem, idx) {
        var btn = new Element("button");
        btn.set("type", "button");
        btn.set("text", catItem.icon);
        btn.set("title", catItem.name);
        // Dynamische Größe: 1em
        btn.setStyles({ background: idx===activeCategory?"#ececff":"none", border: "none", fontSize: "1em", cursor: "pointer", borderRadius: "4px", padding: "2px 6px", color: idx===activeCategory?"#232634":"#888" });
        btn.addEvent("click", function(e) {
          if(e && e.preventDefault) e.preventDefault();
          activeCategory = idx;
          renderEmojiPicker();
        });
        catBar.appendChild(btn);
      });
      header.appendChild(catBar);
      // Farbauswahl für Smileys & People
      var skinBar = null;
      if(cat.name === "Smileys & People") {
        var skinTones = [
          { label: "Default", color: "#FFD93B", code: "" },
          { label: "Light", color: "#FADCBC", code: "\uD83C\uDFFB" },
          { label: "Medium-Light", color: "#E0BB95", code: "\uD83C\uDFFC" },
          { label: "Medium", color: "#C68642", code: "\uD83C\uDFFD" },
          { label: "Dark", color: "#8D5524", code: "\uD83C\uDFFE" },
          { label: "Very Dark", color: "#5A3A1B", code: "\uD83C\uDFFF" }
        ];
        skinBar = new Element("div");
        skinBar.setStyles({ display: "flex", gap: "6px", margin: "8px 0 0 0", alignItems: "center" });
        skinTones.forEach(function(tone, idx) {
          var btn = new Element("button");
          btn.set("type", "button");
          btn.set("title", tone.label);
          btn.setStyles({ width: "22px", height: "22px", background: tone.color, border: idx===window.activeSkinTone?"2px solid #7a6ff0":"1px solid #888", borderRadius: "50%", cursor: "pointer", outline: "none", padding: 0 });
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
      // Scrollbarer Bereich für Emojis
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
      // Hand-Emojis, die Hauttöne unterstützen
      var handEmojis = [
        "👍","👎","👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","🫵","🫱","🫲","🫳","🫴","👏","🙌","👐","🤲","🙏","✍️","💅","🤳","💪","🦾","🦵","🦶","👂","🦻","👃"
      ];
      var skinToneCode = (typeof window.activeSkinTone !== 'undefined' && cat.name === "Smileys & People") ? window.activeSkinTone : 0;
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
          if(cat.name === "Smileys & People" && skinToneCode && handEmojis.indexOf(emoji) !== -1) {
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
    // Schließe Picker bei Klick außerhalb
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
          this.client.send("@+typing=" + state + " TAGMSG " + target);
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
      new Event(e).stop();
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

        new Event(e).stop();
        e.preventDefault();
        return;
      } else {
        return;
      }
      
      this.resetTabComplete();
      if((cvalue != "") && (this.lastcvalue != cvalue))
        this.commandhistory.addLine(cvalue, true);
      
      var result = resultfn.bind(this.commandhistory)();
      
      new Event(e).stop();
      e.preventDefault();

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

qwebirc.ui.QUI.JSUI = new Class({
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

qwebirc.ui.QUI.Window = new Class({
  Extends: qwebirc.ui.Window,
  
  initialize: function(parentObject, client, type, name, identifier) {
    this.parent(parentObject, client, type, name, identifier);

  // Typing bar for channel and query windows
    if(type == qwebirc.ui.WINDOW_CHANNEL || type == qwebirc.ui.WINDOW_QUERY) {
      this._typingBar = null;
      this._typingUsers = {};
      this._typingTimeouts = {};
      this._typingBarHideTimeout = null;

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

      // Zeigt die Typing-Bar für alle aktiven Tipper
      this._updateTypingBar = function() {
        if (!this._typingBar) {
          var inputForm = $$('.input form')[0];
          if (inputForm) {
            var typingBar = new Element("div", {
              'class': 'qwebirc-typing-bar',
            });
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
      };

      // Hauptfunktion: Event-Verarbeitung
      this.showTypingBar = function(event) {
        if (!event.tags || !event.tags.typing) return;
        var typingState = event.tags.typing;
        var nick = event.user.split('!')[0];

        // Zeitsteuerung: nach 5s Inaktivität ausblenden
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
      };
    }

    this.tab = new Element("a");
    this.tab.addClass("tab");
    this.tab.addEvent("focus", function() { this.blur() }.bind(this.tab));;

    this.spaceNode = document.createTextNode(" ");
    parentObject.tabs.appendChild(this.tab);
    parentObject.tabs.appendChild(this.spaceNode);

    if(type != qwebirc.ui.WINDOW_STATUS && type != qwebirc.ui.WINDOW_CONNECT) {
      var tabclose = new Element("span");
      this.tabclose = tabclose;
      tabclose.set("text", "X");
      tabclose.addClass("tabclose");
      var close = function(e) {
        new Event(e).stop();

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
      new Event(e).stop();
      
      if(this.closed)
        return;
        
      parentObject.selectWindow(this);
    }.bind(this));
    

    this.lines = new Element("div");
    this.parentObject.qjsui.applyClasses("middle", this.lines);
    this.lines.addClass("lines");

    if(type == qwebirc.ui.WINDOW_STATUS)
      this.lines.addClass("spinner");

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

    if(!this.client.nickOnChanHasPrefix(this.client.nickname, this.name, "@")) {
/*      var cmodes = this.client.getChannelModes(channel);
      if(cmodes.indexOf("t")) {*/
        alert("Sorry, you need to be a channel operator to change the topic!");
        return;
      /*}*/
    }
    var newTopic = prompt("Change topic of " + this.name + " to:", this.topic.topicText);
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
    qwebirc.ui.MENU_ITEMS.forEach(function(x) {
      if(!x.predicate || x.predicate !== true && !x.predicate.apply(this, nickArray))
        return;
      
      var e2 = new Element("a");
      e.appendChild(e2);

      e2.set("text", "- " + x.text);

      e2.addEvent("focus", function() { this.blur() }.bind(e2));
      e2.addEvent("click", function(ev) { new Event(ev.stop()); this.menuClick(x.fn); }.bind(this));
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
    // Nur das höchste Prefix anzeigen
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
      // Platz freihalten, damit alles bündig bleibt
      var emptySpan = new Element("span");
      emptySpan.setStyle("display", "inline-block");
      emptySpan.setStyle("width", "16px");
      e.appendChild(emptySpan);
    }
    var span = new Element("span");
    if(this.parentObject.uiOptions.NICK_COLOURS) {
      var colour = realNick.toHSBColour(this.client);
      if($defined(colour))
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
      new Event(x).stop();
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
        t.appendChild(document.createTextNode("(no topic set)"));
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
