'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token || !user) {
      router.replace('/login');
      return;
    }
    setAuthed(true);
    requestAnimationFrame(() => setMounted(true));
  }, [router]);

  if (!authed) return null;

  const isHome = pathname === '/home';
  const isChecklist = pathname === '/checklist';

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #09090b; }
        .mobile-root {
          opacity: 0;
          transition: opacity 0.25s ease;
        }
        .mobile-root.visible {
          opacity: 1;
        }
        .nav-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 11px;
          font-family: inherit;
          transition: color 0.15s ease;
          padding: 8px 0;
        }
      `}</style>
      <div
        className={`mobile-root${mounted ? ' visible' : ''}`}
        style={{
          backgroundColor: '#09090b',
          minHeight: '100vh',
          color: '#fafafa',
          maxWidth: '480px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ flex: 1, paddingBottom: '72px' }}>
          {children}
        </div>

        {/* Bottom nav */}
        <nav style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '480px',
          backgroundColor: 'rgba(17, 17, 19, 0.92)',
          borderTop: '1px solid #27272a',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          height: '64px',
          zIndex: 100,
        }}>
          <button
            onClick={() => router.push('/home')}
            className="nav-btn"
            style={{ color: isHome ? '#3b82f6' : '#71717a', fontWeight: isHome ? '600' : '400' }}
          >
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Home
          </button>

          <button
            onClick={() => router.push('/checklist')}
            className="nav-btn"
            style={{ color: isChecklist ? '#3b82f6' : '#71717a', fontWeight: isChecklist ? '600' : '400' }}
          >
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
            </svg>
            Mera Status
          </button>
        </nav>
      </div>
    </>
  );
}
