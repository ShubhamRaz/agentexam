/**
 * AgentExam — IEEE-format research paper generator (docx).
 *
 * Produces a two-column IEEE conference-style paper:
 *   - US-letter-like A4 page, ~0.67 in side margins, 0.25 in column gap
 *   - Times New Roman 10 pt body, single spacing, justified
 *   - Title block spans both columns (single-column section + CONTINUOUS section)
 *   - SMALL-CAPS centered primary headings, italic lettered subheadings
 *   - 8 pt figure/table captions, 9 pt bold abstract and references
 *   - Three-line (booktabs-style) IEEE tables
 *
 * Run: bun generate_paper.js
 */
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, Header, Footer, PageNumber, AlignmentType, HeadingLevel,
  WidthType, BorderStyle, ShadingType, SectionType, LevelFormat,
  LineRuleType, VerticalAlign,
} = require("docx");
const fs = require("fs");
const path = require("path");

const HERE = __dirname;
const FIG = path.join(HERE, "figures");
const MANIFEST = JSON.parse(fs.readFileSync(path.join(FIG, "manifest.json"), "utf8"));
const OUTPUT = path.join(HERE, "AgentExam_Research_Paper_IEEE.docx");

// ---------------------------------------------------------------------------
// Constants — IEEE typography
// ---------------------------------------------------------------------------
const TNR = { ascii: "Times New Roman", hAnsi: "Times New Roman", eastAsia: "Times New Roman" };
const BLACK = "000000";
const PAGE = {
  size: { width: 11906, height: 16838 }, // A4
  margin: { top: 1080, bottom: 1080, left: 965, right: 965, header: 620, footer: 620 },
};
const COL_WIDTH_PX = 312; // ~3.25 in display width inside a 3.34 in column

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function safeText(v, ph) {
  if (v === undefined || v === null || v === "" || String(v) === "NaN" || String(v) === "undefined") {
    return ph || "N/A";
  }
  return String(v);
}

/** Inline run builder: supports *italic* markup segments. */
function runsFromMarkup(text, base = {}) {
  const out = [];
  const tokens = String(text).split("*");
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].length === 0) continue;
    out.push(new TextRun({
      text: tokens[i],
      font: TNR,
      size: base.size !== undefined ? base.size : 20,
      bold: base.bold || false,
      italics: i % 2 === 1 ? true : (base.italics || false),
      color: BLACK,
      smallCaps: base.smallCaps || false,
      superScript: base.superScript || false,
    }));
  }
  return out;
}

/** IEEE body paragraph: justified, 0.25 in first-line indent, single spaced. */
function body(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: opts.noindent ? undefined : { firstLine: 360 },
    spacing: { line: 240, before: opts.before || 0, after: opts.after || 0 },
    keepNext: opts.keepNext || false,
    children: runsFromMarkup(text, { size: opts.size || 20, bold: opts.bold || false }),
  });
}

/** Primary heading: "I. Introduction" — centered SMALL CAPS, 10 pt. */
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    keepNext: true,
    spacing: { before: 220, after: 110, line: 240 },
    children: [new TextRun({ text, smallCaps: true, size: 20, font: TNR, color: BLACK })],
  });
}

/** Subheading: "A. Text" — italic, flush left, 10 pt. */
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    alignment: AlignmentType.LEFT,
    keepNext: true,
    spacing: { before: 170, after: 80, line: 240 },
    children: [new TextRun({ text, italics: true, size: 20, font: TNR, color: BLACK })],
  });
}

/** Figure: centered image (keepNext) + 8 pt caption below. */
function figure(fileName, num, caption) {
  const dims = MANIFEST[fileName];
  const w = COL_WIDTH_PX;
  const h = Math.round((dims.h / dims.w) * w);
  const buf = fs.readFileSync(path.join(FIG, fileName));
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      keepNext: true,
      spacing: { before: 140, after: 40, line: 240 },
      children: [new ImageRun({ data: buf, transformation: { width: w, height: h }, type: "png" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160, line: 240 },
      children: runsFromMarkup(`Fig. ${num}. ${caption}`, { size: 16 }),
    }),
  ];
}

/** Numbered display equation: borderless 2-cell table [equation | "(n)"]. */
function equation(fileName, num) {
  const dims = MANIFEST[fileName];
  const w = 285;
  const h = Math.round((dims.h / dims.w) * w);
  const buf = fs.readFileSync(path.join(FIG, fileName));
  const noBorders = {
    top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
    insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
  };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 90, type: WidthType.PERCENTAGE },
            borders: noBorders,
            margins: { top: 40, bottom: 40, left: 40, right: 40 },
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 100, after: 100, line: 240 },
              children: [new ImageRun({ data: buf, transformation: { width: w, height: h }, type: "png" })],
            })],
          }),
          new TableCell({
            width: { size: 10, type: WidthType.PERCENTAGE },
            borders: noBorders,
            margins: { top: 40, bottom: 40, left: 40, right: 40 },
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { line: 240 },
              children: [new TextRun({ text: `(${num})`, size: 20, font: TNR, color: BLACK })],
            })],
          }),
        ],
      }),
    ],
  });
}

const noBorder = { style: BorderStyle.NONE };

/** IEEE three-line table: "TABLE N" + small-caps caption above, rules only. */
function ieeeTable(roman, caption, headers, rows, colPct, aligns) {
  const cellMargins = { top: 30, bottom: 30, left: 80, right: 80 };
  const headerCells = headers.map((t, i) => new TableCell({
    width: { size: colPct[i], type: WidthType.PERCENTAGE },
    margins: cellMargins,
    borders: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BLACK } },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 240 },
      children: [new TextRun({ text: t, smallCaps: true, size: 16, font: TNR, color: BLACK })],
    })],
  }));
  const dataRows = rows.map((r) => new TableRow({
    cantSplit: true,
    children: r.map((t, i) => new TableCell({
      width: { size: colPct[i], type: WidthType.PERCENTAGE },
      margins: cellMargins,
      children: [new Paragraph({
        alignment: (aligns && aligns[i]) === "c" ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { line: 240 },
        children: [new TextRun({ text: safeText(t), size: 16, font: TNR, color: BLACK })],
      })],
    })),
  }));
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      keepNext: true,
      spacing: { before: 160, after: 20, line: 240 },
      children: [new TextRun({ text: `TABLE ${roman}`, smallCaps: true, size: 16, font: TNR, color: BLACK })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      keepNext: true,
      spacing: { after: 60, line: 240 },
      children: [new TextRun({ text: safeText(caption).toUpperCase(), smallCaps: true, size: 16, font: TNR, color: BLACK })],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 8, color: BLACK },
        bottom: { style: BorderStyle.SINGLE, size: 8, color: BLACK },
        left: noBorder, right: noBorder,
        insideHorizontal: noBorder, insideVertical: noBorder,
      },
      rows: [new TableRow({ tableHeader: true, cantSplit: true, children: headerCells }), ...dataRows],
    }),
    new Paragraph({ spacing: { after: 120, line: 240 }, children: [] }),
  ];
}

