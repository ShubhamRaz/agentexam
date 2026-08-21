import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getStudentProfile } from '../services/students';
import LoadingState from '../components/common/LoadingState';

/**
 * ProfileSettings page — connected to:
 *   GET /api/v1/auth/me  (via AuthContext — user is already loaded)
 *   GET /api/v1/students/me (for academic profile fields)
 */
const ProfileSettings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getStudentProfile();
        setProfile(data);
      } catch {
        // Fall back to basic auth user data
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const displayName = profile?.name || user?.name || 'Student';
  const email = profile?.email || user?.email || '';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (loading) return <LoadingState message="Loading profile..." />;

  return (
    <div className="page-container p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>Profile & Settings</h2>
        <p className="text-muted">Your account and academic information.</p>
      </div>

      <div className="grid-3col">
        {/* Avatar card */}
        <div>
          <div className="card p-6 text-center">
            <div className="mx-auto mb-4 flex items-center justify-center font-bold text-2xl"
              style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', color: 'white' }}>
              {initials}
            </div>
            <h3 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>{displayName}</h3>
            <p className="text-sm text-muted mb-4">{email}</p>
            <div className="inline-block" style={{
              background: '#dbeafe', color: '#1e40af',
              padding: '4px 12px', borderRadius: '12px', fontWeight: 'bold', fontSize: '12px'
            }}>
              {user?.role || 'Student'}
            </div>
          </div>
        </div>

        {/* Info columns */}
        <div style={{ gridColumn: 'span 2' }} className="flex flex-col gap-6">
          <div className="card p-6">
            <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-main)' }}>Account Information</h3>
            <div className="grid-2col">
              <div>
                <label className="text-xs font-bold uppercase text-muted">Full Name</label>
                <div className="font-medium mt-1" style={{ color: 'var(--text-main)' }}>{displayName}</div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted">Email</label>
                <div className="font-medium mt-1" style={{ color: 'var(--text-main)' }}>{email}</div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted">Role</label>
                <div className="font-medium mt-1" style={{ color: 'var(--text-main)' }}>{user?.role || 'Student'}</div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted">Account Status</label>
                <div className="font-medium mt-1" style={{ color: user?.is_active ? '#22c55e' : '#ef4444' }}>
                  {user?.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>
          </div>

          {profile?.enrollment_no && (
            <div className="card p-6">
              <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--text-main)' }}>Academic Information</h3>
              <div className="grid-2col">
                {profile.enrollment_no && (
                  <div>
                    <label className="text-xs font-bold uppercase text-muted">Enrollment No.</label>
                    <div className="font-medium mt-1" style={{ color: 'var(--text-main)' }}>{profile.enrollment_no}</div>
                  </div>
                )}
                {profile.semester && (
                  <div>
                    <label className="text-xs font-bold uppercase text-muted">Semester</label>
                    <div className="font-medium mt-1" style={{ color: 'var(--text-main)' }}>{profile.semester}</div>
                  </div>
                )}
                {profile.department && (
                  <div>
                    <label className="text-xs font-bold uppercase text-muted">Department</label>
                    <div className="font-medium mt-1" style={{ color: 'var(--text-main)' }}>{profile.department}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleLogout}
              style={{
                background: '#fee2e2', color: '#991b1b', border: 'none',
                padding: '10px 20px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 'bold'
              }}
            >
              <i className="fas fa-sign-out-alt mr-2"></i> Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
