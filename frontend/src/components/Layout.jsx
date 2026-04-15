import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-mark">NEA Administration</div>
          <div className="logo-title">Notice & Letter<br />Tracking System</div>
          {/* <div className="logo-sub">v1.0 · Django + React</div> */}
        </div>

        <nav className="nav">
          <div className="nav-section">
            <span className="nav-label">Overview</span>
            <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-icon">◉</span> Dashboard
            </NavLink>
          </div>
          <div className="nav-section">
            <span className="nav-label">Correspondence</span>
            <NavLink to="/compose"  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-icon">✦</span> Compose Notice
            </NavLink>
            <NavLink to="/outbox"   className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-icon">↗</span> Outbox
            </NavLink>
            <NavLink to="/inbox"    className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-icon">↙</span> Inbox
            </NavLink>
          </div>
          {['admin', 'manager'].includes(user?.role) && (
            <div className="nav-section">
              <span className="nav-label">Admin</span>
              <NavLink to="/organizations" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <span className="nav-icon">⊞</span> Organizations
              </NavLink>
              <NavLink to="/users" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <span className="nav-icon">◎</span> Users
              </NavLink>
            </div>
          )}
        </nav>

        <div className="user-area">
          <div className="user-chip">
            <div className="avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </div>
              <div className="user-dept">{user?.org_code ?? '—'} · {user?.dept_code ?? '—'}</div>
            </div>
            <span className={`badge badge-${user?.role}`}>{user?.role}</span>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', marginTop: 10, justifyContent: 'center' }}
            onClick={() => { logout(); navigate('/login'); }}
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
