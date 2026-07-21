import axios from "axios";
import { tokenStorage } from "../auth/tokenStorage";
import { resolveApiUrl } from "./apiUrl";

// Single source of truth for the API address. On web this is resolved at
// RUNTIME from the page hostname (see apiUrl.web.ts — same dist/ works on
// dev.b2b and b2b); on native it stays the build-time EXPO_PUBLIC_API_URL
// (see apiUrl.native.ts). Module evaluation is safe in both the browser
// (window exists before any bundle code runs) and the Node.js prerender
// (guarded in apiUrl.web.ts).
export const API_URL = resolveApiUrl();

export const apiClient = axios.create({ baseURL: API_URL });

apiClient.interceptors.request.use(async (config) => {
  const token = await tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await tokenStorage.getRefreshToken();
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
    await tokenStorage.setAccessToken(data.accessToken);
    await tokenStorage.setRefreshToken(data.refreshToken);
    return data.accessToken as string;
  } catch {
    await tokenStorage.clear();
    return null;
  }
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && (await tokenStorage.getRefreshToken())) {
      original._retry = true;
      refreshPromise ??= refreshAccessToken();
      const newToken = await refreshPromise;
      refreshPromise = null;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      }
    }
    return Promise.reject(error);
  },
);
