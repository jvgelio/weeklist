import React from 'react'
import { CalendarDays, Inbox, Hash } from 'lucide-react'
import type { View } from '../lib/types'

interface MobileTabBarProps {
  view: View
  onViewChange: (v: View) => void
  inboxCount?: number
  accent: string
}

export function MobileTabBar({ view, onViewChange, inboxCount, accent }: MobileTabBarProps) {
  const tabs: { id: View; icon: React.ReactNode; label: string }[] = [
    { id: 'week',  icon: <CalendarDays size={20} />, label: 'Semana' },
    { id: 'inbox', icon: <Inbox size={20} />,        label: 'Inbox'  },
    { id: 'tags',  icon: <Hash size={20} />,         label: 'Tags'   },
  ]

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      height: 56, display: 'flex',
      background: 'var(--bg-sunken)',
      borderTop: '1px solid var(--line)',
    }}>
      {tabs.map(tab => {
        const active = view === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 3, border: 0, background: 'transparent', cursor: 'pointer',
              color: active ? accent : 'var(--ink-mute)',
              fontSize: 10, fontWeight: active ? 700 : 500,
              position: 'relative',
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.id === 'inbox' && inboxCount != null && inboxCount > 0 && (
              <span style={{
                position: 'absolute', top: 6, right: '50%', marginRight: -18,
                background: accent, color: 'var(--accent-ink)',
                borderRadius: 9999, fontSize: 9, fontWeight: 700,
                padding: '1px 5px', minWidth: 16, textAlign: 'center',
              }}>{inboxCount}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
