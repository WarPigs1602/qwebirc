qwebirc.ui.supportsFocus = function() {
  var ua = navigator.userAgent;
  if(!$defined(ua))
    return [true];
      
  if(Browser.Engine.ipod || ua.indexOf("Konqueror") != -1)
    return [false, false];

  return [true];
}

/**
 * Note that options are settable by the uioptions url arg by default unless you specifiy
 * settableByURL...
 */
qwebirc.config.DEFAULT_OPTIONS = [
  // LANGUAGE option list is populated dynamically from /locales/index.json (see integrateLanguagesIntoOptions)
  [20, "LANGUAGE", "Language", 0, null, [ ["English","en"] ]],
  [1, "BEEP_ON_MENTION", "Beep on activity", true],
  [16, "NOTIFICATIONS", "Emit HTML5 notifications on activity", false, {
    enabled: function() {
      if(!("Notification" in window))
        return [false, false]; /* [disabled, default_value] */
      return [true];
    },
    applyChanges: function(value, ui) {
      if(ui.setNotifications)
        ui.setNotifications(value);
    }
  }],
  [7, "FLASH_ON_MENTION", "Flash titlebar when nick mentioned or on query activity", true, {
    enabled: qwebirc.ui.supportsFocus
  }],
  [2, "DEDICATED_MSG_WINDOW", "Send privmsgs to dedicated messages window", false],
  [4, "DEDICATED_NOTICE_WINDOW", "Send notices to dedicated message window", false],
  [3, "NICK_OV_STATUS", "Show status (@/+) before nicknames in channel lines", true],
  /* 5 and 6 are reserved */
  [8, "LASTPOS_LINE", "Show a last position indicator for each window", true, {
    enabled: qwebirc.ui.supportsFocus
  }],
  [9, "NICK_COLOURS", "Automatically colour nicknames", false],
  [10, "HIDE_JOINPARTS", "Hide JOINS/PARTS/QUITS", false],
  [11, "STYLE_HUE", "Adjust user interface hue", function(ui) {
    return {class_: qwebirc.config.HueOption, default_: ui.__styleValues.hue};
  }, {
    applyChanges: function(value, ui) {
      ui.setModifiableStylesheetValues({hue: value});
    }
  }],
  [12, "QUERY_ON_NICK_CLICK", "Query on nickname click in channel", false],
  [13, "SHOW_NICKLIST", "Show nickname list in channels", qwebirc.util.deviceHasKeyboard()],
  [14, "SHOW_TIMESTAMPS", "Show timestamps", true], /* we rely on the hue update */
  [15, "SIDE_TABS", "Show tabs on the side", false, {
    enabled: function() {
      if(Browser.Engine.trident && Browser.Engine.version < 8)
        return [false, false]; /* [disabled, default_value] */
      return [true];
    },
    applyChanges: function(value, ui) {
      ui.setSideTabs(value);
    }
  }]
];

qwebirc.config.QUAKENET_OPTIONS = [
  [5, "ACCEPT_SERVICE_INVITES", "Automatically join channels when invited by Q", false, {
    settableByURL: false
  }],
  [6, "USE_HIDDENHOST", "Hide your hostmask when authed to Q (+x)", true, {
    settableByURL: false
  }]
];

qwebirc.config.DefaultOptions = null;

qwebirc.config.Input = new Class({
  initialize: function(parent, option, position, parentObject) {
    this.option = option;
    this.value = option.value;
    this.enabled = this.option.enabled;
    this.position = position;
    this.parentElement = parent;
    this.parentObject = parentObject;
    
    this.render();
  },
  createInput: function(type, parent, name, selected, id) {
    if(!$defined(parent))
      parent = this.parentElement;

    return qwebirc.util.createInput(type, parent, name, selected, this.option.id);
  },
  FE: function(element, parent) {
    var n = new Element(element);
    if(!$defined(parent))
      parent = this.parentElement;
      
    parent.appendChild(n);
    return n;
  },
  focus: function() {
    this.mainElement.focus();
  },
  render: function() {
    this.event("render", this.mainElement);
  },
  applyChanges: function() {
    this.event("applyChanges", [this.get(), this.parentObject.optionObject.ui]);
  },
  event: function(name, x) {
    if(!$defined(this.option.extras))
      return;
    var t = this.option.extras[name];
    if(!$defined(t))
      return;
      
    t.pass(x, this)();
  },
  cancel: function() {
  }
});

