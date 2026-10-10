// ============================================
// AGENTEXAM — Profile & Settings Page
// ============================================
import { useState, useEffect } from 'react';
import { User, Mail, GraduationCap, Building, Calendar, BookOpen, Bell, Palette, Shield, LogOut } from 'lucide-react';
import { Card, Button, Input, Select, Badge, Tabs, PageLoading } from '../components/ui';
import { getProfile, updateProfile } from '../services/students';
import { getInitials } from '../utils/helpers';

export default function Profile() {
  const [activeTab, setActiveTab] = useState('profile');
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    university: '',
    program: '',
    semester: '',
  });

  useEffect(() => {
    getProfile().then(data => {
        setStudent(data);
        setForm(f => ({
            ...f,
            name: data?.name || '',
            email: data?.email || '',
            program: data?.department || '',
            semester: data?.semester || ''
        }));
        setLoading(false);
    }).catch(err => {
        console.error(err);
        setLoading(false);
    });
  }, []);

  const handleSave = () => {
      setSaving(true);
      const updates = { name: form.name, department: form.program, semester: form.semester };
      updateProfile(updates).then(data => {
          setStudent(data);
          setSaving(false);
      }).catch(err => {
          console.error(err);
          setSaving(false);
      });
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'academic', label: 'Academic', icon: GraduationCap },
    { id: 'preferences', label: 'Preferences', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'account', label: 'Account', icon: Shield },
  ];

  if (loading) return <PageLoading />;

  return (
    <div className="animate-fade-in-up">
      {/* Profile Header */}
      <Card style={{ marginBottom: 'var(--space-6)' }}>
        <div className="profile-header-card">
          <div className="profile-avatar">{getInitials(student?.name || 'Student')}</div>
          <div className="profile-info">
            <h2>{student?.name || 'Student'}</h2>
            <p>{student?.email || 'student@example.com'}</p>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
              <Badge variant="primary">{student?.department || form.program}</Badge>
              <Badge variant="neutral">Semester {student?.semester || form.semester}</Badge>
              {student?.enrollment_no && <Badge variant="neutral">ID: {student.enrollment_no}</Badge>}
            </div>
          </div>
          <Button variant="secondary">Edit Photo</Button>
        </div>
      </Card>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div style={{ marginTop: 'var(--space-6)' }}>
        {activeTab === 'profile' && (
          <Card>
            <Card.Header><h3 className="card-title">Personal Information</h3></Card.Header>
            <Card.Body>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)', maxWidth: '600px' }}>
                <Input label="Full Name" icon={User} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                <Input label="Email" icon={Mail} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled />
              </div>
              <div style={{ marginTop: 'var(--space-6)' }}>
                <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
              </div>
            </Card.Body>
          </Card>
        )}

        {activeTab === 'academic' && (
          <Card>
            <Card.Header><h3 className="card-title">Academic Information</h3></Card.Header>
            <Card.Body>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)', maxWidth: '600px' }}>
                <Input label="University" icon={Building} value={form.university} onChange={e => setForm({ ...form, university: e.target.value })} disabled />
                <Input label="Program" icon={GraduationCap} value={form.program} onChange={e => setForm({ ...form, program: e.target.value })} disabled />
                <Select
                  label="Semester"
                  options={[1, 2, 3, 4, 5, 6, 7, 8].map(s => ({ value: String(s), label: `Semester ${s}` }))}
                  value={form.semester}
                  onChange={e => setForm({ ...form, semester: e.target.value })}
                  disabled
                />
              </div>
            </Card.Body>
          </Card>
        )}

        {activeTab === 'preferences' && (
          <Card>
            <Card.Header><h3 className="card-title">Preferences</h3></Card.Header>
            <Card.Body>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: '500px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4)', background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)' }}>
                  <div><div style={{ fontWeight: 'var(--font-medium)' }}>Dark Mode</div><div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>Switch between light and dark theme</div></div>
                  <Badge variant="neutral">Coming Soon</Badge>
                </div>
                <Select label="Default Exam Duration" options={[{ value: '15', label: '15 minutes' }, { value: '30', label: '30 minutes' }, { value: '45', label: '45 minutes' }, { value: '60', label: '60 minutes' }]} value="30" onChange={() => {}} />
                <Select label="Default Difficulty" options={[{ value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' }]} value="medium" onChange={() => {}} />
              </div>
            </Card.Body>
          </Card>
        )}

        {activeTab === 'notifications' && (
          <Card>
            <Card.Header><h3 className="card-title">Notification Settings</h3></Card.Header>
            <Card.Body>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '500px' }}>
                {[
                  { title: 'Study Reminders', desc: 'Daily study plan reminders' },
                  { title: 'Test Results', desc: 'Notifications when results are ready' },
                  { title: 'Weak Topic Alerts', desc: 'Alerts when new weak topics are identified' },
                  { title: 'Performance Updates', desc: 'Weekly performance summary' },
                ].map((item, i) => (
                  <label key={i} className="checkbox-group" style={{ padding: 'var(--space-3)', background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 'var(--font-medium)' }}>{item.title}</div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{item.desc}</div>
                    </div>
                    <input type="checkbox" className="checkbox-input" defaultChecked />
                  </label>
                ))}
              </div>
            </Card.Body>
          </Card>
        )}

        {activeTab === 'account' && (
          <Card>
            <Card.Header><h3 className="card-title">Account Settings</h3></Card.Header>
            <Card.Body>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: '500px' }}>
                <Button variant="secondary" icon={Shield}>Change Password</Button>
                <div className="divider" />
                <div>
                  <h4 style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-danger)', marginBottom: 'var(--space-2)' }}>Danger Zone</h4>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>Permanently delete your account and all associated data.</p>
                  <Button variant="danger" icon={LogOut}>Delete Account</Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        )}
      </div>
    </div>
  );
}
