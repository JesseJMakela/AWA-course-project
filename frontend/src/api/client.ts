import axios, { isAxiosError } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Single shared Axios instance — request interceptor adds the JWT automatically
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — adds the Authorization header before each request.
// The token is read fresh on every call so a logout (which clears localStorage)
// is reflected immediately without restarting the app.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Auth API — registration, login, and current-user lookup
// ---------------------------------------------------------------------------
export const authAPI = {
  /** Register a new account and receive a JWT on success. */
  register: (email: string, password: string, username: string) =>
    api.post('/auth/register', { email, password, username }),
  
  /** Authenticate with email/password credentials and receive a JWT. */
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  /** Fetch the profile of the currently authenticated user. */
  getMe: () => api.get('/auth/me'),
};

// ---------------------------------------------------------------------------
// Document API — CRUD, locking, sharing, and public links
// ---------------------------------------------------------------------------
export const documentAPI = {
  /** Return all documents the current user owns or has been granted access to. */
  getAll: () => api.get('/documents'),
  
  /** Fetch a single document by its MongoDB ID. */
  getById: (id: string) => api.get(`/documents/${id}`),
  
  /** Create a new document with the given title and optional initial content. */
  create: (title: string, content?: string) =>
    api.post('/documents', { title, content }),
  
  /** Save updated title and/or content for an existing document. */
  update: (id: string, data: { title?: string; content?: string }) =>
    api.put(`/documents/${id}`, data),
  
  /** Permanently delete a document (owner only). */
  delete: (id: string) => api.delete(`/documents/${id}`),
  
  /**
   * Acquire an exclusive edit lock on the document.
   * The server grants a 10-minute lock to prevent two users editing simultaneously.
   * The lock is automatically considered stale after expiry so a tab-close
   * cannot permanently block editing.
   */
  lock: (id: string) => api.post(`/documents/${id}/lock`),
  
  /** Release the edit lock acquired by the current user. */
  unlock: (id: string) => api.post(`/documents/${id}/unlock`),
  
  /** Share the document with one or more users by e-mail address. */
  share: (id: string, emails: string[], permission: 'edit' | 'view') =>
    api.post(`/documents/${id}/share`, { emails, permission }),
  
  /** Remove all access for a specific user from the document. */
  removePermission: (id: string, userId: string) =>
    api.delete(`/documents/${id}/share/${userId}`),
  
  /** Generate a random public link so the document can be read without login. */
  generatePublicLink: (id: string) => api.post(`/documents/${id}/public`),
  
  /** Disable public access and delete the public link. */
  removePublicLink: (id: string) => api.delete(`/documents/${id}/public`),
  
  /** Fetch a document using its public link token (no auth required). */
  getByPublicLink: (link: string) => api.get(`/documents/public/${link}`),
};

// ---------------------------------------------------------------------------
// User API — search for other users to share documents with
// ---------------------------------------------------------------------------
export const userAPI = {
  /** Search users by partial e-mail match (used in the share dialog). */
  search: (query: string) => api.get(`/users/search?q=${encodeURIComponent(query)}`),
};

// ---------------------------------------------------------------------------
// File API — drive image and avatar management
// Multipart/form-data is used for uploads; the Content-Type header is set
// explicitly to let Axios build the correct boundary.
// ---------------------------------------------------------------------------
export const fileAPI = {
  // Drive images
  /** Upload a new image to the user's personal drive. */
  uploadImage: (file: File) => {
    const form = new FormData();
    form.append('image', file);
    return api.post('/files/images', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  /** List all images in the current user's drive. */
  getImages: () => api.get('/files/images'),
  /** Delete a drive image by its ID (also removes the file from disk). */
  deleteImage: (id: string) => api.delete(`/files/images/${id}`),

  // Avatar
  /** Upload or replace the current user's profile picture. */
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return api.post('/files/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  /** Remove the current user's profile picture entirely. */
  deleteAvatar: () => api.delete('/files/avatar'),
};

export default api;

// ---------------------------------------------------------------------------
// Error utilities
// ---------------------------------------------------------------------------

/** Shape of a field-level validation error returned by express-validator. */
interface ValidationError { msg: string }

/** Shape of the JSON error body returned by the API. */
interface ApiErrorResponse {
  error?: string;
  errors?: ValidationError[];
}

/**
 * Extract a human-readable message from an unknown catch value.
 *
 * Priority:
 *  1. express-validator field errors (joined with ·)
 *  2. top-level `error` string from the API response
 *  3. the provided fallback string
 */
export function getApiError(err: unknown, fallback = 'An error occurred'): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as ApiErrorResponse | undefined;
    if (data?.errors?.length) return data.errors.map(e => e.msg).join(' · ');
    return data?.error ?? fallback;
  }
  return fallback;
}
