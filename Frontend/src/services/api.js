/**
 * Legacy api.js — This file now delegates to the real service layer.
 * 
 * IMPORTANT: This file is kept for backward compatibility only.
 * All new code should import directly from the services/ directory:
 *   import { getPerformanceOverview } from './performance';
 *   import { getResults } from './results';
 *   etc.
 *
 * Mock data is NO LONGER returned by this module.
 * Real API calls go through client.js → FastAPI backend.
 */

import { getMe } from './auth';
import { getMaterials } from './materials';
import { getSubjectUnits } from './syllabus';
import { createExam, startExam, submitExam as submitExamService, evaluateExam, getExamResult } from './exams';
import { getPerformanceOverview } from './performance';

export const api = {
  /** @deprecated Use getMe() from services/auth.js instead */
  getUser: () => getMe(),

  /** @deprecated Use getMaterials() from services/materials.js instead */
  getMaterials: () => getMaterials({ limit: 20 }),

  /** @deprecated Use getSubjectUnits() from services/syllabus.js instead */
  getSyllabusAnalysis: (subjectId) => getSubjectUnits(subjectId),

  /** @deprecated Use getPerformanceOverview() from services/performance.js instead */
  getPerformanceData: () => getPerformanceOverview().then(data => {
    // Map to old chart-friendly format
    const topics = [...(data.strong_topics || []), ...(data.weak_topics || [])];
    return topics.map(t => ({
      name: t.topic_name,
      score: Math.round(t.accuracy),
      accuracy: Math.round(t.accuracy),
    }));
  }),

  /** @deprecated Use services/exams.js directly */
  startTheoryExam: async (config) => {
    const exam = await createExam(config || { subject_id: null, question_count: 10, duration_minutes: 30 });
    const attempt = await startExam(exam.id);
    return { examId: exam.id, questions: attempt.questions };
  },

  /** @deprecated Use services/exams.js directly */
  submitExam: async (examId) => {
    await submitExamService(examId);
    await evaluateExam(examId);
    return getExamResult(examId);
  },
};

export default api;
