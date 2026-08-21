import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register as authRegister } from '../services/auth';

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await authRegister({ name: form.name, email: form.email, password: form.password });
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'var(--bg-main)',
      padding: '24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        padding: '40px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'var(--primary)', color: 'white',
            fontSize: '24px', fontWeight: '800', marginBottom: '16px',
          }}>A</div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px' }}>
            Create Account
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Join AgentExam to begin your preparation
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)',
            padding: '12px 16px', marginBottom: '20px', color: '#991b1b', fontSize: '14px',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {[
            { label: 'Full Name', name: 'name', type: 'text', placeholder: 'Shubham Raj', id: 'reg-name' },
            { label: 'Email Address', name: 'email', type: 'email', placeholder: 'student@example.com', id: 'reg-email' },
            { label: 'Password', name: 'password', type: 'password', placeholder: 'Minimum 8 characters', id: 'reg-password' },
            { label: 'Confirm Password', name: 'confirmPassword', type: 'password', placeholder: 'Repeat your password', id: 'reg-confirm' },
          ].map((field) => (
            <div key={field.name} style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px', color: 'var(--text-main)' }}>
                {field.label}
              </label>
              <input
                id={field.id}
                type={field.type}
                name={field.name}
                value={form[field.name]}
                onChange={handleChange}
                placeholder={field.placeholder}
                required
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', background: 'var(--bg-input)',
                  color: 'var(--text-main)', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          ))}

          <button
            id="register-submit"
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px', borderRadius: 'var(--radius-md)',
              background: loading ? 'var(--border)' : 'var(--primary)', color: 'white',
              border: 'none', fontWeight: '600', fontSize: '15px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              marginTop: '8px',
            }}
          >
            {loading
              ? <><i className="fas fa-spinner fa-spin"></i> Creating account...</>
              : <><i className="fas fa-user-plus"></i> Create Account</>}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
