/* ============================================================
   AgentExam file text extraction — SERVER ONLY.
   Extracts plain text from uploaded materials so the AI can
   analyse them (subjects/units/topics/questions generation).

   Supports: plain text, PDF, DOCX, images.
   PDFs are parsed with the poppler CLI (pdftotext) in a child
   process — importing pdf-parse through the Turbopack dev
   bundler silently fails, so we never rely on it in-process.
   Scanned PDFs (no text layer) fall back to pdftoppm page
   renders that the caller OCRs with the VLM.
   ============================================================ */
import fs from 'fs/promises'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileP = promisify(execFile)

export interface ExtractResult {
  text: string
  /** true when the caller must run the VLM over `vlmFiles` to obtain text */
  usedVlm: boolean
  /** image files to OCR (a single uploaded image, or rendered PDF pages) */
  vlmFiles: string[]
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

const MAX_VLM_PAGES = 4

/** pdftotext child call — immune to bundler shenanigans. */
async function pdfTextLayer(filePath: string): Promise<string> {
  try {
    const { stdout } = await execFileP('pdftotext', ['-enc', 'UTF-8', '-layout', filePath, '-'], {
      maxBuffer: 16 * 1024 * 1024,
      timeout: 30_000,
    })
    return cleanText(stdout)
  } catch {
    return ''
  }
}

/** Render the first pages of a (scanned) PDF to PNG for VLM OCR. */
async function renderPdfPages(filePath: string, baseDir: string): Promise<string[]> {
  const prefix = path.join(baseDir, `page-${Date.now()}-${Math.floor(Math.random() * 1e4)}`)
  try {
    await execFileP(
      'pdftoppm',
      ['-png', '-r', '110', '-f', '1', '-l', String(MAX_VLM_PAGES), filePath, prefix],
      { maxBuffer: 16 * 1024 * 1024, timeout: 60_000 }
    )
  } catch {
    return []
  }
  // pdftoppm names outputs <prefix>-1.png … <prefix>-04.png (page-count padded)
  const files: string[] = []
  for (let p = 1; p <= MAX_VLM_PAGES; p++) {
    for (const padded of [String(p), String(p).padStart(2, '0')]) {
      const candidate = `${prefix}-${padded}.png`
      try {
        await fs.access(candidate)
        files.push(candidate)
        break
      } catch {
        /* try next naming */
      }
    }
  }
  return files
}

/** mammoth in-process first; python3 zipfile+regex as a bundler-proof fallback. */
async function docxText(filePath: string): Promise<string> {
  try {
    const mammoth = await import('mammoth')
    const buf = await fs.readFile(filePath)
    const out = await mammoth.extractRawText({ buffer: buf })
    const text = cleanText(out.value || '')
    if (text.length > 0) return text
  } catch {
    /* fall through to python */
  }
  try {
    const { stdout } = await execFileP(
      'python3',
      [
        '-c',
        `import zipfile,re,sys
z=zipfile.ZipFile(sys.argv[1])
xml=z.read('word/document.xml').decode('utf-8','ignore')
xml=re.sub(r'<w:p[ >]','\\n<w:p',xml)
txt=re.sub(r'<[^>]+>','',xml)
sys.stdout.write(txt)`,
        filePath,
      ],
      { maxBuffer: 16 * 1024 * 1024, timeout: 30_000 }
    )
    return cleanText(stdout)
  } catch {
    return ''
  }
}

export async function extractTextFromFile(
  filePath: string,
  mimeType: string,
  fileName: string
): Promise<ExtractResult> {
  const ext = (fileName.split('.').pop() || '').toLowerCase()

  // 1. Plain-text family
  if (mimeType.startsWith('text/') || ['txt', 'md', 'csv', 'json'].includes(ext)) {
    try {
      const raw = await fs.readFile(filePath, 'utf-8')
      return { text: cleanText(raw), usedVlm: false, vlmFiles: [], method: 'text' }
    } catch {
      return { text: '', usedVlm: false, vlmFiles: [], method: 'none' }
    }
  }

  // 2. Images — caller OCRs with the VLM
  if (mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext)) {
    return { text: '', usedVlm: true, vlmFiles: [filePath], method: 'image' }
  }

  // 3. PDF — poppler text layer, then page renders for scanned papers
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    const text = await pdfTextLayer(filePath)
    if (text.length > 80) {
      return { text, usedVlm: false, vlmFiles: [], method: 'pdf' }
    }
    const pages = await renderPdfPages(filePath, path.dirname(filePath))
    if (pages.length > 0) {
      return { text: '', usedVlm: true, vlmFiles: pages, method: 'image' }
    }
    return { text, usedVlm: false, vlmFiles: [], method: 'pdf' }
  }

  // 4. DOCX
  if (mimeType.includes('wordprocessingml') || ext === 'docx') {
    const text = await docxText(filePath)
    return { text, usedVlm: false, vlmFiles: [], method: text ? 'docx' : 'none' }
  }

  // 5. Legacy .doc and everything else — best effort utf-8 read
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const printable = cleanText(raw).replace(/[^\x20-\x7E\n]/g, '')
    if (printable.length > 120) {
      return { text: printable, usedVlm: false, vlmFiles: [], method: 'text' }
    }
  } catch {
    /* fallthrough */
  }
  return { text: '', usedVlm: false, vlmFiles: [], method: 'none' }
}
