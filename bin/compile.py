#!/usr/bin/env python


import sys
import os
import subprocess
import shutil
import time
import json

# Import-Logik für Direktaufruf oder als Modul

# Füge das Projekt-Hauptverzeichnis immer zum sys.path hinzu
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if project_root not in sys.path:
  sys.path.insert(0, project_root)

try:
  from . import dependencies
  from . import pages
  from bin import pagegen
except ImportError:
  import bin.dependencies as dependencies
  import bin.pages as pages
  import bin.pagegen as pagegen

dependencies.vcheck()

COPYRIGHT = open("js/copyright.js", "rb").read()
MCOMPILED_MARKER = ".compiled"
MCSS_SUFFIX = ".mcss"

# Simple build stats & logging
STATS = {
  'locales': 0,
  'css_bundles': 0,
  'js_bundles': 0,
  'js_minified': 0,
  'js_fallback': 0
}

def log(msg):
  print(f"[build] {msg}")

class MinifyException(Exception):
  pass
  

# Neue Minify-Funktion mit UglifyJS
def minify_with_uglify(src):
  try:
    p = subprocess.Popen(["uglifyjs", src], stdout=subprocess.PIPE)
  except Exception as e:
    raise MinifyException("unable to run uglifyjs: %s" % e)
  data, _ = p.communicate()
  if p.wait() != 0:
    raise MinifyException("uglifyjs failed")
  return data

JAVA_WARNING_SURPRESSED = False
def jmerge_files(prefix, suffix, output, files, *args, **kwargs):
  global COPYRIGHT
  output = output + "." + suffix
  o = os.path.join(prefix, "compiled", output)
  merge_files(o, files, *args)

  # Nur JS minifizieren
  is_js = suffix == "js"
  if is_js:
    try:
      compiled = minify_with_uglify(o)
      STATS['js_minified'] += 1
      log(f"Minified {output}")
    except MinifyException as e:
      global JAVA_WARNING_SURPRESSED
      if not JAVA_WARNING_SURPRESSED:
        JAVA_WARNING_SURPRESSED = True
        print("warning: minify: %s (not minifying -- javascript will be HUGE)." % e, file=sys.stderr)
      try:
        with open(o, "rb") as f:
          compiled = f.read()
      except Exception as e2:
        raise MinifyException("could not read unminified file: %s" % e2)
      STATS['js_fallback'] += 1
      log(f"Minify fallback (unminified) for {output}")
  else:
    with open(o, "rb") as f:
      compiled = f.read()
    STATS['css_bundles'] += 1
    log(f"Bundled CSS {output}")

  try:
    os.unlink(o)
  except OSError:
    time.sleep(1)
    try:
      os.unlink(o)
    except OSError:
      log(f"Warning: could not remove temp file {o}")

  with open(os.path.join(prefix, "static", suffix, output), "w", encoding="utf-8") as f:
    # COPYRIGHT is bytes, so decode it
    if isinstance(COPYRIGHT, bytes):
      f.write(COPYRIGHT.decode("utf-8"))
    else:
      f.write(COPYRIGHT)

    if kwargs.get("file_prefix"):
      f.write(kwargs.get("file_prefix"))

    # compiled ist bytes, daher dekodieren
    if isinstance(compiled, bytes):
      f.write(compiled.decode("utf-8"))
    else:
      f.write(compiled)
  
def merge_files(output, files, root_path=lambda x: x):
  with open(output, "w", encoding="utf-8") as f:
    for x in files:
      if x.startswith("//"):
        continue
      with open(root_path(x), "r", encoding="utf-8") as f2:
        content = f2.read().rstrip()
        if not content.endswith(";"):
          content += ";"
        f.write(content + "\n")

