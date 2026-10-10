import client from './client';

/**
 * GET /performance/me → PerformanceOverviewResponse
 * Maps backend response to what Performance.jsx expects.
 */
export async function getPerformance() {
  const response = await client.get('/performance/me');
  const d = response.data;

  // Collect all topics (strong + weak + insufficient) for subject grouping
  const allTopics = [
    ...(d.strong_topics || []).map(t => ({ ...t, status: 'strong' })),
    ...(d.weak_topics || []).map(t => ({ ...t, status: 'weak' })),
    ...(d.insufficient_data_topics || []).map(t => ({ ...t, status: 'insufficient' })),
  ];

  const totalAttempts = allTopics.reduce((sum, t) => sum + (t.attempts || 0), 0);
  const overallAccuracy = Math.round(d.overall_accuracy) || 0;

  // Group by subject_id for subject performance breakdown
  const subjectMap = {};
  allTopics.forEach(t => {
    const sid = t.subject_id;
    if (!subjectMap[sid]) {
      subjectMap[sid] = { subject_id: sid, topicScores: [], totalAttempts: 0 };
    }
    subjectMap[sid].topicScores.push(t.accuracy || 0);
    subjectMap[sid].totalAttempts += t.attempts || 0;
  });

  const subjectPerformance = Object.values(subjectMap).map(s => {
    const avgScore = s.topicScores.length > 0
      ? Math.round(s.topicScores.reduce((a, b) => a + b, 0) / s.topicScores.length)
      : 0;
    return {
      subject: s.subject_id, // Will be a UUID; frontend can resolve the name
      score: avgScore,
      accuracy: avgScore,
    };
  });

  return {
    overall: {
      totalTests: totalAttempts,
      averageScore: overallAccuracy,
      improvement: 0,
      accuracy: overallAccuracy,
      studyHours: 0
    },
    scoreTrend: [],
    accuracyTrend: [],
    subjectPerformance,
    topicPerformance: allTopics.map(t => ({
      topic: t.topic_name,
      subject: t.subject_id,
      score: Math.round(t.accuracy || 0),
      status: t.status
    })),
    weakTopics: (d.weak_topics || []).map(t => ({
      topic: t.topic_name,
      subject: t.subject_id,
      score: Math.round(t.accuracy || 0),
      recommendation: 'Review core concepts and practice more questions on this topic.'
    }))
  };
}

/**
 * GET /performance/me/readiness → ReadinessResponse
 * Maps backend response to what Readiness.jsx expects.
 */
export async function getReadiness() {
  const response = await client.get('/performance/me/readiness');
  const d = response.data;

  return {
    overallScore: d.readiness_score != null ? Math.round(d.readiness_score) : 0,
    status: d.status || 'INSUFFICIENT_DATA',
    estimatedStudyHoursNeeded: 0,
    breakdown: {
      accuracy: d.factors?.find(f => f.name.toLowerCase().includes('accuracy'))?.value || 0,
      topicsAttempted: d.factors?.find(f => f.name.toLowerCase().includes('topics'))?.value || 0,
    },
    subjectReadiness: [],
    riskAreas: (d.risk_areas || []).map(r => ({
      topic: r.topic_name,
      subject: r.topic_id,
      risk: r.risk_level.toLowerCase(),
      reason: r.reason
    })),
    recommendations: (d.recommendations || []).map(r => ({
      action: r.message,
      estimatedTime: '',
      priority: r.priority.toLowerCase()
    }))
  };
}

/**
 * Dashboard data — aggregates performance, recent exams, and study plan.
 * Falls back gracefully when individual endpoints have no data.
 */
export async function getDashboard() {
  // Fetch data from multiple backend endpoints in parallel
  const [perfResult, readinessResult, examsResult, planResult, userResult] = await Promise.allSettled([
    client.get('/performance/me'),
    client.get('/performance/me/readiness'),
    client.get('/exams', { params: { limit: 5 } }),
    client.get('/study-plan/me'),
    client.get('/auth/me'),
  ]);

  const perf = perfResult.status === 'fulfilled' ? perfResult.value.data : null;
  const readiness = readinessResult.status === 'fulfilled' ? readinessResult.value.data : null;
  const exams = examsResult.status === 'fulfilled' ? examsResult.value.data : null;
  const plan = planResult.status === 'fulfilled' ? planResult.value.data : null;
  const user = userResult.status === 'fulfilled' ? userResult.value.data : null;

  const overallAccuracy = perf ? Math.round(perf.overall_accuracy) : 0;
  const readinessScore = readiness?.readiness_score != null ? Math.round(readiness.readiness_score) : 0;

  // Build today tasks from study plan
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTasks = [];
  if (plan && plan.tasks) {
    plan.tasks.forEach(task => {
      if (task.date === todayStr || !task.date) {
        todayTasks.push({
          id: task.id || task.title,
          title: task.title || task.topic || 'Study Session',
          subject: task.subject || 'General',
          priority: task.priority || 'medium',
          duration: task.duration || '1h',
          completed: task.completed || task.status === 'completed' || false,
        });
      }
    });
  }

  // Build recent tests from exam history
  const recentTests = [];
  if (exams && exams.items) {
    exams.items.slice(0, 3).forEach(exam => {
      recentTests.push({
        type: (exam.test_type || 'mock').toLowerCase(),
        name: `${exam.test_type || 'Mock'} Test`,
        score: exam.obtained_marks || 0,
        date: exam.started_at ? new Date(exam.started_at).toLocaleDateString() : '',
      });
    });
  }

  // Build weak topics
  const weakTopics = (perf?.weak_topics || []).slice(0, 3).map(t => ({
    score: Math.round(t.accuracy || 0),
    topic: t.topic_name,
    subject: t.subject_id,
    recommendation: 'Review core concepts and practice more questions.'
  }));

  // Build subject performance from topic data
  const allTopics = [
    ...(perf?.strong_topics || []),
    ...(perf?.weak_topics || []),
    ...(perf?.insufficient_data_topics || []),
  ];
  const subjectMap = {};
  allTopics.forEach(t => {
    const sid = t.subject_id;
    if (!subjectMap[sid]) {
      subjectMap[sid] = { subject: sid, scores: [], totalAttempts: 0 };
    }
    subjectMap[sid].scores.push(t.accuracy || 0);
    subjectMap[sid].totalAttempts += t.attempts || 0;
  });
  const subjectPerformance = Object.values(subjectMap).map(s => ({
    subject: s.subject,
    score: Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length),
    tests: s.totalAttempts,
    accuracy: Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length),
  }));

  const totalTests = allTopics.reduce((sum, t) => sum + (t.attempts || 0), 0);

  return {
    student: {
      name: user?.name || 'Student',
      streak: 0,
      averageScore: overallAccuracy,
      testsCompleted: totalTests,
      totalStudyHours: 0
    },
    readinessScore,
    daysLeft: 0,
    examDate: '',
    recentTests,
    recentActivity: [],
    todayTasks,
    weakTopics,
    subjectPerformance,
  };
}
