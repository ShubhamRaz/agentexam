import React, { useState, useEffect } from 'react';
import { getPracticalSessions, startPracticalSession, getPracticalSession, saveSubmission, submitPracticalSession } from '../services/practical';
import { getSubjects } from '../services/syllabus';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';

/**
 * Practical page — connected to:
 *   GET  /api/v1/practical (list sessions)
 *   POST /api/v1/practical/start (create new session)
 *   GET  /api/v1/practical/{session_id} (resume session)
 *   PUT  /api/v1/practical/{session_id}/submissions (save work)
 *   POST /api/v1/practical/{session_id}/submit (finalize)
 */
const Practical = () => {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [starting, setStarting] = useState(false);
  const [codeValue, setCodeValue] = useState('# Write your solution here\n');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      try {
        const [sessionsData, subjectsData] = await Promise.all([
          getPracticalSessions({ limit: 20 }),
          getSubjects({ limit: 50 }),
        ]);
        setSessions(sessionsData.items || []);
        setSubjects(subjectsData);
        if (subjectsData.length > 0) setSelectedSubject(subjectsData[0].id);
      } catch (err) {
        setError(err.message || 'Failed to load practical sessions.');
      } finally {
        setLoading(false);
      }
    };
    loadInitial();
  }, []);

  const handleStartSession = async () => {
    if (!selectedSubject) return;
    setStarting(true);
    setError('');
    try {
      const session = await startPracticalSession({ subject_id: selectedSubject });
      setActiveSession(session);
      setCodeValue('# Write your solution here\n');
    } catch (err) {
      setError(err.message || 'Failed to start practical session.');
    } finally {
      setStarting(false);
    }
  };

  const handleResumeSession = async (sessionId) => {
    try {
      const session = await getPracticalSession(sessionId);
      setActiveSession(session);
      setCodeValue('# Resume your work here\n');
    } catch (err) {
      setError(err.message || 'Failed to resume session.');
    }
  };

  const handleSaveAndSubmit = async () => {
    if (!activeSession) return;
    setSubmitting(true);
    try {
      if (activeSession.assigned_experiments?.length > 0) {
        await saveSubmission(activeSession.id, {
          experiment_id: activeSession.assigned_experiments[0].id,
          answer_text: codeValue,
        });
      }
      await submitPracticalSession(activeSession.id);
      setActiveSession(null);
      // Refresh sessions list
      const data = await getPracticalSessions({ limit: 20 });
      setSessions(data.items || []);
    } catch (err) {
      setError(err.message || 'Failed to submit session.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      SUBMITTED: { bg: '#dcfce7', color: '#166534', label: 'Submitted' },
      IN_PROGRESS: { bg: '#fef3c7', color: '#854d0e', label: 'In Progress' },
      PENDING: { bg: '#f3f4f6', color: '#374151', label: 'Pending' },
    };
    const s = styles[status] || styles.PENDING;
    return <span style={{ background: s.bg, color: s.color, padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>{s.label}</span>;
  };

  if (loading) return <LoadingState message="Loading practical experiments..." />;

  if (activeSession) {
    const experiment = activeSession.assigned_experiments?.[0];
    return (
      <div className="page-container p-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setActiveSession(null)} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', cursor: 'pointer' }}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
            {experiment?.title || 'Practical Session'}
          </h2>
        </div>

        {error && (
          <div className="card p-4 mb-4" style={{ background: '#fee2e2', color: '#991b1b' }}>
            <i className="fas fa-exclamation-circle mr-2"></i>{error}
          </div>
        )}

        <div className="grid-3col" style={{ gap: '24px' }}>
          <div className="flex flex-col gap-4">
            <div className="card p-5">
              <h3 className="font-bold mb-2">Instructions</h3>
              <p className="text-sm text-muted mb-4">
                {experiment?.description || 'Complete the practical task and submit your work.'}
              </p>
              <h4 className="font-bold text-sm mb-1">Duration</h4>
              <p className="text-sm text-muted">{activeSession.duration_minutes ?? 45} Minutes</p>
            </div>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <div className="card h-full flex flex-col">
              <div className="p-3 flex justify-between items-center"
                style={{ borderBottom: '1px solid var(--border)', background: '#1e1e1e', borderTopLeftRadius: 'var(--radius)', borderTopRightRadius: 'var(--radius)' }}>
                <span style={{ color: '#d4d4d4', fontFamily: 'monospace' }}>solution.py</span>
              </div>
              <textarea
                className="w-full flex-grow p-4"
                style={{ background: '#1e1e1e', color: '#d4d4d4', fontFamily: 'monospace', minHeight: '400px', border: 'none', outline: 'none', resize: 'vertical' }}
                value={codeValue}
                onChange={e => setCodeValue(e.target.value)}
              />
              <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={handleSaveAndSubmit}
                  disabled={submitting}
                  className="btn btn-primary w-full"
                  style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '10px', borderRadius: 'var(--radius-md)', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 'bold', width: '100%' }}
                >
                  {submitting ? <><i className="fas fa-spinner fa-spin mr-2"></i>Submitting...</> : 'Submit Experiment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container p-6">
      <div className="mb-6 flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>Practical & Lab</h2>
          <p className="text-muted">Simulate lab experiments and coding tasks.</p>
        </div>
        <div className="flex gap-3 items-center">
          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-card)' }}
          >
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button
            onClick={handleStartSession}
            disabled={starting || !selectedSubject}
            style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {starting ? <><i className="fas fa-spinner fa-spin mr-2"></i>Starting...</> : <><i className="fas fa-plus mr-2"></i>New Session</>}
          </button>
        </div>
      </div>

      {error && (
        <div className="card p-4 mb-4" style={{ background: '#fee2e2', color: '#991b1b' }}>
          <i className="fas fa-exclamation-circle mr-2"></i>{error}
        </div>
      )}

      {sessions.length === 0 ? (
        <EmptyState title="No Practical Sessions" message="Start a new session by selecting a subject above." icon="fa-flask" />
      ) : (
        <div className="grid-2col">
          {sessions.map((s) => (
            <div key={s.id} className="card p-5">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg" style={{ color: 'var(--text-main)' }}>Practical Session</h3>
                {getStatusBadge(s.status)}
              </div>
              <p className="text-sm text-muted mb-4">Duration: {s.duration_minutes}m · {s.total_marks} marks</p>
              <div className="flex justify-end">
                <button
                  onClick={() => handleResumeSession(s.id)}
                  disabled={s.status === 'SUBMITTED'}
                  style={{
                    background: s.status === 'SUBMITTED' ? 'var(--bg-input)' : 'var(--primary)',
                    color: s.status === 'SUBMITTED' ? 'var(--text-muted)' : 'white',
                    border: 'none', padding: '8px 16px', borderRadius: 'var(--radius-md)',
                    cursor: s.status === 'SUBMITTED' ? 'not-allowed' : 'pointer',
                  }}
                >
                  {s.status === 'SUBMITTED' ? 'Submitted' : 'Resume'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Practical;
