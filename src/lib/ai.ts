/* ============================================================
   AgentExam AI service — wraps z-ai-web-dev-sdk (SERVER ONLY).
   Provides exam question evaluation, viva grading, practical
   code review AND the material-analysis pipeline that turns
   uploaded syllabi/notes/PYQs into subjects, units, topics and
   a generated question bank. Every call has a deterministic
   fallback so the app degrades gracefully on AI failure.
   ============================================================ */
import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs/promises'

type ChatRole = 'user' | 'assistant'

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Chat with retry + backoff — the SDK rate-limits (429) when several
 *  pipeline stages run close together, so transient failures retry twice. */
async function chat(systemPrompt: string, userPrompt: string, maxTokens = 1024): Promise<string> {
  const attempts = 3
  let lastError: unknown = null
  for (let i = 0; i < attempts; i++) {
    try {
      const zai = await ZAI.create()
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant' as ChatRole, content: systemPrompt },
          { role: 'user' as ChatRole, content: userPrompt },
        ],
        thinking: { type: 'disabled' },
        max_tokens: maxTokens,
      })
      const content = completion.choices[0]?.message?.content
      if (!content || !content.trim()) throw new Error('Empty AI response')
      return content
    } catch (e) {
      lastError = e
      if (i < attempts - 1) await sleep(i === 0 ? 2000 : 5000)
    }
  }
  throw lastError instanceof Error ? lastError : new Error('AI request failed')
}

/** Robustly extract the first JSON object from an LLM response. */
function extractJson<T>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  const text = fenced ? fenced[1] : raw
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON found in AI response')
  return JSON.parse(text.slice(start, end + 1)) as T
}

/* ============================================================
   1. Subjective answer evaluation (theory exam)
   ============================================================ */

export interface SubjectiveEvaluation {
  score: number
  max_score: number
  feedback: string
  strengths: string
  weaknesses: string
}

export async function evaluateSubjectiveAnswer(
  questionText: string,
  studentAnswer: string,
  maxMarks: number,
  context: { subject?: string; difficulty?: string } = {}
): Promise<SubjectiveEvaluation> {
  const system = `You are a strict but fair university examiner evaluating a written answer. Score out of the given maximum marks. Be constructive and specific in feedback. You MUST reply with ONLY valid JSON of the shape: {"score": number, "max_score": number, "feedback": string, "strengths": string, "weaknesses": string}. feedback must be 2-3 sentences addressed to the student. strengths/weaknesses must each be one short phrase.`

  const user = `Subject: ${context.subject || 'General'}
Question (${maxMarks} marks): ${questionText}
${context.difficulty ? `Difficulty: ${context.difficulty}\n` : ''}Student's answer:
"""
${studentAnswer || '(left blank)'}
"""
Evaluate as a university examiner. If the answer is blank or totally irrelevant, score 0.`

  try {
    const raw = await chat(system, user)
    const parsed = extractJson<SubjectiveEvaluation>(raw)
    const score = Math.max(0, Math.min(maxMarks, Number(parsed.score) || 0))
    return {
      score,
      max_score: maxMarks,
      feedback: parsed.feedback || 'Answer evaluated.',
      strengths: parsed.strengths || '',
      weaknesses: parsed.weaknesses || '',
    }
  } catch {
    return fallbackEvaluate(studentAnswer, maxMarks)
  }
}

/** Deterministic fallback: keyword-length heuristic. */
function fallbackEvaluate(answer: string, maxMarks: number): SubjectiveEvaluation {
  const text = (answer || '').trim()
  if (!text) {
    return {
      score: 0, max_score: maxMarks,
      feedback: 'No answer was provided. Attempt every question — even partial answers earn marks.',
      strengths: '—', weaknesses: 'Unattempted',
    }
  }
  const words = text.split(/\s+/).length
  const lengthScore = Math.min(1, words / 60)
  const score = Math.round(maxMarks * (0.3 + 0.5 * lengthScore) * 100) / 100
  return {
    score, max_score: maxMarks,
    feedback: `Evaluated on structure and coverage (offline mode): ${words} words written. A complete answer defines the concept, gives a method/diagram, and closes with an example.`,
    strengths: 'Answer attempted', weaknesses: 'Needs more depth',
  }
}

