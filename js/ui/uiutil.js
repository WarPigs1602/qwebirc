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
      "😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚",
      "😋","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😪",
      "🤤","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶","🤯","🤠","🥳","😎","🤓","🧐","😕",
      "👍","👎","👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","🫵","🫱","🫲","🫳","🫴","👏","🙌","👐","🤲","🙏","✍️","💅","🤳","💪","🦵","🦶","👂","🦻","👃"
    ]},
    { nameKey: "EMOJI_CAT_ANIMALS", name: "Animals & Nature", icon: "🐻", emojis: [
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🦄","🐔","🐧","🐦","🐤",
      "🐣","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦓","🦍","🐢","🐍","🦎","🦂","🦀","🦞","🦐","🦑","🐙"
    ]},
    { nameKey: "EMOJI_CAT_FOOD", name: "Food & Drink", icon: "🍎", emojis: [
      "🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥝","🍅","🍆","🥑",
      "🥦","🥬","🥒","🌶️","🌽","🥕","🧄","🧅","🥔","🍠","🥐","🥯","🍞","🥖","🥨","🧀","🥚","🍳","🥞"
    ]},
    { nameKey: "EMOJI_CAT_TRAVEL", name: "Travel & Places", icon: "✈️", emojis: [
      "🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🚚","🚛","🚜","🛵","🏍️","🚲","🛴","🚨","🚔","🚍",
      "🚘","🚖","🚡","🚠","🚟","🚃","🚋","🚞","🚝","🚄","🚅","🚈","🚂","🚆","🚇","🚊","🚉","✈️","🛫","🛬"
    ]},
    { nameKey: "EMOJI_CAT_OBJECTS", name: "Objects", icon: "💡", emojis: [
      "⌚","📱","📲","💻","⌨️","🖥️","🖨️","🖱️","🖲️","🕹️","🗜️","💽","💾","💿","📀","📼","📷","📸","📹","🎥"
    ]},
    { nameKey: "EMOJI_CAT_FLAGS", name: "Flags", icon: "🏳️", emojis: ["🏳️","🏴","🏁","🚩","🏳️‍🌈","🏳️‍⚧️","🇦🇹","🇩🇪"] },
    { nameKey: "EMOJI_CAT_SYMBOLS", name: "Symbols", icon: "❤️", emojis: ["❤️","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️"] }
  ];

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
