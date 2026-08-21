import React, { useState, useEffect } from 'react';
import { getPYQs } from '../services/pyqs';
import { getSubjects } from '../services/syllabus';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';

/**
 * PYQs page — connected to:
 *   GET /api/v1/pyqs/
 *   GET /api/v1/subjects/ (for subject filter)
 */
const PYQs = () => {
  const [loading, setLoading] = useState(true);
  const [pyqs, setPyqs] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filterSubjectId, setFilterSubjectId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Load subjects for filter dropdown
    getSubjects({ limit: 50 }).then(data => setSubjects(data)).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchPYQs = async () => {
      setLoading(true);
      setError('');
      try {
        const params = { limit: 50 };
        if (filterSubjectId) params.subjectId = filterSubjectId;
        const data = await getPYQs(params);
        setPyqs(data);
      } catch (err) {
        setError(err.message || 'Failed to load PYQs.');
      } finally {
        setLoading(false);
      }
    };
    fetchPYQs();
  }, [filterSubjectId]);

  if (loading) return <LoadingState message="Loading PYQs..." />;

  return (
    <div className="page-container p-4">
      <div className="flex justify-between items-center mb-8" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="text-3xl font-bold mb-2">Previous Year Questions</h2>
          <p className="text-muted text-sm">Browse and practice questions from past exams.</p>
        </div>

        <div className="flex gap-4">
          <select
            value={filterSubjectId}
            onChange={e => setFilterSubjectId(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)', background: 'var(--bg-card)',
              color: 'var(--text-main)',
            }}
          >
            <option value="">All Subjects</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="card p-4 mb-4" style={{ background: '#fee2e2', color: '#991b1b' }}>
          <i className="fas fa-exclamation-circle mr-2"></i>{error}
        </div>
      )}

      {!error && pyqs.length === 0 ? (
        <EmptyState
          title="No Questions Found"
          message="No PYQ materials have been uploaded or processed yet."
          icon="fa-search"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {pyqs.map((q, idx) => (
            <div key={q.id || idx} className="card p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2 items-center flex-wrap">
                  <span style={{ background: 'var(--primary-light, #dbeafe)', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                    {q.material_type || 'PYQ'}
                  </span>
                </div>
              </div>
              <p className="text-lg" style={{ color: 'var(--text-main)' }}>{q.title}</p>
              <div className="mt-4 flex justify-end">
                <a
                  href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/materials/${q.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{
                    padding: '6px 16px', background: 'var(--primary)', color: 'white',
                    borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                    textDecoration: 'none', fontSize: '13px'
                  }}
                >
                  <i className="fas fa-download mr-1"></i> Download PYQ
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PYQs;
