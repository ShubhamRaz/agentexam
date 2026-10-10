// ============================================
// AGENTEXAM — Readiness Page
// ============================================
import { useState, useEffect } from 'react';
import { Target, AlertTriangle, CheckCircle2, Clock, ArrowRight, Sparkles, Calendar, TrendingUp } from 'lucide-react';
import { Card, Badge, Button, ProgressCircle, ProgressBar, AIBadge, PageLoading } from '../components/ui';
import { getReadiness } from '../services/performance';
import { getScoreColor, getStatusColor } from '../utils/helpers';

export default function Readiness() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReadiness().then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <PageLoading />;

  const { overallScore, examDate, daysLeft, estimatedStudyHoursNeeded, breakdown, subjectReadiness, riskAreas, recommendations } = data;

  return (
    <div className="animate-fade-in-up">
      {/* Hero */}
      <Card style={{ marginBottom: 'var(--space-8)' }}>
        <Card.Body>
          <div className="readiness-gauge-section">
            <ProgressCircle value={overallScore} size={180} strokeWidth={12} label="Readiness" />
            <div style={{ marginTop: 'var(--space-5)', display: 'flex', justifyContent: 'center', gap: 'var(--space-8)' }}>
              <div><Calendar size={16} style={{ display: 'inline', marginRight: '4px', color: 'var(--color-text-tertiary)' }} /><span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>Exam: {examDate}</span></div>
              <div><Clock size={16} style={{ display: 'inline', marginRight: '4px', color: 'var(--color-text-tertiary)' }} /><span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{daysLeft} days left</span></div>
              <div><TrendingUp size={16} style={{ display: 'inline', marginRight: '4px', color: 'var(--color-text-tertiary)' }} /><span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{estimatedStudyHoursNeeded}h needed</span></div>
            </div>

            <div className="readiness-breakdown">
              {Object.entries(breakdown).map(([key, value]) => (
                <div key={key} className="readiness-breakdown-item">
                  <div className="readiness-breakdown-value" style={{ color: getScoreColor(value) }}>{value}%</div>
                  <div className="readiness-breakdown-label">{key.charAt(0).toUpperCase() + key.slice(1)}</div>
                </div>
              ))}
            </div>
          </div>
        </Card.Body>
      </Card>

      <div className="grid-cols-2" style={{ marginBottom: 'var(--space-6)' }}>
        {/* Subject Readiness */}
        <Card>
          <Card.Header><h3 className="card-title">Subject Readiness</h3></Card.Header>
          <Card.Body>
            {subjectReadiness.map((sr, i) => (
              <div key={i} style={{ marginBottom: 'var(--space-5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                  <span style={{ fontWeight: 'var(--font-medium)' }}>{sr.subject}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Badge variant={getStatusColor(sr.status)}>
                      {sr.status === 'on_track' ? 'On Track' : sr.status === 'needs_attention' ? 'Needs Attention' : 'At Risk'}
                    </Badge>
                    <span style={{ fontWeight: 'var(--font-semibold)', color: getScoreColor(sr.score) }}>{sr.score}%</span>
                  </div>
                </div>
                <ProgressBar value={sr.score} />
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                  {sr.topicsReady} of {sr.totalTopics} topics ready
                </div>
              </div>
            ))}
          </Card.Body>
        </Card>

        {/* Risk Areas */}
        <Card>
          <Card.Header>
            <h3 className="card-title"><AlertTriangle size={18} style={{ color: 'var(--color-danger)', marginRight: '8px' }} />Risk Areas</h3>
          </Card.Header>
          <Card.Body>
            {riskAreas.map((ra, i) => (
              <div key={i} style={{
                padding: 'var(--space-4)', marginBottom: 'var(--space-3)',
                background: ra.risk === 'high' ? 'var(--color-danger-light)' : 'var(--color-warning-light)',
                borderRadius: 'var(--radius-md)',
                borderLeft: `3px solid ${ra.risk === 'high' ? 'var(--color-danger)' : 'var(--color-warning)'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)' }}>{ra.topic}</span>
                  <Badge variant={ra.risk === 'high' ? 'danger' : 'warning'}>{ra.risk}</Badge>
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{ra.subject}</div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>{ra.reason}</p>
              </div>
            ))}
          </Card.Body>
        </Card>
      </div>

      {/* AI Recommendations */}
      <Card className="ai-card">
        <Card.Header>
          <h3 className="card-title"><Sparkles size={18} style={{ color: 'var(--color-ai)', marginRight: '8px' }} />AI Recommendations</h3>
          <AIBadge>AI Generated</AIBadge>
        </Card.Header>
        <Card.Body>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {recommendations.map((rec, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: rec.priority === 'high' ? 'var(--color-danger-light)' : rec.priority === 'medium' ? 'var(--color-warning-light)' : 'var(--color-success-light)', color: rec.priority === 'high' ? 'var(--color-danger)' : rec.priority === 'medium' ? 'var(--color-warning)' : 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'var(--font-medium)', fontSize: 'var(--text-base)' }}>{rec.action}</div>
                </div>
                <Badge variant="neutral"><Clock size={12} /> {rec.estimatedTime}</Badge>
                <Badge variant={rec.priority === 'high' ? 'danger' : rec.priority === 'medium' ? 'warning' : 'success'}>{rec.priority}</Badge>
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
