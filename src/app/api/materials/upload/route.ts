import { NextRequest } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'
import { isSubjectVisible, mapMaterial } from '@/app/api/lib/compute'
import { enqueueMaterialPipeline } from '@/app/api/lib/pipeline'
import type { Material } from '@/lib/types'

export const dynamic = 'force-dynamic'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const MATERIAL_TYPES = ['SYLLABUS', 'PYQ', 'NOTES', 'LAB_MANUAL']

/**
 * Stored OUTSIDE the Next.js watched project tree — writing uploads
 * into the project directory triggered dev-server rebuilds that
 * killed in-flight requests (the intermittent 502s).
 */
const MATERIAL_DIR =
  process.env.MATERIAL_STORAGE_DIR || '/home/z/agentexam-materials'

/**
 * POST /api/materials/upload — accepts the file and returns IMMEDIATELY.
 * The heavy AI pipeline (extract → detect subject → units/topics →
 * RAG question bank → study plan) runs in the background; the client
 * polls GET /api/materials and shows live status until PROCESSED.
 *
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

  // pre-validate a provided subject so the response can fail fast
  if (subjectIdProvided) {
    const existing = await db.subject.findUnique({ where: { id: subjectIdProvided } })
    if (!existing) {
      return Response.json({ error: 'Subject not found' }, { status: 404 })
    }
    if (!(await isSubjectVisible(user.id, existing.id))) {
      return Response.json({ error: 'Subject not available' }, { status: 403 })
    }
  }

  // ---------- persist the file (outside the watched project tree) ----------
  const safeName = upload.name || 'upload'
  const ext = (safeName.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)
  const storedName = `${randomUUID()}.${ext || 'bin'}`
  let savedPath: string
  try {
    await fs.mkdir(MATERIAL_DIR, { recursive: true })
    savedPath = path.join(MATERIAL_DIR, storedName)
    await fs.writeFile(savedPath, Buffer.from(await upload.arrayBuffer()))
  } catch {
    return Response.json({ error: 'Failed to store the uploaded file' }, { status: 500 })
  }

  // ---------- material row (PROCESSING) + background AI pipeline ----------
  const material = await db.material.create({
    data: {
      subjectId: subjectIdProvided || null,
      uploadedBy: user.id,
      materialType,
      title: safeName.replace(/\.[^.]+$/, '') || 'Untitled material',
      fileName: safeName,
      fileType: ext || 'bin',
      mimeType: upload.type || 'application/octet-stream',
      fileSize: upload.size,
      processingStatus: 'PROCESSING',
      filePath: savedPath,
    },
    include: { subject: true },
  })

  enqueueMaterialPipeline(material.id, { classroomId })

  const payload: { material: Material; pipeline: 'background' } = {
    material: mapMaterial(material, user.name),
    pipeline: 'background',
  }
  return Response.json(payload, { status: 201 })
}
