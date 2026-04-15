import { useState, useEffect } from 'react';
import api from '../utils/api.js';
import NoticeTable from '../components/NoticeTable.jsx';
import NoticeDetail from '../components/NoticeDetail.jsx';
import { useAuth } from '../hooks/useAuth.jsx';

const ALL_STATUSES = [
  'DRAFT','APPROVED','SENT','DELIVERED','RECEIVED',
  'ACKNOWLEDGED','IN_REVIEW','ACTION_TAKEN','CLOSED','REJECTED',
];

export default function Dashboard() {
  const { user }  = useAuth();
  const [stats,   setStats]   = useState({});
  const [notices, setNotices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading]   = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [sRes, nRes] = await Promise.all([
        api.get('/notices/stats/'),
        api.get('/notices/?limit=8'),
      ]);
      setStats(sRes.data);
      setNotices(nRes.data.notices || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleUpdated = (updated) => {
    setSelected(updated);
    setNotices(prev => prev.map(n => n.id === updated.id ? updated : n));
    load();
  };

  const pending  = (stats.DRAFT || 0) + (stats.IN_REVIEW || 0) + (stats.ACKNOWLEDGED || 0);
  const maxCount = Math.max(...ALL_STATUSES.map(s => stats[s] || 0), 1);

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-sub">
          Welcome back, {user?.name?.split(' ')[0]} &nbsp;·&nbsp; {new Date().toDateString()}
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Notices</div>
          <div className="stat-val" style={{ color: 'var(--accent)' }}>{stats.total || 0}</div>
          <div className="stat-sub">All time</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Action</div>
          <div className="stat-val" style={{ color: 'var(--amber)' }}>{pending}</div>
          <div className="stat-sub">Awaiting response</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Closed</div>
          <div className="stat-val" style={{ color: 'var(--green)' }}>{stats.CLOSED || 0}</div>
          <div className="stat-sub">Fully resolved</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Rejected</div>
          <div className="stat-val" style={{ color: 'var(--red)' }}>{stats.REJECTED || 0}</div>
          <div className="stat-sub">Needs attention</div>
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">Status breakdown</div>
          {ALL_STATUSES.map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 104, fontSize: 10.5, color: 'var(--faint)', fontWeight: 500 }}>{s}</div>
              <div style={{ flex: 1, background: 'var(--surface2)', borderRadius: 3, height: 10, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.round(((stats[s] || 0) / maxCount) * 100)}%`,
                  background: 'var(--accent)', height: '100%', borderRadius: 3, transition: 'width 0.4s',
                }} />
              </div>
              <div style={{ width: 18, fontSize: 10.5, fontWeight: 600, textAlign: 'right' }}>{stats[s] || 0}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title">Quick facts</div>
          {[
            ['Total notices tracked',  stats.total        || 0],
            ['Currently in draft',     stats.DRAFT        || 0],
            ['Sent & in transit',      stats.SENT         || 0],
            ['In review',              stats.IN_REVIEW    || 0],
            ['Action taken',           stats.ACTION_TAKEN || 0],
            ['Successfully closed',    stats.CLOSED       || 0],
            ['Rejected',               stats.REJECTED     || 0],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Latest notices table */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Latest notices</div>
        </div>
        {loading
          ? <div className="loading">Loading…</div>
          : <NoticeTable notices={notices} onRowClick={setSelected} mini />
        }
      </div>

      {selected && (
        <NoticeDetail notice={selected} onClose={() => setSelected(null)} onUpdated={handleUpdated} />
      )}
    </div>
  );
}
