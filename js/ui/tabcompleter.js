qwebirc.ui.TabCompleterFactory = new Class({
  initialize: function(ui) {
    this.ui = ui;
    this.reset();
  },
  tabComplete: function(textBox, backwards) {
    var text = textBox.value;
    
  if(this.obj == null) {
      this.incr = 1;
      
      var w = this.ui.getActiveWindow();
      if(!w)
        return;
        
      var startingWord = qwebirc.util.getEnclosedWord(text, qwebirc.util.getCaretPos(textBox));
      var preword = "", word = "", postword = "";
  if(startingWord != null) {
        var preword = text.substring(0, startingWord[0]);
        var word = startingWord[1];
        var postword = text.substring(startingWord[0] + word.length);
      }
      
      var ltext = text.toLowerCase();
      if(text == "") {
        preword = "/msg ";
        obj = qwebirc.ui.QueryTabCompleter;
      } else if(w.client.isChannel(word)) {
        obj = qwebirc.ui.ChannelNameTabCompleter;
      } else if(ltext.match(/^\/(q|query|msg) /i)) {
        obj = qwebirc.ui.QueryTabCompleter;
      } else if(w.type == qwebirc.ui.WINDOW_QUERY) {
        obj = qwebirc.ui.QueryNickTabCompleter;
      } else if(w.type == qwebirc.ui.WINDOW_CHANNEL) {
        /* "slug[TAB]" == "slug: " */
        if(preword == "") {
          if((postword != "") && postword.charAt(0) == " ") {
            postword = ":" + postword;
          } else {
            postword = ": " + postword;
          }
          this.incr++;
        }
        obj = qwebirc.ui.ChannelUsersTabCompleter;
      } else {
        return;
      }

      if(postword == "")
        postword = " ";
      
      this.obj = new obj(preword, word, postword, w);
  if(this.obj == null)
        return;
    }
      
    var r = this.obj.get(backwards);
  if(r == null)
      return;
      
    textBox.value = r[1];
    qwebirc.util.setCaretPos(textBox, r[0] + this.incr);
  },
  reset: function() {
    this.obj = null;
  }
});

qwebirc.ui.TabIterator = new Class({
  initialize: function(client, prefix, list) {
    this.prefix = prefix;
  if(list == null || list.length == 0) {
      this.list = null;
    } else {
      var l = [];
      
      var prefixl = qwebirc.irc.toIRCCompletion(client, prefix);
      
      /* convert the nick list to IRC lower case, stripping all non letters
       * before comparisions */
      for(var i=0;i<list.length;i++) {
        var l2 = qwebirc.irc.toIRCCompletion(client, list[i]);
        
        if(l2.startsWith(prefixl))
          l.push(list[i]);
      }
      this.list = l;
    }
    
    this.pos = -1;
  },
  next: function() {
    /*
     * ideally next would do the list gubbins recursively, but no JS engine currently
     * support tail recursion :(
     */
  if(this.list == null || this.list.length == 0)
      return null;
    
    this.pos = this.pos + 1;
    if(this.pos >= this.list.length)
      this.pos = 0;
      
    return this.list[this.pos];
  },
  prev: function() {
  if(this.list == null || this.list.length == 0)
      return null;

    this.pos = this.pos - 1;
    if(this.pos < 0)
      this.pos = this.list.length - 1;

    return this.list[this.pos];
  }
});

qwebirc.ui.BaseTabCompleter = new Class({
  initialize: function(client, prefix, existingNick, suffix, list) {
    this.existingNick = existingNick;
    this.prefix = prefix;
    this.suffix = suffix;
    this.iterator = new qwebirc.ui.TabIterator(client, existingNick, list);
  },
  get: function(backwards) {
    var n = backwards ? this.iterator.prev() : this.iterator.next();
  if(n == null)
      return null;
      
    var p = this.prefix + n;
    return [p.length, p + this.suffix];
  }
});

qwebirc.ui.QueryTabCompleter = new Class({
  Extends: qwebirc.ui.BaseTabCompleter,
  initialize: function(prefix, existingNick, suffix, window) {
    var client = window.client;
    var list = [];
    if (client.lastNicks && client.lastNicks.slice) {
      list = client.lastNicks.slice();
    }
    if (window.type == qwebirc.ui.WINDOW_QUERY) {
      var current = window.name;
      var lowerCurrent = client.toIRCLower ? client.toIRCLower(current) : current.toLowerCase();
      for (var i = 0; i < list.length; i++) {
        var lnick = client.toIRCLower ? client.toIRCLower(list[i]) : list[i].toLowerCase();
        if (lnick === lowerCurrent) {
          list.splice(i, 1);
          break;
        }
      }
      list.sort(function(a, b) { return a.toLowerCase().localeCompare(b.toLowerCase()); });
      list.unshift(current);
    } else {
      list.sort(function(a, b) { return a.toLowerCase().localeCompare(b.toLowerCase()); });
    }
    this.parent(client, prefix, existingNick, suffix, list);
  }
});

qwebirc.ui.QueryNickTabCompleter = new Class({
  Extends: qwebirc.ui.BaseTabCompleter,
  initialize: function(prefix, existingText, suffix, window) {
    var nick = window.name
    this.parent(window.client, prefix, existingText, suffix, [nick]);
  }
});

qwebirc.ui.ChannelNameTabCompleter = new Class({
  Extends: qwebirc.ui.BaseTabCompleter,
  initialize: function(prefix, existingText, suffix, window) {
    /* Aktuellen Channel zuerst, Rest alphabetisch (case-insensitive). */
    var client = window.client;
    var channels = [];
    if (client.channels) {
      if (typeof client.channels.values === 'function') {
        channels = client.channels.values().slice();
      } else if (Array.isArray(client.channels)) {
        channels = client.channels.slice();
      }
    }

    var currentLower = client.toIRCLower ? client.toIRCLower(window.name) : window.name.toLowerCase();
    for (var i = 0; i < channels.length; i++) {
      var cLower = client.toIRCLower ? client.toIRCLower(channels[i]) : channels[i].toLowerCase();
      if (cLower === currentLower) {
        channels.splice(i, 1);
        break;
      }
    }

    channels.sort(function(a, b) {
      return a.toLowerCase().localeCompare(b.toLowerCase());
    });

    if (client.isChannel(window.name)) {
      channels.unshift(window.name);
    }

    this.parent(client, prefix, existingText, suffix, channels);
  }
});

qwebirc.ui.ChannelUsersTabCompleter = new Class({
  Extends: qwebirc.ui.BaseTabCompleter,
  initialize: function(prefix, existingText, suffix, window) {
    var nc = window.client.tracker.getSortedByLastSpokePrefix(window.name);

    this.parent(window.client, prefix, existingText, suffix, nc);
  }
});
