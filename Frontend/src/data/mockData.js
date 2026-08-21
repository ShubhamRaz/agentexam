export const mockUser = {
  id: 'u1',
  name: 'Shubham Raj',
  role: 'Student',
  program: 'B.Tech CS',
  semester: 6
};

export const mockDashboardData = {
  readinessScore: 78,
  upcomingExam: {
    name: 'Computer Networks',
    date: '12 Aug 2026',
    daysLeft: 14
  },
  weakTopics: [
    { name: 'Subnetting & VLSM', subject: 'Computer Networks', weightage: 'High' },
    { name: 'TCP Congestion Control', subject: 'Computer Networks', weightage: 'Medium' },
    { name: 'B+ Trees', subject: 'Database Systems', weightage: 'High' }
  ],
  recentActivity: [
    { type: 'mock', name: 'CN Full Mock Test 1', score: 65, date: '2 days ago' },
    { type: 'viva', name: 'OS Process Scheduling', score: 85, date: '3 days ago' }
  ],
  studyPlanToday: [
    { id: 1, title: 'Review Subnetting Notes', priority: 'high', status: 'done', duration: '45m' },
    { id: 2, title: 'Practice 10 Subnetting MCQs', priority: 'high', status: 'in-progress', duration: '30m' },
    { id: 3, title: 'Read TCP Congestion Control', priority: 'medium', status: 'pending', duration: '1h' }
  ]
};

export const mockSyllabusData = {
  subject: 'Computer Networks',
  units: [
    {
      name: 'Unit 1: Introduction',
      weightage: 10,
      topics: ['OSI Model', 'TCP/IP', 'Topologies', 'Transmission Media']
    },
    {
      name: 'Unit 2: Data Link Layer',
      weightage: 25,
      topics: ['Framing', 'Error Detection (CRC)', 'MAC Protocols (CSMA/CD)', 'Ethernet']
    },
    {
      name: 'Unit 3: Network Layer',
      weightage: 35,
      topics: ['IPv4 & IPv6', 'Subnetting & VLSM', 'Routing Algorithms (RIP, OSPF, BGP)']
    },
    {
      name: 'Unit 4: Transport Layer',
      weightage: 20,
      topics: ['TCP vs UDP', 'TCP Connection Management', 'Congestion Control']
    },
    {
      name: 'Unit 5: Application Layer',
      weightage: 10,
      topics: ['DNS', 'HTTP', 'SMTP', 'FTP']
    }
  ],
  highProbabilityTopics: [
    'Subnetting & VLSM',
    'Routing Algorithms (OSPF)',
    'TCP Congestion Control',
    'Error Detection (CRC)'
  ]
};

export const mockExamQuestions = [
  {
    id: 'q1',
    type: 'mcq',
    text: 'Which of the following routing algorithms uses Dijkstra\'s algorithm?',
    options: ['Distance Vector (RIP)', 'Link State (OSPF)', 'Path Vector (BGP)', 'None of the above'],
    correctAnswer: 1,
    topic: 'Routing Algorithms (OSPF)'
  },
  {
    id: 'q2',
    type: 'short',
    text: 'Briefly explain the purpose of the TCP 3-way handshake.',
    topic: 'TCP Connection Management'
  },
  {
    id: 'q3',
    type: 'mcq',
    text: 'In IPv4, what is the size of the header without any options?',
    options: ['20 bytes', '24 bytes', '32 bytes', '40 bytes'],
    correctAnswer: 0,
    topic: 'IPv4 & IPv6'
  },
  {
    id: 'q4',
    type: 'long',
    text: 'Compare and contrast Distance Vector Routing and Link State Routing. Provide an example scenario where one is preferred over the other.',
    topic: 'Routing Algorithms'
  }
];

export const mockMaterials = [
  { id: 1, name: 'CN_Syllabus_2026.pdf', type: 'Syllabus', subject: 'Computer Networks', status: 'Analyzed', date: '10 Aug' },
  { id: 2, name: 'CN_PYQ_2025.pdf', type: 'PYQ', subject: 'Computer Networks', status: 'Analyzed', date: '10 Aug' },
  { id: 3, name: 'CN_Lab_Manual.docx', type: 'Lab Manual', subject: 'Computer Networks', status: 'Analyzed', date: '11 Aug' },
  { id: 4, name: 'Unit3_Notes.pdf', type: 'Notes', subject: 'Computer Networks', status: 'Processing', date: '12 Aug' }
];

export const mockPerformanceData = [
  { name: 'Test 1', score: 55, accuracy: 60 },
  { name: 'Test 2', score: 62, accuracy: 65 },
  { name: 'Test 3', score: 68, accuracy: 72 },
  { name: 'Test 4', score: 75, accuracy: 80 },
  { name: 'Test 5', score: 78, accuracy: 82 }
];

export const mockPYQs = [
  { id: 'pyq-1', subject: 'Computer Networks', year: '2025', text: 'Explain the OSI Reference Model.', marks: 10, type: 'Long Answer' },
  { id: 'pyq-2', subject: 'Computer Networks', year: '2024', text: 'What is subnetting? Calculate the subnet mask for a /26 network.', marks: 5, type: 'Short Answer' },
  { id: 'pyq-3', subject: 'Operating Systems', year: '2024', text: 'Describe the Banker\'s algorithm for deadlock avoidance.', marks: 15, type: 'Long Answer' }
];

export const mockResultsList = [
  { id: 'res-1', examName: 'CN Full Mock Test 1', date: '2026-08-10', score: 65, maxMarks: 100, percentage: 65, status: 'PASSED' },
  { id: 'res-2', examName: 'OS Midterm', date: '2026-07-20', score: 35, maxMarks: 50, percentage: 70, status: 'PASSED' },
  { id: 'res-3', examName: 'DBMS Quiz', date: '2026-06-15', score: 9, maxMarks: 20, percentage: 45, status: 'NEEDS IMPROVEMENT' }
];

export const mockExperiments = [
  { id: 'exp-1', title: 'Experiment 1: Socket Programming', subject: 'Computer Networks Lab', status: 'COMPLETED' },
  { id: 'exp-2', title: 'Experiment 2: Distance Vector Routing Simulation', subject: 'Computer Networks Lab', status: 'PENDING' },
  { id: 'exp-3', title: 'Experiment 3: WireShark Packet Analysis', subject: 'Computer Networks Lab', status: 'IN_PROGRESS' }
];

export const mockReadiness = {
  score: 78,
  status: 'HIGH',
  factors: [
    { name: 'Overall Accuracy', value: 78 },
    { name: 'Topics Attempted', value: 24 }
  ],
  riskAreas: [
    { topic_name: 'Subnetting & VLSM', risk_level: 'HIGH', reason: 'Low accuracy in recent tests' }
  ],
  recommendations: [
    { priority: 'HIGH', message: 'Review Subnetting concepts and practice numericals.', topic_name: 'Subnetting & VLSM' }
  ]
};

export const mockProfile = {
  name: 'Shubham Raj',
  email: 'shubham@example.com',
  program: 'B.Tech Computer Science',
  semester: 'Semester 6',
  joined: 'August 2021',
  preferences: {
    theme: 'Light',
    notifications: true
  }
};
