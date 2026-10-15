import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'

/* ============================================================
   AgentExam seed script — run with: bun prisma/seed.ts

   NEW FLOW (per product correction):
   - demo@agentexam.ai / demo123  → STUDENT, completely EMPTY.
     No subjects, no materials, no tests. The student must upload
     syllabus/materials/PYQs — the AI pipeline then builds their
     subjects, question bank and study plan.
   - faculty@agentexam.ai / faculty123 → FACULTY demo with a
     classroom, uploaded materials (Cloud Computing + Computer
     Networks), enrolled students, a conducted test and progress.
   - priya / rahul / ananya @agentexam.ai / student123 →
     enrolled students with test history so faculty can see
     progress and students can access shared materials.
   ============================================================ */

type Opt = { id: string; text: string; is_correct: boolean }
type SeedQ = {
  type: 'MCQ' | 'SHORT_ANSWER' | 'LONG_ANSWER' | 'VIVA'
  text: string
  topic: string
  options?: Opt[]
  correct?: string
  explanation?: string
  marks?: number
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD'
  source?: 'PYQ' | 'MANUAL' | 'AI'
  year?: number
  sourceRef?: string
}

type SeedTopic = { name: string; importance: 'high' | 'medium' | 'low'; freq: number; weight: number }
type SeedUnit = { name: string; topics: SeedTopic[] }

type SeedSubject = {
  name: string
  code: string
  description: string
  units: SeedUnit[]
  questions: SeedQ[]
  experiments: { title: string; description: string; objective: string; instructions: string; expected: string; marks: number }[]
  materials: { type: string; title: string; file: string; size: number }[]
}

const mcq = (text: string, topic: string, opts: string[], correctIdx: number, explanation: string, difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM'): SeedQ => ({
  type: 'MCQ', text, topic,
  options: opts.map((t, i) => ({ id: String.fromCharCode(65 + i), text: t, is_correct: i === correctIdx })),
  correct: String.fromCharCode(65 + correctIdx),
  explanation, marks: 1, difficulty, source: 'AI',
})

const short = (text: string, topic: string, marks = 3, difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM'): SeedQ => ({
  type: 'SHORT_ANSWER', text, topic, marks, difficulty, source: 'AI',
})

const long = (text: string, topic: string, marks = 8, difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'HARD'): SeedQ => ({
  type: 'LONG_ANSWER', text, topic, marks, difficulty, source: 'AI',
})

const viva = (text: string, topic: string, marks = 2): SeedQ => ({
  type: 'VIVA', text, topic, marks, difficulty: 'EASY', source: 'AI',
})

const pyq = (text: string, topic: string, year: number, marks: number, type: 'MCQ' | 'SHORT_ANSWER' | 'LONG_ANSWER', difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM', opts?: string[], correctIdx?: number): SeedQ => ({
  type, text, topic, marks, difficulty, source: 'PYQ', year,
  sourceRef: `${year} End Term Exam`,
  ...(type === 'MCQ' && opts ? {
    options: opts.map((t, i) => ({ id: String.fromCharCode(65 + i), text: t, is_correct: i === correctIdx! })),
    correct: String.fromCharCode(65 + correctIdx!),
    explanation: 'Previous year question — practise this pattern.',
  } : {}),
})

/* ---------------- Cloud Computing (faculty subject) ---------------- */