qwebirc.config.TextInput = new Class({
  Extends: qwebirc.config.Input,
  render: function() {
    var i = this.createInput("text");
    this.mainElement = i;
    
    i.value = this.value;
    i.disabled = !this.enabled;
    
    this.parent();
  },
  get: function() {
    return this.mainElement.value;
  }
});

qwebirc.config.HueInput = new Class({
  Extends: qwebirc.config.Input,
  wide: true,
  render: function() {
    var i = new Element("div");
    i.addClass("qwebirc-optionspane");
    i.addClass("hue-slider");
    this.parentElement.appendChild(i);
    
    var k = new Element("div");
    k.addClass("knob");
    if(Browser.Engine.trident) {
      k.setStyle("top", "0px");
      k.setStyle("background-color", "black");
    }
    
    i.appendChild(k);
    
    var slider = new Slider(i, k, {steps: 36, range: [0, 369], wheel: true});
    slider.set(this.value);
    this.startValue = this.value;
    
    slider.addEvent("change", function(step) {
      this.value = step;
      this.applyChanges();
    }.bind(this));
    this.mainElement = i;
    
    if(!this.enabled)
      slider.detach();
    
    this.parent();
  },
  get: function() {
    return this.value;
  },
  cancel: function() {
    this.value = this.startValue;
    this.applyChanges();
  }
});

qwebirc.config.CheckInput = new Class({
  Extends: qwebirc.config.Input,
  render: function() {
    var i = this.createInput("checkbox", null, null, null, this.id);
    this.mainElement = i;
    
    i.checked = this.value;
    i.disabled = !this.enabled;

    this.parent();
  },
  get: function() {
    return this.mainElement.checked;
  }
});

qwebirc.config.RadioInput = new Class({
  Extends: qwebirc.config.Input,
  render: function() {
    var value = this.option.options;
    var select = document.createElement('select');
    select.disabled = !this.enabled;
    if(this.option.prefix === 'LANGUAGE') {
      select.id = 'qwebirc-language-select';
    }
    this.mainElement = select;
    for(var i=0;i<value.length;i++) {
      var opt = document.createElement('option');
      opt.value = value[i][1];
      opt.textContent = value[i][0];
      if(this.option.value == value[i][1]) {
        opt.selected = true;
        this.option.position = i;
      }
      select.appendChild(opt);
    }
    this.parentElement.appendChild(select);
    select.addEventListener('change', function() {
      this.value = select.value;
      this.option.value = select.value;
      for(var i=0;i<value.length;i++) {
        if(value[i][1] == select.value) {
          this.option.position = i;
          break;
        }
      }
      if(this.option.prefix === "LANGUAGE" && window.qwebirc && window.qwebirc.config) {
  window.qwebirc.config.LANGUAGE = select.value;
  // Flag setzen damit afterOptionsInit die manuelle Wahl priorisiert
  window.__qwebircManualLanguage = select.value.toLowerCase();
  if(typeof persistLanguage === 'function') try { persistLanguage(select.value.toLowerCase()); } catch(e) {}
        if(typeof afterOptionsInit === "function") afterOptionsInit();
      }
      this.applyChanges();
    }.bind(this));
    this.parent();
  },
  get: function() {
    return this.mainElement.value;
  }
});

qwebirc.config.Option = new Class({
  initialize: function(optionId, prefix, label, default_, extras) {
    this.prefix = prefix;
    this.label = label;
    this.default_ = default_;
    this.optionId = optionId;
    this.extras = extras;
    
    if($defined(extras) && $defined(extras.enabled)) {
      var enabledResult = extras.enabled();
      this.enabled = enabledResult[0];
      
      if(!enabledResult[0] && enabledResult.length > 1)
        this.default_ = enabledResult[1];
    } else {
      this.enabled = true;
    }
    
    if($defined(extras) && $defined(extras.settableByURL)) {
      this.settableByURL = extras.settableByURL;
    } else {
      this.settableByURL = true;
    }
  },
  setSavedValue: function(x) {
    if(this.enabled)
      this.value = x;
  }
});

