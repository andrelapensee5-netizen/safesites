import axios from 'axios';
import { useAuthStore } from '../utils/store';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/v1/auth/refresh', { refreshToken });
          useAuthStore.getState().setToken(data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        } catch {
          useAuthStore.getState().logout();
        }
      }
    }

    return Promise.reject(error);
  },
);

// Auth
export const authApi = {
  register: (data: object) => api.post('/auth/register', data),
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  verifyEmail: (token: string) => api.get(`/auth/verify-email?token=${token}`),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
};

// Users
export const usersApi = {
  me: () => api.get('/users/me'),
  updateProfile: (data: object) => api.patch('/users/me', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch('/users/me/password', { currentPassword, newPassword }),
};

// Documents
export const documentsApi = {
  list: () => api.get('/documents'),
  get: (id: string) => api.get(`/documents/${id}`),
  upload: (formData: FormData) =>
    api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: string) => api.delete(`/documents/${id}`),
  download: (id: string) => api.get(`/documents/${id}/download`),
};

// Analysis
export const analysisApi = {
  get: (documentId: string) => api.get(`/analysis/${documentId}`),
  retry: (documentId: string) => api.post(`/analysis/${documentId}/retry`),
};

// Subscriptions
export const subscriptionApi = {
  status: () => api.get('/subscriptions/status'),
  checkout: () => api.post('/subscriptions/checkout'),
  portal: () => api.post('/subscriptions/portal'),
  invoices: () => api.get('/subscriptions/invoices'),
};

// Notarizations
export const notarizationApi = {
  initiate: (documentId: string) => api.post(`/notarizations/${documentId}`),
  status: (documentId: string) => api.get(`/notarizations/${documentId}/status`),
};

export default api;
