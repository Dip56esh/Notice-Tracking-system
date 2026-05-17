import { useState, useEffect } from 'react';
import api from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.jsx';

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users,    setUsers]    = useState([]);
  const [depts,    setDepts]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ name: '', email: '', password: '', role: 'manager', dept: '' });
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const hasAdmin = users.some(u => u.role === 'admin');

  const load = async () => {
    setLoading(true);
    try {
      const [uRes, dRes] = await Promise.all([
        api.get('/auth/users/'),
        api.get('/organizations/departments/'),
      ]);
      setUsers(uRes.data);
      setDepts(dRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const createUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form };
      if (!payload.dept) delete payload.dept;
      await api.post('/auth/register/', payload);
      setForm({ name: '', email: '', password: '', role: hasAdmin ? 'manager' : 'admin', dept: '' });
      setShowForm(false);
      load();
    } catch (err) {
      const data = err.response?.data;
      setError(data?.email?.[0] || data?.detail || data?.error || 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  };

  const updateRole = async (userId, role) => {
    try {
      await api.patch(`/auth/users/${userId}/role/`, { role });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update role.');
    }
  };

  const initials = (name) =>
    name ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?';

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <div className="page-title">Users</div>
          <div className="page-sub">Manage system users and role assignments</div>
        </div>
        {me?.role === 'admin' && (
          <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
            {showForm ? 'Cancel' : '+ New user'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ maxWidth: 640, marginBottom: 20 }}>
          <div className="card-title">Create user</div>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={createUser}>
            <div className="form-grid">
              <div className="form-group">
                <label>Full name *</label>
                <input type="text" required value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" required value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input type="password" required minLength={6} value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  {!hasAdmin && <option value="admin">Admin</option>}
                  <option value="manager">Manager</option>
                </select>
              </div>
              <div className="form-group">
                <label>Department</label>
                <select value={form.dept} onChange={e => setForm(f => ({ ...f, dept: e.target.value }))}>
                  <option value="">— None —</option>
                  {depts.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                </select>
              </div>
              <div className="form-full form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating…' : 'Create user'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {loading ? <div className="loading">Loading…</div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Organization</th>
                  <th>Department</th>
                  <th>Role</th>
                  {/* {me?.role === 'admin' && <th>Actions</th>} */}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="avatar">{initials(u.name)}</div>
                        <span style={{ fontWeight: 500 }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 11.5, color: 'var(--muted)' }}>{u.email}</td>
                    <td>
                      {u.org_code
                        ? <span className="ref-no">{u.org_code}</span>
                        : <span style={{ color: 'var(--faint)' }}>—</span>}
                    </td>
                    <td style={{ fontSize: 11.5 }}>{u.dept_code || '—'}</td>
                    <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                    {/* {me?.role === 'admin' && (
                      <td>
                        {u.id !== me.id && (
                          <select
                            value={u.role}
                            style={{ fontFamily: 'var(--font)', fontSize: 11, padding: '3px 6px', borderRadius: 5, border: '0.5px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer' }}
                            onChange={e => updateRole(u.id, e.target.value)}
                          >
                            <option value="manager">manager</option>
                          </select>
                        )}
                      </td>
                    )} */}
                  </tr>
                ))}
                {!users.length && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--faint)', padding: 32 }}>No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
