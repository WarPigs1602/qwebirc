from twisted.web import resource, server, static
import config, urllib.parse, urllib.request, urllib.parse, urllib.error, hashlib, re
import qwebirc.util.rijndael, qwebirc.util.ciphers
import qwebirc.util
import qwebirc.util.qjson as json

import urllib.request
import urllib.parse
import ssl

authgate = config.AUTHGATEPROVIDER.twisted
BLOCK_SIZE = 128/8

class AuthgateEngine(resource.Resource):
  isLeaf = True
  
  def __init__(self, prefix):
    self.__prefix = prefix
    self.__hit = qwebirc.util.HitCounter()
    
  def deleteCookie(self, request, key):
    request.addCookie(key, "", path="/", expires="Sat, 29 Jun 1996 01:44:48 GMT")
    
  def render_GET(self, request):
    if request.args.get("logout"):
      self.deleteCookie(request, "user")

    # CAPTCHA check for login (only if enabled)
    captcha_type = getattr(config, 'CAPTCHA_TYPE', None)
    captcha_secret = getattr(config, 'CAPTCHA_SECRET_KEY', None)
    if captcha_type in ('recaptcha', 'turnstile'):
      # Accept token from POST or GET (for AJAX or form)
      token = None
      if b'captcha_token' in request.args:
        token = request.args[b'captcha_token'][0].decode('utf-8')
      elif hasattr(request, 'content') and hasattr(request.content, 'read'):
        # Try to read from POST body if available
        try:
          body = request.content.read().decode('utf-8')
          params = urllib.parse.parse_qs(body)
          token = params.get('captcha_token', [None])[0]
        except Exception:
          token = None
      if not token:
        request.setResponseCode(400)
        return b"Missing captcha token."

      # Validate token with external API
      if captcha_type == 'recaptcha':
        verify_url = 'https://www.google.com/recaptcha/api/siteverify'
      else:
        verify_url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
      data = urllib.parse.urlencode({
        'secret': captcha_secret,
        'response': token,
        'remoteip': request.getClientIP(),
      }).encode('utf-8')
      try:
        context = ssl.create_default_context()
        req = urllib.request.Request(verify_url, data=data)
        with urllib.request.urlopen(req, context=context, timeout=5) as resp:
          result = json.loads(resp.read().decode('utf-8'))
        if not result.get('success'):
          request.setResponseCode(403)
          return b"Captcha validation failed."
      except Exception as e:
        request.setResponseCode(500)
        return b"Captcha validation error."
      
    a = authgate(request, config.AUTHGATEDOMAIN)
    try:
      ticket = a.login_required(accepting=lambda x: True)
    except a.redirect_exception as e:
      pass
    else:
      # only used for informational purposes, the backend stores this seperately
      # so if the user changes it just their front end will be messed up!
      request.addCookie("user", ticket.username, path="/")

      qt = ticket.get("qticket")
      if not qt is None:
        getSessionData(request)["qticket"] = decodeQTicket(qt)
      
      self.__hit()
      if request.getCookie("jslogin"):
        self.deleteCookie(request, "jslogin")
        return """<html><head><script>window.opener.__qwebircAuthCallback(%s);</script></head></html>""" % json.dumps(ticket.username)

      location = request.getCookie("redirect")
      if location is None:
        location = "/"
      else:
        self.deleteCookie(request, "redirect")
        _, _, path, params, query, _ = urllib.parse.urlparse(urllib.parse.unquote(location))
        location = urllib.parse.urlunparse(("", "", path, params, query, ""))

      request.redirect(location)
      request.finish()
      
    return server.NOT_DONE_YET
  
  @property  
  def adminEngine(self):
    return dict(Logins=((self.__hit,),))
    
def decodeQTicket(qticket, p=re.compile("\x00*$"), cipher=qwebirc.util.rijndael.rijndael(hashlib.sha256(config.QTICKETKEY.encode("utf-8")).digest()[:16])):
  def decrypt(data):
    l = len(data)
    if l < BLOCK_SIZE * 2 or l % BLOCK_SIZE != 0:
      raise Exception("Bad qticket.")
    
    iv, data = data[:16], data[16:]
    cbc = qwebirc.util.ciphers.CBC(cipher, iv)
  
    # technically this is a flawed padding algorithm as it allows chopping at BLOCK_SIZE, we don't
    # care about that though!
    b = list(range(0, l-BLOCK_SIZE, BLOCK_SIZE))
    for i, v in enumerate(b):
      q = cbc.decrypt(data[v:v+BLOCK_SIZE])
      if i == len(b) - 1:
        yield re.sub(p, "", q)
      else:
        yield q
  return "".join(decrypt(qticket))
  
def getSessionData(request):
  return authgate.get_session_data(request)
  
def login_optional(request):
  return authgate(request, config.AUTHGATEDOMAIN).login_optional()
 
