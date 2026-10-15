import { NextRequest } from 'next/server'
import fs from 'fs/promises'
import { db } from '@/lib/db'
import { getAuthUser, unauthorized } from '@/lib/auth'
import { enqueueMaterialPipeline, isMaterialProcessing } from '@/app/api/lib/pipeline'

export const dynamic = 'force-dynamic'

/**
 * POST /api/materials/[id]/reprocess — re-run the AI pipeline for a
 * material (FAILED / stale / user-requested refresh). Re-extracts the
 * text from the stored file, regenerates the question bank and study
 * plan. Allowed for the uploader, subject owner, or classroom faculty.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req)
  if (!user) return unauthorized()

  const { id } = await params
  const material = await db.material.findUnique({
    where: { id },
    include: { subject: { select: { id: true, ownerId: true, classroomId: true } } },
  })
  if (!material) {
    return Response.json({ error: 'Material not found' }, { status: 404 })
  }

  let allowed = material.uploadedBy === user.id
  if (!allowed && material.subject) {
    allowed = material.subject.ownerId === user.id
  }
  if (!allowed && material.subject?.classroomId) {
    const classroom = await db.classroom.findUnique({
      where: { id: material.subject.classroomId },
      select: { facultyId: true },
    })
    allowed = classroom?.facultyId === user.id
  }
  if (!allowed) {
    return Response.json({ error: 'Not allowed to re-process this material' }, { status: 403 })
  }

  if (!material.filePath || !(await fileExists(material.filePath))) {
    return Response.json(
      { error: 'The original file is no longer available — please re-upload it' },
      { status: 400 }
    )
  }

  if (isMaterialProcessing(material.id)) {
    return Response.json({ ok: true, alreadyProcessing: true })
  }

  // reset and re-enqueue (subject is preserved when already assigned)
  await db.material.update({
    where: { id: material.id },
    data: {
      processingStatus: 'PROCESSING',
      extractedText: null,
      analysisSummary: null,
    },
  })
  enqueueMaterialPipeline(material.id, {})

  return Response.json({ ok: true, queued: true })
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}
