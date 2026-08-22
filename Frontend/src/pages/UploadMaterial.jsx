import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadMaterial } from '../services/materials';
import { getSubjects } from '../services/syllabus';
import LoadingState from '../components/common/LoadingState';

/**
 * UploadMaterial page — Student academic data upload
 *
 * Connected to:
 *   GET  /api/v1/subjects/          (subject list for selector)
 *   POST /api/v1/materials/upload   (multipart/form-data)
 *
 * After upload the server automatically triggers document processing
 * (UPLOADED → PROCESSING → PROCESSED/FAILED).
 */
const MATERIAL_TYPES = [
  { value: 'SYLLABUS',   label: 'Theory Syllabus',   icon: 'fa-book-open' },
  { value: 'LAB_MANUAL', label: 'Lab / Practical Syllabus', icon: 'fa-flask' },
  { value: 'PYQ',        label: 'Previous Year Questions (PYQ)', icon: 'fa-history' },
  { value: 'NOTES',      label: 'Notes / Study Material', icon: 'fa-sticky-note' },
  { value: 'OTHER',      label: 'Other Academic Material', icon: 'fa-file-alt' },
];

const UploadMaterial = () => {
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [materialType, setMaterialType] = useState('SYLLABUS');
  const [subjectId, setSubjectId] = useState('');
  const [file, setFile] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(null);   // { id, title, status }
  const [error, setError] = useState('');

  // Load subjects on mount
  useEffect(() => {
    getSubjects({ limit: 100 })
      .then(data => {
        setSubjects(data);
        if (data.length > 0) setSubjectId(data[0].id);
      })
      .catch(() => setError('Could not load subjects. Please refresh the page.'))
      .finally(() => setSubjectsLoading(false));
  }, []);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    // Pre-fill title from filename if not already set
    if (!title) {
      const base = f.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
      setTitle(base);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select a file.'); return; }
    if (!subjectId) { setError('Please select a subject.'); return; }
    if (!title.trim()) { setError('Please enter a title.'); return; }

    setUploading(true);
    setError('');
    setSuccess(null);

    try {
      const result = await uploadMaterial({ title: title.trim(), materialType, subjectId, file });
      setSuccess({ id: result.id, title: result.title, status: result.processing_status });
      // Reset form
      setTitle('');
      setFile(null);
      setMaterialType('SYLLABUS');
      if (e.target) e.target.reset();
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (subjectsLoading) return <LoadingState message="Loading subjects..." />;

  return (
    <div className="page-container p-6" style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>
          Upload Academic Material
        </h2>
        <p className="text-muted text-sm">
          Upload your syllabus, PYQs, lab manuals, or notes. The system will automatically
          process and analyse them to personalise your exam preparation.
        </p>
      </div>

      {/* Success banner */}
      {success && (
        <div className="card p-4 mb-6" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }}>
          <div className="flex items-center gap-3">
            <i className="fas fa-check-circle fa-lg" />
            <div>
              <p className="font-semibold">"{success.title}" uploaded successfully!</p>
              <p className="text-sm mt-1">
                Processing has started automatically.&nbsp;
                <button
                  onClick={() => navigate('/materials')}
                  style={{ textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 600 }}
                >
                  View all materials →
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="card p-4 mb-6" style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}>
          <i className="fas fa-exclamation-circle mr-2" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-5">

        {/* Material type picker */}
        <div>
          <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text-main)' }}>
            Material Type <span style={{ color: 'var(--color-primary)' }}>*</span>
          </label>
          <div className="flex flex-col gap-2">
            {MATERIAL_TYPES.map(mt => (
              <label
                key={mt.value}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 14px', borderRadius: 'var(--radius-md)',
                  border: `2px solid ${materialType === mt.value ? 'var(--color-primary)' : 'var(--border)'}`,
                  background: materialType === mt.value ? 'var(--primary-light, rgba(99,102,241,0.08))' : 'var(--bg-input)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <input
                  type="radio"
                  name="materialType"
                  value={mt.value}
                  checked={materialType === mt.value}
                  onChange={e => setMaterialType(e.target.value)}
                  style={{ display: 'none' }}
                />
                <i className={`fas ${mt.icon}`} style={{ color: 'var(--color-primary)', width: '16px' }} />
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-main)' }}>{mt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Subject selector */}
        <div>
          <label htmlFor="subject-select" className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-main)' }}>
            Subject <span style={{ color: 'var(--color-primary)' }}>*</span>
          </label>
          {subjects.length === 0 ? (
            <p className="text-sm text-muted">No subjects available. Please contact your administrator.</p>
          ) : (
            <select
              id="subject-select"
              value={subjectId}
              onChange={e => setSubjectId(e.target.value)}
              required
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', background: 'var(--bg-input)',
                color: 'var(--text-main)', fontSize: '14px',
              }}
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          )}
        </div>

        {/* Title */}
        <div>
          <label htmlFor="mat-title" className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-main)' }}>
            Title <span style={{ color: 'var(--color-primary)' }}>*</span>
          </label>
          <input
            id="mat-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. DBMS Syllabus 2025"
            required
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)', background: 'var(--bg-input)',
              color: 'var(--text-main)', fontSize: '14px',
            }}
          />
        </div>

        {/* File picker */}
        <div>
          <label htmlFor="mat-file" className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-main)' }}>
            File <span style={{ color: 'var(--color-primary)' }}>*</span>
            <span className="text-muted ml-2" style={{ fontWeight: 400, fontSize: '12px' }}>(PDF, DOCX, TXT, PNG, JPG — max 20 MB)</span>
          </label>
          <label
            htmlFor="mat-file"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '8px', padding: '28px 20px', borderRadius: 'var(--radius-md)',
              border: `2px dashed ${file ? 'var(--color-primary)' : 'var(--border)'}`,
              background: 'var(--bg-input)', cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <i className={`fas ${file ? 'fa-file-check' : 'fa-cloud-upload-alt'} fa-2x`}
               style={{ color: file ? 'var(--color-primary)' : 'var(--text-muted)' }} />
            <span style={{ fontSize: '14px', color: file ? 'var(--text-main)' : 'var(--text-muted)' }}>
              {file ? file.name : 'Click to select or drag and drop your file'}
            </span>
            <input
              id="mat-file"
              type="file"
              accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {/* Processing note */}
        <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
          <p className="text-sm text-muted">
            <i className="fas fa-info-circle mr-2" style={{ color: 'var(--color-primary)' }} />
            After upload, the system will automatically extract topics, chapters, and questions
            (for PYQs) and index the content for AI-powered exam preparation.
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={uploading || subjects.length === 0}
          className="btn btn-primary"
          style={{
            padding: '12px', fontSize: '15px', fontWeight: 600,
            background: 'var(--color-primary)', color: 'white',
            border: 'none', borderRadius: 'var(--radius-md)', cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.7 : 1, transition: 'opacity 0.15s',
          }}
        >
          {uploading
            ? <><i className="fas fa-spinner fa-spin mr-2" />Uploading…</>
            : <><i className="fas fa-upload mr-2" />Upload Material</>
          }
        </button>
      </form>
    </div>
  );
};

export default UploadMaterial;
