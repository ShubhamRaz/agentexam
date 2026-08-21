import { apiClient } from './client';

/**
 * Performance analytics service.
 * All endpoints require a Student role on the backend.
 */

/**
 * Get overall performance overview.
 * GET /api/v1/performance/me
 */
export async function getPerformanceOverview() {
  return apiClient.get('/performance/me');
}

/**
 * Get topic-level performance.
 * GET /api/v1/performance/me/topics
 */
export async function getTopicsPerformance() {
  return apiClient.get('/performance/me/topics');
}

/**
 * Get strong topics.
 * GET /api/v1/performance/me/strong-topics
 */
export async function getStrongTopics() {
  return apiClient.get('/performance/me/strong-topics');
}

/**
 * Get weak topics.
 * GET /api/v1/performance/me/weak-topics
 */
export async function getWeakTopics() {
  return apiClient.get('/performance/me/weak-topics');
}

/**
 * Get readiness score, risk areas, and recommendations.
 * GET /api/v1/performance/me/readiness
 */
export async function getReadiness() {
  return apiClient.get('/performance/me/readiness');
}
