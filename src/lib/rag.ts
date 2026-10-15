/* ============================================================
   AgentExam RAG layer — SERVER ONLY.

   Retrieval-augmented generation over EVERY material the user
   uploaded for a subject. Material texts (extracted at upload)
   are chunked and scored against a query with a lightweight
   BM25-style keyword score; the winning chunks are stitched
   into one context document that feeds question-bank, study
   plan, viva and structure generation.
   ============================================================ */
import { db } from '@/lib/db'

export interface RagChunk {
  materialId: string
  title: string
  materialType: string // SYLLABUS | PYQ | NOTES | LAB_MANUAL
  text: string
}

/** Split a long text into overlapping chunks (~250 words each). */
export function chunkText(text: string, size = 900, overlap = 120): string[] {
  const clean = (text || '').replace(/\s+/g, ' ').trim()
  if (!clean) return []
  const chunks: string[] = []
  const step = Math.max(1, size - overlap)
  for (let i = 0; i < clean.length; i += step) {
    chunks.push(clean.slice(i, i + size))
    if (i + size >= clean.length) break
  }
  return chunks.slice(0, 120) // safety cap — very large uploads
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'in', 'to', 'is', 'are', 'for', 'with', 'on',
  'that', 'this', 'as', 'by', 'it', 'be', 'from', 'at', 'was', 'were', 'will', 'can',
  'their', 'its', 'into', 'using', 'used', 'use', 'how', 'what', 'why', 'which',
  'between', 'different', 'various', 'such', 'also', 'more', 'than', 'then', 'each',
  'other', 'may', 'must', 'should', 'would', 'could', 'new', 'one', 'two', 'three',
  'unit', 'part', 'section', 'marks', 'mark', 'question', 'questions', 'paper',
  'end', 'semester', 'examination', 'instructions', 'instruction', 'following',
  'given', 'student', 'students', 'write', 'note', 'notes', 'page', 'pages', 'contd',
  'roll', 'no', 'id', 'paper', 'print', 'printed', 'attempt', 'any', 'all', 'your',
  'answer', 'answers', 'q', 'per', 'via', 'eg', 'ie', 'etc', 'en', 'de', 'la',
])

