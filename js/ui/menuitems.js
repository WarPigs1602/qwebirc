// i18n-aware command label helpers
function __qwebircGetTabLabel(key, fallback) {
  try {
    var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
    var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang];
    if(i18n && i18n.options && i18n.options[key]) return i18n.options[key];
  } catch(e) {}
  return fallback;
}

qwebirc.ui.UI_COMMANDS_P1 = [
  [function(){ return __qwebircGetTabLabel('TAB_OPTIONS', 'Options'); }, "options"],
  [function(){ return __qwebircGetTabLabel('TAB_EMBED', 'Add webchat to your site'); }, "embedded"]
];

qwebirc.ui.UI_COMMANDS_P2 = [
  [function(){ return __qwebircGetTabLabel('TAB_ABOUT', 'About mwebirc'); }, "about"]
];

if (window.qwebirc && typeof window.qwebirc.registerTranslator === 'function') {
  window.qwebirc.registerTranslator(function(){
    // Reassign arrays so new menus pick up translations
    qwebirc.ui.UI_COMMANDS_P1 = [
      [function(){ return __qwebircGetTabLabel('TAB_OPTIONS', 'Options'); }, "options"],
      [function(){ return __qwebircGetTabLabel('TAB_EMBED', 'Add webchat to your site'); }, "embedded"]
    ];
    qwebirc.ui.UI_COMMANDS_P2 = [
      [function(){ return __qwebircGetTabLabel('TAB_ABOUT', 'About mwebirc'); }, "about"]
    ];
  });
}

