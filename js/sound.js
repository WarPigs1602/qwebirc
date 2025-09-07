qwebirc.sound.SoundPlayer = new Class({
  Implements: [Events],
  initialize: function() {
    var sb = qwebirc.global.staticBaseURL || "/";
    // Sicherstellen dass wir keinen Dateinamen (z.B. qui.html) drin haben
    // und nur auf dem statischen Root aufsetzen.
    // Falls jemand staticBaseURL relativ ("static/") konfiguriert hat, bleibt das erhalten.
    // Entferne alles nach letzter '/' wenn dort ein Punkt enthalten ist (Dateiname-Heuristik)
    try {
      var parts = sb.split(/\/+/);
      if(parts.length && parts[parts.length-1].indexOf('.') > -1) parts.pop();
      sb = parts.join('/');
      if(sb === '') sb = '/';
    } catch(e) {}
    if(sb.charAt(sb.length-1) !== '/') sb += '/';

    this.sounds = {};
    this.soundURL = sb + "sound/"; // Ergebnis: z.B. "/sound/" oder "/static/sound/"

    /* Erkennung unterstützter Formate (Linux Browser evtl. ohne MP3 Codec) */
    try {
      var test = new Audio();
      this._support = {
        mp3: !!(test && test.canPlayType && test.canPlayType('audio/mpeg').replace(/no/,'')),
        wav: !!(test && test.canPlayType && test.canPlayType('audio/wav').replace(/no/,''))
      };
    } catch(e) {
      this._support = {mp3:true, wav:true}; // konservativ annehmen
    }
    this._chosen = {}; /* Cache: Basisname -> gewählte Datei */
  },
  /* Kann einmal bei User-Interaktion aufgerufen werden, um Audio-Objekte stumm zu initialisieren
     Dadurch erlauben Browser späteres Abspielen mit Ton (Workaround für Autoplay-Policy). */
  prepare: function(list) {
    try {
      if(!list) list = ['beep3','beep2','beep'];
      for(var i=0;i<list.length;i++) {
        var base = list[i];
        var cands = this._candidatesFor(base);
        if(cands.length == 0) continue;
        var f = cands[0];
        if(!this.sounds[f]) {
          var a = new Audio(this.soundURL + f);
          a.muted = true; // stumm vorladen
          // Manche Browser brauchen play() trotz mute zum Aktivieren
          try { var p = a.play(); if(p && p.catch) p.catch(function(){}); } catch(e) {}
          this.sounds[f] = a;
          this._chosen[base] = f;
        }
      }
    } catch(e) {}
  },
  /* Erzeugt Kandidatenliste für einen Basis-Dateinamen ohne Extension */
  _candidatesFor: function(base) {
    var list = [];
    // Bevorzugung: mp3 dann wav – außer mp3 nicht unterstützt
    if(this._support.mp3) list.push(base + '.mp3');
    if(this._support.wav) list.push(base + '.wav');
    // Fallback: falls nichts erkannt wurde, beide probieren
    if(list.length == 0) return [base + '.mp3', base + '.wav'];
    return list;
  },
  /* Interner Helper: versucht Kandidaten nacheinander */
  _tryPlaySequence: function(candidates, index) {
    if(index >= candidates.length) return; /* alles probiert */
    var file = candidates[index];
    var key = file;
    var audio = this.sounds[key];
    if(!audio) {
      try { audio = this.sounds[key] = new Audio(this.soundURL + file); } catch(e) { audio = null; }
    }
    if(!audio) { this._tryPlaySequence(candidates, index+1); return; }
    try {
      // Falls das Audio beim Priming stumm geschaltet wurde -> jetzt aktivieren
      if(audio.muted) {
        try { audio.muted = false; } catch(_) {}
      }
      var p = audio.play();
      if(p && p.catch) {
        p.catch(function(err){
          // Autoplay block? -> Nach Nutzer-Interaktion erneut probieren
          var msg = (err && err.name) ? err.name : (err && err.message) ? err.message : String(err);
          if(/NotAllowed/i.test(msg) || /Interaktion/i.test(msg)) {
            this._scheduleUserReplay(candidates, index);
          } else {
            this._tryPlaySequence(candidates, index+1);
          }
        }.bind(this));
      }
    } catch(e) {
      // Sofort nächster Kandidat
      this._tryPlaySequence(candidates, index+1);
    }
  },
  _scheduleUserReplay: function(candidates, index) {
    if(this._replayScheduled) return;
    this._replayScheduled = true;
    var self = this;
    var handler = function() {
      try {
        document.removeEvent('click', handler);
        document.removeEvent('keydown', handler);
        document.removeEvent('pointerdown', handler);
      } catch(_) {}
      self._replayScheduled = false;
      // Erneut versuchen (start bei ursprünglichem Index)
      self._tryPlaySequence(candidates, index);
    };
    try {
      document.addEvent('click', handler);
      document.addEvent('keydown', handler);
      document.addEvent('pointerdown', handler);
    } catch(_) {}
  },
  // Manuelles Entsperren von außen möglich
  unlock: function() {
    try { this.prepare(); } catch(e) {}
  },
  /* Public API: akzeptiert
     - Basisnamen ohne Extension ("beep3")
     - konkrete Datei mit Extension ("beep3.mp3")
     - Array von Dateien oder Basisnamen (['beep3','beep2']) */
  play: function(input) {
    try {
      var candidates = [];
      if(typeOf(input) == 'array') {
        for(var i=0;i<input.length;i++) {
          var it = input[i];
          if(it.indexOf('.') == -1) {
            // Basisname
            if(this._chosen[it]) {
              candidates.push(this._chosen[it]);
            } else {
              var cands = this._candidatesFor(it);
              // Ersten Kandidaten auch cachen (optimistisch). Bei Fehlschlag wird später alternative probiert.
              this._chosen[it] = cands[0];
              candidates = candidates.concat(cands);
            }
          } else {
            candidates.push(it);
          }
        }
      } else if(typeOf(input) == 'string') {
        if(input.indexOf('.') == -1) { // Basisname
          if(this._chosen[input]) {
            candidates.push(this._chosen[input]);
          } else {
            var list = this._candidatesFor(input);
            this._chosen[input] = list[0];
            candidates = candidates.concat(list);
          }
        } else {
          candidates.push(input);
        }
      } else {
        return; /* unbekannter Typ */
      }

      // Dubletten entfernen while order behalten
      var unique = [];
      var seen = {};
      for(var j=0;j<candidates.length;j++) {
        var f = candidates[j];
        if(!seen[f]) { seen[f] = 1; unique.push(f); }
      }
      this._tryPlaySequence(unique, 0);
    } catch(e) { /* ignorieren */ }
  }
});
