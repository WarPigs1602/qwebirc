#!/usr/bin/env python

import sys
import os
import subprocess
import shutil
import time

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

class MinifyException(Exception):
  pass
  
def jarit(src):
  try:
    p = subprocess.Popen(["java", "-jar", "bin/yuicompressor-2.4.8.jar", src], stdout=subprocess.PIPE, shell=os.name == "nt")
  except Exception as e:
    if hasattr(e, "errno") and e.errno == 2:
      raise MinifyException("unable to run java")
    raise
  data = p.communicate()[0]
  if p.wait() != 0:
    raise MinifyException("an error occured")
  return data

JAVA_WARNING_SURPRESSED = False
def jmerge_files(prefix, suffix, output, files, *args, **kwargs):
  global COPYRIGHT
  output = output + "." + suffix
  o = os.path.join(prefix, "compiled", output)
  merge_files(o, files, *args)
  
  # cough hack
  try:
    compiled = jarit(o)
  except MinifyException as e:
    global JAVA_WARNING_SURPRESSED
    if not JAVA_WARNING_SURPRESSED:
      JAVA_WARNING_SURPRESSED = True
      print("warning: minify: %s (not minifying -- javascript will be HUGE)." % e, file=sys.stderr)
    try:
      f = open(o, "rb")
      compiled = f.read()
    finally:
      f.close()

  try:
    os.unlink(o)
  except:
    time.sleep(1) # windows sucks
    os.unlink(o)
    
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
        f.write(f2.read() + "\n")

def main(outputdir=".", produce_debug=True):
  ID = pagegen.getgitid()
  
  pagegen.main(outputdir, produce_debug=produce_debug)

  coutputdir = os.path.join(outputdir, "compiled")
  try:
    os.mkdir(coutputdir)
  except:
    pass
    
  try:
    os.mkdir(os.path.join(outputdir, "static", "css"))
  except:
    pass
  
  #jmerge_files(outputdir, "js", "qwebirc", pages.DEBUG_BASE, lambda x: os.path.join("js", x + ".js"))

  for uiname, value in list(pages.UIs.items()):
    csssrc = pagegen.csslist(uiname, True)
    jmerge_files(outputdir, "css", uiname + "-" + ID, csssrc)
    shutil.copy2(os.path.join(outputdir, "static", "css", uiname + "-" + ID + ".css"), os.path.join(outputdir, "static", "css", uiname + ".css"))
    
    mcssname = os.path.join("css", uiname + ".mcss")
    if os.path.exists(mcssname):
      mcssdest = os.path.join(outputdir, "static", "css", uiname + ".mcss")
      shutil.copy2(mcssname, mcssdest)
      shutil.copy2(mcssdest, os.path.join(outputdir, "static", "css", uiname + "-" + ID + ".mcss"))
    
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

  os.rmdir(coutputdir)
  
  f = open(".compiled", "w")
  f.close()
  
def has_compiled():
  try:
    f = open(".compiled", "r")
    f.close()
    return True
  except:
    pass
    
  try:
    f = open(os.path.join("bin", ".compiled"), "r")
    f.close()
    return True
  except:
    pass
  
  return False
  
def vcheck():
  if has_compiled():
    return
    
  print("error: not yet compiled, run compile.py first.", file=sys.stderr)
  sys.exit(1)
  
if __name__ == "__main__":
  main()
  
