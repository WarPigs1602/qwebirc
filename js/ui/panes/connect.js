qwebirc.ui.ConnectPane = new Class({
  Implements: [Events],
  initialize: function(parent, options) {
    var callback = options.callback, initialNickname = options.initialNickname, initialChannels = options.initialChannels, autoConnect = options.autoConnect, autoNick = options.autoNick;
    this.options = options;
    this.cookie = new Hash.Cookie("optconn", {duration: 3650, autoSave: false});
    var uiOptions = options.uiOptions;
  this.__windowName = "authgate_" + Math.floor(Math.random() * 100000);
  // Bind method to instance so it is available inside async callback
  this.__buildPrettyChannels = this.__buildPrettyChannels.bind(this);


    // util-Objekt MUSS vor dem asynchronen Callback initialisiert werden!
    this.util = {
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
    };

    var delayfn = function() { parent.set("html", "<div class=\"loading\">Loading. . .</div>"); };
  var delayfn = function() { parent.set("html", "<div class=\"loading\">Loading. . .</div>"); };
  // Simple alert overlay for live-translatable messages
    if(!document.getElementById('qwebirc-alert-overlay')) {
      var ov = document.createElement('div');
      ov.id = 'qwebirc-alert-overlay';
      ov.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.45);z-index:99999;';
      var box = document.createElement('div');
      box.id = 'qwebirc-alert-box';
      box.style.cssText = 'background:#1e222d;color:#fff;padding:16px 18px;border-radius:8px;max-width:480px;font:14px/1.4 sans-serif;box-shadow:0 4px 18px rgba(0,0,0,0.4);';
      var msg = document.createElement('div');
      msg.id = 'qwebirc-alert-message';
      msg.style.marginBottom = '14px';
      var btn = document.createElement('button');
      btn.id = 'qwebirc-alert-close';
      btn.textContent = 'OK';
      btn.style.cssText = 'background:#3b82f6;color:#fff;border:none;padding:6px 14px;border-radius:4px;cursor:pointer;font-size:13px;';
      btn.addEventListener('click', function(){ ov.style.display='none'; });
      box.appendChild(msg); box.appendChild(btn); ov.appendChild(box); document.body.appendChild(ov);
      // If the connect pane was created inside the Classic UI, mark the
      // global alert overlay so Classic-scoped CSS selectors will match it.
      try {
        var a = parent;
        while (a) {
          if (a.classList && a.classList.contains('qwebirc-classicui')) {
            if (!ov.className || ov.className.indexOf('qwebirc-classicui') === -1) {
              ov.className = (ov.className + ' qwebirc-classicui').trim();
            }
            break;
          }
          a = a.parentNode;
        }
      } catch (e) {}
    }
    var selfAlert = this;
    window.qwebirc = window.qwebirc || {}; window.qwebirc.__lastAlert = window.qwebirc.__lastAlert || null;
    function showI18nAlert(key, fallback) {
      var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
      var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang] && window.qwebirc.i18n[lang].options;
      var text = (i18n && i18n[key]) || fallback || key;
      var ov = document.getElementById('qwebirc-alert-overlay');
      var msg = document.getElementById('qwebirc-alert-message');
      var btn = document.getElementById('qwebirc-alert-close');
      if(!ov || !msg) { alert(text); return; }
      msg.textContent = text;
  // Button label translatable if SAVE/CANCEL available – simple localisation here
      var okKey = 'OK';
      if(i18n && i18n.SAVE) btn.textContent = i18n.SAVE; else btn.textContent = 'OK';
  if(i18n && i18n.SAVE) btn.textContent = i18n.SAVE; else btn.textContent = 'OK';
      ov.style.display='flex';
      window.qwebirc.__lastAlert = {key:key, fallback:fallback};
    }
  // Register translator to retranslate any open alert
    var regA = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n.registerTranslator;
    if(typeof regA === 'function') regA(function(){
      if(window.qwebirc.__lastAlert) {
        var la = window.qwebirc.__lastAlert; showI18nAlert(la.key, la.fallback);
      }
    });
  // MooTools .delay ersetzt durch setTimeout
  var cb = setTimeout(delayfn, 500);

  var lang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
  // Register translator for later language change
  var register = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n.registerTranslator;
  var self = this;
  function translateCurrent(l){
    if(!self.rootElement) return;
    try {
  // Use existing translation logic if present
      var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[l] && window.qwebirc.i18n[l].options;
      function t(key, fallback) { return (i18n && i18n[key]) ? i18n[key] : (fallback || key); }
      var parent = self.rootElement.getParent ? self.rootElement.getParent() : document;
      var header = parent.querySelector('tr[name=nologologinheader] h1');
      if(header) header.innerHTML = t('CONNECT_TITLE', header.innerHTML).replace(/<span name="networkname"><\/span>/, '<span name="networkname"></span>');
      var nickLabel = parent.querySelector('label[for=loginnickname]');
      if(nickLabel) nickLabel.textContent = t('NICKNAME', nickLabel.textContent);
      var chanLabel = parent.querySelector('label[for=loginchannels]');
      if(chanLabel) chanLabel.textContent = t('CHANNELS', chanLabel.textContent);
      var userLabels = parent.querySelectorAll('label[for=sasl_username], label[for=confirm_sasl_username]');
      userLabels.forEach(function(lab){ lab.textContent = t('USERNAME', lab.textContent); });
      var passLabels = parent.querySelectorAll('label[for=sasl_password], label[for=confirm_sasl_password]');
      passLabels.forEach(function(lab){ lab.textContent = t('PASSWORD', lab.textContent); });
      var pwCheckboxes = parent.querySelectorAll('input#show_sasl_fields, input#show_sasl_fields_confirm');
      pwCheckboxes.forEach(function(box){ var label = box.parentNode; if(label && label.tagName==='LABEL' && label.childNodes[1]) label.childNodes[1].textContent = ' ' + t('I_HAVE_PASSWORD', label.childNodes[1].textContent.trim()); });
      var showPwSpans = parent.querySelectorAll('span[title="Show password"]');
      showPwSpans.forEach(function(span){
        span.set('html', '<svg style="width:14px;height:14px;vertical-align:middle" viewBox="0 0 24 24"><path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5m0 13c-3.04 0-5.5-2.46-5.5-5.5S8.96 6.5 12 6.5s5.5 2.46 5.5 5.5S15.04 17.5 12 17.5m0-9A3.5 3.5 0 0 0 8.5 12 3.5 3.5 0 0 0 12 15.5 3.5 3.5 0 0 0 15.5 12 3.5 3.5 0 0 0 12 8.5Z"/></svg>');
      });
      var joinButtons = parent.querySelectorAll('input[type=submit][name=connect]');
      joinButtons.forEach(function(btn){ btn.value = t('JOIN_CHAT', btn.value); });
    } catch(e) {}
  }
  if(typeof register === 'function') register(translateCurrent);
  window.addEventListener('qwebirc:languageChanged', function(ev){ translateCurrent(ev.detail.lang); });
  // Reference to instance for all callbacks (self already defined)
  // Lade Sprachdatei, falls noch nicht geladen
  (window.loadLocale ? window.loadLocale(lang) : Promise.resolve()).then(function() {
        // util-Objekt im Callback erneut setzen, damit es garantiert im richtigen Kontext ist
        self.util = self.util || {
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
        };
        var i18n = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang] && window.qwebirc.i18n[lang].options;
        function t(key, fallback) { return (i18n && i18n[key]) ? i18n[key] : (fallback || key); }
  // self.cookie is set in the constructor and must not be overwritten here

        var r = qwebirc.ui.RequestTransformHTML({
          url: qwebirc.global.staticBaseURL + "panes/connect.html",
          update: parent,
          onSuccess: function() {
              // Dynamically inject CAPTCHA widget if enabled
          var captchaType = window.CAPTCHA_TYPE;
          var captchaSiteKey = window.CAPTCHA_SITE_KEY;
          if (captchaType && captchaSiteKey) {
            var loginForm = parent.getElement('tr[name=loginbox] form');
            if (loginForm) {
              var captchaRow = document.createElement('tr');
              captchaRow.className = 'captcha-row';
              var td = document.createElement('td');
              td.colSpan = 2;

              // Reuse existing containers if present so widget state survives
              var existingRecaptcha = document.getElementById('recaptcha-container');
              var existingTurnstile = document.getElementById('turnstile-container');

              if (captchaType === 'recaptcha') {
                if (existingRecaptcha) {
                  // Move existing container into this pane so it remains visible
                  td.appendChild(existingRecaptcha);
                  // After moving, ensure grecaptcha reflows / is reset so it displays correctly
                  (function ensureRecaptchaVisible() {
                    try {
                      if (window.grecaptcha && typeof window.grecaptcha.reset === 'function' && typeof window.recaptchaWidgetId !== 'undefined') {
                        try { window.grecaptcha.reset(window.recaptchaWidgetId); } catch(e) {}
                      } else if (window.grecaptcha && typeof window.grecaptcha.render === 'function') {
                        try {
                          var maybeId = window.grecaptcha.render('recaptcha-container', { 'sitekey': captchaSiteKey });
                          if (typeof maybeId !== 'undefined') window.recaptchaWidgetId = maybeId;
                        } catch(e) {}
                      }
                    } catch(e) {}
                  })();
                } else {
                  td.innerHTML = '<div id="recaptcha-container"></div>';
                }

                // Load grecaptcha only if not already available or loading
                if (!window.grecaptcha && !window.__recaptchaScriptLoading && !window.__recaptchaScriptLoaded) {
                  window.__recaptchaScriptLoading = true;
                  var script = document.createElement('script');
                  script.src = 'https://www.google.com/recaptcha/api.js';
                  script.async = true;
                  script.defer = true;
                  script.onload = function() {
                    window.__recaptchaScriptLoaded = true;
                    window.__recaptchaScriptLoading = false;
                    setTimeout(function() {
                      try {
                        if (window.grecaptcha) {
                          // render and save widget id if returned
                          var id = window.grecaptcha.render('recaptcha-container', { 'sitekey': captchaSiteKey });
                          if (typeof id !== 'undefined') window.recaptchaWidgetId = id;
                        }
                      } catch(e) {}
                    }, 100);
                  };
                  script.onerror = function() {
                    window.__recaptchaFailed = true;
                    window.__recaptchaScriptLoading = false;
                    console.warn('[captcha] recaptcha script failed to load; continuing without CAPTCHA enforcement.');
                  };
                  document.body.appendChild(script);
                } else {
                  // If grecaptcha already exists, ensure widget is rendered and id stored
                  try {
                    if (window.grecaptcha) {
                      var maybeId = window.grecaptcha.render('recaptcha-container', { 'sitekey': captchaSiteKey });
                      if (typeof maybeId !== 'undefined') window.recaptchaWidgetId = maybeId;
                    }
                  } catch(e) {}
                }
                // Also attempt to reset/render shortly after insertion to handle
                // cases where the widget was previously rendered in a different
                // pane and needs a reflow when moved.
                setTimeout(function() {
                  try {
                    if (window.grecaptcha && typeof window.grecaptcha.reset === 'function' && typeof window.recaptchaWidgetId !== 'undefined') {
                      try { window.grecaptcha.reset(window.recaptchaWidgetId); } catch(e) {}
                    }
                  } catch(e) {}
                }, 150);
              } else if (captchaType === 'turnstile') {
                if (existingTurnstile) {
                  td.appendChild(existingTurnstile);
                  // Ensure turnstile is visible / rendered after moving
                  (function ensureTurnstileVisible(){
                    try {
                      if (window.turnstile && typeof window.turnstile.render === 'function') {
                        var el = document.querySelector('#turnstile-container .cf-turnstile');
                        // If element lacks data-widget-id try rendering
                        if (el && !el.getAttribute('data-widget-id')) {
                          try {
                            window.turnstile.render(el, { 'sitekey': captchaSiteKey });
                            setTimeout(function(){
                              try {
                                var el2 = document.querySelector('#turnstile-container .cf-turnstile');
                                if(el2) window.turnstileWidgetId = el2.getAttribute('data-widget-id') || null;
                              } catch(e) {}
                            }, 200);
                          } catch(e) {}
                        } else if (typeof window.turnstile.reset === 'function' && window.turnstileWidgetId) {
                          try { window.turnstile.reset(window.turnstileWidgetId); } catch(e) {}
                        }
                      }
                    } catch(e) {}
                  })();
                } else {
                  td.innerHTML = '<div id="turnstile-container"><div class="cf-turnstile" data-sitekey="' + captchaSiteKey + '"></div></div>';
                }

                // Only load script once (existing flags preserved in prior code)
                if(!window.__turnstileScriptLoading && !window.__turnstileScriptLoaded) {
                  var script = document.createElement('script');
                  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
                  script.async = true;
                  script.defer = true;
                  window.__turnstileScriptLoading = true;
                  script.onload = function(){
                    window.__turnstileScriptLoaded = true;
                    window.__turnstileScriptLoading = false;
                    // turnstile auto-renders; capture widget id if possible after small delay
                    setTimeout(function(){
                      try {
                        if(window.turnstile && !window.turnstileWidgetId) {
                          var el = document.querySelector('#turnstile-container .cf-turnstile');
                          if(el) {
                            window.turnstileWidgetId = el.getAttribute('data-widget-id') || null;
                          }
                        }
                      } catch(e) {}
                    }, 300);
                  };
                  script.onerror = function(){
                    window.__turnstileFailed = true;
                    window.__turnstileScriptLoading = false;
                    console.warn('[captcha] turnstile script failed to load; continuing without CAPTCHA enforcement.');
                  };
                  document.body.appendChild(script);
                } else {
                  // If already loaded, try to capture widget id now
                  setTimeout(function(){
                    try {
                      if(window.turnstile && !window.turnstileWidgetId) {
                        var el = document.querySelector('#turnstile-container .cf-turnstile');
                        if(el) {
                          window.turnstileWidgetId = el.getAttribute('data-widget-id') || null;
                        }
                      }
                    } catch(e) {}
                  }, 300);
                }
              }

              captchaRow.appendChild(td);
              var table = loginForm.querySelector('table');
              if (table) {
                // Find the row with the button
                var rows = table.getElementsByTagName('tr');
                var inserted = false;
                for (var i = 0; i < rows.length; i++) {
                  if (rows[i].getAttribute('name') === 'connectbutton') {
                    // Ensure rows[i] actually belongs to table
                    if (rows[i].parentNode === table) {
                      table.insertBefore(captchaRow, rows[i]);
                      inserted = true;
                      break;
                    } else if (rows[i].parentNode) {
                      rows[i].parentNode.insertBefore(captchaRow, rows[i]);
                      inserted = true;
                      break;
                    }
                  }
                }
                if (!inserted) {
                  table.appendChild(captchaRow);
                }
              }
            }
          }
  // Translate labels and buttons
  // Headline without logo
        var header = parent.querySelector('tr[name=nologologinheader] h1');
        if(header) header.innerHTML = t('CONNECT_TITLE', header.innerHTML).replace(/<span name="networkname"><\/span>/, '<span name="networkname"></span>');

  // Nickname/Channels labels
        var nickLabel = parent.querySelector('label[for=loginnickname]');
        if(nickLabel) nickLabel.textContent = t('NICKNAME', nickLabel.textContent);
        var chanLabel = parent.querySelector('label[for=loginchannels]');
        if(chanLabel) chanLabel.textContent = t('CHANNELS', chanLabel.textContent);

  // Password/Username labels
        var userLabels = parent.querySelectorAll('label[for=sasl_username], label[for=confirm_sasl_username]');
        userLabels.forEach(function(l){ l.textContent = t('USERNAME', l.textContent); });
        var passLabels = parent.querySelectorAll('label[for=sasl_password], label[for=confirm_sasl_password]');
        passLabels.forEach(function(l){ l.textContent = t('PASSWORD', l.textContent); });

  // Checkbox "I have a password"
        var pwCheckboxes = parent.querySelectorAll('input#show_sasl_fields, input#show_sasl_fields_confirm');
        pwCheckboxes.forEach(function(box){
          var label = box.parentNode;
          if(label && label.tagName === 'LABEL') label.childNodes[1].textContent = ' ' + t('I_HAVE_PASSWORD', label.childNodes[1].textContent);
        });

  // Show password (icon only, no text)
        var showPwSpans = parent.querySelectorAll('span[title="Show password"]');
        showPwSpans.forEach(function(span){
          span.set('html', '<svg style="width:14px;height:14px;vertical-align:middle" viewBox="0 0 24 24"><path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5m0 13c-3.04 0-5.5-2.46-5.5-5.5S8.96 6.5 12 6.5s5.5 2.46 5.5 5.5S15.04 17.5 12 17.5m0-9A3.5 3.5 0 0 0 8.5 12 3.5 3.5 0 0 0 12 15.5 3.5 3.5 0 0 0 15.5 12 3.5 3.5 0 0 0 12 8.5Z"/></svg>');
        });

  // "Join chat" button
        var joinButtons = parent.querySelectorAll('input[type=submit][name=connect]');
        joinButtons.forEach(function(btn){ btn.value = t('JOIN_CHAT', btn.value); });

  // ...existing code...
  // Hide SASL login fields and checkbox initially if SASL_LOGIN_ENABLED not active
        if(typeof window.SASL_LOGIN_ENABLED !== 'undefined' && !window.SASL_LOGIN_ENABLED) {
          // Login form
          var loginForm = parent.getElement('tr[name=loginbox] form');
          if(loginForm) {
            var saslCheckbox = loginForm.getElement('#show_sasl_fields');
            if(saslCheckbox) saslCheckbox.parentNode.parentNode.remove();
            loginForm.getElements('.sasl-row').each(function(row){ row.remove(); });
          }
          // Confirm dialog
          var confirmForm = parent.getElement('tr[name=confirmbox] form');
          if(confirmForm) {
            var saslCheckboxConfirm = confirmForm.getElement('#show_sasl_fields_confirm');
            if(saslCheckboxConfirm) saslCheckboxConfirm.parentNode.parentNode.remove();
            confirmForm.getElements('.sasl-row').each(function(row){ row.remove(); });
          }
        }
  // Password toggle for both password fields
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

  // Show SASL fields only after HTML load and flag set
  // Checkbox logic for SASL fields
  // self ist bereits korrekt auf die Instanz gesetzt
  // Login form (nickname/channels)
        var loginForm = parent.getElement('tr[name=loginbox] form');
        if (loginForm) {
          var saslCheckbox = loginForm.getElement('#show_sasl_fields');
          var saslUserField = loginForm.getElement('#sasl_username');
          var saslPassField = loginForm.getElement('#sasl_password');
          // Hide by default
          loginForm.getElements('.sasl-row').setStyle('display', 'none');
          // Restore from cookie
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
  // Confirm dialog
        var confirmForm = parent.getElement('tr[name=confirmbox] form');
        if (confirmForm) {
          var saslCheckboxConfirm = confirmForm.getElement('#show_sasl_fields_confirm');
          var saslUserFieldConfirm = confirmForm.getElement('#confirm_sasl_username');
          var saslPassFieldConfirm = confirmForm.getElement('#confirm_sasl_password');
          // Hide by default
          confirmForm.getElements('.sasl-row').setStyle('display', 'none');
          // Restore from cookie
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
  try { clearTimeout(cb); } catch(e) {}

  var rootElement = parent.getElement("[name=connectroot]");
  self.rootElement = rootElement;

  // Ensure CAPTCHA survives tab switching: when this pane is hidden, move
  // any captcha containers to document.body for safekeeping; when shown,
  // move them back and attempt a reset/render so widgets display correctly.
  try {
    this.addEvent('deselect', function() {
      try {
        var r = document.getElementById('recaptcha-container');
        var t = document.getElementById('turnstile-container');
        var park = function(el) {
          if(!el) return;
          try {
            // find nearest table row and hide it to avoid leaving an empty white row
            var p = el.parentNode;
            while(p && p.nodeName && p.nodeName.toUpperCase() !== 'TR') p = p.parentNode;
            if(p && p.style) { p.style.display = 'none'; p.setAttribute('data-captcha-parked', '1'); }
            if (el.parentNode && el.parentNode !== document.body) document.body.appendChild(el);
          } catch(e) {}
        };
        park(r);
        park(t);
      } catch(e) {}
    });

    this.addEvent('select', function() {
      try {
        var loginForm = rootElement.querySelector('tr[name=loginbox] form');
        if (!loginForm) return;
        var table = loginForm.querySelector('table');
        if (!table) return;

        // Find existing global containers (moved to body on deselect)
        var existingRecaptcha = document.getElementById('recaptcha-container');
        var existingTurnstile = document.getElementById('turnstile-container');

        if (existingRecaptcha && !rootElement.contains(existingRecaptcha)) {
          // Prefer existing captcha-row if present
          var captchaRow = table.querySelector('tr.captcha-row') || table.querySelector('tr[data-captcha-parked="1"]');
          if (!captchaRow) {
            captchaRow = document.createElement('tr');
            captchaRow.className = 'captcha-row';
            var tdnew = document.createElement('td');
            tdnew.colSpan = 2;
            captchaRow.appendChild(tdnew);
            // insert before connectbutton row if possible
            var rows = table.getElementsByTagName('tr');
            var inserted = false;
            for (var i = 0; i < rows.length; i++) {
              if (rows[i].getAttribute('name') === 'connectbutton') {
                rows[i].parentNode.insertBefore(captchaRow, rows[i]);
                inserted = true;
                break;
              }
            }
            if (!inserted) table.appendChild(captchaRow);
          }
          // Put the widget into the captchaRow's first td
          try {
            var td = captchaRow.querySelector('td');
            if(!td) { td = document.createElement('td'); td.colSpan = 2; captchaRow.appendChild(td); }
            // clear existing contents and append element
            td.innerHTML = '';
            td.appendChild(existingRecaptcha);
            captchaRow.style.display = '';
          } catch(e) {}

          // Try to reflow/reset/render
          try {
            if (window.grecaptcha && typeof window.grecaptcha.reset === 'function' && typeof window.recaptchaWidgetId !== 'undefined') {
              try { window.grecaptcha.reset(window.recaptchaWidgetId); } catch(e) {}
            } else if (window.grecaptcha && typeof window.grecaptcha.render === 'function') {
              try { var id = window.grecaptcha.render('recaptcha-container', { 'sitekey': window.CAPTCHA_SITE_KEY }); if (typeof id !== 'undefined') window.recaptchaWidgetId = id; } catch(e) {}
            }
          } catch(e) {}
        }

        if (existingTurnstile && !rootElement.contains(existingTurnstile)) {
          var captchaRow2 = table.querySelector('tr.captcha-row') || table.querySelector('tr[data-captcha-parked="1"]');
          if (!captchaRow2) {
            captchaRow2 = document.createElement('tr');
            captchaRow2.className = 'captcha-row';
            var tdnew2 = document.createElement('td');
            tdnew2.colSpan = 2;
            captchaRow2.appendChild(tdnew2);
            var rowsb = table.getElementsByTagName('tr');
            var ins = false;
            for (var k = 0; k < rowsb.length; k++) {
              if (rowsb[k].getAttribute('name') === 'connectbutton') {
                rowsb[k].parentNode.insertBefore(captchaRow2, rowsb[k]);
                ins = true; break;
              }
            }
            if (!ins) table.appendChild(captchaRow2);
          }
          try {
            var td2 = captchaRow2.querySelector('td');
            if(!td2) { td2 = document.createElement('td'); td2.colSpan = 2; captchaRow2.appendChild(td2); }
            td2.innerHTML = '';
            td2.appendChild(existingTurnstile);
            captchaRow2.style.display = '';
          } catch(e) {}

          try {
            if (window.turnstile && typeof window.turnstile.render === 'function') {
              var el = document.querySelector('#turnstile-container .cf-turnstile');
              if (el && !el.getAttribute('data-widget-id')) {
                try { window.turnstile.render(el, { 'sitekey': window.CAPTCHA_SITE_KEY }); } catch(e) {}
                setTimeout(function(){ try { var el2 = document.querySelector('#turnstile-container .cf-turnstile'); if(el2) window.turnstileWidgetId = el2.getAttribute('data-widget-id') || null; } catch(e){} }, 200);
              } else if (typeof window.turnstile.reset === 'function' && window.turnstileWidgetId) {
                try { window.turnstile.reset(window.turnstileWidgetId); } catch(e) {}
              }
            }
          } catch(e) {}
        }
      } catch(e) {}
    });
  } catch(e) {}

  // After full build ensure last set language is applied
  try {
    var effectiveLang = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || lang;
    translateCurrent(effectiveLang);
  } catch(e) {}

  self.util.exec = function(n, x) { rootElement.getElements(n).each(x); };
  var util = self.util;
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
  if(uiOptions.logoURL != null) {
          var logoBar = parent.getElement("[class=bar-logo]");
          if(uiOptions.logoURL)
            logoBar.setAttribute("style", "background: url(" + uiOptions.logoURL + ") no-repeat center top; _filter: progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" + uiOptions.logoURL + "',sizingMethod='crop');");

          util.makeVisible(parent.getElement("[name=loginheader]"));
        } else {
          util.makeVisible(parent.getElement("[name=nologologinheader]"));
        }
      }

  if(initialNickname === null && initialChannels === null) {
  var n2 = self.cookie.get("nickname");
        if(n2 !== null)
          initialNickname = n2;

  var c2 = self.cookie.get("autojoin");
        if(c2 !== null)
          initialChannels = c2;
      }

      if(initialChannels === null) {
        initialChannels = "";
      }

      exec("[name=nickname]", util.setText(initialNickname));
      exec("[name=channels]", util.setText(initialChannels));
  exec("[name=prettychannels]", function(node) { self.__buildPrettyChannels(node, initialChannels); });
      exec("[name=networkname]", util.setText(uiOptions.networkName));

      var focus = "connect";
      if(autoConnect) {
        if(!autoNick)
          exec("[name=nickselected]", util.makeVisible);

  self.__validate = self.__validateConfirmData;
      } else {
	if(!initialNickname) {
          focus = "nickname";
        } else if(initialNickname && !initialChannels) {
          focus = "channels";
        }

  self.__validate = self.__validateLoginData;
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

  // ...SASL login fields are now handled purely in HTML...

      if(window == window.top) /* don't focus when we're iframe'd */
        exec("[name=" + focus + "]", util.focus);
        exec("[name=connect]", util.attachClick(self.__connect.bind(self)));
      exec("[name=loginconnect]", util.attachClick(self.__loginConnect.bind(self)));

      exec("[name=login]", util.attachClick(self.__login.bind(self)));

      if(qwebirc.ui.isHideAuth())
       exec("[name=login]", util.setVisible(false));
    }});
        r.get();
      });
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
    try { if(e && e.preventDefault) e.preventDefault(); if(e && e.stopPropagation) e.stopPropagation(); } catch(_) {}
  // Show status in typing bar (shared connectStatus)
  try { if(qwebirc.ui.util && qwebirc.ui.util.connectStatus) qwebirc.ui.util.connectStatus.show(); } catch(_) {}
    var data = this.validate();
    if(data === false) {
  try { if(qwebirc.ui.util && qwebirc.ui.util.connectStatus) qwebirc.ui.util.connectStatus.hide(); } catch(_) {}
      return;
    }
  // Get CAPTCHA token if enabled
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
  // If no token was produced and the widget didn't explicitly fail, warn the user
  // only if a site key is configured (i.e. CAPTCHA is actually enabled). If
  // CAPTCHA is effectively disabled (no site key), suppress the alert and
  // continue without blocking the connect flow.
  if (!token && !window.__turnstileFailed) {
          var captchaSiteKeyLocal = window.CAPTCHA_SITE_KEY || '';
          if (captchaSiteKeyLocal) {
            var lang2 = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
            var i18n2 = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang2] && window.qwebirc.i18n[lang2].options;
            showI18nAlert('ALERT_CAPTCHA_REQUIRED', 'Please complete the CAPTCHA.');
            try { if(qwebirc.ui.util && qwebirc.ui.util.connectStatus) qwebirc.ui.util.connectStatus.hide(); } catch(_) {}
            return;
          } else {
            // No site key configured -> treat captcha as disabled; continue without token
          }
        }
        data['captcha_token'] = token;
      }
    this.__cancelLogin();
    this.fireEvent("close");
    this.__saveCookie(data);
    // Connection established asynchronously; status remains until hide() is called
    this.options.callback(data);
  },
  __saveCookie: function(data) {
    // Persist nickname + autojoin + SASL (if enabled)
    if(!data) return;
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
    if(data.nickname) this.cookie.set('nickname', data.nickname);
    if(data.autojoin !== undefined) this.cookie.set('autojoin', data.autojoin);
    this.cookie.extend(data);
    this.cookie.save();
  },
  __cancelLogin: function(noUIModifications) {
    if(this.__cancelLoginCallback)
      this.__cancelLoginCallback(noUIModifications);
  },
  __loginConnect: function(e) {
    try { if(e && e.preventDefault) e.preventDefault(); if(e && e.stopPropagation) e.stopPropagation(); } catch(_) {}
  // Show status in typing bar (shared connectStatus)
  try { if(qwebirc.ui.util && qwebirc.ui.util.connectStatus) qwebirc.ui.util.connectStatus.show(); } catch(_) {}
    if(this.validate() === false) {
  try { if(qwebirc.ui.util && qwebirc.ui.util.connectStatus) qwebirc.ui.util.connectStatus.hide(); } catch(_) {}
      return;
    }
    this.__performLogin(function() {
      var data = this.validate();
      if(data === false) {
  /* We're logged in -- show the normal join button */
        this.util.exec("[name=connectbutton]", this.util.setVisible(true));
  try { if(qwebirc.ui.util && qwebirc.ui.util.connectStatus) qwebirc.ui.util.connectStatus.hide(); } catch(_) {}
        return;
      }
  this.fireEvent("close");
  this.__saveCookie(data);
  this.options.callback(data);
    }.bind(this), "loginconnectbutton");
  },
  __login: function(e) {
    try { if(e && e.preventDefault) e.preventDefault(); if(e && e.stopPropagation) e.stopPropagation(); } catch(_) {}

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
      try { clearInterval(closeCallback); } catch(e) {}

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
  var lang2 = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
  var i18n2 = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang2] && window.qwebirc.i18n[lang2].options;
  showI18nAlert('ALERT_NO_SESSION_STORAGE', 'No session storage support in this browser -- login not supported');
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
  // Always use the visible SASL field (e.g. in confirm dialog)
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
  var lang3 = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
  var i18n3 = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang3] && window.qwebirc.i18n[lang3].options;
  showI18nAlert('ALERT_NICK_REQUIRED', 'You must supply a nickname.');
      nick.focus();
      return false;
    }
    var stripped = qwebirc.global.nicknameValidator.validate(nickname);
    if(stripped != nickname) {
      nick.value = stripped;
  var lang3 = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
  var i18n3 = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang3] && window.qwebirc.i18n[lang3].options;
  showI18nAlert('ALERT_NICK_CORRECTED', 'Your nickname was invalid and has been corrected; please check your altered nickname and try again.');
      nick.focus();
      return false;
    }
    var data = {nickname: nickname, autojoin: chans};
  // Always use the visible SASL field (e.g. in login dialog)
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
    try { if(e && e.preventDefault) e.preventDefault(); if(e && e.stopPropagation) e.stopPropagation(); } catch(_) {}

    var nickname = nick.value;
    var chans = chan.value;
    if(chans == "#") /* sorry channel "#" :P */
      chans = "";

    if(!nickname) {
  var lang4 = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
  var i18n4 = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang4] && window.qwebirc.i18n[lang4].options;
  showI18nAlert('ALERT_NICK_REQUIRED', 'You must supply a nickname.');
      nick.focus();
      return;
    }
    var stripped = qwebirc.global.nicknameValidator.validate(nickname);
    if(stripped != nickname) {
      nick.value = stripped;
  var lang4 = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
  var i18n4 = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang4] && window.qwebirc.i18n[lang4].options;
  showI18nAlert('ALERT_NICK_CORRECTED_CONNECT', 'Your nickname was invalid and has been corrected; please check your altered nickname and press Connect again.');
      nick.focus();
      return;
    }
    
    var data = {"nickname": nickname, "autojoin": chans};
    if(qwebirc.auth.enabled()) {
      if(qwebirc.auth.passAuth() && authCheckBox.checked) {
          if(!usernameBox.value || !passwordBox.value) {
            var lang5 = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
            var i18n5 = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang5] && window.qwebirc.i18n[lang5].options;
            showI18nAlert('ALERT_AUTH_USERPASS_REQUIRED', 'You must supply your username and password in auth mode.');
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
          var lang6 = (window.qwebirc && window.qwebirc.config && window.qwebirc.config.LANGUAGE) || 'en';
          var i18n6 = window.qwebirc && window.qwebirc.i18n && window.qwebirc.i18n[lang6] && window.qwebirc.i18n[lang6].options;
          showI18nAlert('ALERT_PASSWORD_REQUIRED', 'You must supply a password.');
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
  var value = (args != null) && args.get("authrequired");
  return function() {
    return value && qwebirc.auth.enabled();
  };
})();

qwebirc.ui.isHideAuth = (function() {
  var args = qwebirc.util.parseURI(String(document.location));
  var value = (args != null) && args.get("hideauth");
  return function() {
    return value;
  };
})();

