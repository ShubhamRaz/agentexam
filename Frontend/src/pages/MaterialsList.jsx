import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

const MaterialsList = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaterials = async () => {
      const data = await api.getMaterials();
      setMaterials(data);
      setLoading(false);
    };
    fetchMaterials();
  }, []);

  if (loading) {
    return <div className="p-4 text-center text-muted"><i className="fas fa-spinner fa-spin mr-2"></i>Loading materials...</div>;
  }

  return (
    <div className="materials-page">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-2xl font-bold">Study Materials</h3>
          <p className="text-muted text-sm mt-1">Upload and analyze syllabus, notes, and PYQs.</p>
        </div>
        <button className="btn btn-primary"><i className="fas fa-upload"></i> Upload Material</button>
      </div>

      <div className="grid-2col">
        {/* Upload Zone */}
        <div className="card">
          <div className="card-header">
            <h4><i className="fas fa-cloud-upload-alt text-blue-600 mr-2"></i>New Upload</h4>
          </div>
          <div className="upload-zone mb-4" onClick={() => alert('File upload simulated.')}>
            <i className="fas fa-file-upload"></i>
            <h5>Drag and drop files here</h5>
            <p>or click to browse from your computer</p>
            <div className="formats">Supported formats: PDF, DOCX, JPG, PNG (Max 50MB)</div>
          </div>
          <p className="text-xs text-light"><i className="fas fa-info-circle mr-1"></i> AI will automatically analyze your materials to update your study plan and exam readiness.</p>
        </div>

        {/* Uploaded Materials List */}
        <div className="card">
          <div className="card-header">
            <h4><i className="fas fa-folder-open text-blue-600 mr-2"></i>Your Materials</h4>
            <button className="link"><i className="fas fa-filter"></i> Filter</button>
          </div>
          <div className="flex flex-col gap-3">
            {materials.map((mat) => (
              <div key={mat.id} className="flex items-center gap-4 p-3 border border-light rounded-md hover:bg-input transition-colors cursor-pointer">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-md">
                  <i className="fas fa-file-pdf text-xl"></i>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{mat.name}</div>
                  <div className="text-xs text-muted flex gap-2 mt-1">
                    <span>{mat.subject}</span>
                    <span>•</span>
                    <span>{mat.date}</span>
                  </div>
                </div>
                <span className={`badge ${
                  mat.status === 'Analyzed' ? 'badge-success' : 
                  mat.status === 'Processing' ? 'badge-warning' : 'badge-secondary'
                }`}>
                  {mat.status === 'Processing' && <i className="fas fa-circle-notch fa-spin mr-1"></i>}
                  {mat.status}
                </span>
                <button className="btn btn-outline-primary btn-sm"><i className="fas fa-eye"></i></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaterialsList;
