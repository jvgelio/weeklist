import React, { useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { CalendarDays, Inbox, Clock } from 'lucide-react'
import { addDays, isoDate, sameDay, startOfWeek, MONTH_PT } from '../lib/constants'
import type { View, Variant, TaskMap } from '../lib/types'

// ---- Icons ----

function IconWeek({ size = 14 }: { size?: number }) {
  return <CalendarDays size={size}/>
}
function IconInbox({ size = 14 }: { size?: number }) {
  return <Inbox size={size}/>
}
function IconSomeday({ size = 14 }: { size?: number }) {
  return <Clock size={size}/>
}

// ---- getWeekNumber ----

function getWeekNumber(d: Date) {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

// ---- MiniWeekStrip ----

interface MiniWeekStripProps {
  weekStart: Date
  isActive: boolean
  onSelect: () => void
  taskCountByDay: Record<string, number>
  showWeekend: boolean
  today: Date
}

function MiniWeekStrip({ weekStart, isActive, onSelect, taskCountByDay, showWeekend, today }: MiniWeekStripProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const visibleDays = showWeekend ? days : days.filter(d => d.getDay() !== 0 && d.getDay() !== 6)
  const end = addDays(weekStart, 6)
  const label = `${weekStart.getDate()} ${MONTH_PT[weekStart.getMonth()]} — ${end.getDate()} ${MONTH_PT[end.getMonth()]}`
  const weekNum = getWeekNumber(weekStart)

  const bucketKey = `weeklist-${isoDate(weekStart)}`
  const { setNodeRef, isOver } = useDroppable({
    id: `sidebar-${bucketKey}`,
    data: { type: 'zone', bucketKey, slot: null }
  })

  return (
    <button
      ref={setNodeRef}
      onClick={onSelect}
      style={{
        display: 'flex', flexDirection: 'column', gap: 6,
        padding: '10px 12px',
        borderRadius: 14,
        background: isOver ? 'var(--accent-soft)' : isActive ? 'var(--bg-raised)' : 'transparent',
        boxShadow: isActive ? 'var(--ring)' : 'none',
        border: isOver ? '1px dashed var(--accent)' : '1px dashed transparent',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'background 120ms ease',
        width: '100%',
      }}
      onMouseEnter={e => { if (!isActive && !isOver) e.currentTarget.style.background = 'var(--line)' }}
      onMouseLeave={e => { if (!isActive && !isOver) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600,
          color: isActive ? 'var(--ink)' : 'var(--ink-mute)',
          letterSpacing: '-0.01em',
        }}>
          {label}
        </div>
        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
          textTransform: 'uppercase', color: 'var(--ink-faint)'
        }}>
          W{weekNum}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 3 }}>
        {visibleDays.map((d, i) => {
          const count = taskCountByDay[isoDate(d)] || 0
          const isToday = sameDay(d, today)
          return (
            <div key={i} style={{
              flex: 1,
              height: 24, borderRadius: 4,
              background: count > 0 ? 'var(--ink-soft)' : 'var(--line)',
              opacity: count === 0 ? 0.35 : Math.min(0.25 + count * 0.14, 1),
              outline: isToday ? '1.5px solid var(--accent)' : 'none',
              outlineOffset: 1,
            }} />
          )
        })}
      </div>
    </button>
  )
}

// ---- ViewButton ----

interface ViewButtonProps {
  icon: React.ReactNode
  label: string
  count?: number
  active: boolean
  onClick: () => void
  accent?: string
  collapsed: boolean
  dropRef?: (el: HTMLElement | null) => void
  isDropOver?: boolean
}

function ViewButton({ icon, label, count, active, onClick, accent, collapsed, dropRef, isDropOver }: ViewButtonProps) {
  const isHighlighted = isDropOver || false
  return (
    <button
      ref={dropRef}
      onClick={onClick}
      title={collapsed ? label : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: collapsed ? '10px 0' : '9px 12px', borderRadius: 10,
        border: isHighlighted ? '1.5px dashed var(--accent)' : '1.5px dashed transparent',
        background: isHighlighted ? 'var(--accent-soft)' : (active ? 'var(--bg-raised)' : 'transparent'),
        boxShadow: active && !isHighlighted ? 'var(--ring)' : 'none',
        color: 'var(--ink)',
        fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em',
        width: '100%', textAlign: collapsed ? 'center' : 'left',
        justifyContent: collapsed ? 'center' : 'flex-start',
        cursor: 'pointer',
        transition: 'background 120ms ease, border 120ms ease',
      }}
      onMouseEnter={e => { if (!active && !isHighlighted) e.currentTarget.style.background = 'var(--line)' }}
      onMouseLeave={e => { if (!active && !isHighlighted) e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{ color: isHighlighted ? 'var(--accent)' : (active ? (accent || 'var(--ink)') : 'var(--ink-mute)') }}>{icon}</span>
      {!collapsed && <span style={{ flex: 1 }}>{label}</span>}
      {!collapsed && count != null && count > 0 && (
        <span style={{
          fontSize: 11, fontWeight: 600, color: 'var(--ink-mute)',
          background: 'var(--bg-sunken)', borderRadius: 9999,
          padding: '1px 7px', minWidth: 18, textAlign: 'center',
        }}>{count}</span>
      )}
    </button>
  )
}

