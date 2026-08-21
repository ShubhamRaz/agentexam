import { apiClient, tokenStore } from './client';

/**
 * Auth service — login, register, current user, logout.
 * Uses the FastAPI /api/v1/auth/* endpoints.
 */

/**
 * Login with email + password.
 * Backend uses OAuth2 form-data format.
 * @returns {Promise<{ access_token: string, token_type: string }>}
 */
export async function login(email, password) {
  const data = await apiClient.loginForm(email, password);
  tokenStore.set(data.access_token);
  return data;
}

/**
 * Register a new student account.
 * @param {{ name: string, email: string, password: string }} userData
 * @returns {Promise<UserResponse>}
 */
export async function register(userData) {
  return apiClient.postPublic('/auth/register', {
    ...userData,
    role: 'STUDENT',
  });
}

/**
 * Get the currently authenticated user.
 * @returns {Promise<UserResponse>}
 */
export async function getMe() {
  return apiClient.get('/auth/me');
}

/**
 * Logout — clears the token from local storage.
 */
export function logout() {
  tokenStore.clear();
}
