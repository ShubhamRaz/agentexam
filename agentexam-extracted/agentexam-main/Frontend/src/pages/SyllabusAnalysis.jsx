// ============================================
// AGENTEXAM — Syllabus Analysis Page
// ============================================
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, Badge, Tabs, ProgressBar, AIBadge, PageLoading, Select } from '../components/ui';
import { getSubjects, getSubjectUnits } from '../services/academic';

export default function SyllabusAnalysis() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [subjectUnits, setSubjectUnits] = useState([]);
  const [expandedUnits, setExpandedUnits] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSubjects().then(data => {
      setSubjects(data);
      if (data.length > 0) {
        setSelectedSubject(data[0].id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      setLoading(true);
      getSubjectUnits(selectedSubject).then(data => {
        setSubjectUnits(data);
        if (data.length > 0) {
          setExpandedUnits(new Set([data[0].id]));
        }
        setLoading(false);
      });
    }
  }, [selectedSubject]);

  if (loading && subjects.length === 0) return <PageLoading />;

  const subjectData = subjects.find(s => s.id === selectedSubject);

  const allTopics = subjectUnits.flatMap(u => u.topics || []);
  const topTopics = [...allTopics].sort((a, b) => (b.weightage || 0) - (a.weightage || 0)).slice(0, 8);

  const toggleUnit = (unitId) => {
    setExpandedUnits(prev => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  };

  const importanceBadge = (importance = 'medium') => {
    const map = { high: 'danger', medium: 'warning', low: 'success' };
    return <Badge variant={map[importance.toLowerCase()] || 'warning'}>{importance.charAt(0).toUpperCase() + importance.slice(1)}</Badge>;
  };

  return (
    <div className="animate-fade-in-up">
      {/* Subject Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        <Tabs
          tabs={subjects.map(s => ({ id: s.id, label: s.name }))}
          activeTab={selectedSubject}
          onChange={setSelectedSubject}
          variant="pills"
        />
        <AIBadge>AI Analyzed</AIBadge>
      </div>

      {loading && subjects.length > 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
          <PageLoading />
        </div>
      ) : subjectUnits.length === 0 ? (
        <Card><Card.Body>No syllabus data available for this subject.</Card.Body></Card>
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 'var(--space-6)' }}>
        {/* Units & Topics */}
        <div>
          <Card>
            <Card.Header>
              <div>
                <h3 className="card-title">{subjectData?.name} — Syllabus Breakdown</h3>
                <p className="card-subtitle">{allTopics.length} topics across {subjectUnits.length} units</p>
              </div>
            </Card.Header>
            <Card.Body style={{ padding: 0 }}>
              {subjectUnits.map(unit => (
                <div key={unit.id}>
                  <button
                    onClick={() => toggleUnit(unit.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                      padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border-light)',
                      background: expandedUnits.has(unit.id) ? 'var(--color-primary-50)' : 'transparent',
                      transition: 'background 0.2s', textAlign: 'left', cursor: 'pointer'
                    }}
                  >
                    {expandedUnits.has(unit.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    <span style={{ flex: 1, fontWeight: 'var(--font-semibold)' }}>{unit.name}</span>
                    <Badge variant="neutral">{(unit.topics || []).length} topics</Badge>
                  </button>
                  {expandedUnits.has(unit.id) && (
                    <div>
                      {(unit.topics || []).map(topic => (
                        <div key={topic.id} className="topic-row">
                          <span className="topic-name">{topic.name}</span>
                          <div className="topic-importance">{importanceBadge(topic.importance || 'medium')}</div>
                          <div className="topic-frequency" title="PYQ Frequency">
                            📄 {topic.pyqFrequency || 0}x
                          </div>
                          <div style={{ width: '100px' }}>
                            <ProgressBar value={topic.weightage || 0} max={20} size="sm" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </Card.Body>
          </Card>
        </div>

        {/* Sidebar: Weightage Chart + Important Topics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <Card>
            <Card.Header>
              <h3 className="card-title">Topic Weightage</h3>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topTopics} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis type="category" dataKey="name" width={130} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#0F172A' }} />
                  <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="weightage" radius={[0, 4, 4, 0]} barSize={16}>
                    {topTopics.map((t, i) => (
                      <Cell key={i} fill={t.importance === 'high' ? '#EF4444' : t.importance === 'medium' ? '#F59E0B' : '#10B981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <h3 className="card-title">🔥 Most Important Topics</h3>
            </Card.Header>
            <Card.Body>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {allTopics.filter(t => (t.importance || 'medium') === 'high').slice(0, 6).map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) 0' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-danger-light)', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>{t.name}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                        PYQ: {t.pyqFrequency || 0}x · Weight: {t.weightage || 0}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <h3 className="card-title">Summary</h3>
            </Card.Header>
            <Card.Body>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>High Priority</span>
                  <Badge variant="danger">{allTopics.filter(t => (t.importance || 'medium') === 'high').length} topics</Badge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>Medium Priority</span>
                  <Badge variant="warning">{allTopics.filter(t => (t.importance || 'medium') === 'medium').length} topics</Badge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>Low Priority</span>
                  <Badge variant="success">{allTopics.filter(t => (t.importance || 'medium') === 'low').length} topics</Badge>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>
      )}
    </div>
  );
}