function tokenize(s: string): string[] {
  return (s || '')
    .toLowerCase()
    .split(/[^a-z0-9+#.-]+/)
    .filter(t => t.length > 2 && t.length < 30 && !STOP_WORDS.has(t))
}

/** All material texts of a subject, chunked and tagged with their source. */
export async function getSubjectRagChunks(subjectId: string): Promise<RagChunk[]> {
  const materials = await db.material.findMany({
    where: { subjectId, extractedText: { not: null } },
    select: { id: true, title: true, materialType: true, extractedText: true },
    orderBy: { createdAt: 'asc' },
  })
  const chunks: RagChunk[] = []
  for (const m of materials) {
    for (const text of chunkText(m.extractedText ?? '')) {
      chunks.push({ materialId: m.id, title: m.title, materialType: m.materialType, text })
    }
  }
  return chunks
}

export interface RetrieveOptions {
  /** chunks from this material always come first (the fresh upload) */
  prioritizeMaterialId?: string
  /** max characters of context to return */
  budget?: number
}

/**
 * Keyword-scored retrieval. The query is enriched with the subject's
 * topic names so chunks about high-weightage exam topics surface
 * even when the literal query is short.
 */
export function retrieveContext(
  chunks: RagChunk[],
  query: string,
  opts: RetrieveOptions = {}
): string {
  const budget = opts.budget ?? 9000
  if (chunks.length === 0) return ''

  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) {
    // nothing to score on — take the head of each material
    return renderChunks(chunks.slice(0, Math.max(4, Math.floor(budget / 900))), budget)
  }

  // document frequency per token
  const chunkTokenSets = chunks.map(c => new Set(tokenize(c.text)))
  const df = new Map<string, number>()
  for (const tokens of chunkTokenSets) {
    for (const t of tokens) df.set(t, (df.get(t) ?? 0) + 1)
  }

  const scored = chunks.map((c, i) => {
    let score = 0
    for (const t of queryTokens) {
      if (chunkTokenSets[i].has(t)) {
        const idf = 1 + Math.log(chunks.length / (1 + (df.get(t) ?? 0)))
        score += idf
      }
    }
    // syllabus evidence is the backbone of exam structure — mild boost
    if (c.materialType === 'SYLLABUS') score *= 1.15
    // the freshly uploaded material is what the user cares about right now
    if (opts.prioritizeMaterialId && c.materialId === opts.prioritizeMaterialId) score *= 2.5
    return { chunk: c, score }
  })

  scored.sort((a, b) => b.score - a.score)

  // always keep every chunk of the prioritised material (capped), then fill
  const picked: RagChunk[] = []
  const seen = new Set<string>()
  if (opts.prioritizeMaterialId) {
    for (const s of scored.filter(x => x.chunk.materialId === opts.prioritizeMaterialId)) {
      if (picked.length >= 10) break
      picked.push(s.chunk)
      seen.add(s.chunk.materialId + '|' + s.chunk.text.slice(0, 64))
    }
  }
  for (const s of scored) {
    if (picked.length >= 40) break
    const key = s.chunk.materialId + '|' + s.chunk.text.slice(0, 64)
    if (seen.has(key)) continue
    seen.add(key)
    picked.push(s.chunk)
  }
  return renderChunks(picked, budget)
}

function renderChunks(chunks: RagChunk[], budget: number): string {
  const parts: string[] = []
  let used = 0
  for (const c of chunks) {
    if (used >= budget) break
    const header = `### [${c.materialType}] ${c.title}`
    const body = c.text.slice(0, Math.max(200, budget - used - header.length))
    parts.push(`${header}\n${body}`)
    used += header.length + body.length + 2
  }
  return parts.join('\n\n').slice(0, budget)
}

/**
 * Build the full RAG context for a subject in one call:
 * every material chunk, retrieval-ranked against the subject's
 * own topics (weightage/importance-aware) + the fresh upload.
 */
export async function buildSubjectContext(
  subjectId: string,
  opts: RetrieveOptions & { subjectName?: string; extraQuery?: string } = {}
): Promise<string> {
  const [chunks, topics, units] = await Promise.all([
    getSubjectRagChunks(subjectId),
    db.topic.findMany({
      where: { unit: { subjectId } },
      select: { name: true, importance: true, weightage: true, pyqFrequency: true },
    }),
    db.unit.findMany({ where: { subjectId }, select: { name: true } }),
  ])
  const hotTopics = topics
    .sort(
      (a, b) =>
        b.weightage + b.pyqFrequency * 2 - (a.weightage + a.pyqFrequency * 2)
    )
    .slice(0, 15)
    .map(t => t.name)
  const query = [
    opts.subjectName ?? '',
    'important exam topics concepts definitions',
    units.map(u => u.name).join(' '),
    hotTopics.join(' '),
    opts.extraQuery ?? '',
  ].join(' ')

  const context = retrieveContext(chunks, query, opts)
  if (!context) return ''
  const topicHint = hotTopics.length
    ? `\n\nKey topics by exam weight: ${hotTopics.join('; ')}.`
    : ''
  return `${context}${topicHint}`.slice(0, (opts.budget ?? 9000) + 600)
}

/**
 * Refresh every topic's pyqFrequency with REAL evidence — the number of
 * PYQ-tagged bank questions mapped to that topic (never lowering an
 * existing syllabus-derived estimate).
 */
export async function updateTopicPyqFrequency(subjectId: string): Promise<void> {
  const pyqQuestions = await db.question.findMany({
    where: { subjectId, source: 'PYQ' },
    select: { topicId: true },
  })
  const counts = new Map<string, number>()
  for (const q of pyqQuestions) {
    if (!q.topicId) continue
    counts.set(q.topicId, (counts.get(q.topicId) ?? 0) + 1)
  }
  const topics = await db.topic.findMany({
    where: { unit: { subjectId } },
    select: { id: true, pyqFrequency: true },
  })
  for (const t of topics) {
    const evidence = Math.min(6, counts.get(t.id) ?? 0)
    const next = Math.max(t.pyqFrequency, evidence)
    if (next !== t.pyqFrequency) {
      await db.topic.update({ where: { id: t.id }, data: { pyqFrequency: next } })
    }
  }
}
