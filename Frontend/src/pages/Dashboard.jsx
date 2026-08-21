import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProgressRing from '../components/ui/ProgressRing';
import { getPerformanceOverview } from '../services/performance';
import { getReadiness } from '../services/performance';
import { getResults } from '../services/results';
import { useAuth } from '../context/AuthContext';

/**
 * Dashboard — connected to real backend APIs:
 *   GET /api/v1/performance/me
 *   GET /api/v1/performance/me/readiness
 *   GET /api/v1/results
 *
 * Falls back gracefully if data is unavailable (e.g., new user with no exam history).
 */
const Dashboard = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [recentResults, setRecentResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [overviewData, readinessData, resultsData] = await Promise.all([
          getPerformanceOverview().catch(() => null),
          getReadiness().catch(() => null),
          getResults({ limit: 4 }).catch(() => ({ items: [] })),
        ]);
        setOverview(overviewData);
        setReadiness(readinessData);
        setRecentResults(resultsData?.items || []);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const readinessScore = readiness?.readiness_score != null ? Math.round(readiness.readiness_score) : null;
  const readinessStatus = readiness?.status ?? 'INSUFFICIENT_DATA';
  const overallAccuracy = overview?.overall_accuracy != null ? Math.round(overview.overall_accuracy) : null;
  const weakTopicCount = overview?.weak_topics?.length ?? 0;
  const strongTopicCount = overview?.strong_topics?.length ?? 0;

  const getReadinessColor = (status) => {
    if (status === 'HIGH') return '#22c55e';
    if (status === 'MODERATE') return '#eab308';
    if (status === 'LOW') return '#ef4444';
    return '#6b7280';
  };

  return (
    <div className="dashboard">
      {/* Readiness Card */}
      <div className="readiness-card mb-8">
        <div className="readiness-left">
          <ProgressRing
            size={80}
            strokeWidth={8}
            percentage={readinessScore ?? 0}
            color={getReadinessColor(readinessStatus)}
          />
          <div className="readiness-text">
            <h3>Exam Readiness: {' '}
              {readinessScore != null
                ? <span style={{ color: getReadinessColor(readinessStatus) }}>{readinessScore}%</span>
                : <span style={{ color: '#6b7280' }}>No data yet</span>
              }
            </h3>
            {readinessStatus === 'INSUFFICIENT_DATA'
              ? <p>Take at least 5 assessments to see your readiness score.</p>
              : readiness?.recommendations?.[0]
                ? <p>{readiness.recommendations[0].message}</p>
                : <p>Keep up the great work!</p>
            }
          </div>
        </div>
        <div className="readiness-action">
          <Link to="/exams" className="btn btn-primary"><i className="fas fa-play"></i> Start Mock Test</Link>
          <Link to="/performance" className="btn btn-outline-light"><i className="fas fa-chart-line"></i> View Report</Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid-3col mb-8">
        <div className="card">
          <div className="card-header">
            <h4><i className="fas fa-file-alt text-blue-600 mr-2"></i>Overall Accuracy</h4>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {overallAccuracy != null ? `${overallAccuracy}%` : '—'}
            </span>
          </div>
          <div className="flex gap-4 mt-2 text-sm text-muted">
            <span><span className="font-semibold text-success">{strongTopicCount}</span> strong topics</span>
            <span><span className="font-semibold text-danger">{weakTopicCount}</span> weak topics</span>
          </div>
          <div className="quick-actions mt-4 flex gap-3">
            <Link to="/exams" className="btn btn-primary btn-sm flex-1"><i className="fas fa-plus"></i> New Test</Link>
            <Link to="/performance" className="btn btn-secondary btn-sm flex-1"><i className="fas fa-chart-line"></i> Analytics</Link>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h4><i className="fas fa-flask text-purple-600 mr-2"></i>Practical / Viva</h4>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{recentResults.length}</span>
            <span className="text-sm text-light">recent results</span>
          </div>
          <div className="quick-actions mt-4 flex gap-3">
            <Link to="/viva" className="btn btn-purple btn-sm flex-1"><i className="fas fa-microphone"></i> Start Viva</Link>
            <Link to="/practical" className="btn btn-secondary btn-sm flex-1"><i className="fas fa-code"></i> Lab</Link>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h4><i className="fas fa-tasks text-warning mr-2"></i>Study Plan</h4>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{weakTopicCount}</span>
            <span className="text-sm text-light">topics to review</span>
          </div>
          <div className="flex gap-4 mt-2 text-sm text-muted">
            <span><span className="font-semibold text-danger">{weakTopicCount}</span> weak</span>
          </div>
          <div className="quick-actions mt-4 flex gap-3">
            <Link to="/study-plan" className="btn btn-secondary btn-sm flex-1"><i className="fas fa-eye"></i> View Plan</Link>
          </div>
        </div>
      </div>

      {/* Weak Topics + Recent Results */}
      <div className="grid-2col mb-8">
        <div className="card">
          <div className="card-header">
            <h4><i className="fas fa-triangle-exclamation text-danger mr-2"></i>Weak Topics</h4>
            <Link to="/performance" className="link">View all</Link>
          </div>
          <div>
            {overview?.weak_topics?.length > 0
              ? overview.weak_topics.map(t => (
                <div className="topic-bar" key={t.topic_id}>
                  <span className="label font-medium" style={{ width: '120px' }}>{t.topic_name}</span>
                  <div className="track flex-1 bg-input rounded-full h-2 overflow-hidden mx-3">
                    <div className="fill h-full rounded-full fill-danger" style={{ width: `${Math.round(t.accuracy)}%` }}></div>
                  </div>
                  <span className="pct text-sm font-semibold w-10 text-right text-danger">{Math.round(t.accuracy)}%</span>
                </div>
              ))
              : <p className="text-sm text-muted p-2">No weak topics yet! Complete some exams.</p>
            }
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h4><i className="fas fa-history text-blue-600 mr-2"></i>Recent Results</h4>
            <Link to="/results" className="link">All results</Link>
          </div>
          <div className="mock-preview flex flex-col gap-3">
            {recentResults.length > 0
              ? recentResults.map(res => {
                const pct = Math.round(res.percentage);
                const borderClass = pct >= 80 ? 'border-l-success' : pct >= 60 ? 'border-l-warning' : 'border-l-danger';
                const scoreClass = pct >= 80 ? 'text-success' : pct >= 60 ? 'text-warning' : 'text-danger';
                return (
                  <div key={res.id} className={`mock-row flex items-center gap-3 p-3 bg-input rounded-md border-l-4 ${borderClass}`}>
                    <span className="icon text-primary text-lg"><i className="fas fa-file-alt"></i></span>
                    <div className="detail flex-1">
                      <div className="name text-sm font-medium">Exam Result</div>
                      <div className="sub text-xs text-light mt-0.5">
                        {res.obtained_marks}/{res.total_marks} · {res.pass_status ? 'Passed' : 'Failed'}
                      </div>
                    </div>
                    <span className={`score font-bold text-lg ${scoreClass}`}>{pct}%</span>
                  </div>
                );
              })
              : <p className="text-sm text-muted p-2">No exam results yet. Take a mock test!</p>
            }
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-light text-xs text-light flex justify-between flex-wrap gap-2">
        <span>AgentExam v1.0 · AI-powered autonomous exam preparation</span>
        <span><i className="fas fa-shield-alt mr-1"></i> Data encrypted · <i className="fas fa-lock mr-1"></i> Secure</span>
      </div>
    </div>
  );
};

export default Dashboard;
