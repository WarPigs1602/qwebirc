// Helper: fetch translated option label
function getOptionLabel(key) {
  var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
  var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang];
  if(i18n && i18n.options && i18n.options[key]) {
    return i18n.options[key];
  }
  return key;
}

// Patch: overwrite option labels after translations loaded
function localizeOptionsLabels() {
  var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
  var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang];
  if(!i18n || !i18n.options) return;
  if(window.qwebirc && window.qwebirc.config && window.qwebirc.config.DefaultOptions) {
    var opts = window.qwebirc.config.DefaultOptions;
    for(var i=0; i<opts.length; i++) {
      var opt = opts[i];
      if(opt && opt.label && i18n.options[opt.prefix]) {
        opt.label = i18n.options[opt.prefix];
      }
    }
  }
}

// Automatic loading of language file only after options initialization
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
// Alias for legacy calls that used window.qwebirc.registerTranslator
if(!window.qwebirc.registerTranslator && window.qwebirc.i18n && window.qwebirc.i18n.registerTranslator) {
  window.qwebirc.registerTranslator = function(fn){ return window.qwebirc.i18n.registerTranslator(fn); };
}

// Automatically detect and set language on first load even if options init later
var _qwebirc_detectedLang = null;
function detectAndSetInitialLanguage() {
  // Check if language already set (e.g. from cookie)
  var lang = null;
  // If cookie options already loaded, check there first
  try {
    if(window.qwebirc && window.qwebirc.ui && window.qwebirc.ui.uiOptions) {
      var opt = window.qwebirc.ui.uiOptions.optionHash && window.qwebirc.ui.uiOptions.optionHash['LANGUAGE'];
      if(opt && opt.value) lang = opt.value;
    }
  } catch(e) {}
  // If still not set -> auto-detect
  if(!lang || lang === 'undefined') {
    lang = (navigator.language || navigator.userLanguage || 'en').split('-')[0];
  }
  _qwebirc_detectedLang = lang;
  if(window.qwebirc && window.qwebirc.config) {
    if(!window.qwebirc.config.LANGUAGE) {
      window.qwebirc.config.LANGUAGE = lang;
    }
  }
  // If options already exist, set directly
  if(window.qwebirc && window.qwebirc.ui && window.qwebirc.ui.uiOptions && window.qwebirc.ui.uiOptions.setValueByPrefix) {
    window.qwebirc.ui.uiOptions.setValueByPrefix('LANGUAGE', lang);
  }
}

// Hook: when options initialized, apply language
function setInitialLanguageOnOptions(optionsObj) {
  if(_qwebirc_detectedLang && optionsObj && optionsObj.setValueByPrefix) {
    optionsObj.setValueByPrefix('LANGUAGE', _qwebirc_detectedLang);
  }
}

function setLanguageInternal(lang, supportedList) {
  if(!lang) lang = 'en';
  lang = lang.toLowerCase();
  if(Array.isArray(supportedList) && supportedList.length) {
    if(supportedList.indexOf(lang) === -1) {
      if(supportedList.indexOf('en') !== -1) lang = 'en'; else lang = supportedList[0];
    }
  }
  if(window.qwebirc && window.qwebirc.config) window.qwebirc.config.LANGUAGE = lang;
  try {
    var optObj = window.qwebirc && window.qwebirc.ui && window.qwebirc.ui.uiOptions && window.qwebirc.ui.uiOptions.optionHash && window.qwebirc.ui.uiOptions.optionHash['LANGUAGE'];
    if(optObj) optObj.value = lang;
    var inst = window.qwebirc.config && window.qwebirc.config.DefaultOptions && window.qwebirc.config.DefaultOptions.filter(function(o){ return o && o.prefix === 'LANGUAGE'; })[0];
    if(inst && inst.options) {
      var pos = inst.options.findIndex(function(x){ return x[1] === lang; });
      if(pos < 0) pos = 0;
      inst.value = lang;
      inst.position = pos;
    }
  } catch(e) {}
  var sel = document.getElementById('qwebirc-language-select');
  if(sel) sel.value = lang;
  // Persist immediately
  persistLanguageRobust(lang);
  return lang;
}

