import { apiClient } from './client';

/** Academic/Syllabus service — subjects, units, topics */

/**
 * List subjects, optionally filtered by semester.
 * GET /api/v1/subjects/
 */
export async function getSubjects({ semesterId, skip = 0, limit = 20 } = {}) {
  const params = { skip, limit };
  if (semesterId) params.semester_id = semesterId;
  return apiClient.get('/subjects/', params);
}

/**
 * Get a single subject.
 * GET /api/v1/subjects/{subject_id}
 */
export async function getSubject(subjectId) {
  return apiClient.get(`/subjects/${subjectId}`);
}

/**
 * Get all units (with topics) for a subject.
 * GET /api/v1/subjects/{subject_id}/units
 */
export async function getSubjectUnits(subjectId) {
  return apiClient.get(`/subjects/${subjectId}/units`);
}

/**
 * Get PYQ materials for a subject.
 * GET /api/v1/subjects/{subject_id}/pyqs
 */
export async function getSubjectPYQs(subjectId, { skip = 0, limit = 20 } = {}) {
  return apiClient.get(`/subjects/${subjectId}/pyqs`, { skip, limit });
}
