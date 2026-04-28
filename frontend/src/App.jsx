import { useState } from 'react'
import ToastProvider from './components/Toast'
import Dashboard from './views/Dashboard'
import Tasks from './views/Tasks'
import Volunteers from './views/Volunteers'

const NAV = [
  { id: 'dashboard',  label: 'Dashboard',   icon: '◆' },
  { id: 'tasks',      label: 'Tasks',        icon: '◇' },
  { id: 'volunteers', label: 'Volunteers',   icon: '◉' },
]

export default function App() {
  const [view, setView] = useState('dashboard')

  return (
    <>
      <ToastProvider />
      <div className="shell">
        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-mark">⚡</div>
            <div>
              <div className="logo-text">VolunteerAI</div>
              <div className="logo-sub">Bengaluru NGO Network</div>
            </div>
          </div>

          <div className="nav-label">Navigation</div>
          {NAV.map(item => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? 'active' : ''}`}
              onClick={() => setView(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}

          <div className="sidebar-bottom">
            <div className="sidebar-research-tag">
              Built on research by<br />
              Yale SOM · Stanford · UCLA<br />
              <span style={{ color: 'var(--accent)' }}>Semantic &gt; keyword matching</span>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="main">
          {view === 'dashboard'  && <Dashboard onNavigate={setView} />}
          {view === 'tasks'      && <Tasks />}
          {view === 'volunteers' && <Volunteers />}
        </main>
      </div>
    </>
  )
}
