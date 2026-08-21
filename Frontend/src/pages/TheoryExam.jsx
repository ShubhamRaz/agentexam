import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubjects } from '../services/syllabus';
import { createExam, startExam, saveAnswer, submitExam, evaluateExam, getExamResult } from '../services/exams';

/**
 * TheoryExam page — connected to:
 *   GET  /api/v1/subjects/ (subject selection)
 *   POST /api/v1/exams (create exam)
 *   POST /api/v1/exams/{id}/start (start timer, get questions)
 *   PUT  /api/v1/exams/{id}/answers/{question_id} (save answer, idempotent)
 *   POST /api/v1/exams/{id}/submit (finalize)
 *   POST /api/v1/results/exams/{id}/evaluate (trigger evaluation)
 *   GET  /api/v1/results/exams/{id}/result (get result)
 *
 * The frontend does NOT calculate scores. Backend evaluation is authoritative.
 */

const DIFFICULTY_OPTIONS = ['EASY', 'MEDIUM', 'HARD'];

const TheoryExam = () => {
  const navigate = useNavigate();
  const [examState, setExamState] = useState('setup'); // setup | active | submitting | result
  const [subjects, setSubjects] = useState([]);
  const [config, setConfig] = useState({
    subject_id: '',
    difficulty_level: 'MEDIUM',
    question_count: 10,
    duration_minutes: 30,
  });

  const [examId, setExamId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [savedAnswers, setSavedAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Timer state
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);

  // Load subjects on mount
  useEffect(() => {
    getSubjects({ limit: 50 })
      .then(data => {
        setSubjects(data);
        if (data.length > 0) setConfig(c => ({ ...c, subject_id: data[0].id }));
      })
      .catch(() => {});
  }, []);

  // Timer countdown
  useEffect(() => {
    if (examState === 'active' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            handleAutoSubmit();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [examState]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleStartExam = async () => {
    if (!config.subject_id) return;
    setLoading(true);
    setError('');
    try {
      // Create exam
      const exam = await createExam(config);
      // Start exam (begins timer, returns questions)
      const attempt = await startExam(exam.id);
      setExamId(exam.id);
      setQuestions(attempt.questions || []);
      setTimeLeft((attempt.duration_minutes || config.duration_minutes) * 60);
      setCurrentQIndex(0);
      setSavedAnswers({});
      setExamState('active');
    } catch (err) {
      setError(err.message || 'Failed to start exam. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCurrentAnswer = async (questionId, answerData) => {
    if (!examId) return;
    try {
      await saveAnswer(examId, questionId, { question_id: questionId, ...answerData });
      setSavedAnswers(prev => ({ ...prev, [questionId]: answerData }));
    } catch {
      // Non-blocking — we still allow navigation
    }
  };

  const handleAnswerChange = (question, val) => {
    const answerData = question.question_type === 'MCQ' || question.question_type === 'MULTIPLE_CHOICE'
      ? { selected_option_id: val }
      : { answer_text: val };
    setSavedAnswers(prev => ({ ...prev, [question.id]: answerData }));
    handleSaveCurrentAnswer(question.id, answerData);
  };

  const handleSubmitExam = async () => {
    if (!examId) return;
    clearInterval(timerRef.current);
    setExamState('submitting');
    setLoading(true);
    try {
      await submitExam(examId);
      await evaluateExam(examId);
      const resultData = await getExamResult(examId);
      setResult(resultData);
      setExamState('result');
    } catch (err) {
      setError(err.message || 'Failed to submit exam. Please try again.');
      setExamState('active');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSubmit = async () => {
    await handleSubmitExam();
  };

  // --- Setup Screen ---
  if (examState === 'setup') {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="card">
          <div className="card-header">
            <h4><i className="fas fa-cog text-blue-600 mr-2"></i>Mock Test Setup</h4>
          </div>
          <div className="p-6">
            {error && (
              <div className="p-4 mb-4 rounded" style={{ background: '#fee2e2', color: '#991b1b' }}>
                <i className="fas fa-exclamation-circle mr-2"></i>{error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Subject</label>
              <select
                className="form-select"
                value={config.subject_id}
                onChange={e => setConfig(c => ({ ...c, subject_id: e.target.value }))}
              >
                {subjects.length === 0
                  ? <option value="">Loading subjects...</option>
                  : subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)
                }
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Difficulty</label>
              <select
                className="form-select"
                value={config.difficulty_level}
                onChange={e => setConfig(c => ({ ...c, difficulty_level: e.target.value }))}
              >
                {DIFFICULTY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="grid-2col" style={{ marginBottom: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Number of Questions</label>
                <select
                  className="form-select"
                  value={config.question_count}
                  onChange={e => setConfig(c => ({ ...c, question_count: Number(e.target.value) }))}
                >
                  {[5, 10, 20].map(n => <option key={n} value={n}>{n} Questions</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Duration</label>
                <select
                  className="form-select"
                  value={config.duration_minutes}
                  onChange={e => setConfig(c => ({ ...c, duration_minutes: Number(e.target.value) }))}
                >
                  {[15, 30, 45, 60].map(m => <option key={m} value={m}>{m} Minutes</option>)}
                </select>
              </div>
            </div>

            <button
              className="btn btn-primary w-full mt-4"
              onClick={handleStartExam}
              disabled={loading || !config.subject_id}
            >
              {loading
                ? <><i className="fas fa-spinner fa-spin mr-2"></i>Creating Exam...</>
                : <><i className="fas fa-play mr-2"></i>Start Mock Test</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Submitting Screen ---
  if (examState === 'submitting') {
    return (
      <div className="p-8 text-center text-muted">
        <i className="fas fa-spinner fa-spin mr-2"></i>
        Submitting and evaluating your exam. Please wait...
      </div>
    );
  }

  // --- Active Exam Screen ---
  if (examState === 'active') {
    const currentQ = questions[currentQIndex];
    const savedAnswer = savedAnswers[currentQ?.id] || {};

    return (
      <div className="exam-interface max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg">
            <i className="fas fa-question-circle text-blue-600 mr-2"></i>
            Question {currentQIndex + 1} of {questions.length}
          </h3>
          <span className={`badge text-sm px-4 py-2 ${timeLeft <= 300 ? 'badge-danger' : 'badge-warning'}`}>
            <i className="far fa-clock mr-1"></i> {formatTime(timeLeft)}
          </span>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded" style={{ background: '#fee2e2', color: '#991b1b', fontSize: '14px' }}>
            <i className="fas fa-exclamation-circle mr-2"></i>{error}
          </div>
        )}

        {currentQ && (
          <div className="card mb-6">
            <div className="mb-4 flex justify-between">
              <span className="badge badge-secondary">{currentQ.question_type || 'MCQ'}</span>
              <span className="badge badge-primary">{currentQ.marks} mark(s)</span>
            </div>
            <h4 className="text-lg font-medium mb-6 text-main leading-relaxed">{currentQ.question_text}</h4>

            {/* MCQ Options */}
            {(currentQ.question_type === 'MCQ' || currentQ.question_type === 'MULTIPLE_CHOICE') && currentQ.options && (
              <div className="flex flex-col gap-3">
                {currentQ.options.map((opt) => (
                  <label
                    key={opt.id}
                    className={`p-4 border rounded-md cursor-pointer flex items-center gap-3 transition-colors ${
                      savedAnswer.selected_option_id === opt.id
                        ? 'border-l-primary bg-blue-100 border-primary border-l-4'
                        : 'border-light hover:bg-input'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${currentQ.id}`}
                      checked={savedAnswer.selected_option_id === opt.id}
                      onChange={() => handleAnswerChange(currentQ, opt.id)}
                      className="w-4 h-4"
                    />
                    <span className="font-medium text-sm">{opt.text}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Short/Long answer */}
            {(currentQ.question_type === 'SHORT_ANSWER' || currentQ.question_type === 'LONG_ANSWER' || currentQ.question_type === 'DESCRIPTIVE') && (
              <textarea
                className="form-input"
                style={{ minHeight: currentQ.question_type === 'LONG_ANSWER' ? '200px' : '120px' }}
                placeholder="Type your answer here..."
                value={savedAnswer.answer_text || ''}
                onChange={e => handleAnswerChange(currentQ, e.target.value)}
              />
            )}
          </div>
        )}

        <div className="flex justify-between">
          <button
            className="btn btn-secondary"
            disabled={currentQIndex === 0}
            onClick={() => setCurrentQIndex(i => i - 1)}
          >
            <i className="fas fa-chevron-left"></i> Previous
          </button>

          {currentQIndex < questions.length - 1 ? (
            <button className="btn btn-primary" onClick={() => setCurrentQIndex(i => i + 1)}>
              Next Question <i className="fas fa-chevron-right"></i>
            </button>
          ) : (
            <button className="btn btn-success" onClick={handleSubmitExam} disabled={loading}>
              <i className="fas fa-check-double"></i> Submit Exam
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- Result Screen ---
  if (examState === 'result' && result) {
    const pct = Math.round(result.percentage);
    const scoreColor = pct >= 80 ? '#22c55e' : pct >= 60 ? '#eab308' : '#ef4444';
    return (
      <div className="max-w-3xl mx-auto mt-8">
        <div className="card text-center mb-6 py-8">
          <i className={`fas fa-check-circle text-6xl mb-4 ${pct >= 60 ? 'text-success' : 'text-danger'}`}></i>
          <h2 className="text-2xl font-bold mb-2">Test Completed!</h2>
          <div className="text-5xl font-extrabold mb-2" style={{ color: scoreColor }}>
            {result.obtained_marks}
            <span className="text-2xl text-light"> / {result.total_marks}</span>
          </div>
          <div className="text-2xl font-bold mb-2" style={{ color: scoreColor }}>{pct}%</div>
          {result.grade && <div className="badge badge-secondary mb-4">Grade: {result.grade}</div>}
          <div className={`badge ${result.pass_status ? 'badge-success' : 'badge-danger'} px-4 py-2`}>
            {result.pass_status ? 'PASSED' : 'NOT PASSED'}
          </div>
        </div>

        {result.question_results?.length > 0 && (
          <>
            <h3 className="font-bold text-lg mb-4">
              <i className="fas fa-list-check text-blue-600 mr-2"></i>Question Breakdown
            </h3>
            <div className="flex flex-col gap-3 mb-6">
              {result.question_results.slice(0, 5).map((qr, i) => (
                <div key={i} className="card p-4">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-main)', flex: 1, marginRight: '12px' }}>
                      {qr.question_text}
                    </p>
                    <span className="text-sm font-bold" style={{ color: qr.evaluation?.marks_obtained > 0 ? '#22c55e' : '#ef4444', whiteSpace: 'nowrap' }}>
                      {qr.evaluation?.marks_obtained ?? 0} / {qr.marks} marks
                    </span>
                  </div>
                  {qr.evaluation?.feedback && (
                    <p className="text-xs text-muted mt-1">{qr.evaluation.feedback}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <div className="text-center">
          <button className="btn btn-secondary" onClick={() => { setExamState('setup'); setResult(null); setQuestions([]); }}>
            <i className="fas fa-home"></i> Back to Setup
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default TheoryExam;