const CLOUD: SeedSubject = {
  name: 'Cloud Computing',
  code: 'CS551',
  description: 'Cloud service models, virtualization, storage, and security — as uploaded by faculty.',
  units: [
    {
      name: 'Introduction to Cloud Computing',
      topics: [
        { name: 'Evolution of Cloud Computing', importance: 'medium', freq: 2, weight: 6 },
        { name: 'Cloud Characteristics & Service Models', importance: 'high', freq: 5, weight: 12 },
        { name: 'Deployment Models', importance: 'medium', freq: 3, weight: 8 },
        { name: 'Cloud Architecture', importance: 'high', freq: 4, weight: 10 },
      ],
    },
    {
      name: 'Virtualization',
      topics: [
        { name: 'Hypervisors & Type-1/Type-2', importance: 'high', freq: 5, weight: 12 },
        { name: 'Para-virtualization', importance: 'medium', freq: 2, weight: 7 },
        { name: 'Hardware Support for Virtualization', importance: 'low', freq: 1, weight: 5 },
        { name: 'Containers & Micro-VMs', importance: 'medium', freq: 3, weight: 8 },
      ],
    },
    {
      name: 'Cloud Storage & Data Management',
      topics: [
        { name: 'Storage as a Service', importance: 'medium', freq: 2, weight: 6 },
        { name: 'Distributed File Systems', importance: 'high', freq: 4, weight: 10 },
        { name: 'NoSQL in the Cloud', importance: 'high', freq: 4, weight: 9 },
      ],
    },
    {
      name: 'Security in the Cloud',
      topics: [
        { name: 'IAM & Access Control', importance: 'high', freq: 3, weight: 9 },
        { name: 'Data Security & Compliance', importance: 'medium', freq: 2, weight: 7 },
      ],
    },
  ],
  questions: [
    // MCQs
    mcq('Which of the following is NOT an essential cloud computing characteristic?', 'Cloud Characteristics & Service Models', ['On-demand self-service', 'Broad network access', 'Resource pooling', 'Fixed physical infrastructure'], 3, 'NIST defines five characteristics; fixed infrastructure is the opposite of rapid elasticity.'),
    mcq('IaaS primarily delivers which of the following?', 'Cloud Characteristics & Service Models', ['Raw compute, storage and network', 'A ready application platform', 'Finished end-user software', 'Consulting services'], 0, 'IaaS exposes virtualised compute/storage/network so users manage OS upward.', 'EASY'),
    mcq('A Type-1 hypervisor runs…', 'Hypervisors & Type-1/Type-2', ['On top of a host OS', 'Directly on physical hardware', 'Only inside containers', 'As a browser plugin'], 1, 'Type-1 (bare-metal) hypervisors run directly on hardware — e.g. ESXi, Xen.'),
    mcq('Which technology isolates application dependencies using OS-level virtualization?', 'Containers & Micro-VMs', ['Hypervisor clusters', 'Containers', 'SAN fabrics', 'RAID arrays'], 1, 'Containers share the host kernel and isolate user space — Docker being the classic example.'),
    mcq('Amazon S3 and Google Cloud Storage are examples of…', 'Storage as a Service', ['Object storage', 'Block storage only', 'Tape archives', 'Relational DW appliances'], 0, 'Both are object stores with flat namespaces and eventual consistency options.'),
    mcq('GFS/HDFS replicate blocks primarily to…', 'Distributed File Systems', ['Improve availability under node failure', 'Encrypt data at rest', 'Reduce storage cost', 'Speed up deletes'], 0, 'Replication (typically 3x) tolerates node/disk failure.'),
    mcq('Which NoSQL store favours tunable consistency?', 'NoSQL in the Cloud', ['DynamoDB-style key-value stores', 'ACID-only RDBMS', 'Flat CSV files', 'COBOL tapes'], 0, 'Dynamo-style systems let apps choose consistency per operation.'),
    mcq('In cloud IAM, a "role" differs from a "user" because roles…', 'IAM & Access Control', ['Are assumable and carry no permanent credentials', 'Cannot have policies', 'Exist only on-prem', 'Cost more'], 0, 'Roles provide temporary credentials via assumption.'),
    // PYQs
    pyq('Define cloud computing and list its five essential characteristics.', 'Cloud Characteristics & Service Models', 2022, 5, 'SHORT_ANSWER'),
    pyq('Compare IaaS, PaaS and SaaS with one industry example each.', 'Cloud Characteristics & Service Models', 2023, 8, 'LONG_ANSWER'),
    pyq('Explain Type-1 vs Type-2 hypervisors with diagrams.', 'Hypervisors & Type-1/Type-2', 2021, 5, 'SHORT_ANSWER'),
    pyq('Discuss para-virtualization and when it outperforms full virtualization.', 'Para-virtualization', 2022, 5, 'SHORT_ANSWER'),
    pyq('Design a storage strategy for a 10 PB analytics lake on cloud storage, justifying redundancy and tiering choices.', 'Distributed File Systems', 2023, 10, 'LONG_ANSWER', 'HARD'),
    pyq('Which deployment model is dedicated to a single organisation?', 'Deployment Models', 2021, 1, 'MCQ', 'EASY', ['Public cloud', 'Private cloud', 'Community grid', 'Edge mesh'], 1),
    pyq('Explain how CASB and IAM together secure multi-cloud access.', 'IAM & Access Control', 2020, 5, 'SHORT_ANSWER'),
    // Shorts
    short('Differentiate vertical from horizontal scaling with cloud examples.', 'Cloud Architecture'),
    short('Write the consistency guarantees of eventual vs strong consistency in object stores.', 'NoSQL in the Cloud'),
    short('List four shared-responsibility-model duties retained by the customer in IaaS.', 'Data Security & Compliance'),
    // Long
    long('Explain cloud reference architecture with a diagram: front-end platform, back-end platform, and network layers.', 'Cloud Architecture'),
    long('Compare GFS/HDFS architecture: chunk servers, master node, replication and fault tolerance.', 'Distributed File Systems'),
    long('Design a multi-region, DR-ready deployment for a fintech SaaS on public cloud, covering security and compliance.', 'Data Security & Compliance', 10),
    // Viva
    viva('Viva: What does "measured service" mean in cloud computing?', 'Cloud Characteristics & Service Models'),
    viva('Viva: Name one Type-1 hypervisor and one container runtime.', 'Hypervisors & Type-1/Type-2'),
    viva('Viva: Why is erasure coding used in modern cloud storage?', 'Storage as a Service'),
    viva('Viva: State one data-compliance standard relevant to cloud healthcare workloads.', 'Data Security & Compliance'),
  ],
  experiments: [
    {
      title: 'Deploy a VM and a Container on Cloud',
      description: 'Launch one IaaS virtual machine and one containerised app; compare boot time, footprint and billing granularity.',
      objective: 'Experience provisioning latency differences between VMs and containers.',
      instructions: '1. Provision a t2-small VM\n2. SSH and install Docker\n3. Run the sample app in a container\n4. Record boot/start timings and memory footprint\n5. Terminate all resources',
      expected: 'A timing table comparing VM vs container startup and footprint.',
      marks: 10,
    },
    {
      title: 'Build a Resilient Object Store Pipeline',
      description: 'Upload objects with versioning + lifecycle tiering and simulate node loss.',
      objective: 'Understand durability settings on cloud object storage.',
      instructions: '1. Enable versioning on the bucket\n2. Upload a 100 MB dataset\n3. Configure lifecycle to Glacier after 7 days\n4. Delete a "node" replica and verify availability',
      expected: 'Objects remain readable after simulated loss; lifecycle rule screenshot.',
      marks: 10,
    },
  ],
  materials: [
    { type: 'SYLLABUS', title: 'Cloud Computing — Official Syllabus (2025)', file: 'cloud-computing-syllabus-2025.pdf', size: 184320 },
    { type: 'PYQ', title: 'Cloud Computing — PYQ Set 2020-2023', file: 'cc-pyq-2020-2023.pdf', size: 421888 },
    { type: 'NOTES', title: 'Cloud Computing — Unit-wise Notes', file: 'cc-unit-notes.pdf', size: 1048576 },
  ],
}

