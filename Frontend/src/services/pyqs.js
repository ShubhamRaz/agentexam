import { apiClient } from './client';

/** PYQs service */

/**
 * List all PYQs, optionally filtered by subject.
 * GET /api/v1/pyqs/
 */
export async function getPYQs({ subjectId, skip = 0, limit = 20 } = {}) {
  const params = { skip, limit };
  if (subjectId) params.subject_id = subjectId;
  return apiClient.get('/pyqs/', params);
}

/**
 * Get a single PYQ by ID.
 * GET /api/v1/pyqs/{pyq_id}
 */
export async function getPYQ(pyqId) {
  return apiClient.get(`/pyqs/${pyqId}`);
}
