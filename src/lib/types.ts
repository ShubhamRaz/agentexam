/* ============================================================
   AgentExam shared API types — mirrors the shapes the original
   React frontend consumed (post-mapping), so views port cleanly.
   ============================================================ */

export type ViewId =
  | 'dashboard' | 'materials' | 'syllabus' | 'pyq-analysis'
  | 'exam' | 'practical' | 'viva' | 'performance'
  | 'readiness' | 'study-plan' | 'profile'
  | 'faculty-dashboard' | 'classroom'

export type UserRole = 'STUDENT' | 'FACULTY'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  enrollmentNo?: string | null
  semester?: string | null
  department?: string | null
  examDate?: string | null
}

export interface Subject {
  id: string
  name: string
  code: string
  description: string | null
  /** 'own' — created from your uploads; 'classroom' — shared by a faculty */
  source?: 'own' | 'classroom'
  classroomName?: string | null
  units?: number
  topics?: number
  questions?: number
}

export type Importance = 'high' | 'medium' | 'low'

export interface Topic {
  id: string
  name: string
  importance: Importance
  pyqFrequency: number
  weightage: number
}

export interface Unit {
  id: string
  name: string
  chapterNo: number
  topics: Topic[]
}

export type MaterialType = 'syllabus' | 'pyq' | 'notes' | 'lab_manual'

export interface Material {
  id: string
  name: string
  type: MaterialType
  status: 'processed' | 'processing' | 'uploading' | 'failed'
  subject: string
  subjectId: string
  size: string
  uploadDate: string
  /** present when uploaded by faculty (classroom materials) */
  uploadedByName?: string
  analysisSummary?: {
    units: number
    topics: number
    questions: number
    experiments: number
    subjectName: string
    isNewSubject: boolean
  } | null
}

/* ---------- Material upload (AI pipeline) ---------- */

export interface MaterialUploadResult {
  material: Material
  subject: { id: string; name: string; code: string }
  created: {
    units: number
    topics: number
    questions: number
    experiments: number
    isNewSubject: boolean
  }
  studyPlanGenerated: boolean
  processingMethod: 'AI' | 'FALLBACK'
}

export type PYQType = 'Long Answer' | 'Short Answer' | 'Objective'

export interface PYQ {
  id: string
  year: number
  question: string
  topic: string
  topicId: string | null
  type: PYQType
  marks: number
  frequency: number
  subject: string
  subjectId: string
}

/* ---------- Exam engine ---------- */

export type QuestionType = 'MCQ' | 'SHORT_ANSWER' | 'LONG_ANSWER'

export interface ExamQuestion {
  id: string
  question_type: QuestionType
  question_text: string
  marks: number
  options: { id: string; text: string }[]
}

export interface SavedAnswer {
  question_id: string
  answer_text?: string | null
  selected_option_id?: string | null
}

export interface ExamStartResponse {
  id: string
  questions: ExamQuestion[]
  saved_answers: SavedAnswer[]
}

export interface QuestionResult {
  question_id: string
  question_text: string
  question_type: QuestionType
  marks: number
  student_answer: string | null
  selected_option_id: string | null
  correct_option_id: string | null
  marks_obtained: number
  feedback: string | null
  explanation: string | null
}

export interface ExamResult {
  test_id: string
  subject: string
  test_type: string
  percentage: number
  obtained_marks: number
  total_marks: number
  grade: string
  analytics: {
    improvement_suggestions: string
    weak_areas: string[]
    strong_areas: string[]
  }
  question_results: QuestionResult[]
}

/* ---------- Practical ---------- */

export interface PracticalExperiment {
  id: string
  title: string
  description: string
  objective: string | null
  instructions: string | null
  expectedOutput: string | null
  marks: number
  subject: string
  subjectId: string
  status: 'not_started' | 'in_progress' | 'completed'
  score: number | null
}

export interface PracticalSubmitResult {
  score: number
  percentage: number
  feedback: string
  suggestions: string
}

/* ---------- Viva ---------- */

export interface VivaQuestion {
  id: string
  question_text: string
  marks: number
}

export interface VivaStartResponse {
  id: string
  questions: VivaQuestion[]
}

export interface VivaEvaluation {
  marks_obtained: number
  max_marks: number
  feedback: string
}

/* ---------- Dashboard / Performance / Readiness ---------- */

