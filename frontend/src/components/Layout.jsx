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
      <aside className="sidebar" style={{
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        boxShadow: '1px 0 8px rgba(0,0,0,0.05)'
      }}>
        <div className="logo" style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '20px 16px'
        }}>
          <div className="logo-mark" style={{
            background: 'var(--accent-bg)',
            color: 'var(--accent-text)',
            border: '1px solid var(--accent)',
            marginBottom: '6px'
          }}>
            NEA Administration
          </div>
          <div className="logo-title" style={{
            color: 'var(--text)',
            fontSize: '13px',
            fontWeight: '600'
          }}>
            Notice & Letter<br />Tracking System
          </div>
        </div>

        <nav className="nav" style={{ padding: '12px 8px' }}>
          <div className="nav-section" style={{ marginBottom: '16px' }}>
            <span className="nav-label" style={{
              color: 'var(--accent-text)',
              background: 'var(--accent-bg)',
              padding: '3px 6px',
              borderRadius: '6px',
              fontSize: '9px',
              fontWeight: '600',
              marginBottom: '6px'
            }}>
              Overview
            </span>
            <NavLink to="/" end className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} style={{
              borderRadius: '8px',
              padding: '10px 12px',
              marginBottom: '2px',
              transition: 'all 0.2s ease'
            }}>
              <span className="nav-icon" style={{ fontSize: '14px' }}>◉</span> Dashboard
            </NavLink>
          </div>
          <div className="nav-section" style={{ marginBottom: '16px' }}>
            <span className="nav-label" style={{
              color: 'var(--purple)',
              background: 'var(--purple-bg)',
              padding: '3px 6px',
              borderRadius: '6px',
              fontSize: '9px',
              fontWeight: '600',
              marginBottom: '6px'
            }}>
              Correspondence
            </span>
            <NavLink to="/compose" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} style={{
              borderRadius: '8px',
              padding: '10px 12px',
              marginBottom: '2px',
              transition: 'all 0.2s ease'
            }}>
              <span className="nav-icon" style={{ fontSize: '14px' }}>✦</span> Compose Notice
            </NavLink>
            <NavLink to="/outbox" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} style={{
              borderRadius: '8px',
              padding: '10px 12px',
              marginBottom: '2px',
              transition: 'all 0.2s ease'
            }}>
              <span className="nav-icon" style={{ fontSize: '14px' }}>↗</span> Dispatch
            </NavLink>
            <NavLink to="/inbox" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} style={{
              borderRadius: '8px',
              padding: '10px 12px',
              marginBottom: '2px',
              transition: 'all 0.2s ease'
            }}>
              <span className="nav-icon" style={{ fontSize: '14px' }}>↙</span> Inbox
            </NavLink>
          </div>
          {['admin', 'manager'].includes(user?.role) && (
            <div className="nav-section" style={{ marginBottom: '16px' }}>
              <span className="nav-label" style={{
                color: 'var(--teal)',
                background: 'var(--teal-bg)',
                padding: '3px 6px',
                borderRadius: '6px',
                fontSize: '9px',
                fontWeight: '600',
                marginBottom: '6px'
              }}>
                Admin
              </span>
              <NavLink to="/organizations" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} style={{
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '2px',
                transition: 'all 0.2s ease'
              }}>
                <span className="nav-icon" style={{ fontSize: '14px' }}>⊞</span> Organizations
              </NavLink>
              <NavLink to="/users" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} style={{
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '2px',
                transition: 'all 0.2s ease'
              }}>
                <span className="nav-icon" style={{ fontSize: '14px' }}>◎</span> Users
              </NavLink>
            </div>
          )}
        </nav>

        <div className="user-area" style={{
          background: 'var(--surface2)',
          borderTop: '1px solid var(--border)',
          padding: '16px'
        }}>
          <div className="user-chip" style={{
            background: 'var(--surface)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
          }}>
            <div className="avatar" style={{
              width: '32px',
              height: '32px',
              background: 'var(--accent-bg)',
              color: 'var(--accent-text)',
              fontSize: '11px',
              fontWeight: '600',
              boxShadow: '0 1px 4px rgba(26, 79, 196, 0.2)'
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name" style={{
                fontSize: '13px',
                fontWeight: '500',
                color: 'var(--text)',
                marginBottom: '2px'
              }}>
                {user?.name}
              </div>
              <div className="user-dept" style={{
                fontSize: '10px',
                color: 'var(--muted)',
                background: 'var(--surface2)',
                padding: '2px 6px',
                borderRadius: '6px',
                display: 'inline-block'
              }}>
                {user?.org_code ?? '—'} · {user?.dept_code ?? '—'}
              </div>
            </div>
            <span className={`badge badge-${user?.role}`} style={{
              fontSize: '9px',
              padding: '3px 6px',
              fontWeight: '500'
            }}>
              {user?.role}
            </span>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{
              width: '100%',
              marginTop: '10px',
              padding: '10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '500',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              transition: 'all 0.2s ease'
            }}
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