/* ============================================================
   2. Viva answer evaluation
   ============================================================ */

export async function evaluateVivaAnswer(
  questionText: string,
  studentAnswer: string,
  maxMarks: number,
  subject?: string
): Promise<{ marks_obtained: number; feedback: string }> {
  const system = `You are an oral examination (viva voce) examiner at a university. The student has answered a viva question verbally (transcribed). Grade concisely as a spoken examiner would respond — 1-2 sentences, direct, addressing the student. Reply with ONLY valid JSON: {"marks_obtained": number, "feedback": string}.`

  const user = `Subject: ${subject || 'General'}
Viva question: ${questionText}
Maximum marks: ${maxMarks}
Student's spoken answer: "${(studentAnswer || '').trim() || '(silence)'}"
Grade the answer. If the answer shows partial understanding, award partial marks. If blank/irrelevant, 0 marks.`

  try {
    const raw = await chat(system, user, 512)
    const parsed = extractJson<{ marks_obtained: number; feedback: string }>(raw)
    return {
      marks_obtained: Math.max(0, Math.min(maxMarks, Number(parsed.marks_obtained) || 0)),
      feedback: parsed.feedback || 'Answer recorded.',
    }
  } catch {
    const text = (studentAnswer || '').trim()
    const words = text.split(/\s+/).length
    const marks = text ? Math.round(Math.min(1, 0.4 + words / 40) * maxMarks * 100) / 100 : 0
    return {
      marks_obtained: marks,
      feedback: text
        ? `Reasonable attempt — ${words} words. In a viva, answer directly: define the concept first, then give one crisp example.`
        : 'No answer given. In a viva, always attempt — examiners reward confident partial answers.',
    }
  }
}

/* ============================================================
   3. Practical / code submission evaluation
   ============================================================ */

export async function evaluatePracticalSubmission(
  title: string,
  description: string,
  expectedOutput: string | null,
  code: string,
  maxMarks: number
): Promise<{ score: number; percentage: number; feedback: string; suggestions: string }> {
  const system = `You are a practical lab examiner evaluating a student's submitted code/procedure for a lab experiment. Check correctness, structure and completeness. Reply with ONLY valid JSON: {"score": number, "feedback": string, "suggestions": string}. feedback: 2-3 sentences on how the submission performed. suggestions: 2-3 concrete bullets for improvement as a single string.`

  const user = `Experiment: ${title}
Objective: ${description}
Expected outcome: ${expectedOutput || 'As described'}
Maximum marks: ${maxMarks}
Student's submission (code):
"""
${code}
"""
Evaluate correctness, completeness and code quality. Award partial credit generously when the approach is right.`

  try {
    const raw = await chat(system, user, 768)
    const parsed = extractJson<{ score: number; feedback: string; suggestions: string }>(raw)
    const score = Math.max(0, Math.min(maxMarks, Number(parsed.score) || 0))
    return {
      score,
      percentage: Math.round((score / maxMarks) * 100),
      feedback: parsed.feedback || 'Submission evaluated.',
      suggestions: parsed.suggestions || 'Add comments and test edge cases.',
    }
  } catch {
    const lines = code.split('\n').filter(l => l.trim()).length
    const keywords = ['queue', 'visited', 'function', 'def', 'class', 'return', 'for', 'while', 'if']
    const hits = keywords.filter(k => code.toLowerCase().includes(k)).length
    const score = Math.round(Math.min(1, 0.3 + lines / 40 * 0.4 + hits / keywords.length * 0.3) * maxMarks * 100) / 100
    return {
      score,
      percentage: Math.round((score / maxMarks) * 100),
      feedback: `Offline evaluation: ${lines} lines of code detected with ${hits} core constructs present. The approach appears structurally sound; manual re-check recommended.`,
      suggestions: '• Add inline comments for each logical step\n• Handle edge cases (empty input, disconnected graphs)\n• Print the final result clearly to match the expected output.',
    }
  }
}

