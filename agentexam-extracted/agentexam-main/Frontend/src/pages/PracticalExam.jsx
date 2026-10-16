// ============================================
// AGENTEXAM — Practical Exam Page
// ============================================
import { useState, useEffect } from 'react';
import { FlaskConical, Code, Play, CheckCircle2, Clock, ChevronRight, Sparkles, ArrowLeft } from 'lucide-react';
import { Card, Badge, Button, AIBadge, ProgressCircle, Tabs, PageLoading } from '../components/ui';

import { getSubjects } from '../services/academic';
import { getPracticals, submitPractical } from '../services/practical';

export default function PracticalExam() {
  const [subjects, setSubjects] = useState([]);
  const [practicals, setPracticals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeSubject, setActiveSubject] = useState('all');
  const [selected, setSelected] = useState(null);
  const [submission, setSubmission] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([getSubjects(), getPracticals()]).then(([subs, pracs]) => {
      setSubjects(subs || []);
      setPracticals(pracs || []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const handleSubmit = () => {
    setSubmitting(true);
    submitPractical(selected.id, submission).then(result => {
        setEvaluation(result);
        setSubmitting(false);
    }).catch(err => {
        console.error(err);
        setSubmitting(false);
    });
  };

  const filtered = activeSubject === 'all' ? practicals : practicals.filter(p => p.subject_id === activeSubject);

  const statusBadge = (status) => {
    const map = { completed: { v: 'success', l: 'Completed' }, in_progress: { v: 'warning', l: 'In Progress' }, not_started: { v: 'neutral', l: 'Not Started' } };
    const s = map[status] || map.not_started;
    return <Badge variant={s.v}>{s.l}</Badge>;
  };

  if (loading) return <PageLoading />;

  if (selected) {
    const prac = selected;
    return (
      <div className="animate-fade-in-up">
        <Button variant="ghost" onClick={() => { setSelected(null); setEvaluation(null); setSubmission(''); }} style={{ marginBottom: 'var(--space-4)' }}>
          <ArrowLeft size={16} /> Back to Experiments
        </Button>

        <div className="grid-cols-2">
          {/* Experiment Details */}
          <div>
            <Card style={{ marginBottom: 'var(--space-6)' }}>
              <Card.Header>
                <div>
                  <h3 className="card-title">{prac.title}</h3>
                  <p className="card-subtitle">{subjects.find(s=>s.id===prac.subject_id)?.name} · {prac.marks} Marks</p>
                </div>
                {statusBadge(prac.status)}
              </Card.Header>
              <Card.Body>
                <div style={{ marginBottom: 'var(--space-5)' }}>
                  <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-2)' }}>🎯 Description</h4>
                  <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)' }}>{prac.description}</p>
                </div>
              </Card.Body>
            </Card>
          </div>

          {/* Submission Area */}
          <div>
            <Card style={{ marginBottom: 'var(--space-6)' }}>
              <Card.Header>
                <h3 className="card-title"><Code size={18} style={{ marginRight: '8px' }} /> Code Submission</h3>
              </Card.Header>
              <Card.Body>
                <textarea
                  className="form-textarea"
                  rows={16}
                  placeholder="Write your code here..."
                  value={submission}
                  onChange={e => setSubmission(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', minHeight: '350px' }}
                />
                <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                  <Button variant="primary" icon={Play} onClick={handleSubmit} disabled={!submission.trim() || submitting}>
                    {submitting ? 'Evaluating...' : 'Submit & Evaluate'}
                  </Button>
                </div>
              </Card.Body>
            </Card>

            {/* AI Evaluation */}
            {evaluation && (
              <Card className="ai-card animate-fade-in-up">
                <Card.Header>
                  <h3 className="card-title"><Sparkles size={18} style={{ color: 'var(--color-ai)', marginRight: '8px' }} /> AI Evaluation</h3>
                  <AIBadge>AI Evaluated</AIBadge>
                </Card.Header>
                <Card.Body style={{ textAlign: 'center' }}>
                  <ProgressCircle value={evaluation.score || 0} size={100} strokeWidth={8} label="Score" />
                  <p style={{ marginTop: 'var(--space-4)', fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)' }}>
                    {evaluation.feedback}
                  </p>
                </Card.Body>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <Tabs
        tabs={[{ id: 'all', label: 'All Experiments' }, ...subjects.map(s => ({ id: s.id, label: s.name }))]}
        activeTab={activeSubject}
        onChange={setActiveSubject}
        variant="pills"
        className="marginBottom: var(--space-6)"
      />
      {filtered.length === 0 ? (
        <Card style={{ marginTop: 'var(--space-6)' }}>
          <Card.Body style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No practical experiments available.
          </Card.Body>
        </Card>
      ) : (
      <div className="grid-auto stagger-children" style={{ marginTop: 'var(--space-6)' }}>
        {filtered.map(prac => (
          <Card key={prac.id} hoverable onClick={() => setSelected(prac)} style={{ cursor: 'pointer' }}>
            <Card.Body>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-lg)', background: 'var(--color-accent-light)', color: 'var(--color-accent-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FlaskConical size={20} />
                </div>
                {statusBadge(prac.status)}
              </div>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-1)' }}>{prac.title}</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>{subjects.find(s=>s.id===prac.subject_id)?.name}</p>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <Badge variant="neutral">{prac.marks} Marks</Badge>
                {prac.score !== undefined && prac.score !== null && <Badge variant="primary">Score: {prac.score}%</Badge>}
              </div>
            </Card.Body>
          </Card>
        ))}
      </div>
      )}
    </div>
  );
}
