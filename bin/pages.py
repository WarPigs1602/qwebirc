#!/usr/bin/env python
IRC_BASE = ["ircconnection", "irclib", "numerics", "baseircclient", "irctracker", "commandparser", "commands", "ircclient", "commandhistory", "nicknamevalidator", "ignorecontroller"]
PANES = ["connect", "embed", "options", "about", "url"]
UI_BASE = ["uiutil", "menuitems", "baseui", "baseuiwindow", "colour", "url", "theme", "notifications", "tabcompleter", "style", "xdomain"]
UI_BASE.extend(["panes/%s" % x for x in PANES])

DEBUG_BASE = ["qwebirc", "version", "qhash", "jslib", "base64", "crypto", "md5", ["irc/%s" % x for x in IRC_BASE], ["ui/%s" % x for x in UI_BASE], "qwebircinterface", "auth", "sound"]
BUILD_BASE = ["qwebirc"]
JS_DEBUG_BASE = ["MooTools-Core-1.6.0", "MooTools-More-1.6.0"]
JS_RAW_BASE = []
JS_BASE = ["MooTools-Core-1.6.0", "MooTools-More-1.6.0"]
JS_EXTRA = []

UIs = {
  "qui": {
    "class": "QUI",
    "nocss": True,
    "uifiles": ["qui"],
    "doctype": "<!DOCTYPE html>"
  }
}

# Register classicui frontend so it will be built and available as a selectable UI
UIs["classicui"] = {
  "class": "CLASSICUI",
  "uifiles": ["classicui"],
  "doctype": "<!DOCTYPE html>"
}

def flatten(y):
  for x in y:
    if isinstance(x, list):
      for x in flatten(x):
        yield x
    else:
      yield x

DEBUG_BASE = list(flatten(DEBUG_BASE))
DEBUG = ["debug/%s" % x for x in DEBUG_BASE]
