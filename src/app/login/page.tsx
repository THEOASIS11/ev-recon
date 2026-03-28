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

      // Store token and user in localStorage
      localStorage.setItem('token', json.token);
      localStorage.setItem('user', JSON.stringify(json.user));

      // Route based on role
      const role: string = json.user.role;
      if (role === 'factory_staff') {
        router.push('/home');
      } else if (role === 'supervisor') {
        // Check device — if mobile go to /home, desktop go to /dashboard
        const isMobile = window.innerWidth < 768;
        router.push(isMobile ? '/home' : '/dashboard');
      } else {
        // reconciler, admin
        router.push('/dashboard');
      }
    } catch {
      setError('Internet nahi hai. Thodi der baad try karo.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white flex flex-col justify-center px-6 py-12">
      <div className="w-full max-w-sm mx-auto">

        {/* Branding */}
        <div className="mb-10 text-center">
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '8px', justifyContent: 'center' }}>
            <h1 style={{
              fontSize: '26px',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              background: 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)',
              padding: '8px 16px',
              borderRadius: '8px',
              margin: 0,
            }}>
              HUMARA UBOARD
            </h1>
            <span style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#3b82f6',
            }}>
              V1
            </span>
          </div>
          <p style={{
            fontSize: '13px',
            color: '#888',
            fontStyle: 'italic',
            marginTop: '8px',
            marginBottom: 0,
          }}>
            Together we run further
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Sub-heading above form */}
        <p style={{
          fontSize: '14px',
          color: '#888',
          textAlign: 'center',
          marginBottom: '20px',
        }}>
          Login karo apne account mein
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username field */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
              Username
            </label>
            <input
              id="phone"
              type="text"
              autoComplete="username"
              placeholder="humarauboard..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full h-14 px-4 rounded-xl border border-gray-300 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Password field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-14 px-4 rounded-xl border border-gray-300 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || !phone || !password}
            className="w-full h-14 rounded-xl bg-blue-600 text-white text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Login ho raha hai...</span>
              </>
            ) : (
              'Login Karo'
            )}
          </button>
        </form>

        {/* Forgot password note */}
        <p className="mt-6 text-center text-sm text-gray-400">
          Password bhool gaye? Admin se poocho.
        </p>
      </div>
    </main>
  );
}
