import { apiClient } from './client';

/** Materials service — reads materials from /api/v1/materials/
 *  Note: Upload is Admin/Teacher only. Students can only read.
 */

/**
 * List materials, optionally filtering by subject.
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
 * Get download URL for a material.
 * Constructs the URL — the browser handles the actual download.
 */
export function getMaterialDownloadUrl(materialId) {
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  return `${BASE_URL}/api/v1/materials/${materialId}/download`;
}
