/* qwebirc UI shared utilities: event handling, reflow batching, emoji data, typing bar manager */
(function(){
  window.qwebirc = window.qwebirc || {}; window.qwebirc.ui = window.qwebirc.ui || {};
  if(qwebirc.ui.util) return; // idempotent

  function stopEvent(e){
    try { if(!e) return; if(e.stop) e.stop(); else { if(e.preventDefault) e.preventDefault(); if(e.stopPropagation) e.stopPropagation(); } } catch(_) {}
  }

  // Reflow batch scheduler (mirrors legacy staged timeouts)
  function scheduleReflowBatches(ctx, reflowFn){
    try {
      var fn = function(full){ try { reflowFn.call(ctx, full); } catch(_) {} };
      var timers = [];
      var i; for(i=50;i<1000;i+=50) timers.push(setTimeout(fn.bind(null,true), i));
      for(i=1000;i<2000;i+=100) timers.push(setTimeout(fn, i));
      for(i=2000;i<15000;i+=500) timers.push(setTimeout(fn, i));
      return timers;
    } catch(e) { return []; }
  }

  // Central emoji categories (subset equal for QUI & CLASSIC)
  var emojiCategories = [
    { nameKey: "EMOJI_CAT_SMILEYS", name: "Smileys & People", icon: "😃", emojis: [
      // Gesichter (bereinigt)
      "😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚",
      "😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😪",
      "🤤","😴","😷","🤒","🤕","🤢","🤮","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","😟","🙁","☹️","😮","😯","😲","😳","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","😡","😠","🤬","😤","😈","👿","💀","☠️","🤡","👻","👽","🤖",
      // Gesten & Körperteile
      "👍","👎","👊","✊","🤛","🤜","🤝","👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","🫵","🫱","🫲","🫳","🫴","👏","🙌","👐","🤲","🙏","✍️","💅","🤳","💪","🦵","🦶","👂","🦻","👃","👣","👀","👁️","👅","👄","🧠","🫀","🫁","🦷","🦴"
    ]},
    { nameKey: "EMOJI_CAT_ANIMALS", name: "Animals & Nature", icon: "🐻", emojis: [
      // Tiere & Natur (bereinigt)
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🦄","🐔","🐧","🐦","🐤",
      "🐣","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦓","🦍","🦧","🐘","🦣","🦛","🦏","🐪","🐫","🦒","🦬","🐂","🐃","🐄","🐐","🐏","🐑","🐖","🐎","🐕","🐩","🐈","🐓","🦃","🕊️","🐇","🐁","🐀","🐿️","🦔","🐢","🐍","🦎","🦂","🦀","🦞","🦐","🦑","🐙","🦈","🐟","🐠","🐡","🐬","🐳","🐋","🐊","🐅","🐆","🦜","🦚","🦩","🦥","🦦","🦨","🦘","🦡","🦋","🐌","🐞","🐜","🪲","🐝","🪱","🦗","🕷️","🕸️","🦂","🪰","🪳","🪴","🌵","🌲","🌳","🌴","🌱","🌿","☘️","🍀","🎋","🍃","🍂","🍁","🍄"
    ]},
    { nameKey: "EMOJI_CAT_FOOD", name: "Food & Drink", icon: "🍎", emojis: [
      "🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥝","🍅","🍆","🥑",
      "🥦","🥬","🥒","🌶️","🌽","🥕","🧄","🧅","🥔","🍠","🥐","🥯","🍞","🥖","🥨","🧀","🥚","🍳","🥞",
      "🧇","🥓","🥩","🍗","🍖","🌭","🍔","🍟","🍕","🥪","🥙","🧆","🌮","🌯","🫔","🥗","🥘","🫕","🍲","🍝","🍜","🍛","🍣","🍱","🥟","🍤","🍚","🍙","🍘","🍥","🥠","🥮","🍢","🍡","🍧","🍨","🍦","🥧","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🧂","🧊","🥤","🧋","☕","🍵","🧃","🧉","🍺","🍻","🥂","🍷","🥃","🍸","🍹"
    ]},
    { nameKey: "EMOJI_CAT_TRAVEL", name: "Travel & Places", icon: "✈️", emojis: [
      // Reisen & Orte (bereinigt)
      "🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🚚","🚛","🚜","🛻","🚘","🚖","🚍","🚔","🚨","🚡","🚠","🚟",
      "🚃","🚋","🚞","🚝","🚄","🚅","🚈","🚂","🚆","🚇","🚊","🚉","✈️","🛫","🛬","🛩️","💺","🚀","🛸","🚁","⛵","🚤","🛥️","🛳️","🚢",
      "⛽","🚧","🚦","🚥","🗺️","🗿","🗽","🗼","🏰","🏯","🏟️","🎡","🎢","🎠","⛲","⛱️","🏖️","🏝️","🏜️","🌋","⛰️","🏔️","🗻","🏕️","🏙️","🌆","🌇","🌃","🌉","🌌","🌁","🌊"
    ]},
    { nameKey: "EMOJI_CAT_ACTIVITIES", name: "Activities", icon: "⚽", emojis: [
      // Sport & Aktivitäten
      "⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓","🏸","🏒","🏑","🥍","🏏","🛹","🛼","🛷","🥌","⛸️","🛶","🚣","🏊","🤽","🏄","🚵","🚴","🤹","🤸","⛹️","🤾","🏋️","🤼","🤺","🥊","🥋","🎽","🛼","🎣","🎿","⛷️","🏂","🪂","🏆","🥇","🥈","🥉","🎖️","🏅","🎗️","🎫","🎟️","🎪","🤹","🎭","🎨","🎬","🎤","🎧","🎼","🎹","🥁","🎷","🎺","🪗","🎸","🪕","🎻","🎮","🕹️","🎲","♟️","🧩","🀄","🧸"
    ]},
    { nameKey: "EMOJI_CAT_OBJECTS", name: "Objects", icon: "💡", emojis: [
      "⌚","📱","📲","💻","⌨️","🖥️","🖨️","🖱️","🖲️","🕹️","🗜️","💽","💾","💿","📀","📼","📷","📸","📹","🎥",
      "📺","📻","🧭","⏱️","⏲️","⏰","🕰️","⌛","⏳","📡","🔋","🔌","💡","🔦","🕯️","📔","📕","📗","📘","📙","📚","📖","🧷","🧵","🪡","🧶","🪢","🔒","🔓","🔏","🔐","🔑","🗝️","🛡️","🔨","🪓","⛏️","⚒️","🛠️","🗡️","⚔️","🔫","🪃","🏹","🛞","⚙️","🪛","🔧","🧰","🪜","🧲","⚖️","🔗","⛓️","📎","🖇️","✂️","🗃️","🗂️","🗳️","📤","📥","📦","🛒","💰","💴","💶","💷","💵","💳","🧾","✉️","📧","📨","📩","📤","📝","✏️","✒️","🖋️","🖊️","🖌️","🖍️","🔍","🔎","🔬","🔭","📡","🎞️","💊","💉","🩹","🩺"
    ]},
    { nameKey: "EMOJI_CAT_FLAGS", name: "Flags", icon: "🏳️", emojis: [
      // Grund-/Sonderflaggen
      "🏳️","🏴","🏁","🚩","🏳️‍🌈","🏳️‍⚧️",
      // Europa (erweitert)
      "🇦🇹","🇩🇪","🇨🇭","🇪🇺","🇫🇷","🇪🇸","🇮🇹","🇬🇧","🇮🇪","🇵🇹","🇳🇱","🇧🇪","🇱🇺","🇩🇰","🇳🇴","🇸🇪","🇫🇮","🇮🇸","🇵🇱","🇨🇿","🇸🇰","🇭🇺","🇷🇴","🇧🇬","🇬🇷","🇹🇷","🇺🇦","🇷🇺","🇷🇸","🇸🇮","🇭🇷",
      // Amerika
      "🇺🇸","🇨🇦","🇲🇽","🇧🇷","🇦🇷","🇨🇱","🇨🇴","🇵🇪","🇻🇪","🇺🇾","🇵🇦","🇨🇺",
      // Afrika
      "🇿🇦","🇪🇬","🇳🇬","🇰🇪","🇪🇹","🇲🇦","🇹🇳","🇬🇭",
      // Asien
      "🇯🇵","🇰🇷","🇨🇳","🇮🇳","🇵🇰","🇧🇩","🇱🇰","🇮🇩","🇲🇾","🇸🇬","🇵🇭","🇹🇭","🇻🇳",
      // Nahost
      "🇮🇱","🇦🇪","🇶🇦","🇸🇦","🇮🇶","🇮🇷",
      // Ozeanien
      "🇦🇺","🇳🇿","🇫🇯",
      // Weitere populäre
      "🇳🇵","🇲🇦","🇲🇳","🇵🇹","🇲🇦","🇲🇪" 
    ]},
    { nameKey: "EMOJI_CAT_SYMBOLS", name: "Symbols", icon: "❤️", emojis: [
      // Herzen & Emotion
      "❤️","🩷","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟",
      // Sterne / Glanz
      "⭐","🌟","✨","⚡","🔥","💥",
      // Kommunikation / Gedanken
      "💬","🗨️","🗯️","💭",
      // Check / Fehler / Status
      "❌","⭕","✅","✔️","☑️","❗","❕","❓","❔","‼️","⁉️","⚠️","🚫","⛔","🔞",
      // Pfeile & Navigation
      "⬆️","⬇️","⬅️","➡️","↗️","↘️","↙️","↖️","↔️","↕️","🔄","🔁","🔃","🔀","🔂","↩️","↪️","⤴️","⤵️",
      // Medien-Steuerung
      "▶️","⏸️","⏯️","⏹️","⏺️","⏭️","⏮️","⏩","⏪","⏫","⏬","🔼","🔽",
      // Formen / Geometrie
      "🔴","🟠","🟡","🟢","🔵","🟣","⚪","⚫","🔺","🔻","⬛","⬜","◼️","◻️","◾","◽","▪️","▫️","🔸","🔹","🔶","🔷",
      // Astronomie / Wetter
      "☀️","🌤️","⛅","🌥️","☁️","🌦️","🌧️","⛈️","🌩️","🌨️","❄️","☃️","⛄","🌪️","🌈","☔","🌙","⭐",
      // Tierkreis
      "♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓",
      // Religiöse & spirituelle Symbole
      "✝️","☪️","☸️","✡️","🕉️","☯️","🕎","🔯",
      // Diverses / Schutz / Recycling
      "🆗","🆕","🆙","🆒","🆓","🆖","🆚","🆘","™️","©️","®️","♻️","🔰","⚕️","⚜️","🔱","⚛️","⚧️","♾️",
      // Mathematik / Operatoren
      "➕","➖","➗","✖️","➰","➿","〽️","✳️","✴️","‼️","⁉️",
      // Währung / Finanzen
      "💱","💲","💹",
      // Musik / Spiel (Ergänzung zu Activities)
      "♟️","🎵","🎶"
    ]}
  ];

  // --- Emoji Normalisierung: füge Variation Selector-16 (\uFE0F) für ambivalente Zeichen an ---
  try {
    var VS16 = '\uFE0F';
    // Zeichen, die in einigen Fonts sonst als Text/Monochrom oder gar '?' erscheinen können
    var ambiguous = {
      '\u2708': true, // ✈
      '\u270C': true, // ✌
      '\u270D': true, // ✍
      '\u2615': true, // ☕
      '\u2620': true, // ☠
      '\u26A1': true, // ⚡
      '\u2699': true, // ⚙
      '\u2709': true, // ✉
      '\u2714': true, // ✔
      '\u270B': true, // ✋ (Hand)
      '\u260E': true, // ☎ (falls später ergänzt)
      '\u231A': true  // ⌚ (Watch – wird meist schon farbig, aber zur Sicherheit)
    };
    var needsVS16 = function(ch){
      return ambiguous[ch] === true;
    };
    emojiCategories.forEach(function(cat){
      if(!cat || !Array.isArray(cat.emojis)) return;
      cat.emojis = cat.emojis.map(function(e){
        try {
          // Multi-Codepoint Sequenzen (inkl. ZWJ / bereits VS16) unverändert lassen
          if(e.indexOf(VS16) !== -1) return e; // hat bereits VS16
          if(e.length === 1) { // einzelnes BMP Zeichen
            if(needsVS16(e)) return e + VS16;
            return e;
          }
          // Hand-/Gesten mit evtl. Skintone kommen später dynamisch, hier nichts anfassen
          // Falls erste Code Unit ein ambivalentes Zeichen ist und keine weiteren Modifikatoren vorhanden
          var first = e.charAt(0);
          if(needsVS16(first) && e.charAt(1) !== VS16) {
            return first + VS16 + e.slice(1);
          }
          return e;
        } catch(_) { return e; }
      });
    });
  } catch(_) {}

  // Optionaler Fallback: Liste problematischer (sehr neuer) Emojis, die ggf. entfernt werden können, falls Font fehlt.
  // (Der Nutzer kann qwebirc.ui.util.disableExtendedEmojis = true setzen, um sehr neue Zeichen zu filtern)
  try {
    var extendedThreshold = 0x1FA70; // ungefähr Bereich für neuere Symbole (Chess etc.) – heuristisch
    if(window.qwebirc && window.qwebirc.ui && window.qwebirc.ui.util) {
      // Platzhalter, tatsächliche Umschaltung erfolgt beim ersten Zugriff, falls gesetzt
    }
    var filterExtendedIfWanted = function(){
      if(!window.qwebirc || !window.qwebirc.ui || !window.qwebirc.ui.util) return;
      if(!window.qwebirc.ui.util.disableExtendedEmojis) return; // nichts zu tun
      emojiCategories.forEach(function(cat){
        if(!cat || !Array.isArray(cat.emojis)) return;
        cat.emojis = cat.emojis.filter(function(e){
          try {
            // Nimm ersten Codepoint
            var cp = e.codePointAt(0);
            return cp < extendedThreshold; // filtere sehr neue raus
          } catch(_) { return true; }
        });
      });
    };
    // Exponiere Helper
    window.qwebirc = window.qwebirc || {}; window.qwebirc.ui = window.qwebirc.ui || {}; window.qwebirc.ui.util = window.qwebirc.ui.util || {};
    window.qwebirc.ui.util.normalizeEmojis = filterExtendedIfWanted;
    // Sofort anwenden, falls Flag schon gesetzt wurde (z.B. vom Embed vor Laden)
    filterExtendedIfWanted();
  } catch(_) {}

  // TypingBar manager (shared logic). Expects window-like object with: parentObject.inputbox container (.input form) present later.
  function TypingBarManager(win){
    this.win = win; this.users = {}; this.timeouts = {}; this.hideDelay = 5000; this.bar = null;
  }
  TypingBarManager.prototype._ensureBar = function(){
    if(this.bar && this.bar.parentNode) return true;
    try {
      var inputForm = document.querySelector('.input form');
      if(!inputForm) return false;
      this.bar = new Element('div', {'class':'qwebirc-typing-bar'});
      this.bar.inject(inputForm,'before');
      return true;
    } catch(e){ return false; }
  };
  TypingBarManager.prototype._render = function(){
    try {
      if(!this._ensureBar()) return;
      var active = Object.keys(this.users).filter(function(n){ return this.users[n]==='active'; }.bind(this));
      if(active.length===0){ this.bar.set('text',''); this.bar.removeClass('active'); this.bar.removeClass('paused'); return; }
      var html = active.join(', ') + ' <span class="typing-dots"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></span>';
      this.bar.set('html', html); this.bar.addClass('active'); this.bar.removeClass('paused');
    } catch(_) {}
  };
  TypingBarManager.prototype.handleTag = function(event){
    try {
      if(!event || !event.tags || !event.tags.typing) return;
      var state = event.tags.typing; var nick = event.user && event.user.split('!')[0]; if(!nick) return;
      if(this.timeouts[nick]) { clearTimeout(this.timeouts[nick]); delete this.timeouts[nick]; }
      if(state==='active' || state==='paused') {
        this.users[nick] = state;
        this.timeouts[nick] = setTimeout(function(){ delete this.users[nick]; this._render(); }.bind(this), this.hideDelay);
      } else if(state==='done') {
        delete this.users[nick];
      }
      this._render();
    } catch(e) {}
  };

  qwebirc.ui.util = {
    stopEvent: stopEvent,
    scheduleReflowBatches: scheduleReflowBatches,
    emojiCategories: emojiCategories,
    TypingBarManager: TypingBarManager,
    connectStatus: (function(){
      var api = {
        _bar: null,
        _active: false,
        show: function(){
          try {
            if(this._active) return;
            var form = document.querySelector('.input form');
            if(!form) return;
            var bar = document.querySelector('.qwebirc-typing-bar[data-connect]');
            if(!bar){
              bar = document.createElement('div');
              bar.className = 'qwebirc-typing-bar active';
              bar.setAttribute('data-connect','1');
              form.parentNode.insertBefore(bar, form);
            }
            this._bar = bar; this._active = true;
            var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
            var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang] && window.qwebirc.i18n[lang].options;
            var lbl = (i18n && i18n.TRYING_TO_CONNECT) ? i18n.TRYING_TO_CONNECT : 'Trying to connect server';
            bar.innerHTML = lbl + ' <span class="typing-dots"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></span>';
          } catch(_) {}
        },
        hide: function(){
          try { this._active = false; if(this._bar && this._bar.parentNode) this._bar.parentNode.removeChild(this._bar); this._bar = null; } catch(_) {}
        }
      };
      // Sprache live aktualisieren
      try { window.addEventListener('qwebirc:languageChanged', function(){ if(api._active) api.show(); }); } catch(_) {}
      return api;
    })()
  };
})();
