'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthUser {
  userId: string;
  name: string;
  role: string;
}

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: '📊', roles: ['reconciler', 'supervisor', 'admin'] },
  { label: 'Report', path: '/report', icon: '📋', roles: ['reconciler', 'supervisor', 'admin'] },
  { label: 'Clearance', path: '/clearance', icon: '✅', roles: ['reconciler', 'admin'] },
  { label: 'History', path: '/history', icon: '🕐', roles: ['reconciler', 'supervisor', 'admin'] },
  { label: 'Admin', path: '/admin/users', icon: '⚙️', roles: ['admin'] },
];

export default function WebLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!storedToken || !storedUser) {
      router.replace('/login');
      return;
    }
    try {
      const parsed = JSON.parse(storedUser) as AuthUser;
      const webRoles = ['reconciler', 'supervisor', 'admin'];
      if (!webRoles.includes(parsed.role)) {
        // Factory staff → redirect to mobile home
        router.replace('/home');
        return;
      }
      setUser(parsed);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.replace('/login');
      return;
    }
    setChecking(false);
  }, [router]);

  if (checking || !user) return null;

  const visibleNav = NAV_ITEMS.filter((n) => n.roles.includes(user.role));

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.replace('/login');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8f8f6', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Sidebar */}
      <aside style={{
        width: '220px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', backgroundColor: '#111827', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: '700' }}>EV</span>
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: '700', color: '#111827', margin: 0 }}>EV Recon</p>
              <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>Reconciliation</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {visibleNav.map((item) => {
            const active = pathname === item.path || pathname.startsWith(item.path + '/');
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  marginBottom: '2px',
                  backgroundColor: active ? '#f3f4f6' : 'transparent',
                  color: active ? '#111827' : '#6b7280',
                  fontSize: '14px',
                  fontWeight: active ? '600' : '400',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: '0 0 2px' }}>{user.name}</p>
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 10px', textTransform: 'capitalize' }}>{user.role}</p>
          <button
            onClick={logout}
            style={{
              width: '100%',
              padding: '7px',
              backgroundColor: '#f3f4f6',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#6b7280',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ marginLeft: '220px', flex: 1, minHeight: '100vh', padding: '32px 32px 32px', backgroundColor: '#f8f8f6' }}>
        {children}
      </main>
    </div>
  );
}
