/* ============================================================
   AgentExam material processing pipeline — SERVER ONLY.

   The upload route persists the file and responds IMMEDIATELY;
   this module then runs the heavy AI pipeline in the background
   (guarded by a concurrency-limited queue so parallel uploads
   don't trip the SDK's rate limits):

     1. extract text (pdftotext / docx / VLM OCR for images and
        scanned PDF pages)
     2. detect the subject (auto-detect creates it) + units/topics
     3. RAG context over EVERY material of the subject
     4. question bank (PYQ uploads → real questions from the paper)
     5. lab experiments for LAB_MANUAL uploads
     6. refresh topic PYQ frequency from real evidence
     7. regenerate the student's AI study plan
     8. material → PROCESSED (+ analysis summary)

   Materials that fail end up FAILED — the client offers a
   one-click re-analyze (POST /api/materials/:id/reprocess).
   ============================================================ */
import fs from 'fs/promises'
import { db } from '@/lib/db'
import { extractTextFromFile } from '@/lib/file-extract'
import {
  analyzeMaterialStructure,
  generateQuestionBank,
  generateLabExperiments,
  readImageText,
  type AnalyzedStructure,
  type GeneratedQuestion,
} from '@/lib/ai'
import { buildSubjectContext, updateTopicPyqFrequency } from '@/lib/rag'
import { generateStudyPlan } from '@/app/api/lib/compute'

/* ---------- concurrency-limited queue (max 2 parallel pipelines) ---------- */

const MAX_CONCURRENT = 2
let running = 0
const waiters: Array<() => void> = []

async function acquire(): Promise<void> {
  if (running < MAX_CONCURRENT) {
    running++
    return
  }
  await new Promise<void>(resolve => waiters.push(resolve))
  running++
}

function release(): void {
  running--
  const next = waiters.shift()
  if (next) next()
}

/* ---------- active-material guard (avoid double-processing) ---------- */

const activeMaterialIds = new Set<string>()

export function isMaterialProcessing(materialId: string): boolean {
  return activeMaterialIds.has(materialId)
}

/** Fire-and-forget entry point used by the upload + reprocess routes. */
export function enqueueMaterialPipeline(
  materialId: string,
  opts: { classroomId?: string | null } = {}
): void {
  if (activeMaterialIds.has(materialId)) return
  activeMaterialIds.add(materialId)
  void (async () => {
    await acquire()
    try {
      await runMaterialPipeline(materialId, opts)
    } catch {
      await db.material
        .update({ where: { id: materialId }, data: { processingStatus: 'FAILED' } })
        .catch(() => undefined)
    } finally {
      activeMaterialIds.delete(materialId)
      release()
    }
  })()
}

/* ---------- the pipeline itself ---------- */

