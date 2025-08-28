qwebirc.ui.HILIGHT_NONE = 0;
qwebirc.ui.HILIGHT_ACTIVITY = 1;
qwebirc.ui.HILIGHT_SPEECH = 2;
qwebirc.ui.HILIGHT_US = 3;

qwebirc.ui.MAXIMUM_LINES_PER_WINDOW = 1000;

qwebirc.ui.WINDOW_LASTLINE = qwebirc.ui.WINDOW_QUERY | qwebirc.ui.WINDOW_MESSAGES | qwebirc.ui.WINDOW_CHANNEL | qwebirc.ui.WINDOW_STATUS;

qwebirc.ui.Window = new Class({
  Implements: [Events],
  initialize: function(parentObject, client, type, name, identifier) {
    this.parentObject = parentObject;
    this.type = type;
    this.name = name;
    this.active = false;
    this.client = client;
    this.identifier = identifier;
    this.hilighted = qwebirc.ui.HILIGHT_NONE;
    this.scrolltimer = null;
    this.commandhistory = this.parentObject.commandhistory;
    this.scrolleddown = true;
    this.scrollpos = null;
    this.lastNickHash = new QHash();
    this.lastSelected = null;
    this.subWindow = null;
    this.closed = false;
  // Stored metadata for event lines for live re-translation
    this.__storedEventLines = [];
  // Set of message types that can be re-rendered via i18n
    this.__translatableTypes = {
      JOIN:1, OURJOIN:1, PART:1, QUIT:1, KICK:1, MODE:1, NICK:1, TOPIC:1, UMODE:1, INVITE:1,
      WHOISUSER:1, WHOISREALNAME:1, WHOISCHANNELS:1, WHOISSERVER:1, WHOISACCOUNT:1, WHOISIDLE:1, WHOISAWAY:1,
      WHOISOPER:1, WHOISOPERNAME:1, WHOISACTUALLY:1, WHOISGENERICTEXT:1, WHOISEND:1, AWAY:1,
      GENERICERROR:1, GENERICMESSAGE:1, WALLOPS:1, CHANNELCREATIONTIME:1, CHANNELMODEIS:1,
      IGNORED:1, UNIGNORED:1, IGNOREHEADER:1, IGNOREENTRY:1, IGNOREEMPTY:1, SILENCE:1, MODEMSG:1,
      SIGNON:1, CONNECTING:1, CONNECT:1, CONNECTED:1, DISCONNECT:1, ERROR:1, SERVERNOTICE:1,
  CAP_ACTIVE:1, CAP_AVAILABLE:1,
  // Notification title/body (not stored as lines, but kept for future use completeness)
  NOTIFYCHANMSGTITLE:1, NOTIFYCHANMSGBODY:1,
  NOTIFYCHANACTIONTITLE:1, NOTIFYCHANACTIONBODY:1,
  NOTIFYPRIVMSGTITLE:1, NOTIFYPRIVMSGBODY:1,
  NOTIFYPRIVACTIONTITLE:1, NOTIFYPRIVACTIONBODY:1,
  NOTIFYCHANNOTICETITLE:1, NOTIFYCHANNOTICEBODY:1,
  NOTIFYPRIVNOTICETITLE:1, NOTIFYPRIVNOTICEBODY:1
    };
  // Language change listener (bind only once)
    this.__onLanguageChangedBound = this.__onLanguageChanged.bind(this);
    try { window.addEventListener('qwebirc:languageChanged', this.__onLanguageChangedBound); } catch(e) {}
    
    if(this.type & qwebirc.ui.WINDOW_LASTLINE) {
      this.lastPositionLine = new Element("hr");
      this.lastPositionLine.addClass("lastpos");
      this.lastPositionLineInserted = false;
    }
  },
  __onLanguageChanged: function(ev) {
    // Alle gespeicherten Linien neu rendern
    // Performance: Nur aktive Fenster ODER alle? -> alle, damit beim Umschalten alles konsistent ist
    for(var i=0;i<this.__storedEventLines.length;i++) {
      var meta = this.__storedEventLines[i];
      if(!meta || !meta.element || !meta.element.parentNode) continue; // evtl. abgeschnitten
      this.__rerenderStoredLine(meta);
    }
  },
  __purgeOrphanedStoredLines: function() {
  // Remove entries whose DOM element no longer exists
    if(!this.__storedEventLines.length) return;
    var filtered = [];
    for(var i=0;i<this.__storedEventLines.length;i++) {
      var m = this.__storedEventLines[i];
      if(m && m.element && m.element.parentNode) filtered.push(m);
    }
    this.__storedEventLines = filtered;
  },
  __rerenderStoredLine: function(meta) {
    try {
  // Keep timestamp span (first child), remove the rest
      var el = meta.element;
      if(!el) return;
      var children = Array.prototype.slice.call(el.childNodes);
      for(var i=1;i<children.length;i++) el.removeChild(children[i]);
  // New string based on current language
      var dataClone = {}; for(var k in meta.data) if(meta.data.hasOwnProperty(k)) dataClone[k] = meta.data[k];
      if(dataClone.__i18nKey) {
        dataClone.m = this.__computeDynamicI18nMessage(dataClone);
      }
      var newMsg = this.parentObject.theme.message(meta.type, dataClone, false);
      qwebirc.ui.Colourise(newMsg, el, this.client.exec, this.parentObject.urlDispatcher.bind(this.parentObject), this);
    } catch(e) { /* ignore */ }
  },
  updateTopic: function(topic, element)  {
    qwebirc.ui.Colourise(topic, element, this.client.exec, this.parentObject.urlDispatcher.bind(this.parentObject), this);
  },
  close: function() {
    this.closed = true;
    try { if(this.__onLanguageChangedBound) window.removeEventListener('qwebirc:languageChanged', this.__onLanguageChangedBound); } catch(e) {}
    
    if($defined(this.scrolltimer)) {
      $clear(this.scrolltimer);
      this.scrolltimer = null;
    }

    this.parentObject.__closed(this);
    this.fireEvent("close", this);
  },
  subEvent: function(event) {
    if($defined(this.subWindow))
      this.subWindow.fireEvent(event);
  },
  setSubWindow: function(window) {
    this.subWindow = window;
  // For i18n: reference under a unified name
  this.pane = window;
  },
  select: function() {
    if(this.lastPositionLineInserted && !this.parentObject.uiOptions.LASTPOS_LINE) {
      this.lines.removeChild(this.lastPositionLine);
      this.lastPositionLineInserted = false;
    }
  
    this.active = true;
    this.parentObject.__setActiveWindow(this);
    if(this.hilighted)
      this.setHilighted(qwebirc.ui.HILIGHT_NONE);

    this.subEvent("select");      
    this.resetScrollPos();
    this.lastSelected = new Date();
  },
  deselect: function() {
    this.subEvent("deselect");
    
    this.setScrollPos();
    if($defined(this.scrolltimer)) {
      $clear(this.scrolltimer);
      this.scrolltimer = null;
    }

    if(this.type & qwebirc.ui.WINDOW_LASTLINE)
      this.replaceLastPositionLine();
    
    this.active = false;
  },
  resetScrollPos: function() {
    if(this.scrolleddown) {
      this.scrollToBottom();
    } else if($defined(this.scrollpos)) {
      this.getScrollParent().scrollTo(this.scrollpos.x, this.scrollpos.y);
    }
  },
  setScrollPos: function() {
    if(!this.parentObject.singleWindow) {
      this.scrolleddown = this.scrolledDown();
      this.scrollpos = this.lines.getScroll();
    }
  },
  addLine: function(type, line, colour, element) {
    var hilight = qwebirc.ui.HILIGHT_NONE;
    var lhilight = false;
  var originalDataObj = null; // For later re-translation

    if(type) {
      hilight = qwebirc.ui.HILIGHT_ACTIVITY;

      if(type.match(/(NOTICE|ACTION|MSG)$/)) {
        var message = $defined(line) ? line["m"] : null;

        /* https://dl.dropboxusercontent.com/u/180911/notify.png */
        if(type.match(/^OUR/)) {
          if(type.match(/NOTICE$/)) {
            /* default */
          } else {
            hilight = qwebirc.ui.HILIGHT_SPEECH;
          }
        } else if(this.client.hilightController.match(message)) {
          hilight = qwebirc.ui.HILIGHT_US;
          lhilight = true;
        } else if(type.match(/NOTICE$/)) {
          /* default */
        } else if(this.type == qwebirc.ui.WINDOW_QUERY || this.type == qwebirc.ui.WINDOW_MESSAGES) {
          hilight = qwebirc.ui.HILIGHT_US;
        } else {
          hilight = qwebirc.ui.HILIGHT_SPEECH;
        }

        if(hilight == qwebirc.ui.HILIGHT_US) {
          var title = this.parentObject.theme.message("NOTIFY" + type + "TITLE", line, false);
          var body = this.parentObject.theme.message("NOTIFY" + type + "BODY", line, false);
          var selectMe = function() { this.parentObject.selectWindow(this); }.bind(this);

          this.parentObject.notify(title, body, selectMe);
        }
      }
    }

    if(!this.active && (hilight != qwebirc.ui.HILIGHT_NONE))
      this.setHilighted(hilight);

    if(type) {
  // If only a plain string was provided (status messages etc.) wrap it into an object
      if(typeof line === 'string') {
        line = {m: line};
      }
      if(line && typeof line === 'object') {
  // Keep shallow copy (preserve original variables for later translation)
        try { originalDataObj = {}; for(var k in line) { if(line.hasOwnProperty(k)) originalDataObj[k] = line[k]; } } catch(e) { originalDataObj = null; }
  // If structured i18n data exists -> compute initial translation now
        if(line.__i18nKey) {
          line = Object.assign({}, line); // Mutation vermeiden
          line.m = this.__computeDynamicI18nMessage(line);
        }
      }
      line = this.parentObject.theme.message(type, line, lhilight);
    }
    
    var tsE = document.createElement("span");
    tsE.className = "timestamp";
    tsE.appendChild(document.createTextNode(qwebirc.irc.IRCTimestamp(new Date()) + " "));
    element.appendChild(tsE);
    
    qwebirc.ui.Colourise(line, element, this.client.exec, this.parentObject.urlDispatcher.bind(this.parentObject), this);
  // After colourise optionally register event line (even if cloning into originalDataObj failed)
    if(type && this.__translatableTypes[type]) {
      if(!originalDataObj) originalDataObj = {}; // Sicherstellen, dass wir etwas Speichernsames haben
      this.__storedEventLines.push({type:type, data:originalDataObj, element:element});
  // Bound storage parallel to MAXIMUM_LINES_PER_WINDOW -> coarse cleanup here
      if(this.__storedEventLines.length > qwebirc.ui.MAXIMUM_LINES_PER_WINDOW + 50) this.__purgeOrphanedStoredLines();
    }
    this.scrollAdd(element);
  },
  __computeDynamicI18nMessage: function(dataObj) {
    try {
      var key = dataObj.__i18nKey;
      if(!key) return dataObj.m || '';
      var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
      var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang] && window.qwebirc.i18n[lang].options;
      var template = (i18n && i18n[key]) || dataObj.__i18nFallback || dataObj.m || '';
  // Replace placeholders {var}
      var out = template.replace(/\{([a-zA-Z0-9_]+)\}/g, function(_, v){ if(v in dataObj) return dataObj[v]; return '{'+v+'}'; });
  // If certain fields exist but aren't in the template, append them
      function ensure(valKey, label) {
        if(dataObj[valKey] && out.indexOf(dataObj[valKey]) === -1) {
          if(out.indexOf('{'+valKey+'}') === -1 && out.indexOf(dataObj[valKey]) === -1) {
            // If template has no structural slot, just append
            out += (out.trim().length ? ' ' : '') + dataObj[valKey];
          }
        }
      }
      ensure('capabilities');
      ensure('mechanisms');
      return out;
    } catch(e) { return dataObj && dataObj.m || ''; }
  },
  errorMessage: function(message) {
    this.addLine("", message, "warncolour");
  },
  infoMessage: function(type, message) {
    if(message === undefined) {
      this.addLine("", type, "infocolour");
    } else {
      this.addLine(type, message, "infocolour");
    }
  },
  setHilighted: function(state) {
    if(state == qwebirc.ui.HILIGHT_NONE || state >= this.hilighted)
      this.hilighted = state;
  },
  scrolledDown: function() {
    if(this.scrolltimer)
      return true;
      
    var parent = this.lines;

    var scrollPos = parent.getScroll().y;
    var linesHeight = parent.getScrollSize().y;
    var windowHeight = parent.clientHeight;

    /*
     * fixes an IE bug: the scrollheight is less than the actual height
     * when the div isn't full
     */
    if(linesHeight < windowHeight)
      linesHeight = windowHeight;

    return scrollPos + windowHeight >= linesHeight - 3; /* window of error */
  },
  getScrollParent: function() {
    var scrollparent = this.lines;

    if($defined(this.scroller))
      scrollparent = this.scroller;
    return scrollparent;
  },
  scrollToBottom: function() {
    if(this.type == qwebirc.ui.WINDOW_CUSTOM || this.type == qwebirc.ui.WINDOW_CONNECT)
      return;

    var parent = this.lines;
    var scrollparent = this.getScrollParent();
      
    scrollparent.scrollTo(parent.getScroll().x, parent.getScrollSize().y);
  },
  scrollAdd: function(element) {
    var parent = this.lines;
    
    /* scroll in bursts, else the browser gets really slow */
    if($defined(element)) {
      var sd = this.scrolledDown();
      parent.appendChild(element);
      if(parent.childNodes.length > qwebirc.ui.MAXIMUM_LINES_PER_WINDOW) {
        var removed = parent.firstChild;
        parent.removeChild(removed);
  // If it was a stored event line -> remove from storage
        if(this.__storedEventLines && this.__storedEventLines.length) {
          for(var i=0;i<this.__storedEventLines.length;i++) {
            if(this.__storedEventLines[i].element === removed) { this.__storedEventLines.splice(i,1); break; }
          }
        }
      }

      if(sd && !this.scrollTimer)
        this.scrolltimer = this.scrollAdd.delay(50, this, [null]);
    } else {
      this.scrollToBottom();
      this.scrolltimer = null;
    }
  },
  updateNickList: function(nicks) {
    var nickHash = new QHash(), present = new QSet();
    var added = [];
    var lnh = this.lastNickHash;
    
    for(var i=0;i<nicks.length;i++)
      present.add(nicks[i]);

    lnh.each(function(k, v) {
      if(!present.contains(k))
        this.nickListRemove(k, v);
    }, this);

    for(var i=0;i<nicks.length;i++) {
      var n = nicks[i];
      var l = lnh.get(n);
      if(!l) {
        l = this.nickListAdd(n, i);
        if(!l)
          l = 1;
      }
      nickHash.put(n, l);
    }
    
    this.lastNickHash = nickHash;
  },
  nickListAdd: function(position, nick) {
  },
  nickListRemove: function(nick, stored) {
  },
  historyExec: function(line) {
    this.commandhistory.addLine(line);
    this.client.exec(line);
  },
  focusChange: function(newValue) {
    if(newValue == true || !(this.type & qwebirc.ui.WINDOW_LASTLINE))
      return;
    
    this.replaceLastPositionLine();
  },
  replaceLastPositionLine: function() {
    if(this.parentObject.uiOptions.LASTPOS_LINE) {
      if(!this.scrolledDown())
        return;

      if(!this.lastPositionLineInserted) {
        this.scrollAdd(this.lastPositionLine);
      } else if(this.lines.lastChild != this.lastPositionLine) {
        try {
          this.lines.removeChild(this.lastPositionLine);
        } catch(e) {
          /* IGNORE, /clear removes lastPositionLine from the dom without resetting it. */
        }
        this.scrollAdd(this.lastPositionLine);
      }
    } else {
      if(this.lastPositionLineInserted)
        this.lines.removeChild(this.lastPositionLine);
    }
    
    this.lastPositionLineInserted = this.parentObject.uiOptions.LASTPOS_LINE;
  },
  rename: function(name) {
  }
});
