import { useState, useEffect } from 'react'
import { api } from '../api'
import { toast } from '../components/Toast'

/* ── Outreach email modal ── */
function EmailModal({ email, volunteer, task, onClose, onConfirm }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box animate-in">
        <div className="modal-header">
          <div>
            <div className="modal-title">AI-Generated Outreach Email</div>
            <div className="modal-sub">
              Personalised for {volunteer?.name} · {task?.title}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: '.75rem', display: 'flex', gap: '.5rem', alignItems: 'center' }}>
            <span className="pill pill-green">AI Generated</span>
            <span className="pill pill-gray">References volunteer's actual background</span>
          </div>
          <div className="email-preview">{email}</div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onConfirm}>
            ✓ Confirm Assignment
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Match result card ── */
function MatchCard({ match, task, onAssign, assigning }) {
  const vol = match.volunteer || {}
  const initials = (vol.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)
  const score = match.match_score || 0
  const scoreColor = score >= 80 ? 'var(--accent)' : score >= 60 ? 'var(--amber)' : 'var(--red)'
  const scoreGlow = score >= 80 ? 'var(--accent-glow)' : score >= 60 ? 'rgba(251,191,36,.2)' : 'rgba(248,113,113,.2)'

  return (
    <div className="match-card animate-in">
      <div style={{
        width: 52, height: 52, flexShrink: 0, borderRadius: '50%',
        border: `2.5px solid ${scoreColor}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500,
        color: scoreColor, background: `${scoreColor}18`,
        boxShadow: `0 0 12px ${scoreGlow}`
      }}>
        {score}
      </div>
      <div className="match-info">
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: 4 }}>
          <div className="vol-avatar" style={{ width: 26, height: 26, fontSize: 11 }}>{initials}</div>
          <div className="match-name">{vol.name}</div>
          {vol.reliability_score >= 9 && <span className="pill pill-green">★ High Reliability</span>}
          {vol.reliability_score < 6  && <span className="pill pill-red">Low Reliability</span>}
        </div>
        <div className="match-reason">{match.match_reasoning}</div>
        <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap' }}>
          {(match.skill_overlap || []).map(s => (
            <span key={s} className="pill pill-blue">{s}</span>
          ))}
        </div>
      </div>
      <div className="match-actions">
        <button
          className="btn btn-primary btn-sm"
          onClick={() => onAssign(match)}
          disabled={assigning}
        >
          {assigning ? <><span className="spinner" style={{width:12,height:12}}/> Sending…</> : '✉ Assign'}
        </button>
      </div>
    </div>
  )
}

/* ── Slot dots ── */
function SlotDots({ filled, needed }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {Array.from({ length: needed }).map((_, i) => (
        <div key={i} className={`slot-dot ${i < filled ? 'slot-filled' : 'slot-empty'}`} />
      ))}
      <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginLeft: 4 }}>
        {filled}/{needed}
      </span>
    </div>
  )
}

/* ── Task row ── */
function TaskRow({ task, onRefresh }) {
  const [open, setOpen] = useState(false)
  const [matches, setMatches] = useState(null)
  const [matching, setMatching] = useState(false)
  const [assigning, setAssigning] = useState(null)
  const [emailModal, setEmailModal] = useState(null)  // { email, volunteer, match }

  const handleMatch = async () => {
    setMatching(true)
    setOpen(true)
    try {
      const res = await api.matchTask(task.id)
      if (!Array.isArray(res)) {
        throw new Error(res?.error || 'Unexpected response from the match API')
      }
      setMatches(res)
    } catch (e) {
      toast.error(e.message || 'Matching failed — check your API key')
      setMatches([])
    } finally {
      setMatching(false)
    }
  }

  const handleAssign = async (match) => {
    setAssigning(match.volunteer_id)
    try {
      const res = await api.assignVolunteer(task.id, {
        volunteer_id: match.volunteer_id,
        match_score: match.match_score,
        match_reasoning: match.match_reasoning,
      })
      setEmailModal({ email: res.email, volunteer: match.volunteer, match })
    } catch {
      toast.error('Assignment failed')
      setAssigning(null)
    }
  }

  const confirmAssignment = () => {
    toast.success(`${emailModal.volunteer.name} assigned — email sent!`)
    setEmailModal(null)
    setAssigning(null)
    setMatches(prev => prev?.filter(m => m.volunteer_id !== emailModal.match.volunteer_id))
    onRefresh()
  }

  const handleDropout = async (assignment) => {
    try {
      await api.updateAssignmentStatus(assignment.id, 'no_show')
      toast.info(`${assignment.vol_name} marked as no-show — re-run match to reallocate`)
      onRefresh()
    } catch {
      toast.error('Could not update status')
    }
  }

  const isFull = task.slots_filled >= task.slots_needed
  const pct = Math.min(100, Math.round((task.slots_filled / task.slots_needed) * 100))

  return (
    <>
      {emailModal && (
        <EmailModal
          email={emailModal.email}
          volunteer={emailModal.volunteer}
          task={task}
          onClose={() => { setEmailModal(null); setAssigning(null) }}
          onConfirm={confirmAssignment}
        />
      )}

      <div className="task-card">
        <div className="task-header" onClick={() => setOpen(o => !o)}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: 4 }}>
              <div className="task-title">{task.title}</div>
              {isFull
                ? <span className="pill pill-green">Fully staffed</span>
                : task.slots_filled === 0
                  ? <span className="pill pill-red">Unfilled</span>
                  : <span className="pill pill-amber">Partially filled</span>
              }
            </div>
            <div className="task-meta">
              <span className="task-ngo">{task.ngo_name}</span>
              <span style={{ color: 'var(--text-3)' }}>·</span>
              <span style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{task.date}</span>
              <span style={{ color: 'var(--text-3)' }}>·</span>
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{task.time_slot}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginTop: '.5rem' }}>
              <div style={{ flex: 1, maxWidth: 200, height: 3, background: 'var(--border-hi)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99,
                  background: isFull ? 'var(--accent)' : task.slots_filled === 0 ? 'var(--red)' : 'var(--amber)',
                  transition: 'width .4s ease' }} />
              </div>
              <SlotDots filled={task.slots_filled} needed={task.slots_needed} />
            </div>
            <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap', marginTop: '.5rem' }}>
              {(task.required_skills || []).map(s => (
                <span key={s} className="pill pill-gray">{s}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '.5rem', flexShrink: 0, alignItems: 'flex-start' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={e => { e.stopPropagation(); handleMatch() }}
              disabled={matching || isFull}
            >
              {matching ? <><span className="spinner" style={{width:12,height:12}}/> Matching…</> : '⚡ AI Match'}
            </button>
            <span style={{ fontSize: 16, color: 'var(--text-3)', paddingTop: 6 }}>
              {open ? '▲' : '▼'}
            </span>
          </div>
        </div>

        {open && (
          <div className="task-body">
            <p className="task-desc">{task.description}</p>

            {/* Assigned volunteers */}
            {task.assignments?.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div className="section-label">Assigned</div>
                {task.assignments.map(a => (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'center', gap: '.75rem',
                    padding: '.65rem .85rem',
                    background: 'var(--bg)', borderRadius: 'var(--radius-sm)',
                    marginBottom: '.4rem',
                    border: '1px solid var(--border)'
                  }}>
                    <div className="vol-avatar" style={{ width: 30, height: 30, fontSize: 12 }}>
                      {a.vol_name.split(' ').map(n => n[0]).join('').slice(0,2)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{a.vol_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                        Reliability: {a.vol_reliability?.toFixed(1)}
                      </div>
                    </div>
                    <span className="pill pill-green">{a.status}</span>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDropout(a)}
                      title="Mark as no-show (triggers reliability penalty)"
                    >
                      No-show
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Match results */}
            {matching && (
              <div className="loading-row">
                <div className="spinner" />
                Groq is semantically matching {task.title}…
              </div>
            )}

            {matches && !matching && (
              <div>
                <div className="section-label" style={{ marginBottom: '.75rem' }}>
                  AI Recommendations — ranked by semantic fit
                </div>
                {matches.length === 0 ? (
                  <div className="empty-state" style={{ padding: '1.5rem' }}>
                    <div className="empty-icon">🤷</div>
                    <div className="empty-text">No available volunteers match this task</div>
                  </div>
                ) : matches.map(m => (
                  <MatchCard
                    key={m.volunteer_id}
                    match={m}
                    task={task}
                    onAssign={handleAssign}
                    assigning={assigning === m.volunteer_id}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

/* ── NL Task form ── */
function AddTaskForm({ onCreated }) {
  const [mode, setMode] = useState('nl') // 'nl' | 'manual'
  const [nlInput, setNlInput] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [saving, setSaving] = useState(false)

  const [manual, setManual] = useState({
    title: '', description: '', ngo_name: '', date: '', time_slot: '', slots_needed: 2,
    required_skills: [],
  })
  const [skillInput, setSkillInput] = useState('')

  const handleParse = async () => {
    if (!nlInput.trim()) return
    setParsing(true)
    try {
      const res = await api.parseTask(nlInput)
      setParsed(res)
    } catch (e) {
      toast.error(e.message || 'AI parsing failed — check your API key')
    } finally {
      setParsing(false)
    }
  }

  const handleCreate = async () => {
    const data = mode === 'nl' ? parsed : manual
    if (!data?.title) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      const task = await api.createTask(data)
      toast.success(`Task "${task.title}" created!`)
      onCreated(task)
      setParsed(null); setNlInput('')
      setManual({ title:'',description:'',ngo_name:'',date:'',time_slot:'',slots_needed:2,required_skills:[] })
    } catch (e) {
      toast.error(e.error || 'Failed to create task')
    } finally {
      setSaving(false)
    }
  }

  const addSkill = () => {
    if (!skillInput.trim()) return
    setManual(m => ({ ...m, required_skills: [...m.required_skills, skillInput.trim()] }))
    setSkillInput('')
  }

  return (
    <div>
      <div className="tabs" style={{ marginBottom: '1.25rem' }}>
        <button className={`tab-btn ${mode === 'nl' ? 'active' : ''}`} onClick={() => setMode('nl')}>
          ✨ Natural Language
        </button>
        <button className={`tab-btn ${mode === 'manual' ? 'active' : ''}`} onClick={() => setMode('manual')}>
          Manual Entry
        </button>
      </div>

      {mode === 'nl' ? (
        <div>
          <div className="form-group">
            <label className="form-label">Describe your task in plain English</label>
            <div className="nl-input-wrap">
              <textarea
                value={nlInput}
                onChange={e => setNlInput(e.target.value)}
                placeholder="e.g. Need 4 volunteers who speak Kannada to help teach basic smartphone skills to elderly women at the Shivajinagar community centre this Saturday from 10am to 1pm."
                rows={3}
                onKeyDown={e => e.key === 'Enter' && e.ctrlKey && handleParse()}
              />
              <div className="nl-input-footer">
                <span className="nl-hint">Ctrl+Enter to parse</span>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleParse}
                  disabled={parsing || !nlInput.trim()}
                >
                  {parsing
                    ? <><span className="spinner" style={{width:12,height:12}}/> Parsing…</>
                    : '⚡ Parse with AI'}
                </button>
              </div>
            </div>
          </div>

          {parsed && (
            <div className="animate-in" style={{ marginTop: '1rem' }}>
              <div className="info-box" style={{ marginBottom: '.75rem' }}>
                <span>✓</span>
                <span>AI parsed your description. Review and confirm below.</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
                {[
                  ['Title', 'title'],
                  ['NGO Name', 'ngo_name'],
                  ['Date', 'date'],
                  ['Time Slot', 'time_slot'],
                ].map(([label, key]) => (
                  <div key={key}>
                    <div className="form-label">{label}</div>
                    <input
                      className="form-input"
                      value={parsed[key] || ''}
                      onChange={e => setParsed(p => ({ ...p, [key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div>
                  <div className="form-label">Slots Needed</div>
                  <input
                    className="form-input"
                    type="number" min={1} max={50}
                    value={parsed.slots_needed || 2}
                    onChange={e => setParsed(p => ({ ...p, slots_needed: parseInt(e.target.value) }))}
                  />
                </div>
              </div>
              <div style={{ marginTop: '.75rem' }}>
                <div className="form-label">Description</div>
                <textarea
                  className="form-textarea"
                  value={parsed.description || ''}
                  onChange={e => setParsed(p => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div style={{ marginTop: '.75rem' }}>
                <div className="form-label">Required Skills (AI detected)</div>
                <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                  {(parsed.required_skills || []).map((s, i) => (
                    <span key={i} className="skill-chip">
                      {s}
                      <button className="skill-chip-remove"
                        onClick={() => setParsed(p => ({ ...p, required_skills: p.required_skills.filter((_, j) => j !== i) }))}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                  {saving ? <><span className="spinner" style={{width:14,height:14}}/> Saving…</> : '+ Create Task'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Task Title</label>
              <input className="form-input" placeholder="e.g. Python Workshop for School Kids"
                value={manual.title} onChange={e => setManual(m => ({ ...m, title: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">NGO / Organisation</label>
              <input className="form-input" placeholder="e.g. Agastya International Foundation"
                value={manual.ngo_name} onChange={e => setManual(m => ({ ...m, ngo_name: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" placeholder="What will volunteers do?"
              value={manual.description} onChange={e => setManual(m => ({ ...m, description: e.target.value }))} />
          </div>
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date"
                value={manual.date} onChange={e => setManual(m => ({ ...m, date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Time Slot</label>
              <input className="form-input" placeholder="10:00 AM – 1:00 PM"
                value={manual.time_slot} onChange={e => setManual(m => ({ ...m, time_slot: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Slots Needed</label>
              <input className="form-input" type="number" min={1} max={50}
                value={manual.slots_needed} onChange={e => setManual(m => ({ ...m, slots_needed: parseInt(e.target.value) }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Required Skills</label>
            <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.5rem' }}>
              <input className="form-input" placeholder="Add a skill and press Enter"
                value={skillInput} onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSkill()} />
              <button className="btn btn-ghost" onClick={addSkill}>Add</button>
            </div>
            <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
              {manual.required_skills.map((s, i) => (
                <span key={i} className="skill-chip">
                  {s}
                  <button className="skill-chip-remove"
                    onClick={() => setManual(m => ({ ...m, required_skills: m.required_skills.filter((_, j) => j !== i) }))}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
            {saving ? <><span className="spinner" style={{width:14,height:14}}/> Saving…</> : '+ Create Task'}
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Main Tasks view ── */
export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('all')

  const load = () => {
    setLoading(true)
    api.getTasks()
      .then(setTasks)
      .catch(() => toast.error('Failed to load tasks'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = tasks.filter(t =>
    filter === 'all' ? true :
    filter === 'open' ? t.slots_filled < t.slots_needed :
    filter === 'full' ? t.slots_filled >= t.slots_needed : true
  )

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Tasks</h1>
            <p className="page-sub">Create tasks in plain English — AI parses and structures them automatically</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
            {showForm ? '✕ Cancel' : '+ New Task'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card animate-in" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <div className="card-title">Create New Task</div>
          </div>
          <div className="card-body">
            <AddTaskForm onCreated={() => { setShowForm(false); load() }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.25rem' }}>
        {[['all', 'All Tasks'], ['open', 'Needs Volunteers'], ['full', 'Fully Staffed']].map(([val, label]) => (
          <button key={val}
            className={`btn btn-sm ${filter === val ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(val)}>
            {label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-3)', alignSelf: 'center',
          fontFamily: 'var(--font-mono)' }}>
          {filtered.length} tasks
        </span>
      </div>

      {loading ? (
        <div className="loading-row"><div className="spinner" /> Loading tasks…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-text">No tasks found. Create your first one above.</div>
        </div>
      ) : (
        filtered.map(task => <TaskRow key={task.id} task={task} onRefresh={load} />)
      )}
    </div>
  )
}