/* ---------------- Computer Networks (faculty subject) ---------------- */

const NETWORKS: SeedSubject = {
  name: 'Computer Networks',
  code: 'CS452',
  description: 'Layered network architecture, TCP/IP, routing and security — faculty uploads.',
  units: [
    {
      name: 'Network Fundamentals & OSI',
      topics: [
        { name: 'OSI & TCP/IP Layers', importance: 'high', freq: 5, weight: 12 },
        { name: 'Transmission Media & Switching', importance: 'medium', freq: 3, weight: 8 },
      ],
    },
    {
      name: 'Transport Layer',
      topics: [
        { name: 'TCP Congestion Control', importance: 'high', freq: 4, weight: 11 },
        { name: 'UDP & Real-time Transport', importance: 'medium', freq: 2, weight: 7 },
      ],
    },
    {
      name: 'Network Security',
      topics: [
        { name: 'Symmetric & Asymmetric Cryptography', importance: 'high', freq: 4, weight: 10 },
        { name: 'Firewalls & IDS', importance: 'medium', freq: 3, weight: 8 },
      ],
    },
  ],
  questions: [
    mcq('Which layer is responsible for end-to-end reliable delivery?', 'OSI & TCP/IP Layers', ['Network layer', 'Transport layer', 'Session layer', 'Data link layer'], 1, 'TCP at the transport layer guarantees ordered, reliable byte-stream delivery.', 'EASY'),
    mcq('In TCP slow start, the congestion window grows…', 'TCP Congestion Control', ['Linearly per RTT', 'Exponentially per RTT', 'Never changes', 'By MSS only on loss'], 1, 'Slow start doubles cwnd each RTT until the threshold.'),
    mcq('Which cipher is asymmetric?', 'Symmetric & Asymmetric Cryptography', ['AES', 'RSA', 'DES', 'Blowfish'], 1, 'RSA uses a public/private key pair.'),
    mcq('A stateful firewall primarily inspects…', 'Firewalls & IDS', ['Packet payload only', 'Connection state/context', 'Battery level', 'DNS TTLs'], 1, 'It tracks connection state to allow return traffic.'),
    mcq('Circuit switching reserves…', 'Transmission Media & Switching', ['A dedicated path before transfer', 'Random slots', 'Only headers', 'No bandwidth'], 0, 'A dedicated circuit is established first.'),
    pyq('Explain the OSI reference model with functions of each layer.', 'OSI & TCP/IP Layers', 2022, 8, 'LONG_ANSWER'),
    pyq('Compare stop-and-wait, Go-Back-N and selective repeat.', 'TCP Congestion Control', 2021, 5, 'SHORT_ANSWER'),
    pyq('Describe TLS handshake steps for HTTPS.', 'Symmetric & Asymmetric Cryptography', 2023, 5, 'SHORT_ANSWER'),
    short('Differentiate flow control from congestion control in TCP.', 'TCP Congestion Control'),
    short('Why is UDP preferred for live streaming?', 'UDP & Real-time Transport'),
    short('List three firewall generations and their detection abilities.', 'Firewalls & IDS'),
    long('Explain TCP congestion control: slow start, congestion avoidance, fast retransmit and recovery with a cwnd graph.', 'TCP Congestion Control', 10),
    long('Design a secure campus network with DMZ, IDS placement and VPN access for remote users.', 'Firewalls & IDS', 10),
    viva('Viva: On which layer does a switch operate?', 'OSI & TCP/IP Layers'),
    viva('Viva: What is the purpose of a 3-way handshake?', 'TCP Congestion Control'),
    viva('Viva: What does perfect forward secrecy prevent?', 'Symmetric & Asymmetric Cryptography'),
  ],
  experiments: [
    {
      title: 'Subnetting & Router Configuration Lab',
      description: 'Plan VLSM subnets for a 4-department campus and configure static routes.',
      objective: 'Apply subnetting and routing table logic.',
      instructions: '1. Compute VLSM ranges\n2. Assign interfaces\n3. Configure static routes\n4. Verify with ping/traceroute',
      expected: 'Connectivity matrix proving all departments reach each other.',
      marks: 10,
    },
  ],
  materials: [
    { type: 'SYLLABUS', title: 'Computer Networks — Syllabus (2025)', file: 'cn-syllabus-2025.pdf', size: 153600 },
    { type: 'NOTES', title: 'CN — Transport Layer Notes', file: 'cn-transport-notes.pdf', size: 512000 },
  ],
}

