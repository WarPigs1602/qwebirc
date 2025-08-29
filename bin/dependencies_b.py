"""Dependency version / presence checks for mwebirc.

This file had indentation issues; rewritten cleanly preserving logic.
"""

import sys
import subprocess
import os


def fail(*message: str) -> None:
  print("\n".join(message), file=sys.stderr)
  sys.exit(1)


def warn(*message: str) -> None:
  print("warning:", "\nwarning: ".join(message), "\n", file=sys.stderr)


def check_dependencies() -> None:
  i = 0
  check_zope()
  check_twisted()
  check_win32()
  i += check_autobahn()
  i += check_json()
  i += check_java()
  i += check_git()
  print(f"0 errors, {i} warnings.")
  if i == 0:
    print("looks like you've got everything you need to run mwebirc!")
  else:
    print("you can run mwebirc despite these.")
  open(".checked", "w").close()


def check_win32() -> None:
  if not sys.platform.startswith("win"):
    return
  try:
    import win32con  # type: ignore  # noqa: F401
  except ImportError:
    fail("mwebirc requires pywin32, see:",
       "http://sourceforge.net/project/showfiles.php?group_id=78018")


def check_java() -> int:
  def java_warn(specific: str) -> None:
    warn(specific,
       "java is not required, but allows mwebirc to compress output,",
       "making it faster to download.",
       "you can get java at http://www.java.com/")
  try:
    p = subprocess.Popen(["java", "-version"], stdout=subprocess.PIPE,
               stderr=subprocess.PIPE, shell=os.name == "nt")
    p.communicate()
    if p.wait() != 0:
      java_warn("something went wrong looking for java.")
      return 1
  except Exception:
    java_warn("couldn't find java.")
    return 1
  return 0


def check_git() -> int:
  def git_warn(specific: str) -> None:
    warn(specific,
       "git is not required, but allows mwebirc to save bandwidth by versioning.")
  try:
    p = subprocess.Popen(["git", "rev-parse", "HEAD"], stdout=subprocess.PIPE,
               stderr=subprocess.PIPE, shell=os.name == "nt")
    p.communicate()
    if p.wait() != 0:
      git_warn("something went wrong looking for git.")
      return 1
  except Exception:
    git_warn("couldn't find git.")
    return 1
  return 0


def check_zope() -> None:
  try:
    from zope.interface import Interface  # noqa: F401
  except ImportError:
    if sys.platform.startswith("win"):
      fail("mwebirc requires zope interface",
         "see pypi: http://pypi.python.org/pypi/zope.interface")
    else:
      fail("mwebirc requires zope interface.",
         "this should normally come with twisted, but can be downloaded",
         "from pypi: http://pypi.python.org/pypi/zope.interface")


def check_twisted() -> None:
  try:
    import twisted  # noqa: F401
  except ImportError:
    fail("mwebirc requires twisted (at least 8.2.0), see http://twistedmatrix.com/")

  def twisted_fail(x: str, y: str | None = None) -> None:
    fail("you don't seem to have twisted's %s module." % x,
       "your distro is most likely modular, look for a twisted %s package%s." % (x, f" {y}" if y else "",))

  try:
    import twisted.names  # noqa: F401
  except ImportError:
    twisted_fail("names")
  try:
    import twisted.mail  # noqa: F401
  except ImportError:
    twisted_fail("mail")
  try:
    import twisted.web  # noqa: F401
  except ImportError:
    twisted_fail("web", "(not web2)")
  try:
    import twisted.words  # noqa: F401
  except ImportError:
    twisted_fail("words")


def check_json() -> int:
  import qwebirc.util.qjson
  if qwebirc.util.qjson.slow:  # type: ignore[attr-defined]
    warn("simplejson module with C speedups not installed.",
       "using embedded module (slower); consider installing simplejson from:",
       "http://pypi.python.org/pypi/simplejson/")
    return 1
  return 0


def check_autobahn() -> int:
  import qwebirc.util.autobahn_check as autobahn_check
  v = autobahn_check.check()
  if v is True:
    return 0
  if v is False:
    warn("autobahn not installed; websocket support will be disabled.",
       "consider installing autobahn from:",
       "http://autobahn.ws/python/getstarted/")
    return 1
  warn(f"error loading autobahn: {v}; websocket support will be disabled.",
     "consider installing/upgrading autobahn from:",
     "http://autobahn.ws/python/getstarted/")
  return 1


if __name__ == "__main__":
  from . import dependencies  # type: ignore
  dependencies.check_dependencies()