export interface DashboardData {
  student: {
    name: string
    streak: number
    averageScore: number
    testsCompleted: number
    totalStudyHours: number
  }
  readinessScore: number
  daysLeft: number
  examDate: string | null
  recentTests: { type: string; name: string; score: number; date: string }[]
  recentActivity: { id: string; icon: string; title: string; time: string; score?: number }[]
  todayTasks: { id: string; title: string; subject: string; priority: string; duration: string; completed: boolean }[]
  weakTopics: { topic: string; subject: string; score: number; recommendation: string }[]
  subjectPerformance: { subject: string; score: number; tests: number; accuracy: number }[]
}

export interface PerformanceData {
  overall: {
    totalTests: number
    averageScore: number
    improvement: number
    accuracy: number
    studyHours: number
  }
  scoreTrend: { date: string; score: number }[]
  accuracyTrend: { date: string; accuracy: number }[]
  subjectPerformance: { subject: string; score: number; accuracy: number }[]
  topicPerformance: { topic: string; subject: string; score: number; status: 'strong' | 'weak' | 'insufficient' }[]
  weakTopics: { topic: string; subject: string; score: number; recommendation: string }[]
}

export interface ReadinessData {
  overallScore: number
  status: 'HIGH' | 'MODERATE' | 'LOW' | 'INSUFFICIENT_DATA'
  estimatedStudyHoursNeeded: number
  breakdown: { accuracy: number; topicsAttempted: number }
  subjectReadiness: { subject: string; score: number; status: 'on_track' | 'needs_attention' | 'at_risk'; topicsReady: number; totalTopics: number }[]
  riskAreas: { topic: string; subject: string; risk: 'high' | 'medium'; reason: string }[]
  recommendations: { action: string; estimatedTime: string; priority: 'high' | 'medium' | 'low' }[]
}

/* ---------- Study plan ---------- */

export interface StudyPlanTask {
  id: string
  title: string
  subject: string
  type: 'study' | 'practice' | 'test' | 'revision'
  priority: 'high' | 'medium' | 'low'
  duration: string
  completed: boolean
}

export interface StudyPlanDay {
  date: string
  label: string
  isToday: boolean
  tasks: StudyPlanTask[]
}

export interface StudyPlanData {
  totalDays: number
  endDate: string
  days: StudyPlanDay[]
}

/* ---------- API client ---------- */

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/* ---------- Classrooms (faculty) ---------- */

export interface ClassroomSummary {
  id: string
  name: string
  code: string
  createdAt: string
  studentCount: number
  subjectCount: number
  materialCount: number
}

export interface ClassroomStudentRow {
  id: string
  name: string
  email: string
  addedAt: string
  testsCompleted: number
  averageScore: number | null
  lastActive: string | null
}

export interface ClassroomSubjectRow {
  id: string
  name: string
  code: string
  units: number
  topics: number
  questions: number
  materialCount: number
}

export interface ConductedTestStudentRow {
  studentId: string
  name: string
  status: 'not_started' | 'in_progress' | 'submitted' | 'evaluated'
  score: number | null
  submittedAt: string | null
}

export interface ConductedTestRow {
  id: string
  title: string
  subject: string
  questionCount: number
  totalMarks: number
  durationMinutes: number
  createdAt: string
  dueDate: string | null
  completed: number
  total: number
  averageScore: number | null
  students: ConductedTestStudentRow[]
}

export interface ClassroomDetail {
  id: string
  name: string
  code: string
  createdAt: string
  facultyName: string
  students: ClassroomStudentRow[]
  subjects: ClassroomSubjectRow[]
  tests: ConductedTestRow[]
}

export interface FacultyDashboardData {
  facultyName: string
  stats: {
    classrooms: number
    students: number
    subjects: number
    materials: number
    testsConducted: number
    averageScore: number | null
  }
  classrooms: ClassroomSummary[]
  recentActivity: { id: string; title: string; detail: string; time: string }[]
}

/* ---------- Assigned tests (student side) ---------- */

export interface AssignedTest {
  id: string
  title: string
  subject: string
  assignedByName: string
  questionCount: number
  totalMarks: number
  durationMinutes: number
  createdAt: string
  dueDate: string | null
  status: 'DRAFT' | 'IN_PROGRESS' | 'EVALUATED'
}
