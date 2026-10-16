import client from './client';

export async function getQuestions(subjectId, count = 10) {
  const params = { limit: count };
  if (subjectId) params.subject_id = subjectId;
  const response = await client.get('/questions', { params });
  return response.data;
}
