/* NEEDS converting to plain HTML! */
qwebirc.ui.EmbedWizardStep = new Class({
  Implements: [Options, Events],
  options: {
    "title": "",
    "first": "",
    "hint": "",
    "middle": null,
    "premove": null,
    "example": ""
  },
  initialize: function(parent, options) {
    this.setOptions(options);
    this.parent = parent;
  },
  show: function() {
    this.parent.title.set("html", this.options.title);
    this.parent.firstRow.set("html", this.options.first);
    this.parent.hint.set("html", this.options.hint);
    this.parent.example.set("text", this.options.example);
    
    while(this.parent.middleRow.childNodes.length > 0)
      this.parent.middleRow.removeChild(this.parent.middleRow.childNodes[0]);
      
    if($defined(this.options.middle))
      this.parent.middleRow.appendChild(this.options.middle);
    
    this.fireEvent("show");
  }
});

qwebirc.ui.EmbedWizard = new Class({
  Implements: [Options, Events],
  options: {
    uiOptions: null,
    optionsCallback: null,
    baseURL: "http://webchat.quakenet.org/"
  },
  initialize: function(parent, options) {
  this.type = 'embeddedwizard';
    /* for some unknown reason setOptions doesn't work... */
    this.options.uiOptions = options.uiOptions;
    this.options.baseURL = options.baseURL;
    this.options.optionsCallback = options.optionsCallback;
    this.create(parent);
    this.addSteps();
    // Registrierung für Sprachwechsel
    var self = this;
    this.__refreshBound = this.refreshTranslations.bind(this);
    if(window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n.registerTranslator) {
      window.qwebirc.i18n.registerTranslator(this.__refreshBound);
    }
    window.addEventListener('qwebirc:languageChanged', function(ev){ self.refreshTranslations(ev.detail.lang); });
  },
  refreshTranslations: function(lang) {
    // Komplett neu aufbauen, um alle Strings zu aktualisieren
    if(!this.t) return;
    while(this.t.firstChild) this.t.removeChild(this.t.firstChild);
    this.create(this.t);
    this.addSteps();
  },
  create: function(parent) {
    this.t = parent;

  try { this.t.addClass('pane-host'); } catch(e) {}
  this.__injectCloseButton();

    var titleRow = this.newRow();
    this.title = new Element("h2");
    this.title.setStyle("margin-top", "0px");
    this.title.setStyle("margin-bottom", "5px");
    titleRow.appendChild(this.title);
    
    this.firstRow = this.newRow();
    this.middleRow = this.newRow();
    var hintRow = this.newRow();
    this.hint = new Element("div");
    this.hint.setStyle("font-size", "0.8em");
    this.hint.setStyle("font-style", "italic");
    hintRow.appendChild(this.hint);
    var exampleRow = this.newRow();
    this.example = new Element("pre");
    exampleRow.appendChild(this.example);
    
    var nextRow = this.newRow();
    nextRow.addClass("wizardcontrols");
    var backBtn = new Element("input");
    backBtn.type = "submit";
    backBtn.value = "< Back";
    backBtn.addEvent("click", this.back.bind(this));
    nextRow.appendChild(backBtn);
    
    var nextBtn = new Element("input");
    nextBtn.type = "submit";
    nextBtn.value = "Next >";
    nextRow.appendChild(nextBtn);
    nextBtn.addEvent("click", this.next.bind(this));
    
    this.nextBtn = nextBtn;
    this.backBtn = backBtn;
  },
  newRow: function() {
    var cell = new Element("div");
    this.t.appendChild(cell);
    return cell;
  },
  newStep: function(options) {
    return new qwebirc.ui.EmbedWizardStep(this, options);
  },
  newRadio: function(parent, text, name, selected) {
    var p = new Element("div");
    parent.appendChild(p);

    var id = qwebirc.util.generateID();
    var r = qwebirc.util.createInput("radio", p, name, selected, id);
    
    var label = new Element("label", {"for": id});
    label.appendChild(document.createTextNode(text));
    p.appendChild(label);
      
    return r;
  },
  addSteps: function() {
    var af = function(select) {
      if(Browser.Engine.trident) {
        var f = function() {
          this.focus();
          if(select)
            this.select();
        };
        f.delay(100, this, []);
      } else {
        this.focus();
        this.select();
      }
    };
  
    var self = this;
    function t(key, fallback) {
      var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
      var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang];
      return (i18n && i18n.options && i18n.options[key]) ? i18n.options[key] : (fallback || key);
    }
    this.welcome = this.newStep({
      "title": t('EMBED_WIZ_TITLE', 'Add webchat to your website'),
      "first": t('EMBED_WIZ_WELCOME', 'This wizard will help you create an embedded client...')
    });
    
    this.chanBox = new Element("input");
    this.chanBox.addClass("text");
    this.chans = this.newStep({
      "title": t('EMBED_SET_CHANNELS','Set channels'),
      "first": t('EMBED_ENTER_CHANNELS','Enter the channels you would like the client to join on startup:'),
      "hint": t('EMBED_CHANNELS_HINT','You can supply multiple channels by seperating them with a comma, e.g.:'),
      "example": "#rogue,#eu-mage",
      middle: this.chanBox
    }).addEvent("show", af.bind(this.chanBox));
    
    var customnickDiv = new Element("div");
    this.customnick = this.newStep({
      "title": t('EMBED_CHOOSE_NICK_MODE','Choose a nickname mode'),
      "first": t('EMBED_CHOOSE_NICK_DESC','At startup would you like the client to use a random nickname, a preset nickname or a nickname of the users choice?'),
      "hint": t('EMBED_CHOOSE_NICK_HINT','It is recommended that you only use a preset nickname if the client is for your own personal use.'),
      middle: customnickDiv
    });

    this.choosenick = this.newRadio(customnickDiv, t('EMBED_NICK_USER_CHOOSE','Make the user choose a nickname.'), "nick", true);
    this.randnick = this.newRadio(customnickDiv, t('EMBED_NICK_RANDOM','Use a random nickname, e.g. qwebirc12883.'), "nick");
    this.presetnick = this.newRadio(customnickDiv, t('EMBED_NICK_PRESET','Use a preset nickname of your choice.'), "nick");
    
    var promptdiv = new Element("form");
    this.connectdialog = this.newStep({
      "title": t('EMBED_CONNECT_DIALOG_TITLE','Display connect dialog?'),
      "first": t('EMBED_CONNECT_DIALOG_QUESTION','Do you want the user to be shown the connect dialog (with the values you have supplied pre-entered) or just a connect confirmation?'),
      middle: promptdiv,
      "hint": t('EMBED_CONNECT_DIALOG_HINT','You need to display the dialog if you want the user to be able to set their nickname before connecting.')
    });

    var changeOptions = new Element("div");
  this.currentLF = this.newRadio(changeOptions, t('EMBED_USE_CURRENT_LF','Use the current look and feel ('), "lookandfeel", true);

    var alterButton = new Element("input");
    alterButton.type = "submit";
  alterButton.value = t('EMBED_ALTER','alter');
    alterButton.addEvent("click", this.options.optionsCallback);
    changeOptions.firstChild.appendChild(alterButton);
    changeOptions.firstChild.appendChild(document.createTextNode(")."));
    
  this.defaultLF = this.newRadio(changeOptions, t('EMBED_USE_DEFAULT_LF','Use the default look and feel.'), "lookandfeel");
    
    this.lookandfeel = this.newStep({
      "title": t('EMBED_CONFIGURE_LF','Configure look and feel'),
      "first": t('EMBED_CONFIGURE_LF_DESC','The look and feel will be copied from the current settings.'),
      middle: changeOptions
    });
    
  var autoconnect = this.newRadio(promptdiv, t('EMBED_CONNECT_WITHOUT_DIALOG','Connect without displaying the dialog.'), "prompt", true);
  this.connectdialogr = this.newRadio(promptdiv, t('EMBED_SHOW_DIALOG','Show the connect dialog.'), "prompt");
    
    this.nicknameBox = new Element("input");
    this.nicknameBox.addClass("text");
  this.nickname = this.newStep({
    "title": t('EMBED_SET_NICK','Set nickname'),
    "first": t('EMBED_ENTER_NICK','Enter the nickname you would like the client to use by default:'),
      "premove": function() {
        if(this.nicknameBox.value == "") {
      alert(t('EMBED_NICK_REQUIRED','You must supply a nickname.'));
          this.nicknameBox.focus();
          return false;
        }
        var v = qwebirc.global.nicknameValidator.validate(this.nicknameBox.value, true);
        if(v != this.nicknameBox.value) {
          this.nicknameBox.value = v;
      alert(t('EMBED_NICK_CORRECTED','The supplied nickname was invalid and has been corrected.'));
          this.nicknameBox.focus();
          return false;
         }
        return true;
      }.bind(this),
      middle: this.nicknameBox,
    hint: t('EMBED_NICK_HINT','If you use a . (dot/period) then it will be substituted with a random number.')
    }).addEvent("show", af.bind(this.nicknameBox));

    var codeDiv = new Element("div");
    this.finish = this.newStep({
      "title": t('EMBED_FINISHED','Finished!'),
      "first": t('EMBED_CUSTOM_LINK','Your custom link is:'),
      middle: codeDiv
    }).addEvent("show", function() {
      var alink = new Element("a");
      var abox = new Element("input");
      abox.addClass("iframetext");
      var url = this.generateURL(false);
      
      alink.href = url;
      alink.target = "_blank";
      alink.setAttribute("rel", "noopener noreferrer");
      alink.appendChild(document.createTextNode(url));
      abox.value = "<iframe src=\"" + url + "\" width=\"647\" height=\"400\"></iframe>";
      
      var mBox = [
        alink,
        new Element("br"), new Element("br"),
  document.createTextNode(t('EMBED_EMBED_CODE','You can embed this into your page with the following code:')),
        new Element("br"),
        abox
      ];

      while(codeDiv.childNodes.length > 0)
        codeDiv.removeChild(codeDiv.childNodes[0]);
        
      mBox.forEach(function(x) {
        codeDiv.appendChild(x);
      });
      
      af.bind(abox)(true);
      abox.addEvent("click", function() {
        this.select();
      }.bind(abox));
    }.bind(this));

    this.updateSteps();
    this.step = 0;
    
    this.showStep();
  },
  updateSteps: function() {
    this.steps = [this.welcome, this.customnick];
    
    if(this.presetnick.checked)
      this.steps.push(this.nickname);
      
    this.steps.push(this.chans);
    
    if(this.chanBox.value != "" && !this.choosenick.checked)
      this.steps.push(this.connectdialog);
    
    this.steps.push(this.lookandfeel);
    this.steps.push(this.finish);
  },
  showStep: function() {
    this.backBtn.disabled = !(this.step > 0);
    
    function updateNextLabel() {
      var last = (this.step >= this.steps.length - 1);
      var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
      var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang];
      var opts = i18n && i18n.options;
      var nextLabel = opts && opts.EMBED_BTN_NEXT || 'Next >';
      var closeLabel = opts && opts.EMBED_BTN_CLOSE || 'Close';
      this.nextBtn.value = last ? closeLabel : nextLabel;
      var backLabel = opts && opts.EMBED_BTN_BACK || '< Back';
      this.backBtn.value = backLabel;
    }
    updateNextLabel.call(this);
      
    this.steps[this.step].show();
  },
  next: function() {
    var pm = this.steps[this.step].options.premove;
    
    if(pm && !pm())
      return;
      
    this.updateSteps();
    if(this.step >= this.steps.length - 1) {
      this.close();
      return;
    }
  this.step = this.step + 1;
  this.showStep();
  // Labels neu setzen
  var evt = document.createEvent('Event'); evt.initEvent('qwebirc:languageRefresh', true, true); window.dispatchEvent(evt);
  },
  close: function() {
    this.fireEvent("close");
  },
  back: function() {
    if(this.step <= 0)
      return;

      this.step = this.step - 1;
  this.showStep();
  var evt = document.createEvent('Event'); evt.initEvent('qwebirc:languageRefresh', true, true); window.dispatchEvent(evt);
  },
  generateURL: function() {
    var chans = this.chanBox.value;
    var nick = this.nicknameBox.value;
    var connectdialog = this.connectdialogr.checked && chans != "" && !this.choosenick.checked;

    var URL = [];
    if(this.presetnick.checked) {
      URL.push("nick=" + escape(nick));
    } else if(!this.choosenick.checked) {
      URL.push("randomnick=1");
    }
    
    if(chans) {
      var d = chans.split(",");
      var d2 = [];
      
      d.forEach(function(x) {
        if(x.charAt(0) == '#')
          x = x.substring(1);
          
        d2.push(x);
      });
      
      URL.push("channels=" + escape(d2.join(",")));
    }
    
    if(connectdialog)
      URL.push("prompt=1");

    if(this.currentLF.checked) {
      var uioptions = this.options.uiOptions.serialise();
      if(uioptions != "")
        URL.push("uio=" + uioptions);
    }
    
  return qwebirc.global.baseURL + (URL.length>0?"?":"") + URL.join("&");
  }
});