/**
 * generateQuestionBank's deterministic fallback emits exactly this template.
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

export async function runMaterialPipeline(
  materialId: string,
  opts: { classroomId?: string | null } = {}
): Promise<void> {
  const material = await db.material.findUnique({
    where: { id: materialId },
    include: { subject: true },
  })
  if (!material) return
  const uploader = await db.user.findUnique({ where: { id: material.uploadedBy } })
  if (!material.filePath) {
    await db.material.update({ where: { id: material.id }, data: { processingStatus: 'FAILED' } })
    return
  }

  const createdUnits = 0
  const createdTopics = 0
  const createdQuestions = 0
  const createdExperiments = 0

  // ---------- 1. extract text ----------
  let extractedText = material.extractedText ?? ''
  if (!extractedText) {
    const extraction = await extractTextFromFile(
      material.filePath,
      material.mimeType,
      material.fileName
    )
    extractedText = extraction.text
    if (extraction.usedVlm && extraction.vlmFiles.length > 0) {
      const pageTexts: string[] = []
      for (const page of extraction.vlmFiles) {
        const ocr = await readImageText(page, 'image/png', material.materialType)
        if (ocr) pageTexts.push(ocr)
      }
      extractedText = pageTexts.join('\n\n').trim()
      // page renders are temporary files
      if (extraction.vlmFiles.length > 1 || extraction.vlmFiles[0] !== material.filePath) {
        await Promise.allSettled(extraction.vlmFiles.map(f => fs.unlink(f)))
      }
    }
    // persist as soon as we have it (input for future RAG runs)
    await db.material.update({
      where: { id: material.id },
      data: { extractedText: extractedText.slice(0, 20000) || null },
    })
  }

  // ---------- 2. subject resolution ----------
  let subject = material.subject
  let isNewSubject = false
  let analysis: AnalyzedStructure | null = null

  if (!subject) {
    analysis = await analyzeMaterialStructure(extractedText, material.materialType, material.fileName)
    const owned = await db.subject.findMany({ where: { ownerId: material.uploadedBy } })
    const wanted = analysis.subject.name.toLowerCase()
    let match = owned.find(s => s.name.toLowerCase() === wanted)
    if (match && opts.classroomId) {
      // prefer a subject attached to this classroom when one exists
      match =
        owned.find(s => s.name.toLowerCase() === wanted && s.classroomId === opts.classroomId) ??
        match
    }
    if (match) {
      subject = match
    } else {
      let code = (analysis.subject.code || 'GEN300').slice(0, 12)
      while (await db.subject.findFirst({ where: { ownerId: material.uploadedBy, code } })) {
        code = `${code.slice(0, 8)}${Math.floor(100 + Math.random() * 900)}`
      }
      const created = await db.subject.create({
        data: {
          name: analysis.subject.name,
          code,
          description:
            analysis.subject.description ||
            `Created from uploaded ${material.materialType.toLowerCase()}.`,
          ownerId: material.uploadedBy,
          classroomId: opts.classroomId ?? null,
        },
      })
      subject = created
      isNewSubject = true
    }
    await db.material.update({ where: { id: material.id }, data: { subjectId: subject.id } })
  }

  let units = createdUnits
  let topics = createdTopics
  let questions = createdQuestions
  let experiments = createdExperiments

  try {
    // ---------- 3. structure: units + topics (merge-protected) ----------
    const unitCount = await db.unit.count({ where: { subjectId: subject.id } })
    const needStructure =
      isNewSubject || unitCount === 0 || material.materialType === 'PYQ'
    if (needStructure) {
      if (!analysis) {
        analysis = await analyzeMaterialStructure(
          extractedText,
          material.materialType,
          material.fileName
        )
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
        units++
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
          topics++
        }
        existingNames.add(u.title.toLowerCase())
      }
    }

    // ---------- 4. RAG context over EVERY material of this subject ----------
    const ragContext = await buildSubjectContext(subject.id, {
      prioritizeMaterialId: material.id,
      subjectName: subject.name,
      budget: 9000,
    })
    // fall back to this material's own text when nothing else is available
    const bankContext = ragContext || extractedText

    // ---------- 5. question bank ----------
    const topicRows = await db.topic.findMany({
      where: { unit: { subjectId: subject.id } },
      select: { id: true, name: true },
    })
    const topicIdByName = new Map(topicRows.map(t => [t.name, t.id]))
    const topicNames = topicRows.map(t => t.name)
    const weakBank = (qs: GeneratedQuestion[]) =>
      looksLikeFallbackBank(qs) ||
      (material.materialType === 'PYQ' && qs.every(q => q.source !== 'PYQ'))
    let generated = await generateQuestionBank(
      bankContext,
      material.materialType,
      subject.name,
      topicNames
    )
    if (weakBank(generated)) {
      await sleep(1500)
      const retry = await generateQuestionBank(
        bankContext,
        material.materialType,
        subject.name,
        topicNames
      )
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
      questions++
    }

    // ---------- 6. lab experiments ----------
    if (material.materialType === 'LAB_MANUAL') {
      const expCount = await db.experiment.count({ where: { subjectId: subject.id } })
      if (expCount === 0) {
        const generatedExperiments = await generateLabExperiments(bankContext, subject.name)
        for (const e of generatedExperiments) {
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
          experiments++
        }
      }
    }

    // ---------- 7. PYQ frequency from real evidence ----------
    await updateTopicPyqFrequency(subject.id)

    // ---------- 8. regenerate the STUDENT's study plan ----------
    if (uploader?.role === 'STUDENT') {
      await generateStudyPlan(uploader.id).catch(() => undefined)
    }

    // ---------- 9. processed ----------
    await db.material.update({
      where: { id: material.id },
      data: {
        processingStatus: 'PROCESSED',
        analysisSummary: JSON.stringify({
          units,
          topics,
          questions,
          experiments,
          subjectName: subject.name,
          isNewSubject,
        }),
      },
    })
  } catch {
    await db.material
      .update({ where: { id: material.id }, data: { processingStatus: 'FAILED' } })
      .catch(() => undefined)
  }
}
