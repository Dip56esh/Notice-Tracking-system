import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../utils/api.js';


function OrgDeptSelector({ label, orgs, value = null, onChange, allowNewOrg = true, allowMultiple = false, showDepartments = true }) {
  const [mode, setMode]             = useState('existing');
  const [selectedOrgId, setOrgId]   = useState('');
  const [selectedDeptIds, setDeptIds] = useState([]);
  const [orgName,  setOrgName]      = useState('');
  const [orgCode,  setOrgCode]      = useState('');
  const [deptName, setDeptName]     = useState('');
  const [deptCode, setDeptCode]     = useState('');

  const selectedOrg = orgs.find(o => o.id === Number(selectedOrgId));

  useEffect(() => {
    if (!value) return;

    if (Array.isArray(value)) {
      const first = value[0];
      setMode('existing');
      setOrgId(first?.orgId?.toString() || '');
      setDeptIds(value.map(v => Number(v.deptId)).filter(Boolean));
      return;
    }

    if (value.newOrg) {
      setMode('new');
      setOrgName(value.newOrg.name || '');
      setOrgCode(value.newOrg.code || '');
      setDeptName(value.newDept?.name || '');
      setDeptCode(value.newDept?.code || '');
      return;
    }

    if (value.orgId !== undefined) {
      setMode('existing');
      setOrgId(value.orgId?.toString() || '');
      setDeptIds(value.deptId ? [Number(value.deptId)] : []);
    }
  }, [value, allowMultiple]);

  useEffect(() => {
    if (!allowNewOrg && mode === 'new') {
      setMode('existing');
    }
  }, [allowNewOrg, mode]);

  // Notify parent whenever selection changes
  useEffect(() => {
    if (mode === 'existing') {
      if (selectedOrgId) {
        if (showDepartments) {
          if (selectedDeptIds.length > 0) {
            const selections = selectedDeptIds.map(deptId => ({ orgId: selectedOrgId, deptId }));
            onChange(allowMultiple ? selections : selections[0]);
          } else {
            onChange(null);
          }
        } else {
          onChange({ orgId: selectedOrgId, deptId: null });
        }
      } else {
        onChange(null);
      }
    } else {
      if (orgName && orgCode && deptName && deptCode) {
        onChange(allowMultiple ? [{ newOrg: { name: orgName, code: orgCode.toUpperCase(), type: 'external' },
                   newDept: { name: deptName, code: deptCode.toUpperCase() } }] : 
                 { newOrg: { name: orgName, code: orgCode.toUpperCase(), type: 'external' },
                   newDept: { name: deptName, code: deptCode.toUpperCase() } });
      } else {
        onChange(null);
      }
    }
  }, [mode, selectedOrgId, selectedDeptIds, orgName, orgCode, deptName, deptCode, allowMultiple, showDepartments]);

  const handleDeptToggle = (deptId) => {
    if (allowMultiple) {
      setDeptIds(prev => 
        prev.includes(deptId) 
          ? prev.filter(id => id !== deptId)
          : [...prev, deptId]
      );
    } else {
      setDeptIds([deptId]);
    }
  };

  return (
    <div className="org-selector-box">
      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 10 }}>{label}</div>

      {/* Mode toggle */}
      {allowNewOrg && !allowMultiple && (
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
        showDepartments ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label>Organization</label>
              <select value={selectedOrgId} onChange={e => { setOrgId(e.target.value); setDeptIds([]); }}>
                <option value="">— Select organization —</option>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name} ({o.code})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Department{allowMultiple ? 's' : ''}</label>
              <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '4px', padding: '8px' }}>
                {(selectedOrg?.departments || []).map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <input
                      type={allowMultiple ? "checkbox" : "radio"}
                      id={`dept-${d.id}`}
                      name="department"
                      checked={selectedDeptIds.includes(d.id)}
                      onChange={() => handleDeptToggle(d.id)}
                    />
                    <label htmlFor={`dept-${d.id}`} style={{ margin: 0, cursor: 'pointer' }}>
                      {d.name} ({d.code})
                    </label>
                  </div>
                ))}
              </div>
              {selectedDeptIds.length > 0 && allowMultiple && (
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                  {selectedDeptIds.length} department{selectedDeptIds.length > 1 ? 's' : ''} selected
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="form-group">
            <label>Organization</label>
            <select value={selectedOrgId} onChange={e => { setOrgId(e.target.value); setDeptIds([]); }}>
              <option value="">— Select organization —</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name} ({o.code})</option>)}
            </select>
          </div>
        )
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

