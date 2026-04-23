export default function NoticeTable({ notices = [], onRowClick, mini = false, direction }) {
  if (!notices.length) return <div className="empty-state">No notices found.</div>;

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Reference</th>
            <th>Title</th>
            <th>Type</th>
            <th>Priority</th>
            {!mini && <th>Sender</th>}
            {!mini && <th>Receiver</th>}
            <th>Status</th>
            {direction === 'inbox' && !mini && <th>Received</th>}
            {!mini && <th>Date</th>}
          </tr>
        </thead>
        <tbody>
          {notices.map(n => (
            <tr key={n.id} className="clickable" onClick={() => onRowClick(n)}>
              <td>
                {n.reference_no
                  ? <span className="ref-no">{n.reference_no}</span>
                  : <span className="tag">Pending ref</span>}
              </td>
              <td style={{ maxWidth: 220 }}>
                <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                  {n.title}
                </span>
              </td>
              <td><span className={`type-${n.type}`}>{n.type?.toUpperCase()}</span></td>
              <td><span className={`badge badge-${n.priority}`}>{n.priority?.toUpperCase()}</span></td>
              {!mini && <td style={{ fontSize: 11.5 }}>{n.sender_org_code}/{n.sender_dept_code}</td>}
              {!mini && <td style={{ fontSize: 11.5 }}>
                {n.receivers && n.receivers.length > 0
                  ? n.receivers.map(r => r.receiver_dept_code ? `${r.receiver_org_code}/${r.receiver_dept_code}` : r.receiver_org_code).join(', ')
                  : n.receiver_org_code ? (n.receiver_dept_code ? `${n.receiver_org_code}/${n.receiver_dept_code}` : n.receiver_org_code) : '—'}
              </td>}
              <td>
                <span className={`badge badge-${n.status}`}>{n.status}</span>
                {direction === 'inbox' && ['RECEIVED','ACKNOWLEDGED','IN_REVIEW','ACTION_TAKEN','CLOSED'].includes(n.status) && (
                  <span className="badge badge-success" style={{ marginLeft: 6 }}>Received</span>
                )}
              </td>
              {direction === 'inbox' && !mini && (
                <td style={{ fontSize: 11.5 }}>{['RECEIVED','ACKNOWLEDGED','IN_REVIEW','ACTION_TAKEN','CLOSED'].includes(n.status) ? 'Yes' : 'No'}</td>
              )}
              {!mini && <td style={{ fontSize: 11, color: 'var(--faint)', whiteSpace: 'nowrap' }}>{fmt(n.created_at)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
