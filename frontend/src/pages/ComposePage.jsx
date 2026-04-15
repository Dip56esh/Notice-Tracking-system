import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';


function OrgDeptSelector({ label, orgs, onChange, allowNewOrg = true }) {
  const [mode, setMode]             = useState('existing');
  const [selectedOrgId, setOrgId]   = useState('');
  const [selectedDeptId, setDeptId] = useState('');
  const [orgName,  setOrgName]      = useState('');
  const [orgCode,  setOrgCode]      = useState('');
  const [deptName, setDeptName]     = useState('');
  const [deptCode, setDeptCode]     = useState('');

  const selectedOrg = orgs.find(o => o.id === Number(selectedOrgId));

  useEffect(() => {
    if (!allowNewOrg && mode === 'new') {
      setMode('existing');
    }
  }, [allowNewOrg, mode]);

  // Notify parent whenever selection changes
  useEffect(() => {
    if (mode === 'existing') {
      if (selectedOrgId && selectedDeptId) {
        onChange({ orgId: selectedOrgId, deptId: selectedDeptId });
      } else {
        onChange(null);
      }
    } else {
      if (orgName && orgCode && deptName && deptCode) {
        onChange({ newOrg: { name: orgName, code: orgCode.toUpperCase(), type: 'external' },
                   newDept: { name: deptName, code: deptCode.toUpperCase() } });
      } else {
        onChange(null);
      }
    }
  }, [mode, selectedOrgId, selectedDeptId, orgName, orgCode, deptName, deptCode]);

  return (
    <div className="org-selector-box">
      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 10 }}>{label}</div>

      {/* Mode toggle */}
      {allowNewOrg && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <button type="button" className={`btn btn-sm ${mode === 'existing' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMode('existing')}>
            Select existing
          </button>
          <button type="button" className={`btn btn-sm ${mode === 'new' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMode('new')}>
            + Enter new org
          </button>
        </div>
      )}

      {mode === 'existing' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group">
            <label>Organization</label>
            <select value={selectedOrgId} onChange={e => { setOrgId(e.target.value); setDeptId(''); }}>
              <option value="">— Select organization —</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name} ({o.code})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Department</label>
            <select value={selectedDeptId} onChange={e => setDeptId(e.target.value)} disabled={!selectedOrgId}>
              <option value="">— Select department —</option>
              {(selectedOrg?.departments || []).map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group">
            <label>Organization name *</label>
            <input type="text" placeholder="e.g. Ministry of Finance"
              value={orgName} onChange={e => setOrgName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Organization code *</label>
            <input type="text" placeholder="e.g. MOF" maxLength={20}
              value={orgCode} onChange={e => setOrgCode(e.target.value.toUpperCase())} />
            <span className="input-hint">Short code — used in reference numbers</span>
          </div>
          <div className="form-group">
            <label>Department name *</label>
            <input type="text" placeholder="e.g. Finance Department"
              value={deptName} onChange={e => setDeptName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Department code *</label>
            <input type="text" placeholder="e.g. FIN" maxLength={20}
              value={deptCode} onChange={e => setDeptCode(e.target.value.toUpperCase())} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Resolve or create org+dept, return { orgId, deptId } ─────────────────── */
async function resolveOrgDept(selection, orgs) {
  if (!selection) throw new Error('Please complete the organization selection.');

  if (selection.orgId && selection.deptId) {
    return { orgId: selection.orgId, deptId: selection.deptId };
  }

  const { newOrg, newDept } = selection;

  // Create org (or find existing by code if 409)
  let orgId;
  try {
    const res = await api.post('/organizations/', newOrg);
    orgId = res.data.id;
  } catch (err) {
    if (err.response?.status === 400 && err.response.data?.code) {
      // Code already taken — find it in already-loaded orgs list
      const existing = orgs.find(o => o.code === newOrg.code);
      if (existing) { orgId = existing.id; }
      else throw new Error(`Organization code "${newOrg.code}" already exists.`);
    } else throw err;
  }

  // Create department under that org
  const dRes = await api.post(`/organizations/${orgId}/departments/`, newDept);
  return { orgId, deptId: dRes.data.id };
}

/* ── ComposePage ──────────────────────────────────────────────────────────── */
export default function ComposePage() {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState([]);
  const [form, setForm] = useState({ title: '', type: 'letter', priority: 'medium', message: '' });
  const [receiverMode, setReceiverMode] = useState('internal');
  const [receiverSel, setReceiverSel] = useState(null);
  const [senderDeptId, setSenderDeptId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    api.get('/organizations/').then(r => setOrgs(r.data)).catch(console.error);
  }, []);

  const internalOrgs = orgs.filter(o => o.type === 'internal');
  const externalOrgs = orgs.filter(o => o.type !== 'internal');
  const neaOrg = internalOrgs.find(o => o.code === 'NEA');

  // Set default sender department to ADMIN if not set
  useEffect(() => {
    if (neaOrg && neaOrg.departments && neaOrg.departments.length > 0 && !senderDeptId) {
      const adminDept = neaOrg.departments.find(d => d.code === 'ADMIN');
      if (adminDept) {
        setSenderDeptId(adminDept.id);
      } else {
        setSenderDeptId(neaOrg.departments[0].id);
      }
    }
  }, [neaOrg, senderDeptId]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!receiverSel) {
      setError('Please complete the receiver organization or department selection.');
      return;
    }
    if (!senderDeptId) {
      setError('Please select the sender department.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const receiver = await resolveOrgDept(receiverSel, receiverMode === 'internal' ? internalOrgs : externalOrgs);

      await api.post('/notices/', {
        ...form,
        receiver_org: receiver.orgId,
        receiver_dept: receiver.deptId,
        sender_dept: senderDeptId,
      });

      navigate('/outbox');
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to create notice.');
    } finally {
      setLoading(false);
    }
  };

  const sCode = 'NEA';
  const selectedDept = neaOrg?.departments?.find(d => d.id === Number(senderDeptId));
  const dCode = selectedDept?.code || 'ADMIN';

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Compose Notice</div>
        <div className="page-sub">Create a new official notice, letter, or circular</div>
      </div>

      <div className="card" style={{ maxWidth: 800 }}>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-msg">{error}</div>}
          <div className="form-grid">

            {/* Title */}
            <div className="form-group form-full">
              <label>Notice title *</label>
              <input type="text" required value={form.title}
                placeholder="e.g. Budget Approval Request for Q3"
                onChange={e => set('title', e.target.value)} />
            </div>

            {/* Type + Priority */}
            <div className="form-group">
              <label>Notice type *</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="letter">Official Letter</option>
                <option value="circular">Circular</option>
                <option value="memo">Memorandum</option>
              </select>
            </div>
            <div className="form-group">
              <label>Priority *</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="form-group form-full">
              <label>Sender Department *</label>
              <select value={senderDeptId} onChange={e => setSenderDeptId(parseInt(e.target.value))} required>
                <option value="">— Select NEA department —</option>
                {neaOrg?.departments?.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <button type="button" className={`btn btn-sm ${receiverMode === 'internal' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => { setReceiverMode('internal'); setReceiverSel(null); }}>
                Send to NEA department
              </button>
              <button type="button" className={`btn btn-sm ${receiverMode === 'external' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => { setReceiverMode('external'); setReceiverSel(null); }}>
                Send to another organization
              </button>
            </div>

            <OrgDeptSelector
              label={receiverMode === 'internal' ? 'To (NEA Department)' : 'To (Organization / Department)'}
              orgs={receiverMode === 'internal' ? internalOrgs : externalOrgs}
              onChange={setReceiverSel}
              allowNewOrg={receiverMode === 'external'}
            />

            {/* Message */}
            <div className="form-group form-full">
              <label>Message body *</label>
              <textarea required value={form.message}
                placeholder="Write the full notice or letter content here…"
                onChange={e => set('message', e.target.value)} />
            </div>

            {/* Actions */}
            <div className="form-full form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Submitting…' : '✦ Submit Notice'}
              </button>
            </div>
          </div>
        </form>

        <div className="divider" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--faint)' }}>Reference generated on approval:</span>
          <span className="ref-no">{sCode}/{dCode}/{new Date().getFullYear()}/———</span>
        </div>
      </div>
    </div>
  );
}
