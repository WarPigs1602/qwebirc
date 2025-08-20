from twisted.web import resource, server, static, error
from twisted.web.resource import ForbiddenResource
import qwebirc.util as util
import pprint
from .adminengine import AdminEngineAction
try:
  from twisted.web.server import GzipEncoderFactory
  GZIP_ENCODER = GzipEncoderFactory()
except ImportError:
  GZIP_ENCODER = None

# TODO, cache gzip stuff
cache = {}
def clear_cache():
  global cache
  cache = {}

class StaticEngine(static.File):

  def getChild(self, path, request):
    # Liefere für jede Datei/Verzeichnis wieder eine StaticEngine-Instanz aus
    # Dadurch wird immer die eigene render()-Methode verwendet
    child = static.File.getChild(self, path, request)
    # Wenn es ein Verzeichnis oder eine Datei ist, wandle in StaticEngine um
    if isinstance(child, static.File) and not isinstance(child, StaticEngine):
      # Erzeuge neue StaticEngine-Instanz mit gleichem Pfad
      return StaticEngine(child.path)
    return child
  isLeaf = False
  hit = util.HitCounter()
  
  def __init__(self, *args, **kwargs):
    static.File.__init__(self, *args, **kwargs)

  def render_GET(self, request):
    self.hit(request)
    # Nur für HTML-Dateien injizieren, sonst Standardverhalten
    if self.path.endswith('.html'):
      try:
        with open(self.path, 'rb') as f:
          data = f.read()
        # Nur bei HTML-Inhalt injizieren
        try:
          import sys
          import importlib
          if 'config' in sys.modules:
            config = sys.modules['config']
          else:
            config = importlib.import_module('config')
          sasl_enabled = getattr(config, "SASL_LOGIN_ENABLED", False)
          js = f'<script>window.SASL_LOGIN_ENABLED = {"true" if sasl_enabled else "false"};</script>'
          if b"</body>" in data:
            data = data.replace(b"</body>", js.encode("utf-8") + b"</body>")
          else:
            data += js.encode("utf-8")
        except Exception:
          pass
        request.setHeader(b"content-type", b"text/html; charset=utf-8")
        request.setHeader(b"content-length", str(len(data)).encode("utf-8"))
        request.write(data)
        from twisted.internet import reactor
        reactor.callLater(0, request.finish)
        return server.NOT_DONE_YET
      except Exception as e:
        request.setResponseCode(500)
        return b"Internal Server Error"
    # Für andere Dateitypen Standardverhalten
    return static.File.render_GET(self, request)
    
  @property
  def adminEngine(self):
    return {
      #"GZip cache": [
        #("Contents: %s" % pprint.pformat(list(cache.keys())),)# AdminEngineAction("clear", d))
      #],
      "Hits": [
        (self.hit,),
      ]
    }

  def directoryListing(self):
    # Immer static/qui.html ausliefern, egal welches Verzeichnis
    return self.getChild("qui.html", None)
