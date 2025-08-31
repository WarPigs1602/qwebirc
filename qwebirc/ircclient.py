import sys
# Debug log removed
CAP_END = "CAP END"
import twisted, sys, codecs, traceback
import os
from twisted.words.protocols import irc
from twisted.internet import reactor, protocol, abstract
from twisted.web import resource, server
from twisted.protocols import basic
from twisted.names.client import Resolver
import hmac, time, config, random, qwebirc.config_options as config_options, socket
from config import HMACTEMPORAL

if config.get("CONNECTION_RESOLVER"):
  CONNECTION_RESOLVER = Resolver(servers=config.get("CONNECTION_RESOLVER"))
else:
  CONNECTION_RESOLVER = None

if hasattr(config, "WEBIRC_MODE") and config.WEBIRC_MODE == "hmac":
  HMACKEY = hmac.HMAC(key=config.HMACKEY)

def hmacfn(*args):
  h = HMACKEY.copy()
  h.update("%d %s" % (int(time.time() / HMACTEMPORAL), " ".join(args)))
  return h.hexdigest()


def utf8_iso8859_1(data, table={bytes([i]): bytes([i]).decode("iso-8859-1") for i in range(256)}):
  return (table.get(data.object[data.start:data.start+1]), data.start+1)

codecs.register_error("mixed-iso-8859-1", utf8_iso8859_1)

def irc_decode(x):
  if isinstance(x, bytes):
    try:
      return x.decode("utf-8", "mixed-iso-8859-1")
    except UnicodeDecodeError:
      return x.decode("iso-8859-1", "ignore")
  return x

from qwebirc.util.i18n import I18n

