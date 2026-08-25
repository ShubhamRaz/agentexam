// ============================================
// AGENTEXAM — Forgot Password Page
// ============================================
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, GraduationCap, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button, Input } from '../../components/ui';

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setSent(true); setLoading(false); }, 1000);
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
            {!sent ? (
              <>
                <h1 className="auth-form-title">Forgot password?</h1>
                <p className="auth-form-subtitle">Enter your email and we&apos;ll send you a reset link.</p>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
                  <CheckCircle2 size={48} color="var(--color-success)" />
                </div>
                <h1 className="auth-form-title" style={{ textAlign: 'center' }}>Check your email</h1>
                <p className="auth-form-subtitle" style={{ textAlign: 'center' }}>We&apos;ve sent a password reset link to your email address.</p>
              </>
            )}
          </div>

          {!sent ? (
            <form className="auth-form" onSubmit={handleSubmit}>
              <Input label="Email" type="email" icon={Mail} placeholder="you@university.edu" required />
              <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">Send Reset Link</Button>
            </form>
          ) : (
            <Button variant="secondary" className="w-full" onClick={() => setSent(false)}>Try another email</Button>
          )}

          <div className="auth-footer">
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ArrowLeft size={14} /> Back to login
            </Link>
          </div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-promo">
          <h2>Don&apos;t worry!</h2>
          <p>We&apos;ll help you get back to preparing for your exams in no time.</p>
        </div>
      </div>
    </div>
  );
}