qwebirc.config.RadioOption = new Class({
  Extends: qwebirc.config.Option,
  Element: qwebirc.config.RadioInput,
  initialize: function(optionId, prefix, label, default_, extras, options) {
    this.options = options.map(function(x) {
      if(typeof(x) == "string")
        return [x, x];
      return x;
    });
    this.defaultposition = default_;

    this.parent(optionId, prefix, label, this.options[default_][1], extras);
  },
  setSavedValue: function(x) {
  // SPECIAL CASE: LANGUAGE is extended dynamically (manifest loaded after initialisation).
  // If the stored value (cookie) is not yet in the options list we keep it instead of falling
  // back to default. Later, when integrateLanguagesIntoOptions() runs, the list is updated and
  // the value is matched properly.
    var found = false;
    for(var i=0;i<this.options.length;i++) {
      var y = this.options[i][1];
      if(x == y) {
        this.position = i;
        this.value = x;
        found = true;
        break;
      }
    }
    if(!found) {
      if(this.prefix === 'LANGUAGE') {
  // Remember value, keep position at default until list becomes available
  this.value = x; // intentionally no fallback so later matching works
        this.position = this.defaultposition;
        return;
      } else {
        this.position = this.defaultposition;
        this.value = this.default_;
      }
    }
  }
});

qwebirc.config.TextOption = new Class({
  Extends: qwebirc.config.Option,
  Element: qwebirc.config.TextInput
});

qwebirc.config.CheckOption = new Class({
  Extends: qwebirc.config.Option,
  Element: qwebirc.config.CheckInput
});

qwebirc.config.HueOption = new Class({
  Extends: qwebirc.config.Option,
  Element: qwebirc.config.HueInput
});

qwebirc.ui.Options = new Class({
  initialize: function(ui) {
    this.ui = ui;

    if(!$defined(qwebirc.config.DefaultOptions))
      this.__configureDefaults();
    
    this.optionList = qwebirc.config.DefaultOptions.slice();
    this.optionHash = {};

    this._setup();
    this.optionList.forEach(function(x) {
      x.setSavedValue(this._get(x));
      this.optionHash[x.prefix] = x;
      this[x.prefix] = x.value;
    }.bind(this));
  },
  __configureDefaults: function() {
    var combined = qwebirc.config.DEFAULT_OPTIONS.slice(0);

    var xo = null;
    if(this.ui.options.networkName == "QuakeNet") /* HACK */
      xo = qwebirc.config.QUAKENET_OPTIONS;

    if(xo)
      for(var i=0;i<xo.length;i++)
        combined.push(xo[i]);

    qwebirc.config.DefaultOptions = combined.map(function(x) {
      var optionId = x[0];
      var prefix = x[1];
      var label = x[2];
      var default_ = x[3];
      var moreextras = x[4];
      var extras = x[5];

      var stype = typeof(default_);
      if(prefix === "LANGUAGE") {
        // extras ist hier die Optionsliste, nicht das extras-Objekt
        return new qwebirc.config.RadioOption(optionId, prefix, label, default_, moreextras, extras);
      } else if(stype == "number") {
        return new qwebirc.config.RadioOption(optionId, prefix, label, default_, moreextras, extras);
      } else {
        var type;
        if(stype == "boolean") {
          type = qwebirc.config.CheckOption;
        } else if(stype == "function") {
          var options = default_.call(this, this.ui);
          type = options.class_;
          default_ = options.default_;
        } else {
          type = qwebirc.config.TextOption;
        }
        return new type(optionId, prefix, label, default_, moreextras);
      }
    }, this);
  },
  setValue: function(option, value) {
    this.optionHash[option.prefix].value = value;
    this[option.prefix] = value;
    if(option.prefix === "LANGUAGE") {
      if(window.qwebirc && window.qwebirc.config) {
        window.qwebirc.config.LANGUAGE = value;
        if(typeof afterOptionsInit === "function") afterOptionsInit();
      }
    }
  },
  setValueByPrefix: function(prefix, value) {
    this.optionHash[prefix].value = value;
    this[prefix] = value;
  },
  getOptionList: function() {
    return this.optionList;
  },
  _get: function(x) {
    return x.default_;
  },
  _setup: function() {
  },
  flush: function() {
  }
});

