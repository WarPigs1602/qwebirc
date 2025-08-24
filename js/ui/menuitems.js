qwebirc.ui.UI_COMMANDS_P1 = [
  ["Options", "options"],
  ["Add webchat to your site", "embedded"]
];

qwebirc.ui.UI_COMMANDS_P2 = [
  ["About qwebirc", "about"]
];

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
  
  // Hilfsfunktion: Prüft, ob der eigene Prefix mindestens so hoch ist wie der Zielprefix
  var hasAtLeastPrefix = function(nick, channel, prefix) {
    var entry = this.client.tracker.getNickOnChannel(nick, channel);
    var myPrefixes = entry ? entry.prefixes : "";
    var myPrio = this.client.getPrefixPriority(myPrefixes);
    var targetPrio = this.client.prefixes.indexOf(prefix);
    return myPrio <= targetPrio;
  };

  // Predicate für Rechtevergabe nach Hierarchie
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

  return [
    { text: "owner", fn: function(nick) { this.client.exec("/MODE " + this.name + " +q " + nick); }, predicate: compose(canSet("~"), targetNotHas("~")) },
    { text: "deowner", fn: function(nick) { this.client.exec("/MODE " + this.name + " -q " + nick); }, predicate: compose(canSet("~"), targetHas("~")) },
    { text: "admin", fn: function(nick) { this.client.exec("/MODE " + this.name + " +a " + nick); }, predicate: compose(canSet("&"), targetNotHas("&")) },
    { text: "deadmin", fn: function(nick) { this.client.exec("/MODE " + this.name + " -a " + nick); }, predicate: compose(canSet("&"), targetHas("&")) },
    { text: "op", fn: function(nick) { this.client.exec("/MODE " + this.name + " +o " + nick); }, predicate: compose(canSet("@"), targetNotHas("@")) },
    { text: "deop", fn: function(nick) { this.client.exec("/MODE " + this.name + " -o " + nick); }, predicate: compose(canSet("@"), targetHas("@")) },
    { text: "halfop", fn: function(nick) { this.client.exec("/MODE " + this.name + " +h " + nick); }, predicate: compose(canSet("%"), targetNotHas("%")) },
    { text: "dehalfop", fn: function(nick) { this.client.exec("/MODE " + this.name + " -h " + nick); }, predicate: compose(canSet("%"), targetHas("%")) },
    { text: "voice", fn: function(nick) { this.client.exec("/MODE " + this.name + " +v " + nick); }, predicate: compose(canSet("+"), targetNotHas("+")) },
    { text: "devoice", fn: function(nick) { this.client.exec("/MODE " + this.name + " -v " + nick); }, predicate: compose(canSet("+"), targetHas("+")) },
    {
      text: "whois", 
      fn: command("whois"),
      predicate: true
    },
    {
      text: "query",
      fn: command("query"),
      predicate: true
    },
    {
      text: "slap",
      fn: function(nick) { this.client.exec("/ME slaps " + nick + " around a bit with a large fishbot"); },
      predicate: true
    },
    {
      text: "kick", /* TODO: disappear when we're deopped */
      fn: function(nick) { this.client.exec("/KICK " + nick + " wibble"); },
      predicate: canSet("@")
    },
    {
      text: "ignore",
      fn: command("ignore"),
      predicate: invert(isIgnored)
    },
    {
      text: "unignore",
      fn: command("unignore"),
      predicate: isIgnored
    }
  ];
}();
