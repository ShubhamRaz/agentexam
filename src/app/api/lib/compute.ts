/* ============================================================
   Shared server-side computations for AgentExam API routes.
   Private folder (underscore) — excluded from Next.js routing.
   ============================================================ */
import { db } from '@/lib/db'
import { generateStudyPlanTasks } from '@/lib/ai'
import type {
  Material,
  StudyPlanData,
  StudyPlanTask,
  ClassroomSummary,
  ConductedTestRow,
  ConductedTestStudentRow,
} from '@/lib/types'

/* ---------- role-aware subject visibility ---------- */

/**
 * Subjects a user may see: FACULTY → subjects they created (their uploads);
 * STUDENT → subjects created from THEIR uploads + subjects shared via any
 * classroom they are enrolled in. Legacy subjects (ownerId null, no
 * classroom) are invisible — a fresh student starts with NOTHING.
 */
export async function getVisibleSubjects(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } })
  if (!user) return []
  if (user.role === 'FACULTY') {
    return db.subject.findMany({ where: { ownerId: userId }, orderBy: { name: 'asc' } })
  }
  const enrollments = await db.classroomStudent.findMany({
    where: { studentId: userId },
    select: { classroomId: true },
  })
  const classroomIds = enrollments.map(e => e.classroomId)
  return db.subject.findMany({
    where: {
      OR: [
        { ownerId: userId },
        ...(classroomIds.length ? [{ classroomId: { in: classroomIds } }] : []),
      ],
    },
    orderBy: { name: 'asc' },
  })
}

export async function getVisibleSubjectIds(userId: string): Promise<string[]> {
  const subjects = await getVisibleSubjects(userId)
  return subjects.map(s => s.id)
}

export async function isSubjectVisible(userId: string, subjectId: string): Promise<boolean> {
  const ids = await getVisibleSubjectIds(userId)
  return ids.includes(subjectId)
}

/* ---------- material mapping ---------- */

interface MaterialWithSubject {
  id: string
  title: string
  materialType: string
  processingStatus: string
  fileSize: number
  createdAt: Date
  subjectId: string | null
  subject: { name: string } | null
  uploadedBy?: string
  analysisSummary?: string | null
}

export function mapMaterial(m: MaterialWithSubject, uploaderName?: string | null): Material {
  const status: Material['status'] =
    m.processingStatus === 'PROCESSED'
      ? 'processed'
      : m.processingStatus === 'FAILED'
        ? 'failed'
        : 'processing' // PROCESSING | UPLOADED | anything else
  let analysisSummary: Material['analysisSummary'] = null
  if (m.analysisSummary) {
    try {
      const parsed = JSON.parse(m.analysisSummary) as NonNullable<Material['analysisSummary']>
      analysisSummary = {
        units: Number(parsed.units) || 0,
        topics: Number(parsed.topics) || 0,
        questions: Number(parsed.questions) || 0,
        experiments: Number(parsed.experiments) || 0,
        subjectName: String(parsed.subjectName || m.subject?.name || 'Pending analysis'),
        isNewSubject: !!parsed.isNewSubject,
      }
    } catch {
      analysisSummary = null
    }
  }
  return {
    id: m.id,
    name: m.title,
    type: (m.materialType || 'notes').toLowerCase() as Material['type'],
    status,
    subject: m.subject?.name ?? 'Detecting subject…',
    subjectId: m.subjectId ?? '',
    size: formatSize(m.fileSize),
    uploadDate: m.createdAt.toISOString(),
    ...(uploaderName ? { uploadedByName: uploaderName } : {}),
    ...(analysisSummary ? { analysisSummary } : {}),
  }
}

