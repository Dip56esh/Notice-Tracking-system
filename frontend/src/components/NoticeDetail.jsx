import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';

const VALID_TRANSITIONS = {
  DRAFT:        ['APPROVED', 'REJECTED'],
  APPROVED:     ['SENT'],
  SENT:         ['DELIVERED'],
  DELIVERED:    ['RECEIVED'],
  RECEIVED:     ['ACKNOWLEDGED'],
  ACKNOWLEDGED: ['IN_REVIEW', 'CLOSED'],
  IN_REVIEW:    ['ACTION_TAKEN', 'CLOSED'],
  ACTION_TAKEN: ['CLOSED'],
};

const fmt = (ts) => ts
  ? new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';

export default function NoticeDetail({ notice, direction, user, onClose, onUpdated }) {
  const navigate = useNavigate();
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  if (!notice) return null;

  const nextStatuses = VALID_TRANSITIONS[notice.status] || [];

  // Check if user can update status for this notice
  const canUpdateStatus = () => {
    if (user.role === 'admin') return true;
    if (!user.dept_id) return false;
    
    // Check if this notice was received by user's department
    if (notice.receivers && notice.receivers.length > 0) {
      return notice.receivers.some(receiver => receiver.receiver_dept_id === user.dept_id);
    }
    
    // Fallback for backward compatibility
    return notice.receiver_dept_id === user.dept_id;
  };

  const userCanUpdate = canUpdateStatus();
  const replyAllowed = direction === 'inbox' && userCanUpdate;

  const advance = async (newStatus) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.patch(`/notices/${notice.id}/status/`, { status: newStatus, remarks });
      setRemarks('');
      onUpdated(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="detail-overlay open"
      onClick={(e) => { if (e.target.classList.contains('detail-overlay')) onClose(); }}
    >
      <div className="detail-panel">
        {/* Header */}
        <div className="detail-header">
          <div style={{ flex: 1 }}>
            {notice.reference_no
              ? <span className="ref-no" style={{ marginBottom: 6, display: 'inline-block' }}>{notice.reference_no}</span>
              : <span className="tag" style={{ marginBottom: 6, display: 'inline-block' }}>No reference yet</span>
            }
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{notice.title}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span className={`badge badge-${notice.status}`}>{notice.status}</span>
              <span className={`badge badge-${notice.priority}`}>{notice.priority?.toUpperCase()}</span>
              <span className="badge badge-DRAFT" style={{ textTransform: 'uppercase' }}>{notice.type}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {replyAllowed && (
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/compose', { state: { replyTo: notice } })}>
                ↩ Reply
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="detail-body">
          <div className="detail-section">
            <div className="detail-section-title">Notice information</div>
            {[
              ['Sender',      `${notice.sender_org_name} (${notice.sender_org_code}) / ${notice.sender_dept_name}`],
              ['Receiver',    notice.receivers && notice.receivers.length > 0
                ? notice.receivers.map(r => `${r.receiver_org_name} (${r.receiver_org_code}) / ${r.receiver_dept_name}`).join(', ')
                : notice.receiver_org_code ? `${notice.receiver_org_name} (${notice.receiver_org_code}) / ${notice.receiver_dept_name}` : '—'],
              direction === 'inbox' && ['Dept received', ['RECEIVED','ACKNOWLEDGED','IN_REVIEW','ACTION_TAKEN','CLOSED'].includes(notice.status) ? 'Yes' : 'No'],
              ['Created by',  notice.created_by_name || '—'],
              ['Created at',  fmt(notice.created_at)],
              ['Sent at',     fmt(notice.sent_at)],
              ['Closed at',   fmt(notice.closed_at)],
            ].filter(Boolean).map(([k, v]) => (
              <div className="detail-row" key={k}>
                <span className="detail-key">{k}</span>
                <span className="detail-val">{v}</span>
              </div>
            ))}
          </div>

          {/* Message */}
          <div className="detail-section">
            <div className="detail-section-title">Message</div>
            <div style={{
              fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.7,
              background: 'var(--surface2)', padding: 12,
              borderRadius: 7, border: '0.5px solid var(--border)',
              whiteSpace: 'pre-wrap',
            }}>
              {notice.message}
            </div>
          </div>

          {/* Timeline */}
          <div className="detail-section">
            <div className="detail-section-title">Tracking timeline</div>
            <div className="timeline">
              {(notice.events || []).map((ev, i) => (
                <div className="tl-item" key={ev.id || i}>
                  <div className="tl-dot done">✓</div>
                  <div className="tl-content">
                    <div className="tl-status">{ev.status}</div>
                    <div className="tl-meta">
                      {fmt(ev.timestamp)} · {ev.action_by_name || 'System'}
                    </div>
                    {ev.remarks && <div className="tl-remark">{ev.remarks}</div>}
                  </div>
                </div>
              ))}
              {nextStatuses.length > 0 && (
                <div className="tl-item">
                  <div className="tl-dot pending">…</div>
                  <div className="tl-content">
                    <div className="tl-status" style={{ color: 'var(--amber)' }}>
                      Awaiting: {nextStatuses.join(' or ')}
                    </div>
                    <div className="tl-meta">Pending action</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status actions */}
          {nextStatuses.length > 0 && userCanUpdate && (
            <div className="detail-section">
              <div className="detail-section-title">Update status</div>
              {error && <div className="error-msg">{error}</div>}
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label>Remarks (optional)</label>
                <textarea
                  rows={2} value={remarks}
                  placeholder="Add a note for this status change…"
                  onChange={e => setRemarks(e.target.value)}
                  style={{ minHeight: 'unset' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {direction === 'inbox' && notice.status === 'DELIVERED' && (
                  <button
                    disabled={loading}
                    className="btn btn-sm btn-primary"
                    onClick={() => advance('RECEIVED')}
                  >
                    ✓ Mark as received
                  </button>
                )}
                {nextStatuses.map(s => (
                  <button
                    key={s}
                    disabled={loading}
                    className={`btn btn-sm ${s === 'REJECTED' ? 'btn-danger' : 'btn-primary'}`}
                    onClick={() => advance(s)}
                  >
                    → {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {nextStatuses.length > 0 && !userCanUpdate && (
            <div className="detail-section">
              <div className="detail-section-title">Status Update</div>
              <div style={{ 
                padding: 12, 
                background: 'var(--surface2)', 
                borderRadius: 7, 
                border: '0.5px solid var(--border)',
                fontSize: 12.5,
                color: 'var(--muted)'
              }}>
                You don't have permission to update this notice's status. Only users from the receiving department can make updates.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
