/* ============================================================
   Shared server-side computations for AgentExam API routes.
   Private folder (underscore) — excluded from Next.js routing.
   ============================================================ */
import { db } from '@/lib/db'
import type { Material, StudyPlanData, StudyPlanTask } from '@/lib/types'

/* ---------- material mapping ---------- */

interface MaterialWithSubject {
  id: string
  title: string
  materialType: string
  processingStatus: string
  fileSize: number
  createdAt: Date
  subjectId: string
  subject: { name: string }
}

export function mapMaterial(m: MaterialWithSubject): Material {
  const status: Material['status'] =
    m.processingStatus === 'PROCESSED'
      ? 'processed'
      : m.processingStatus === 'FAILED'
        ? 'failed'
        : 'processing' // PROCESSING | UPLOADED | anything else
  return {
    id: m.id,
    name: m.title,
    type: (m.materialType || 'notes').toLowerCase() as Material['type'],
    status,
    subject: m.subject.name,
    subjectId: m.subjectId,
    size: formatSize(m.fileSize),
    uploadDate: m.createdAt.toISOString(),
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
    const status: TopicRow['status'] =
      v.count < 3 ? 'insufficient' : score >= 80 ? 'strong' : 'weak'
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
 * Weak topics → high-priority practice (45m); other topics/subjects → study (60m).
 * Archives any previous ACTIVE plan first.
 */
export async function generateStudyPlan(userId: string): Promise<{
  id: string
  startDate: Date
  endDate: Date
  planJson: string
}> {
  const weakTopics = await computeWeakTopics(userId)
  const subjects = await db.subject.findMany({ orderBy: { name: 'asc' } })

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