/* ============================================================
   4. Improvement suggestions (exam analytics)
   ============================================================ */

export async function generateImprovementSuggestions(
  subjectName: string,
  percentage: number,
  weakAreas: string[]
): Promise<string> {
  const system = 'You are an encouraging academic mentor. Given exam performance data, write 3-4 sentences of specific, constructive revision advice. Warm but direct. Plain text only, no markdown headings.'
  const user = `Subject: ${subjectName}
Score: ${percentage}%
Weak areas: ${weakAreas.length ? weakAreas.join('; ') : 'none recorded'}
Write targeted improvement advice for this student.`

  try {
    return await chat(system, user, 512)
  } catch {
    if (percentage >= 70) {
      return `Strong performance in ${subjectName} (${percentage}%). Consolidate by re-attempting the questions you missed under timed conditions, then move to hard-difficulty practice. Keep a one-page error log so the same slips don't repeat in the exam.`
    }
    return `You scored ${percentage}% in ${subjectName}. Focus first on: ${weakAreas.slice(0, 3).join(', ') || 'the topics you answered incorrectly'}. Re-read the unit notes for each weak topic, then drill easy questions there before progressing to medium difficulty. Aim to cross 60% on your next mock — attempt every question to bank partial marks.`
  }
}

/* ============================================================
   5. Material-analysis pipeline (upload → study structure)
   ============================================================ */

/** Read an uploaded image (syllabus photo / scanned PYQ) via the VLM. */
export async function readImageText(
  imagePath: string,
  mimeType: string,
  materialType: string
): Promise<string> {
  try {
    const buf = await fs.readFile(imagePath)
    const dataUrl = `data:${mimeType || 'image/png'};base64,${buf.toString('base64')}`
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `This image is an uploaded ${materialType.toLowerCase()} document for exam preparation. Transcribe ALL readable text exactly (units, topics, questions, marks, years). Preserve structure with line breaks. Output plain text only — no commentary.`,
            },
            { type: 'image_url', image_url: { url: dataUrl } },
          ] as never,
        },
      ],
      thinking: { type: 'disabled' },
      max_tokens: 2048,
    })
    const content = completion.choices[0]?.message?.content
    if (!content || !content.trim()) throw new Error('Empty VLM response')
    return content.trim()
  } catch {
    return ''
  }
}

/* ---------- structure analysis ---------- */

export interface AnalyzedTopic {
  name: string
  importance: 'high' | 'medium' | 'low'
  pyqFrequency: number
  weightage: number // 0-20
}

export interface AnalyzedUnit {
  title: string
  chapterNo: number
  topics: AnalyzedTopic[]
}

export interface AnalyzedStructure {
  subject: { name: string; code: string; description: string }
  units: AnalyzedUnit[]
}

const STRUCTURE_PROMPT = `You are an academic syllabus analyst. From the given document text, extract the subject and its unit/topic breakdown. You MUST reply with ONLY valid JSON (no markdown fences) of this exact shape:
{"subject":{"name":"...","code":"...","description":"one-line summary"},"units":[{"title":"Unit name","chapterNo":1,"topics":[{"name":"topic","importance":"high|medium|low","pyqFrequency":0,"weightage":5}]}]}
Rules: 3-6 units; 2-4 topics per unit; weightage 1-20 estimating exam weight (sum across a unit ~15-20); pyqFrequency 0-6 based on evidence in the text; importance derives from weightage/frequency; subject.name is the real academic subject (e.g. "Cloud Computing"); code like "CS501" or "CC300".`

