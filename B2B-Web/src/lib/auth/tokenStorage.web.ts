const ACCESS_KEY = "sgb2b.accessToken";
const REFRESH_KEY = "sgb2b.refreshToken";

export const tokenStorage = {
  async getAccessToken() {
    return localStorage.getItem(ACCESS_KEY);
  },
  async setAccessToken(token: string | null) {
    if (token) localStorage.setItem(ACCESS_KEY, token);
    else localStorage.removeItem(ACCESS_KEY);
  },
  async getRefreshToken() {
    return localStorage.getItem(REFRESH_KEY);
  },
  async setRefreshToken(token: string | null) {
    if (token) localStorage.setItem(REFRESH_KEY, token);
    else localStorage.removeItem(REFRESH_KEY);
  },
  async clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};