class QWebIRCClient(basic.LineReceiver):
  delimiter = b"\n"

  def handle_LANG(self, params):
    if not params:
      self.write(":mwebirc NOTICE * :Usage: /LANG <code>")
      return
    lang = params[0].lower()
    if lang in self.i18n.translations:
      self.set_language(lang)
      self.write(f":mwebirc NOTICE * :Language set to {lang}")
    else:
      self.write(f":mwebirc NOTICE * :Unknown language code: {lang}")

  def __init__(self, *args, **kwargs):
    self.__nickname = "(unregistered)"
    self._cap_active = False
    self._cap_sasl = False
    self._cap_end_sent = False
    self._sasl_authenticating = False
    self._sasl_username = None
    self._sasl_password = None
    self._capabilities = set()  # all capabilities offered by server (LS)
    self._cap_available = set() # explicitly for LS
    self._cap_set = set()       # explicitly for ACK
    # i18n
    locales_dir = os.path.join(os.path.dirname(__file__), "../locales")
    self.i18n = I18n(locales_dir, default_lang="en")
    self.language = "en"  # default; can be set per session

  def set_language(self, lang):
    if lang in self.i18n.translations:
      self.language = lang
    else:
      self.language = self.i18n.default_lang

  def _(self, key):
    return self.i18n.gettext(key, lang=self.language)

  def dataReceived(self, data):
    basic.LineReceiver.dataReceived(self, data.replace(b"\r", b""))

  def lineReceived(self, line):
    # Prefer the custom irc_decode which tries utf-8 first and falls back
    # to iso-8859-1 without inserting replacement characters. Avoid
    # decoding with 'replace' which turns invalid sequences into U+FFFD (�).
    if isinstance(line, bytes):
      line = irc_decode(line)
    # Ensure lowDequote is applied on a str
    line = irc.lowDequote(line)

    tags = None
    # Parse IRCv3 message-tags if present (including draft/message-tags)
    if line.startswith("@"):
      try:
        tags_str, rest = line[1:].split(" ", 1)
        tags = {}
        for tag in tags_str.split(";"):
          if not tag:
            continue
          if "=" in tag:
            k, v = tag.split("=", 1)
          else:
            k, v = tag, None
          # draft/message-tags compatibility: remove "draft/" prefix
          if k.startswith("draft/"):
            k = k[6:]
          # Normalise all typing tags to 'typing'
          if k.lstrip("+").endswith("typing"):
            k = "typing"
          tags[k] = v
        line = rest
      except Exception:
        tags = None

    try:
      prefix, command, params = irc.parsemsg(line)
      # Language switch via /LANG
      if command.upper() == "LANG":
        self.handle_LANG(params)
        return
      self.handleCommand(command, prefix, params, tags=tags)
    except irc.IRCBadMessage:
      return

    # CAP negotiation
    if command == "CAP":
      subcmd = params[1].upper() if len(params) > 1 else ""
      if subcmd == "LS":
        caps = set(params[-1].split())
        self._capabilities = caps
        self._cap_available = caps.copy()  # store all available CAPs
        self("capabilities", list(caps))
        # Request message-tags if available
        cap_req = []
        if "message-tags" in caps:
          cap_req.append("message-tags")
        if self._sasl_username and self._sasl_password and "sasl" in caps:
          cap_req.append("sasl")
        if cap_req:
          self.write("CAP REQ :" + " ".join(cap_req))
        else:
          self.write(CAP_END)
          self._cap_end_sent = True
      elif subcmd == "ACK":
        # ACK can contain multiple CAPs, e.g. "ACK :multi-prefix sasl"
        ack_caps = set(params[-1].split())
        self._cap_set.update(ack_caps)
        if "sasl" in ack_caps:
          self._cap_sasl = True
          self._sasl_authenticating = True
          self.write("AUTHENTICATE PLAIN")
        # Event for set CAPs
        self("cap_set", list(self._cap_set))
        # Send a 'capabilities' event with ['ACK', ...] to the frontend
        self("capabilities", ["ACK"] + list(ack_caps))
        # If no further negotiation (e.g. no SASL in progress), end CAP
        if not ("sasl" in ack_caps and self._sasl_authenticating):
          self.write(CAP_END)
          self._cap_end_sent = True
      elif subcmd == "NAK":
        self.write(CAP_END)
        self._cap_end_sent = True
      elif subcmd == "END":
        self._cap_active = False
      return
    elif command == "AUTHENTICATE" and self._sasl_authenticating:
      if params[0] == "+":
        import base64
        authzid = self._sasl_username
        authcid = self._sasl_username
        passwd = self._sasl_password
        msg = f"{authzid}\0{authcid}\0{passwd}"
        b64msg = base64.b64encode(msg.encode("utf-8")).decode("ascii")
        self.write(f"AUTHENTICATE {b64msg}")
      return
    elif command in ("903", "904", "905", "906", "907"):  # SASL success or fail
      self._sasl_authenticating = False
      if not self._cap_end_sent:
        self.write(CAP_END)
        self._cap_end_sent = True
      return
    if command == "001":
      self.__nickname = params[0]
      if self.__perform is not None:
        for x in self.__perform:
          self.write(x)
        self.__perform = None
    elif command == "NICK":
      nick = prefix.split("!", 1)[0]
      if nick == self.__nickname:
        self.__nickname = params[0]

  def handleCommand(self, command, prefix, params, tags=None):
    # For TAGMSG: only emit event if relevant tags (e.g. typing) are present
    # Also support draft/message-tags (already stripped when parsing)
    if command == "TAGMSG":
      if not (tags and "typing" in tags and tags["typing"]):
        return
    # Hide CAP LS and CAP ACK from event system
    if command == "CAP":
      subcmd = params[1].upper() if len(params) > 1 else ""
      if subcmd in ("LS", "ACK"):
        return
    # 005/PREFIX handling: send PREFIX info as event to frontend
    if command == "005":
      for p in params:
        if isinstance(p, str) and p.startswith("PREFIX="):
          self("prefixes", p[7:])
          break
    self("c", command, prefix, params, tags)

  def __call__(self, *args):
    self.factory.publisher.event(args)

  def write(self, data):
    self.transport.write((irc.lowQuote(data) + "\r\n").encode("utf-8"))

  def connectionMade(self):
    basic.LineReceiver.connectionMade(self)
    self.lastError = None
    f = self.factory.ircinit
    nick, ident, ip, realname, hostname, pass_ = f["nick"], f["ident"], f["ip"], f["realname"], f["hostname"], f.get("password")
    self.__nickname = nick
    self.__perform = f.get("perform")
    self._sasl_username = f.get("sasl_username")
    self._sasl_password = f.get("sasl_password")

    # CAP handshake for all users
    self._cap_active = True
    self.write("CAP LS")

    # Regular connection setup as before
    if not hasattr(config, "WEBIRC_MODE"):
      self.write("USER %s bleh bleh %s :%s" % (ident, ip, realname))
    elif config.WEBIRC_MODE == "hmac":
      hmac = hmacfn(ident, ip)
      self.write("USER %s bleh bleh %s %s :%s" % (ident, ip, hmac, realname))
    elif config.WEBIRC_MODE == "webirc":
      gateway = getattr(config, "WEBIRC_GATEWAY", socket.gethostname())
      self.write("WEBIRC %s %s %s %s" % (config.WEBIRC_PASSWORD, gateway, hostname, ip))
      self.write("USER %s bleh %s :%s" % (ident, ip, realname))
    elif config.WEBIRC_MODE == "cgiirc":
      self.write("PASS %s_%s_%s" % (config.CGIIRC_STRING, ip, hostname))
      self.write("USER %s bleh %s :%s" % (ident, ip, realname))
    elif config.WEBIRC_MODE == config_options.WEBIRC_REALNAME or config.WEBIRC_MODE is None:
      if ip == hostname:
        dispip = ip
      else:
        dispip = "%s/%s" % (hostname, ip)
      self.write("USER %s bleh bleh :%s - %s" % (ident, dispip, realname))

    if pass_ is not None:
      self.write("PASS :%s" % pass_)
    self.write("NICK %s" % nick)

    self.factory.client = self
    self("connect")

  def __str__(self):
    return "<QWebIRCClient: %s!%s@%s>" % (self.__nickname, self.factory.ircinit["ident"], self.factory.ircinit["ip"])

  def connectionLost(self, reason):
    if self.lastError:
      self.disconnect("Connection to IRC server lost: %s" % self.lastError)
    else:
      self.disconnect("Connection to IRC server lost.")
    self.factory.client = None
    basic.LineReceiver.connectionLost(self, reason)

  def error(self, message):
    self.lastError = message
    # If message is 'Session disconnect', send a neutral QUIT text
    if message == "Session disconnect":
      self.write("QUIT :Disconnected")
    else:
      self.write("QUIT :mwebirc exception: %s" % message)
    self.transport.loseConnection()

  def disconnect(self, reason):
    self("disconnect", reason)
    self.factory.publisher.disconnect()
    # Force closing of the TCP connection
    if hasattr(self, "transport"):
      try:
        self.transport.loseConnection()
      except Exception:
        pass
    