/** Deterministic fallback structure from raw text heuristics. */
function fallbackStructure(text: string, materialType: string, fileName: string): AnalyzedStructure {
  const prettyName = fileName
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b(syllabus|pyq|notes|previous year|questions?|paper|lab|manual|sem|20\d\d)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  const name = prettyName.length > 2 ? titleCase(prettyName) : `${titleCase(materialType)} Subject`
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 24)
  const units: AnalyzedUnit[] = []
  let current: AnalyzedUnit | null = null
  for (const line of lines) {
    const unitMatch = line.match(/^(?:unit|module|chapter)\s*[-:.\s]?\s*(\d+)?\s*[-:.\s]?\s*(.{3,60})$/i)
    if (unitMatch && units.length < 6) {
      current = {
        title: titleCase(unitMatch[2] || `Unit ${units.length + 1}`),
        chapterNo: units.length + 1,
        topics: [],
      }
      units.push(current)
      continue
    }
    const words = line.split(/\s+/).slice(0, 8).join(' ')
    if (current && words.length > 3 && current.topics.length < 4) {
      current.topics.push({
        name: titleCase(words.replace(/[.:;]+$/, '')),
        importance: current.topics.length === 0 ? 'high' : 'medium',
        pyqFrequency: 0,
        weightage: Math.max(2, 18 - current.topics.length * 4),
      })
    }
  }
  while (units.length && units[units.length - 1].topics.length === 0) units.pop()
  if (units.length === 0) {
    units.push({
      title: 'Core Concepts',
      chapterNo: 1,
      topics: [
        { name: 'Fundamentals', importance: 'high', pyqFrequency: 1, weightage: 10 },
        { name: 'Key Techniques', importance: 'medium', pyqFrequency: 0, weightage: 8 },
        { name: 'Applications', importance: 'low', pyqFrequency: 0, weightage: 5 },
      ],
    })
  }
  return {
    subject: {
      name,
      code: name.replace(/\s+/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X') + '300',
      description: `Auto-generated from uploaded ${materialType.toLowerCase()}.`,
    },
    units,
  }
}

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1))
}

export async function analyzeMaterialStructure(
  extractedText: string,
  materialType: string,
  fileName: string
): Promise<AnalyzedStructure> {
  const text = extractedText.slice(0, 9000)
  try {
    const raw = await chat(
      STRUCTURE_PROMPT,
      `Material type: ${materialType}
File name: ${fileName}
Document text:
"""
${text || '(no extractable text — infer a sensible subject from the file name)'}
"""`,
      2048
    )
    const parsed = extractJson<AnalyzedStructure>(raw)
    if (!parsed?.subject?.name || !Array.isArray(parsed.units) || parsed.units.length === 0) {
      throw new Error('Incomplete structure')
    }
    // sanitise
    const units: AnalyzedUnit[] = parsed.units.slice(0, 6).map((u, i) => ({
      title: String(u.title || `Unit ${i + 1}`).slice(0, 120),
      chapterNo: Number(u.chapterNo) || i + 1,
      topics: (Array.isArray(u.topics) ? u.topics : []).slice(0, 5).map(t => ({
        name: String(t.name || 'Topic').slice(0, 120),
        importance: (['high', 'medium', 'low'].includes(t.importance) ? t.importance : 'medium') as AnalyzedTopic['importance'],
        pyqFrequency: Math.max(0, Math.min(6, Number(t.pyqFrequency) || 0)),
        weightage: Math.max(1, Math.min(20, Number(t.weightage) || 5)),
      })),
    })).filter(u => u.topics.length > 0)
    if (units.length === 0) throw new Error('No topics')
    return {
      subject: {
        name: String(parsed.subject.name).slice(0, 80),
        code: String(parsed.subject.code || 'GEN300').slice(0, 12),
        description: String(parsed.subject.description || '').slice(0, 200),
      },
      units,
    }
  } catch {
    return fallbackStructure(text, materialType, fileName)
  }
}

/* ---------- question bank generation ---------- */

export interface GeneratedOption {
  id: string
  text: string
  is_correct: boolean
}

export interface GeneratedQuestion {
  type: 'MCQ' | 'SHORT_ANSWER' | 'LONG_ANSWER' | 'VIVA'
  text: string
  options: GeneratedOption[]
  correct_answer: string
  explanation: string
  marks: number
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  topic: string
  year: number | null
  source: 'PYQ' | 'AI'
}