/* ---------- small utils ---------- */

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** "123.4 KB" style formatting */
export function formatSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${round1(bytes / 1024)} KB`
  return `${round1(bytes / (1024 * 1024))} MB`
}

/** Local-timezone YYYY-MM-DD */
export function localISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return localISO(new Date())
}

/* ---------- evaluated test data ---------- */

export interface EvaluatedTestRow {
  testId: string
  testType: string
  subjectId: string
  subject: string
  totalMarks: number
  submittedAt: Date | null
  createdAt: Date
  result: {
    totalMarks: number
    obtainedMarks: number
    percentage: number
    grade: string | null
    createdAt: Date
  }
}

/** All EVALUATED tests (with results) for a user, ordered oldest → newest (by result creation). */
export async function getEvaluatedTests(userId: string): Promise<EvaluatedTestRow[]> {
  // MockTest.subject is a plain string FK — join manually
  const subjects = await db.subject.findMany()
  const subjectById = new Map(subjects.map(s => [s.id, s]))
  const tests = await db.mockTest.findMany({
    where: { studentId: userId, status: 'EVALUATED', result: { isNot: null } },
    include: { result: true },
    orderBy: { createdAt: 'asc' },
  })
  return tests
    .filter(t => t.result)
    .map(t => ({
      testId: t.id,
      testType: t.testType,
      subjectId: t.subjectId,
      subject: subjectById.get(t.subjectId)?.name ?? 'Unknown',
      totalMarks: t.totalMarks,
      submittedAt: t.submittedAt,
      createdAt: t.createdAt,
      result: {
        totalMarks: t.result!.totalMarks,
        obtainedMarks: t.result!.obtainedMarks,
        percentage: t.result!.percentage,
        grade: t.result!.grade,
        createdAt: t.result!.createdAt,
      },
    }))
    .sort(
      (a, b) =>
        a.result.createdAt.getTime() - b.result.createdAt.getTime() ||
        a.createdAt.getTime() - b.createdAt.getTime()
    )
}

/* ---------- answer rows (topic analytics input) ---------- */

export interface AnswerRow {
  questionId: string
  testType: string
  marks: number
  marksObtained: number | null
  topicId: string | null
  topicName: string | null
  subjectId: string
  subjectName: string
}

/** Answers belonging to the user's EVALUATED tests, joined with question/topic/subject. */
export async function getAnswerRows(userId: string): Promise<AnswerRow[]> {
  const answers = await db.answer.findMany({
    where: { studentId: userId, test: { status: 'EVALUATED' } },
    include: { question: { include: { subject: true } }, test: true },
  })
  // Question.topic is a plain string FK — join manually
  const topicIds = Array.from(
    new Set(answers.map(a => a.question.topicId).filter(tid => !!tid))
  ) as string[]
  const topics = topicIds.length
    ? await db.topic.findMany({ where: { id: { in: topicIds } } })
    : []
  const topicById = new Map(topics.map(t => [t.id, t]))
  return answers.map(a => ({
    questionId: a.questionId,
    testType: a.test.testType,
    marks: a.question.marks,
    marksObtained: a.marksObtained,
    topicId: a.question.topicId,
    topicName: topicById.get(a.question.topicId ?? '')?.name ?? null,
    subjectId: a.question.subjectId,
    subjectName: a.question.subject.name,
  }))
}

/** Overall accuracy across all evaluated answers: obtained / total × 100. */
export function overallAccuracy(rows: AnswerRow[]): number {
  let obtained = 0
  let total = 0
  for (const r of rows) {
    if (r.marks <= 0) continue
    obtained += r.marksObtained ?? 0
    total += r.marks
  }
  return total > 0 ? round1((obtained / total) * 100) : 0
}

/* ---------- topic performance ---------- */

export interface TopicRow {
  topic: string
  subject: string
  subjectId: string
  score: number
  attempts: number
  status: 'strong' | 'weak' | 'insufficient'
}

export function computeTopicPerformance(rows: AnswerRow[]): TopicRow[] {
  const map = new Map<
    string,
    { topic: string; subject: string; subjectId: string; ratioTotal: number; count: number }
  >()
  for (const r of rows) {
    if (!r.topicId || !r.topicName) continue // skip null topics
    const cur =
      map.get(r.topicId) ??
      { topic: r.topicName, subject: r.subjectName, subjectId: r.subjectId, ratioTotal: 0, count: 0 }
    const ratio =
      r.marks > 0 ? Math.min(100, ((r.marksObtained ?? 0) / r.marks) * 100) : 0
    cur.ratioTotal += ratio
    cur.count += 1
    map.set(r.topicId, cur)
  }
  return Array.from(map.values()).map(v => {
    const score = Math.round(v.ratioTotal / v.count)
    // Weak detection must fire on EVIDENCE, not attempt count:
    //  • score < 60 is weak even on a single attempt (0% after one miss IS weak)
    //  • 60–74% needs 3+ attempts to be called weak (could be a one-off slip)
    //  • ≥ 75% is strong
    const status: TopicRow['status'] =
      score >= 75
        ? 'strong'
        : score < 60
          ? 'weak'
          : v.count >= 3
            ? 'weak'
            : 'insufficient'
    return { topic: v.topic, subject: v.subject, subjectId: v.subjectId, score, attempts: v.count, status }
  })
}

export interface WeakTopic {
  topic: string
  subject: string
  score: number
  recommendation: string
}

export const WEAK_TOPIC_RECOMMENDATION =
  'Revise unit notes and practise easy questions on this topic first.'

export async function computeWeakTopics(userId: string): Promise<WeakTopic[]> {
  const rows = await getAnswerRows(userId)
  return computeTopicPerformance(rows)
    .filter(t => t.status === 'weak')
    .sort((a, b) => a.score - b.score)
    .map(t => ({
      topic: t.topic,
      subject: t.subject,
      score: t.score,
      recommendation: WEAK_TOPIC_RECOMMENDATION,
    }))
}

/* ---------- study plan ---------- */

interface PlanTaskJson {
  id: string
  title: string
  subject: string
  type: 'study' | 'practice' | 'test' | 'revision'
  priority: 'high' | 'medium' | 'low'
  duration?: number
  completed?: boolean
  date?: string
}

interface PlanJson {
  days: { date: string; tasks: PlanTaskJson[] }[]
}

function mapPlanTask(t: PlanTaskJson): StudyPlanTask {
  return {
    id: String(t.id),
    title: t.title,
    subject: t.subject,
    type: t.type,
    priority: t.priority,
    duration: t.duration ? `${t.duration}m` : '60m',
    completed: !!t.completed,
  }
}

export function mapPlanToData(plan: {
  startDate: Date
  endDate: Date
  planJson: string
}): StudyPlanData {
  let parsed: PlanJson = { days: [] }
  try {
    parsed = JSON.parse(plan.planJson || '{}') as PlanJson
  } catch {
    parsed = { days: [] }
  }
  const days = Array.isArray(parsed.days) ? parsed.days : []
  const today = todayISO()
  return {
    totalDays: days.length,
    endDate: localISO(plan.endDate),
    days: days.map(d => ({
      date: d.date,
      label: new Date(`${d.date}T00:00:00`).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }),
      isToday: d.date === today,
      tasks: (Array.isArray(d.tasks) ? d.tasks : []).map(mapPlanTask),
    })),
  }
}

/** Today's mapped tasks from the user's ACTIVE plan (empty array if none). */
export async function getTodayTasks(userId: string): Promise<StudyPlanTask[]> {
  const plan = await db.studyPlan.findFirst({
    where: { studentId: userId, status: 'ACTIVE' },
  })
  if (!plan) return []
  let parsed: PlanJson = { days: [] }
  try {
    parsed = JSON.parse(plan.planJson || '{}') as PlanJson
  } catch {
    return []
  }
  const today = todayISO()
  const day = (parsed.days || []).find(d => d.date === today)
  return day ? (day.tasks || []).map(mapPlanTask) : []
}

/**
 * Generate + persist a fresh 7-day ACTIVE study plan for the user.
 * AI-first: the LLM plans around real topics, weak topics and material
 * evidence; the deterministic template is only a fallback.
 * Archives any previous ACTIVE plan first.
 */
export async function generateStudyPlan(userId: string): Promise<{
  id: string
  startDate: Date
  endDate: Date
  planJson: string
}> {
  const weakTopics = await computeWeakTopics(userId)
  const subjects = await getVisibleSubjects(userId)
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { examDate: true },
  })

  // ---------- AI attempt (grounded in topics + weak areas + materials) ----------
  if (subjects.length > 0) {
    const subjectIds = subjects.map(s => s.id)
    const [topicRows, materialGroups] = await Promise.all([
      db.topic.findMany({
        where: { unit: { subjectId: { in: subjectIds } } },
        select: { name: true, weightage: true, pyqFrequency: true, unit: { select: { subjectId: true } } },
      }),
      db.material.groupBy({
        by: ['subjectId'],
        where: { subjectId: { in: subjectIds } },
        _count: { _all: true },
      }),
    ])
    const materialCountBySubject = new Map(
      materialGroups.map(g => [g.subjectId, g._count._all])
    )
    const hotBySubject = new Map<string, string[]>()
    for (const s of subjects) {
      hotBySubject.set(
        s.id,
        topicRows
          .filter(t => t.unit.subjectId === s.id)
          .sort((a, b) => b.weightage + b.pyqFrequency * 2 - (a.weightage + a.pyqFrequency * 2))
          .slice(0, 10)
          .map(t => t.name)
      )
    }
    const ai = await generateStudyPlanTasks({
      subjects: subjects.map(s => ({
        name: s.name,
        hotTopics: hotBySubject.get(s.id) ?? [],
        materialCount: materialCountBySubject.get(s.id) ?? 0,
      })),
      weakTopics: weakTopics.map(w => ({ topic: w.topic, subject: w.subject, score: w.score })),
      examDate: user?.examDate ? user.examDate.toISOString().slice(0, 10) : null,
    })
    if (ai) {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const days: PlanJson['days'] = ai.days.map((d, di) => {
        const date = new Date(start)
        date.setDate(date.getDate() + di)
        const iso = localISO(date)
        return {
          date: iso,
          tasks: d.tasks.map((t, ti) => ({
            id: `task-${di * 3 + ti + 1}`,
            title: t.title,
            subject: t.subject,
            type: t.type,
            priority: t.priority,
            duration: t.duration,
            completed: false,
            date: iso,
          })),
        }
      })
      const endDate = new Date(start)
      endDate.setDate(endDate.getDate() + 6)
      await db.studyPlan.updateMany({
        where: { studentId: userId, status: 'ACTIVE' },
        data: { status: 'ARCHIVED' },
      })
      const plan = await db.studyPlan.create({
        data: {
          studentId: userId,
          startDate: start,
          endDate,
          planJson: JSON.stringify({ days }),
          status: 'ACTIVE',
        },
      })
      return plan
    }
  }

  // ---------- deterministic fallback ----------
  const pool: Omit<PlanTaskJson, 'id' | 'completed' | 'date'>[] = []

  // weak-topic practice tasks first (highest priority in the plan)
  for (const w of weakTopics.slice(0, 8)) {
    pool.push({
      title: `Practice: ${w.topic} problems`,
      subject: w.subject,
      type: 'practice',
      priority: 'high',
      duration: 45,
    })
  }
  // subject-level study / revision / mock tasks
  for (const s of subjects) {
    pool.push({
      title: `Study: ${s.name} — high-weightage units`,
      subject: s.name,
      type: 'study',
      priority: 'medium',
      duration: 60,
    })
    pool.push({
      title: `Revise: ${s.name} unit notes`,
      subject: s.name,
      type: 'revision',
      priority: 'low',
      duration: 30,
    })
    pool.push({
      title: `Mock Test: ${s.name} (mixed difficulty)`,
      subject: s.name,
      type: 'test',
      priority: 'medium',
      duration: 30,
    })
  }
  // pad the pool so 7 days × 3 tasks always exist
  const extras: Omit<PlanTaskJson, 'id' | 'completed' | 'date'>[] = [
    { title: 'Revise: formula & complexity cheat sheet', subject: subjects[0]?.name ?? 'General', type: 'revision', priority: 'low', duration: 20 },
    { title: 'Attempt AI viva rapid-fire on weak topics', subject: subjects[0]?.name ?? 'General', type: 'practice', priority: 'medium', duration: 15 },
    { title: 'Final revision: high-weightage topics', subject: subjects[1]?.name ?? subjects[0]?.name ?? 'General', type: 'revision', priority: 'medium', duration: 60 },
  ]
  let i = 0
  while (pool.length < 21) {
    pool.push(extras[i % extras.length])
    i++
  }

  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const days: PlanJson['days'] = []
  let idx = 0
  for (let d = 0; d < 7; d++) {
    const date = new Date(start)
    date.setDate(date.getDate() + d)
    const iso = localISO(date)
    const tasks: PlanTaskJson[] = []
    for (let t = 0; t < 3; t++) {
      const p = pool[idx % pool.length]
      idx++
      tasks.push({
        id: `task-${d * 3 + t + 1}`,
        title: p.title,
        subject: p.subject,
        type: p.type,
        priority: p.priority,
        duration: p.duration ?? 60,
        completed: false,
        date: iso,
      })
    }
    days.push({ date: iso, tasks })
  }

  const endDate = new Date(start)
  endDate.setDate(endDate.getDate() + 6)

  await db.studyPlan.updateMany({
    where: { studentId: userId, status: 'ACTIVE' },
    data: { status: 'ARCHIVED' },
  })
  const plan = await db.studyPlan.create({
    data: {
      studentId: userId,
      startDate: start,
      endDate,
      planJson: JSON.stringify({ days }),
      status: 'ACTIVE',
    },
  })
  return plan
}

/** Returns the ACTIVE plan, generating one on the fly if none exists. */
export async function getOrCreateStudyPlan(userId: string) {
  const existing = await db.studyPlan.findFirst({
    where: { studentId: userId, status: 'ACTIVE' },
  })
  if (existing) return existing
  return generateStudyPlan(userId)
}

/* ---------- classrooms ---------- */

/** Classroom rows → ClassroomSummary[] with batched student/subject/material counts. */
export async function buildClassroomSummaries(
  classrooms: { id: string; name: string; code: string; createdAt: Date }[]
): Promise<ClassroomSummary[]> {
  if (classrooms.length === 0) return []
  const ids = classrooms.map(c => c.id)
  const [studentGroups, subjectGroups, subjects] = await Promise.all([
    db.classroomStudent.groupBy({
      by: ['classroomId'],
      where: { classroomId: { in: ids } },
      _count: { _all: true },
    }),
    db.subject.groupBy({
      by: ['classroomId'],
      where: { classroomId: { in: ids } },
      _count: { _all: true },
    }),
    db.subject.findMany({
      where: { classroomId: { in: ids } },
      select: { id: true, classroomId: true },
    }),
  ])
  const studentCount = new Map(studentGroups.map(g => [g.classroomId, g._count._all]))
  const subjectCount = new Map(subjectGroups.map(g => [g.classroomId, g._count._all]))

  const subjectIds = subjects.map(s => s.id)
  const materialGroups = subjectIds.length
    ? await db.material.groupBy({
        by: ['subjectId'],
        where: { subjectId: { in: subjectIds } },
        _count: { _all: true },
      })
    : []
  const materialBySubject = new Map(materialGroups.map(g => [g.subjectId, g._count._all]))
  const materialCount = new Map<string, number>()
  for (const s of subjects) {
    const cid = s.classroomId ?? ''
    materialCount.set(cid, (materialCount.get(cid) ?? 0) + (materialBySubject.get(s.id) ?? 0))
  }

  return classrooms.map(c => ({
    id: c.id,
    name: c.name,
    code: c.code,
    createdAt: c.createdAt.toISOString(),
    studentCount: studentCount.get(c.id) ?? 0,
    subjectCount: subjectCount.get(c.id) ?? 0,
    materialCount: materialCount.get(c.id) ?? 0,
  }))
}

/* ---------- conducted tests (faculty-assigned MockTest groups) ---------- */

export interface ConductedTestRaw {
  id: string
  studentId: string
  subjectId: string
  totalMarks: number
  durationMinutes: number
  status: string
  questionIds: string
  assignedTitle: string | null
  dueDate: Date | null
  submittedAt: Date | null
  createdAt: Date
  result: { percentage: number } | null
}

/** Key that identifies ONE conducted test instance across its per-student rows. */
export function conductedTestKey(t: {
  assignedTitle: string | null
  subjectId: string
  createdAt: Date
}): string {
  return `${t.assignedTitle ?? ''}|${t.subjectId}|${Math.floor(t.createdAt.getTime() / 60000)}`
}

/**
 * Group per-student MockTest rows of conducted tests into ConductedTestRow[].
 * Tests are grouped by assignedTitle + subject + createdAt minute.
 */
export function groupConductedTests(
  tests: ConductedTestRaw[],
  studentNameById: Map<string, string>,
  subjectNameById: Map<string, string>
): ConductedTestRow[] {
  const groups = new Map<string, ConductedTestRaw[]>()
  for (const t of tests) {
    const key = conductedTestKey(t)
    const list = groups.get(key) ?? []
    list.push(t)
    groups.set(key, list)
  }

  const rows: ConductedTestRow[] = []
  for (const list of groups.values()) {
    const first = list[0]
    let questionCount = 0
    try {
      questionCount = (JSON.parse(first.questionIds) as string[]).length
    } catch {
      questionCount = 0
    }
    const students: ConductedTestStudentRow[] = list.map(t => ({
      studentId: t.studentId,
      name: studentNameById.get(t.studentId) ?? 'Student',
      status:
        t.status === 'DRAFT'
          ? 'not_started'
          : t.status === 'IN_PROGRESS'
            ? 'in_progress'
            : t.status === 'SUBMITTED'
              ? 'submitted'
              : 'evaluated',
      score: t.result ? round1(t.result.percentage) : null,
      submittedAt: t.submittedAt ? t.submittedAt.toISOString() : null,
    }))
    const scored = list.filter(t => t.result)
    rows.push({
      id: first.id,
      title: first.assignedTitle || 'Assigned Test',
      subject: subjectNameById.get(first.subjectId) ?? 'Unknown',
      questionCount,
      totalMarks: first.totalMarks,
      durationMinutes: first.durationMinutes,
      createdAt: first.createdAt.toISOString(),
      dueDate: first.dueDate ? first.dueDate.toISOString() : null,
      completed: list.filter(t => t.status === 'EVALUATED' || t.status === 'SUBMITTED').length,
      total: list.length,
      averageScore: scored.length
        ? round1(scored.reduce((a, t) => a + (t.result?.percentage ?? 0), 0) / scored.length)
        : null,
      students,
    })
  }
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return rows
}
