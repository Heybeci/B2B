import * as SecureStore from "expo-secure-store";

const LANGUAGE_KEY = "sgb2b_language";

export const languageStorage = {
  async get() {
    return SecureStore.getItemAsync(LANGUAGE_KEY);
  },
  async set(language: string) {
    await SecureStore.setItemAsync(LANGUAGE_KEY, language);
  },
};
