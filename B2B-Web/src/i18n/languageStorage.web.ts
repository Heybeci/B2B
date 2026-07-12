const LANGUAGE_KEY = "sgb2b.language";

export const languageStorage = {
  async get() {
    return localStorage.getItem(LANGUAGE_KEY);
  },
  async set(language: string) {
    localStorage.setItem(LANGUAGE_KEY, language);
  },
};