// Close-Button für Embed Wizard
qwebirc.ui.EmbedWizard.prototype.__injectCloseButton = function() {
  var host = this.t;
  if(!host || host.getElement('.pane-close')) return;
  var btn = new Element('span', { 'class': 'pane-close', 'title': 'Close'});
  try {
    var svgns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgns, 'svg');
    svg.setAttribute('viewBox','0 0 14 14');
    var l1 = document.createElementNS(svgns, 'line'); l1.setAttribute('x1','3'); l1.setAttribute('y1','3'); l1.setAttribute('x2','11'); l1.setAttribute('y2','11');
    var l2 = document.createElementNS(svgns, 'line'); l2.setAttribute('x1','11'); l2.setAttribute('y1','3'); l2.setAttribute('x2','3'); l2.setAttribute('y2','11');
    svg.appendChild(l1); svg.appendChild(l2);
    btn.appendChild(svg);
  } catch(e) { btn.set('text','×'); }
  btn.addEvent('click', function(e){ new Event(e).stop(); this.fireEvent('close'); }.bind(this));
  host.appendChild(btn);
  var updateTitle = function(){
    try { var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en'; var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang]; if(i18n && i18n.options && (i18n.options.EMBED_BTN_CLOSE || i18n.options.CANCEL)) btn.set('title', i18n.options.EMBED_BTN_CLOSE || i18n.options.CANCEL); } catch(err) {}
  };
  updateTitle();
  window.addEventListener('qwebirc:languageChanged', updateTitle);
};