qwebirc.ui.OptionsPane = new Class({
  Implements: [Events],
  initialize: function(parentElement, optionObject) {
  this.type = 'optionspane';
    this.parentElement = parentElement;
    this.optionObject = optionObject;
  // Host element for positioning the close button
  try { this.parentElement.addClass('pane-host'); } catch(e) {}
  this.__injectCloseButton();
    this.createElements();
  // Listener for language change
    window.addEventListener('qwebirc:languageChanged', function(ev){
      try { this.translate(ev.detail.lang); } catch(e) {}
    }.bind(this));
  // Immediate initial translation if locale already loaded for current language
    try {
      var initialLang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
      this.translate(initialLang);
    } catch(e) {}
  },
  rebuild: function() {
    // Panel komplett neu rendern
    while (this.parentElement.firstChild) {
      this.parentElement.removeChild(this.parentElement.firstChild);
    }
    this.createElements();
  },
  translate: function(lang) {
    if(!lang) lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
    var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang];
    if(!i18n || !i18n.options) return;
    // Aktualisiere Optionslabels
    this.optionObject.getOptionList().forEach(function(opt){
      if(opt._labelElement) {
        var key = opt.prefix;
        var translated = i18n.options[key];
        if(translated) {
          if(opt._isWide) opt._labelElement.set('text', translated + ':'); else opt._labelElement.set('text', translated);
        }
      }
    });
    // Buttons
    var saveBtn = this.parentElement.getElement('input.qwebirc-options-save');
    var cancelBtn = this.parentElement.getElement('input.qwebirc-options-cancel');
    if(saveBtn && i18n.options.SAVE) saveBtn.value = i18n.options.SAVE;
    if(cancelBtn && i18n.options.CANCEL) cancelBtn.value = i18n.options.CANCEL;
  },
  createElements: function() {
    var FE = function(element, parent) {
      var n = new Element(element);
      parent.appendChild(n);
      return n;
    };
    // Tabelle: jede Option = eine Zeile (Label links, Input rechts)
    var t = FE("table", this.parentElement); t.addClass('qwebirc-options-table');
    var tb = FE("tbody", t);
    this.boxList = [];
    var optList = this.optionObject.getOptionList();
    for(var i=0;i<optList.length;i++) {
      var x = optList[i];
      x.id = qwebirc.util.generateID();
      var row = FE('tr', tb); row.addClass('option-row');
      var labelCell = FE('td', row); labelCell.addClass('label-cell');
      var valueCell = FE('td', row); valueCell.addClass('value-cell');
      // Input in valueCell rendern
      var ele = new x.Element(valueCell, x, i, this);
      this.boxList.push([x, ele]);
      // Label erstellen (nachdem Element erzeugt, damit x.id vorhanden)
      var label = new Element('label', { 'for': x.id });
      label.set('text', x.label + (ele.wide ? ':' : ''));
      labelCell.appendChild(label);
      x._labelElement = label; x._isWide = !!ele.wide;
      if(ele.wide) {
  // For wide option: valueCell spans both columns (label top-left, value stretched right)
        valueCell.colSpan = 1; // behalten wir bei zwei Zellen; CSS kann Breite steuern
        row.addClass('wide-option');
      }
    }
    // Save/Cancel Zeile
    var r = FE('tr', tb); r.addClass('buttons-row');
    var cella = FE('td', r); cella.setAttribute('colspan','2'); cella.addClass('buttons-cell');
    var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
    var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang];
    var saveLabel = (i18n && i18n.options && i18n.options.SAVE) ? i18n.options.SAVE : "Save";
    var cancelLabel = (i18n && i18n.options && i18n.options.CANCEL) ? i18n.options.CANCEL : "Cancel";

    var save = qwebirc.util.createInput("submit", cella);
    save.value = saveLabel;
  save.addClass("qwebirc-options-save");
    save.addEvent("click", function() {
      this.save();
      this.fireEvent("close");
    }.bind(this));

    var cancel = qwebirc.util.createInput("submit", cella);
    cancel.value = cancelLabel;
  cancel.addClass("qwebirc-options-cancel");
    cancel.addEvent("click", function() {
      this.cancel();
      this.fireEvent("close");
    }.bind(this));
  },
  save: function() {
    this.boxList.forEach(function(x) {
      var option = x[0];
      var box = x[1];
      this.optionObject.setValue(option, box.get());
    }.bind(this));
    this.boxList.forEach(function(x) {
      x[1].applyChanges();
    }.bind(this));
    this.optionObject.flush();
  },
  cancel: function() {
    this.boxList.forEach(function(x) {
      x[1].cancel();
    }.bind(this));
  }
});

