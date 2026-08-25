// ============================================
// AGENTEXAM — Login Page
// ============================================
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, GraduationCap } from 'lucide-react';
import { Button, Input } from '../../components/ui';
import { login } from '../../services/auth';

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (error) {
      alert('Login failed: ' + (error.response?.data?.detail || error.message));
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-left">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
              <div className="sidebar-logo-icon">
                <GraduationCap size={20} />
              </div>
              <span className="sidebar-logo-text">Agent<span>Exam</span></span>
            </div>
            <h1 className="auth-form-title">Welcome back</h1>
            <p className="auth-form-subtitle">Sign in to continue your exam preparation</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              icon={Mail}
              placeholder="you@university.edu"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input
                    className="form-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    style={{ paddingRight: '44px' }}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="checkbox-group">
                <input type="checkbox" className="checkbox-input" />
                <span className="checkbox-label" style={{ fontSize: 'var(--text-sm)' }}>Remember me</span>
              </label>
              <Link to="/forgot-password" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                Forgot password?
              </Link>
            </div>

            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
              Sign In
            </Button>

            <div className="auth-divider">or continue with</div>

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Button variant="secondary" className="flex-1" type="button" onClick={() => navigate('/dashboard')}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Google
              </Button>
              <Button variant="secondary" className="flex-1" type="button" onClick={() => navigate('/dashboard')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
                GitHub
              </Button>
            </div>
          </form>

          <div className="auth-footer">
            Don&apos;t have an account? <Link to="/signup">Create one</Link>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-promo">
          <h2>Ace Your Exams with AI</h2>
          <p>Smart syllabus analysis, adaptive mock tests, AI viva practice, and personalized study plans — all in one platform.</p>
          <div style={{ marginTop: 'var(--space-8)', display: 'flex', gap: 'var(--space-6)', justifyContent: 'center', fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.7)' }}>
            <div><strong style={{ fontSize: 'var(--text-2xl)', color: 'white', display: 'block' }}>10K+</strong>Students</div>
            <div><strong style={{ fontSize: 'var(--text-2xl)', color: 'white', display: 'block' }}>50K+</strong>Questions</div>
            <div><strong style={{ fontSize: 'var(--text-2xl)', color: 'white', display: 'block' }}>95%</strong>Pass Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
}
