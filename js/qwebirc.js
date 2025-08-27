// Hilfsfunktion: Übersetztes Optionslabel holen
function getOptionLabel(key) {
  var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
  var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang];
  if(i18n && i18n.options && i18n.options[key]) {
    return i18n.options[key];
  }
  return key;
}

// Patch: Überschreibe Optionslabels nach Laden der Übersetzungen
function localizeOptionsLabels() {
  var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
  var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang];
  console.log('[i18n] localizeOptionsLabels called for lang:', lang, i18n);
  if(!i18n || !i18n.options) return;
  if(window.qwebirc && window.qwebirc.config && window.qwebirc.config.DefaultOptions) {
    var opts = window.qwebirc.config.DefaultOptions;
    for(var i=0; i<opts.length; i++) {
      var opt = opts[i];
      if(opt && opt.label && i18n.options[opt.prefix]) {
        console.log('[i18n] Übersetze', opt.prefix, '->', i18n.options[opt.prefix]);
        opt.label = i18n.options[opt.prefix];
      } else if(opt) {
        console.log('[i18n] Keine Übersetzung für', opt.prefix, 'label bleibt', opt.label);
      }
    }
  }
}

// Automatisches Laden der Sprachdatei erst nach Initialisierung der Optionen
window.qwebirc = window.qwebirc || {};
window.qwebirc.i18n = window.qwebirc.i18n || {};
if(!window.qwebirc.i18n.__translators) {
  window.qwebirc.i18n.__translators = [];
  window.qwebirc.i18n.registerTranslator = function(fn) {
    if(typeof fn === 'function' && window.qwebirc.i18n.__translators.indexOf(fn) === -1) {
      window.qwebirc.i18n.__translators.push(fn);
    }
  };
}
// Alias für ältere Aufrufe, die window.qwebirc.registerTranslator verwendeten
if(!window.qwebirc.registerTranslator && window.qwebirc.i18n && window.qwebirc.i18n.registerTranslator) {
  window.qwebirc.registerTranslator = function(fn){ return window.qwebirc.i18n.registerTranslator(fn); };
}

// Sprache beim ersten Laden automatisch erkennen und setzen, auch wenn Optionen später initialisiert werden
var _qwebirc_detectedLang = null;
function detectAndSetInitialLanguage() {
  // Prüfe, ob Sprache schon gesetzt ist (z.B. aus Cookie)
  var lang = null;
  if (window.qwebirc && window.qwebirc.ui && window.qwebirc.ui.uiOptions && window.qwebirc.ui.uiOptions.optionHash && window.qwebirc.ui.uiOptions.optionHash["LANGUAGE"]) {
    lang = window.qwebirc.ui.uiOptions.optionHash["LANGUAGE"].value;
  }
  if (!lang || lang === "undefined") {
    lang = (navigator.language || navigator.userLanguage || 'en').split('-')[0];
  }
  _qwebirc_detectedLang = lang;
  if(window.qwebirc && window.qwebirc.config) {
    if(!window.qwebirc.config.LANGUAGE) {
      window.qwebirc.config.LANGUAGE = lang;
    }
  }
  // Falls Optionen schon existieren, direkt setzen
  if(window.qwebirc && window.qwebirc.ui && window.qwebirc.ui.uiOptions && window.qwebirc.ui.uiOptions.setValueByPrefix) {
    window.qwebirc.ui.uiOptions.setValueByPrefix('LANGUAGE', lang);
  }
}

// Hook: Wenn Optionen initialisiert werden, Sprache übernehmen
function setInitialLanguageOnOptions(optionsObj) {
  if(_qwebirc_detectedLang && optionsObj && optionsObj.setValueByPrefix) {
    optionsObj.setValueByPrefix('LANGUAGE', _qwebirc_detectedLang);
  }
}

function afterOptionsInit() {
  console.log('[i18n] afterOptionsInit called');
  detectAndSetInitialLanguage();
  var userLang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
  loadLocale(userLang).then(function() {
    localizeOptionsLabels();
    // Options-Panel neu rendern, falls offen
    if (window.qwebirc && window.qwebirc.ui && window.qwebirc.ui.activeWindow && window.qwebirc.ui.activeWindow.identifier === "optionspane") {
      if (window.qwebirc.ui.activeWindow.rebuild) {
        window.qwebirc.ui.activeWindow.rebuild();
      } else if (window.qwebirc.ui.optionsWindow) {
        window.qwebirc.ui.optionsWindow();
      }
    }
    // Alle registrierten Übersetzer ausführen
    try {
      if(window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n.__translators) {
        window.qwebirc.i18n.__translators.forEach(function(fn){ try { fn(userLang); } catch(e) {} });
      }
      window.dispatchEvent(new CustomEvent('qwebirc:languageChanged', {detail:{lang:userLang}}));
    } catch(e) {}
  });
}

// Diese Funktion muss nach der Options-Initialisierung aufgerufen werden

function loadLocale(lang) {
  if(!lang || typeof lang !== 'string' || lang === 'undefined') lang = 'en';
  var url = '/locales/' + lang + '.json';
  return fetch(url)
    .then(function(r) {
      if (!r.ok) throw new Error('Locale not found: ' + url);
      return r.json();
    })
    .then(function(data) {
      window.qwebirc = window.qwebirc || {};
      window.qwebirc.i18n = window.qwebirc.i18n || {};
      window.qwebirc.i18n[lang] = data;
      return data;
    })
    .catch(function(e) {
      // Fehler ignorieren, wenn Sprache nicht gefunden
      return {};
    });
}

// Sprache aus Option oder Default bestimmen

// Beispiel: Nach der Options-Initialisierung aufrufen
// afterOptionsInit();


var qwebirc = {ui: {themes: {}, style: {}}, irc: {}, util: {crypto: {}}, config: {}, auth: {}, sound: {}, connected: false, xdomain: {}};

if(typeof QWEBIRC_BUILD != "undefined") {
  qwebirc.BUILD = QWEBIRC_BUILD;
  qwebirc.FILE_SUFFIX = "-" + QWEBIRC_BUILD;
} else {
  qwebirc.BUILD = null;
  qwebirc.FILE_SUFFIX = "";
}