const QUESTION_PROMPT = `You are an expert university examiner. Using ONLY the document text and topic list, generate an exam question bank. You MUST reply with ONLY valid JSON (no markdown fences) of this exact shape:
{"questions":[{"type":"MCQ|SHORT_ANSWER|LONG_ANSWER|VIVA","text":"...","options":[{"id":"A","text":"...","is_correct":true}],"correct_answer":"A","explanation":"why","marks":1,"difficulty":"EASY|MEDIUM|HARD","topic":"exact topic name from list","year":null,"source":"AI"}]}
Rules: exactly 14 questions — 6 MCQ (4 options each, exactly one correct, ids A-D), 3 SHORT_ANSWER (marks 3), 2 LONG_ANSWER (marks 8), 3 VIVA (marks 2). Every question must be grounded in the document content. "topic" must exactly match one of the provided topic names. For MCQ, correct_answer is the correct option id and explanation is 1-2 sentences. If the document contains previous-year questions, mark those questions "source":"PYQ" and set "year" to their year; otherwise year null.`

const PYQ_EXTRACTION_PROMPT = `You are digitising a university previous-year question paper (PYQ). Using ONLY the document text, EXTRACT the actual questions printed in the paper — lightly cleaned, wording preserved, NOT invented. You MUST reply with ONLY valid JSON (no markdown fences) of this exact shape:
{"questions":[{"type":"MCQ|SHORT_ANSWER|LONG_ANSWER|VIVA","text":"...","options":[{"id":"A","text":"...","is_correct":true}],"correct_answer":"A","explanation":"model answer outline in 1-2 sentences","marks":2,"difficulty":"EASY|MEDIUM|HARD","topic":"exact topic name from list","year":2024,"source":"PYQ"}]}
Rules: 12-18 questions, every one taken from the paper. Keep the paper's own marks and question style — objective/multiple-choice items → MCQ (build plausible options, mark the right one), everything else → SHORT_ANSWER (2-5 marks) or LONG_ANSWER (8-10 marks). Set "year" from the paper's year header (e.g. "2024-25" → 2024). "source" is always "PYQ". "topic" must exactly match one of the provided topic names (pick the closest concept). If a question covers two topics, duplicate it is NOT allowed — pick the dominant topic.`

function fallbackQuestions(topics: string[], materialType: string): GeneratedQuestion[] {
  const t = (i: number) => topics[i % Math.max(1, topics.length)] || 'Fundamentals'
  const qs: GeneratedQuestion[] = []
  for (let i = 0; i < 6; i++) {
    qs.push({
      type: 'MCQ',
      text: `Which statement best describes ${t(i)}?`,
      options: [
        { id: 'A', text: `The standard definition of ${t(i)} as covered in the material`, is_correct: true },
        { id: 'B', text: 'An unrelated networking concept', is_correct: false },
        { id: 'C', text: 'A deprecated hardware standard', is_correct: false },
        { id: 'D', text: 'None of the above', is_correct: false },
      ],
      correct_answer: 'A',
      explanation: `Refer to the uploaded ${materialType.toLowerCase()} — ${t(i)} section.`,
      marks: 1,
      difficulty: i < 2 ? 'EASY' : 'MEDIUM',
      topic: t(i),
      year: null,
      source: 'AI',
    })
  }
  for (let i = 0; i < 3; i++) {
    qs.push({
      type: 'SHORT_ANSWER', text: `Explain ${t(i + 2)} and give one example.`,
      options: [], correct_answer: '', explanation: 'Model answer in notes.',
      marks: 3, difficulty: 'MEDIUM', topic: t(i + 2), year: null, source: 'AI',
    })
  }
  for (let i = 0; i < 2; i++) {
    qs.push({
      type: 'LONG_ANSWER', text: `Discuss ${t(i + 5)} in detail: concepts, architecture/diagram, advantages and limitations.`,
      options: [], correct_answer: '', explanation: 'Model answer in notes.',
      marks: 8, difficulty: 'HARD', topic: t(i + 5), year: null, source: 'AI',
    })
  }
  for (let i = 0; i < 3; i++) {
    qs.push({
      type: 'VIVA', text: `Viva: define ${t(i)} in one sentence and name a real-world use.`,
      options: [], correct_answer: '', explanation: 'Expected: crisp definition + example.',
      marks: 2, difficulty: 'EASY', topic: t(i), year: null, source: 'AI',
    })
  }
  return qs
}

