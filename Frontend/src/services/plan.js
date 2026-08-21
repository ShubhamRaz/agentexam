import client from './client';

export const getStudyPlan = async () => {
  return client.get('/study-plan/me');
};

export const generateStudyPlan = async () => {
  return client.post('/study-plan/generate');
};

export const updateTaskStatus = async (taskId, status) => {
  return client.patch(`/study-plan/tasks/${taskId}/status`, { status });
};