const SUBJECTS: SeedSubject[] = [CLOUD, NETWORKS]

async function main() {
  console.log('Clearing existing data…')
  await db.answer.deleteMany()
  await db.result.deleteMany()
  await db.mockTest.deleteMany()
  await db.studyPlan.deleteMany()
  await db.material.deleteMany()
  await db.question.deleteMany()
  await db.experiment.deleteMany()
  await db.topic.deleteMany()
  await db.unit.deleteMany()
  await db.classroomStudent.deleteMany()
  await db.subject.deleteMany()
  await db.classroom.deleteMany()
  await db.user.deleteMany()

  /* ---------- users ---------- */
  const demo = await db.user.create({
    data: {
      name: 'Demo Student',
      email: 'demo@agentexam.ai',
      passwordHash: hashPassword('demo123'),
      role: 'STUDENT',
      enrollmentNo: 'SU25CSE999',
      semester: '5',
      department: 'Computer Science & Engineering',
      examDate: new Date(Date.now() + 45 * 24 * 3600 * 1000),
    },
  })
  console.log('Created empty demo student', demo.email)

  const faculty = await db.user.create({
    data: {
      name: 'Dr. Meera Krishnan',
      email: 'faculty@agentexam.ai',
      passwordHash: hashPassword('faculty123'),
      role: 'FACULTY',
      department: 'Computer Science & Engineering',
    },
  })
  console.log('Created faculty', faculty.email)

  const studentDefs = [
    { name: 'Priya Sharma', email: 'priya@agentexam.ai', enrollmentNo: 'SU25CSE001' },
    { name: 'Rahul Verma', email: 'rahul@agentexam.ai', enrollmentNo: 'SU25CSE002' },
    { name: 'Ananya Iyer', email: 'ananya@agentexam.ai', enrollmentNo: 'SU25CSE003' },
  ]
  const students: { id: string; name: string }[] = []
  for (const s of studentDefs) {
    const u = await db.user.create({
      data: {
        name: s.name, email: s.email,
        passwordHash: hashPassword('student123'),
        role: 'STUDENT', enrollmentNo: s.enrollmentNo,
        semester: '5', department: 'Computer Science & Engineering',
        examDate: new Date(Date.now() + 45 * 24 * 3600 * 1000),
      },
    })
    students.push({ id: u.id, name: u.name })
  }
  console.log(`Created ${students.length} enrolled students`)

  /* ---------- classroom ---------- */
  const classroom = await db.classroom.create({
    data: { name: 'CSE-A Semester 5', code: 'CSE5A', facultyId: faculty.id },
  })
  for (const s of students) {
    await db.classroomStudent.create({
      data: { classroomId: classroom.id, studentId: s.id, addedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
    })
  }
  console.log('Created classroom', classroom.name, classroom.code)

  /* ---------- subjects (owned by faculty, shared via classroom) ---------- */
  const topicMap: Record<string, string> = {}
  const questionIds: Record<string, string[]> = {}

  for (const s of SUBJECTS) {
    const subject = await db.subject.create({
      data: {
        name: s.name, code: s.code, description: s.description,
        ownerId: faculty.id, classroomId: classroom.id,
      },
    })

    for (let i = 0; i < s.units.length; i++) {
      const u = s.units[i]
      const unit = await db.unit.create({ data: { subjectId: subject.id, name: u.name, chapterNo: i + 1 } })
      for (const t of u.topics) {
        const topic = await db.topic.create({
          data: { unitId: unit.id, name: t.name, importance: t.importance, pyqFrequency: t.freq, weightage: t.weight },
        })
        topicMap[`${s.name}::${t.name}`] = topic.id
      }
    }

    const theoryIds: string[] = []
    for (const q of s.questions) {
      const topicId = topicMap[`${s.name}::${q.topic}`] || null
      const created = await db.question.create({
        data: {
          subjectId: subject.id, topicId,
          questionType: q.type, questionText: q.text,
          options: q.options ? JSON.stringify(q.options) : null,
          correctAnswer: q.correct ?? null,
          explanation: q.explanation ?? (q.source === 'PYQ' ? 'Previous year question — practise this pattern.' : null),
          marks: q.marks ?? 1, difficultyLevel: q.difficulty ?? 'MEDIUM',
          source: q.source ?? 'AI', sourceReference: q.sourceRef ?? null, year: q.year ?? null,
        },
      })
      if (q.type !== 'VIVA') theoryIds.push(created.id)
    }
    questionIds[subject.id] = theoryIds

    for (const e of s.experiments) {
      await db.experiment.create({
        data: {
          subjectId: subject.id, title: e.title, description: e.description,
          objective: e.objective, instructions: e.instructions,
          expectedOutput: e.expected, marks: e.marks,
        },
      })
    }

    const unitCount = s.units.length
    const topicCount = s.units.reduce((a, u) => a + u.topics.length, 0)
    for (const m of s.materials) {
      await db.material.create({
        data: {
          subjectId: subject.id, uploadedBy: faculty.id, materialType: m.type,
          title: m.title, fileName: m.file, fileType: m.file.split('.').pop() || 'pdf',
          mimeType: 'application/pdf', fileSize: m.size, processingStatus: 'PROCESSED',
          extractedText: `${s.name} course material. ${s.units.map(u => `${u.name}: ${u.topics.map(t => t.name).join(', ')}`).join('. ')}`,
          analysisSummary: JSON.stringify({ units: unitCount, topics: topicCount, questions: theoryIds.length, experiments: s.experiments.length, subjectName: s.name, isNewSubject: true }),
          createdAt: new Date(Date.now() - (14 + m.size % 5) * 24 * 3600 * 1000),
        },
      })
    }
    console.log(`Seeded ${s.name}: ${theoryIds.length} questions, ${topicCount} topics, ${s.materials.length} materials`)
  }

  const subjects = await db.subject.findMany()
  const byName = (n: string) => subjects.find(s => s.name ===(n))!
  const cloud = byName('Cloud Computing')
  const networks = byName('Computer Networks')

  /* ---------- student test history (for faculty progress view) ---------- */
  const history: { studentIdx: number; subjectId: string; daysAgo: number; pct: number; n: number }[] = [
    { studentIdx: 0, subjectId: cloud.id, daysAgo: 12, pct: 72, n: 8 },
    { studentIdx: 0, subjectId: networks.id, daysAgo: 7, pct: 65, n: 6 },
    { studentIdx: 1, subjectId: cloud.id, daysAgo: 10, pct: 45, n: 8 },
    { studentIdx: 1, subjectId: cloud.id, daysAgo: 4, pct: 58, n: 8 },
    { studentIdx: 2, subjectId: networks.id, daysAgo: 6, pct: 88, n: 6 },
  ]

  for (const h of history) {
    const student = students[h.studentIdx]
    const qs = (questionIds[h.subjectId] || []).slice(0, h.n)
    if (!qs.length) continue
    const allQuestions = await db.question.findMany({ where: { id: { in: qs } } })
    const totalMarks = allQuestions.reduce((a, q) => a + q.marks, 0)
    const obtained = Math.round(totalMarks * h.pct) / 100

    const createdAt = new Date(Date.now() - h.daysAgo * 24 * 3600 * 1000)
    const test = await db.mockTest.create({
      data: {
        studentId: student.id, subjectId: h.subjectId, testType: 'THEORY',
        difficultyLevel: 'MEDIUM', totalMarks, durationMinutes: 30,
        status: 'EVALUATED', questionIds: JSON.stringify(qs),
        startedAt: createdAt, expiresAt: new Date(createdAt.getTime() + 30 * 60000),
        submittedAt: new Date(createdAt.getTime() + 22 * 60000), createdAt,
      },
    })

    const nCorrect = Math.round(qs.length * h.pct / 100)
    for (let i = 0; i < allQuestions.length; i++) {
      const q = allQuestions[i]
      const isCorrect = i < nCorrect
      let marksObtained = 0
      let feedback: string | null = null
      let selected: string | null = null
      let text: string | null = null
      if (q.questionType === 'MCQ') {
        const opts = q.options ? JSON.parse(q.options) as Opt[] : []
        const correctOpt = opts.find(o => o.is_correct)
        selected = isCorrect ? (correctOpt?.id ?? 'A') : (opts.find(o => !o.is_correct)?.id ?? 'B')
        marksObtained = isCorrect ? q.marks : 0
        feedback = isCorrect ? 'Correct answer.' : `Incorrect — the right option is (${correctOpt?.id}). ${q.explanation ?? ''}`
      } else {
        marksObtained = Math.round(q.marks * (isCorrect ? 0.8 : 0.35) * 100) / 100
        text = isCorrect
          ? 'A structured answer covering the key aspects with adequate examples.'
          : 'A partial answer — key definitions were missing and the example was incomplete.'
        feedback = isCorrect
          ? 'Good conceptual coverage. Add diagrams to earn full marks.'
          : 'Weak on core concepts. Revise the fundamentals of this topic before the next attempt.'
      }
      await db.answer.create({
        data: { questionId: q.id, studentId: student.id, testId: test.id, answerText: text, selectedOptionId: selected, marksObtained, feedback },
      })
    }

    const grade = h.pct >= 90 ? 'A' : h.pct >= 80 ? 'B' : h.pct >= 70 ? 'C' : h.pct >= 60 ? 'D' : 'F'
    await db.result.create({
      data: {
        testId: test.id, studentId: student.id, totalMarks, obtainedMarks: obtained,
        percentage: h.pct, grade, passStatus: h.pct >= 40,
        analytics: JSON.stringify({
          improvement_suggestions: h.pct >= 70
            ? 'Strong performance. Focus on the few incorrect areas and practise one more timed paper.'
            : 'Prioritise the weak topics below: re-read unit notes, then attempt topic-wise easy questions. Aim to cross 60% on the next mock.',
          weak_areas: allQuestions.slice(nCorrect).slice(0, 3).map(q => q.questionText.slice(0, 60)),
          topic_scores: Object.fromEntries(allQuestions.map((q, i) => [q.questionText.slice(0, 40), i < nCorrect ? 100 : 30])),
        }),
        createdAt: new Date(createdAt.getTime() + 23 * 60000),
      },
    })
  }

  /* ---------- conducted test: "Unit Test 1 — Cloud Computing" ---------- */
  const ccQs = (questionIds[cloud.id] || []).slice(0, 8)
  const ccQuestions = await db.question.findMany({ where: { id: { in: ccQs } } })
  const ccTotal = ccQuestions.reduce((a, q) => a + q.marks, 0)
  const conductAt = new Date(Date.now() - 1 * 24 * 3600 * 1000)
  const conductedScores = [81, 54, null] // Priya done, Rahul done, Ananya pending

  for (let i = 0; i < students.length; i++) {
    const student = students[i]
    const score = conductedScores[i]
    const test = await db.mockTest.create({
      data: {
        studentId: student.id, subjectId: cloud.id, testType: 'THEORY',
        difficultyLevel: 'MEDIUM', totalMarks: ccTotal, durationMinutes: 30,
        status: score == null ? 'DRAFT' : 'EVALUATED',
        questionIds: JSON.stringify(ccQs),
        assignedById: faculty.id, assignedTitle: 'Unit Test 1 — Cloud Computing',
        dueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000),
        ...(score == null ? {} : {
          startedAt: conductAt, expiresAt: new Date(conductAt.getTime() + 30 * 60000),
          submittedAt: new Date(conductAt.getTime() + 24 * 60000),
        }),
        createdAt: conductAt,
      },
    })
    if (score == null) continue

    const nCorrect = Math.round(ccQs.length * score / 100)
    for (let j = 0; j < ccQuestions.length; j++) {
      const q = ccQuestions[j]
      const isCorrect = j < nCorrect
      let marksObtained = 0
      let selected: string | null = null
      let text: string | null = null
      let feedback: string | null = null
      if (q.questionType === 'MCQ') {
        const opts = q.options ? JSON.parse(q.options) as Opt[] : []
        const correctOpt = opts.find(o => o.is_correct)
        selected = isCorrect ? (correctOpt?.id ?? 'A') : (opts.find(o => !o.is_correct)?.id ?? 'B')
        marksObtained = isCorrect ? q.marks : 0
        feedback = isCorrect ? 'Correct answer.' : `Incorrect — the right option is (${correctOpt?.id}).`
      } else {
        marksObtained = Math.round(q.marks * (isCorrect ? 0.8 : 0.3) * 100) / 100
        text = isCorrect ? 'A structured answer covering the key aspects.' : 'Partial answer; core definitions missing.'
        feedback = isCorrect ? 'Good coverage.' : 'Revise the fundamentals of this topic.'
      }
      await db.answer.create({
        data: { questionId: q.id, studentId: student.id, testId: test.id, answerText: text, selectedOptionId: selected, marksObtained, feedback },
      })
    }
    const obtained = Math.round(ccTotal * score) / 100
    await db.result.create({
      data: {
        testId: test.id, studentId: student.id, totalMarks: ccTotal, obtainedMarks: obtained,
        percentage: score, grade: score >= 80 ? 'B' : score >= 60 ? 'D' : 'F', passStatus: score >= 40,
        analytics: JSON.stringify({
          improvement_suggestions: score >= 70
            ? 'Strong unit-test performance. Push toward full marks with timed re-attempts of the missed questions.'
            : 'Focus on the weak topics below; re-read unit notes and attempt easy topic-wise questions before the next test.',
          weak_areas: ccQuestions.slice(nCorrect).slice(0, 3).map(q => q.questionText.slice(0, 60)),
        }),
        createdAt: new Date(conductAt.getTime() + 25 * 60000),
      },
    })
  }
  console.log('Conducted test seeded for 3 students')

  /* ---------- study plan for Priya ---------- */
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const days: { date: string; tasks: { id: string; title: string; subject: string; type: string; priority: string; duration: number; completed: boolean; date: string }[] }[] = []
  const planPool = [
    { title: 'Practice: Hypervisors & Type-1/Type-2 problems', subject: 'Cloud Computing', type: 'practice', priority: 'high', duration: 45 },
    { title: 'Study: Cloud Computing — high-weightage units', subject: 'Cloud Computing', type: 'study', priority: 'medium', duration: 60 },
    { title: 'Study: Computer Networks — transport layer', subject: 'Computer Networks', type: 'study', priority: 'high', duration: 60 },
    { title: 'Mock Test: Cloud Computing (mixed difficulty)', subject: 'Cloud Computing', type: 'test', priority: 'medium', duration: 30 },
    { title: 'Revise: Computer Networks unit notes', subject: 'Computer Networks', type: 'revision', priority: 'low', duration: 30 },
    { title: 'Attempt AI viva rapid-fire on weak topics', subject: 'Cloud Computing', type: 'practice', priority: 'medium', duration: 15 },
    { title: 'Final revision: high-weightage topics', subject: 'Computer Networks', type: 'revision', priority: 'medium', duration: 60 },
  ]
  const localISO = (d: Date) => {
    const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  let idx = 0
  for (let d = 0; d < 7; d++) {
    const date = new Date(start)
    date.setDate(date.getDate() + d)
    const iso = localISO(date)
    const tasks = [0, 1, 2].map(t => {
      const p = planPool[idx % planPool.length]; idx++
      return { id: `task-${d * 3 + t + 1}`, title: p.title, subject: p.subject, type: p.type, priority: p.priority, duration: p.duration, completed: d === 0 && t === 0, date: iso }
    })
    days.push({ date: iso, tasks })
  }
  const endDate = new Date(start)
  endDate.setDate(endDate.getDate() + 6)
  await db.studyPlan.create({
    data: { studentId: students[0].id, startDate: start, endDate, planJson: JSON.stringify({ days }), status: 'ACTIVE' },
  })
  console.log('Study plan seeded for Priya')

  console.log('\n=== Seed complete ===')
  console.log('STUDENT (empty — must upload materials):   demo@agentexam.ai / demo123')
  console.log('FACULTY (classroom + materials + tests):   faculty@agentexam.ai / faculty123')
  console.log('ENROLLED STUDENTS: priya/rahul/ananya @agentexam.ai / student123')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
