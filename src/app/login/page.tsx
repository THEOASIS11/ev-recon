'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
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
        body: JSON.stringify({ phone: username.trim().toLowerCase(), password }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Kuch gadbad ho gayi. Dobara try karo.');
        setLoading(false);
        return;
      }

      localStorage.setItem('token', json.token);

      const role: string = json.user.role;
      if (role === 'factory_staff' || role === 'supervisor') {
        router.push('/home');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Internet nahi hai. Thodi der baad try karo.');
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #09090b 0%, #0c1222 60%, #09090b 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{ maxWidth: '400px', width: '100%', padding: '0 24px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 800,
              color: '#fafafa',
              letterSpacing: '4px',
              textTransform: 'uppercase',
              margin: 0,
              display: 'inline',
            }}>
              HUMARA UBOARD
            </h1>
            <span style={{
              fontSize: '11px',
              color: '#3b82f6',
              border: '1px solid rgba(59,130,246,0.25)',
              borderRadius: '20px',
              padding: '2px 10px',
              marginLeft: '10px',
              verticalAlign: 'middle',
              display: 'inline-block',
            }}>
              V1
            </span>
          </div>
          <p style={{
            fontSize: '14px',
            color: '#71717a',
            fontWeight: 300,
            letterSpacing: '1px',
            marginTop: '8px',
          }}>
            Together we run further
          </p>
          <div style={{ width: '40px', height: '1px', backgroundColor: '#27272a', margin: '24px auto 0' }} />
        </div>

        {/* Error display */}
        {error && (
          <div style={{
            background: '#1c1917',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#fca5a5',
            borderRadius: '12px',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <p style={{
            fontSize: '16px',
            color: '#a1a1aa',
            marginBottom: '20px',
            textAlign: 'center',
          }}>
            Login karo
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              fontSize: '12px',
              color: '#71717a',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '6px',
              display: 'block',
            }}>
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              placeholder="humarauboard..."
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                background: '#111113',
                border: '1px solid #27272a',
                borderRadius: '12px',
                padding: '14px 16px',
                fontSize: '16px',
                color: '#fafafa',
                width: '100%',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#27272a';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              fontSize: '12px',
              color: '#71717a',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '6px',
              display: 'block',
            }}>
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                background: '#111113',
                border: '1px solid #27272a',
                borderRadius: '12px',
                padding: '14px 16px',
                fontSize: '16px',
                color: '#fafafa',
                width: '100%',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#27272a';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: 'white',
              fontWeight: 600,
              fontSize: '16px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              transition: 'transform 0.1s ease',
              transform: loading ? 'scale(1)' : 'scale(1)',
            }}
            onMouseDown={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'scale(0.98)';
              }
            }}
            onMouseUp={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'scale(1)';
              }
            }}
          >
            {loading ? 'Connecting...' : 'Login Karo →'}
          </button>
        </form>

        <p style={{
          fontSize: '12px',
          color: '#71717a',
          textAlign: 'center',
          marginTop: '16px',
        }}>
          Password bhool gaye? Admin se poocho.
        </p>
      </div>
    </main>
  );
}
