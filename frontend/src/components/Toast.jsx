import { useState, useCallback, useEffect } from 'react'

let _push = null
export const toast = {
  success: (msg) => _push?.({ type: 'success', msg, icon: '✓' }),
  error:   (msg) => _push?.({ type: 'error',   msg, icon: '✕' }),
  info:    (msg) => _push?.({ type: 'info',     msg, icon: 'ℹ' }),
}

export default function ToastProvider() {
  const [toasts, setToasts] = useState([])

  const push = useCallback((t) => {
    const id = Date.now()
    setToasts(prev => [...prev, { ...t, id }])
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 3500)
  }, [])

  useEffect(() => { _push = push; return () => { _push = null } }, [push])

  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span>{t.icon}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  )
}
