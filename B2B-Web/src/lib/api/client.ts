import axios from "axios";
import { tokenStorage } from "../auth/tokenStorage";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost/b2b/b2b.api/api";

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
