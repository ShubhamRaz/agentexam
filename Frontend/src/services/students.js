import { apiClient } from './client';

/** Student profile service */

/**
 * Get the current student's profile.
 * GET /api/v1/students/me
 */
export async function getStudentProfile() {
  return apiClient.get('/students/me');
}
