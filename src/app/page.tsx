import { redirect } from 'next/navigation';

// Root always redirects to /login.
// After login, the login page routes based on role.
export default function Home() {
  redirect('/login');
}
