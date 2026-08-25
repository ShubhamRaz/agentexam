export const mockUser = {
  id: 'u1',
  name: 'Shubham Raj',
  role: 'Student',
  program: 'B.Tech CS',
  semester: 6
};

export const mockDashboardData = {
  student: {
    name: 'Shubham Raj',
    streak: 5,
    averageScore: 78,
    testsCompleted: 12,
    totalStudyHours: 42
  },
  readinessScore: 78,
  daysLeft: 14,
  examDate: '12 Aug 2026',
  upcomingExam: {
    name: 'Computer Networks',
    date: '12 Aug 2026',
    daysLeft: 14
  },
  weakTopics: [
    { score: 45, topic: 'Subnetting & VLSM', subject: 'Computer Networks', recommendation: 'Review IP addressing basics and practice subnetting questions' },
    { score: 55, topic: 'TCP Congestion Control', subject: 'Computer Networks', recommendation: 'Focus on AIMD algorithm and slow start phase' },
    { score: 40, topic: 'B+ Trees', subject: 'Database Systems', recommendation: 'Practice insertion and deletion algorithms' }
  ],
  subjectPerformance: [
    { subject: 'Computer Networks', score: 72, tests: 5, accuracy: 68 },
    { subject: 'Database Systems', score: 85, tests: 4, accuracy: 82 },
    { subject: 'Operating Systems', score: 65, tests: 3, accuracy: 62 }
  ],
  recentActivity: [
    { id: 1, icon: '📝', title: 'Completed CN Mock Test', time: '2 hours ago', score: '72%', duration: '45m' },
    { id: 2, icon: '🗣️', title: 'OS Viva Practice', time: 'Yesterday', score: '8.5/10', duration: '15m' },
    { id: 3, icon: '📚', title: 'Read B+ Trees Material', time: '2 days ago', duration: '30m' }
  ],
  recentTests: [
    { type: 'mock', name: 'CN Full Mock Test 1', score: 65, date: '2 days ago' },
    { type: 'viva', name: 'OS Process Scheduling', score: 85, date: '3 days ago' }
  ],
  todayTasks: [
    { id: 1, title: 'Review Subnetting Notes', subject: 'Computer Networks', priority: 'high', completed: true, duration: '45m' },
    { id: 2, title: 'Practice 10 Subnetting MCQs', subject: 'Computer Networks', priority: 'high', completed: false, duration: '30m' },
    { id: 3, title: 'Read TCP Congestion Control', subject: 'Computer Networks', priority: 'medium', completed: false, duration: '1h' }
  ]
};

export const mockSyllabusData = {
  subject: 'Computer Networks',
  units: [
    {
      name: 'Unit 1: Introduction',
      weightage: 10,
      topics: ['OSI Model', 'TCP/IP', 'Topologies', 'Transmission Media']
    }
  ],
  highProbabilityTopics: [
    'Subnetting & VLSM'
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
  }
];

export const mockMaterials = [];
export const mockPerformanceData = [];
export const mockPYQs = [];
export const mockResultsList = [];
export const mockExperiments = [];
export const mockReadiness = { score: 78, status: 'HIGH', factors: [], riskAreas: [], recommendations: [] };
export const mockProfile = { name: 'Shubham', email: 's@s.com' };
