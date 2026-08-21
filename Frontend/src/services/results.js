import { apiClient } from './client';

/** Results service */

/**
 * Get all results for the current student.
 * GET /api/v1/results
 */
export async function getResults({ skip = 0, limit = 20 } = {}) {
  return apiClient.get('/results', { skip, limit });
}

/**
 * Get detailed result for a specific exam.
 * GET /api/v1/results/exams/{exam_id}/result
 */
export async function getExamResult(examId) {
  return apiClient.get(`/results/exams/${examId}/result`);
}
