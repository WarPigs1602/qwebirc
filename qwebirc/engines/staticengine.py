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
  # Return a StaticEngine instance for each file/directory
  # Ensures our own render() method is always used
    child = static.File.getChild(self, path, request)
  # If it's a directory or file, wrap it in StaticEngine
    if isinstance(child, static.File) and not isinstance(child, StaticEngine):
      # Erzeuge neue StaticEngine-Instanz mit gleichem Pfad
      return StaticEngine(child.path)
    return child
  isLeaf = False
  hit = util.HitCounter()
  
  def __init__(self, *args, **kwargs):
    static.File.__init__(self, *args, **kwargs)

  def render_GET(self, request):
    # Track hits for this request
    self.hit(request)

    # Helper constant
    BODY_CLOSE = b"</body>"

    try:
      # HTML files: inject small JS snippet and force UTF-8 header
      if self.path.endswith('.html'):
        with open(self.path, 'rb') as f:
          data = f.read()
        try:
          import sys, importlib
          if 'config' in sys.modules:
            config = sys.modules['config']
          else:
            config = importlib.import_module('config')
          sasl_enabled = getattr(config, "SASL_LOGIN_ENABLED", False)
          force_ws = getattr(config, "FORCE_WEBSOCKETS", False)
          js = f'<script>window.SASL_LOGIN_ENABLED = {"true" if sasl_enabled else "false"}; window.FORCE_WEBSOCKETS = {"true" if force_ws else "false"};</script>'
          if BODY_CLOSE in data:
            data = data.replace(BODY_CLOSE, js.encode('utf-8') + BODY_CLOSE)
          else:
            data += js.encode('utf-8')
        except Exception:
          pass
        try:
          request.setHeader(b"content-type", b"text/html; charset=utf-8")
        except Exception:
          pass
        try:
          request.setHeader(b"content-length", str(len(data)).encode("utf-8"))
        except Exception:
          pass
        request.write(data)
        from twisted.internet import reactor
        reactor.callLater(0, request.finish)
        return server.NOT_DONE_YET

      # Serve CSS/MCSS/JS/JSON with explicit UTF-8 content-type
      if self.path.endswith(('.css', '.mcss', '.js', '.json')):
        with open(self.path, 'rb') as f:
          data = f.read()
        if self.path.endswith(('.css', '.mcss')):
          ctype = b'text/css; charset=utf-8'
        elif self.path.endswith('.js'):
          ctype = b'application/javascript; charset=utf-8'
        else:
          ctype = b'application/json; charset=utf-8'
        try:
          request.setHeader(b'content-type', ctype)
        except Exception:
          pass
        try:
          request.setHeader(b'content-length', str(len(data)).encode('utf-8'))
        except Exception:
          pass
        request.write(data)
        from twisted.internet import reactor
        reactor.callLater(0, request.finish)
        return server.NOT_DONE_YET

    except Exception:
      request.setResponseCode(500)
      return b"Internal Server Error"

    # Default behaviour for other file types
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
  # Always serve static/qui.html regardless of directory
    return self.getChild("qui.html", None)
