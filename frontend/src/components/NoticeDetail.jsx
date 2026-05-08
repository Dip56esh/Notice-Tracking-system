import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
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
  const [showPreview, setShowPreview] = useState(false);

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

  const getLetterHeader = () => {
    const sender = `${notice.sender_org_name || 'Sender Organization'}${notice.sender_dept_name ? `, ${notice.sender_dept_name}` : ''}`;
    const receiver = notice.receivers && notice.receivers.length > 0
      ? notice.receivers.map(r => `${r.receiver_org_name} / ${r.receiver_dept_name}`).join(', ')
      : notice.receiver_org_name
        ? `${notice.receiver_org_name} / ${notice.receiver_dept_name}`
        : 'Recipient';

    return {
      sender,
      receiver,
      date: fmt(notice.sent_at || notice.created_at),
      subject: notice.title || 'Official correspondence',
      body: notice.message || '',
      reference: notice.reference_no || '',
      closing: notice.sender_dept_name || notice.sender_org_name || 'Office',
    };
  };

  const downloadPdf = () => {
    const letter = getLetterHeader();
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 40;
    const maxWidth = 512;
    let y = 50;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);

    if (letter.reference) {
      doc.text(`Reference: ${letter.reference}`, margin, y);
      y += 18;
    }

    doc.text(`Date: ${letter.date}`, margin, y);
    y += 25;

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(letter.sender, margin, y);
    y += 20;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`To: ${letter.receiver}`, margin, y);
    y += 22;

    doc.setFont('helvetica', 'bold');
    doc.text(`Subject: ${letter.subject}`, margin, y);
    y += 24;

    doc.setFont('helvetica', 'normal');
    const greeting = ['Dear Sir or Madam,', ''];
    doc.text(greeting, margin, y);
    y += 24;

    const bodyLines = doc.splitTextToSize(letter.body, maxWidth);
    doc.text(bodyLines, margin, y);
    y += bodyLines.length * 14 + 20;

    const closing = ['Sincerely,', '', letter.closing];
    doc.text(closing, margin, y);

    const fileName = `${letter.reference || notice.title || 'letter'}`
      .replace(/[^a-zA-Z0-9-_\.]/g, '_')
      .slice(0, 120);
    doc.save(`${fileName}.pdf`);
  };

  const closePreview = () => setShowPreview(false);

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

          {/* Preview and download */}
          <div className="detail-section">
            <div className="detail-section-title">Letter preview</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setShowPreview(true)}
              >
                Preview letter
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={downloadPdf}
              >
                Download PDF
              </button>
            </div>
          </div>

          {showPreview && (
            <div className="letter-fullscreen-overlay" onClick={(e) => {
              if (e.target.classList.contains('letter-fullscreen-overlay')) closePreview();
            }}>
              <div className="letter-fullscreen-panel">
                <div className="letter-fullscreen-header">
                  <div>
                    <div className="detail-section-title" style={{ marginBottom: 4, paddingBottom: 0 }}>Letter preview</div>
                    <div className="letter-preview-summary">Preview</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={closePreview}>✕ Close preview</button>
                </div>
                <div className="letter-fullscreen-content">
                  <div className="letter-preview letter-fullscreen">
                    <div className="letter-header">
                      {notice.reference_no && <div className="letter-ref">Reference: {notice.reference_no}</div>}
                      <div className="letter-date">Date: {fmt(notice.sent_at || notice.created_at)}</div>
                      <div>
                        <div className="letter-sender">{notice.sender_org_name || 'Sender Organization'}</div>
                        {notice.sender_dept_name && <div className="letter-sender-sub">{notice.sender_dept_name}</div>}
                      </div>
                    </div>
                    <div className="letter-to">
                      <div className="letter-label">To:</div>
                      <div className="letter-recipient">
                        {notice.receivers && notice.receivers.length > 0
                          ? notice.receivers.map((receiver, index) => (
                            <div key={index}>{receiver.receiver_org_name} / {receiver.receiver_dept_name}</div>
                          ))
                          : notice.receiver_org_name
                            ? <div>{notice.receiver_org_name} / {notice.receiver_dept_name}</div>
                            : <div>Recipient department</div>
                        }
                      </div>
                    </div>
                    <div className="letter-subject">Subject: {notice.title || 'Official correspondence'}</div>
                    <div>Dear Sir/Madam,</div>
                    {/* <div className="letter-body-wrapper"> */}
                      {/* <div className="letter-body-label">Message body</div> */}
                      <div className="letter-body-text">{notice.message}</div>
                    {/* </div> */}
                    <div className="letter-closing">
                      <div>Sincerely,</div>
                      <div>{notice.sender_dept_name || notice.sender_org_name || 'Office'} department</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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
