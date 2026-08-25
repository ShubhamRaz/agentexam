import client from './client';

export async function getMaterials(subjectId = null) {
  const params = subjectId ? { subject_id: subjectId } : {};
  const response = await client.get('/materials', { params });
  
  // Map backend response fields to what the UI expects
  return response.data.map(mat => ({
    ...mat,
    name: mat.title,
    type: mat.material_type?.toLowerCase() || 'notes',
    status: mat.processing_status?.toLowerCase() || 'completed',
    subject: mat.subject?.name || 'Subject',
    pages: mat.pages || 0,
    size: (mat.file_size / 1024).toFixed(1) + ' KB',
    uploadDate: mat.created_at
  }));
}

export async function uploadMaterial(file, type, subjectId) {
  const formData = new FormData();
  formData.append('file', file);
  // Backend auth or material upload endpoints usually expect specific fields
  // Let's pass query params or form data depending on backend implementation
  formData.append('type', type);
  if (subjectId) {
    formData.append('subject_id', subjectId);
  }

  const response = await client.post('/materials/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export async function getMaterial(materialId) {
  const response = await client.get(`/materials/${materialId}`);
  return response.data;
}
