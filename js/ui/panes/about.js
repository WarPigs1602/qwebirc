qwebirc.ui.AboutPane = new Class({
  Implements: [Events],
  initialize: function(parent) {
  this.type = 'aboutpane';
    var delayfn = function() { parent.set("html", "<div class=\"loading\">Loading. . .</div>"); };
    var cb = delayfn.delay(500);
    
    var r = qwebirc.ui.RequestTransformHTML({url: qwebirc.global.staticBaseURL + "panes/about.html", update: parent, onSuccess: function() {
      $clear(cb);
      var oldClose = parent.getElement("input[class=close]");
      var closeBtn = null;
      if(oldClose) {
        // Ersetze Standard-Button durch SVG Icon
        closeBtn = new Element('span', {'class':'pane-close','title': oldClose.value || 'Close'});
        try {
          var svgns = 'http://www.w3.org/2000/svg';
          var svg = document.createElementNS(svgns,'svg'); svg.setAttribute('viewBox','0 0 14 14');
          var l1 = document.createElementNS(svgns,'line'); l1.setAttribute('x1','3'); l1.setAttribute('y1','3'); l1.setAttribute('x2','11'); l1.setAttribute('y2','11');
          var l2 = document.createElementNS(svgns,'line'); l2.setAttribute('x1','11'); l2.setAttribute('y1','3'); l2.setAttribute('x2','3'); l2.setAttribute('y2','11');
          svg.appendChild(l1); svg.appendChild(l2); closeBtn.appendChild(svg);
        } catch(e) { closeBtn.set('text','×'); }
        oldClose.parentNode.insertBefore(closeBtn, oldClose);
        oldClose.parentNode.removeChild(oldClose);
        parent.addClass('pane-host');
      }
      var versionDiv = parent.getElement("div[class=version]");
      if(versionDiv) versionDiv.set("text", "v" + qwebirc.VERSION);
      var applyTranslations = function(){
        try {
          var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
          var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang];
          if(closeBtn && i18n && i18n.options) {
            // Versuche spezifische Keys, fallback auf EMBED_BTN_CLOSE oder CANCEL
            closeBtn.set('title', i18n.options.EMBED_BTN_CLOSE || i18n.options.CANCEL || closeBtn.get('title'));
          }
        } catch(e) {}
      };
      applyTranslations();
      applyTranslations();
      if(window.qwebirc && typeof window.qwebirc.registerTranslator === 'function') {
        window.qwebirc.registerTranslator(applyTranslations);
      }
      window.addEventListener('qwebirc:languageChanged', function(){ applyTranslations(); });
      if(closeBtn) closeBtn.addEvent('click', function(e){ new Event(e).stop(); this.fireEvent('close'); }.bind(this));
    }.bind(this)});
    r.get();
  }
});
