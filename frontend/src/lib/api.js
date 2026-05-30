import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL;

if (!API_URL) {
  // eslint-disable-next-line no-console
  console.error("REACT_APP_API_URL is not set. Check frontend/.env");
}

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(async (config) => {
  if (typeof window !== "undefined" && window.Clerk?.session) {
    const token = await window.Clerk.session.getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
