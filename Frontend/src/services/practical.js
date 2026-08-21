import { apiClient } from './client';

/**
 * Practical sessions service.
 *
 * Flow:
 *   POST /practical/start → create + start session, returns experiments
 *   GET  /practical → list sessions
 *   GET  /practical/{session_id} → get session with submissions
 *   PUT  /practical/{session_id}/submissions → save submission (idempotent)
 *   POST /practical/{session_id}/submit → finalize session
 */

/**
 * Create and start a new practical session.
 * POST /api/v1/practical/start
 * @param {{ subject_id, difficulty_level?, duration_minutes? }} sessionData
 */
export async function startPracticalSession(sessionData) {
  return apiClient.post('/practical/start', sessionData);
}

/**
 * List all practical sessions for the current student.
 * GET /api/v1/practical
 */
export async function getPracticalSessions({ skip = 0, limit = 20 } = {}) {
  return apiClient.get('/practical', { skip, limit });
}

/**
 * Get a practical session with assigned experiments and submissions.
 * GET /api/v1/practical/{session_id}
 */
export async function getPracticalSession(sessionId) {
  return apiClient.get(`/practical/${sessionId}`);
}

/**
 * Save/update a submission for an experiment (idempotent).
 * PUT /api/v1/practical/{session_id}/submissions
 */
export async function saveSubmission(sessionId, submissionData) {
  return apiClient.put(`/practical/${sessionId}/submissions`, submissionData);
}

/**
 * Finalize the practical session.
 * POST /api/v1/practical/{session_id}/submit
 */
export async function submitPracticalSession(sessionId) {
  return apiClient.post(`/practical/${sessionId}/submit`);
}
