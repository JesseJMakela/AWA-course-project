import axios, { isAxiosError } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const authAPI = {
  register: (email: string, password: string, username: string) =>
    api.post('/auth/register', { email, password, username }),
  
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  getMe: () => api.get('/auth/me'),
};

// Document APIs
export const documentAPI = {
  getAll: () => api.get('/documents'),
  
  getById: (id: string) => api.get(`/documents/${id}`),
  
  create: (title: string, content?: string) =>
    api.post('/documents', { title, content }),
  
  update: (id: string, data: { title?: string; content?: string }) =>
    api.put(`/documents/${id}`, data),
  
  delete: (id: string) => api.delete(`/documents/${id}`),
  
  lock: (id: string) => api.post(`/documents/${id}/lock`),
  
  unlock: (id: string) => api.post(`/documents/${id}/unlock`),
  
  share: (id: string, emails: string[], permission: 'edit' | 'view') =>
    api.post(`/documents/${id}/share`, { emails, permission }),
  
  removePermission: (id: string, userId: string) =>
    api.delete(`/documents/${id}/share/${userId}`),
  
  generatePublicLink: (id: string) => api.post(`/documents/${id}/public`),
  
  removePublicLink: (id: string) => api.delete(`/documents/${id}/public`),
  
  getByPublicLink: (link: string) => api.get(`/documents/public/${link}`),
};

// User APIs
export const userAPI = {
  search: (query: string) => api.get(`/users/search?q=${encodeURIComponent(query)}`),
};

// File APIs
export const fileAPI = {
  // Drive images
  uploadImage: (file: File) => {
    const form = new FormData();
    form.append('image', file);
    return api.post('/files/images', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getImages: () => api.get('/files/images'),
  deleteImage: (id: string) => api.delete(`/files/images/${id}`),

  // Avatar
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return api.post('/files/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  deleteAvatar: () => api.delete('/files/avatar'),
};

export default api;

// Typed API error response shapes
interface ValidationError { msg: string }
interface ApiErrorResponse {
  error?: string;
  errors?: ValidationError[];
}

/** Extract a human-readable message from an unknown catch value */
export function getApiError(err: unknown, fallback = 'An error occurred'): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as ApiErrorResponse | undefined;
    if (data?.errors?.length) return data.errors.map(e => e.msg).join(' · ');
    return data?.error ?? fallback;
  }
  return fallback;
}
