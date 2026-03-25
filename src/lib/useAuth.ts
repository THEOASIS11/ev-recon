'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface AuthUser {
  userId: string;
  name: string;
  role: string;
}

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!storedToken || !storedUser) {
      router.replace('/login');
      return;
    }

    try {
      const parsed = JSON.parse(storedUser) as AuthUser;
      setToken(storedToken);
      setUser(parsed);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.replace('/login');
      return;
    }

    setReady(true);
  }, [router]);

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.replace('/login');
  }

  return { user, token, logout, ready };
}