// ---- DroppableInboxButton ----

interface DroppableInboxButtonProps {
  active: boolean
  onClick: () => void
  accent?: string
  collapsed: boolean
  count?: number
  view: View
}

function DroppableInboxButton({ active, onClick, accent, collapsed, count, view }: DroppableInboxButtonProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: '__inbox',
    // Desabilita quando já está no inbox para não conflitar com o droppable do ListView
    disabled: view === 'inbox',
    data: { type: 'zone', bucketKey: '__inbox', slot: null },
  })
  return (
    <ViewButton
      dropRef={setNodeRef}
      isDropOver={isOver}
      icon={<IconInbox />}
      label="Inbox"
      count={count}
      active={active}
      onClick={onClick}
      accent={accent}
      collapsed={collapsed}
    />
  )
}

// ---- Sidebar ----

export interface SidebarProps {
  view: View
  onViewChange: (view: View) => void
  activeWeekStart: Date
  onWeekSelect: (date: Date) => void
  taskMap: TaskMap
  showWeekend: boolean
  accent: string
  collapsed: boolean
  onToggleCollapsed: () => void
}

export function Sidebar({
  view, onViewChange,
  activeWeekStart, onWeekSelect,
  taskMap, showWeekend,
  accent,
  collapsed, onToggleCollapsed,
}: SidebarProps) {
  const today = new Date()
  const currentMonday = startOfWeek(today, 1)

  const weeks = useMemo(() => {
    const arr: Date[] = []
    for (let i = -4; i <= 8; i++) {
      arr.push(addDays(currentMonday, i * 7))
    }
    return arr
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const countByDay = useMemo(() => {
    const map: Record<string, number> = {}
    Object.entries(taskMap).forEach(([k, list]) => {
      if (k.startsWith('__')) return
      map[k] = list.length
    })
    return map
  }, [taskMap])

  const inboxCount   = taskMap.__inbox?.length || 0

  return (
    <aside style={{
      width: collapsed ? 54 : 260, flexShrink: 0,
      background: 'var(--bg-sunken)',
      borderRight: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column',
      height: '100vh',
      transition: 'width 200ms ease',
      overflow: 'hidden',
    }}>
      {/* Brand + collapse toggle */}
      <div style={{
        padding: '16px 14px 14px',
        display: 'flex', alignItems: 'center', gap: 8,
        borderBottom: '1px solid var(--line)',
        justifyContent: collapsed ? 'center' : 'space-between',
        flexShrink: 0,
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{
              width: 22, height: 22, borderRadius: 6,
              background: accent || 'var(--accent)',
              display: 'grid', placeItems: 'center',
              color: 'var(--accent-ink)', fontWeight: 700, fontSize: 13,
              fontFamily: 'var(--font-display)', fontStyle: 'italic', flexShrink: 0,
            }}>w</span>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '-0.02em',
              fontStyle: 'italic', color: 'var(--ink)', whiteSpace: 'nowrap',
            }}>weeklist</span>
          </div>
        )}
        <button
          onClick={onToggleCollapsed}
          className="ghost-btn"
          title={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
          style={{ padding: '6px 7px', color: 'var(--ink-mute)', flexShrink: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
            style={{ transform: `rotate(${collapsed ? 180 : 0}deg)`, transition: 'transform 200ms ease' }}>
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* View navigation */}
      <div style={{ padding: collapsed ? '10px 6px' : '10px 10px', display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
        <ViewButton
          collapsed={collapsed} icon={<IconWeek />} label="Semana"
          active={view === 'week'} onClick={() => onViewChange('week')} accent={accent}
        />
        <DroppableInboxButton
          collapsed={collapsed}
          count={inboxCount}
          active={view === 'inbox'}
          onClick={() => onViewChange('inbox')}
          accent={accent}
          view={view}
        />
      </div>

      {collapsed && <div style={{ flex: 1 }} />}

      {/* Mini week strips — header */}
      {!collapsed && (
        <div style={{
          padding: '4px 10px 6px',
          borderTop: '1px solid var(--line)',
          marginTop: 2, flexShrink: 0,
        }}>
          <div style={{
            padding: '8px 8px 4px',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--ink-mute)',
          }}>Semanas</div>
        </div>
      )}

      {/* Mini week strips — list */}
      {!collapsed && (
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '0 10px 10px',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {weeks.map((w, i) => (
            <MiniWeekStrip
              key={i}
              weekStart={w}
              isActive={view === 'week' && sameDay(w, activeWeekStart)}
              onSelect={() => { onViewChange('week'); onWeekSelect(w) }}
              taskCountByDay={countByDay}
              showWeekend={showWeekend}
              today={today}
            />
          ))}
        </div>
      )}

    </aside>
  )
}
