qwebirc.ui.AboutPane = new Class({
  Implements: [Events],
  initialize: function(parent) {
  this.type = 'aboutpane';
    var delayfn = function() { parent.set("html", "<div class=\"loading\">Loading. . .</div>"); };
  var delayfn = function() { parent.set("html", "<div class=\"loading\">Loading. . .</div>"); };
    var cb = delayfn.delay(500);
    
    var r = qwebirc.ui.RequestTransformHTML({url: qwebirc.global.staticBaseURL + "panes/about.html", update: parent, onSuccess: function() {
      $clear(cb);
      var closeBtn = parent.getElement("input[class=close]");
      var versionDiv = parent.getElement("div[class=version]");
      if(versionDiv) versionDiv.set("text", "v" + qwebirc.VERSION);
      var applyTranslations = function(){
        try {
          var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
          var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang];
          if(closeBtn && i18n && i18n.options) {
            // Versuche spezifische Keys, fallback auf EMBED_BTN_CLOSE oder CANCEL
            closeBtn.value = i18n.options.EMBED_BTN_CLOSE || i18n.options.CANCEL || closeBtn.value;
          }
        } catch(e) {}
      };
      applyTranslations();
      applyTranslations();
      if(window.qwebirc && typeof window.qwebirc.registerTranslator === 'function') {
        window.qwebirc.registerTranslator(applyTranslations);
      }
      window.addEventListener('qwebirc:languageChanged', function(){ applyTranslations(); });
      if(closeBtn) closeBtn.addEvent("click", function() { this.fireEvent("close"); }.bind(this));
    }.bind(this)});
    r.get();
  }
});
