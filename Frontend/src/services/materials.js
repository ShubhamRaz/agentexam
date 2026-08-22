import { apiClient } from './client';

/**
 * List materials.
 * Students automatically see only their own uploads (enforced server-side).
 * Admins/teachers see all.
 * GET /api/v1/materials/
 */
export async function getMaterials({ subjectId, materialType, skip = 0, limit = 20 } = {}) {
  const params = { skip, limit };
  if (subjectId) params.subject_id = subjectId;
  if (materialType) params.material_type = materialType;
  return apiClient.get('/materials/', params);
}

/**
 * Get a single material by ID.
 * GET /api/v1/materials/{material_id}
 */
export async function getMaterial(materialId) {
  return apiClient.get(`/materials/${materialId}`);
}

/**
 * Upload a new academic material (students upload their own data).
 * POST /api/v1/materials/upload  (multipart/form-data)
 *
 * @param {object} opts
 * @param {string}   opts.title        Human-readable document name
 * @param {string}   opts.materialType One of: SYLLABUS, LAB_MANUAL, PYQ, NOTES, OTHER
 * @param {string}   opts.subjectId    UUID of the subject
 * @param {File}     opts.file         The file to upload
 */
export async function uploadMaterial({ title, materialType, subjectId, file }) {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('material_type', materialType);
  formData.append('subject_id', subjectId);
  formData.append('file', file);
  return apiClient.upload('/materials/upload', formData);
}

/**
 * Get download URL for a material.
 * Constructs the URL — the browser handles the actual download.
 */
export function getMaterialDownloadUrl(materialId) {
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  return `${BASE_URL}/api/v1/materials/${materialId}/download`;
}
