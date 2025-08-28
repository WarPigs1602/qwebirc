import os
import sys
try:
  from bin import pages
  from bin import optionsgen
except ImportError:
  import os, sys
  sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
  import pages
  import optionsgen
import subprocess
import re
try:
  import config
except ImportError:
  import os, sys
  sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
  import config

class GitException(Exception):
  pass
  
def jslist(name, debug):
  ui = pages.UIs[name]
  if debug:
    x = [pages.JS_DEBUG_BASE, ui.get("extra", []), pages.DEBUG, ["debug/ui/frontends/%s" % y for y in ui["uifiles"]]]
    gitid = ""
  else:
    x = [pages.JS_RAW_BASE, name]
    gitid = "-" + getgitid()  

  l = []
  for url in pages.flatten(x):
    if isinstance(url, tuple):
      url, digest = url
    else:
      digest = None
    l.append((url if url.startswith("//") else "js/%s%s.js" % (url, gitid), digest))
  return l

def csslist(name, debug, gen=False):
  ui = pages.UIs[name]
  nocss = ui.get("nocss")
  if not debug:
    return ["css/%s-%s.css" % (name, getgitid())]
  css = list(pages.flatten([ui.get("extracss", []), "colours", "dialogs"]))
  if not nocss:
    css+=[name]
  css = ["%s.css" % x for x in css]
  if hasattr(config, "CUSTOM_CSS"):
    css+=[config.CUSTOM_CSS]
  return ["css/%s%s" % ("debug/" if gen else "", x) for x in css]

