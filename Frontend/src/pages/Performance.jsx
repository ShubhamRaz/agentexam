// ============================================
// AGENTEXAM — Performance Analytics Page
// ============================================
import { useState, useEffect } from 'react';
import { TrendingUp, Target, BookOpen, Award, BarChart2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { Card, Badge, StatCard, ProgressBar, Tabs, PageLoading, AIBadge } from '../components/ui';
import { getPerformance } from '../services/performance';
import { getScoreColor, getStatusColor } from '../utils/helpers';

export default function Performance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPerformance().then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <PageLoading />;

  const { overall, scoreTrend, accuracyTrend, subjectPerformance, topicPerformance, weakTopics } = data;

  const radarData = subjectPerformance.map(s => ({ subject: s.subject.split(' ')[0], score: s.score, accuracy: s.accuracy }));

  return (
    <div className="animate-fade-in-up">
      {/* Stats */}
      <div className="dashboard-stats stagger-children" style={{ marginBottom: 'var(--space-8)' }}>
        <StatCard icon={BookOpen} iconBg="var(--color-primary-100)" iconColor="var(--color-primary)" label="Total Tests" value={overall.totalTests} />
        <StatCard icon={Award} iconBg="var(--color-success-light)" iconColor="var(--color-success-dark)" label="Average Score" value={`${overall.averageScore}%`} change={`+${overall.improvement}% this month`} changeType="positive" />
        <StatCard icon={Target} iconBg="var(--color-accent-light)" iconColor="var(--color-accent-dark)" label="Accuracy" value={`${overall.accuracy}%`} />
        <StatCard icon={TrendingUp} iconBg="var(--color-warning-light)" iconColor="var(--color-warning-dark)" label="Study Hours" value={`${overall.studyHours}h`} />
      </div>

      {/* Charts Row */}
      <div className="grid-cols-2" style={{ marginBottom: 'var(--space-6)' }}>
        <Card>
          <Card.Header><h3 className="card-title">Score Trend</h3></Card.Header>
          <Card.Body>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={scoreTrend}>
                <defs>
                  <linearGradient id="scoreGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} domain={[30, 100]} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="score" stroke="#4F46E5" strokeWidth={2.5} fill="url(#scoreGrad2)" dot={{ fill: '#4F46E5', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header><h3 className="card-title">Accuracy Trend</h3></Card.Header>
          <Card.Body>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={accuracyTrend}>
                <defs>
                  <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} domain={[30, 100]} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="accuracy" stroke="#10B981" strokeWidth={2.5} fill="url(#accGrad)" dot={{ fill: '#10B981', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>
      </div>

      <div className="grid-cols-2" style={{ marginBottom: 'var(--space-6)' }}>
        {/* Subject Radar */}
        <Card>
          <Card.Header><h3 className="card-title">Subject Comparison</h3></Card.Header>
          <Card.Body>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#0F172A', fontSize: 12 }} />
                <Radar name="Score" dataKey="score" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.2} strokeWidth={2} />
                <Radar name="Accuracy" dataKey="accuracy" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.1} strokeWidth={2} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>

        {/* Topic Performance */}
        <Card>
          <Card.Header><h3 className="card-title">Topic Performance</h3><AIBadge>AI Analyzed</AIBadge></Card.Header>
          <Card.Body>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {topicPerformance.map((tp, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{ width: '130px', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>{tp.topic}</div>
                  <Badge variant="neutral" style={{ width: '36px', textAlign: 'center', fontSize: 'var(--text-xs)' }}>{tp.subject}</Badge>
                  <div style={{ flex: 1 }}>
                    <ProgressBar value={tp.score} size="sm" />
                  </div>
                  <Badge variant={getStatusColor(tp.status)}>{tp.score}%</Badge>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Weak Topics */}
      <Card>
        <Card.Header><h3 className="card-title">⚠️ Weak Topics — AI Recommendations</h3></Card.Header>
        <Card.Body>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
            {weakTopics.map((wt, i) => (
              <div key={i} style={{ padding: 'var(--space-4)', background: 'var(--color-danger-light)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-danger)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                  <span style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-base)' }}>{wt.topic}</span>
                  <Badge variant="danger">{wt.score}%</Badge>
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-2)' }}>{wt.subject}</div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>💡 {wt.recommendation}</p>
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
