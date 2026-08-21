import { 
  mockDashboardData, 
  mockUser, 
  mockSyllabusData, 
  mockExamQuestions,
  mockMaterials,
  mockPerformanceData
} from '../data/mockData';

// Helper to simulate network latency
const delay = (ms = 800) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  getUser: async () => {
    await delay(300);
    return mockUser;
  },
  
  getDashboard: async () => {
    await delay();
    return mockDashboardData;
  },

  getMaterials: async () => {
    await delay(500);
    return mockMaterials;
  },

  uploadMaterial: async (file) => {
    await delay(1500);
    // Simulate returning a newly added material
    return {
      id: Date.now(),
      name: file.name,
      type: 'Unknown',
      subject: 'Pending Analysis',
      status: 'Processing',
      date: 'Just now'
    };
  },

  getSyllabusAnalysis: async (subjectId) => {
    await delay(1000);
    return mockSyllabusData;
  },

  startTheoryExam: async (config) => {
    await delay(1200);
    return {
      examId: 'ex_' + Date.now(),
      questions: mockExamQuestions
    };
  },

  submitExam: async (examId, answers) => {
    await delay(2000);
    // Simulate evaluation response
    return {
      score: 75,
      totalMarks: 100,
      feedback: "Good understanding of IP addressing, but need to review Routing Algorithms in more depth. Your explanation of OSPF was missing key details about Link State Packets.",
      weakTopics: ['Routing Algorithms']
    };
  },

  getPerformanceData: async () => {
    await delay(600);
    return mockPerformanceData;
  }
};

export default api;
