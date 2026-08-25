import client from './client';

export async function startViva(config) {
  const payload = {
    subject_id: config.subjectId,
    test_type: "VIVA",
    difficulty_level: config.difficulty || "MEDIUM",
    total_marks: 20,
    duration_minutes: 15
  };
  const response = await client.post('/viva/start', payload);
  return response.data;
}

export async function submitVivaAnswer(sessionId, questionId, answer) {
  const response = await client.put(`/viva/${sessionId}/answers/${questionId}`, {
    question_id: questionId,
    answer_text: answer
  });
  return response.data;
}

export async function endViva(sessionId) {
  const response = await client.post(`/viva/${sessionId}/submit`);
  return response.data;
}
