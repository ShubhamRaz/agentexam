import { NextRequest } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'
import { extractTextFromFile } from '@/lib/file-extract'
import {
  analyzeMaterialStructure,
  generateQuestionBank,
  generateLabExperiments,
  readImageText,
  type AnalyzedStructure,
} from '@/lib/ai'
import { isSubjectVisible, mapMaterial, generateStudyPlan } from '@/app/api/lib/compute'
import type { MaterialUploadResult } from '@/lib/types'
import type { GeneratedQuestion } from '@/lib/ai'

export const dynamic = 'force-dynamic'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const MATERIAL_TYPES = ['SYLLABUS', 'PYQ', 'NOTES', 'LAB_MANUAL']

/**
 * generateQuestionBank's deterministic fallback emits exactly this template
 * (its LLM call can return a truncated/over-verbose JSON that fails parsing).
 * Detected → one retry so real AI questions get a second chance.
 */
function looksLikeFallbackBank(qs: GeneratedQuestion[]): boolean {
  const mcqs = qs.filter(q => q.type === 'MCQ')
  return (
    qs.length === 14 &&
    mcqs.length === 6 &&
    mcqs.every(q => /^Which statement best describes /.test(q.text)) &&
    qs.every(q => q.source !== 'PYQ')
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * POST /api/materials/upload — the AI pipeline.
 * multipart FormData: file, material_type, subject_id (optional —
 * empty/absent = auto-detect & create subject), classroom_id (optional,
 * faculty only — attaches the subject to their classroom).
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return Response.json({ error: 'Expected multipart form data' }, { status: 400 })
  }

  const file = form.get('file')
  if (!file || typeof file === 'string') {
    return Response.json({ error: 'file is required' }, { status: 400 })
  }
  const upload = file as File
  if (upload.size <= 0) {
    return Response.json({ error: 'Uploaded file is empty' }, { status: 400 })
  }
  if (upload.size > MAX_SIZE) {
    return Response.json({ error: 'File exceeds the 10MB limit' }, { status: 400 })
  }

  let materialType = String(form.get('material_type') || 'NOTES').toUpperCase()
  if (!MATERIAL_TYPES.includes(materialType)) {
    return Response.json(
      { error: 'material_type must be SYLLABUS, PYQ, NOTES or LAB_MANUAL' },
      { status: 400 }
    )
  }

  const subjectIdProvided = String(form.get('subject_id') || '').trim()
  const rawClassroomId = String(form.get('classroom_id') || '').trim()

  // classroom_id is meaningful for faculty only (must be THEIR classroom);
  // students cannot attach uploads to a classroom — strip it.
  let classroomId: string | null = null
  if (user.role === 'FACULTY' && rawClassroomId) {
    const classroom = await db.classroom.findUnique({ where: { id: rawClassroomId } })
    if (!classroom || classroom.facultyId !== user.id) {
      return Response.json({ error: 'Classroom not available' }, { status: 403 })
    }
    classroomId = classroom.id
  }

  // ---------- 3. persist the file ----------
  const safeName = upload.name || 'upload'
  const ext = (safeName.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)
  const storedName = `${randomUUID()}.${ext || 'bin'}`
  const uploadDir = path.join(process.cwd(), 'upload', 'materials')
  let savedPath: string
  try {
    await fs.mkdir(uploadDir, { recursive: true })
    savedPath = path.join(uploadDir, storedName)
    await fs.writeFile(savedPath, Buffer.from(await upload.arrayBuffer()))
  } catch {
    return Response.json({ error: 'Failed to store the uploaded file' }, { status: 500 })
  }

  // ---------- 4. extract text ----------
  let extractedText = ''
  try {
    const extraction = await extractTextFromFile(savedPath, upload.type, safeName)
    extractedText = extraction.text
    if (extraction.usedVlm) {
      extractedText = await readImageText(savedPath, upload.type, materialType)
    }
  } catch {
    extractedText = ''
  }

  // ---------- 5. determine the target subject ----------
  let subject: { id: string; name: string; code: string }
  let isNewSubject = false
  let analysis: AnalyzedStructure | null = null

  if (subjectIdProvided) {
    const existing = await db.subject.findUnique({ where: { id: subjectIdProvided } })
    if (!existing) {
      return Response.json({ error: 'Subject not found' }, { status: 404 })
    }
    if (!(await isSubjectVisible(user.id, existing.id))) {
      return Response.json({ error: 'Subject not available' }, { status: 403 })
    }
    subject = existing
  } else {
    analysis = await analyzeMaterialStructure(extractedText, materialType, safeName)
    const owned = await db.subject.findMany({ where: { ownerId: user.id } })
    const wanted = analysis.subject.name.toLowerCase()
    let match = owned.find(s => s.name.toLowerCase() === wanted)
    if (match && classroomId) {
      // prefer a subject attached to this classroom when one exists
      match =
        owned.find(s => s.name.toLowerCase() === wanted && s.classroomId === classroomId) ?? match
    }
    if (match) {
      subject = match
    } else {
      // unique-ish code: append random digits when the owner already has it
      let code = (analysis.subject.code || 'GEN300').slice(0, 12)
      while (await db.subject.findFirst({ where: { ownerId: user.id, code } })) {
        code = `${code.slice(0, 8)}${Math.floor(100 + Math.random() * 900)}`
      }
      const created = await db.subject.create({
        data: {
          name: analysis.subject.name,
          code,
          description: analysis.subject.description || `Created from uploaded ${materialType.toLowerCase()}.`,
          ownerId: user.id,
          classroomId,
        },
      })
      subject = created
      isNewSubject = true
    }
  }

  // ---------- 6. material row FIRST (PROCESSING) ----------
  const material = await db.material.create({
    data: {
      subjectId: subject.id,
      uploadedBy: user.id,
      materialType,
      title: safeName.replace(/\.[^.]+$/, '') || 'Untitled material',
      fileName: safeName,
      fileType: ext || 'bin',
      mimeType: upload.type || 'application/octet-stream',
      fileSize: upload.size,
      processingStatus: 'PROCESSING',
      extractedText: extractedText.slice(0, 20000) || null,
    },
  })

  // ---------- 7-9. AI pipeline (synchronous; 10-30s is expected) ----------
  let createdUnits = 0
  let createdTopics = 0
  let createdQuestions = 0
  let createdExperiments = 0
  let studyPlanGenerated = false
  let processingMethod: MaterialUploadResult['processingMethod'] = 'AI'

  try {
    // -- 7a. structure: units + topics --
    const unitCount = await db.unit.count({ where: { subjectId: subject.id } })
    const needStructure = isNewSubject || unitCount === 0 || materialType === 'PYQ'
    if (needStructure) {
      if (!analysis) {
        analysis = await analyzeMaterialStructure(extractedText, materialType, safeName)
      }
      const existingUnits = await db.unit.findMany({
        where: { subjectId: subject.id },
        select: { name: true },
      })
      const existingNames = new Set(existingUnits.map(u => u.name.toLowerCase()))
      for (const u of analysis.units) {
        if (existingNames.has(u.title.toLowerCase())) continue // merge, never duplicate
        const unit = await db.unit.create({
          data: { subjectId: subject.id, name: u.title, chapterNo: u.chapterNo },
        })
        createdUnits++
        for (const t of u.topics) {
          await db.topic.create({
            data: {
              unitId: unit.id,
              name: t.name,
              importance: t.importance,
              pyqFrequency: t.pyqFrequency,
              weightage: t.weightage,
            },
          })
          createdTopics++
        }
        existingNames.add(u.title.toLowerCase())
      }
    }

    // -- 7b. question bank (retry once when the AI call degraded to the
    //    deterministic template bank, e.g. after a truncated LLM response,
    //    or when a PYQ upload yielded no PYQ-tagged questions at all) --
    const topics = await db.topic.findMany({
      where: { unit: { subjectId: subject.id } },
      select: { id: true, name: true },
    })
    const topicIdByName = new Map(topics.map(t => [t.name, t.id]))
    const topicNames = topics.map(t => t.name)
    const weakBank = (qs: GeneratedQuestion[]) =>
      looksLikeFallbackBank(qs) ||
      (materialType === 'PYQ' && qs.every(q => q.source !== 'PYQ'))
    let generated = await generateQuestionBank(extractedText, materialType, subject.name, topicNames)
    if (weakBank(generated)) {
      await sleep(1500)
      const retry = await generateQuestionBank(extractedText, materialType, subject.name, topicNames)
      if (!weakBank(retry)) generated = retry
    }
    for (const q of generated) {
      await db.question.create({
        data: {
          subjectId: subject.id,
          topicId: topicIdByName.get(q.topic) ?? null,
          questionType: q.type,
          questionText: q.text,
          options: q.type === 'MCQ' && q.options.length ? JSON.stringify(q.options) : null,
          correctAnswer: q.type === 'MCQ' ? q.correct_answer : null,
          explanation: q.explanation || null,
          marks: q.marks,
          difficultyLevel: q.difficulty,
          source: q.source === 'PYQ' ? 'PYQ' : 'AI',
          sourceReference: q.source === 'PYQ' && q.year ? `${q.year} End Term Exam` : null,
          year: q.year,
        },
      })
      createdQuestions++
    }

    // -- 7c. lab experiments --
    if (materialType === 'LAB_MANUAL') {
      const expCount = await db.experiment.count({ where: { subjectId: subject.id } })
      if (expCount === 0) {
        const experiments = await generateLabExperiments(extractedText, subject.name)
        for (const e of experiments) {
          await db.experiment.create({
            data: {
              subjectId: subject.id,
              title: e.title,
              description: e.description,
              objective: e.objective,
              instructions: e.instructions,
              expectedOutput: e.expectedOutput,
              marks: e.marks,
            },
          })
          createdExperiments++
        }
      }
    }

    // ---------- 8. processed ----------
    await db.material.update({
      where: { id: material.id },
      data: {
        processingStatus: 'PROCESSED',
        analysisSummary: JSON.stringify({
          units: createdUnits,
          topics: createdTopics,
          questions: createdQuestions,
          experiments: createdExperiments,
          subjectName: subject.name,
          isNewSubject,
        }),
      },
    })

    // ---------- 9. regenerate the STUDENT's study plan ----------
    if (user.role === 'STUDENT') {
      await generateStudyPlan(user.id)
      studyPlanGenerated = true
    }
  } catch {
    // pipeline failure → FAILED material, still a 201 (frontend shows failed chip)
    processingMethod = 'FALLBACK'
    createdUnits = 0
    createdTopics = 0
    createdQuestions = 0
    createdExperiments = 0
    studyPlanGenerated = false
    await db.material
      .update({ where: { id: material.id }, data: { processingStatus: 'FAILED' } })
      .catch(() => undefined)
  }

  const finalRow = await db.material.findUnique({
    where: { id: material.id },
    include: { subject: true },
  })

  const payload: MaterialUploadResult = {
    material: mapMaterial(finalRow!, user.name),
    subject: { id: subject.id, name: subject.name, code: subject.code },
    created: {
      units: createdUnits,
      topics: createdTopics,
      questions: createdQuestions,
      experiments: createdExperiments,
      isNewSubject,
    },
    studyPlanGenerated,
    processingMethod,
  }
  return Response.json(payload, { status: 201 })
}
