import React, { useState, useEffect } from 'react';
import { getReadiness } from '../services/performance';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';

/**
 * Readiness page — connected to:
 *   GET /api/v1/performance/me/readiness
 */
const Readiness = () => {
  const [loading, setLoading] = useState(true);
  const [readiness, setReadiness] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getReadiness();
        setReadiness(data);
      } catch (err) {
        setError(err.message || 'Failed to load readiness data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LoadingState message="Calculating your readiness..." />;

  if (error) {
    return (
      <div className="p-6">
        <div className="card p-8 text-center" style={{ color: '#ef4444' }}>
          <i className="fas fa-exclamation-triangle text-3xl mb-4"></i>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!readiness || readiness.status === 'INSUFFICIENT_DATA') {
    return (
      <div className="p-6">
        <EmptyState
          title="Insufficient Data"
          message="You need to attempt more assessments to generate a readiness score. Complete at least 5 exam attempts."
          icon="fa-chart-pie"
        />
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'HIGH': return '#22c55e';
      case 'MODERATE': return '#eab308';
      case 'LOW': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const statusColor = getStatusColor(readiness.status);
  const score = readiness.readiness_score != null ? Math.round(readiness.readiness_score) : 0;

  return (
    <div className="page-container p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>Exam Readiness</h2>
        <p className="text-muted">Based on your recent performance, here is your predicted readiness.</p>
      </div>

      <div className="grid-3col" style={{ gap: '24px', marginBottom: '24px' }}>
        {/* Score Ring */}
        <div className="card p-6 flex flex-col items-center justify-center">
          <div className="relative mb-4" style={{
            width: '120px', height: '120px', borderRadius: '50%',
            background: `conic-gradient(${statusColor} ${score}%, var(--bg-input) 0)`
          }}>
            <div className="absolute inset-0 flex items-center justify-center m-2" style={{ borderRadius: '50%', background: 'var(--bg-card)' }}>
              <span className="text-3xl font-bold" style={{ color: statusColor }}>{score}%</span>
            </div>
          </div>
          <h3 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>{readiness.status}</h3>
          <p className="text-sm mt-2 text-center text-muted">Readiness Level</p>
        </div>

        {/* Risk Areas */}
        <div className="card p-6" style={{ gridColumn: 'span 2' }}>
          <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-main)' }}>Risk Areas</h3>
          {readiness.risk_areas.length === 0 ? (
            <p className="text-muted">No significant risk areas detected. Keep up the good work!</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {readiness.risk_areas.map((risk, idx) => (
                <li key={idx} className="flex gap-4 p-3 rounded" style={{
                  background: 'var(--bg-main)',
                  borderLeft: `4px solid ${risk.risk_level === 'HIGH' ? '#ef4444' : risk.risk_level === 'MEDIUM' ? '#f59e0b' : '#22c55e'}`
                }}>
                  <div className="flex flex-col">
                    <span className="font-semibold" style={{ color: 'var(--text-main)' }}>{risk.topic_name}</span>
                    <span className="text-sm text-muted">{risk.reason}</span>
                  </div>
                  <span className="ml-auto text-xs font-bold" style={{
                    color: risk.risk_level === 'HIGH' ? '#ef4444' : '#f59e0b',
                    alignSelf: 'center',
                  }}>{risk.risk_level}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div className="card p-6">
        <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-main)' }}>Recommendations</h3>
        {readiness.recommendations.length === 0 ? (
          <p className="text-muted">No specific recommendations at this time.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {readiness.recommendations.map((rec, idx) => (
              <div key={idx} className="flex items-start gap-4 p-4 rounded" style={{ border: '1px solid var(--border)' }}>
                <div style={{ color: rec.priority === 'HIGH' ? '#ef4444' : rec.priority === 'MEDIUM' ? '#eab308' : '#3b82f6' }}>
                  <i className="fas fa-lightbulb text-xl"></i>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold" style={{
                      background: rec.priority === 'HIGH' ? '#fee2e2' : rec.priority === 'MEDIUM' ? '#fef3c7' : '#dbeafe',
                      color: rec.priority === 'HIGH' ? '#991b1b' : rec.priority === 'MEDIUM' ? '#854d0e' : '#1e40af',
                      padding: '2px 8px', borderRadius: '4px',
                    }}>{rec.priority}</span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-main)' }}>{rec.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Readiness;
