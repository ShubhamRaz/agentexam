// ============================================
// AGENTEXAM — PYQ Analysis Page
// ============================================
import { useState, useEffect } from 'react';
import { Filter, TrendingUp, BarChart2, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Card, Badge, Button, Tabs, SearchInput, AIBadge, PageLoading } from '../components/ui';
import { getPYQs } from '../services/pyqs';
import { getSubjects } from '../services/academic';

const COLORS = ['#4F46E5', '#06B6D4', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981', '#EC4899'];

export default function PYQAnalysis() {
  const [pyqs, setPyqs] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubject, setActiveSubject] = useState('all');
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('all');

  useEffect(() => {
    Promise.all([getPYQs(), getSubjects()]).then(([pyqData, subjectData]) => {
      setPyqs(pyqData || []);
      setSubjects(subjectData || []);
      setLoading(false);
    });
  }, []);

  const filtered = pyqs
    .filter(p => activeSubject === 'all' || p.subjectId === activeSubject)
    .filter(p => yearFilter === 'all' || p.year === Number(yearFilter))
    .filter(p => p.question.toLowerCase().includes(search.toLowerCase()) || p.topic.toLowerCase().includes(search.toLowerCase()));

  // Analytics
  const topicFreq = {};
  filtered.forEach(p => { topicFreq[p.topic] = (topicFreq[p.topic] || 0) + p.frequency; });
  const topicData = Object.entries(topicFreq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));

  const typeCount = {};
  filtered.forEach(p => { typeCount[p.type] = (typeCount[p.type] || 0) + 1; });
  const typeData = Object.entries(typeCount).map(([name, value]) => ({ name, value }));

  const yearCount = {};
  pyqs.forEach(p => { yearCount[p.year] = (yearCount[p.year] || 0) + 1; });

  if (loading) return <PageLoading />;

  return (
    <div className="animate-fade-in-up">
      {/* Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <Tabs
          tabs={[{ id: 'all', label: 'All Subjects' }, ...subjects.map(s => ({ id: s.id, label: s.name }))]}
          activeTab={activeSubject}
          onChange={setActiveSubject}
          variant="pills"
        />
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <div className="filter-bar">
            {['all', '2025', '2024', '2023'].map(y => (
              <button key={y} className={`filter-chip ${yearFilter === y ? 'active' : ''}`} onClick={() => setYearFilter(y)}>
                {y === 'all' ? 'All Years' : y}
              </button>
            ))}
          </div>
          <SearchInput value={search} onChange={setSearch} placeholder="Search questions..." />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-cols-2" style={{ marginBottom: 'var(--space-6)' }}>
        <Card>
          <Card.Header>
            <h3 className="card-title">Topic Frequency</h3>
            <AIBadge>AI Analyzed</AIBadge>
          </Card.Header>
          <Card.Body>
            {topicData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topicData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <YAxis type="category" dataKey="name" width={150} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#0F172A' }} />
                <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[0, 6, 6, 0]} barSize={14}>
                  {topicData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            ) : <div style={{height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>No PYQs found</div>}
          </Card.Body>
        </Card>

        <Card>
          <Card.Header>
            <h3 className="card-title">Question Type Distribution</h3>
          </Card.Header>
          <Card.Body>
            {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={typeData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            ) : <div style={{height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>No PYQs found</div>}
          </Card.Body>
        </Card>
      </div>

      {/* PYQ Table */}
      <Card>
        <Card.Header>
          <div>
            <h3 className="card-title">Previous Year Questions ({filtered.length})</h3>
            <p className="card-subtitle">Complete PYQ collection with topic mapping</p>
          </div>
        </Card.Header>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Subject</th>
                <th style={{ minWidth: '200px' }}>Topic</th>
                <th>Type</th>
                <th>Marks</th>
                <th>Freq</th>
                <th style={{ minWidth: '300px' }}>Question</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(pyq => (
                <tr key={pyq.id}>
                  <td><Badge variant="neutral">{pyq.year}</Badge></td>
                  <td style={{ fontSize: 'var(--text-sm)' }}>{pyq.subject}</td>
                  <td style={{ fontWeight: 'var(--font-medium)', fontSize: 'var(--text-sm)' }}>{pyq.topic}</td>
                  <td>
                    <Badge variant={pyq.type === 'Long Answer' ? 'primary' : pyq.type === 'Short Answer' ? 'warning' : 'info'}>
                      {pyq.type}
                    </Badge>
                  </td>
                  <td style={{ fontWeight: 'var(--font-semibold)' }}>{pyq.marks}</td>
                  <td>
                    <span style={{ color: pyq.frequency >= 4 ? 'var(--color-danger)' : 'var(--color-text-secondary)', fontWeight: pyq.frequency >= 4 ? 'var(--font-bold)' : 'normal' }}>
                      {pyq.frequency}x
                    </span>
                  </td>
                  <td style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', maxWidth: '400px' }}>
                    {pyq.question.length > 120 ? pyq.question.slice(0, 120) + '...' : pyq.question}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
