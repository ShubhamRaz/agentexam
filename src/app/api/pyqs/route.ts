import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'
import type { PYQ, PYQType } from '@/lib/types'

export const dynamic = 'force-dynamic'

const TYPE_MAP: Record<string, PYQType> = {
  MCQ: 'Objective',
  SHORT_ANSWER: 'Short Answer',
  LONG_ANSWER: 'Long Answer',
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  const subjectId = req.nextUrl.searchParams.get('subject_id')

  const questions = await db.question.findMany({
    where: {
      source: 'PYQ',
      ...(subjectId ? { subjectId } : {}),
    },
    include: { subject: true },
  })

  // Topic is a plain string FK on Question — join manually
  const topicIds = Array.from(
    new Set(questions.map(q => q.topicId).filter(tid => !!tid))
  ) as string[]
  const topics = topicIds.length
    ? await db.topic.findMany({ where: { id: { in: topicIds } } })
    : []
  const topicById = new Map(topics.map(t => [t.id, t]))

  // frequency: number of PYQs of the same subject sharing the same topicId
  const freqCounter = new Map<string, number>()
  for (const q of questions) {
    const key = `${q.subjectId}|${q.topicId ?? '__none__'}`
    freqCounter.set(key, (freqCounter.get(key) ?? 0) + 1)
  }

  const pyqs: PYQ[] = questions.map(q => ({
    id: q.id,
    year: q.year ?? 2024,
    question: q.questionText,
    topic: topicById.get(q.topicId ?? '')?.name ?? 'General',
    topicId: q.topicId,
    type: TYPE_MAP[q.questionType] ?? 'Short Answer',
    marks: q.marks,
    frequency: freqCounter.get(`${q.subjectId}|${q.topicId ?? '__none__'}`) ?? 1,
    subject: q.subject.name,
    subjectId: q.subjectId,
  }))

  // order by year desc (newest first)
  pyqs.sort((a, b) => b.year - a.year)

  return Response.json(pyqs)
}
