// ============================================
// AGENTEXAM — Theory Exam Page (Setup + Exam + Results)
// ============================================
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, ChevronLeft, ChevronRight, Flag, Send, AlertCircle,
  CheckCircle2, BookOpen, Sparkles, Timer, ArrowRight, Zap
} from 'lucide-react';
import { Card, Button, Badge, Select, ProgressBar, ProgressCircle, Modal, AIBadge, ConfirmDialog, PageLoading } from '../components/ui';
import { formatTime, classNames } from '../utils/helpers';
import { useTimer } from '../hooks/useApp';

import { getSubjects } from '../services/academic';
import { createExam, startTest, submitAnswer, submitTest } from '../services/exams';
import { getResults } from '../services/results';

// ---- Exam Setup ----
function ExamSetup({ onStart, subjects }) {
  const [config, setConfig] = useState({ subjectId: subjects[0]?.id || '', difficulty: 'medium', questionCount: '10', duration: '30' });

  return (
    <div className="exam-setup-container animate-fade-in-up">
      <Card>
        <Card.Body style={{ padding: 'var(--space-8)' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-xl)', background: 'var(--color-primary-100)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)' }}>
              <BookOpen size={28} />
            </div>
            <h2 className="exam-setup-title">Start Theory Exam</h2>
            <p className="exam-setup-subtitle">Configure your practice test</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: '400px', margin: '0 auto' }}>
            <Select
              label="Subject"
              options={subjects.map(s => ({ value: s.id, label: s.name }))}
              value={config.subjectId}
              onChange={e => setConfig({ ...config, subjectId: e.target.value })}
            />
            <Select
              label="Difficulty"
              options={[{ value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' }, { value: 'mixed', label: 'Mixed' }]}
              value={config.difficulty}
              onChange={e => setConfig({ ...config, difficulty: e.target.value })}
            />
            <Select
              label="Number of Questions"
              options={[{ value: '5', label: '5 Questions' }, { value: '10', label: '10 Questions' }, { value: '15', label: '15 Questions' }, { value: '20', label: '20 Questions' }]}
              value={config.questionCount}
              onChange={e => setConfig({ ...config, questionCount: e.target.value })}
            />
            <Select
              label="Duration"
              options={[{ value: '15', label: '15 minutes' }, { value: '30', label: '30 minutes' }, { value: '45', label: '45 minutes' }, { value: '60', label: '60 minutes' }]}
              value={config.duration}
              onChange={e => setConfig({ ...config, duration: e.target.value })}
            />

            <Button variant="primary" size="lg" className="w-full" onClick={() => onStart(config)} style={{ marginTop: 'var(--space-4)' }}>
              <Zap size={18} /> Start Exam
            </Button>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}

// ---- Active Exam ----
function ActiveExam({ config, onSubmit, subjects }) {
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState(new Set());
  const [showSubmit, setShowSubmit] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Create and start exam
    createExam(config)
      .then(newExam => startTest(newExam.id))
      .then(startedExam => {
        setExam(startedExam);
        setQuestions(startedExam.questions || []);
        const loadedAnswers = {};
        if (startedExam.saved_answers) {
            startedExam.saved_answers.forEach(a => {
                loadedAnswers[a.question_id] = a.answer_text;
            });
        }
        setAnswers(loadedAnswers);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to start exam", err);
        setLoading(false);
      });
  }, [config]);

  const totalSeconds = (Number(config.duration) || 30) * 60;
  
  const handleComplete = useCallback(() => {
      if (exam) {
        submitTest(exam.id).then(() => onSubmit(exam.id));
      }
  }, [exam, onSubmit]);

  const { seconds, isRunning, start } = useTimer(totalSeconds, { onComplete: handleComplete, autoStart: true });

  if (loading) return <PageLoading />;
  if (questions.length === 0) return <div>No questions available for this configuration.</div>;

  const question = questions[currentQ];
  const timerClass = seconds < 60 ? 'danger' : seconds < 300 ? 'warning' : '';

  const setAnswer = (qId, answer) => {
    setAnswers(prev => ({ ...prev, [qId]: answer }));
    // Automatically save answer to backend
    submitAnswer(exam.id, qId, answer).catch(e => console.error("Failed to save answer", e));
  };
  
  const toggleMark = (qId) => setMarked(prev => { const n = new Set(prev); if (n.has(qId)) n.delete(qId); else n.add(qId); return n; });

  const qType = (question.question_type || 'mcq').toLowerCase();

  return (
    <div className="exam-layout">
      {/* Exam Header */}
      <div className="exam-header">
        <div className="exam-header-left">
          <h2 className="exam-title">{subjects.find(s => s.id === config.subjectId)?.name || 'Exam'} — Mock Test</h2>
          <Badge variant="neutral">Question {currentQ + 1} of {questions.length}</Badge>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div className={classNames('exam-timer', timerClass)}>
            <Clock size={16} />
            {formatTime(seconds)}
          </div>
          <Button variant="danger" size="sm" onClick={() => setShowSubmit(true)}>
            <Send size={14} /> Submit Test
          </Button>
        </div>
      </div>

      {/* Exam Content */}
      <div className="exam-body">
        <div className="exam-content" style={{ paddingRight: '300px' }}>
          <div className="exam-question-number">
            Question {currentQ + 1}
            <span className="exam-question-type"><Badge variant={qType === 'mcq' ? 'info' : qType === 'short_answer' ? 'warning' : 'primary'}>{qType.toUpperCase()}</Badge></span>
          </div>
          <p className="exam-question-marks">{question.marks} marks</p>
          <h3 className="exam-question-text">{question.question_text}</h3>

          {/* Answer Area */}
          {qType === 'mcq' && (
            <div className="mcq-options">
              {question.options && question.options.map((opt, i) => (
                <div key={i}
                  className={classNames('mcq-option', answers[question.id] === opt.id && 'selected')}
                  onClick={() => setAnswer(question.id, opt.id)}
                >
                  <div className="mcq-option-indicator">{String.fromCharCode(65 + i)}</div>
                  <span className="mcq-option-text">{opt.text}</span>
                </div>
              ))}
            </div>
          )}

          {qType === 'short_answer' && (
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Type your answer here..."
              value={answers[question.id] || ''}
              onChange={e => setAnswer(question.id, e.target.value)}
            />
          )}

          {qType === 'long_answer' && (
            <textarea
              className="form-textarea"
              rows={10}
              placeholder="Write your detailed answer here..."
              value={answers[question.id] || ''}
              onChange={e => setAnswer(question.id, e.target.value)}
              style={{ minHeight: '250px' }}
            />
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-6)' }}>
            <Button variant="secondary" disabled={currentQ === 0} onClick={() => setCurrentQ(prev => prev - 1)}>
              <ChevronLeft size={16} /> Previous
            </Button>
            <Button variant="ghost" onClick={() => toggleMark(question.id)} style={{ color: marked.has(question.id) ? 'var(--color-warning)' : 'var(--color-text-secondary)' }}>
              <Flag size={16} /> {marked.has(question.id) ? 'Marked' : 'Mark for Review'}
            </Button>
            {currentQ < questions.length - 1 ? (
              <Button variant="primary" onClick={() => setCurrentQ(prev => prev + 1)}>
                Next <ChevronRight size={16} />
              </Button>
            ) : (
              <Button variant="success" onClick={() => setShowSubmit(true)}>
                <Send size={16} /> Submit Test
              </Button>
            )}
          </div>
        </div>

        {/* Question Nav Sidebar */}
        <div className="exam-nav">
          <h4 className="exam-nav-title">Questions</h4>
          <div className="exam-nav-grid">
            {questions.map((q, i) => (
              <button
                key={q.id}
                className={classNames(
                  'exam-nav-btn',
                  i === currentQ && 'current',
                  answers[q.id] !== undefined && i !== currentQ && 'answered',
                  marked.has(q.id) && 'marked'
                )}
                onClick={() => setCurrentQ(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="exam-nav-legend">
            <div className="exam-nav-legend-item"><div className="exam-nav-legend-dot" style={{ background: 'var(--color-primary)' }} /> Current</div>
            <div className="exam-nav-legend-item"><div className="exam-nav-legend-dot" style={{ background: 'var(--color-success-light)', border: '1px solid var(--color-success)' }} /> Answered</div>
            <div className="exam-nav-legend-item"><div className="exam-nav-legend-dot" style={{ background: 'var(--color-warning-light)', border: '1px solid var(--color-warning)' }} /> Marked</div>
            <div className="exam-nav-legend-item"><div className="exam-nav-legend-dot" style={{ border: '1px solid var(--color-border)' }} /> Not visited</div>
          </div>
          <div style={{ marginTop: 'var(--space-6)' }}>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>Progress</div>
            <ProgressBar value={Object.keys(answers).length} max={questions.length} showValue label={`${Object.keys(answers).length} / ${questions.length} answered`} />
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showSubmit}
        onClose={() => setShowSubmit(false)}
        onConfirm={handleComplete}
        title="Submit Test?"
        message={`You've answered ${Object.keys(answers).length} out of ${questions.length} questions. ${questions.length - Object.keys(answers).length > 0 ? `${questions.length - Object.keys(answers).length} questions are unanswered.` : 'All questions answered!'}`}
        confirmText="Submit"
        variant="primary"
      />
    </div>
  );
}

// ---- Main Component ----
export default function TheoryExam() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('setup'); // setup | exam | results
  const [config, setConfig] = useState(null);
  const [results, setResults] = useState(null);
  
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSubjects().then(data => {
      setSubjects(data || []);
      setLoading(false);
    });
  }, []);

  const handleStart = (cfg) => {
    setConfig(cfg);
    setPhase('exam');
  };

  const handleSubmit = (examId) => {
    setLoading(true);
    setPhase('results');
    getResults(examId).then(data => {
      setResults(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  if (loading && phase !== 'exam') return <PageLoading />;

  if (phase === 'exam' && config) {
    return <ActiveExam config={config} onSubmit={handleSubmit} subjects={subjects} />;
  }

  if (phase === 'results' && results) {
    return (
      <div className="animate-fade-in-up">
        {/* Score Card */}
        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <Card.Body style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', marginBottom: 'var(--space-4)' }}>
              <CheckCircle2 size={48} color="var(--color-success)" />
            </div>
            <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>Test Completed!</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>{subjects.find(s => s.id === results.subject_id)?.name} — {results.test_type}</p>
            <ProgressCircle value={results.percentage || 0} size={140} strokeWidth={10} label="Score" />
          </Card.Body>
        </Card>

        {results.analytics && (
        <div className="grid-cols-2" style={{ marginBottom: 'var(--space-6)' }}>
          <Card className="ai-card">
            <Card.Header><h3 className="card-title"><Sparkles size={18} style={{ marginRight: '8px', color: 'var(--color-ai)' }} />AI Feedback</h3><AIBadge>AI Evaluated</AIBadge></Card.Header>
            <Card.Body>
              <p style={{ fontSize: 'var(--text-base)', lineHeight: 'var(--leading-relaxed)', color: 'var(--color-text-secondary)' }}>{results.analytics.improvement_suggestions}</p>
            </Card.Body>
          </Card>
        </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
          <Button variant="secondary" onClick={() => setPhase('setup')}>Take Another Test</Button>
          <Button variant="primary" onClick={() => navigate('/performance')}>View Performance <ArrowRight size={16} /></Button>
        </div>
      </div>
    );
  }

  return <ExamSetup onStart={handleStart} subjects={subjects} />;
}