// SVG-Close-Button injizieren (oben rechts) – ruft nur close Event auf
qwebirc.ui.OptionsPane.prototype.__injectCloseButton = function() {
  var host = this.parentElement;
  if(!host || host.getElement('.pane-close')) return;
  var btn = new Element('span', { 'class': 'pane-close', 'title': 'Close'});
  // SVG einbetten
  try {
    var svgns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgns, 'svg');
    svg.setAttribute('viewBox','0 0 14 14');
    var l1 = document.createElementNS(svgns, 'line');
    l1.setAttribute('x1','3'); l1.setAttribute('y1','3'); l1.setAttribute('x2','11'); l1.setAttribute('y2','11');
    var l2 = document.createElementNS(svgns, 'line');
    l2.setAttribute('x1','11'); l2.setAttribute('y1','3'); l2.setAttribute('x2','3'); l2.setAttribute('y2','11');
    svg.appendChild(l1); svg.appendChild(l2);
    btn.appendChild(svg);
  } catch(e) { btn.set('text','×'); }
  btn.addEvent('click', function(e){ new Event(e).stop(); this.fireEvent('close'); }.bind(this));
  host.appendChild(btn);
  // Update translated title on language change
  var updateTitle = function(){
    try {
      var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
      var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang];
      if(i18n && i18n.options && (i18n.options.EMBED_BTN_CLOSE || i18n.options.CANCEL)) {
        btn.set('title', i18n.options.EMBED_BTN_CLOSE || i18n.options.CANCEL);
      }
    } catch(err) {}
  };
  updateTitle();
  window.addEventListener('qwebirc:languageChanged', updateTitle);
};

qwebirc.ui.CookieOptions = new Class({
  Extends: qwebirc.ui.Options,
  _setup: function() {
    this.__cookie = new Hash.Cookie("opt1", {duration: 3650, autoSave: false});
  },
  _get: function(x) {
    var v = this.__cookie.get(x.optionId);
    if(!$defined(v))
      return x.default_;
    
    return v;
  },
  flush: function() {
    this.__cookie.erase();
    this._setup();
    
    this.getOptionList().forEach(function(x) {
      this.__cookie.set(x.optionId, x.value);
    }.bind(this));
    this.__cookie.save();
  }
});

qwebirc.ui.SuppliedArgOptions = new Class({
  Extends: qwebirc.ui.CookieOptions,
  initialize: function(ui, arg) {
    var p = new QHash();
    
    if($defined(arg) && arg != "" && arg.length > 2) {
      var checksum = arg.substr(arg.length - 2, 2);
      var decoded = qwebirc.util.b64Decode(arg.substr(0, arg.length - 2));
      
      if(decoded && (new qwebirc.util.crypto.MD5().digest(decoded).slice(0, 2) == checksum)) {
        var p2 = qwebirc.util.parseURI("?" + decoded);
        p2.each(function(k, v) {
          p.put(k, JSON.decode(v, true));
        });
      }
    }
    
    this.parsedOptions = p;
    this.parent(ui);
  },
  _get: function(x) {
    if(x.settableByURL !== true)
      return this.parent(x);

    var opt = this.parsedOptions.get(String(x.optionId));
    if(!$defined(opt))
      return this.parent(x);
      
    return opt;
  },
  serialise: function() {
    var result = [];
    this.getOptionList().forEach(function(x) {
      if(x.settableByURL && x.default_ != x.value)
        result.push(x.optionId + "=" + JSON.encode(x.value));
    }.bind(this));
    
    var raw = result.join("&");
    var checksum = new qwebirc.util.crypto.MD5().digest(raw).slice(0, 2);
    return (qwebirc.util.b64Encode(raw)).replaceAll("=", "") + checksum;
  }
});

qwebirc.ui.DefaultOptionsClass = new Class({
  Extends: qwebirc.ui.SuppliedArgOptions
});
