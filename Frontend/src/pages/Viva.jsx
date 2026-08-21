import React, { useState, useEffect } from 'react';
import { getVivaSessions, startVivaSession, getVivaSession, saveVivaAnswer, submitVivaSession } from '../services/viva';
import { getSubjects } from '../services/syllabus';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';

/**
 * Viva page — connected to:
 *   GET  /api/v1/vivas (list sessions)
 *   POST /api/v1/vivas/start (create + start session, returns questions)
 *   GET  /api/v1/vivas/{session_id} (resume session)
 *   PUT  /api/v1/vivas/{session_id}/answers/{question_id} (save answer)
 *   POST /api/v1/vivas/{session_id}/submit (finalize)
 */
const Viva = () => {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [starting, setStarting] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [savingAnswer, setSavingAnswer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      try {
        const [sessionsData, subjectsData] = await Promise.all([
          getVivaSessions({ limit: 20 }),
          getSubjects({ limit: 50 }),
        ]);
        setSessions(sessionsData.items || []);
        setSubjects(subjectsData);
        if (subjectsData.length > 0) setSelectedSubject(subjectsData[0].id);
      } catch (err) {
        setError(err.message || 'Failed to load viva sessions.');
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
      const session = await startVivaSession({ subject_id: selectedSubject });
      setActiveSession(session);
      setCurrentQIndex(0);
      setAnswerText('');
    } catch (err) {
      setError(err.message || 'Failed to start viva session.');
    } finally {
      setStarting(false);
    }
  };

  const handleSaveAnswer = async () => {
    if (!activeSession || !answerText.trim()) return;
    const currentQ = activeSession.questions?.[currentQIndex];
    if (!currentQ) return;
    setSavingAnswer(true);
    try {
      await saveVivaAnswer(activeSession.id, currentQ.id, {
        question_id: currentQ.id,
        answer_text: answerText,
      });
    } catch (err) {
      setError(err.message || 'Failed to save answer.');
    } finally {
      setSavingAnswer(false);
    }
  };

  const handleNextQuestion = async () => {
    await handleSaveAnswer();
    const nextIdx = currentQIndex + 1;
    if (nextIdx < (activeSession.questions?.length || 0)) {
      setCurrentQIndex(nextIdx);
      setAnswerText('');
    }
  };

  const handleSubmitViva = async () => {
    await handleSaveAnswer();
    setSubmitting(true);
    try {
      await submitVivaSession(activeSession.id);
      setActiveSession(null);
      const data = await getVivaSessions({ limit: 20 });
      setSessions(data.items || []);
    } catch (err) {
      setError(err.message || 'Failed to submit viva session.');
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

  if (loading) return <LoadingState message="Loading viva sessions..." />;

  if (activeSession) {
    const questions = activeSession.questions || [];
    const currentQ = questions[currentQIndex];
    const isLast = currentQIndex === questions.length - 1;

    return (
      <div className="page-container p-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setActiveSession(null)} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', cursor: 'pointer' }}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>AI Viva Session</h2>
        </div>

        {error && (
          <div className="card p-4 mb-4" style={{ background: '#fee2e2', color: '#991b1b' }}>
            <i className="fas fa-exclamation-circle mr-2"></i>{error}
          </div>
        )}

        {questions.length === 0 ? (
          <EmptyState title="No Questions Assigned" message="No viva questions were found for this session." icon="fa-microphone" />
        ) : (
          <div className="card p-6">
            <div className="flex justify-between items-center mb-6">
              <span className="text-sm text-muted">Question {currentQIndex + 1} of {questions.length}</span>
              <span className="font-bold" style={{ color: 'var(--text-main)' }}>{currentQ?.marks} marks</span>
            </div>

            <div className="p-4 rounded mb-6" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <p className="text-lg" style={{ color: 'var(--text-main)' }}>{currentQ?.question_text || 'Loading question...'}</p>
            </div>

            <div className="mb-4">
              <label className="font-semibold text-sm mb-2 block" style={{ color: 'var(--text-main)' }}>Your Answer</label>
              <textarea
                value={answerText}
                onChange={e => setAnswerText(e.target.value)}
                placeholder="Type your answer here..."
                style={{
                  width: '100%', minHeight: '150px', padding: '12px',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                  background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none', resize: 'vertical', boxSizing: 'border-box'
                }}
              />
            </div>

            <div className="flex justify-end gap-3">
              {!isLast ? (
                <button
                  onClick={handleNextQuestion}
                  disabled={savingAnswer}
                  style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {savingAnswer ? 'Saving...' : 'Save & Next'}
                </button>
              ) : (
                <button
                  onClick={handleSubmitViva}
                  disabled={submitting}
                  style={{ background: '#22c55e', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {submitting ? <><i className="fas fa-spinner fa-spin mr-2"></i>Submitting...</> : 'Submit Viva'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page-container p-6">
      <div className="mb-6 flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>AI Viva</h2>
          <p className="text-muted">Practice oral exam questions answered by AI assessment.</p>
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
            {starting ? <><i className="fas fa-spinner fa-spin mr-2"></i>Starting...</> : <><i className="fas fa-microphone mr-2"></i>Start Viva</>}
          </button>
        </div>
      </div>

      {error && (
        <div className="card p-4 mb-4" style={{ background: '#fee2e2', color: '#991b1b' }}>
          <i className="fas fa-exclamation-circle mr-2"></i>{error}
        </div>
      )}

      {sessions.length === 0 ? (
        <EmptyState title="No Viva Sessions" message="Start a new viva session by selecting a subject above." icon="fa-microphone" />
      ) : (
        <div className="flex flex-col gap-4">
          {sessions.map((s) => (
            <div key={s.id} className="card p-4 flex justify-between items-center">
              <div>
                <div className="font-semibold" style={{ color: 'var(--text-main)' }}>Viva Session</div>
                <div className="text-sm text-muted">{s.duration_minutes}m · {s.total_marks} marks</div>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(s.status)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Viva;