function persistLanguage(lang) {
  try {
    var uiOpts = window.qwebirc && window.qwebirc.ui && window.qwebirc.ui.uiOptions;
    if(uiOpts && uiOpts.__cookie) {
      uiOpts.__cookie.set(20, lang);
      uiOpts.__cookie.save();
    }
  } catch(e) { /* still ignore */ }
}
// More robust variant with retry & extra debug tracing
function persistLanguageRobust(lang) {
  lang = (lang||'en').toLowerCase();
  // If cookie already has identical value -> no-op
  try {
    var existing = window.qwebirc && window.qwebirc.ui && window.qwebirc.ui.uiOptions && window.qwebirc.ui.uiOptions.__cookie && window.qwebirc.ui.uiOptions.__cookie.get(20);
  if(existing && String(existing).toLowerCase() === lang) return; // no unnecessary writes
  } catch(_ignore) {}
  var attempts = 0;
  var maxAttempts = 4; // 0 + 3 retries
  var delay = 120; // ms
  function attempt() {
    attempts++;
    try {
      var uiOpts = window.qwebirc && window.qwebirc.ui && window.qwebirc.ui.uiOptions;
      if(!uiOpts || !uiOpts.__cookie) {
  // Attempt: if uiOptions exists but no __cookie (not _setup yet?) initialize
        try {
          if(uiOpts && !uiOpts.__cookie && typeof Hash !== 'undefined' && Hash.Cookie) {
            uiOpts.__cookie = new Hash.Cookie('opt1', {duration:3650, autoSave:false});
  /* cookie created on-the-fly */
          }
        } catch(_ce) {}
      } else {
        uiOpts.__cookie.set(20, lang);
        var saved = uiOpts.__cookie.save();
  // Validation: read back immediately
        var readBack = null;
        try { readBack = uiOpts.__cookie.get(20); } catch(_e) {}
  if(readBack && String(readBack).toLowerCase() === lang) return; // success -> stop
      }
    } catch(e) {
  /* ignore */
    }
    if(attempts < maxAttempts) setTimeout(attempt, delay);
  }
  attempt();
}

function afterOptionsInit() {
  loadLocaleIndex().then(function(list){
    var filtered = __filterLocaleEntries(list);
    try { integrateLanguagesIntoOptions(filtered); } catch(e) {}
    var supported = filtered.map(function(e){ return e.code; });
  // Order: Cookie -> Browser -> existing config -> en -> first
    var cookieLang = null; 
    try { var oc = window.qwebirc.ui.uiOptions.__cookie; cookieLang = oc && oc.get(20); } catch(e) {}
    var current = null;
  // 1. Manual selection (session flag) has highest priority
    if(window.__qwebircManualLanguage && supported.indexOf(window.__qwebircManualLanguage) !== -1) {
      current = window.__qwebircManualLanguage;
  }
    // 2. Cookie
    if(!current && cookieLang && supported.indexOf(String(cookieLang).toLowerCase()) !== -1) {
      current = String(cookieLang).toLowerCase();
    }
    if(!current) {
      var nav = (navigator.language || navigator.userLanguage || '').toLowerCase();
      var candidates = [];
      if(nav) { candidates.push(nav); candidates.push(nav.split('-')[0]); }
      if(Array.isArray(navigator.languages)) {
        navigator.languages.forEach(function(l){ if(!l) return; var lc = l.toLowerCase(); candidates.push(lc); candidates.push(lc.split('-')[0]); });
      }
      // Duplikate entfernen
      var seen = {}; candidates = candidates.filter(function(c){ if(!c) return false; if(seen[c]) return false; seen[c]=true; return true; });
      for(var i=0;i<candidates.length && !current;i++) {
        if(supported.indexOf(candidates[i]) !== -1) current = candidates[i];
      }
    }
    if(!current) {
      var cfg = window.qwebirc.config && window.qwebirc.config.LANGUAGE && window.qwebirc.config.LANGUAGE.toLowerCase();
      if(cfg && supported.indexOf(cfg) !== -1) current = cfg;
    }
    if(!current) current = supported.indexOf('en')!==-1?'en':(supported[0]||'en');
    current = setLanguageInternal(current, supported);
  // Consume manual flag once
  if(window.__qwebircManualLanguage) try { delete window.__qwebircManualLanguage; } catch(e) { window.__qwebircManualLanguage = null; }
    return loadLocale(current).then(function(){ return {lang: current, supported: supported}; });
  }).then(function(ctx){
    localizeOptionsLabels();
    // persistieren
    try { var oc2 = window.qwebirc.ui.uiOptions.__cookie; if(oc2) { if(oc2.get(20) !== ctx.lang) { oc2.set(20, ctx.lang); oc2.save(); } } } catch(e) {}
  // Sicherheits-Retry nach kompletter Initialisierung
  try { persistLanguageRobust(ctx.lang); } catch(e) {}
    // Offenes Optionspane aktualisieren
    if(window.qwebirc.ui.activeWindow && window.qwebirc.ui.activeWindow.identifier === 'optionspane') {
      if(window.qwebirc.ui.activeWindow.translate) try { window.qwebirc.ui.activeWindow.translate(ctx.lang); } catch(e) {}
    }
  // Fire translators
    try { if(window.qwebirc.i18n.__translators) window.qwebirc.i18n.__translators.forEach(function(fn){ try{ fn(ctx.lang); }catch(e){} }); } catch(e) {}
    try { window.dispatchEvent(new CustomEvent('qwebirc:languageChanged', {detail:{lang:ctx.lang}})); } catch(e) {}
  });
}

// Diese Funktion muss nach der Options-Initialisierung aufgerufen werden

