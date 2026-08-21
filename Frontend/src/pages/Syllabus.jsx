import React, { useState, useEffect } from 'react';
import { getSubjects, getSubjectUnits } from '../services/syllabus';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';

/**
 * Syllabus page — connected to:
 *   GET /api/v1/subjects/
 *   GET /api/v1/subjects/{subject_id}/units   (for each subject's unit breakdown)
 */
const Syllabus = () => {
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [units, setUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [expandedUnits, setExpandedUnits] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSubjects = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getSubjects({ limit: 50 });
        setSubjects(data);
        if (data.length > 0) setSelectedSubject(data[0]);
      } catch (err) {
        setError(err.message || 'Failed to load subjects.');
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (!selectedSubject) return;
    const fetchUnits = async () => {
      setUnitsLoading(true);
      setExpandedUnits({ 0: true });
      try {
        const data = await getSubjectUnits(selectedSubject.id);
        setUnits(data);
      } catch (err) {
        setUnits([]);
      } finally {
        setUnitsLoading(false);
      }
    };
    fetchUnits();
  }, [selectedSubject]);

  const toggleUnit = (index) => {
    setExpandedUnits(prev => ({ ...prev, [index]: !prev[index] }));
  };

  if (loading) return <LoadingState message="Loading syllabus..." />;

  return (
    <div className="page-container p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>Syllabus</h2>
      </div>

      {error && (
        <div className="card p-4 mb-4" style={{ background: '#fee2e2', color: '#991b1b' }}>
          <i className="fas fa-exclamation-circle mr-2"></i>{error}
        </div>
      )}

      {subjects.length === 0 && !error ? (
        <EmptyState title="No Subjects Found" message="No subjects have been added yet." icon="fa-book" />
      ) : (
        <div className="grid-3col" style={{ gap: '24px' }}>
          {/* Units panel */}
          <div style={{ gridColumn: 'span 2' }} className="flex flex-col gap-4">
            {/* Subject selector */}
            <div className="flex gap-2 flex-wrap mb-2">
              {subjects.map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubject(sub)}
                  style={{
                    padding: '6px 14px', borderRadius: '20px', border: '1px solid var(--border)',
                    background: selectedSubject?.id === sub.id ? 'var(--primary)' : 'var(--bg-card)',
                    color: selectedSubject?.id === sub.id ? 'white' : 'var(--text-main)',
                    cursor: 'pointer', fontSize: '13px', fontWeight: '500',
                  }}
                >
                  {sub.name} ({sub.code})
                </button>
              ))}
            </div>

            {unitsLoading ? (
              <LoadingState message="Loading units..." />
            ) : units.length === 0 ? (
              <EmptyState title="No Units Found" message="This subject has no units defined yet." icon="fa-layer-group" />
            ) : (
              units.map((unit, index) => (
                <div key={unit.id} className="card" style={{ overflow: 'hidden' }}>
                  <div
                    className="p-4 flex justify-between items-center cursor-pointer"
                    style={{ borderBottom: expandedUnits[index] ? '1px solid var(--border)' : 'none' }}
                    onClick={() => toggleUnit(index)}
                  >
                    <div>
                      <h3 className="font-semibold text-lg" style={{ color: 'var(--text-main)' }}>
                        Ch. {unit.chapter_no}: {unit.name}
                      </h3>
                      <span className="text-sm text-muted">{unit.topics?.length ?? 0} Topics</span>
                    </div>
                    <i className={`fas fa-chevron-${expandedUnits[index] ? 'up' : 'down'} text-muted`}></i>
                  </div>

                  {expandedUnits[index] && (
                    <div className="p-4" style={{ background: 'var(--bg-main)' }}>
                      {unit.topics?.length > 0 ? (
                        <ul className="flex flex-col gap-2">
                          {unit.topics.map(topic => (
                            <li key={topic.id} className="flex items-center gap-3 p-2 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                              <i className="fas fa-dot-circle" style={{ color: 'var(--color-primary)' }}></i>
                              <span style={{ color: 'var(--text-main)' }}>{topic.name}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted text-sm">No topics in this unit.</p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Sidebar: Subject info */}
          <div>
            {selectedSubject && (
              <div className="card p-4">
                <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-main)' }}>
                  {selectedSubject.name}
                </h3>
                <p className="text-sm text-muted mb-2">Code: <strong>{selectedSubject.code}</strong></p>
                {selectedSubject.description && (
                  <p className="text-sm text-muted">{selectedSubject.description}</p>
                )}
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                  <p className="text-sm text-muted">{units.length} Units · {units.reduce((acc, u) => acc + (u.topics?.length ?? 0), 0)} Topics</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Syllabus;