/** Reference entry: 9 pt, hanging indent, justified. */
function ref(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: 360, hanging: 360 },
    spacing: { line: 240, after: 40 },
    children: runsFromMarkup(text, { size: 18 }),
  });
}

/** Numbered contribution item. */
function contrib(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    numbering: { reference: "contrib", level: 0 },
    spacing: { line: 240, after: 20 },
    children: runsFromMarkup(text, { size: 20 }),
  });
}

function makeFooter() {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: 240 },
      children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, font: TNR, color: BLACK })],
    })],
  });
}

// ---------------------------------------------------------------------------
// Title block (spans both columns — first, single-column section)
// ---------------------------------------------------------------------------
const titleBlock = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 260, line: 560, lineRule: LineRuleType.AT_LEAST },
    children: [
      new TextRun({
        text: "AgentExam: An Upload-Driven Retrieval-Augmented AI Agent for Adaptive Examination Preparation",
        size: 48, font: TNR, color: BLACK,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60, line: 260 },
    children: [
      new TextRun({ text: "First A. Author", size: 22, font: TNR, color: BLACK }),
      new TextRun({ text: "1", size: 22, font: TNR, color: BLACK, superScript: true }),
      new TextRun({ text: ", Second B. Author", size: 22, font: TNR, color: BLACK }),
      new TextRun({ text: "2", size: 22, font: TNR, color: BLACK, superScript: true }),
      new TextRun({ text: ", and Third C. Author", size: 22, font: TNR, color: BLACK }),
      new TextRun({ text: "1", size: 22, font: TNR, color: BLACK, superScript: true }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 20, line: 240 },
    children: [
      new TextRun({ text: "1", size: 20, font: TNR, color: BLACK, superScript: true }),
      new TextRun({ text: "Department of Computer Science and Engineering, Institute Name, City, Country", size: 20, font: TNR, color: BLACK }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 20, line: 240 },
    children: [
      new TextRun({ text: "2", size: 20, font: TNR, color: BLACK, superScript: true }),
      new TextRun({ text: "Department of Information Technology, Institute Name, City, Country", size: 20, font: TNR, color: BLACK }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120, line: 240 },
    children: [
      new TextRun({
        text: "Corresponding authors: author1@institute.edu, author2@institute.edu, author3@institute.edu",
        size: 18, italics: true, font: TNR, color: BLACK,
      }),
    ],
  }),
];

// ---------------------------------------------------------------------------
// Paper body (second, continuous two-column section)
// ---------------------------------------------------------------------------
const c = [];

// ----- Abstract + index terms (bold, 9 pt) -----
c.push(new Paragraph({
  alignment: AlignmentType.JUSTIFIED,
  spacing: { line: 240, after: 120 },
  children: [
    new TextRun({ text: "Abstract\u2014", bold: true, italics: true, size: 18, font: TNR, color: BLACK }),
    new TextRun({
      text: "Students preparing for university examinations routinely assemble heterogeneous study material\u2014syllabi, lecture notes, previous-year question (PYQ) papers, and laboratory manuals\u2014yet most digital learning platforms presuppose a fixed curriculum and offer little beyond static question banks. We present AgentExam, a full-stack web application that inverts this assumption: the system ships with no predefined subjects and derives the entire learning experience from the material a learner or instructor uploads. An asynchronous ingestion pipeline extracts text from PDF, DOCX, plain-text, and image files, employs a large language model (LLM) to detect the subject and reconstruct its curriculum as units and weighted topics, and organizes every artifact category-wise (syllabus, notes, PYQs, lab manuals) under each subject. A retrieval-augmented generation (RAG) layer chunks all extracted text and applies BM25 lexical retrieval with source- and recency-aware boosting, so that question banks, mock examinations, viva sessions, laboratory reviews, topic-importance analysis, and seven-day study plans are generated from evidence retrieved from the learner's own corpus. A faculty mode extends the platform with classroom management, shared material libraries, assigned tests, and per-student progress analytics. We report measured behavior of the deployed system: sub-second upload acknowledgment, 20\u201325 s background analysis per document, verbatim extraction of 35 previous-year questions from authentic university papers, and weak-topic detection that surfaced eight actionable deficit areas. AgentExam demonstrates that a corpus-grounded, upload-driven agent can deliver adaptive assessment without any predefined curriculum.",
      bold: true, size: 18, font: TNR, color: BLACK,
    }),
  ],
}));
c.push(new Paragraph({
  alignment: AlignmentType.JUSTIFIED,
  spacing: { line: 240, after: 200 },
  children: [
    new TextRun({ text: "Index Terms\u2014", bold: true, italics: true, size: 18, font: TNR, color: BLACK }),
    new TextRun({
      text: "Adaptive assessment, artificial intelligence in education, BM25 retrieval, examination preparation, large language models, previous-year question analysis, question generation, retrieval-augmented generation.",
      bold: true, size: 18, font: TNR, color: BLACK,
    }),
  ],
}));

// ----- I. Introduction -----
c.push(h1("I. Introduction"));
c.push(body(
  "Preparation for university examinations is, in practice, a material-centric activity. A syllabus defines the scope of a course; lecture notes and textbooks supply depth; previous-year question (PYQ) papers reveal the priorities of past examiners; and laboratory manuals define the practical component. A student enrolled in five or six courses in a semester manages dozens of such files across formats\u2014PDF syllabi, word-processed notes, scanned question papers, and photographed handouts\u2014usually scattered across folders and messaging applications."
));
c.push(body(
  "Existing digital learning platforms rarely match this reality. Most presuppose a fixed catalog of subjects and serve static question banks that are disconnected from the particular institution's syllabus, the instructor's emphasis, or the learner's own material. PYQ analysis, where it matters most, is performed by hand: students skim old papers, guess which topics recur, and annotate their notes accordingly. Formative feedback is delayed until graded examinations are returned. On the other side of the classroom, faculty who assign practice tests have limited tooling for sharing material with a cohort and even less for observing per-student progress."
));
c.push(body(
  "We present *AgentExam*, a full-stack web application that inverts the fixed-curriculum assumption. The system initializes with an empty account: no subjects, no material, no question bank. When a user uploads a document\u2014of virtually any study-oriented format\u2014an asynchronous pipeline extracts its text, an LLM detects the subject and reconstructs its curriculum as units and topics annotated with importance, PYQ frequency, and weightage, and a retrieval-augmented generation (RAG) layer builds a question bank grounded in the uploaded corpus. Every subsequent capability\u2014mock examinations, viva practice, laboratory reviews, PYQ analytics, weak-topic detection, and a seven-day study plan\u2014is derived from and referenced against that corpus. A faculty mode adds classrooms, shared material libraries, assigned tests, and per-student analytics."
));
c.push(body("The contributions of this work are as follows:", { keepNext: true }));
c.push(contrib("An upload-driven architecture in which no subject, unit, or topic exists until a learner or instructor uploads material; the curriculum is reconstructed by an LLM from the artifacts themselves."));
c.push(contrib("A resilient, asynchronous ingestion pipeline\u2014multi-format text extraction including vision-model OCR for scanned PDFs, bounded-concurrency background queueing, and retry with exponential backoff\u2014that acknowledges uploads in approximately 0.3 s and completes analysis in 20\u201325 s."));
c.push(contrib("Category-wise material organization: every upload is classified as syllabus, notes, PYQ paper, or lab manual, and the interface groups artifacts by subject and category so that five or six concurrent subjects remain navigable."));
c.push(contrib("A RAG layer that chunks the full extracted corpus per subject and applies BM25 lexical retrieval with source- and recency-aware boosts, grounding question banks, PYQ analytics, viva questions, laboratory reviews, and study plans in retrieved evidence."));
c.push(contrib("Weak-topic detection with calibrated status thresholds and AI-first seven-day study planning that accounts for topic weightage, PYQ frequency, detected deficits, and the learner's target examination date."));
c.push(contrib("A faculty workflow covering classroom creation with join codes, student provisioning, shared uploads, test conduction with per-student result grouping, and cohort analytics, together with a deployment evaluation reporting measured behavior on authentic university material."));
c.push(body(
  "The remainder of this paper is organized as follows. Section II reviews related work. Section III describes the system architecture and data model. Section IV details the upload-driven material processing pipeline, and Section V the retrieval-augmented generation layer. Section VI presents the adaptive assessment and analytics capabilities. Sections VII and VIII describe the implementation and its evaluation, Section IX discusses limitations, and Section X concludes."
));

// ----- II. Related Work -----
c.push(h1("II. Related Work"));
c.push(body(
  "*Intelligent tutoring systems.* Tutoring systems have long sought to close the feedback loop that classroom instruction leaves open. VanLehn [5] characterized tutoring systems by the granularity of their decision loops and found that the effectiveness of a tutor depends less on its surface sophistication than on the quality and timing of its feedback. Formative assessment research reaches a compatible conclusion: Black and Wiliam [8] showed that frequent, specific feedback is among the strongest levers on learning outcomes. AgentExam adopts this principle operationally\u2014every mock examination, viva answer, and laboratory submission is evaluated immediately with per-question feedback\u2014while replacing hand-authored content with corpus-derived content."
));
c.push(body(
  "*Automatic question generation.* Kurdi et al. [6] surveyed automatic question generation for education and identified template- and rule-based methods as the historical mainstream, with semantic correctness and pedagogical alignment as persistent open problems. Recent instruction-tuned LLMs [3], [4] have made free-form generation fluent, but fluency does not guarantee fidelity to a course. Our approach addresses fidelity structurally: generation is conditioned on retrieved chunks of the learner's own material, and a validation stage rejects or regenerates malformed banks rather than persisting them."
));
c.push(body(
  "*Large language models in education.* Kasneci et al. [9] catalogued both the opportunities and the risks of deploying LLMs in educational settings, with hallucination and over-reliance as principal hazards. Chain-of-thought prompting [11] and structured output constraints mitigate but do not eliminate these risks. AgentExam therefore treats the LLM as a fallible component: every generative path has a deterministic fallback, extraction quality is measured rather than assumed, and faculty can review and re-analyze any artifact."
));
c.push(body(
  "*Retrieval-augmented generation.* Lewis et al. [1] demonstrated that interleaving retrieval with generation substantially improves factual grounding for knowledge-intensive tasks. Retrieval itself spans classical lexical scoring\u2014BM25 and its descendants [2]\u2014and dense embedding-based passage retrieval [12]. AgentExam uses BM25 over chunked course material: the corpora are small (thousands of chunks, not millions of passages), determinism and auditability are valuable in an assessment context, and the lexical index requires no additional model infrastructure. Retrieval scores are additionally biased toward authoritative sources (syllabus) and recent uploads, a policy akin to document priors in probabilistic relevance frameworks [2]."
));
c.push(body(
  "*Adaptive scheduling.* Spaced-repetition schedulers, such as the trainable model deployed at scale by Settles and Meeder [7], demonstrate that timing practice to learner state improves retention. AgentExam's seven-day study planner is a lightweight instantiation of the same idea: task selection is driven by topic weightage, PYQ frequency, and detected weaknesses rather than a fixed rotation."
));
c.push(body(
  "In combination, prior work supplies the components\u2014grounded generation, immediate feedback, adaptive scheduling\u2014but not the integrated loop in which the learner's own uploaded corpus is the single source of truth for curriculum structure, question content, and analytics. Closing that loop, and reporting the engineering behavior of doing so on authentic material, is the subject of this paper."
));

// ----- III. System Overview and Architecture -----
c.push(h1("III. System Overview and Architecture"));
c.push(h2("A. Architectural Overview"));
c.push(body(
  "AgentExam is organized into four layers (Fig. 1). The *presentation layer* is a single-page web client that switches among fourteen role-aware views (onboarding dashboard, materials, syllabus analysis, PYQ analysis, theory examinations, viva, practical, performance, readiness, study plan, profile, faculty dashboard, classroom detail, and authentication views) without page reloads. The *application layer* exposes 27 REST endpoints as server-side route handlers, each guarded by bearer-token authentication and role checks. The *intelligence layer* hosts the hosted LLM and vision-language services accessed through a server-side SDK, the RAG engine, and an in-process job queue that bounds pipeline concurrency. The *data layer* comprises an ORM-mapped relational database and an external document store for uploaded files."
));
c.push(...figure("fig1_architecture.png", 1,
  "Layered architecture of AgentExam. The intelligence layer hosts the LLM and vision-language services, the retrieval-augmented generation engine, and the bounded-concurrency job queue."));
c.push(body(
  "Two cross-cutting interactions merit note. First, all authenticated requests carry a JSON Web Token; the application layer resolves the user on every request and enforces subject-level visibility before any data is returned. Second, because material analysis is asynchronous, the client polls a status endpoint at three-second intervals while any material is in a processing state, and transitions in the polled state drive user-facing notifications."
));
c.push(h2("B. Data Model"));
c.push(body(
  "The relational schema centers on the curriculum hierarchy *Subject \u2192 Unit \u2192 Topic*, where each topic carries an importance rating, a PYQ-frequency estimate, and an examination weightage. Uploaded material is modeled as a first-class entity with a category type, a processing status, extracted text, a persistent file path, and a machine-readable analysis summary. Questions carry a type (multiple choice, short answer, long answer, viva, or PYQ), options with correctness flags, a reference answer and explanation, marks, difficulty, topic linkage, and\u2014for PYQ items\u2014the examination year. Examination sessions, per-question answers, and evaluation results complete the assessment loop, while laboratory experiments, study plans, classrooms, and enrollments cover the remaining workflows. Table I summarizes the entities."
));
c.push(...ieeeTable("I", "Core entities of the AgentExam data model",
  ["Entity", "Purpose"],
  [
    ["User", "Account with STUDENT or FACULTY role and target examination date"],
    ["Subject", "Course detected from uploads; scoped to its owner or a classroom"],
    ["Unit / Topic", "Curriculum hierarchy; topics carry importance, PYQ frequency, weightage"],
    ["Material", "Uploaded document: category, status, extracted text, analysis summary"],
    ["Question", "Bank item (MCQ / short / long / viva / PYQ) with marks, difficulty, topic, year"],
    ["MockTest", "Examination session: self-practice or faculty-assigned, with due date"],
    ["Answer / Result", "Per-question responses and AI evaluations with feedback"],
    ["Experiment", "Laboratory exercise generated from lab manuals"],
    ["StudyPlan", "Seven-day adaptive schedule of study tasks"],
    ["Classroom / ClassroomStudent", "Faculty-managed cohort and student enrollments"],
  ],
  [24, 76]));
c.push(h2("C. Authentication, Roles, and Visibility"));
c.push(body(
  "Accounts authenticate with e-mail and password credentials; passwords are hashed with scrypt and sessions are issued as HS256 JSON Web Tokens valid for seven days. Roles are STUDENT and FACULTY. Subject visibility follows a single rule implemented as a shared guard: a student sees the subjects they created *or* the subjects shared into classrooms they are enrolled in, and a faculty member sees the subjects they own. Every subject-scoped endpoint\u2014unit listing, question bank access, examination start, viva, practical, and material operations\u2014resolves visibility before reading data and returns an authorization error otherwise. Material re-analysis and deletion are further restricted to the uploader, the subject owner, or the classroom's faculty, so that shared classroom material cannot be modified by enrolled students. Uploads are limited to 10 MB per file."
));

// ----- IV. Upload-Driven Material Processing -----
c.push(h1("IV. Upload-Driven Material Processing"));
c.push(h2("A. Multi-Format Text Extraction"));
c.push(body(
  "The pipeline begins with format-aware text extraction. Plain-text and Markdown-like files are read directly. PDFs are extracted with the Poppler *pdftotext* utility invoked as a child process; DOCX files are converted with a Mammoth-based extractor with a Zip-archive fallback. Image files\u2014and PDFs that yield no text layer, which indicates scanned pages\u2014are rendered to page images with *pdftoppm* and transcribed by a vision-language model acting as an OCR engine, an approach complementary to classical OCR pipelines [10]."
));
c.push(body(
  "The child-process choice for PDF extraction is deliberate. An earlier design used a JavaScript PDF parser imported dynamically inside the server runtime; under the application bundler, the dynamic import failed silently and every real PDF was ingested with empty extracted text\u2014a defect that surfaced later as ungrounded questions and an empty PYQ analysis. Invoking the Poppler binary through a child process is immune to bundler transformation and restored extraction of 3,558 characters from the same scanned university paper that previously yielded zero. Extraction failures are contained: any exception returns a structured no-text result rather than aborting the pipeline, and the material is flagged for re-analysis."
));
c.push(h2("B. Subject Detection and Curriculum Structuring"));
c.push(body(
  "Extracted text is submitted to an LLM prompted to return a structured analysis: the subject name and code, its units, and for each topic an importance rating, a PYQ-frequency estimate, and an examination weightage. When the user selected an existing subject at upload time, the analysis augments that subject; otherwise the system reuses an existing subject whose name matches case-insensitively (preferring, for faculty uploads, a subject already shared into the selected classroom) or creates a new one with a collision-free course code. Structure merging is protective: units and topics are matched by name so that re-uploads and overlapping material never duplicate curriculum entries. If the LLM analysis fails or returns malformed output, a deterministic heuristic derives a placeholder structure from document headings so that the upload remains usable and can be re-analyzed later."
));
c.push(h2("C. Category-Wise Organization"));
c.push(body(
  "Every upload is classified into one of four material categories\u2014SYLLABUS, NOTES, PYQ (previous-year papers), or LAB_MANUAL\u2014explicitly selectable at upload time. The material library renders one group per subject with fixed-order category sections inside each group, so a student managing five or six subjects sees each subject's syllabus, notes, PYQ papers, and lab manuals as separate shelves rather than a flat chronology. Uploads whose subject is still being detected in the background appear in a transitory \u201cdetecting subject\u201d group until the pipeline assigns one. Materials carry status badges (processing, analyzed, failed), and failed materials expose a re-analysis action; deletion is confirmation-guarded. This organization directly addresses the multi-subject usability failure observed when a flat list mixed 30 files across six subjects."
));
c.push(h2("D. Asynchronous Execution Model"));
c.push(body(
  "Material analysis involves multiple LLM calls and typically requires 20\u201360 s of server work. An initial synchronous design\u2014running the whole pipeline inside the upload request\u2014proved fragile in three observed ways: gateway timeouts surfaced as intermittent HTTP 502 failures when a pipeline exceeded the proxy window; uploads written inside the development server's watched file tree triggered mid-request application rebuilds; and bursts of LLM calls occasionally exceeded provider rate limits. The reworked execution model (Fig. 2) decouples ingestion from analysis entirely."
));
c.push(...figure("fig2_pipeline.png", 2,
  "Asynchronous upload-driven processing pipeline. The upload is acknowledged immediately; analysis proceeds in the background with bounded concurrency and retry with backoff."));
c.push(body(
  "The upload endpoint validates the file, persists it to a document store *outside* the watched application tree, creates a database row in a PROCESSING state, enqueues a background job, and returns HTTP 201 with the accepted material in approximately 0.3 s. A fire-and-forget in-process queue executes pipelines with a maximum concurrency of two, serializing LLM load while keeping latency bounded. LLM calls retry up to three times with 2 s and 5 s backoff on rate-limit or transient errors. Materials still in PROCESSING after ten minutes are presented as failed with a one-click re-analysis action, and the client's three-second status polling detects both completion and failure, translating state transitions into notifications that report the generated unit, topic, and question counts. On the client, multi-file drops are uploaded sequentially\u2014one request completing before the next begins\u2014which further reduces concurrent LLM pressure."
));

// ----- V. Retrieval-Augmented Generation -----
c.push(h1("V. Retrieval-Augmented Generation"));
c.push(h2("A. Corpus Construction and Chunking"));
c.push(body(
  "Once a material reaches the analyzed state, its extracted text joins the subject corpus. The corpus is rebuilt over *every* processed material of the subject\u2014irrespective of category\u2014so that syllabus statements, note passages, PYQ questions, and lab-manual procedures all participate in retrieval. Text is chunked at 900 characters with a 120-character overlap, a granularity that keeps syllabus statements and individual PYQ questions intact while producing enough chunks for meaningful term statistics."
));
c.push(...figure("fig3_rag.png", 3,
  "Retrieval-augmented generation flow. Evidence retrieved from every processed material grounds all generative artifacts."));
c.push(h2("B. Lexical Retrieval"));
c.push(body(
  "Retrieval scores candidate chunks with Okapi BM25 [2]. Chunks are tokenized with stop-word removal; query terms are drawn from the generation target (topic name and question-type mix). The score of a document D against query Q is"
));
c.push(equation("eq_bm25.png", 1));
c.push(body(
  "where f(q_i, D) is the term frequency of query term q_i, |D| the chunk length, avgdl the mean chunk length, and k1 and b the standard length-normalization parameters. Two multiplicative priors bias selection: chunks originating from SYLLABUS-category material receive a 1.15 boost, reflecting their authority over informal notes, and chunks from recently processed material receive a time-decayed boost up to 2.5, so that fresh uploads shape generation while stale content remains available. Lexical retrieval was chosen over dense embeddings [12] deliberately: course corpora are small, per-subject, and volatile (every upload changes them); BM25 is deterministic, auditable\u2014each generated question can be traced to the chunks that produced it\u2014and requires no embedding infrastructure or model-versioning concerns, at the cost of weaker semantic matching across paraphrase, a limitation revisited in Section IX."
));
c.push(h2("C. Context-Grounded Generation"));
c.push(body(
  "Before any generative call, a subject-context builder assembles the highest-scored chunks, together with the subject's curriculum skeleton and topic metadata, into the prompt context. Question-bank generation then requests a specified count of items spanning multiple-choice, short-answer, long-answer, and viva types, each with options and correctness flags where applicable, a reference answer, an explanation, marks, difficulty, topic linkage, and\u2014when evidence identifies it\u2014an examination year. Outputs are parsed and validated: banks that fail schema validation, or that degrade to the deterministic template fallback, are retried once with a repaired prompt before the fallback is persisted and flagged. Laboratory manuals additionally trigger experiment generation when the subject has none. The same context builder serves examination assembly, viva questioning, laboratory review, and study-plan generation, making retrieval the single funnel through which the corpus influences every downstream artifact."
));
c.push(h2("D. PYQ Extraction and Analysis"));
c.push(body(
  "Previous-year papers receive a dedicated extraction prompt: the model is instructed to reproduce the paper's actual questions verbatim, preserving marks, question type, and the examination year parsed from the paper header, and to label every item with source PYQ. A structured regex fallback scans the paper text for question-shaped lines\u2014numbered or lettered items carrying marks annotations\u2014and persists those verbatim, so that PYQ extraction remains grounded even when the LLM call fails; a PYQ upload that yields zero PYQ-tagged questions is itself treated as a pipeline failure and retried. After each ingestion, per-topic PYQ frequencies are recomputed from the persisted evidence\u2014the count of PYQ-tagged questions per topic\u2014and never lowered below syllabus-derived estimates. PYQ analytics views aggregate the extracted items into year-wise and topic-wise distributions that drive an importance ranking used by the study planner and surfaced to the learner."
));

// ----- VI. Adaptive Assessment and Analytics -----
c.push(h1("VI. Adaptive Assessment and Analytics"));
c.push(h2("A. Examination Engine"));
c.push(body(
  "The theory examination engine assembles a paper from the question bank under learner-selected parameters (question count, duration, and theory or mixed mode), presents multiple-choice and subjective questions with a countdown timer, an answer palette, and automatic draft saving, and supports resumption of in-progress sessions. Faculty-conducted tests reuse the same engine with a different origin: the faculty selects a subject and paper parameters, one shuffled selection of questions is drawn, and an examination row is created per enrolled student with an assigner, a title, and a due date. Students see assigned tests on their dashboard and examination view with due-date urgency indicators and start them directly; starting is idempotent so an interrupted session resumes rather than duplicating."
));
c.push(h2("B. AI Evaluation of Responses"));
c.push(body(
  "Multiple-choice items are scored objectively. Subjective answers, viva responses, and laboratory submissions are evaluated by LLM prompts that receive the question, the reference answer or rubric, and the learner's response, and return a numeric award with specific feedback and improvement suggestions. Each evaluation degrades gracefully: on provider rate limits or malformed output the system applies deterministic partial-credit rules (keyword overlap against the reference answer) so that a session always completes with a grade. In observed use, the evaluator returned zero awards with itemized feedback for placeholder answers, and a laboratory code submission was reviewed at 7/10 with concrete improvement suggestions\u2014behavior consistent with a rubric-following grader rather than a lenient one."
));
c.push(h2("C. Weak-Topic Detection"));
c.push(body(
  "Topic performance aggregates awards across all evaluated answers of a subject. The status thresholds are calibrated to err toward surfacing deficits: a topic with a mean score of 75% or above is strong; below 60% it is weak *regardless of attempt count*\u2014a zero after a single missed question is treated as a genuine deficit, an explicit correction of an earlier rule that marked every topic with fewer than three attempts as \u201cinsufficient data,\u201d which suppressed all weak-topic reporting for new users; scores between 60% and 74% are weak only when supported by three or more attempts, and otherwise remain insufficient. Each weak topic is reported with a recommendation grounded in the learner's actual library\u2014for example, directing the learner to re-read the two uploaded materials that cover the topic\u2014rather than a generic advisory."
));
c.push(h2("D. Study-Plan Generation"));
c.push(body(
  "Study planning is AI-first: an LLM composes a seven-day plan from the subject's hot topics (weightage multiplied by PYQ frequency), the learner's weak topics, and the target examination date, with a deterministic weightage-ordered template as fallback. A new plan archives the previous one, tasks are checkable and persisted day by day, and plans are regenerated automatically whenever the corpus changes materially\u2014a new subject appears, or a fresh upload extends an existing one\u2014so the schedule tracks the learner's actual material state."
));
c.push(h2("E. Faculty Classroom Workflow"));
c.push(body(
  "Faculty create classrooms and receive a six-character join code designed to avoid ambiguous characters. Students join by enrollment\u2014either self-provisioned or added by the faculty, in which case an account is found or created with a temporary password that the faculty communicates. Faculty upload material directly into a classroom, where it becomes visible to every enrolled student with attribution to the uploading faculty member. Conducted tests group per-student examination rows back into a single card showing completion state, per-student scores, and the cohort average; the roster view reports each student's completed-test count, average score, and last activity. A faculty dashboard aggregates classroom count, distinct students, owned subjects, materials, conducted tests, and a recent-activity feed."
));

// ----- VII. System Implementation -----
c.push(h1("VII. System Implementation"));
c.push(body(
  "AgentExam is implemented as a single TypeScript application on the Next.js App Router [13], with the web client and the API surface co-deployed in one process. The client is a single-page shell that switches views in place; the server exposes 27 REST endpoints implemented as route handlers with request-level authentication resolution. Persistence uses Prisma ORM [14] over SQLite with a schema of thirteen entities; uploaded files reside in a directory outside the application source tree to avoid development-server file watching. The LLM and vision-language services are accessed through a server-side SDK and are never exposed to the client. Table II summarizes the stack."
));
c.push(...ieeeTable("II", "Technology stack of the deployed system",
  ["Layer", "Technology"],
  [
    ["Presentation", "React 19 with Next.js App Router; Tailwind CSS; shadcn/ui component system"],
    ["Application", "27 REST route handlers; JWT authentication (HS256); scrypt password hashing"],
    ["Intelligence", "Hosted LLM and vision-language service via server-side SDK; BM25 retrieval engine"],
    ["Extraction", "Poppler pdftotext and pdftoppm; Mammoth (DOCX); VLM OCR for scanned pages"],
    ["Data", "Prisma ORM over SQLite (13 entities); document store outside the build tree"],
    ["Concurrency", "In-process job queue, maximum 2 concurrent pipelines, retry with backoff"],
  ],
  [22, 78]));
c.push(body(
  "The deployment target is a single server process; the job queue is intentionally in-process, sized for individual learners and single-classroom cohorts rather than institutional scale. All AI integrations follow a common pattern\u2014typed prompt construction, structured-output validation, bounded retries, and deterministic fallbacks\u2014which concentrates failure handling in one place and keeps the system operational through provider outages."
));

// ----- VIII. Evaluation -----
c.push(h1("VIII. Evaluation"));
c.push(h2("A. Methodology"));
c.push(body(
  "The evaluation reports measured behavior of the deployed system rather than an offline benchmark. The live instance was exercised end-to-end through browser automation covering the full user journeys (registration, upload, examination, viva, practical, study plan, classroom administration) and through a REST harness for endpoint-level checks. A corpus of authentic material was used: a student user's real uploads, consisting of two Cloud Computing (course code CSE 021) papers and one Design and Analysis of Algorithms (CSE 356) paper, alongside seeded demonstration data for classroom workflows. All timings are wall-clock measurements from the running server."
));
c.push(h2("B. Pipeline Behavior"));
c.push(body(
  "The asynchronous design changes the latency profile materially. The upload endpoint acknowledges in approximately 0.3 s\u2014compared with 40\u201360 s for the earlier synchronous design, during which gateway timeouts produced intermittent 502 failures\u2014and background analysis completes in 20\u201325 s per document. Text extraction from the scanned CSE 021 PDF yields 3,558 characters where the bundled-parser defect had yielded zero. A complete first-session onboarding\u2014uploading a machine-learning syllabus as a new student\u2014produced a detected subject, five units, twenty topics, a fourteen-question bank, and a seven-day study plan without any manual configuration, and the dashboard transitioned from its onboarding state to the full analytics layout upon completion."
));
c.push(h2("C. Generation Quality"));
c.push(body(
  "Fig. 4 shows the composition of the generated question banks on the live system for the authentic corpus: Cloud Computing accumulated 56 questions of which 17 were PYQ-tagged, and Design and Analysis of Algorithms 32 questions of which 18 were PYQ-tagged; 35 distinct verbatim PYQ items in total were surfaced from the user's papers\u2014for example, \u201cRelate cloud computing and mobile computing\u201d and \u201cWhat are different asymptotic notations?\u201d\u2014each carrying year and marks metadata. PYQ analytics views rendered year-wise and topic-wise distributions from these items. Weak-topic detection, previously empty for this user, surfaced eight deficit topics with material-grounded recommendations, and the regenerated study plan referenced the learner's actual weak topics and uploaded materials."
));
c.push(...figure("fig4_results.png", 4,
  "Composition of the generated question banks on the live system (measured on the authentic corpus). PYQ-tagged items were extracted verbatim from the user's previous-year papers."));
c.push(h2("D. Defect Resolution"));
c.push(body(
  "Because the reported defects were reproduced, root-caused, and re-measured on the live system, they constitute an engineering evaluation in themselves. Table III maps each user-reported defect to its root cause, the resolution, and the measured outcome."
));
c.push(...ieeeTable("III", "User-reported defects, root causes, resolutions, and measured outcomes",
  ["Reported defect", "Root cause and resolution", "Measured outcome"],
  [
    ["Weak-topic detection returned empty results",
     "Status logic marked all topics with <3 attempts as insufficient; thresholds revised so scores below 60% are weak regardless of attempts",
     "8 weak topics surfaced with material-grounded recommendations"],
    ["Intermittent upload failures (HTTP 502)",
     "40\u201360 s synchronous pipeline, watcher-triggered rebuilds, provider rate limits; replaced by async queue, storage outside watched tree, retries with backoff",
     "0.3 s acknowledgment; 20\u201325 s background completion"],
    ["Materials across 5\u20136 subjects mixed together",
     "Flat, ungrouped material listing; replaced with subject groups and fixed-order category sections",
     "All subjects organized per category (syllabus / notes / PYQ / lab)"],
    ["PYQ analysis page empty",
     "Bundled PDF parser yielded no text and no PYQ-tagged questions; child-process extraction, verbatim extraction prompt, regex fallback",
     "35 verbatim PYQs extracted from authentic papers"],
    ["Generated content not grounded in uploads",
     "No retrieval context fed to generation; RAG layer introduced over every material with source and recency boosts",
     "17\u201318 PYQ-tagged questions per subject; plans cite real materials"],
  ],
  [24, 48, 28]));
c.push(h2("E. Classroom Workflow"));
c.push(body(
  "The faculty workflow was exercised with a three-student classroom sharing two subjects and five materials. A conducted unit test on Cloud Computing was completed by two of three students with scores of 81% and 54% (cohort average 67.5% on the test), aggregated correctly on the faculty dashboard alongside classroom, material, and activity statistics. Student-side, enrolled students saw classroom-sourced subjects and faculty-attributed material, and assigned tests appeared on their dashboards with due dates. Add-student provisioning, join-code creation, and per-student removal were verified through the interface."
));

// ----- IX. Discussion and Limitations -----
c.push(h1("IX. Discussion and Limitations"));
c.push(body(
  "*Retrieval.* BM25 grounds generation in exact term overlap; paraphrased evidence and synonym-heavy notes are under-retrieved. A hybrid of lexical and dense retrieval [12], with per-subject embedding caches invalidated on upload, is the natural extension; the auditability argument for pure lexical scoring weakens as corpora grow."
));
c.push(body(
  "*Evaluation validity.* LLM-assigned marks for subjective answers are convenient but not calibrated against human graders; the rubric prompt bounds but does not eliminate variance. The faculty review affordances\u2014per-question feedback inspection and result visibility\u2014are the current human-in-the-loop safeguard, and a graded-agreement study against multiple human markers remains future work."
));
c.push(body(
  "*Scale.* The in-process queue and SQLite storage are sized for individual learners and single classrooms. Institutional deployment would require a durable job queue, a relational server, and per-tenant storage isolation; nothing in the architecture precludes this, but it is untested."
));
c.push(body(
  "*Integrity and privacy.* The platform augments practice, not proctoring: unsupervised mock examinations certify nothing. Uploaded material may contain copyrighted course content; the deployment stores it server-side for the uploading account's use, and a production deployment should add retention policy and encryption at rest. Finally, generative content can still be subtly wrong even when grounded; the validation layer rejects malformed structure but not subtle factual error, which motivates keeping faculty review in the loop."
));

// ----- X. Conclusion and Future Work -----
c.push(h1("X. Conclusion and Future Work"));
c.push(body(
  "AgentExam demonstrates that a full adaptive-assessment loop can be bootstrapped from nothing but the learner's own material. The system reconstructs curriculum structure from uploads, organizes artifacts category-wise per subject, grounds every generative artifact in corpus retrieval, and closes the loop with AI-evaluated practice, weak-topic detection, and study planning\u2014while faculty operate classrooms with shared libraries, assigned tests, and per-student analytics over the same machinery. Measured behavior on authentic university material\u2014sub-second acknowledgment, 20\u201325 s analysis, 35 verbatim PYQ extractions, and eight surfaced deficit topics\u2014indicates that the approach is practical with current hosted LLMs."
));
c.push(body(
  "Future work proceeds on four axes: hybrid dense\u2013lexical retrieval with per-subject embedding caches; calibrated evaluation, comparing AI-assigned marks against multiple human graders and surfacing disagreement; spaced-repetition scheduling in the spirit of trainable practice models [7] to time reviews beyond the current seven-day horizon; and multilingual OCR and generation, extending the vision-model extraction path to non-English papers. A controlled study with a student cohort, measuring practice outcomes against a baseline platform, remains the decisive validation of the learning claims."
));

// ----- References -----
c.push(h1("References"));
c.push(ref("[1] P. Lewis, E. Perez, A. Piktus, F. Petroni, V. Karpukhin, N. Goyal, H. K\u00fcttler, M. Lewis, W.-t. Yih, T. Rockt\u00e4schel, S. Riedel, and D. Kiela, \u201cRetrieval-augmented generation for knowledge-intensive NLP tasks,\u201d in *Advances in Neural Information Processing Systems 33 (NeurIPS)*, 2020, pp. 9459\u20139474."));
c.push(ref("[2] S. Robertson and H. Zaragoza, \u201cThe probabilistic relevance framework: BM25 and beyond,\u201d *Foundations and Trends in Information Retrieval*, vol. 3, no. 4, pp. 333\u2013389, 2009."));
c.push(ref("[3] A. Vaswani, N. Shazeer, N. Parmar, J. Uszkoreit, L. Jones, A. N. Gomez, L. Kaiser, and I. Polosukhin, \u201cAttention is all you need,\u201d in *Advances in Neural Information Processing Systems 30 (NeurIPS)*, 2017, pp. 5998\u20136008."));
c.push(ref("[4] OpenAI, \u201cGPT-4 technical report,\u201d *arXiv preprint* arXiv:2303.08774, 2023."));
c.push(ref("[5] K. VanLehn, \u201cThe behavior of tutoring systems,\u201d *International Journal of Artificial Intelligence in Education*, vol. 16, no. 3, pp. 227\u2013265, 2006."));
c.push(ref("[6] P. Kurdi, J. Leo, B. Parsia, U. Sattler, and S. Al-Emari, \u201cA systematic review of automatic question generation for educational purposes,\u201d *International Journal of Artificial Intelligence in Education*, vol. 30, no. 1, pp. 121\u2013204, 2020."));
c.push(ref("[7] B. Settles and B. Meeder, \u201cA trainable spaced repetition model for language learning,\u201d in *Proc. 54th Annu. Meeting of the Association for Computational Linguistics (ACL)*, Berlin, Germany, 2016, pp. 1848\u20131858."));
c.push(ref("[8] P. Black and D. Wiliam, \u201cAssessment and classroom learning,\u201d *Assessment in Education: Principles, Policy & Practice*, vol. 5, no. 1, pp. 7\u201374, 1998."));
c.push(ref("[9] E. Kasneci, K. Seidel, S. K\u00e4mmel, M. Gro\u00df, D. Leisenberg, D. B\u00f6hler, C. H\u00e4u\u00dfer, A. B\u00e4r, E. Fischer, P. H\u00e4ring, and C. Gress, \u201cChatGPT for good? On opportunities and challenges of large language models for education,\u201d *Learning and Individual Differences*, vol. 103, art. 102274, 2023."));
c.push(ref("[10] R. Smith, \u201cAn overview of the Tesseract OCR engine,\u201d in *Proc. Ninth Int. Conf. on Document Analysis and Recognition (ICDAR)*, Curitiba, Brazil, 2007, pp. 629\u2013633."));
c.push(ref("[11] J. Wei, X. Wang, D. Schuurmans, M. Bosma, B. Ichter, F. Xia, E. Chi, Q. V. Le, and D. Zhou, \u201cChain-of-thought prompting elicits reasoning in large language models,\u201d in *Advances in Neural Information Processing Systems 35 (NeurIPS)*, 2022, pp. 24824\u201324837."));
c.push(ref("[12] V. Karpukhin, B. O\u011fuz, S. Min, P. Lewis, L. Wu, S. Edunov, D. Chen, and W.-t. Yih, \u201cDense passage retrieval for open-domain question answering,\u201d in *Proc. Conf. on Empirical Methods in Natural Language Processing (EMNLP)*, 2020, pp. 6769\u20136781."));
c.push(ref("[13] Vercel Inc., \u201cNext.js: The React framework,\u201d 2026. [Online]. Available: https://nextjs.org"));
c.push(ref("[14] Prisma, \u201cPrisma ORM: type-safe database access,\u201d 2026. [Online]. Available: https://www.prisma.io"));

// ---------------------------------------------------------------------------
// Document assembly
// ---------------------------------------------------------------------------
const doc = new Document({
  creator: "AgentExam Project",
  title: "AgentExam: An Upload-Driven Retrieval-Augmented AI Agent for Adaptive Examination Preparation",
  description: "IEEE-format research paper generated for the AgentExam project",
  styles: {
    default: {
      document: {
        run: { font: TNR, size: 20, color: BLACK },
        paragraph: { spacing: { line: 240 } },
      },
      heading1: {
        run: { font: TNR, size: 20, smallCaps: true, color: BLACK },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 220, after: 110, line: 240 } },
      },
      heading2: {
        run: { font: TNR, size: 20, italics: true, color: BLACK },
        paragraph: { spacing: { before: 170, after: 80, line: 240 } },
      },
    },
  },
  numbering: {
    config: [
      {
        reference: "contrib",
        levels: [{
          level: 0,
          format: LevelFormat.DECIMAL,
          text: "%1)",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 400, hanging: 400 } } },
        }],
      },
    ],
  },
  sections: [
    {
      // Section 1: single-column title block (no page break after — continuous)
      properties: { page: PAGE },
      footers: { default: makeFooter() },
      children: titleBlock,
    },
    {
      // Section 2: continuous two-column body
      properties: {
        type: SectionType.CONTINUOUS,
        column: { count: 2, space: 360, separate: false },
        page: PAGE,
      },
      footers: { default: makeFooter() },
      children: c,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUTPUT, buf);
  console.log(`Wrote ${OUTPUT} (${(buf.length / 1024).toFixed(1)} KB)`);
});
