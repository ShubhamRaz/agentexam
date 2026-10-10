import client from './client';

export async function createExam(config) {
  // Map frontend config to backend MockTestCreate
  const payload = {
    subject_id: config.subjectId,
    test_type: "THEORY",
    difficulty_level: config.difficulty.toUpperCase(),
    question_count: Number(config.questionCount) || 10,
    duration_minutes: Number(config.duration) || 30
  };
  const response = await client.post('/exams', payload);
  return response.data;
}

export async function startTest(examId) {
  const response = await client.post(`/exams/${examId}/start`);
  return response.data;
}

export async function submitAnswer(examId, questionId, answer) {
  const response = await client.put(`/exams/${examId}/answers/${questionId}`, {
    question_id: questionId,
    answer_text: answer
  });
  return response.data;
}

export async function submitTest(examId) {
  const response = await client.post(`/exams/${examId}/submit`);
  return response.data;
}