/** Parse the year out of a PYQ paper's header ("2024-25", "Nov 2023"…). */
function guessYear(text: string): number {
  const m = text.match(/20\d{2}/g)
  if (!m) return new Date().getFullYear() - 1
  return Math.max(...m.map(Number).filter(y => y <= new Date().getFullYear() + 1))
}

/** Grounded PYQ fallback: pull question-shaped lines straight from the paper. */
function fallbackPyqQuestions(text: string, topicNames: string[]): GeneratedQuestion[] {
  const year = guessYear(text)
  const lines = text
    .split('\n')
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  const seen = new Set<string>()
  const qs: GeneratedQuestion[] = []
  for (const line of lines) {
    if (line.length < 25 || line.length > 400) continue
    const questionish =
      /^(?:[Qq]\.?\s*)?(?:\d{1,2}\s*[.)]\s*)?[A-Za-z]/.test(line) &&
      (/[?]\s*$/.test(line) ||
        /\b(?:define|explain|describe|discuss|derive|prove|state|list|compare|write|design|analyse|analyze|what|why|how|which|draw|differentiate|illustrate|evaluate)\b/i.test(line))
    if (!questionish) continue
    const key = line.toLowerCase().slice(0, 60)
    if (seen.has(key)) continue
    seen.add(key)
    const marksMatch = line.match(/\[(\d{1,2})\s*marks?\]|\((\d{1,2})\s*marks?\)/i)
    const marks = marksMatch ? Number(marksMatch[1] || marksMatch[2]) : line.length > 200 ? 10 : line.length > 90 ? 5 : 2
    const lower = line.toLowerCase()
    let bestTopic = topicNames[0] || 'General'
    let bestScore = 0
    for (const t of topicNames) {
      const words = t.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3)
      let s = 0
      for (const w of words) if (lower.includes(w)) s++
      if (s > bestScore) {
        bestScore = s
        bestTopic = t
      }
    }
    qs.push({
      type: marks >= 8 ? 'LONG_ANSWER' : 'SHORT_ANSWER',
      text: line.replace(/^(?:[Qq]\.?\s*)?\d{1,2}\s*[.)]\s*/, '').slice(0, 400),
      options: [],
      correct_answer: '',
      explanation: 'Extracted directly from the uploaded question paper.',
      marks: [1, 2, 3, 5, 8, 10].includes(marks) ? marks : 2,
      difficulty: marks >= 8 ? 'HARD' : 'MEDIUM',
      topic: bestTopic,
      year,
      source: 'PYQ',
    })
    if (qs.length >= 16) break
  }
  return qs
}

