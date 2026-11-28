import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from '../lib/icons'
import { budgetLevel, clamp, levelLabel } from '../lib/format'
import type { Person } from '../lib/types'

export function Avatar({ person, size = 36 }: { person?: Person; size?: number }) {
  const label = person?.name ?? '?'
  return (
    <span className="avatar" style={{ width: size, height: size, background: person?.color ?? '#9aa7a6', fontSize: size * 0.42 }} aria-hidden="true">
      {label.slice(0, 1).toUpperCase()}
    </span>
  )
}

export function Bar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const level = budgetLevel(used, limit)
  const pct = limit > 0 ? clamp((used / limit) * 100, 0, 100) : used > 0 ? 100 : 0
  return (
    <div className={`bar lvl-${level}`} role="progressbar" aria-label={`${label}: ${levelLabel[level]}`}
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    ref.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Tutup"><Icon name="x" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>
}