def _getgitid():
  try:
    p = subprocess.Popen(["git", "rev-parse", "HEAD"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=os.name == "nt")
    try:
      data, err = p.communicate(timeout=5)
    except subprocess.TimeoutExpired:
      p.kill()
      raise GitException("git command timed out")
    if p.returncode != 0:
      raise GitException(f"git failed: {err.decode('utf-8').strip()}")
    data_str = data.decode("utf-8")
    m = re.match("^([0-9a-f]+).*", data_str)
    if not m:
      raise GitException("git output not recognized")
    return m.group(1)
  except Exception as e:
    raise GitException(f"Exception running git: {e}")

GITID = None
def getgitid():
  global GITID
  if GITID is None:
    try:
      GITID =  _getgitid()
    except GitException as e:
      print("warning: git: %s (using a random id)." % e, file=sys.stderr)
      GITID = os.urandom(10).encode("hex")
  return GITID
    
def producehtml(name, debug):
  ui = pages.UIs[name]
  js = jslist(name, debug)
  css = csslist(name, debug, gen=True)
  gid = getgitid()

  # Locales-JSON-Dateien als preload verlinken
  locales_dir = os.path.join(os.path.dirname(__file__), "..", "locales")
  preload_locales = ""
  if os.path.exists(locales_dir):
    for fname in os.listdir(locales_dir):
      if fname.endswith(".json"):
        preload_locales += '  <link rel="preload" href="%slocales/%s" as="fetch" type="application/json" crossorigin>\n' % (config.STATIC_BASE_URL, fname)

  csshtml = "\n".join("  <link rel=\"stylesheet\" href=\"%s%s\" type=\"text/css\"/>" % (config.STATIC_BASE_URL, x) for x in css)

  def toscript(xxx_todo_changeme):
    (url, digest) = xxx_todo_changeme
    if digest:
      subresource_int = " integrity=\"%s\" crossorigin=\"anonymous\"" % digest
    else:
      subresource_int = ""
    return "  <script type=\"text/javascript\" src=\"%s%s\"%s></script>" % ("" if url.startswith("//") else config.STATIC_BASE_URL, url, subresource_int)

  jshtml = "\n".join(toscript(x) for x in js)

  if hasattr(config, "ANALYTICS_HTML"):
    jshtml+="\n" + config.ANALYTICS_HTML

  div = ui.get("div", "")
  customjs = ui.get("customjs", "")

  captcha_js = """
  <script>
    window.CAPTCHA_TYPE = \"%s\";
    window.CAPTCHA_SITE_KEY = \"%s\";
  </script>
  """ % (getattr(config, "CAPTCHA_TYPE", ""), getattr(config, "CAPTCHA_SITE_KEY", ""))

  return """%s
<html xmlns=\"http://www.w3.org/1999/xhtml\" xml:lang=\"en\" lang=\"en\">
<head>
  <base />
  <title>%s (mwebirc)</title>
  <meta http-equiv=\"Content-Type\" content=\"text/html;charset=utf-8\"/>
  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=0\" />
  <meta name=\"mobile-web-app-capable\" content=\"yes\" />
  <!-- New mwebirc favicons (cache-busted); legacy qwebirc fallbacks kept last -->
  <link rel=\"icon\" type=\"image/svg+xml\" href=\"%simages/mwebirc-favicon.svg?v=%s\" />
  <link rel=\"icon\" sizes=\"16x16\" href=\"%simages/mwebirc-favicon-16.png?v=%s\" />
  <link rel=\"icon\" sizes=\"32x32\" href=\"%simages/mwebirc-favicon-32.png?v=%s\" />
  <link rel=\"icon\" sizes=\"48x48\" href=\"%simages/mwebirc-favicon-48.png?v=%s\" />
  <link rel=\"icon\" sizes=\"64x64\" href=\"%simages/mwebirc-favicon-64.png?v=%s\" />
  <link rel=\"icon\" sizes=\"192x192\" href=\"%simages/mwebirc-favicon-192.png?v=%s\" />
  <link rel=\"apple-touch-icon\" href=\"%simages/mwebirc-favicon-192.png?v=%s\" />
  <link rel=\"shortcut icon\" href=\"%sfavicon.ico?v=%s\" />
  <!-- Legacy (will be ignored if new ones cached) -->
  <link rel=\"icon\" sizes=\"192x192\" href=\"%simages/highresicon.png\"/>
  <link rel=\"shortcut icon\" type=\"image/png\" href=\"%simages/favicon.png\"/>
  <meta name=\"theme-color\" content=\"#232634\" />
%s%s%s<script type=\"text/javascript\">QWEBIRC_DEBUG=%s;</script>%s
%s
  <script type=\"text/javascript\">
    var ui = new qwebirc.ui.Interface(\"ircui\", qwebirc.ui.%s, %s);
  </script>
</head>
<body>
  <div id=\"ircui\">
    <noscript>
      <div id=\"noscript\">Javascript is required to use IRC.</div>
    </noscript>%s
  </div>
</body>
</html>
""" % (
    ui["doctype"],
    config.APP_TITLE,
    config.STATIC_BASE_URL, gid,   # svg
    config.STATIC_BASE_URL, gid,   # 16
    config.STATIC_BASE_URL, gid,   # 32
    config.STATIC_BASE_URL, gid,   # 48
    config.STATIC_BASE_URL, gid,   # 64
    config.STATIC_BASE_URL, gid,   # 192
    config.STATIC_BASE_URL, gid,   # apple
    config.STATIC_BASE_URL, gid,   # ico
    config.STATIC_BASE_URL,        # legacy highres
    config.STATIC_BASE_URL,        # legacy png
    preload_locales,
    csshtml,
    captcha_js,
    debug and "true" or "false",
    customjs,
    jshtml,
    ui["class"],
    optionsgen.get_options(),
    div,
  )

def main(outputdir=".", produce_debug=True):
  p = os.path.join(outputdir, "static")
  for x in pages.UIs:
    if produce_debug:
      with open(os.path.join(p, "%sdebug.html" % x), "w", encoding="utf-8") as f:
        f.write(producehtml(x, debug=True))
    with open(os.path.join(p, "%s.html" % x), "w", encoding="utf-8") as f:
      f.write(producehtml(x, debug=False))

if __name__ == "__main__":
  main()
  
