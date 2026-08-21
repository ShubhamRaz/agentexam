import { apiClient } from './client';

/**
 * Viva sessions service.
 *
 * Flow:
 *   POST /vivas/start → create + start session, returns questions
 *   GET  /vivas → list sessions
 *   GET  /vivas/{session_id} → get session with answers
 *   PUT  /vivas/{session_id}/answers/{question_id} → save answer (idempotent)
 *   POST /vivas/{session_id}/submit → finalize session
 */

/**
 * Create and start a new viva session.
 * POST /api/v1/vivas/start
 * @param {{ subject_id, difficulty_level?, duration_minutes? }} sessionData
 */
export async function startVivaSession(sessionData) {
  return apiClient.post('/vivas/start', sessionData);
}

/**
 * List all viva sessions for the current student.
 * GET /api/v1/vivas
 */
export async function getVivaSessions({ skip = 0, limit = 20 } = {}) {
  return apiClient.get('/vivas', { skip, limit });
}

/**
 * Resume a viva session (returns session + questions + saved answers).
 * GET /api/v1/vivas/{session_id}
 */
export async function getVivaSession(sessionId) {
  return apiClient.get(`/vivas/${sessionId}`);
}

/**
 * Save a viva answer for a question (idempotent).
 * PUT /api/v1/vivas/{session_id}/answers/{question_id}
 * @param {{ question_id, answer_text }} answerData
 */
export async function saveVivaAnswer(sessionId, questionId, answerData) {
  return apiClient.put(`/vivas/${sessionId}/answers/${questionId}`, answerData);
}

/**
 * Finalize the viva session.
 * POST /api/v1/vivas/{session_id}/submit
 */
export async function submitVivaSession(sessionId) {
  return apiClient.post(`/vivas/${sessionId}/submit`);
}
