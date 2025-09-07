function qwebirc_ui_onbeforeunload(e) { /* IE sucks */
  if(qwebirc.connected) {
    var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
    var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang] && window.qwebirc.i18n[lang].options;
    var message = (i18n && i18n.UNLOAD_CLOSE_CONNECTIONS) || "This action will close all active IRC connections.";
    var ev = e || window.event;
    if(ev) ev.returnValue = message;
    return message;
  }
}

qwebirc.ui.Interface = new Class({
  Implements: [Options],
  options: {
    initialNickname: null,
    initialChannels: null,
    networkName: "ExampleNetwork",
    networkServices: [],
    loginRegex: null,
    appTitle: "ExampleNetwork Web IRC",
    searchURL: true,
    theme: undefined,
    baseURL: null,
    hue: null,
    saturation: null,
    lightness: null,
    thue: null,
    tsaturation: null,
    tlightness: null,
    uiOptionsArg: null,
    nickValidation: null,
    dynamicBaseURL: "/",
    staticBaseURL: "/",
    dynamicConfiguration: false,
    logoURL: null,
    accountWhoisCommand: null
  },
  initialize: function(element, ui, options) {
    this.setOptions(options);
    var extractHost = function() {
      var uri = document.location.href;

      /* IE6 doesn't have document.origin ... */
      var start = uri.indexOf('?');
      if(start != -1)
        uri = uri.substring(0, start);
      var start = uri.indexOf('#');
      if(start != -1)
        uri = uri.substring(0, start);

      if(QWEBIRC_DEBUG && uri.endsWith(".html")) {
        var last = uri.lastIndexOf("/");
        uri = uri.substring(0, last + 1);
      }
      if(uri.substr(uri.length - 1) != "/")
        uri = uri + "/";

      return uri;
    };

    options.baseURL = extractHost();
    
    /* HACK */
    qwebirc.global = {
      dynamicBaseURL: options.dynamicBaseURL,
      dynamicConfiguration: options.dynamicConfiguration,
      staticBaseURL: options.staticBaseURL,
      baseURL: options.baseURL,
  nicknameValidator: (options.nickValidation != null) ? new qwebirc.irc.NicknameValidator(options.nickValidation) : new qwebirc.irc.DummyNicknameValidator(),
      dynamicConfigurationLoaded: false
    };

    window.addEvent("domready", function() {
      // Einmaliger Interaktions-Listener zum Priming der Audio-Objekte (Autoplay Policies)
      try {
        var prime = function() {
          try { if(qwebirc.uiRoot && qwebirc.uiRoot.__beeper && qwebirc.uiRoot.__beeper.soundPlayer) qwebirc.uiRoot.__beeper.soundPlayer.prepare(); } catch(e) {}
          document.removeEvent('click', prime);
          document.removeEvent('keydown', prime);
        };
        document.addEvent('click', prime);
        document.addEvent('keydown', prime);
      } catch(e) {}
      var callback = function(options) {
        var IRC = new qwebirc.irc.IRCClient(options, ui_);
        IRC.connect();
        window.onbeforeunload = qwebirc_ui_onbeforeunload;
        window.addEvent("unload", function() {
          var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
          var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang] && window.qwebirc.i18n[lang].options;
          IRC.quit((i18n && i18n.QUIT_PAGE_CLOSED) || "Page closed");
        });
      };

      var inick = null;
      var ichans = this.options.initialChannels;
      var autoConnect = false;
      
      if(this.options.searchURL) {
        var args = qwebirc.util.parseURI(String(document.location));
        this.options.hue = this.getHueArg(args, "");
        this.options.saturation = this.getSaturationArg(args, "");
        this.options.lightness = this.getLightnessArg(args, "");

        this.options.thue = this.getHueArg(args, "t");
        this.options.tsaturation = this.getSaturationArg(args, "t");
        this.options.tlightness = this.getLightnessArg(args, "t");
        
        if(args.contains("uio"))
          this.options.uiOptionsArg = args.get("uio");

        var url = args.get("url");
        var chans, nick = args.get("nick");
        
        if(url != null) {
          ichans = this.parseIRCURL(url);
          if(chans != null && chans != "")
            canAutoConnect = true;
        } else {
          chans = args.get("channels");

          var canAutoConnect = false;
        
          if(chans) {
            var cdata = chans.split(" ");
          
            chans = cdata[0].split(",");
            var chans2 = [];
          
            for(var i=0;i<chans.length;i++) {
              chans2[i] = chans[i];

                var prefix = chans[i].charAt(0);
                if(prefix != '#' && prefix != '&')
                chans2[i] = "#" + chans2[i]
            }
            cdata[0] = chans2.join(",");
            ichans = cdata.join(" ");
            canAutoConnect = true;
          }
        }
        
  if(nick != null)
          inick = this.randSub(nick);
          
        if(args.contains("randomnick") && args.get("randomnick") == 1)
          inick = this.options.initialNickname;

        /* we only consider autoconnecting if the nick hasn't been supplied, or it has and it's not "" */
        if(canAutoConnect && (inick == null || (inick != null && (inick != "")))) {
          var p = args.get("prompt");
          var pdefault = false;
          
          if(p == null || p == "") {
            pdefault = true;
            p = false;
          } else if(p == "0") {
            p = false;
          } else {
            p = true;
          }
          
          /* autoconnect if we have channels and nick but only if prompt != 1 */
          if(inick != null && !p) {
            autoConnect = true;
          } else if(!pdefault && !p) { /* OR if prompt=0, but not prompt=(nothing) */
            autoConnect = true;
          }
        }
      }
  
      // Load persisted options from the existing opt1 Hash.Cookie (MooTools)
      try {
        if(typeof Hash !== 'undefined' && typeof Hash.Cookie !== 'undefined') {
          try {
            var __optc = new Hash.Cookie('opt1', {duration:3650, autoSave:false});
            var __h = __optc.hash || {};
            // Option id 11 = STYLE_HUE (see DEFAULT_OPTIONS)
            if(__h.hasOwnProperty('11')) {
              var huev = Number(__h['11']);
              if(!isNaN(huev)) this.options.hue = huev;
            }
            // Option id 21 = FRONTEND_UI -> if stored, try to prefer it (string like 'qui'/'classicui')
            if(__h.hasOwnProperty('21') && typeof __h['21'] === 'string' && __h['21'].length > 0) {
              try {
                // If the stored frontend differs from the current page, redirect to the stored frontend
                var cur = window.location.pathname.replace(/[^\/]*$/, '');
                var target = __h['21'] + '.html';
                if(!window.location.pathname.endsWith(target)) {
                  window.location = cur + target + window.location.search + window.location.hash;
                  return; // navigation will reload page
                }
              } catch(e) {}
            }
          } catch(e) {}
        }
      } catch(e) {}

      var ui_ = new ui($(element), new qwebirc.ui.Theme(this.options.theme), this.options);
      try {
        // Globale Referenz bereitstellen für Debug / Scripts
        if(!qwebirc.uiRoot) qwebirc.uiRoot = ui_;
      } catch(e) { /* ignore */ }

  var usingAutoNick = (nick == null);
      if(usingAutoNick && autoConnect)
        inick = this.options.initialNickname;
      
      var details = ui_.loginBox(callback, inick, ichans, autoConnect, usingAutoNick);
    }.bind(this));
  },
  getHueArg: function(args, t) {
    var hue = args.get(t + "hue");
  if(hue == null)
      return null;
    hue = parseInt(hue);
    if(hue > 360 || hue < 0)
      return null;
    return hue;
  },
  getSaturationArg: function(args, t) {
    var saturation = args.get(t + "saturation");
  if(saturation == null)
      return null;
    saturation = parseInt(saturation);
    if(saturation > 100 || saturation < -100)
      return null;
    return saturation;
  },
  getLightnessArg: function(args, t) {
    var lightness = args.get(t + "lightness");
  if(lightness == null)
      return null;
    lightness = parseInt(lightness);
    if(lightness > 100 || lightness < -100)
      return null;
    return lightness;
  },
  randSub: function(nick) {
    var getDigit = function() { return Math.floor(Math.random() * 10); }
    
    return nick.split("").map(function(v) {
      if(v == ".") {
        return getDigit();
      } else {
        return v;
      }
    }).join("");
    
  },
  parseIRCURL: function(url) {
    if(url.indexOf(":") == 0)
      return;
    var schemeComponents = url.splitMax(":", 2);
    if(schemeComponents[0].toLowerCase() != "irc" && schemeComponents[0].toLowerCase() != "ircs") {
  var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
  var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang] && window.qwebirc.i18n[lang].options;
  alert((i18n && i18n.BAD_IRC_URL) || "Bad IRC URL scheme.");
      return;
    }

    if(url.indexOf("/") == 0) {
      /* irc: */
      return;
    }
    
    var pathComponents = url.splitMax("/", 4);
    if(pathComponents.length < 4 || pathComponents[3] == "") {
      /* irc://abc */
      return;
    }
    
    var args, queryArgs;
    if(pathComponents[3].indexOf("?") > -1) {
      queryArgs = qwebirc.util.parseURI(pathComponents[3]);
      args = pathComponents[3].splitMax("?", 2)[0];
    } else {
      args = pathComponents[3];
    }
    var parts = args.split(",");

    var channel = parts[0];
    if(channel.charAt(0) != "#")
      channel = "#" + channel;

    var not_supported = [], needkey = false, key;
    for(var i=1;i<parts.length;i++) {
      var value = parts[i];
      if(value == "needkey") {
        needkey = true;
      } else {
        not_supported.push(value);
      }
    }

  if(queryArgs != null) {
      queryArgs.each(function(key_, value) {
        if(key_ == "key") {
          key = value;
          needkey = true;
        } else {
          not_supported.push(key_);
        }
      });
    }
    
    if(needkey) {
  if(key == null)
        key = prompt("Please enter the password for channel " + channel + ":");
  if(key != null)
        channel = channel + " " + key;
    }
    
    if(not_supported.length > 0)
      alert("The following IRC URL components were not accepted: " + not_supported.join(", ") + ".");
    
    return channel;
  }
});

qwebirc.ui.requireDynamicConfiguration = function(callback) {
  if (!qwebirc.global.dynamicConfiguration || qwebirc.global.dynamicConfigurationLoaded) {
    callback();
    return;
  }

  var r = new Request.JSON({url: qwebirc.global.dynamicBaseURL + "configuration", onSuccess: function(data) {
    qwebirc.global.dynamicBaseURL = data["dynamicBaseURL"];

    callback();
  }});
  r.get();
};
