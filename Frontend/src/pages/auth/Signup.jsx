// ============================================
// AGENTEXAM — Signup Page
// ============================================
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, GraduationCap, Eye, EyeOff } from 'lucide-react';
import { Button, Input, Select } from '../../components/ui';

import { register, login } from '../../services/auth';

export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < 3) { setStep(step + 1); return; }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (error) {
      alert('Signup failed: ' + (error.response?.data?.detail || error.message));
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-left">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
              <div className="sidebar-logo-icon"><GraduationCap size={20} /></div>
              <span className="sidebar-logo-text">Agent<span>Exam</span></span>
            </div>
            <h1 className="auth-form-title">Create your account</h1>
            <p className="auth-form-subtitle">Step {step} of 3 — {step === 1 ? 'Credentials' : step === 2 ? 'Personal Info' : 'Academic Info'}</p>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
              {[1, 2, 3].map(s => (
                <div key={s} style={{ flex: 1, height: '4px', borderRadius: 'var(--radius-full)', background: s <= step ? 'var(--color-primary)' : 'var(--color-border)', transition: 'background 0.3s' }} />
              ))}
            </div>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {step === 1 && (
              <>
                <Input label="Email" type="email" icon={Mail} placeholder="you@university.edu" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <div className="input-with-icon">
                      <Lock size={18} className="input-icon" />
                      <input className="form-input" type={showPassword ? 'text' : 'password'} placeholder="Create a password" style={{ paddingRight: '44px' }} required value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                    </div>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <Input label="Confirm Password" type="password" icon={Lock} placeholder="Confirm your password" required />
              </>
            )}
            {step === 2 && (
              <>
                <Input label="Full Name" icon={User} placeholder="Your full name" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                <Input label="Phone Number" type="tel" placeholder="+91 9876543210" />
              </>
            )}
            {step === 3 && (
              <>
                <Input label="University" placeholder="e.g., Delhi Technical University" required />
                <Select label="Program" placeholder="Select program" options={[{ value: 'btech_cs', label: 'B.Tech Computer Science' }, { value: 'btech_it', label: 'B.Tech Information Technology' }, { value: 'btech_ece', label: 'B.Tech Electronics' }, { value: 'bca', label: 'BCA' }, { value: 'mca', label: 'MCA' }]} required />
                <Select label="Semester" placeholder="Select semester" options={[1, 2, 3, 4, 5, 6, 7, 8].map(s => ({ value: String(s), label: `Semester ${s}` }))} required />
              </>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              {step > 1 && <Button type="button" variant="secondary" className="flex-1" onClick={() => setStep(step - 1)}>Back</Button>}
              <Button type="submit" variant="primary" className="flex-1" loading={loading}>{step < 3 ? 'Continue' : 'Create Account'}</Button>
            </div>
          </form>

          <div className="auth-footer">Already have an account? <Link to="/login">Sign in</Link></div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-promo">
          <h2>Start Your Exam Journey</h2>
          <p>Join thousands of students preparing smarter with AI-powered practice and analytics.</p>
        </div>
      </div>
    </div>
  );
}
