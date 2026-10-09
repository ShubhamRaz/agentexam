import client from './client';

export async function getPYQs(filters = {}) {
  const params = { source: 'PYQ', limit: 100 };
  if (filters.subjectId) params.subject_id = filters.subjectId;
  
  const response = await client.get('/questions', { params });
  
  // Map backend Question objects to what the UI expects for PYQs
  return (response.data.items || []).map(q => ({
    id: q.id,
    subjectId: q.subject_id,
    subject: q.subject?.name || 'Subject',
    year: new Date(q.created_at || Date.now()).getFullYear(),
    question: q.question_text,
    topic: q.topic?.name || 'General',
    type: q.question_type === 'LONG_ANSWER' ? 'Long Answer' : q.question_type === 'SHORT_ANSWER' ? 'Short Answer' : 'Objective',
    marks: q.marks || 5,
    frequency: 1
  }));
}
