import axios from 'axios';

// Default to relative /api for client-side routing through Nginx
const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api';

const api = axios.create({
  baseURL,
  withCredentials: true, // Important for sending/receiving cookies across domains/ports
});

export const getTabSessionToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  let token = sessionStorage.getItem('session_token');
  if (!token) {
    token = localStorage.getItem('latest_session_token');
    if (token) {
      sessionStorage.setItem('session_token', token);
    }
  }
  return token;
};

export const setTabSessionToken = (token: string) => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('session_token', token);
  localStorage.setItem('latest_session_token', token);
};

export const clearTabSessionToken = () => {
  if (typeof window === 'undefined') return;
  const currentToken = sessionStorage.getItem('session_token');
  sessionStorage.removeItem('session_token');
  if (localStorage.getItem('latest_session_token') === currentToken) {
    localStorage.removeItem('latest_session_token');
  }
};

api.interceptors.request.use((config) => {
  const token = getTabSessionToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      clearTabSessionToken();
    }
    return Promise.reject(error);
  }
);

export const fetcher = (url: string) => api.get(url).then(res => res.data);

export default api;
