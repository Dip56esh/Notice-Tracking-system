import { useState, useEffect } from 'react';
import api from '../utils/api.js';

function OrgCard({ org, onDeptAdded }) {
  const [showForm, setShowForm] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const addDept = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post(`/organizations/${org.id}/departments/`, { name: deptName, code: deptCode });
      setDeptName('');
      setDeptCode('');
      setShowForm(false);
      onDeptAdded();
    } catch (err) {
      setError(err.response?.data?.code?.[0] || err.response?.data?.detail || 'Failed to add department.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 8, flexShrink: 0,
          background: 'var(--accent-bg)', color: 'var(--accent-text)',
          fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {org.code}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{org.name}</div>
          <div style={{ fontSize: 10.5, color: 'var(--faint)', marginTop: 2 }}>{org.type}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
        {(org.departments || []).map(d => (
          <span key={d.id} className="tag">{d.name} ({d.code})</span>
        ))}
        {!org.departments?.length && (
          <span style={{ fontSize: 11, color: 'var(--faint)' }}>No departments yet</span>
        )}
      </div>

      {showForm ? (
        <form onSubmit={addDept} style={{ borderTop: '0.5px solid var(--border)', paddingTop: 12 }}>
          {error && <div className="error-msg" style={{ marginBottom: 8 }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 8, marginBottom: 8 }}>
            <input type="text" placeholder="Department name" value={deptName} required
              onChange={e => setDeptName(e.target.value)} />
            <input type="text" placeholder="Code (FIN)" maxLength={20} value={deptCode} required
              onChange={e => setDeptCode(e.target.value.toUpperCase())} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? 'Adding…' : 'Add department'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(true)}>+ Add department</button>
      )}
    </div>
  );
}

export default function OrganizationsPage() {
  const [orgs,     setOrgs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ name: '', code: '', type: 'external' });
  const [error,    setError]    = useState('');
  const [saving,   setSaving]   = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await api.get('/organizations/'); setOrgs(r.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const createOrg = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/organizations/', { ...form, code: form.code.toUpperCase() });
      setForm({ name: '', code: '', type: 'external' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.code?.[0] || err.response?.data?.detail || 'Failed to create organization.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <div className="page-title">Organizations</div>
          <div className="page-sub">Manage organizations and their departments</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Cancel' : '+ New organization'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ maxWidth: 560, marginBottom: 20 }}>
          <div className="card-title">Create organization</div>
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={createOrg}>
            <div className="form-grid">
              <div className="form-group form-full">
                <label>Organization name *</label>
                <input type="text" required placeholder="e.g. Ministry of Finance"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Organization code *</label>
                <input type="text" required placeholder="e.g. MOF" maxLength={20}
                  value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
                <span className="input-hint">Used in reference numbers (ORG/DEPT/YEAR/SEQ)</span>
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="internal">Internal</option>
                  <option value="external">External</option>
                </select>
              </div>
              <div className="form-full form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating…' : 'Create organization'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {orgs.map(org => <OrgCard key={org.id} org={org} onDeptAdded={load} />)}
          {!orgs.length && <div className="empty-state">No organizations yet. Create one to get started.</div>}
        </div>
      )}
    </div>
  );
}
