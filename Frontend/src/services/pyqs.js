import client from './client';

export async function getPYQs(filters = {}) {
  const params = {};
  if (filters.subjectId) params.subject_id = filters.subjectId;
  
  const response = await client.get('/pyqs', { params });
  
  // Map backend MaterialResponse to what the UI expects for PYQs
  return response.data.map(p => ({
    id: p.id,
    subjectId: p.subject_id,
    subject: p.subject?.name || 'Subject',
    year: new Date(p.created_at).getFullYear(),
    question: p.title || p.file_name,
    topic: 'General', // Backend doesn't currently extract topics from PYQ files
    type: 'Document',
    marks: 10,
    frequency: 1
  }));
}
