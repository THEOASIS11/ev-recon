'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token || !user) {
      router.replace('/login');
      return;
    }
    setAuthed(true);
  }, [router]);

  if (!authed) return null;

  const isHome = pathname === '/home';
  const isChecklist = pathname === '/checklist';

  return (
    <div style={{ backgroundColor: '#0d0d0d', minHeight: '100vh', color: '#ffffff', maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
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
        backgroundColor: '#1a1a1a',
        borderTop: '1px solid #2a2a2a',
        display: 'flex',
        height: '64px',
        zIndex: 100,
      }}>
        <button
          onClick={() => router.push('/home')}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: isHome ? '#3b82f6' : '#6b7280',
            fontSize: '11px',
            fontWeight: isHome ? '600' : '400',
          }}
        >
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Home
        </button>

        <button
          onClick={() => router.push('/checklist')}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: isChecklist ? '#3b82f6' : '#6b7280',
            fontSize: '11px',
            fontWeight: isChecklist ? '600' : '400',
          }}
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
  );
}