qwebirc.ui.MENU_ITEMS = function() {
  var isOpped = function(nick) {
    var channel = this.name; /* window name */
    var myNick = this.client.nickname;

    return this.client.nickOnChanHasAtLeastPrefix(myNick, channel, "@");
  };

  var isVoiced = function(nick) {
    var channel = this.name;
    var myNick = this.client.nickname;

    return this.client.nickOnChanHasPrefix(myNick, channel, "+");
  };

  var targetOpped = function(nick) {
    var channel = this.name;
    return this.client.nickOnChanHasPrefix(nick, channel, "@");
  };

  var targetVoiced = function(nick) {
    var channel = this.name;
    return this.client.nickOnChanHasPrefix(nick, channel, "+");
  };

  var isIgnored = function(nick) {
    return this.client.isIgnored(nick);
  };

  var isOwner = function(nick) {
    var channel = this.name;
    var myNick = this.client.nickname;
    return this.client.nickOnChanHasPrefix(myNick, channel, "~");
  };
  var isAdmin = function(nick) {
    var channel = this.name;
    var myNick = this.client.nickname;
    return this.client.nickOnChanHasPrefix(myNick, channel, "&");
  };
  var isHalfop = function(nick) {
    var channel = this.name;
    var myNick = this.client.nickname;
    return this.client.nickOnChanHasPrefix(myNick, channel, "%");
  };
  var targetOwner = function(nick) {
    var channel = this.name;
    return this.client.nickOnChanHasPrefix(nick, channel, "~");
  };
  var targetAdmin = function(nick) {
    var channel = this.name;
    return this.client.nickOnChanHasPrefix(nick, channel, "&");
  };
  var targetHalfop = function(nick) {
    var channel = this.name;
    return this.client.nickOnChanHasPrefix(nick, channel, "%");
  };

  var invert = qwebirc.util.invertFn, compose = qwebirc.util.composeAnd;
  
  var command = function(cmd) {
    return function(nick) { this.client.exec("/" + cmd + " " + nick); };
  };
  
  // Helper: checks if our prefix is at least as high as the target prefix
  var hasAtLeastPrefix = function(nick, channel, prefix) {
    var entry = this.client.tracker.getNickOnChannel(nick, channel);
    var myPrefixes = entry ? entry.prefixes : "";
    var myPrio = this.client.getPrefixPriority(myPrefixes);
    var targetPrio = this.client.prefixes.indexOf(prefix);
    return myPrio <= targetPrio;
  };

  // Predicate for privilege assignment based on hierarchy
  var canSet = function(prefix) {
    return function(nick) {
      var channel = this.name;
      var myNick = this.client.nickname;
      return hasAtLeastPrefix.call(this, myNick, channel, prefix);
    };
  };
  var canUnset = canSet; // Unset ist identisch
  var targetHas = function(prefix) {
    return function(nick) {
      var channel = this.name;
      return this.client.nickOnChanHasPrefix(nick, channel, prefix);
    };
  };
  var targetNotHas = function(prefix) {
    return function(nick) {
      var channel = this.name;
      return !this.client.nickOnChanHasPrefix(nick, channel, prefix);
    };
  };

  var L = function(key, fallback) { return __qwebircGetTabLabel(key, fallback); };
  return [
    { text: function(){ return L('NICKMENU_OWNER','owner'); }, fn: function(nick) { this.client.exec("/MODE " + this.name + " +q " + nick); }, predicate: compose(canSet("~"), targetNotHas("~")) },
    { text: function(){ return L('NICKMENU_DEOWNER','deowner'); }, fn: function(nick) { this.client.exec("/MODE " + this.name + " -q " + nick); }, predicate: compose(canSet("~"), targetHas("~")) },
    { text: function(){ return L('NICKMENU_ADMIN','admin'); }, fn: function(nick) { this.client.exec("/MODE " + this.name + " +a " + nick); }, predicate: compose(canSet("&"), targetNotHas("&")) },
    { text: function(){ return L('NICKMENU_DEADMIN','deadmin'); }, fn: function(nick) { this.client.exec("/MODE " + this.name + " -a " + nick); }, predicate: compose(canSet("&"), targetHas("&")) },
    { text: function(){ return L('NICKMENU_OP','op'); }, fn: function(nick) { this.client.exec("/MODE " + this.name + " +o " + nick); }, predicate: compose(canSet("@"), targetNotHas("@")) },
    { text: function(){ return L('NICKMENU_DEOP','deop'); }, fn: function(nick) { this.client.exec("/MODE " + this.name + " -o " + nick); }, predicate: compose(canSet("@"), targetHas("@")) },
    { text: function(){ return L('NICKMENU_HALFOP','halfop'); }, fn: function(nick) { this.client.exec("/MODE " + this.name + " +h " + nick); }, predicate: compose(canSet("%"), targetNotHas("%")) },
    { text: function(){ return L('NICKMENU_DEHALFOP','dehalfop'); }, fn: function(nick) { this.client.exec("/MODE " + this.name + " -h " + nick); }, predicate: compose(canSet("%"), targetHas("%")) },
    { text: function(){ return L('NICKMENU_VOICE','voice'); }, fn: function(nick) { this.client.exec("/MODE " + this.name + " +v " + nick); }, predicate: compose(canSet("+"), targetNotHas("+")) },
    { text: function(){ return L('NICKMENU_DEVOICE','devoice'); }, fn: function(nick) { this.client.exec("/MODE " + this.name + " -v " + nick); }, predicate: compose(canSet("+"), targetHas("+")) },
    { text: function(){ return L('NICKMENU_WHOIS','whois'); }, fn: command("whois"), predicate: true },
    { text: function(){ return L('NICKMENU_QUERY','query'); }, fn: command("query"), predicate: true },
    { text: function(){ return L('NICKMENU_SLAP','slap'); }, fn: function(nick) { this.client.exec("/ME slaps " + nick + " around a bit with a large fishbot"); }, predicate: true },
    { text: function(){ return L('NICKMENU_KICK','kick'); }, fn: function(nick) { this.client.exec("/KICK " + nick + " wibble"); }, predicate: canSet("@") },
    { text: function(){ return L('NICKMENU_IGNORE','ignore'); }, fn: command("ignore"), predicate: invert(isIgnored) },
    { text: function(){ return L('NICKMENU_UNIGNORE','unignore'); }, fn: command("unignore"), predicate: isIgnored }
  ];
}();
