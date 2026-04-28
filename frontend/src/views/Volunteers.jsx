import { useState, useEffect } from 'react'
import { api } from '../api'
import { toast } from '../components/Toast'

function RegisterForm({ onCreated }) {
  const [form, setForm] = useState({
    name: '', email: '', bio: '', availability: '',
    city: 'Bengaluru', skills: [], languages: [],
  })
  const [skillInput, setSkillInput] = useState('')
  const [langInput,  setLangInput]  = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const addSkill = () => {
    if (!skillInput.trim()) return
    set('skills', [...form.skills, skillInput.trim()])
    setSkillInput('')
  }
  const removeSkill = i => set('skills', form.skills.filter((_, j) => j !== i))

  const addLang = () => {
    if (!langInput.trim()) return
    set('languages', [...form.languages, langInput.trim()])
    setLangInput('')
  }
  const removeLang = i => set('languages', form.languages.filter((_, j) => j !== i))

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.bio || !form.availability) {
      toast.error('Name, email, bio, and availability are required')
      return
    }
    setSaving(true)
    try {
      await api.createVolunteer(form)
      toast.success(`${form.name} registered as a volunteer!`)
      onCreated()
      setForm({ name:'',email:'',bio:'',availability:'',city:'Bengaluru',skills:[],languages:[] })
    } catch (e) {
      toast.error(e.error || 'Registration failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input className="form-input" placeholder="e.g. Priya Raghavan"
            value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" placeholder="priya@example.com"
            value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Bio — your background in your own words</label>
        <textarea className="form-textarea" style={{ minHeight: 90 }}
          placeholder="Tell us about your professional background, skills, and why you want to volunteer. Be specific — the AI uses this to match you to tasks."
          value={form.bio} onChange={e => set('bio', e.target.value)} />
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
          Tip: "I teach secondary school maths" beats "I am good at maths." Specificity = better matches.
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Availability</label>
          <input className="form-input" placeholder="e.g. Weekends, Saturday mornings"
            value={form.availability} onChange={e => set('availability', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">City</label>
          <input className="form-input" placeholder="Bengaluru"
            value={form.city} onChange={e => set('city', e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Skills (press Enter to add)</label>
          <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.5rem' }}>
            <input className="form-input" placeholder="e.g. Python, First Aid, Photography"
              value={skillInput} onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSkill()} />
            <button className="btn btn-ghost" onClick={addSkill}>Add</button>
          </div>
          <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap' }}>
            {form.skills.map((s, i) => (
              <span key={i} className="skill-chip">
                {s} <button className="skill-chip-remove" onClick={() => removeSkill(i)}>×</button>
              </span>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Languages (press Enter to add)</label>
          <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.5rem' }}>
            <input className="form-input" placeholder="e.g. Kannada, Hindi, Tamil"
              value={langInput} onChange={e => setLangInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addLang()} />
            <button className="btn btn-ghost" onClick={addLang}>Add</button>
          </div>
          <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap' }}>
            {form.languages.map((l, i) => (
              <span key={i} className="skill-chip" style={{ background: 'var(--amber-dim)', color: 'var(--amber)' }}>
                {l} <button className="skill-chip-remove" onClick={() => removeLang(i)}>×</button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={saving}>
        {saving
          ? <><span className="spinner" style={{width:16,height:16}}/> Registering…</>
          : '✓ Register as Volunteer'
        }
      </button>
    </div>
  )
}

export default function Volunteers() {
  const [volunteers, setVolunteers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('reliability')

  const load = () => {
    setLoading(true)
    api.getVolunteers()
      .then(setVolunteers)
      .catch(() => toast.error('Failed to load volunteers'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = volunteers
    .filter(v => {
      if (!search) return true
      const q = search.toLowerCase()
      return v.name.toLowerCase().includes(q) ||
        v.bio?.toLowerCase().includes(q) ||
        (v.skills || []).some(s => s.toLowerCase().includes(q)) ||
        (v.languages || []).some(l => l.toLowerCase().includes(q))
    })
    .sort((a, b) =>
      sortBy === 'reliability' ? b.reliability_score - a.reliability_score :
      sortBy === 'tasks'       ? b.total_tasks - a.total_tasks :
      a.name.localeCompare(b.name)
    )

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Volunteers</h1>
            <p className="page-sub">
              {volunteers.length} registered · ranked by reliability score
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
            {showForm ? '✕ Cancel' : '+ Register Volunteer'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card animate-in" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <div className="card-title">Volunteer Registration</div>
            <div className="card-sub">The AI uses the bio field for semantic matching — not just skill tags</div>
          </div>
          <div className="card-body">
            <RegisterForm onCreated={() => { setShowForm(false); load() }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1.25rem', alignItems: 'center' }}>
        <input className="form-input" style={{ maxWidth: 280 }}
          placeholder="Search by name, skill, language, bio…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="form-select" style={{ maxWidth: 180 }}
          value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="reliability">Sort: Reliability</option>
          <option value="tasks">Sort: Tasks Done</option>
          <option value="name">Sort: Name</option>
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-3)',
          fontFamily: 'var(--font-mono)' }}>
          {filtered.length} volunteers
        </span>
      </div>

      {loading ? (
        <div className="loading-row"><div className="spinner" /> Loading volunteers…</div>
      ) : (
        <div className="card">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <div className="empty-text">No volunteers match your search.</div>
            </div>
          ) : (
            filtered.map(v => {
              const initials = v.name.split(' ').map(n => n[0]).join('').slice(0, 2)
              const pct = (v.reliability_score / 10) * 100
              const relColor = v.reliability_score >= 9 ? 'var(--accent)' :
                               v.reliability_score >= 7 ? 'var(--amber)' : 'var(--red)'
              return (
                <div key={v.id} className="vol-item">
                  <div className="vol-avatar">{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                      <div className="vol-name">{v.name}</div>
                      {(v.languages || []).slice(0, 2).map(l => (
                        <span key={l} className="pill pill-amber" style={{ fontSize: 10 }}>{l}</span>
                      ))}
                    </div>
                    <div className="vol-bio">{v.bio}</div>
                    <div className="vol-tags">
                      {(v.skills || []).slice(0, 5).map(s => (
                        <span key={s} className="pill pill-blue" style={{ fontSize: 10 }}>{s}</span>
                      ))}
                      {(v.skills || []).length > 5 && (
                        <span className="pill pill-gray" style={{ fontSize: 10 }}>
                          +{v.skills.length - 5}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 80 }}>
                    <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--font-mono)', color: relColor }}>
                      {v.reliability_score.toFixed(1)}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase',
                      letterSpacing: '.06em', margin: '2px 0 5px' }}>
                      Reliability
                    </div>
                    <div style={{ width: 60, height: 3, background: 'var(--border-hi)', borderRadius: 99,
                      overflow: 'hidden', marginLeft: 'auto' }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: relColor }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>
                      {v.completed_tasks}/{v.total_tasks} tasks
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