function loadLocale(lang) {
  if(!lang || typeof lang !== 'string' || lang === 'undefined') lang = 'en';
  lang = lang.toLowerCase();
  var chain = [];
  if(lang !== 'en') chain.push('en');
  if(lang.indexOf('-') > -1) {
    var base = lang.split('-')[0];
    if(base && base !== 'en' && base !== lang) chain.push(base);
  }
  chain.push(lang);
  // Duplikate entfernen
  var seen = {};
  chain = chain.filter(function(c){ if(seen[c]) return false; seen[c]=true; return true; });
  var fetchOne = function(code){
    return fetch('/locales/' + code + '.json')
      .then(function(r){ if(!r.ok) throw new Error('nf'); return r.json(); })
      .catch(function(){ return null; });
  };
  var deepMerge = function(target, source){
    if(!source) return target;
    for(var k in source) if(source.hasOwnProperty(k)) {
      if(source[k] && typeof source[k] === 'object' && !Array.isArray(source[k])) {
        if(!target[k] || typeof target[k] !== 'object') target[k] = {};
        deepMerge(target[k], source[k]);
      } else {
        target[k] = source[k];
      }
    }
    return target;
  };
  return Promise.all(chain.map(fetchOne)).then(function(parts){
    var merged = {};
    parts.forEach(function(p){ deepMerge(merged, p); });
    window.qwebirc = window.qwebirc || {};
    window.qwebirc.i18n = window.qwebirc.i18n || {};
    window.qwebirc.i18n[lang] = merged;
    return merged;
  });
}

function loadLocaleIndex() {
  return fetch('/locales/index.json')
    .then(function(r){ if(!r.ok) throw new Error('no index'); return r.json(); })
    .catch(function(){ return []; });
}

function __filterLocaleEntries(list) {
  if(!list || !list.length) return [];
  return list.filter(function(entry){
    if(!entry) return false;
    if(!entry.code) return false;
    var code = String(entry.code).toLowerCase();
    if(code === 'index' || code === 'manifest') return false;
    if(!entry.name || typeof entry.name !== 'string') return false;
    if(!/^([a-z]{2,3})(-[a-z0-9]{2,8})*$/i.test(code)) return false;
    entry.code = code;
    return true;
  });
}

function integrateLanguagesIntoOptions(list) {
  if(!list || !list.length) return;
  list = __filterLocaleEntries(list);
  if(!list.length) return;
  // Find LANGUAGE option in qwebirc.config.DEFAULT_OPTIONS (original structure) and in DefaultOptions instances
  var applyList = function(optArr) {
    if(!optArr) return;
    for(var i=0;i<optArr.length;i++) {
      var o = optArr[i];
      if(o[1] === 'LANGUAGE') {
  // Replace options list
        o[5] = list.map(function(entry){ return [entry.name, entry.code]; });
  // Adjust default position if current language not present
        var current = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
        var idx = o[5].findIndex(function(x){ return x[1] === current; });
        if(idx < 0) idx = 0;
        o[3] = idx; // default index
        break;
      }
    }
  };
  try { applyList(qwebirc.config && qwebirc.config.DEFAULT_OPTIONS); } catch(e) {}
  // Bereits erzeugte RadioOption Instanzen updaten
  if(window.qwebirc && window.qwebirc.config && window.qwebirc.config.DefaultOptions) {
    window.qwebirc.config.DefaultOptions.forEach(function(inst){
      if(inst && inst.prefix === 'LANGUAGE') {
        inst.options = list.map(function(entry){ return [entry.name, entry.code]; });
  // Keep value if possible
        var cur = inst.value || (window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
        var found = inst.options.findIndex(function(x){ return x[1] === cur; });
        if(found < 0) found = 0;
        inst.defaultposition = found;
        inst.value = inst.options[found][1];
      }
    });
  }
  // Falls Select bereits gerendert ist, Optionen ersetzen ohne kompletten Rebuild
  var sel = document.getElementById('qwebirc-language-select');
  if(sel) {
    var currentLang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
  // If currentLang not present in new list, fall back to first valid language and update config
    if(!list.some(function(e){ return e.code === currentLang; })) {
  /* fallback to first entry */
      currentLang = list[0].code;
      if(window.qwebirc && window.qwebirc.config) window.qwebirc.config.LANGUAGE = currentLang;
      if(window.qwebirc && window.qwebirc.ui && window.qwebirc.ui.uiOptions && window.qwebirc.ui.uiOptions.optionHash && window.qwebirc.ui.uiOptions.optionHash['LANGUAGE']) {
        window.qwebirc.ui.uiOptions.optionHash['LANGUAGE'].value = currentLang;
      }
    }
    sel.innerHTML = '';
    list.forEach(function(entry){
      var opt = document.createElement('option');
      opt.value = entry.code;
      opt.textContent = entry.name;
      if(entry.code === currentLang) opt.selected = true;
      sel.appendChild(opt);
    });
    try {
    sel.value = currentLang; // ensure
    } catch(e) {}
  }
  // If OptionsPane open, rebuild select
  if(window.qwebirc && window.qwebirc.ui && window.qwebirc.ui.activeWindow && window.qwebirc.ui.activeWindow.identifier === 'optionspane') {
    if(window.qwebirc.ui.activeWindow.rebuild) window.qwebirc.ui.activeWindow.rebuild();
  }
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
