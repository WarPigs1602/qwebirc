
qwebirc.ui.style.ModifiableStylesheet = new Class({
  initialize: function() {
    // Nur synchrones Setup, keine Daten laden
  },
  load: function(url) {
  // Instance method: loads the stylesheet and initializes the instance
    return this.__getStylesheet(url).then(function(data) {
      var n = this.__parseStylesheet(data, url);
      this.__cssText = n.cssText;
      this.rules = n.rules;
      this.__tag = this.__createTag();
      return this;
    }.bind(this));
  },
});

// Static helper method for convenient initialization
qwebirc.ui.style.ModifiableStylesheet.load = function(url) {
  var instance = new qwebirc.ui.style.ModifiableStylesheet();
  return instance.load(url);
};
qwebirc.ui.style.ModifiableStylesheet.implement({
  __createTag: function() {
    var tag = document.createElement("style");
    tag.type = "text/css";
    tag.media = "all";
    document.getElementsByTagName("head")[0].appendChild(tag);
    return tag;
  },
  __getStylesheet: function(url) {
  // Returns a promise that yields the content
    return new Promise(function(resolve, reject) {
      var r = new Request({url: url, async: true});
      r.addEvent("complete", function(x) {
        resolve(x);
      });
      r.addEvent("failure", function() {
        reject(new Error("Stylesheet konnte nicht geladen werden: " + url));
      });
      r.get();
    });
  },
  __setStylesheet: function(stylesheet) {
    var node = this.__tag;
    if(node.styleSheet) { /* IE */
      node.styleSheet.cssText = stylesheet;
    } else {
      var d = document.createTextNode(stylesheet);
      node.appendChild(d);
      while(node.childNodes.length > 1)
        node.removeChild(node.firstChild);
    }
  },
  __parseStylesheet: function(data, url) {
    var lines = data.replace("\r\n", "\n").split("\n");
    var baseURL = new URI(".", {base: url}).toString();
    var rules = {};
    var i;
    for(i=0;i<lines.length;i++) {
      var line = lines[i];
      if(line.trim() === "")
        break;
      var tokens = line.splitMax("=", 2);
      if(tokens.length != 2)
        continue;
      rules[tokens[0]] = tokens[1];
    }
    var cssLines = [];
    for(;i<lines.length;i++) {
      var line = lines[i];
      line = line.replaceAll("$(base_url)", baseURL);
      cssLines.push(line);
    }
    return {cssText: cssLines.join("\n"), rules: rules};
  },
  set: function(mutator) {
  if(mutator == null)
      mutator = function(x) { return x; };
    var text = this.__cssText;
    for(var key in this.rules) {
      var s = this.rules[key].split(",");
      var value = mutator.pass(s);
      text = text.replaceAll("$(" + key + ")", value);
    }
    this.__setStylesheet(text);
  }
});
