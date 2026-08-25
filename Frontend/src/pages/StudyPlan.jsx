// ============================================
// AGENTEXAM — Study Plan Page
// ============================================
import { useState, useEffect } from 'react';
import { CalendarCheck, CheckCircle2, Clock, BookOpen, PenTool, Target, Sparkles } from 'lucide-react';
import { Card, Badge, Button, ProgressBar, AIBadge, PageLoading } from '../components/ui';
import { getStudyPlan } from '../services/studyPlan';

export default function StudyPlan() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(new Set());

  useEffect(() => {
    getStudyPlan().then(d => {
      setPlan(d);
      setLoading(false);
      const done = new Set();
      d.days.forEach(day => day.tasks.forEach(t => { if (t.completed) done.add(t.id); }));
      setCompleted(done);
    });
  }, []);

  const toggleComplete = (id) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading) return <PageLoading />;

  const typeIcon = (type) => {
    switch (type) {
      case 'study': return <BookOpen size={14} />;
      case 'practice': return <PenTool size={14} />;
      case 'test': return <Target size={14} />;
      case 'revision': return <CalendarCheck size={14} />;
      default: return <BookOpen size={14} />;
    }
  };

  const totalTasks = plan.days.reduce((sum, d) => sum + d.tasks.length, 0);

  return (
    <div className="animate-fade-in-up">
      {/* Overview */}
      <Card style={{ marginBottom: 'var(--space-6)' }}>
        <Card.Body>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
            <div>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-1)' }}>
                <Sparkles size={20} style={{ color: 'var(--color-ai)', marginRight: '8px', verticalAlign: 'middle' }} />
                Your Personalized Study Plan
              </h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                AI-optimized for your exam on Sep 15, 2026 · {plan.totalDays} days · {totalTasks} tasks
              </p>
            </div>
            <AIBadge>AI Generated</AIBadge>
          </div>
          <div style={{ marginTop: 'var(--space-5)' }}>
            <ProgressBar value={completed.size} max={totalTasks} showValue label={`${completed.size} of ${totalTasks} tasks completed`} />
          </div>
        </Card.Body>
      </Card>

      {/* Days */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {plan.days.map(day => (
          <div key={day.date} className="plan-day">
            <div className="plan-day-header">
              <CalendarCheck size={18} style={{ color: day.isToday ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }} />
              <span className="plan-day-date">{day.label}</span>
              {day.isToday && <Badge variant="primary">Today</Badge>}
              <Badge variant="neutral">{day.tasks.length} tasks</Badge>
            </div>

            <div>
              {day.tasks.map(task => {
                const isDone = completed.has(task.id);
                return (
                  <div key={task.id} className={`plan-task-card ${isDone ? 'completed' : ''}`} onClick={() => toggleComplete(task.id)}>
                    <div className={`plan-task-priority ${task.priority}`} />
                    <button
                      className={`study-task-checkbox ${isDone ? 'completed' : ''}`}
                      onClick={e => { e.stopPropagation(); toggleComplete(task.id); }}
                      aria-label="Toggle complete"
                    >
                      {isDone && <CheckCircle2 size={14} />}
                    </button>
                    <div className="plan-task-info">
                      <div className="plan-task-title" style={{ textDecoration: isDone ? 'line-through' : 'none', color: isDone ? 'var(--color-text-tertiary)' : 'var(--color-text)' }}>
                        {task.title}
                      </div>
                      <div className="plan-task-subject">{task.subject}</div>
                    </div>
                    <Badge variant="neutral" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {typeIcon(task.type)} {task.type}
                    </Badge>
                    <span className="plan-task-duration">
                      <Clock size={14} /> {task.duration}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
