import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login }    = useAuth();
  const navigate     = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', padding: 20,
    }}>
      <div style={{ width: 380 }}>
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div className="logo-mark" style={{ display: 'inline-block', marginBottom: 10 }}>NEA Administration</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>Sign in to your account</div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
            Digital Notice &amp; Letter Tracking System
          </div>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Email address</label>
              <input
                type="email" value={email} autoComplete="email" required
                placeholder="you@organization.gov.np"
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label>Password</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  onChange={e => setPassword(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="btn btn-ghost"
                  style={{ padding: '8px 12px', minWidth: 'auto' }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🚫' : '👁️'}
                </button>
              </div>
            </div>
            <button
              className="btn btn-primary" type="submit" disabled={loading}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {loading ? 'Logining…' : 'login →'}
            </button>
          </form>
          <div className="divider" />
          {/* <div style={{ fontSize: 11, color: 'var(--faint)', textAlign: 'center' }}>
            Default: <span style={{ fontFamily: 'var(--mono)' }}>admin@dclts.gov.np</span> / admin123
          </div> */}
        </div>
      </div>
    </div>
  );
}