def main(outputdir=".", produce_debug=True):
  log("Starting build ...")
  log(f"Output directory: {os.path.abspath(outputdir)}")
  # Locales kopieren
  src_locales = os.path.join(os.path.dirname(__file__), "..", "locales")
  dest_locales = os.path.join(outputdir, "static", "locales")
  if not os.path.exists(dest_locales):
    os.makedirs(dest_locales)
  locale_index = []
  for fname in os.listdir(src_locales):
    if fname.endswith(".json") and fname != "index.json":
      src_file = os.path.join(src_locales, fname)
      dest_file = os.path.join(dest_locales, fname)
      shutil.copy2(src_file, dest_file)
      STATS['locales'] += 1
      # Versuche language_name zu extrahieren
      try:
        with open(src_file, "r", encoding="utf-8") as lf:
          data = json.load(lf)
          name = data.get("language_name") or fname.rsplit(".",1)[0]
      except Exception:
        name = fname.rsplit(".",1)[0]
      code = fname.rsplit(".",1)[0]
      locale_index.append({"code": code, "name": name})
  # Manifest schreiben
  try:
    with open(os.path.join(dest_locales, "index.json"), "w", encoding="utf-8") as mf:
      json.dump(locale_index, mf, ensure_ascii=False, indent=2)
  except Exception as e:
    log(f"Warning: could not write locale index: {e}")
  log(f"Copied {STATS['locales']} locale file(s)")
  ID = pagegen.getgitid()
  log(f"Detected git build id: {ID}")
  pagegen.main(outputdir, produce_debug=produce_debug)
  log("Generated base pages")

  coutputdir = os.path.join(outputdir, "compiled")
  if not os.path.isdir(coutputdir):
    try:
      os.mkdir(coutputdir)
    except OSError:
      log(f"Warning: could not create temp dir {coutputdir}")
    
  css_out_dir = os.path.join(outputdir, "static", "css")
  if not os.path.isdir(css_out_dir):
    try:
      os.mkdir(css_out_dir)
    except OSError:
      log(f"Warning: could not create css dir {css_out_dir}")
  
  #jmerge_files(outputdir, "js", "qwebirc", pages.DEBUG_BASE, lambda x: os.path.join("js", x + ".js"))

  for uiname, value in pages.UIs.items():
    log(f"Building UI '{uiname}' ...")
    csssrc = pagegen.csslist(uiname, True)
    jmerge_files(outputdir, "css", uiname + "-" + ID, csssrc)
    shutil.copy2(os.path.join(outputdir, "static", "css", uiname + "-" + ID + ".css"), os.path.join(outputdir, "static", "css", uiname + ".css"))
    
    mcssname = os.path.join("css", uiname + MCSS_SUFFIX)
    if os.path.exists(mcssname):
      mcssdest = os.path.join(outputdir, "static", "css", uiname + MCSS_SUFFIX)
      shutil.copy2(mcssname, mcssdest)
      shutil.copy2(mcssdest, os.path.join(outputdir, "static", "css", uiname + "-" + ID + MCSS_SUFFIX))
    
    #jmerge_files(outputdir, "js", uiname, value["uifiles"], lambda x: os.path.join("js", "ui", "frontends", x + ".js"))
    
    alljs = ["js/debugdisabled.js"]
    for y in pages.JS_BASE:
      alljs.append(os.path.join("static", "js", y + ".js"))
    for y in value.get("buildextra", []):
      alljs.append(os.path.join("static", "js", "%s.js" % y))
    for y in pages.DEBUG_BASE:
      alljs.append(os.path.join("js", y + ".js"))
    for y in value["uifiles"]:
      alljs.append(os.path.join("js", "ui", "frontends", y + ".js"))
  jmerge_files(outputdir, "js", uiname + "-" + ID, alljs, file_prefix="QWEBIRC_BUILD=\"" + ID + "\";\n")
  STATS['js_bundles'] += 1
  log(f"Bundled JS for UI '{uiname}'")

  try:
    os.rmdir(coutputdir)
  except OSError:
    log(f"Warning: could not remove temp dir {coutputdir}")
  log("Cleaned temporary compile directory")
  
  with open(MCOMPILED_MARKER, "w") as f:
    f.write("")
  log(f"Wrote {MCOMPILED_MARKER} marker")
  log("Build summary: Locales=%(locales)d CSS bundles=%(css_bundles)d JS bundles=%(js_bundles)d JS minified=%(js_minified)d (fallback=%(js_fallback)d)" % STATS)
  log("Build finished successfully.")
  
def has_compiled():
  try:
    with open(MCOMPILED_MARKER, "r"):
      return True
  except OSError:
    pass
    
  try:
    with open(os.path.join("bin", MCOMPILED_MARKER), "r"):
      return True
  except OSError:
    pass
  
  return False
  
def vcheck():
  if has_compiled():
    return
    
  print("error: not yet compiled, run compile.py first.", file=sys.stderr)
  sys.exit(1)
  
if __name__ == "__main__":
  main()
  
