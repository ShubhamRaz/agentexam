/**
 * Centralized API client for AgentExam.
 * All API calls must go through this module — never put raw fetch() calls in components.
 *
 * Base URL is controlled by VITE_API_URL environment variable.
 * Token is read from localStorage and injected into every protected request.
 *
 * Error handling:
 *  - 401 Unauthorized → clears token, redirects to /login
 *  - All other HTTP errors → throws structured ApiError
 *  - Network failures → throws structured ApiError
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_PREFIX = '/api/v1';

const TOKEN_KEY = 'agentexam_token';

// ─── Token helpers ──────────────────────────────────────────────────────────

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// ─── Error class ────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(status, message, detail = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

// ─── Error message mapper ────────────────────────────────────────────────────

function mapErrorMessage(status, serverMessage) {
  const messages = {
    400: serverMessage || 'Invalid request. Please check your input.',
    401: 'Your session has expired. Please log in again.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    409: serverMessage || 'A conflict occurred (e.g., duplicate entry).',
    422: 'Validation error. Please check your input.',
    429: 'Too many requests. Please wait a moment and try again.',
    500: 'An internal server error occurred. Please try again later.',
  };
  return messages[status] || serverMessage || 'An unexpected error occurred.';
}

// ─── Core request function ───────────────────────────────────────────────────

/**
 * @param {string} endpoint - path starting with / e.g. "/auth/me"
 * @param {RequestInit} options - standard fetch options
 * @param {boolean} authenticated - whether to attach Authorization header
 * @returns {Promise<any>} parsed JSON response
 */
export async function request(endpoint, options = {}, authenticated = true) {
  const url = `${BASE_URL}${API_PREFIX}${endpoint}`;

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  if (isFormData && headers['Content-Type']) {
    delete headers['Content-Type'];
  }

  if (authenticated) {
    const token = tokenStore.get();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (networkError) {
    throw new ApiError(0, 'Network error. Please check your connection.');
  }

  // Handle 401 — expired or invalid token → redirect to login
  if (response.status === 401) {
    tokenStore.clear();
    // Only redirect if we're not already on /login or /register
    if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
      window.location.href = '/login';
    }
    throw new ApiError(401, mapErrorMessage(401, null));
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const serverMessage = data?.detail || data?.message || null;
    throw new ApiError(response.status, mapErrorMessage(response.status, serverMessage), serverMessage);
  }

  return data;
}

// ─── Convenience methods ─────────────────────────────────────────────────────

export const apiClient = {
  get: (endpoint, params = {}) => {
    const query = new URLSearchParams(params).toString();
    const fullEndpoint = query ? `${endpoint}?${query}` : endpoint;
    return request(fullEndpoint, { method: 'GET' });
  },

  post: (endpoint, body = {}) =>
    request(endpoint, { method: 'POST', body: JSON.stringify(body) }),

  put: (endpoint, body = {}) =>
    request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),

  patch: (endpoint, body = {}) =>
    request(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),

  /** Unauthenticated POST — used for login/register */
  postPublic: (endpoint, body = {}) =>
    request(endpoint, { method: 'POST', body: JSON.stringify(body) }, false),

  /** Upload file as multipart/form-data */
  upload: (endpoint, formData) =>
    request(endpoint, { method: 'POST', body: formData }, true),

  /** OAuth2 login (application/x-www-form-urlencoded) */
  loginForm: (username, password) => {
    const body = new URLSearchParams({ username, password });
    return request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    }, false);
  },
};

export default apiClient;
