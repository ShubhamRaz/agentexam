/* ============================================================
   AgentExam file text extraction — SERVER ONLY.
   Extracts plain text from uploaded materials so the AI can
   analyse them (subjects/units/topics/questions generation).

   Supports: plain text, PDF (pdf-parse), DOCX (mammoth),
   images (via VLM — handled in ai.ts, this module returns a
   marker so the caller knows to use the VLM path).
   ============================================================ */
import fs from 'fs/promises'

export interface ExtractResult {
  text: string
  usedVlm: boolean // true when caller must run VLM on the raw image instead
  method: 'text' | 'pdf' | 'docx' | 'image' | 'none'
}

/** Light heuristic so tiny/garbled extractions don't starve the AI. */
function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function extractTextFromFile(
  filePath: string,
  mimeType: string,
  fileName: string
): Promise<ExtractResult> {
  const ext = (fileName.split('.').pop() || '').toLowerCase()

  // 1. Plain-text family
  if (
    mimeType.startsWith('text/') ||
    ['txt', 'md', 'csv', 'json'].includes(ext)
  ) {
    const raw = await fs.readFile(filePath, 'utf-8')
    return { text: cleanText(raw), usedVlm: false, method: 'text' }
  }

  // 2. Images — caller uses the VLM
  if (mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
    return { text: '', usedVlm: true, method: 'image' }
  }

  // 3. PDF (pdf-parse v2 class API)
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    try {
      const { PDFParse } = await import('pdf-parse')
      const buf = new Uint8Array(await fs.readFile(filePath))
      const parser = new PDFParse({ data: buf })
      const out = await parser.getText()
      await parser.destroy()
      return { text: cleanText(out?.text || ''), usedVlm: false, method: 'pdf' }
    } catch {
      return { text: '', usedVlm: false, method: 'none' }
    }
  }

  // 4. DOCX
  if (
    mimeType.includes('wordprocessingml') ||
    ext === 'docx'
  ) {
    try {
      const mammoth = await import('mammoth')
      const buf = await fs.readFile(filePath)
      const out = await mammoth.extractRawText({ buffer: buf })
      return { text: cleanText(out.value || ''), usedVlm: false, method: 'docx' }
    } catch {
      return { text: '', usedVlm: false, method: 'none' }
    }
  }

  // 5. Legacy .doc and everything else — best effort utf-8 read
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const printable = cleanText(raw).replace(/[^\x20-\x7E\n]/g, '')
    if (printable.length > 120) {
      return { text: printable, usedVlm: false, method: 'text' }
    }
  } catch {
    /* fallthrough */
  }
  return { text: '', usedVlm: false, method: 'none' }
}
