// ============================================
// AGENTEXAM — Materials Page
// ============================================
import { useState, useEffect } from 'react';
import { Upload, FileText, File, Search, Filter, FolderOpen, MoreVertical, Eye, Trash2, Download } from 'lucide-react';
import { Card, Badge, Button, Tabs, SearchInput, EmptyState, PageLoading } from '../components/ui';
import { getMaterials } from '../services/materials';
import { getMaterialTypeIcon, getMaterialTypeColor, formatDate } from '../utils/helpers';

export default function Materials() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    getMaterials().then(data => { setMaterials(data); setLoading(false); });
  }, []);

  const tabs = [
    { id: 'all', label: 'All Materials', count: materials.length },
    { id: 'syllabus', label: 'Syllabus', count: materials.filter(m => m.type === 'syllabus').length },
    { id: 'pyq', label: 'PYQs', count: materials.filter(m => m.type === 'pyq').length },
    { id: 'notes', label: 'Notes', count: materials.filter(m => m.type === 'notes').length },
    { id: 'lab_manual', label: 'Lab Manuals', count: materials.filter(m => m.type === 'lab_manual').length },
  ];

  const filtered = materials
    .filter(m => activeTab === 'all' || m.type === activeTab)
    .filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

  const statusBadge = (status) => {
    const map = {
      completed: { variant: 'success', label: '✓ Analyzed' },
      processing: { variant: 'warning', label: '⟳ Processing' },
      analyzing: { variant: 'info', label: '◎ Analyzing' },
      uploading: { variant: 'neutral', label: '↑ Uploading' },
    };
    const s = map[status] || map.completed;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  if (loading) return <PageLoading />;

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Default to the first subject available if not filtered, or prompt user.
    // For now, if activeTab is not a subject, we'll just fail gracefully or pick a generic subject ID if needed.
    // Actually, backend requires subject_id. Let's just use a dummy one or alert the user.
    alert("Upload functionality requires selecting a subject first. We will implement the subject picker modal shortly.");
  };

  return (
    <div className="animate-fade-in-up">
      {/* Upload Zone */}
      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        style={{ marginBottom: 'var(--space-8)' }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); }}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <input type="file" id="file-upload" hidden multiple accept=".pdf,.doc,.docx,.jpg,.png" onChange={handleUpload} />
        <div className="upload-zone-icon"><Upload size={24} /></div>
        <h3 className="upload-zone-title">Upload Study Materials</h3>
        <p className="upload-zone-subtitle">Drag & drop files or click to browse · PDF, DOC, Images · Max 10MB each</p>
      </div>

      {/* Tabs & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-5)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        <SearchInput value={search} onChange={setSearch} placeholder="Search materials..." />
      </div>

      {/* Materials Grid */}
      {filtered.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No materials found" description="Upload your syllabus, PYQs, notes, or lab manuals to get started."
          action={<Button variant="primary" icon={Upload}>Upload Material</Button>} />
      ) : (
        <div className="grid-auto stagger-children">
          {filtered.map(mat => {
            const typeColor = getMaterialTypeColor(mat.type);
            return (
              <Card key={mat.id} hoverable>
                <div className="material-card">
                  <div className="material-card-icon" style={{ background: typeColor.bg, color: typeColor.color }}>
                    <FileText size={20} />
                  </div>
                  <div className="material-card-info">
                    <div className="material-card-name">{mat.name}</div>
                    <div className="material-card-meta">
                      {mat.subject} · {mat.pages} pages · {mat.size}
                    </div>
                    <div style={{ marginTop: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      {statusBadge(mat.status)}
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                        {formatDate(mat.uploadDate)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