export async function generateQuestionBank(
  extractedText: string,
  materialType: string,
  subjectName: string,
  topicNames: string[]
): Promise<GeneratedQuestion[]> {
  const isPyq = materialType === 'PYQ'
  const text = extractedText.slice(0, 9000)
  const prompt = isPyq ? PYQ_EXTRACTION_PROMPT : QUESTION_PROMPT
  const minQuestions = isPyq ? 4 : 6
  try {
    const raw = await chat(
      prompt,
      `Subject: ${subjectName}
Material type: ${materialType}
Allowed topic names: ${topicNames.join('; ')}
Document text:
"""
${text || '(no extractable text — write standard exam questions for the subject)'}
"""`,
      4096
    )
    const parsed = extractJson<{ questions: GeneratedQuestion[] }>(raw)
    const list = Array.isArray(parsed.questions) ? parsed.questions : []
    const valid = list.filter(q => q && typeof q.text === 'string' && q.text.length > 5).map(q => {
      const type = (['MCQ', 'SHORT_ANSWER', 'LONG_ANSWER', 'VIVA'].includes(q.type) ? q.type : 'SHORT_ANSWER') as GeneratedQuestion['type']
      const options = (Array.isArray(q.options) ? q.options : [])
        .slice(0, 5)
        .map((o, i) => ({
          id: String(o.id || String.fromCharCode(65 + i)).slice(0, 2),
          text: String(o.text || '').slice(0, 200),
          is_correct: !!o.is_correct,
        }))
      const hasCorrect = options.some(o => o.is_correct)
      const difficulty = (['EASY', 'MEDIUM', 'HARD'].includes(q.difficulty) ? q.difficulty : 'MEDIUM') as GeneratedQuestion['difficulty']
      return {
        type,
        text: q.text.slice(0, 500),
        options: type === 'MCQ' && options.length >= 2 && hasCorrect ? options : options.length >= 2 ? options.map((o, i) => ({ ...o, is_correct: i === 0 })) : [],
        correct_answer: String(q.correct_answer || (type === 'MCQ' ? 'A' : '')).slice(0, 4),
        explanation: String(q.explanation || '').slice(0, 400),
        marks: [1, 2, 3, 5, 8, 10].includes(Number(q.marks)) ? Number(q.marks) : type === 'MCQ' ? 1 : type === 'VIVA' ? 2 : 3,
        difficulty,
        topic: topicNames.includes(q.topic) ? q.topic : topicNames[0] || 'Fundamentals',
        year: Number.isFinite(Number(q.year)) && Number(q.year) > 1990 && Number(q.year) <= 2100 ? Number(q.year) : null,
        source: q.source === 'PYQ' ? 'PYQ' : 'AI',
      } satisfies GeneratedQuestion
    }).filter(q => q.type !== 'MCQ' || (q.options.length >= 2 && q.options.some(o => o.is_correct)))
    if (valid.length < minQuestions) throw new Error('Too few questions')
    if (isPyq) {
      // a PYQ paper must yield PYQ-tagged questions — otherwise the whole
      // PYQ-analysis feature stays empty; treat it as a failure and retry/fallback
      if (!valid.some(q => q.source === 'PYQ')) throw new Error('No PYQ-tagged questions')
    }
    return valid
  } catch {
    if (isPyq) {
      const fromPaper = fallbackPyqQuestions(text, topicNames.length ? topicNames : ['General'])
      if (fromPaper.length >= 3) return fromPaper
    }
    return fallbackQuestions(topicNames.length ? topicNames : ['Fundamentals'], materialType)
  }
}

/* ---------- lab experiment generation (LAB_MANUAL uploads) ---------- */

export interface GeneratedExperiment {
  title: string
  description: string
  objective: string
  instructions: string
  expectedOutput: string
  marks: number
}

export async function generateLabExperiments(
  extractedText: string,
  subjectName: string
): Promise<GeneratedExperiment[]> {
  const text = extractedText.slice(0, 6000)
  try {
    const raw = await chat(
      `You are a lab course designer. From the lab manual text, generate 3 experiments. Reply with ONLY valid JSON: {"experiments":[{"title":"...","description":"...","objective":"...","instructions":"numbered steps","expectedOutput":"...","marks":10}]}. Fields concise; instructions newline-separated numbered steps.`,
      `Subject: ${subjectName}
Lab manual text:
"""
${text || '(no text — write standard subject-appropriate lab experiments)'}
"""`,
      2048
    )
    const parsed = extractJson<{ experiments: GeneratedExperiment[] }>(raw)
    const list = (Array.isArray(parsed.experiments) ? parsed.experiments : []).filter(e => e && e.title).map(e => ({
      title: String(e.title).slice(0, 140),
      description: String(e.description || '').slice(0, 400),
      objective: String(e.objective || '').slice(0, 300),
      instructions: String(e.instructions || '').slice(0, 1200),
      expectedOutput: String(e.expectedOutput || '').slice(0, 300),
      marks: Math.max(5, Math.min(20, Number(e.marks) || 10)),
    }))
    if (list.length === 0) throw new Error('No experiments')
    return list.slice(0, 5)
  } catch {
    return [
      {
        title: `${subjectName}: Core Practical`,
        description: `Implement the fundamental practical of ${subjectName} as described in the uploaded manual.`,
        objective: `Apply the core concepts of ${subjectName} to a working implementation.`,
        instructions: '1. Read the experiment in the lab manual\n2. Design the solution\n3. Implement it\n4. Test with sample input\n5. Document the output',
        expectedOutput: 'A working implementation with sample run output.',
        marks: 10,
      },
      {
        title: `${subjectName}: Advanced Practical`,
        description: `Extend the core practical with an advanced requirement.`,
        objective: 'Demonstrate deeper understanding through an extended task.',
        instructions: '1. Review the core practical\n2. Add the advanced requirement\n3. Benchmark or compare results\n4. Document findings',
        expectedOutput: 'Extended implementation with comparison output.',
        marks: 10,
      },
    ]
  }
}

