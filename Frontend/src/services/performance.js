import client from './client';

export async function getPerformance() {
  const response = await client.get('/performance/me');
  const d = response.data;
  
  // Map backend response to what Performance.jsx expects
  return {
    overall: {
      totalTests: 12, // Mocked fallback
      averageScore: Math.round(d.overall_accuracy) || 75,
      improvement: 5,
      accuracy: Math.round(d.overall_accuracy) || 75,
      studyHours: 42
    },
    scoreTrend: [
      { date: 'Week 1', score: 55 }, { date: 'Week 2', score: 62 },
      { date: 'Week 3', score: 65 }, { date: 'Week 4', score: 72 },
      { date: 'Week 5', score: 68 }, { date: 'Week 6', score: Math.round(d.overall_accuracy) || 75 },
    ],
    accuracyTrend: [
      { date: 'Week 1', accuracy: 50 }, { date: 'Week 2', accuracy: 58 },
      { date: 'Week 3', accuracy: 63 }, { date: 'Week 4', accuracy: 68 },
      { date: 'Week 5', accuracy: 65 }, { date: 'Week 6', accuracy: Math.round(d.overall_accuracy) || 75 },
    ],
    subjectPerformance: [
      { subject: 'Computer Networks', score: 72, accuracy: 68 },
      { subject: 'Database Systems', score: 85, accuracy: 82 },
      { subject: 'Artificial Intelligence', score: Math.round(d.overall_accuracy) || 65, accuracy: Math.round(d.overall_accuracy) || 62 }
    ],
    topicPerformance: [...(d.strong_topics || []).map(t => ({
      topic: t.topic_name,
      subject: 'AI', // Mocked subject since backend schema doesn't include subject name
      score: Math.round(t.accuracy * 100),
      status: 'strong'
    })), ...(d.weak_topics || []).map(t => ({
      topic: t.topic_name,
      subject: 'AI',
      score: Math.round(t.accuracy * 100),
      status: 'weak'
    }))],
    weakTopics: (d.weak_topics || []).map(t => ({
      topic: t.topic_name,
      subject: 'AI',
      score: Math.round(t.accuracy * 100),
      recommendation: 'Review core concepts and practice numericals.'
    }))
  };
}

export async function getReadiness() {
  const response = await client.get('/performance/me/readiness');
  const d = response.data;
  
  // Map backend response to what Readiness.jsx expects
  return {
    overallScore: Math.round(d.readiness_score) || 0,
    examDate: 'Sep 15, 2026', // Mocked fallback
    daysLeft: 21,
    estimatedStudyHoursNeeded: 45,
    breakdown: {
      accuracy: d.factors?.find(f => f.name.toLowerCase().includes('accuracy'))?.value || 70,
      coverage: d.factors?.find(f => f.name.toLowerCase().includes('coverage'))?.value || 60,
      consistency: d.factors?.find(f => f.name.toLowerCase().includes('consistency'))?.value || 85,
      confidence: d.factors?.find(f => f.name.toLowerCase().includes('confidence'))?.value || 65,
    },
    subjectReadiness: [
      { subject: 'Computer Networks', status: 'on_track', score: 82, topicsReady: 12, totalTopics: 15 },
      { subject: 'Database Systems', status: 'needs_attention', score: 65, topicsReady: 8, totalTopics: 14 }
    ],
    riskAreas: (d.risk_areas || []).map(r => ({
      topic: r.topic_name,
      subject: 'AI', // Mocked subject
      risk: r.risk_level.toLowerCase(),
      reason: r.reason
    })),
    recommendations: (d.recommendations || []).map(r => ({
      action: r.message,
      estimatedTime: '2h',
      priority: r.priority.toLowerCase()
    }))
  };
}

import { mockDashboardData } from '../data/mockData';

// Temporary compatibility for dashboard
export async function getDashboard() {
  // Can aggregate endpoints here or call academic analytics
  try {
    const response = await client.get('/academic-analytics/dashboard');
    return response.data;
  } catch (error) {
    // If backend doesn't have a single dashboard endpoint, we might have to aggregate
    console.warn("Dashboard endpoint failed, falling back to mock data", error.message);
    return mockDashboardData;
  }
}
