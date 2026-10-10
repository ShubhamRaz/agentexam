// ============================================
// AGENTEXAM — Dashboard Page
// ============================================
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trophy, Flame, BookOpen, Clock, TrendingUp, AlertTriangle,
  ChevronRight, Target, CalendarCheck, CheckCircle2, Sparkles, Zap, ArrowRight
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Card, Badge, ProgressBar, ProgressCircle, StatCard, AIBadge, Button, PageLoading } from '../components/ui';
import { getDashboard } from '../services/performance';
import { getCurrentUser } from '../services/auth';
import { getGreeting, getScoreColor, getScoreLabel } from '../utils/helpers';

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedTasks, setCompletedTasks] = useState(new Set());

  useEffect(() => {
    Promise.all([getDashboard(), getCurrentUser().catch(() => null)]).then(([d, user]) => {
      if (user && d.student) {
        d.student.name = user.name;
      }
      setData(d);
      setLoading(false);
      // Pre-mark completed tasks
      const completed = new Set();
      d.todayTasks?.forEach(t => { if (t.completed) completed.add(t.id); });
      setCompletedTasks(completed);
    });
  }, []);

  const toggleTask = (taskId) => {
    setCompletedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  if (loading) return <PageLoading />;

  const { student, readinessScore, daysLeft, examDate, recentTests, recentActivity, todayTasks, weakTopics, subjectPerformance } = data;

  // Build chart data from real subject performance
  const performanceData = subjectPerformance && subjectPerformance.length > 0
    ? subjectPerformance.map(s => ({ name: typeof s.subject === 'string' && s.subject.length > 12 ? s.subject.slice(0, 12) + '…' : (s.subject || 'Subject'), score: s.score || 0 }))
    : [];

  return (
    <div className="animate-fade-in-up">
      {/* Greeting */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)' }}>
          {getGreeting()}, {student.name.split(' ')[0]} 👋
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
          {daysLeft} days until your exam. Let&apos;s make today count!
        </p>
      </div>

      {/* Readiness Hero Card */}
      <div className="dashboard-readiness" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="dashboard-readiness-info">
          <div className="dashboard-readiness-title">
            <Sparkles size={16} style={{ display: 'inline', marginRight: '6px' }} />
            Exam Readiness
          </div>
          <h2 className="dashboard-readiness-heading">
            {getScoreLabel(readinessScore)}
          </h2>
          <p className="dashboard-readiness-sub">
            You're making good progress! Focus on weak topics to boost your score.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/readiness')}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white' }}
            >
              View Details <ChevronRight size={16} />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/exam')}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white' }}
            >
              Start Practice <Zap size={16} />
            </Button>
          </div>
        </div>
        <div className="readiness-circle-wrapper">
          <ProgressCircle value={readinessScore} size={160} strokeWidth={10} label="Ready" />
        </div>
      </div>

      {/* Stats Row */}
      <div className="dashboard-stats stagger-children" style={{ marginBottom: 'var(--space-8)' }}>
        <StatCard
          icon={Flame}
          iconBg="var(--color-warning-light)"
          iconColor="var(--color-warning-dark)"
          label="Study Streak"
          value={`${student.streak} days`}
          change="+2 from last week"
          changeType="positive"
        />
        <StatCard
          icon={Trophy}
          iconBg="var(--color-success-light)"
          iconColor="var(--color-success-dark)"
          label="Average Score"
          value={`${student.averageScore}%`}
          change="+5% this month"
          changeType="positive"
        />
        <StatCard
          icon={BookOpen}
          iconBg="var(--color-primary-100)"
          iconColor="var(--color-primary)"
          label="Tests Completed"
          value={student.testsCompleted}
        />
        <StatCard
          icon={Clock}
          iconBg="var(--color-accent-light)"
          iconColor="var(--color-accent-dark)"
          label="Study Hours"
          value={`${student.totalStudyHours}h`}
          change="+12h this week"
          changeType="positive"
        />
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        {/* Today's Tasks */}
        <Card>
          <Card.Header>
            <div>
              <h3 className="card-title">Today&apos;s Study Plan</h3>
              <p className="card-subtitle">{completedTasks.size} of {todayTasks.length} tasks completed</p>
            </div>
            <Link to="/study-plan" className="section-action">View all <ChevronRight size={14} /></Link>
          </Card.Header>
          <Card.Body style={{ padding: 0 }}>
            {todayTasks.map(task => (
              <div key={task.id} className="study-task-item">
                <button
                  className={`study-task-checkbox ${completedTasks.has(task.id) ? 'completed' : ''}`}
                  onClick={() => toggleTask(task.id)}
                  aria-label={completedTasks.has(task.id) ? 'Mark incomplete' : 'Mark complete'}
                >
                  {completedTasks.has(task.id) && <CheckCircle2 size={14} />}
                </button>
                <div className="study-task-info">
                  <div className={`study-task-title ${completedTasks.has(task.id) ? 'completed' : ''}`}>
                    {task.title}
                  </div>
                  <div className="study-task-meta">{task.subject}</div>
                </div>
                <Badge variant={task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'success'}>
                  {task.priority}
                </Badge>
                <span className="study-task-time">{task.duration}</span>
              </div>
            ))}
          </Card.Body>
        </Card>

        {/* Performance Chart */}
        <Card>
          <Card.Header>
            <div>
              <h3 className="card-title">Score Trend</h3>
              <p className="card-subtitle">Your performance over the last 6 weeks</p>
            </div>
            <Link to="/performance" className="section-action">Details <ChevronRight size={14} /></Link>
          </Card.Header>
          <Card.Body>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 12 }} domain={[40, 100]} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '13px' }}
                />
                <Area type="monotone" dataKey="score" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#scoreGrad)" dot={{ fill: 'var(--color-primary)', strokeWidth: 2, r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>

        {/* Subject Performance */}
        <Card>
          <Card.Header>
            <h3 className="card-title">Subject Performance</h3>
          </Card.Header>
          <Card.Body>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {subjectPerformance.map(sub => (
                <div key={sub.subject}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <span style={{ fontWeight: 'var(--font-medium)', fontSize: 'var(--text-base)' }}>{sub.subject}</span>
                    <span style={{ fontWeight: 'var(--font-semibold)', color: getScoreColor(sub.score) }}>{sub.score}%</span>
                  </div>
                  <ProgressBar value={sub.score} />
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                    {sub.tests} tests taken · {sub.accuracy}% accuracy
                  </div>
                </div>
              ))}
            </div>
          </Card.Body>
          <Card.Footer>
            <Link to="/performance" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View detailed analytics <ArrowRight size={14} />
            </Link>
          </Card.Footer>
        </Card>

        {/* Weak Topics */}
        <Card>
          <Card.Header>
            <div>
              <h3 className="card-title">
                <AlertTriangle size={18} style={{ color: 'var(--color-warning)', marginRight: '8px', verticalAlign: 'middle' }} />
                Weak Topics
              </h3>
              <p className="card-subtitle">Focus on these to improve your readiness</p>
            </div>
            <AIBadge>AI Identified</AIBadge>
          </Card.Header>
          <Card.Body>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {weakTopics.map((wt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-alt)' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'var(--color-danger-light)', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 'var(--font-bold)', fontSize: 'var(--text-sm)' }}>
                    {wt.score}%
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'var(--font-medium)', fontSize: 'var(--text-base)' }}>{wt.topic}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>{wt.subject}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>{wt.recommendation}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card.Body>
          <Card.Footer>
            <Button variant="ghost" size="sm" onClick={() => navigate('/exam')}>
              Practice Weak Topics <ArrowRight size={14} />
            </Button>
          </Card.Footer>
        </Card>

        {/* Recent Activity */}
        <Card style={{ gridColumn: '1 / -1' }}>
          <Card.Header>
            <h3 className="card-title">Recent Activity</h3>
          </Card.Header>
          <Card.Body style={{ padding: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recentActivity.map(activity => (
                <div key={activity.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4) var(--space-6)', borderBottom: '1px solid var(--color-border-light)' }}>
                  <span style={{ fontSize: 'var(--text-xl)' }}>{activity.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'var(--font-medium)' }}>{activity.title}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{activity.time}</div>
                  </div>
                  {activity.score && <Badge variant="primary">{activity.score}</Badge>}
                  {activity.duration && <Badge variant="neutral">{activity.duration}</Badge>}
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}
