import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

function Login() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        if (!name) { setError('Name is required'); setLoading(false); return; }
        await register(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f6fa',
      padding: '2rem',
      fontFamily: '"Plus Jakarta Sans", sans-serif'
    }}>
      <div style={{
        display: 'flex',
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        width: '90vw',
        height: '90vh',
        maxWidth: '1400px'
      }}>
        {/* Left Side - Image Box */}
        <div style={{ flex: 1, padding: '1.25rem' }}>
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: '20px',
            overflow: 'hidden',
            backgroundImage: 'url(/busimage.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '2.5rem',
            color: '#fff'
          }}>
            {/* Dark overlay for text readability */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 60%)'
            }}></div>

            {/* Top Logo placed over image */}
            <div style={{ position: 'relative', zIndex: 1, filter: 'brightness(0) invert(1)' }}>
              <img src="/logo.png" alt="SafeTransit360 Logo" style={{ width: 72, height: 72, objectFit: 'contain' }} />
            </div>

            {/* Bottom Text placed over image */}
            <div style={{ position: 'relative', zIndex: 1, marginTop: 'auto' }}>
              <p style={{ margin: 0, fontSize: '1.125rem', fontWeight: 500, marginBottom: '0.75rem', opacity: 0.9 }}>You can easily</p>
              <h2 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 700, lineHeight: 1.2 }}>Get access your personal hub for clarity and productivity</h2>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div style={{ flex: 1, padding: '4rem 5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <img src="/logo.png" alt="SafeTransit360 Logo" style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: '1.5rem' }} />
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#111827', margin: '0 0 0.75rem 0' }}>
              {isRegister ? 'Create an account' : 'Welcome back'}
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
              Access your fleet, operations, and analytics anytime, anywhere - and keep everything flowing in one place.
            </p>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: '#fef2f2', color: '#ef4444', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {isRegister && (
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>Your name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.875rem', outline: 'none' }}
                  onFocus={(e) => e.target.style.borderColor = '#ea580c'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>Your email</label>
              <input
                type="email"
                placeholder="admin@SafeTransit360.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.875rem', outline: 'none' }}
                onFocus={(e) => e.target.style.borderColor = '#ea580c'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.75rem 1rem', paddingRight: '2.5rem', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.875rem', outline: 'none' }}
                  onFocus={(e) => e.target.style.borderColor = '#ea580c'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 0 }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: '#ea580c',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                marginTop: '0.5rem',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = '#c2410c'}
              onMouseOut={(e) => e.target.style.background = '#ea580c'}
            >
              {loading ? 'Processing...' : (isRegister ? 'Sign Up' : 'Get Started')}
            </button>

            {/* Social Divider */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}></div>
              <span style={{ padding: '0 0.75rem', color: '#9ca3af', fontSize: '0.75rem' }}>or continue with</span>
              <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}></div>
            </div>

            {/* Social Buttons row */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" style={{ flex: 1, padding: '0.5rem', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#374151', fontSize: '0.875rem' }}>Bē</button>
              <button type="button" style={{ flex: 1, padding: '0.5rem', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#374151', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#4285F4' }}>G</span>
              </button>
              <button type="button" style={{ flex: 1, padding: '0.5rem', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#374151', fontSize: '0.875rem' }}>f</button>
            </div>

            <p style={{ textAlign: 'center', margin: '1rem 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <span style={{ color: '#ea580c', fontWeight: 600, cursor: 'pointer' }} onClick={() => setIsRegister(!isRegister)}>
                {isRegister ? 'Sign in' : 'Sign up'}
              </span>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