/* ---------- AI study plan generation (RAG-fed) ---------- */

export interface StudyPlanTaskAI {
  title: string
  subject: string
  type: 'study' | 'practice' | 'test' | 'revision'
  priority: 'high' | 'medium' | 'low'
  duration: number // minutes
}

export interface StudyPlanAI {
  days: { tasks: StudyPlanTaskAI[] }[] // exactly 7 entries
}

/**
 * Generate a 7-day study plan from the user's real situation:
 * subjects + their high-weightage topics, detected weak topics and
 * the exam date. Returns null on AI failure (caller falls back to
 * the deterministic plan).
 */
export async function generateStudyPlanTasks(input: {
  subjects: { name: string; hotTopics: string[]; materialCount: number }[]
  weakTopics: { topic: string; subject: string; score: number }[]
  examDate?: string | null
}): Promise<StudyPlanAI | null> {
  if (input.subjects.length === 0) return null
  const system = `You are a study-plan strategist for university exam preparation. Given the student's subjects, their most exam-important topics (weight-ordered), detected weak topics from past tests and an optional exam date, produce a 7-day study plan. Reply with ONLY valid JSON of this exact shape:
{"days":[{"tasks":[{"title":"...","subject":"...","type":"study|practice|test|revision","priority":"high|medium|low","duration":45}]}]}
Rules: exactly 7 days, 2-3 tasks per day (15-90 minutes each, realistic daily load). Prioritise weak topics early (type "practice", priority "high"). Reference real topic names in titles. If the exam date is close, shift later days to revision + mock tests. Titles are action-first, e.g. "Study: Virtualization — hypervisor types", "Practise PYQs: Cloud Security (weak topic)".`

  const subjectLines = input.subjects
    .map(
      s =>
        `- ${s.name}: ${s.materialCount} uploaded material(s); key topics: ${s.hotTopics.slice(0, 8).join(', ') || 'general syllabus'}`
    )
    .join('\n')
  const weakLines = input.weakTopics.length
    ? input.weakTopics
        .slice(0, 10)
        .map(w => `- ${w.topic} (${w.subject}) — last score ${w.score}%`)
        .join('\n')
    : '- none recorded yet'

  const user = `Subjects:
${subjectLines}

Weak topics from past tests:
${weakLines}

Exam date: ${input.examDate || 'not set'}
Build the 7-day plan.`

  try {
    const raw = await chat(system, user, 2048)
    const parsed = extractJson<StudyPlanAI>(raw)
    const days = Array.isArray(parsed.days) ? parsed.days : []
    if (days.length < 5) return null
    const sanitized = days.slice(0, 7).map(d => ({
      tasks: (Array.isArray(d.tasks) ? d.tasks : [])
        .filter(t => t && typeof t.title === 'string' && t.title.length > 3)
        .slice(0, 3)
        .map(t => ({
          title: String(t.title).slice(0, 120),
          subject: String(t.subject || input.subjects[0].name).slice(0, 80),
          type: (['study', 'practice', 'test', 'revision'].includes(t.type)
            ? t.type
            : 'study') as StudyPlanTaskAI['type'],
          priority: (['high', 'medium', 'low'].includes(t.priority)
            ? t.priority
            : 'medium') as StudyPlanTaskAI['priority'],
          duration: Math.max(10, Math.min(180, Number(t.duration) || 45)),
        })),
    }))
    if (sanitized.filter(d => d.tasks.length > 0).length < 5) return null
    while (sanitized.length < 7) {
      sanitized.push({ tasks: sanitized[sanitized.length % Math.max(1, sanitized.length)].tasks.slice(0, 1) })
    }
    return { days: sanitized }
  } catch {
    return null
  }
}
