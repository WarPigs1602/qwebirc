import os
import json
from typing import Dict, Optional

class I18n:
    def __init__(self, locales_dir: str, default_lang: str = "en"):
        self.locales_dir = locales_dir
        self.default_lang = default_lang
        self.translations: Dict[str, Dict[str, str]] = {}
        self._load_locales()

    def _load_locales(self):
        for filename in os.listdir(self.locales_dir):
            if filename.endswith(".json"):
                lang = filename[:-5]
                path = os.path.join(self.locales_dir, filename)
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        self.translations[lang] = json.load(f)
                except Exception as e:
                    print(f"Fehler beim Laden von {filename}: {e}")

    def gettext(self, key: str, lang: Optional[str] = None) -> str:
        lang = lang or self.default_lang
        if lang in self.translations and key in self.translations[lang]:
            return self.translations[lang][key]
        elif self.default_lang in self.translations and key in self.translations[self.default_lang]:
            return self.translations[self.default_lang][key]
        else:
            return key  # Fallback: Schlüssel selbst zurückgeben

# Beispiel für die Nutzung:
# i18n = I18n("/pfad/zu/locales", default_lang="de")
# print(i18n.gettext("greeting"))
