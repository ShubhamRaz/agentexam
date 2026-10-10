import client from './client';

export async function getResults(examId) {
  const response = await client.get(`/results/exam/${examId}`);
  return response.data;
}

export async function getAllResults() {
  const response = await client.get('/results/me');
  return response.data;
}
