import * as SecureStore from "expo-secure-store";

const ACCESS_KEY = "sgb2b_access_token";
const REFRESH_KEY = "sgb2b_refresh_token";

export const tokenStorage = {
  async getAccessToken() {
    return SecureStore.getItemAsync(ACCESS_KEY);
  },
  async setAccessToken(token: string | null) {
    if (token) await SecureStore.setItemAsync(ACCESS_KEY, token);
    else await SecureStore.deleteItemAsync(ACCESS_KEY);
  },
  async getRefreshToken() {
    return SecureStore.getItemAsync(REFRESH_KEY);
  },
  async setRefreshToken(token: string | null) {
    if (token) await SecureStore.setItemAsync(REFRESH_KEY, token);
    else await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
  async clear() {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
};
