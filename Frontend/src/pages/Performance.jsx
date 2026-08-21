import React, { useEffect, useState } from 'react';
import { getPerformanceOverview, getTopicsPerformance } from '../services/performance';
import { getResults } from '../services/results';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

/**
 * Performance page — connected to:
 *   GET /api/v1/performance/me
 *   GET /api/v1/performance/me/topics
 *   GET /api/v1/results (for recent test history)
 */
const Performance = () => {
  const [overview, setOverview] = useState(null);
  const [topicData, setTopicData] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [overviewRes, topicsRes, resultsRes] = await Promise.all([
          getPerformanceOverview(),
          getTopicsPerformance(),
          getResults({ limit: 5 }),
        ]);
        setOverview(overviewRes);
        // Build chart data from real topic performance
        setTopicData(topicsRes.map(t => ({
          name: t.topic_name,
          score: Math.round(t.accuracy),
          accuracy: Math.round(t.accuracy),
        })));
        setResults(resultsRes.items || []);
      } catch (err) {
        setError(err.message || 'Failed to load performance data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-muted"><i className="fas fa-spinner fa-spin mr-2"></i>Loading analytics...</div>;
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div style={{ color: '#ef4444', marginBottom: '8px' }}><i className="fas fa-exclamation-triangle"></i></div>
        <p className="text-muted">{error}</p>
      </div>
    );
  }

  const getScoreColor = (pct) => {
    if (pct >= 80) return 'text-success';
    if (pct >= 60) return 'text-warning';
    return 'text-danger';
  };

  return (
    <div className="performance-page max-w-5xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h3 className="text-2xl font-bold">Performance Analytics</h3>
          <p className="text-muted text-sm mt-1">Track your progress across topics and assessments.</p>
        </div>
      </div>

      {/* Summary Cards */}
      {overview && (
        <div className="grid-3col mb-8">
          <div className="card p-4 text-center">
            <div className="text-3xl font-bold text-primary mb-1">{Math.round(overview.overall_accuracy)}%</div>
            <div className="text-sm text-muted">Overall Accuracy</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-3xl font-bold text-success mb-1">{overview.strong_topics?.length ?? 0}</div>
            <div className="text-sm text-muted">Strong Topics</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-3xl font-bold text-danger mb-1">{overview.weak_topics?.length ?? 0}</div>
            <div className="text-sm text-muted">Weak Topics</div>
          </div>
        </div>
      )}

      <div className="grid-2col mb-8">
        <div className="card">
          <div className="card-header">
            <h4><i className="fas fa-chart-bar text-purple-600 mr-2"></i>Accuracy by Topic</h4>
          </div>
          {topicData.length > 0 ? (
            <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
              <ResponsiveContainer>
                <BarChart data={topicData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#7a9abb', fontSize: 11 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#7a9abb', fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', background: '#fff' }}
                    cursor={{ fill: 'rgba(59,130,246,0.05)' }}
                  />
                  <Bar dataKey="accuracy" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="p-4 text-muted text-sm">No topic performance data available yet. Take some exams first.</p>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h4><i className="fas fa-triangle-exclamation text-danger mr-2"></i>Weak Topics</h4>
          </div>
          {overview?.weak_topics?.length > 0 ? (
            <ul className="p-2" style={{ listStyle: 'none', padding: 0 }}>
              {overview.weak_topics.map(t => (
                <li key={t.topic_id} className="flex justify-between items-center p-3 border-b border-light last:border-0">
                  <span className="text-sm font-medium">{t.topic_name}</span>
                  <span className={`text-sm font-bold ${getScoreColor(t.accuracy)}`}>{Math.round(t.accuracy)}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-muted text-sm">No weak topics detected yet.</p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h4><i className="fas fa-history text-blue-600 mr-2"></i>Recent Test Submissions</h4>
        </div>
        {results.length > 0 ? (
          <div className="mock-preview mt-2">
            {results.map((res) => {
              const pct = Math.round(res.percentage);
              const borderClass = pct >= 80 ? 'border-l-success' : pct >= 60 ? 'border-l-warning' : 'border-l-danger';
              const scoreClass = pct >= 80 ? 'text-success' : pct >= 60 ? 'text-warning' : 'text-danger';
              return (
                <div key={res.id} className={`mock-row flex items-center gap-3 p-3 bg-input rounded-md border-l-4 ${borderClass}`}>
                  <span className="icon text-primary text-lg"><i className="fas fa-file-alt"></i></span>
                  <div className="detail flex-1">
                    <div className="name text-sm font-medium">Exam Result</div>
                    <div className="sub text-xs text-light mt-0.5">{res.obtained_marks}/{res.total_marks} marks · {res.pass_status ? 'Passed' : 'Failed'}</div>
                  </div>
                  <span className={`score font-bold text-lg ${scoreClass}`}>{pct}%</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="p-4 text-muted text-sm">No exam results yet. Take a theory exam to see your performance here.</p>
        )}
      </div>
    </div>
  );
};

export default Performance;