class QWebIRCFactory(protocol.ClientFactory):
  protocol = QWebIRCClient
  def __init__(self, publisher, **kwargs):
    self.client = None
    self.publisher = publisher
    self.ircinit = kwargs
    
  def write(self, data):
    self.client.write(data)

  def error(self, reason):
    self.client.error(reason)

  def clientConnectionFailed(self, connector, reason):
    protocol.ClientFactory.clientConnectionFailed(self, connector, reason)
    self.publisher.event(["disconnect", "Connection to IRC server failed."])
    self.publisher.disconnect()

def create_irc(*args, **kwargs):
  import sys
  # Debug log removed
  f = QWebIRCFactory(*args, **kwargs)
  tcpkwargs = {}
  if hasattr(config, "OUTGOING_IP"):
    tcpkwargs["bindAddress"] = (config.OUTGOING_IP, 0)

  import sys
  if CONNECTION_RESOLVER is None:
    if hasattr(config, "SSLPORT"):
      from .novverify import NoVerifyClientContextFactory
      try:
        reactor.connectSSL(config.IRCSERVER, config.SSLPORT, f, NoVerifyClientContextFactory(), **tcpkwargs)
      except Exception:
        import traceback
        traceback.print_exc()
    else:
      try:
        reactor.connectTCP(config.IRCSERVER, config.IRCPORT, f, **tcpkwargs)
      except Exception:
        import traceback
        traceback.print_exc()
    return f

  def callback(result):
    name, port = random.choice(sorted((str(x.payload.target), x.payload.port) for x in result[0]))
    reactor.connectTCP(name, port, f, **tcpkwargs)
  def errback(err):
    f.clientConnectionFailed(None, err)

  d = CONNECTION_RESOLVER.lookupService(config.IRCSERVER, (1, 3, 11))
  d.addCallbacks(callback, errback)
  return f

if __name__ == "__main__":
  e = create_irc(lambda x: 2, nick="slug__moo", ident="mooslug", ip="1.2.3.6", realname="mooooo", hostname="1.2.3.4")
  reactor.run()
