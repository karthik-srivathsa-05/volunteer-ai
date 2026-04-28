import { useState, useEffect } from 'react'
import { api } from '../api'
import { toast } from '../components/Toast'

function StatCard({ icon, num, label, accent }) {
  return (
    <div className="stat-card animate-in">
      <div className="stat-icon">{icon}</div>
      <div className="stat-num" style={accent ? { color: accent } : {}}>{num}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null)
  const [tasks, setTasks] = useState([])
  const [volunteers, setVolunteers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.getStats(), api.getTasks(), api.getVolunteers()])
      .then(([s, t, v]) => { setStats(s); setTasks(t); setVolunteers(v) })
      .catch(() => toast.error('Could not load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="loading-row" style={{ marginTop: '4rem' }}>
      <div className="spinner" />
      Loading dashboard…
    </div>
  )

  const openTasks = tasks.filter(t => t.status === 'open')
  const criticalTasks = openTasks.filter(t => t.slots_filled < t.slots_needed)
  const topVols = [...volunteers].sort((a, b) => b.reliability_score - a.reliability_score).slice(0, 5)

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Command Centre</h1>
            <p className="page-sub">
              Real-time volunteer coordination — Bengaluru NGO Network
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
              RESEARCH BASIS
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>
              Yale SOM · Stanford · UCLA Anderson<br />
              <span style={{ color: 'var(--accent)' }}>Semantic matching</span> vs. keyword search
            </div>
          </div>
        </div>
      </div>

      {stats && (
        <div className="stat-grid">
          <StatCard icon="👥" num={stats.volunteers} label="Volunteers" />
          <StatCard icon="📋" num={stats.tasks} label="Total Tasks" />
          <StatCard icon="🔴" num={criticalTasks.length} label="Needs Filling" accent="var(--red)" />
          <StatCard icon="🤝" num={stats.matches} label="AI Matches" accent="var(--accent)" />
          <StatCard icon="⭐" num={stats.avg_reliability} label="Avg Reliability" accent="var(--amber)" />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Critical tasks */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">⚠ Understaffed Tasks</div>
              <div className="card-sub">Tasks needing volunteers right now</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('tasks')}>
              View all
            </button>
          </div>
          <div>
            {criticalTasks.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <div className="empty-icon">✅</div>
                <div className="empty-text">All tasks are fully staffed</div>
              </div>
            ) : criticalTasks.slice(0, 4).map(task => {
              const pct = Math.round((task.slots_filled / task.slots_needed) * 100)
              const urgent = task.slots_filled === 0
              return (
                <div key={task.id} style={{
                  padding: '1rem 1.25rem',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: '1rem'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 3,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {task.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>
                      {task.ngo_name} · {task.date}
                    </div>
                    <div style={{ height: 4, background: 'var(--border-hi)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`, borderRadius: 99,
                        background: urgent ? 'var(--red)' : 'var(--amber)',
                        transition: 'width .4s ease'
                      }} />
                    </div>
                    <div style={{ fontSize: 11, color: urgent ? 'var(--red)' : 'var(--amber)',
                      marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                      {task.slots_filled}/{task.slots_needed} filled
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => onNavigate('tasks')}>
                    Match
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top volunteers */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">⭐ Top Volunteers</div>
              <div className="card-sub">Ranked by reliability score</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('volunteers')}>
              View all
            </button>
          </div>
          <div>
            {topVols.map(v => {
              const initials = v.name.split(' ').map(n => n[0]).join('').slice(0, 2)
              const pct = (v.reliability_score / 10) * 100
              return (
                <div key={v.id} style={{
                  display: 'flex', alignItems: 'center', gap: '.85rem',
                  padding: '.85rem 1.25rem',
                  borderBottom: '1px solid var(--border)'
                }}>
                  <div className="vol-avatar">{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{v.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {(v.skills || []).slice(0, 3).join(' · ')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-mono)',
                      color: v.reliability_score >= 9 ? 'var(--accent)' :
                             v.reliability_score >= 7 ? 'var(--amber)' : 'var(--red)' }}>
                      {v.reliability_score.toFixed(1)}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase',
                      letterSpacing: '.06em', marginBottom: 4 }}>
                      Reliability
                    </div>
                    <div style={{ width: 52, height: 3, background: 'var(--border-hi)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99,
                        background: v.reliability_score >= 9 ? 'var(--accent)' :
                                    v.reliability_score >= 7 ? 'var(--amber)' : 'var(--red)' }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Research callout */}
      <div className="info-box" style={{ marginTop: '1.5rem' }}>
        <span>🔬</span>
        <div>
          <strong>Why this works differently:</strong> Yale SOM, Stanford, and UCLA Anderson researchers found that platforms like VolunteerMatch rank by
          recency and proximity — not skill fit — creating bottlenecks and volunteer burnout. VolunteerAI uses semantic matching via
          Groq-powered matching, understanding that "Python developer" fits "data literacy trainer" even without shared keywords.
        </div>
      </div>
    </div>
  )
}