/* ── Resolve or create org+dept, return array of { orgId, deptId } ─────────────────── */
async function resolveOrgDept(selections, orgs) {
  if (!selections) throw new Error('Please complete the organization selection.');
  
  // Handle both single selection and array of selections
  const selectionArray = Array.isArray(selections) ? selections : [selections];
  const results = [];

  for (const selection of selectionArray) {
    if (selection.orgId !== undefined) {
      results.push({ orgId: selection.orgId, deptId: selection.deptId });
    } else if (selection.newOrg) {
      const { newOrg, newDept } = selection;

      // Create org (or find existing by code if 409)
      let orgId;
      try {
        const res = await api.post('/organizations/', newOrg);
        orgId = res.data.id;
      } catch (err) {
        if (err.response?.status === 400) {
          // Assume code already taken — find it in already-loaded orgs list
          const existing = orgs.find(o => o.code === newOrg.code);
          if (existing) { orgId = existing.id; }
          else throw new Error(`Failed to create organization. The code "${newOrg.code}" may already be in use.`);
        } else throw err;
      }

      // Create department under that org
      const dRes = await api.post(`/organizations/${orgId}/departments/`, newDept);
      results.push({ orgId, deptId: dRes.data.id });
    } else {
      throw new Error('Please complete the organization selection.');
    }
  }

  return results;
}

/* ── ComposePage ──────────────────────────────────────────────────────────── */
export default function ComposePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [orgs, setOrgs] = useState([]);
  const [initialReply, setInitialReply] = useState(null);
  const [form, setForm] = useState({ title: '', type: 'letter', priority: 'medium', message: '' });
  const [receiverMode, setReceiverMode] = useState('internal');
  const [receiverSel, setReceiverSel] = useState(null);
  const [senderDeptId, setSenderDeptId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    api.get('/organizations/').then(r => setOrgs(r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (location.state?.replyTo) {
      setInitialReply(location.state.replyTo);
      setForm(f => ({
        ...f,
        title: location.state.replyTo.title?.startsWith('Re:')
          ? location.state.replyTo.title
          : `Re: ${location.state.replyTo.title}`,
      }));
    }
  }, [location.state]);

  useEffect(() => {
    if (!initialReply || !user) return;
    if (user.role === 'admin') return;

    const isReceiver = (initialReply.receivers || []).some(
      receiver => receiver.receiver_dept_id === user.dept_id
    ) || initialReply.receiver_dept_id === user.dept_id;

    if (!isReceiver) {
      setError('You are not permitted to reply to this notice because it was not received by your department.');
    }
  }, [initialReply, user]);

  useEffect(() => {
    if (!initialReply || !orgs.length) return;

    const senderOrgCode = initialReply.sender_org_code;
    const senderDeptCode = initialReply.sender_dept_code;
    const senderOrg = orgs.find(o => o.code === senderOrgCode);

    if (senderOrg) {
      if (senderOrg.type === 'internal') {
        const senderDept = senderOrg.departments?.find(d => d.code === senderDeptCode);
        if (senderDept) {
          setReceiverMode('internal');
          setReceiverSel([{ orgId: senderOrg.id, deptId: senderDept.id }]);
          return;
        }
      }
      setReceiverMode(senderOrg.type === 'internal' ? 'internal' : 'external');
      setReceiverSel({
        newOrg: {
          name: senderOrg.name,
          code: senderOrg.code,
          type: senderOrg.type === 'internal' ? 'external' : senderOrg.type || 'external',
        },
        newDept: {
          name: initialReply.sender_dept_name || senderDeptCode || 'Department',
          code: senderDeptCode || 'UNKNOWN',
        },
      });
      return;
    }

    setReceiverMode('external');
    setReceiverSel({
      newOrg: {
        name: initialReply.sender_org_name || senderOrgCode || 'Organization',
        code: senderOrgCode || 'UNKNOWN',
        type: 'external',
      },
      newDept: {
        name: initialReply.sender_dept_name || senderDeptCode || 'Department',
        code: senderDeptCode || 'UNKNOWN',
      },
    });
  }, [initialReply, orgs]);

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
    if (!receiverSel || (Array.isArray(receiverSel) && receiverSel.length === 0)) {
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
      if (initialReply && user?.role !== 'admin') {
        const isReceiver = (initialReply.receivers || []).some(
          receiver => receiver.receiver_dept_id === user.dept_id
        ) || initialReply.receiver_dept_id === user.dept_id;
        if (!isReceiver) {
          setError('You are not permitted to reply to this notice because it was not received by your department.');
          setLoading(false);
          return;
        }
      }

      const receivers = await resolveOrgDept(receiverSel, receiverMode === 'internal' ? internalOrgs : externalOrgs);

      await api.post('/notices/', {
        ...form,
        receivers: receivers.map(r => ({ org_id: r.orgId, dept_id: r.deptId })),
        sender_dept: senderDeptId,
        ...(initialReply ? { reply_to_id: initialReply.id } : {}),
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
              label={receiverMode === 'internal' ? 'To (NEA Departments)' : 'To (Organization)'}
              orgs={receiverMode === 'internal' ? internalOrgs : externalOrgs}
              value={receiverSel}
              onChange={setReceiverSel}
              allowNewOrg={receiverMode === 'external'}
              allowMultiple={receiverMode === 'internal'}
              showDepartments={receiverMode === 'internal'}
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
