qwebirc.ui.ConnectPane = new Class({
  Implements: [Events],
  initialize: function(parent, options) {
    var callback = options.callback, initialNickname = options.initialNickname, initialChannels = options.initialChannels, autoConnect = options.autoConnect, autoNick = options.autoNick;
    this.options = options;
    this.cookie = new Hash.Cookie("optconn", {duration: 3650, autoSave: false});
    var uiOptions = options.uiOptions;
    this.__windowName = "authgate_" + Math.floor(Math.random() * 100000);

    var delayfn = function() { parent.set("html", "<div class=\"loading\">Loading. . .</div>"); };
    var cb = delayfn.delay(500);

    var r = qwebirc.ui.RequestTransformHTML({
      url: qwebirc.global.staticBaseURL + "panes/connect.html",
      update: parent,
      onSuccess: function() {
          // CAPTCHA-Widget dynamisch einfügen, wenn aktiviert
          var captchaType = window.CAPTCHA_TYPE;
          var captchaSiteKey = window.CAPTCHA_SITE_KEY;
          if (captchaType && captchaSiteKey) {
            var loginForm = parent.getElement('tr[name=loginbox] form');
            if (loginForm) {
              var captchaRow = document.createElement('tr');
              captchaRow.className = 'captcha-row';
              var td = document.createElement('td');
              td.colSpan = 2;
              if (captchaType === 'recaptcha') {
                td.innerHTML = '<div id="recaptcha-container"></div>';
                var script = document.createElement('script');
                script.src = 'https://www.google.com/recaptcha/api.js';
                script.async = true;
                script.defer = true;
                document.body.appendChild(script);
                window.renderRecaptcha = function() {
                  if (window.grecaptcha) {
                    window.grecaptcha.render('recaptcha-container', {
                      'sitekey': captchaSiteKey
                    });
                  }
                };
                script.onload = function() { setTimeout(window.renderRecaptcha, 100); };
              } else if (captchaType === 'turnstile') {
                td.innerHTML = '<div class="cf-turnstile" data-sitekey="' + captchaSiteKey + '"></div>';
                var script = document.createElement('script');
                script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
                script.async = true;
                script.defer = true;
                document.body.appendChild(script);
              }
              captchaRow.appendChild(td);
              var table = loginForm.querySelector('table');
              if (table) {
                // Finde die Zeile mit dem Button
                var rows = table.getElementsByTagName('tr');
                var inserted = false;
                for (var i = 0; i < rows.length; i++) {
                  if (rows[i].getAttribute('name') === 'connectbutton') {
                    table.insertBefore(captchaRow, rows[i]);
                    inserted = true;
                    break;
                  }
                }
                if (!inserted) {
                  table.appendChild(captchaRow);
                }
              }
            }
          }
        // SASL-Login-Felder und Checkbox initial ausblenden, wenn SASL_LOGIN_ENABLED nicht aktiv
        if(typeof window.SASL_LOGIN_ENABLED !== 'undefined' && !window.SASL_LOGIN_ENABLED) {
          // Login-Formular
          var loginForm = parent.getElement('tr[name=loginbox] form');
          if(loginForm) {
            var saslCheckbox = loginForm.getElement('#show_sasl_fields');
            if(saslCheckbox) saslCheckbox.parentNode.parentNode.remove();
            loginForm.getElements('.sasl-row').each(function(row){ row.remove(); });
          }
          // Confirm-Dialog
          var confirmForm = parent.getElement('tr[name=confirmbox] form');
          if(confirmForm) {
            var saslCheckboxConfirm = confirmForm.getElement('#show_sasl_fields_confirm');
            if(saslCheckboxConfirm) saslCheckboxConfirm.parentNode.parentNode.remove();
            confirmForm.getElements('.sasl-row').each(function(row){ row.remove(); });
          }
        }
        // Passwort-Einblendfunktion für beide Passwortfelder
        var pwToggle = parent.getElement('#show_sasl_password');
        var pwField = parent.getElement('#sasl_password');
        if(pwToggle && pwField) {
          pwToggle.addEvent('change', function() {
            pwField.type = this.checked ? 'text' : 'password';
          });
        }
        var pwToggle2 = parent.getElement('#show_confirm_sasl_password');
        var pwField2 = parent.getElement('#confirm_sasl_password');
        if(pwToggle2 && pwField2) {
          pwToggle2.addEvent('change', function() {
            pwField2.type = this.checked ? 'text' : 'password';
          });
        }

        // SASL-Felder erst nach Laden des HTML und Setzen des Flags einblenden
        // Checkbox-Logik für SASL-Felder
        var self = this;
        // Login-Formular (Nickname/Channels)
        var loginForm = parent.getElement('tr[name=loginbox] form');
        if (loginForm) {
          var saslCheckbox = loginForm.getElement('#show_sasl_fields');
          var saslUserField = loginForm.getElement('#sasl_username');
          var saslPassField = loginForm.getElement('#sasl_password');
          // Standardmäßig ausblenden
          loginForm.getElements('.sasl-row').setStyle('display', 'none');
          // Aus Cookie wiederherstellen
          var savedUser = self.cookie.get('sasl_username');
          var savedPass = self.cookie.get('sasl_password');
          if(saslCheckbox && (savedUser || savedPass)) {
            saslCheckbox.checked = true;
            loginForm.getElements('.sasl-row').setStyle('display', '');
            if(saslUserField && savedUser) saslUserField.value = savedUser;
            if(saslPassField && savedPass) saslPassField.value = savedPass;
          }
          if (saslCheckbox) {
            saslCheckbox.addEvent('change', function() {
              var checked = this.checked;
              loginForm.getElements('.sasl-row').setStyle('display', checked ? '' : 'none');
              if(checked && saslUserField && saslPassField) {
                var savedUser = self.cookie.get('sasl_username');
                var savedPass = self.cookie.get('sasl_password');
                if(savedUser) saslUserField.value = savedUser;
                if(savedPass) saslPassField.value = savedPass;
              }
            });
          }
        }
        // Confirm-Dialog
        var confirmForm = parent.getElement('tr[name=confirmbox] form');
        if (confirmForm) {
          var saslCheckboxConfirm = confirmForm.getElement('#show_sasl_fields_confirm');
          var saslUserFieldConfirm = confirmForm.getElement('#confirm_sasl_username');
          var saslPassFieldConfirm = confirmForm.getElement('#confirm_sasl_password');
          // Standardmäßig ausblenden
          confirmForm.getElements('.sasl-row').setStyle('display', 'none');
          // Aus Cookie wiederherstellen
          var savedUser = self.cookie.get('sasl_username');
          var savedPass = self.cookie.get('sasl_password');
          if(saslCheckboxConfirm && (savedUser || savedPass)) {
            saslCheckboxConfirm.checked = true;
            confirmForm.getElements('.sasl-row').setStyle('display', '');
            if(saslUserFieldConfirm && savedUser) saslUserFieldConfirm.value = savedUser;
            if(saslPassFieldConfirm && savedPass) saslPassFieldConfirm.value = savedPass;
          }
          if (saslCheckboxConfirm) {
            saslCheckboxConfirm.addEvent('change', function() {
              var checked = this.checked;
              confirmForm.getElements('.sasl-row').setStyle('display', checked ? '' : 'none');
              if(checked && saslUserFieldConfirm && saslPassFieldConfirm) {
                var savedUser = self.cookie.get('sasl_username');
                var savedPass = self.cookie.get('sasl_password');
                if(savedUser) saslUserFieldConfirm.value = savedUser;
                if(savedPass) saslPassFieldConfirm.value = savedPass;
              }
            });
          }
        }
        $clear(cb);

        var rootElement = parent.getElement("[name=connectroot]");
        this.rootElement = rootElement;

        this.util.exec = function(n, x) { rootElement.getElements(n).each(x); };
        var util = this.util;
        var exec = util.exec;

        var box = (autoConnect ? "confirm" : "login");
        exec("[name=" + box + "box]", util.setVisible(true));

  // Explicitly copy SASL fields when switching to confirm
        if (autoConnect) {
          // Login-Formular suchen (immer das erste)
          var loginUser = rootElement.getElements("input[name=sasl_username]")[0];
          var loginPass = rootElement.getElements("input[name=sasl_password]")[0];
          // Confirm-Dialog-Felder (immer das zweite)
          var confirmUser = rootElement.getElements("input[name=sasl_username]")[1];
          var confirmPass = rootElement.getElements("input[name=sasl_password]")[1];
          if (loginUser && confirmUser) confirmUser.value = loginUser.value;
          if (loginPass && confirmPass) confirmPass.value = loginPass.value;
        }

      if(!autoConnect) {
        if($defined(uiOptions.logoURL)) {
          var logoBar = parent.getElement("[class=bar-logo]");
          if(uiOptions.logoURL)
            logoBar.setAttribute("style", "background: url(" + uiOptions.logoURL + ") no-repeat center top; _filter: progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" + uiOptions.logoURL + "',sizingMethod='crop');");

          util.makeVisible(parent.getElement("[name=loginheader]"));
        } else {
          util.makeVisible(parent.getElement("[name=nologologinheader]"));
        }
      }

      if(initialNickname === null && initialChannels === null) {
        var n2 = this.cookie.get("nickname");
        if(n2 !== null)
          initialNickname = n2;

        var c2 = this.cookie.get("autojoin");
        if(c2 !== null)
          initialChannels = c2;
      }

      if(initialChannels === null) {
        initialChannels = "";
      }

      exec("[name=nickname]", util.setText(initialNickname));
      exec("[name=channels]", util.setText(initialChannels));
      exec("[name=prettychannels]", function(node) { this.__buildPrettyChannels(node, initialChannels); }.bind(this));
      exec("[name=networkname]", util.setText(uiOptions.networkName));

      var focus = "connect";
      if(autoConnect) {
        if(!autoNick)
          exec("[name=nickselected]", util.makeVisible);

        this.__validate = this.__validateConfirmData;
      } else {
	if(!initialNickname) {
          focus = "nickname";
        } else if(initialNickname && !initialChannels) {
          focus = "channels";
        }

        this.__validate = this.__validateLoginData;
      }

      var login = qwebirc.auth.loggedin(true);
      if(login) {
        exec("[name=authname]", util.setText(login[0]));
        exec("[name=connectbutton]", util.makeVisible);
        exec("[name=loginstatus]", util.makeVisible);
      } else {
        if(qwebirc.ui.isAuthRequired()) {
          exec("[name=loginconnectbutton]", util.makeVisible);
          if(focus == "connect")
            focus = "loginconnect";
        } else {
          exec("[name=connectbutton]", util.makeVisible);
          exec("[name=loginbutton]", util.makeVisible);
        }
      }

  // ...SASL-Login-Felder werden jetzt rein im HTML verwaltet...

      if(window == window.top) /* don't focus when we're iframe'd */
        exec("[name=" + focus + "]", util.focus);
      exec("[name=connect]", util.attachClick(this.__connect.bind(this)));
      exec("[name=loginconnect]", util.attachClick(this.__loginConnect.bind(this)));

      exec("[name=login]", util.attachClick(this.__login.bind(this)));

      if(qwebirc.ui.isHideAuth())
       exec("[name=login]", util.setVisible(false));
    }.bind(this)});
    r.get();
  },
  util: {
    makeVisible: function(x) { x.setStyle("display", ""); },
    setVisible: function(y) { return function(x) { x.setStyle("display", y ? "" : "none"); }; },
    focus: function(x) { try { x.focus(); } catch (e) { } },
    attachClick: function(fn) { return function(x) { x.addListener("click", fn); } },
    setText: function(x) { return function(y) {
      if(typeof y.value === "undefined") {
        y.set("text", x);
      } else {
        y.value = x === null ? "" : x;
      }
    } }
  },
  validate: function() {
    return this.__validate();
  },
  __connect: function(e) {
    new Event(e).stop();
    // Zeige Status in Typing-Bar
    if(window.qwebircConnectStatus) window.qwebircConnectStatus.show();
    var data = this.validate();
    if(data === false) {
      if(window.qwebircConnectStatus) window.qwebircConnectStatus.hide();
      return;
    }
      // CAPTCHA-Token holen, falls aktiviert
      var captchaType = window.CAPTCHA_TYPE;
      if (captchaType) {
        var token = null;
        if (captchaType === 'recaptcha' && window.grecaptcha) {
          token = window.grecaptcha.getResponse();
        } else if (captchaType === 'turnstile' && window.turnstile) {
          var widgets = document.getElementsByClassName('cf-turnstile');
          if (widgets.length > 0) {
            token = window.turnstile.getResponse(widgets[0]);
          }
        }
        if (!token) {
          alert('Please complete the CAPTCHA.');
          if(window.qwebircConnectStatus) window.qwebircConnectStatus.hide();
          return;
        }
        data['captcha_token'] = token;
      }
    this.__cancelLogin();
    this.fireEvent("close");
    // SASL speichern oder löschen je nach Checkbox
    var saslCheckbox = this.rootElement.getElement('#show_sasl_fields');
    var saslUserField = this.rootElement.getElement('#sasl_username');
    var saslPassField = this.rootElement.getElement('#sasl_password');
    if(saslCheckbox && saslCheckbox.checked && saslUserField && saslPassField) {
      this.cookie.set('sasl_username', saslUserField.value);
      this.cookie.set('sasl_password', saslPassField.value);
    } else {
      this.cookie.erase('sasl_username');
      this.cookie.erase('sasl_password');
    }
    this.cookie.extend(data);
    this.cookie.save();
    // Verbindung wird asynchron hergestellt, Status bleibt bis hide() aufgerufen wird
    this.options.callback(data);
  },
  __cancelLogin: function(noUIModifications) {
    if(this.__cancelLoginCallback)
      this.__cancelLoginCallback(noUIModifications);
  },
  __loginConnect: function(e) {
    new Event(e).stop();
    // Zeige Status in Typing-Bar
    if(window.qwebircConnectStatus) window.qwebircConnectStatus.show();
    if(this.validate() === false) {
      if(window.qwebircConnectStatus) window.qwebircConnectStatus.hide();
      return;
    }
    this.__performLogin(function() {
      var data = this.validate();
      if(data === false) {
        /* we're logged in -- show the normal join button */
        this.util.exec("[name=connectbutton]", this.util.setVisible(true));
        if(window.qwebircConnectStatus) window.qwebircConnectStatus.hide();
        return;
      }
      this.fireEvent("close");
      this.options.callback(data);
    }.bind(this), "loginconnectbutton");
  },
  __login: function(e) {
    new Event(e).stop();

    this.__cancelLogin(true);

    this.__performLogin(function() {
      var focus = "connect";
      if(!this.options.autoConnect) {
        var nick = this.rootElement.getElement("input[name=nickname]").value, chan = this.rootElement.getElement("input[name=channels]").value;
        if(!nick) {
          focus = "nickname";
        } else if(!chan) {
          focus = "channels";
        }
      }
      this.util.exec("[name=" + focus + "]", this.util.focus);        
    }.bind(this), "login");
  },
  __performLogin: function(callback, calleename) {
    var handle = window.open("/auth", this.__windowName, "status=0,toolbar=0,location=1,menubar=0,directories=0,resizable=0,scrollbars=1,height=280,width=550");

    if(handle === null || handle === undefined) {
      return;
    }

    var closeDetector = function() {
      if(handle.closed)
        this.__cancelLoginCallback();
    }.bind(this);
    var closeCallback = closeDetector.periodical(100);

    this.__cancelLoginCallback = function(noUIModifications) {
      $clear(closeCallback);

      try {
        handle.close();
      } catch(e) {
      }

      if(!noUIModifications) {
        this.util.exec("[name=loggingin]", this.util.setVisible(false));
        this.util.exec("[name=" + calleename + "]", this.util.setVisible(true));
      }
      this.__cancelLoginCallback = null;
    }.bind(this);

    __qwebircAuthCallback = function(qticket, qticketUsername, realExpiry) {
      if (typeof sessionStorage === "undefined")
      {
        alert("No session storage support in this browser -- login not supported");
        this.__cancelLoginCallback(false);
        return;
      }

      this.__cancelLoginCallback(true);
      sessionStorage.setItem("qticket", qticket);
      sessionStorage.setItem("qticket_username", qticketUsername);
      sessionStorage.setItem("qticket_expiry", realExpiry);

      this.util.exec("[name=loggingin]", this.util.setVisible(false));
      this.util.exec("[name=loginstatus]", this.util.setVisible(true));
      this.util.exec("[name=authname]", this.util.setText(qticketUsername));
      callback();
    }.bind(this);

    this.util.exec("[name=loggingin]", this.util.setVisible(true));
    this.util.exec("[name=" + calleename + "]", this.util.setVisible(false));
  },
  __validateConfirmData: function() {
    // Immer das sichtbare SASL-Feld verwenden (z.B. im Confirm-Dialog)
    var saslUser = Array.from(this.rootElement.querySelectorAll('input[name="sasl_username"]')).find(function(el) {
      return el.offsetParent !== null;
    });
    var saslPass = Array.from(this.rootElement.querySelectorAll('input[name="sasl_password"]')).find(function(el) {
      return el.offsetParent !== null;
    });
    return {
      nickname: this.options.initialNickname,
      autojoin: this.options.initialChannels,
      sasl_username: saslUser ? saslUser.value : "",
      sasl_password: saslPass ? saslPass.value : ""
    };
  },
  __validateLoginData: function() {
    var nick = this.rootElement.getElement("input[name=nickname]"), chan = this.rootElement.getElement("input[name=channels]");
    var nickname = nick.value;
    var chans = chan.value;
    if(chans == "#") chans = "";
    if(!nickname) {
      alert("You must supply a nickname.");
      nick.focus();
      return false;
    }
    var stripped = qwebirc.global.nicknameValidator.validate(nickname);
    if(stripped != nickname) {
      nick.value = stripped;
      alert("Your nickname was invalid and has been corrected; please check your altered nickname and try again.");
      nick.focus();
      return false;
    }
    var data = {nickname: nickname, autojoin: chans};
    // Immer das sichtbare SASL-Feld verwenden (z.B. im Login-Dialog)
    var saslUser = Array.from(this.rootElement.querySelectorAll('input[name="sasl_username"]')).find(function(el) {
      return el.offsetParent !== null;
    });
    var saslPass = Array.from(this.rootElement.querySelectorAll('input[name="sasl_password"]')).find(function(el) {
      return el.offsetParent !== null;
    });
    data["sasl_username"] = saslUser ? saslUser.value : "";
    data["sasl_password"] = saslPass ? saslPass.value : "";
    return data;
  },
  __buildPrettyChannels: function(node, channels) {
    var c = channels.split(" ")[0].split(",");
    node.appendChild(document.createTextNode("channel" + ((c.length>1)?"s":"") + " "));
    for(var i=0;i<c.length;i++) {
      if((c.length > 1) && (i == c.length - 1)) {
        node.appendChild(document.createTextNode(" and "));
      } else if(i > 0) {
        node.appendChild(document.createTextNode(", "));
      }
      node.appendChild(new Element("b").set("text", c[i]));
    }
  }
});

