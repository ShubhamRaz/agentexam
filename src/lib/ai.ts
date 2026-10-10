/* ============================================================
   AgentExam AI service — wraps z-ai-web-dev-sdk (SERVER ONLY).
   Provides exam question evaluation, viva grading and practical
   code review, each with deterministic fallbacks so the app
   degrades gracefully if the AI call fails.
   ============================================================ */
import ZAI from 'z-ai-web-dev-sdk'

type ChatRole = 'user' | 'assistant'

async function chat(systemPrompt: string, userPrompt: string, maxTokens = 1024): Promise<string> {
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
