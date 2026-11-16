'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext } from 'react';
import { api, useData } from '@/lib/client';

const UserContext = createContext(null);
export const useUser = () => useContext(UserContext);

const NAV = [
  { href: '/dashboard', label: 'Dashboard', roles: ['student', 'instructor', 'admin'] },
  { href: '/courses', label: 'Courses', roles: ['student', 'instructor', 'admin'] },
  { href: '/assignments', label: 'Assignments', roles: ['student', 'instructor', 'admin'] },
  { href: '/sessions', label: 'Study Sessions', roles: ['student'] },
  { href: '/tasks', label: 'Task Planner', roles: ['student'] },
  { href: '/notes', label: 'Notes (MongoDB)', roles: ['student', 'instructor', 'admin'], group: 'NoSQL' },
  { href: '/queries', label: 'Query Lab (SQL)', roles: ['student', 'instructor', 'admin'], group: 'Database' },
  { href: '/admin', label: 'Admin Console', roles: ['admin'] },
];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const me = useData('/api/auth/me');
  const user = me.data?.user;

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (!user) return <div className="empty" style={{ paddingTop: 80 }}>{me.error || 'Loading StudySync...'}</div>;

  let lastGroup = '';
  return (
    <UserContext.Provider value={user}>
      <div className="shell">
        <aside className="sidebar">
          <div className="brand"><span className="brand-mark">S</span>StudySync</div>
          <nav className="nav">
            {NAV.filter((n) => n.roles.includes(user.role)).map((n) => {
              const label = n.group && n.group !== lastGroup ? n.group : '';
              if (n.group) lastGroup = n.group;
              return (
                <span key={n.href} style={{ display: 'contents' }}>
                  {label ? <div className="nav-label">{label}</div> : null}
                  <Link href={n.href} className={pathname.startsWith(n.href) ? 'active' : ''}>{n.label}</Link>
                </span>
              );
            })}
          </nav>
          <div className="side-foot">
            <div className="who">{user.name}</div>
            <div>{user.email}</div>
            <div className="dbrole">App role: {user.role} &middot; MySQL user: ss_{user.role}</div>
            <button onClick={logout} style={{ width: '100%' }}>Sign out</button>
          </div>
        </aside>
        <main className="main">{children}</main>
      </div>
    </UserContext.Provider>
  );
}
