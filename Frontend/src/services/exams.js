import { apiClient } from './client';

/**
 * Exams service — creates, starts, answers, and submits theory mock tests.
 *
 * Flow:
 *   POST /exams → create → { id }
 *   POST /exams/{id}/start → start timer, returns questions
 *   PUT  /exams/{id}/answers/{question_id} → save answer (idempotent)
 *   POST /exams/{id}/submit → finalize
 *   POST /results/exams/{id}/evaluate → trigger evaluation
 *   GET  /results/exams/{id}/result → get detailed result
 */

/**
 * Create a new mock test.
 * POST /api/v1/exams
 * @param {{ subject_id, test_type, difficulty_level, question_count, duration_minutes }} config
 */
export async function createExam(config) {
  return apiClient.post('/exams', config);
}

/**
 * List all mock tests for the current student.
 * GET /api/v1/exams
 */
export async function getExams({ skip = 0, limit = 20 } = {}) {
  return apiClient.get('/exams', { skip, limit });
}

/**
 * Start a specific exam (begins the timer, returns questions).
 * POST /api/v1/exams/{exam_id}/start
 */
export async function startExam(examId) {
  return apiClient.post(`/exams/${examId}/start`);
}

/**
 * Resume an active exam attempt (returns exam + questions + saved answers).
 * GET /api/v1/exams/{exam_id}/attempt
 */
export async function getAttempt(examId) {
  return apiClient.get(`/exams/${examId}/attempt`);
}

/**
 * Save/update an answer for a specific question (idempotent).
 * PUT /api/v1/exams/{exam_id}/answers/{question_id}
 * @param {{ question_id, selected_option_id?, answer_text? }} answerData
 */
export async function saveAnswer(examId, questionId, answerData) {
  return apiClient.put(`/exams/${examId}/answers/${questionId}`, answerData);
}

/**
 * Submit the exam (lock answers).
 * POST /api/v1/exams/{exam_id}/submit
 */
export async function submitExam(examId) {
  return apiClient.post(`/exams/${examId}/submit`);
}

/**
 * Trigger evaluation for a submitted exam.
 * POST /api/v1/results/exams/{exam_id}/evaluate
 */
export async function evaluateExam(examId) {
  return apiClient.post(`/results/exams/${examId}/evaluate`);
}

/**
 * Get the detailed result for an exam.
 * GET /api/v1/results/exams/{exam_id}/result
 */
export async function getExamResult(examId) {
  return apiClient.get(`/results/exams/${examId}/result`);
}
