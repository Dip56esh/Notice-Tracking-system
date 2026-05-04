import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import { useAuth } from '../hooks/useAuth.jsx';
import NoticeTable from '../components/NoticeTable.jsx';
import NoticeDetail from '../components/NoticeDetail.jsx';

function NoticePage({ direction, title, subtitle }) {
  const navigate  = useNavigate();
  const { user }   = useAuth();
  const [notices,  setNotices]  = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [orgs,     setOrgs]     = useState([]);
  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('');
  const [type,     setType]     = useState('');
  const [priority, setPriority] = useState('');
  const [dept,     setDept]     = useState('');
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);
  const [pages,    setPages]    = useState(1);
  const [neaDepts, setNeaDepts] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ direction, page, limit: 15 });
      if (search)   params.set('search',   search);
      if (status)   params.set('status',   status);
      if (type)     params.set('type',     type);
      if (priority) params.set('priority', priority);
      if (dept)     params.set('receiver_dept', dept);
      if (direction === 'inbox') params.set('only_received', 'true');
      const res = await api.get(`/notices/?${params}`);
      setNotices(res.data.notices || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [direction, search, status, type, priority, dept, page]);

  useEffect(() => {
    api.get('/organizations/')
      .then(res => setOrgs(res.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const nea = orgs.find(o => o.code === 'NEA' || o.type === 'internal');
    setNeaDepts(nea?.departments || []);
  }, [orgs]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdated = (updated) => {
    setSelected(updated);
    setNotices(prev => prev.map(n => n.id === updated.id ? updated : n));
    load();
  };

  const handleRowClick = async (notice) => {
    try {
      // Fetch full notice details including message
      const res = await api.get(`/notices/${notice.id}/`);
      setSelected(res.data);
    } catch (e) {
      console.error('Failed to load notice details:', e);
    }
  };

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <div className="page-title">{title}</div>
          <div className="page-sub">{subtitle} · {total} total</div>
          {direction === 'inbox' && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
              {/* Use this page to confirm whether the NEA department has received each delivered notice. */}
            </div>
          )}
        </div>
        {direction === 'outbox' && (
          <button className="btn btn-primary" onClick={() => navigate('/compose')}>
             Compose notice
          </button>
        )}
      </div>

      <div className="card">
        {/* Filters */}
        <div className="search-row">
          <div className="search-wrap">
            <span className="search-icon">⌕</span>
            <input className="search-input" type="text"
              placeholder="Search reference, title…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          {direction === 'inbox' && (
            <select style={{ width: 170 }} value={dept} onChange={e => { setDept(e.target.value); setPage(1); }}>
              <option value="">All NEA departments</option>
              {neaDepts.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
            </select>
          )}
          <select style={{ width: 160 }} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            {['DRAFT','APPROVED','SENT','DELIVERED','RECEIVED','ACKNOWLEDGED','IN_REVIEW','ACTION_TAKEN','CLOSED','REJECTED']
              .map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select style={{ width: 120 }} value={type} onChange={e => { setType(e.target.value); setPage(1); }}>
            <option value="">All types</option>
            <option value="letter">Letter</option>
            <option value="circular">Circular</option>
            <option value="memo">Memo</option>
          </select>
          <select style={{ width: 120 }} value={priority} onChange={e => { setPriority(e.target.value); setPage(1); }}>
            <option value="">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {loading
          ? <div className="loading">Loading…</div>
          : <NoticeTable notices={notices} onRowClick={handleRowClick} direction={direction} />
        }

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'center' }}>Page {page} of {pages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>

      {selected && (
        <NoticeDetail
          notice={selected}
          direction={direction}
          user={user}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}

export function OutboxPage() {
  return <NoticePage direction="outbox" title="Outbox" subtitle="Notices sent by NEA admin to departments and organizations" />;
}

export function InboxPage() {
  return <NoticePage direction="inbox" title="Inbox" subtitle="Notices received by your NEA department" />;
}

export default OutboxPage;
