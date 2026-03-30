'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      localStorage.setItem('user', JSON.stringify(json.user));

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
      display: 'flex',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      backgroundColor: '#000000',
    }}>

      {/* ── LEFT PANEL — Brand / Logo ── */}
      <div style={{
        flex: '1 1 55%',
        backgroundColor: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Subtle radial glow behind logo */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '400px',
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* UBOARD Logo */}
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: '520px',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}>
          <Image
            src="/uboard-logo.png"
            alt="UBOARD®"
            width={520}
            height={156}
            style={{ width: '100%', height: 'auto', display: 'block' }}
            priority
          />
        </div>

        {/* Divider line */}
        <div style={{
          width: '100%',
          maxWidth: '520px',
          height: '1px',
          backgroundColor: 'rgba(255,255,255,0.12)',
          margin: '32px 0',
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.8s ease 0.2s',
        }} />

        {/* Tagline */}
        <div style={{
          width: '100%',
          maxWidth: '520px',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.6s ease 0.3s, transform 0.6s ease 0.3s',
        }}>
          <p style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            margin: '0 0 8px',
            fontWeight: 500,
          }}>
            Humara UBoard
          </p>
          <p style={{
            fontSize: '18px',
            color: 'rgba(255,255,255,0.75)',
            fontWeight: 300,
            margin: '0 0 6px',
            lineHeight: 1.4,
          }}>
            EV Inventory Reconciliation
          </p>
          <p style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.28)',
            margin: 0,
            fontStyle: 'italic',
          }}>
            Together we run further.
          </p>
        </div>

        {/* Version badge bottom-left */}
        <div style={{
          position: 'absolute',
          bottom: '28px',
          left: '48px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#22c55e',
            boxShadow: '0 0 6px #22c55e',
          }} />
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px' }}>
            SYSTEM ONLINE · V1
          </span>
        </div>
      </div>

      {/* ── RIGHT PANEL — Login Form ── */}
      <div style={{
        flex: '0 0 400px',
        backgroundColor: '#0a0a0c',
        borderLeft: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 40px',
      }}>

        <div style={{
          width: '100%',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s',
        }}>

          {/* Form header */}
          <div style={{ marginBottom: '36px' }}>
            <h2 style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#ffffff',
              margin: '0 0 6px',
            }}>
              Welcome back
            </h2>
            <p style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.4)',
              margin: 0,
            }}>
              Apna account access karo
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#fca5a5',
              borderRadius: '10px',
              padding: '11px 14px',
              marginBottom: '20px',
              fontSize: '13px',
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-start',
            }}>
              <span style={{ flexShrink: 0 }}>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.4)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '8px',
                display: 'block',
                fontWeight: 600,
              }}>
                Username
              </label>
              <input
                type="text"
                placeholder="humarauboard..."
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  fontSize: '15px',
                  color: '#ffffff',
                  width: '100%',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.05)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }}
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.4)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '8px',
                display: 'block',
                fontWeight: 600,
              }}>
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  fontSize: '15px',
                  color: '#ffffff',
                  width: '100%',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.05)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: '10px',
                background: loading ? 'rgba(255,255,255,0.08)' : '#ffffff',
                color: loading ? 'rgba(255,255,255,0.4)' : '#000000',
                fontWeight: 700,
                fontSize: '15px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s, transform 0.1s, opacity 0.2s',
                letterSpacing: '0.3px',
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = '#e5e5e5';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.background = '#ffffff';
              }}
              onMouseDown={(e) => {
                if (!loading) e.currentTarget.style.transform = 'scale(0.985)';
              }}
              onMouseUp={(e) => {
                if (!loading) e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{
                    width: '14px', height: '14px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                  Connecting...
                </span>
              ) : (
                'Login Karo →'
              )}
            </button>
          </form>

          <p style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.2)',
            textAlign: 'center',
            marginTop: '20px',
          }}>
            Password bhool gaye? Admin se poocho.
          </p>
        </div>

        {/* Bottom brand mark */}
        <div style={{
          position: 'absolute',
          bottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.5px' }}>
            UBOARD® Internal Platform
          </span>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          main > div:first-child {
            display: none !important;
          }
          main > div:last-child {
            flex: 1 1 100% !important;
            border-left: none !important;
          }
        }
        input::placeholder {
          color: rgba(255,255,255,0.2);
        }
      `}</style>
    </main>
  );
}
