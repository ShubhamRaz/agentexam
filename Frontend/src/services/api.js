// ============================================
// AGENTEXAM — Service Layer (API-Ready)
// ============================================

import { subjects, units, student } from '../data/mockSubjects';
import { mockQuestions, mockTestResults, recentActivity } from '../data/mockQuestions';
import { mockPYQs, mockMaterials, mockPerformance, mockReadiness } from '../data/mockPYQs';
import { mockStudyPlan, mockVivaSession, mockVivaEvaluation, mockPracticals } from '../data/mockStudyPlan';

// Simulate API delay
const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// ---- Dashboard ----
export async function getDashboard() {
  await delay(400);
  return {
    student,
    readinessScore: mockReadiness.overallScore,
    examDate: mockReadiness.examDate,
    daysLeft: mockReadiness.daysLeft,
    recentTests: mockTestResults.slice(0, 3),
    recentActivity: recentActivity,
    todayTasks: mockStudyPlan.days[0].tasks,
    weakTopics: mockPerformance.weakTopics.slice(0, 3),
    subjectPerformance: mockPerformance.subjectPerformance,
  };
}

// ---- Subjects ----
export async function getSubjects() {
  await delay(300);
  return subjects;
}

export async function getSubjectUnits(subjectId) {
  await delay(300);
  return units[subjectId] || [];
}

// ---- Materials ----
export async function getMaterials(subjectId = null) {
  await delay(400);
  if (subjectId) {
    return mockMaterials.filter(m => m.subjectId === subjectId);
  }
  return mockMaterials;
}

export async function uploadMaterial(file) {
  await delay(1500);
  return {
    id: `mat-${Date.now()}`,
    name: file.name || 'Uploaded Document',
    type: 'notes',
    subject: 'Data Structures',
    subjectId: 'ds',
    uploadDate: new Date().toISOString().split('T')[0],
    pages: Math.floor(Math.random() * 20) + 5,
    size: `${(Math.random() * 3 + 0.5).toFixed(1)} MB`,
    status: 'processing',
    format: 'PDF',
  };
}

// ---- Syllabus ----
export async function getSyllabus(subjectId) {
  await delay(300);
  return {
    subject: subjects.find(s => s.id === subjectId),
    units: units[subjectId] || [],
  };
}

// ---- PYQs ----
export async function getPYQs(filters = {}) {
  await delay(400);
  let filtered = [...mockPYQs];
  if (filters.subjectId) filtered = filtered.filter(p => p.subjectId === filters.subjectId);
  if (filters.year) filtered = filtered.filter(p => p.year === filters.year);
  if (filters.type) filtered = filtered.filter(p => p.type === filters.type);
  return filtered;
}

// ---- Questions / Exam ----
export async function getQuestions(subjectId, count = 10) {
  await delay(500);
  const subjectQs = mockQuestions.filter(q => q.subject === subjectId);
  return subjectQs.length > 0 ? subjectQs.slice(0, count) : mockQuestions.slice(0, count);
}

export async function startTest(config) {
  await delay(600);
  return {
    testId: `test-${Date.now()}`,
    subject: config.subject,
    questions: mockQuestions.filter(q => q.subject === config.subjectId).slice(0, config.questionCount || 10),
    duration: config.duration || 30,
    startedAt: new Date().toISOString(),
  };
}

export async function submitAnswer(testId, questionId, answer) {
  await delay(200);
  return { saved: true };
}

export async function submitTest(testId) {
  await delay(800);
  return mockTestResults[0];
}

// ---- Results ----
export async function getResults(testId) {
  await delay(400);
  return mockTestResults.find(t => t.id === testId) || mockTestResults[0];
}

export async function getAllResults() {
  await delay(400);
  return mockTestResults;
}

// ---- Performance ----
export async function getPerformance() {
  await delay(500);
  return mockPerformance;
}

// ---- Readiness ----
export async function getReadiness() {
  await delay(400);
  return mockReadiness;
}

// ---- Study Plan ----
export async function getStudyPlan() {
  await delay(400);
  return mockStudyPlan;
}

export async function completeTask(taskId) {
  await delay(300);
  return { success: true, taskId };
}

// ---- Viva ----
export async function startViva(subjectId, topic) {
  await delay(600);
  return mockVivaSession;
}

export async function submitVivaAnswer(sessionId, answer) {
  await delay(1000);
  return {
    evaluation: { score: Math.floor(Math.random() * 3) + 7, maxScore: 10, feedback: 'Good understanding demonstrated.' },
    followUp: 'Can you elaborate on the time complexity aspect?',
  };
}

export async function getVivaEvaluation(sessionId) {
  await delay(500);
  return mockVivaEvaluation;
}

// ---- Practicals ----
export async function getPracticals(subjectId = null) {
  await delay(400);
  if (subjectId) return mockPracticals.filter(p => p.subjectId === subjectId);
  return mockPracticals;
}

export async function submitPractical(practicalId, submission) {
  await delay(1200);
  return {
    score: Math.floor(Math.random() * 20) + 70,
    feedback: 'Code structure is good. Consider adding error handling for edge cases.',
    passed: true,
  };
}

// ---- Student / Profile ----
export async function getProfile() {
  await delay(300);
  return student;
}

export async function updateProfile(updates) {
  await delay(500);
  return { ...student, ...updates };
}
