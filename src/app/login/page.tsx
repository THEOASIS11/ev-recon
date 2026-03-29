'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Kuch gadbad ho gayi. Dobara try karo.');
        setLoading(false);
        return;
      }

      localStorage.setItem('token', json.token);
      localStorage.setItem('user', JSON.stringify(json.user));

      const role: string = json.user.role;
      if (role === 'factory_staff') {
        router.push('/home');
      } else if (role === 'supervisor') {
        const isMobile = window.innerWidth < 768;
        router.push(isMobile ? '/home' : '/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Internet nahi hai. Thodi der baad try karo.');
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #09090b; }
        .login-input {
          width: 100%;
          background: #111113;
          border: 1px solid #27272a;
          border-radius: 12px;
          padding: 14px 16px;
          font-size: 16px;
          color: #fafafa;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          font-family: inherit;
        }
        .login-input::placeholder { color: #71717a; }
        .login-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
        }
        .login-btn {
          width: 100%;
          padding: 16px;
          border-radius: 12px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          font-weight: 600;
          font-size: 16px;
          letter-spacing: 0.5px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .login-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #60a5fa, #3b82f6);
          transform: scale(0.99);
        }
        .login-btn:active:not(:disabled) { transform: scale(0.97); }
        .login-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .label-text {
          display: block;
          font-size: 12px;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
          font-weight: 500;
        }
      `}</style>

      <main style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #09090b 0%, #0c1222 60%, #09090b 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

          {/* Branding */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
              <h1 style={{
                fontSize: '28px',
                fontWeight: 800,
                color: '#fafafa',
                letterSpacing: '4px',
                textTransform: 'uppercase',
                margin: 0,
              }}>
                HUMARA UBOARD
              </h1>
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#3b82f6',
                border: '1px solid rgba(59,130,246,0.25)',
                borderRadius: '20px',
                padding: '2px 10px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                flexShrink: 0,
              }}>
                V1
              </span>
            </div>
            <p style={{
              fontSize: '14px',
              color: '#71717a',
              fontWeight: 300,
              letterSpacing: '1px',
              marginBottom: '24px',
            }}>
              Together we run further
            </p>
            {/* Divider */}
            <div style={{ width: '40px', height: '1px', backgroundColor: '#27272a', margin: '0 auto' }} />
          </div>

          {/* Error banner */}
          {error && (
            <div style={{
              background: '#1c1917',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                flexShrink: 0,
              }} />
              <p style={{ color: '#fca5a5', fontSize: '13px', lineHeight: 1.5 }}>{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <p style={{ fontSize: '16px', color: '#a1a1aa', marginBottom: '20px', textAlign: 'center' }}>
              Login karo
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="username" className="label-text">Username</label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="humarauboard..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="login-input"
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="password" className="label-text">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="login-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !phone || !password}
              className="login-btn"
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <svg style={{ animation: 'spin 1s linear infinite' }} width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Connecting...
                </span>
              ) : (
                'Login Karo →'
              )}
            </button>
          </form>

          <p style={{
            textAlign: 'center',
            fontSize: '12px',
            color: '#71717a',
            marginTop: '20px',
          }}>
            Password bhool gaye? Admin se poocho.
          </p>
        </div>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </main>
    </>
  );
}
