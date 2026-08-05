import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { languageStorage } from "./languageStorage";
import { suggestLocale } from "./localeSuggest";
import { DEFAULT_LOCALE, translations, type Locale } from "./translations";

export type TranslateFn = (key: keyof (typeof translations)["tr"], vars?: Record<string, string | number>) => string;

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslateFn;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Restore whatever the user last picked — persisted the same way auth
  // tokens are (localStorage on web, SecureStore on native). If nothing was
  // ever explicitly picked, ask the backend to suggest a locale based on the
  // visitor's WAN IP (web only — see localeSuggest.web.ts; native always
  // resolves to null and keeps DEFAULT_LOCALE). The suggestion is
  // deliberately NOT persisted via languageStorage.set() — only an explicit
  // pick through setLocale()/LanguageSwitcher should stick; the IP guess
  // must re-evaluate fresh every session instead of overwriting a future
  // saved preference.
  useEffect(() => {
    languageStorage.get().then((saved) => {
      if (saved && saved in translations) {
        setLocaleState(saved as Locale);
        return;
      }
      suggestLocale().then((suggested) => {
        if (suggested) setLocaleState(suggested);
      });
    });
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    void languageStorage.set(next);
  };

  const t = useMemo<TranslateFn>(() => {
    return (key, vars) => {
      let text = translations[locale][key] ?? translations[DEFAULT_LOCALE][key] ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.replace(`{${name}}`, String(value));
        }
      }
      return text;
    };
  }, [locale]);

  return <LanguageContext.Provider value={{ locale, setLocale, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
