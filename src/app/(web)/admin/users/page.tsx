'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  phone: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

function rolePillStyle(role: string): { bg: string; color: string } {
  const map: Record<string, { bg: string; color: string }> = {
    factory_staff: { bg: '#f3f4f6', color: '#374151' },
    supervisor: { bg: '#dcfce7', color: '#16a34a' },
    reconciler: { bg: '#dbeafe', color: '#1d4ed8' },
    admin: { bg: '#ede9fe', color: '#7c3aed' },
  };
  return map[role] || { bg: '#f3f4f6', color: '#374151' };
}

const ROLES = ['factory_staff', 'supervisor', 'reconciler', 'admin'];

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', phone: '', role: 'factory_staff', password: '' });
  const [createError, setCreateError] = useState('');
  const [resetPwd, setResetPwd] = useState<Record<string, string>>({});
  const [showResetFor, setShowResetFor] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.role !== 'admin') { router.replace('/dashboard'); return; }
        setCurrentUserId(u.userId);
      } catch { /* ignore */ }
    }
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function fetchUsers() {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/users', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }

  async function createUser() {
    if (!token) return;
    setCreateError('');
    if (!createForm.name || !createForm.phone || !createForm.password) {
      setCreateError('All fields are required.');
      return;
    }
    if (createForm.password.length < 6) {
      setCreateError('Password must be at least 6 characters.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/v1/admin/users', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error || 'Failed to create user.'); return; }
      setUsers((prev) => [...prev, data.user]);
      setShowCreate(false);
      setCreateForm({ name: '', phone: '', role: 'factory_staff', password: '' });
    } catch { setCreateError('Server error.'); } finally {
      setCreating(false);
    }
  }

  async function toggleActive(user: User) {
    if (!token) return;
    setActionError('');
    const confirmed = window.confirm(
      user.is_active
        ? `Deactivate ${user.name}? They will not be able to log in.`
        : `Reactivate ${user.name}?`
    );
    if (!confirmed) return;

    const res = await fetch(`/api/v1/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !user.is_active }),
    });
    const data = await res.json();
    if (!res.ok) { setActionError(data.error || 'Failed.'); return; }
    setUsers((prev) => prev.map((u) => (u.id === user.id ? data.user : u)));
  }

  async function resetPassword(userId: string) {
    if (!token) return;
    setActionError('');
    const pwd = resetPwd[userId] || '';
    if (pwd.length < 6) { setActionError('Password must be at least 6 characters.'); return; }
    const res = await fetch(`/api/v1/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd }),
    });
    const data = await res.json();
    if (!res.ok) { setActionError(data.error || 'Failed.'); return; }
    setShowResetFor(null);
    setResetPwd((prev) => ({ ...prev, [userId]: '' }));
    alert(`Password reset for ${data.user.name}`);
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
        <p style={{ color: '#9ca3af' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }}>User Management</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>{users.length} users</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{ padding: '8px 18px', backgroundColor: '#111827', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
        >
          {showCreate ? 'Cancel' : '+ Create User'}
        </button>
      </div>

      {/* Create user form */}
      {showCreate && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0 0 16px' }}>New User</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Name</label>
              <input type="text" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Phone</label>
              <input type="text" value={createForm.phone} onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Role</label>
              <select value={createForm.role} onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff' }}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Password</label>
              <input type="text" value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="min 6 chars"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          {createError && <p style={{ color: '#dc2626', fontSize: '13px', margin: '0 0 10px' }}>{createError}</p>}
          <button
            onClick={createUser}
            disabled={creating}
            style={{ padding: '8px 20px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
          >
            {creating ? 'Creating...' : 'Create User'}
          </button>
        </div>
      )}

      {actionError && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#dc2626' }}>
          {actionError}
        </div>
      )}

      {/* Users table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Name</th>
              <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Phone</th>
              <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Role</th>
              <th style={{ padding: '10px 20px', textAlign: 'center', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Active</th>
              <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Last Login</th>
              <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const { bg, color } = rolePillStyle(user.role);
              const isSelf = user.id === currentUserId;
              return (
                <tr key={user.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 20px', fontWeight: '600', color: '#111827' }}>
                    {user.name}
                    {isSelf && <span style={{ marginLeft: '6px', fontSize: '11px', color: '#9ca3af' }}>(you)</span>}
                  </td>
                  <td style={{ padding: '14px 20px', color: '#6b7280' }}>{user.phone}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ backgroundColor: bg, color, fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '99px' }}>
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                    <span style={{
                      backgroundColor: user.is_active ? '#dcfce7' : '#fef2f2',
                      color: user.is_active ? '#16a34a' : '#dc2626',
                      fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '99px',
                    }}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', color: '#9ca3af', fontSize: '12px' }}>
                    {user.last_login
                      ? new Date(user.last_login).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {/* Reset password */}
                      {showResetFor === user.id ? (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={resetPwd[user.id] || ''}
                            onChange={(e) => setResetPwd((prev) => ({ ...prev, [user.id]: e.target.value }))}
                            placeholder="new password"
                            style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', width: '110px', outline: 'none' }}
                          />
                          <button onClick={() => resetPassword(user.id)}
                            style={{ padding: '4px 10px', backgroundColor: '#111827', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                            Set
                          </button>
                          <button onClick={() => setShowResetFor(null)}
                            style={{ padding: '4px 8px', backgroundColor: 'transparent', color: '#9ca3af', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setShowResetFor(user.id); setActionError(''); }}
                          style={{ padding: '4px 10px', backgroundColor: 'transparent', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                          Reset pwd
                        </button>
                      )}
                      {/* Activate/Deactivate */}
                      <button
                        onClick={() => toggleActive(user)}
                        disabled={isSelf}
                        style={{
                          padding: '4px 10px',
                          backgroundColor: 'transparent',
                          color: isSelf ? '#d1d5db' : user.is_active ? '#dc2626' : '#16a34a',
                          border: `1px solid ${isSelf ? '#e5e7eb' : user.is_active ? '#fecaca' : '#bbf7d0'}`,
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: isSelf ? 'not-allowed' : 'pointer',
                        }}>
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
