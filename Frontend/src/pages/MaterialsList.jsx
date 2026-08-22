import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMaterials } from '../services/materials';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';

/**
 * MaterialsList page — shows materials uploaded by the current student.
 * Connected to: GET /api/v1/materials/  (server-scoped to current user)
 */
const MaterialsList = () => {
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getMaterials({ limit: 50 });
        setMaterials(data);
      } catch (err) {
        setError(err.message || 'Failed to load materials.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getStatusBadge = (status) => {
    if (!status) return null;
    const s = status.toUpperCase();
    const styles = {
      PROCESSED: { bg: '#dcfce7', color: '#166534', label: 'Analyzed' },
      PROCESSING: { bg: '#fef3c7', color: '#854d0e', label: 'Processing' },
      PENDING: { bg: '#f3f4f6', color: '#374151', label: 'Pending' },
      FAILED: { bg: '#fee2e2', color: '#991b1b', label: 'Failed' },
    };
    const style = styles[s] || styles.PENDING;
    return (
      <span style={{ background: style.bg, color: style.color, padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
        {style.label}
      </span>
    );
  };

  if (loading) return <LoadingState message="Loading study materials..." />;

  return (
    <div className="page-container p-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold mb-2">My Study Materials</h2>
          <p className="text-muted text-sm">Documents you have uploaded and their processing status.</p>
        </div>
        <Link
          to="/upload-material"
          className="btn btn-primary"
          style={{ padding: '10px 18px', background: 'var(--color-primary)', color: 'white', borderRadius: 'var(--radius-md)', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}
        >
          <i className="fas fa-upload mr-2" />Upload New
        </Link>
      </div>

      {error && (
        <div className="card p-4 mb-4" style={{ background: '#fee2e2', color: '#991b1b' }}>
          <i className="fas fa-exclamation-circle mr-2"></i>{error}
        </div>
      )}

      {!error && materials.length === 0 ? (
        <EmptyState
          title="No Materials Yet"
          message="Upload your syllabus, lab manuals, PYQs or notes to get started."
          icon="fa-folder-open"
        />
      ) : (
        <div className="grid-2col">
          {materials.map((mat) => (
            <div key={mat.id} className="card p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px',
                    background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--color-primary)', fontSize: '18px'
                  }}>
                    <i className="fas fa-file-pdf"></i>
                  </div>
                  <div>
                    <div className="font-medium text-sm" style={{ color: 'var(--text-main)' }}>{mat.title}</div>
                    <div className="text-xs text-muted">{mat.material_type}</div>
                  </div>
                </div>
                {getStatusBadge(mat.processing_status)}
              </div>
              <div className="mt-auto flex justify-end gap-2">
                <a
                  href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/materials/${mat.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'transparent', cursor: 'pointer', textDecoration: 'none', fontSize: '13px', color: 'var(--text-main)' }}
                >
                  <i className="fas fa-download mr-1"></i> Download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MaterialsList;
