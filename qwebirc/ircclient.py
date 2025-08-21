CAP_END = "CAP END"
import twisted, sys, codecs, traceback
from twisted.words.protocols import irc
from twisted.internet import reactor, protocol, abstract
from twisted.web import resource, server
from twisted.protocols import basic
from twisted.names.client import Resolver
import hmac, time, config, random, qwebirc.config_options as config_options
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

class QWebIRCClient(basic.LineReceiver):
  delimiter = b"\n"
  def __init__(self, *args, **kwargs):
    self.__nickname = "(unregistered)"
    self._cap_active = False
    self._cap_sasl = False
    self._cap_end_sent = False
    self._sasl_authenticating = False
    self._sasl_username = None
    self._sasl_password = None
    self._capabilities = set()  # alle vom Server angebotenen CAPs (LS)
    self._cap_available = set() # explizit für LS
    self._cap_set = set()       # explizit für ACK
    
  def dataReceived(self, data):
    basic.LineReceiver.dataReceived(self, data.replace(b"\r", b""))


  def lineReceived(self, line):
    import datetime
    if isinstance(line, bytes):
      line = line.decode("utf-8", "replace")
    line = irc_decode(irc.lowDequote(line))

    tags = None
    # Parse IRCv3 message-tags if present (inkl. draft/message-tags)
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
          # draft/message-tags Kompatibilität: entferne "draft/"-Präfix
          if k.startswith("draft/"):
            k = k[6:]
          # Normalisiere alle typing-Tags auf 'typing'
          if k.lstrip("+").endswith("typing"):
            k = "typing"
          tags[k] = v
        line = rest
      except Exception:
        tags = None

    try:
      prefix, command, params = irc.parsemsg(line)
      self.handleCommand(command, prefix, params, tags=tags)
    except irc.IRCBadMessage:
      return

    # CAP negotiation
    if command == "CAP":
      subcmd = params[1].upper() if len(params) > 1 else ""
      if subcmd == "LS":
        caps = set(params[-1].split())
        self._capabilities = caps
        self._cap_available = caps.copy()  # speichere alle verfügbaren CAPs
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
        # ACK kann mehrere CAPs enthalten, z.B. "ACK :multi-prefix sasl"
        ack_caps = set(params[-1].split())
        self._cap_set.update(ack_caps)
        if "sasl" in ack_caps:
          self._cap_sasl = True
          self._sasl_authenticating = True
          self.write("AUTHENTICATE PLAIN")
        # Event für gesetzte CAPs
        self("cap_set", list(self._cap_set))
        # Sende ein 'capabilities'-Event mit ['ACK', ...] für das Frontend
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
    # Für TAGMSG: Nur Event erzeugen, wenn relevante Tags (z.B. typing) vorhanden sind
    # Unterstütze auch draft/message-tags (bereits beim Parsen entfernt)
    if command == "TAGMSG":
      # Akzeptiere sowohl "typing" als auch "message-tags/typing" (draft wurde beim Parsen entfernt)
      if not (tags and "typing" in tags and tags["typing"]):
        # Ignoriere TAGMSG ohne typing-Tag komplett (kein Event, keine Zeile)
        return
    # CAP LS und CAP ACK nicht an das Eventsystem weitergeben (ausblenden)
    if command == "CAP":
      subcmd = params[1].upper() if len(params) > 1 else ""
      if subcmd in ("LS", "ACK"):
        return
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


    # CAP-Handshake für alle User
    self._cap_active = True
    self.write("CAP LS")

    # Normaler Verbindungsaufbau wie bisher
    if not hasattr(config, "WEBIRC_MODE"):
      self.write("USER %s bleh bleh %s :%s" % (ident, ip, realname))
    elif config.WEBIRC_MODE == "hmac":
      hmac = hmacfn(ident, ip)
      self.write("USER %s bleh bleh %s %s :%s" % (ident, ip, hmac, realname))
    elif config.WEBIRC_MODE == "webirc":
      self.write("WEBIRC %s qwebirc %s %s" % (config.WEBIRC_PASSWORD, hostname, ip))
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
    # Wenn die Nachricht 'Session disconnect' ist, sende einen neutralen QUIT-Text
    if message == "Session disconnect":
      self.write("QUIT :Disconnected")
    else:
      self.write("QUIT :qwebirc exception: %s" % message)
    self.transport.loseConnection()

  def disconnect(self, reason):
    self("disconnect", reason)
    self.factory.publisher.disconnect()
    # Erzwinge das Schließen der TCP-Verbindung
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
  f = QWebIRCFactory(*args, **kwargs)
  tcpkwargs = {}
  if hasattr(config, "OUTGOING_IP"):
    tcpkwargs["bindAddress"] = (config.OUTGOING_IP, 0)

  if CONNECTION_RESOLVER is None:
    if hasattr(config, "SSLPORT"):
      from twisted.internet import ssl
      reactor.connectSSL(config.IRCSERVER, config.SSLPORT, f, ssl.ClientContextFactory(), **tcpkwargs)
    else:
      reactor.connectTCP(config.IRCSERVER, config.IRCPORT, f, **tcpkwargs)
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