qwebirc.ui.LoginBox2 = function(parentElement, callback, initialNickname, initialChannels, networkName) {
/*
  if(qwebirc.auth.enabled()) {
    if(qwebirc.auth.passAuth()) {
      var authRow = createRow("Auth to services:");
      var authCheckBox = qwebirc.util.createInput("checkbox", authRow, "connect_auth_to_services", false);
    
      var usernameBox = new Element("input");
      var usernameRow = createRow("Username:", usernameBox, {display: "none"})[0];
    
      var passwordRow = createRow("Password:", null, {display: "none"});
      var passwordBox = qwebirc.util.createInput("password", passwordRow[1], "connect_auth_password");

      authCheckBox.addEvent("click", function(e) { qwebirc.ui.authShowHide(authCheckBox, authRow, usernameBox, usernameRow, passwordRow[0]) });
    } else if(qwebirc.auth.bouncerAuth()) {
      var passwordRow = createRow("Password:");
      var passwordBox = qwebirc.util.createInput("password", passwordRow, "connect_auth_password");
    }
  }
  */

  var connbutton = new Element("input", {"type": "submit"});
  connbutton.set("value", "Connect");
  var r = createRow(undefined, connbutton);
  
  form.addEvent("submit", function(e) {
    new Event(e).stop();

    var nickname = nick.value;
    var chans = chan.value;
    if(chans == "#") /* sorry channel "#" :P */
      chans = "";

    if(!nickname) {
      alert("You must supply a nickname.");
      nick.focus();
      return;
    }
    var stripped = qwebirc.global.nicknameValidator.validate(nickname);
    if(stripped != nickname) {
      nick.value = stripped;
      alert("Your nickname was invalid and has been corrected; please check your altered nickname and press Connect again.");
      nick.focus();
      return;
    }
    
    var data = {"nickname": nickname, "autojoin": chans};
    if(qwebirc.auth.enabled()) {
      if(qwebirc.auth.passAuth() && authCheckBox.checked) {
          if(!usernameBox.value || !passwordBox.value) {
            alert("You must supply your username and password in auth mode.");
            if(!usernameBox.value) {
              usernameBox.focus();
            } else {
              passwordBox.focus();
            }
            return;
          }
          
          data["serverPassword"] = usernameBox.value + " " + passwordBox.value;
      } else if(qwebirc.auth.bouncerAuth()) {
        if(!passwordBox.value) {
          alert("You must supply a password.");
          passwordBox.focus();
          return;
        }
        
        data["serverPassword"] = passwordBox.value;
      }
    }
    parentElement.removeChild(outerbox);
    
    callback(data);
  }.bind(this));
    
  nick.set("value", initialNickname);
  chan.set("value", initialChannels);

  if(window == window.top)
    nick.focus();
}

qwebirc.ui.authShowHide = function(checkbox, authRow, usernameBox, usernameRow, passwordRow) {
  var visible = checkbox.checked;
  var display = visible?null:"none";
  usernameRow.setStyle("display", display);
  passwordRow.setStyle("display", display);
  
  if(visible) {
//    authRow.parentNode.setStyle("display", "none");
    usernameBox.focus();
  }
}

qwebirc.ui.isAuthRequired = (function() {
  var args = qwebirc.util.parseURI(String(document.location));
  var value = $defined(args) && args.get("authrequired");
  return function() {
    return value && qwebirc.auth.enabled();
  };
})();

qwebirc.ui.isHideAuth = (function() {
  var args = qwebirc.util.parseURI(String(document.location));
  var value = $defined(args) && args.get("hideauth");
  return function() {
    return value;
  };
})();

