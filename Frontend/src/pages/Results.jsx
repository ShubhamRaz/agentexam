import React, { useState, useEffect } from 'react';
import { getResults } from '../services/results';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';

/**
 * Results page — connected to:
 *   GET /api/v1/results
 */
const Results = () => {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getResults({ limit: 50 });
        setResults(data.items || []);
      } catch (err) {
        setError(err.message || 'Failed to load results.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getStatusStyle = (pass_status, pct) => {
    if (pct >= 80) return { bg: '#dbeafe', text: '#1e40af', label: 'EXCELLENT' };
    if (pass_status) return { bg: '#dcfce7', text: '#166534', label: 'PASSED' };
    return { bg: '#fee2e2', text: '#991b1b', label: 'NEEDS IMPROVEMENT' };
  };

  if (loading) return <LoadingState message="Loading your results..." />;

  return (
    <div className="page-container p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>Exam Results</h2>
        <p className="text-muted">Review your past exam performances.</p>
      </div>

      {error && (
        <div className="card p-4 mb-4" style={{ background: '#fee2e2', color: '#991b1b' }}>
          <i className="fas fa-exclamation-circle mr-2"></i>{error}
        </div>
      )}

      {!error && results.length === 0 ? (
        <EmptyState
          title="No Results Found"
          message="You haven't submitted any exams yet. Start a theory exam to see your results here."
          icon="fa-clipboard-check"
        />
      ) : (
        <div className="grid-3col">
          {results.map((res) => {
            const pct = Math.round(res.percentage);
            const statusStyle = getStatusStyle(res.pass_status, pct);
            return (
              <div key={res.id} className="card p-5 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg" style={{ color: 'var(--text-main)' }}>Exam Result</h3>
                </div>

                <div className="flex justify-between items-end mb-4">
                  <div>
                    <div className="text-sm text-muted">Score</div>
                    <div className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
                      {res.obtained_marks}
                      <span className="text-lg text-muted"> / {res.total_marks}</span>
                    </div>
                  </div>
                  <div className="text-xl font-semibold">{pct}%</div>
                </div>

                {res.grade && (
                  <p className="text-sm text-muted mb-2">Grade: <strong>{res.grade}</strong></p>
                )}

                <div className="mt-auto pt-4 flex justify-between items-center" style={{ borderTop: '1px solid var(--border)' }}>
                  <span style={{
                    background: statusStyle.bg, color: statusStyle.text,
                    padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold'
                  }}>
                    {statusStyle.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Results;
