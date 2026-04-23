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

  // Tracker state
  const [reference, setReference] = useState('');
  const [trackedNotice, setTrackedNotice] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [trackError, setTrackError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [sRes, nRes] = await Promise.all([
        api.get('/notices/stats/'),
        api.get('/notices/?limit=5'),
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

  const trackNotice = async () => {
    if (!reference.trim()) return;
    setTracking(true);
    setTrackError('');
    setTrackedNotice(null);
    try {
      const res = await api.get(`/notices/?search=${encodeURIComponent(reference.trim())}&limit=10`);
      const found = res.data.notices || [];
      if (found.length === 0) {
        setTrackError('No notice found with this reference number.');
      } else if (found.length === 1) {
        // Get full details
        const detailRes = await api.get(`/notices/${found[0].id}/`);
        setTrackedNotice(detailRes.data);
      } else {
        setTrackError('Multiple notices found. Please be more specific.');
      }
    } catch (e) {
      setTrackError('Failed to track notice. Please try again.');
      console.error(e);
    } finally {
      setTracking(false);
    }
  };

  const pending  = (stats.DRAFT || 0) + (stats.IN_REVIEW || 0) + (stats.ACKNOWLEDGED || 0);
  const maxCount = Math.max(...ALL_STATUSES.map(s => stats[s] || 0), 1);

  return (
    <div className="page">
      <div className="page-header" style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: 'var(--shadow)'
      }}>
        <div className="page-title" style={{
          fontSize: '24px',
          fontWeight: '600',
          marginBottom: '6px',
          color: 'var(--text)'
        }}>
          Dashboard
        </div>
        <div className="page-sub" style={{
          fontSize: '14px',
          color: 'var(--muted)'
        }}>
          Welcome back, {user?.name?.split(' ')[0]} &nbsp;·&nbsp; {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      {/* Minimal Statistics Cards */}
      <div className="stat-grid" style={{
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div className="stat-card" style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '20px',
          boxShadow: 'var(--shadow)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '32px',
            height: '32px',
            background: 'var(--accent-bg)',
            borderRadius: '8px',
            opacity: '0.3'
          }} />
          <div className="stat-label" style={{ color: 'var(--muted)', marginBottom: '8px' }}>Total Notices</div>
          <div className="stat-val" style={{ color: 'var(--accent)', fontSize: '28px', fontWeight: '600' }}>{stats.total || 0}</div>
          <div className="stat-sub" style={{ color: 'var(--faint)', marginTop: '4px' }}>All time</div>
        </div>
        <div className="stat-card" style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '20px',
          boxShadow: 'var(--shadow)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '32px',
            height: '32px',
            background: 'var(--amber-bg)',
            borderRadius: '8px',
            opacity: '0.3'
          }} />
          <div className="stat-label" style={{ color: 'var(--muted)', marginBottom: '8px' }}>Pending Action</div>
          <div className="stat-val" style={{ color: 'var(--amber)', fontSize: '28px', fontWeight: '600' }}>{pending}</div>
          <div className="stat-sub" style={{ color: 'var(--faint)', marginTop: '4px' }}>Awaiting response</div>
        </div>
        <div className="stat-card" style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '20px',
          boxShadow: 'var(--shadow)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '32px',
            height: '32px',
            background: 'var(--green-bg)',
            borderRadius: '8px',
            opacity: '0.3'
          }} />
          <div className="stat-label" style={{ color: 'var(--muted)', marginBottom: '8px' }}>Closed</div>
          <div className="stat-val" style={{ color: 'var(--green)', fontSize: '28px', fontWeight: '600' }}>{stats.CLOSED || 0}</div>
          <div className="stat-sub" style={{ color: 'var(--faint)', marginTop: '4px' }}>Fully resolved</div>
        </div>
        <div className="stat-card" style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '20px',
          boxShadow: 'var(--shadow)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '32px',
            height: '32px',
            background: 'var(--red-bg)',
            borderRadius: '8px',
            opacity: '0.3'
          }} />
          <div className="stat-label" style={{ color: 'var(--muted)', marginBottom: '8px' }}>Rejected</div>
          <div className="stat-val" style={{ color: 'var(--red)', fontSize: '28px', fontWeight: '600' }}>{stats.REJECTED || 0}</div>
          <div className="stat-sub" style={{ color: 'var(--faint)', marginTop: '4px' }}>Needs attention</div>
        </div>
      </div>

      {/* Minimal Notice tracker */}
      <div className="card" style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        marginBottom: '24px',
        boxShadow: 'var(--shadow)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'var(--accent)'
        }} />
        <div className="card-title" style={{
          fontSize: '14px',
          fontWeight: '600',
          color: 'var(--text)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          Track Notice
        </div>
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            background: 'var(--surface2)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid var(--border)'
          }}>
            <input
              type="text"
              placeholder="Enter reference number (e.g., NEA/ADMIN/2024/001)"
              value={reference}
              onChange={e => setReference(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'var(--surface)',
                color: 'var(--text)',
                outline: 'none'
              }}
              onKeyPress={e => e.key === 'Enter' && trackNotice()}
            />
            <button
              className="btn btn-primary"
              onClick={trackNotice}
              disabled={tracking || !reference.trim()}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: '500',
                fontSize: '14px'
              }}
            >
              {tracking ? 'Tracking...' : 'Track'}
            </button>
          </div>
          {trackError && (
            <div style={{
              color: 'var(--red)',
              fontSize: '13px',
              marginTop: '8px',
              padding: '8px 12px',
              background: 'var(--red-bg)',
              borderRadius: '6px',
              border: '1px solid rgba(181, 42, 42, 0.2)'
            }}>
              {trackError}
            </div>
          )}
        </div>
        {trackedNotice && (
          <div style={{
            border: '2px solid var(--accent)',
            borderRadius: '12px',
            padding: '20px',
            background: 'var(--surface)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            position: 'relative'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '16px'
            }}>
              <div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '6px',
                  color: 'var(--text)'
                }}>
                  {trackedNotice.title}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--muted)',
                  fontFamily: 'var(--mono)',
                  background: 'var(--accent-bg)',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  display: 'inline-block'
                }}>
                  Reference: {trackedNotice.reference_no || 'Not assigned'}
                </div>
              </div>
              <span className={`badge badge-${trackedNotice.status}`} style={{
                fontSize: '11px',
                padding: '4px 8px'
              }}>
                {trackedNotice.status}
              </span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div style={{
                background: 'var(--surface2)',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--border)'
              }}>
                <div style={{
                  fontSize: '10px',
                  color: 'var(--faint)',
                  textTransform: 'uppercase',
                  fontWeight: '600',
                  marginBottom: '3px'
                }}>
                  Sender
                </div>
                <div style={{ fontSize: '12px', fontWeight: '500' }}>
                  {trackedNotice.sender_org_name} / {trackedNotice.sender_dept_name}
                </div>
              </div>
              <div style={{
                background: 'var(--surface2)',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--border)'
              }}>
                <div style={{
                  fontSize: '10px',
                  color: 'var(--faint)',
                  textTransform: 'uppercase',
                  fontWeight: '600',
                  marginBottom: '3px'
                }}>
                  Receiver
                </div>
                <div style={{ fontSize: '12px', fontWeight: '500' }}>
                  {trackedNotice.receivers && trackedNotice.receivers.length > 0
                    ? trackedNotice.receivers.map(r => `${r.receiver_org_name} / ${r.receiver_dept_name}`).join(', ')
                    : trackedNotice.receiver_org_name ? `${trackedNotice.receiver_org_name} / ${trackedNotice.receiver_dept_name}` : '—'}
                </div>
              </div>
              <div style={{
                background: 'var(--surface2)',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--border)'
              }}>
                <div style={{
                  fontSize: '10px',
                  color: 'var(--faint)',
                  textTransform: 'uppercase',
                  fontWeight: '600',
                  marginBottom: '3px'
                }}>
                  Created
                </div>
                <div style={{ fontSize: '12px', fontWeight: '500' }}>
                  {new Date(trackedNotice.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
              </div>
              <div style={{
                background: 'var(--surface2)',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--border)'
              }}>
                <div style={{
                  fontSize: '10px',
                  color: 'var(--faint)',
                  textTransform: 'uppercase',
                  fontWeight: '600',
                  marginBottom: '3px'
                }}>
                  Last Updated
                </div>
                <div style={{ fontSize: '12px', fontWeight: '500' }}>
                  {trackedNotice.events && trackedNotice.events.length > 0
                    ? new Date(trackedNotice.events[trackedNotice.events.length - 1].timestamp).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })
                    : new Date(trackedNotice.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                </div>
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                fontSize: '11px',
                color: 'var(--faint)',
                textTransform: 'uppercase',
                fontWeight: '600',
                marginBottom: '6px'
              }}>
                Message
              </div>
              <div style={{
                fontSize: '13px',
                color: 'var(--muted)',
                lineHeight: '1.5',
                background: 'var(--surface2)',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                maxHeight: '100px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap'
              }}>
                {trackedNotice.message}
              </div>
            </div>
            <div>
              <div style={{
                fontSize: '11px',
                color: 'var(--faint)',
                textTransform: 'uppercase',
                fontWeight: '600',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  display: 'inline-block'
                }} />
                Tracking Timeline
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '180px',
                overflowY: 'auto'
              }}>
                {(trackedNotice.events || []).map((ev, i) => (
                  <div key={ev.id || i} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px',
                    background: 'var(--surface2)',
                    borderRadius: '6px',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      marginTop: '2px',
                      flexShrink: 0
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'var(--text)',
                        marginBottom: '3px'
                      }}>
                        {ev.status}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--muted)',
                        marginBottom: '3px'
                      }}>
                        {new Date(ev.timestamp).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })} · {ev.action_by_name || 'System'}
                      </div>
                      {ev.remarks && (
                        <div style={{
                          fontSize: '11px',
                          color: 'var(--muted)',
                          background: 'var(--surface)',
                          padding: '6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border)',
                          marginTop: '6px'
                        }}>
                          {ev.remarks}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {trackedNotice && (
          <div style={{
            border: '2px solid var(--accent)',
            borderRadius: '12px',
            padding: '20px',
            background: 'var(--surface)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            position: 'relative'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '16px'
            }}>
              <div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '6px',
                  color: 'var(--text)'
                }}>
                  {trackedNotice.title}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--muted)',
                  fontFamily: 'var(--mono)',
                  background: 'var(--accent-bg)',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  display: 'inline-block'
                }}>
                  Reference: {trackedNotice.reference_no || 'Not assigned'}
                </div>
              </div>
              <span className={`badge badge-${trackedNotice.status}`} style={{
                fontSize: '11px',
                padding: '4px 8px'
              }}>
                {trackedNotice.status}
              </span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div style={{
                background: 'var(--surface2)',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--border)'
              }}>
                <div style={{
                  fontSize: '10px',
                  color: 'var(--faint)',
                  textTransform: 'uppercase',
                  fontWeight: '600',
                  marginBottom: '3px'
                }}>
                  Sender
                </div>
                <div style={{ fontSize: '12px', fontWeight: '500' }}>
                  {trackedNotice.sender_org_name} / {trackedNotice.sender_dept_name}
                </div>
              </div>
              <div style={{
                background: 'var(--surface2)',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--border)'
              }}>
                <div style={{
                  fontSize: '10px',
                  color: 'var(--faint)',
                  textTransform: 'uppercase',
                  fontWeight: '600',
                  marginBottom: '3px'
                }}>
                  Receiver
                </div>
                <div style={{ fontSize: '12px', fontWeight: '500' }}>
                  {trackedNotice.receivers && trackedNotice.receivers.length > 0
                    ? trackedNotice.receivers.map(r => `${r.receiver_org_name} / ${r.receiver_dept_name}`).join(', ')
                    : trackedNotice.receiver_org_name ? `${trackedNotice.receiver_org_name} / ${trackedNotice.receiver_dept_name}` : '—'}
                </div>
              </div>
              <div style={{
                background: 'var(--surface2)',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--border)'
              }}>
                <div style={{
                  fontSize: '10px',
                  color: 'var(--faint)',
                  textTransform: 'uppercase',
                  fontWeight: '600',
                  marginBottom: '3px'
                }}>
                  Created
                </div>
                <div style={{ fontSize: '12px', fontWeight: '500' }}>
                  {new Date(trackedNotice.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
              </div>
              <div style={{
                background: 'var(--surface2)',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--border)'
              }}>
                <div style={{
                  fontSize: '10px',
                  color: 'var(--faint)',
                  textTransform: 'uppercase',
                  fontWeight: '600',
                  marginBottom: '3px'
                }}>
                  Last Updated
                </div>
                <div style={{ fontSize: '12px', fontWeight: '500' }}>
                  {trackedNotice.events && trackedNotice.events.length > 0
                    ? new Date(trackedNotice.events[trackedNotice.events.length - 1].timestamp).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })
                    : new Date(trackedNotice.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                </div>
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                fontSize: '11px',
                color: 'var(--faint)',
                textTransform: 'uppercase',
                fontWeight: '600',
                marginBottom: '8px'
              }}>
                Message
              </div>
              <div style={{
                fontSize: '13px',
                color: 'var(--muted)',
                lineHeight: '1.6',
                background: 'var(--surface)',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                maxHeight: '120px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap'
              }}>
                {trackedNotice.message}
              </div>
            </div>
            <div>
              <div style={{
                fontSize: '11px',
                color: 'var(--faint)',
                textTransform: 'uppercase',
                fontWeight: '600',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  display: 'inline-block'
                }} />
                Tracking Timeline
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {(trackedNotice.events || []).map((ev, i) => (
                  <div key={ev.id || i} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px',
                    background: 'var(--surface2)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    transition: 'transform 0.2s'
                  }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      marginTop: '2px',
                      flexShrink: 0
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: 'var(--text)',
                        marginBottom: '4px'
                      }}>
                        {ev.status}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--muted)',
                        marginBottom: '4px'
                      }}>
                        {new Date(ev.timestamp).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })} · {ev.action_by_name || 'System'}
                      </div>
                      {ev.remarks && (
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--muted)',
                          background: 'var(--surface)',
                          padding: '8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          marginTop: '8px'
                        }}>
                          {ev.remarks}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Minimal Latest notices table */}
      <div className="card" style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'var(--teal)'
        }} />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <div className="card-title" style={{
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--text)',
            marginBottom: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            Latest Notices
          </div>
          <div style={{
            fontSize: '12px',
            color: 'var(--muted)',
            background: 'var(--surface2)',
            padding: '4px 8px',
            borderRadius: '12px',
            border: '1px solid var(--border)'
          }}>
            Last 5 notices
          </div>
        </div>
        {loading ? (
          <div className="loading" style={{
            padding: '40px',
            textAlign: 'center',
            color: 'var(--muted)',
            fontSize: '14px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              border: '3px solid var(--border)',
              borderTop: '3px solid var(--accent)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            Loading…
          </div>
        ) : (
          <NoticeTable notices={notices} onRowClick={setSelected} mini />
        )}
      </div>

      {selected && (
        <NoticeDetail
          notice={selected}
          direction={user?.role === 'admin' ? 'both' : 'inbox'}
          user={user}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
