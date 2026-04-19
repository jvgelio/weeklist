import React, { useMemo } from 'react'
import { MONTH_PT, isoDate, sameDay, addDays } from '../lib/constants'
import type { Task, TaskMap, Variant } from '../lib/types'
import {
  DayRow, DayColumn,
  WeekendStrip, WeekendColumnsStrip,
} from './day-row'
import { IconArrow, TaskRow, InlineAdd } from './task-components'

const TODAY = new Date()

// ---- ViewModeToggle ----

interface ViewModeToggleProps {
  variant: Variant
  onChange: (v: Variant) => void
}

export function ViewModeToggle({ variant, onChange }: ViewModeToggleProps) {
  const opts: { id: Variant; label: string }[] = [
    { id: 'manifesto', label: 'Editorial' },
    { id: 'quiet',     label: 'Quieto'    },
    { id: 'columns',   label: 'Colunas'   },
  ]
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      background: 'var(--bg-sunken)', borderRadius: 999,
      padding: 3, boxShadow: 'var(--ring)',
    }}>
      {opts.map(o => {
        const active = variant === o.id
        return (
          <button key={o.id} onClick={() => onChange(o.id)} style={{
            border: 0, cursor: 'pointer',
            padding: '4px 10px', fontSize: 11, fontWeight: 600,
            letterSpacing: '0.01em', borderRadius: 999,
            background: active ? 'var(--bg-raised)' : 'transparent',
            color: active ? 'var(--ink)' : 'var(--ink-mute)',
            boxShadow: active ? 'var(--ring)' : 'none',
            fontFamily: 'var(--font-body)',
            transition: 'all .15s ease',
          }}>{o.label}</button>
        )
      })}
    </div>
  )
}

// ---- WeekView ----

interface WeekViewProps {
  weekStart: Date
  tasks: TaskMap
  variant: Variant
  showWeekend: boolean
  accent: string
  onOpenTask: (task: Task) => void
  onAddTask: (bucketKey: string, title: string, slot: 'am' | 'pm') => void
  onUpdateTask: (task: Task) => void
  onDeleteTask: (id: string) => void
  onMoveTask: (id: string, bucketKey: string) => void
  onPrevWeek: () => void
  onNextWeek: () => void
  onToday: () => void
  onChangeVariant: (v: Variant) => void
}

export function WeekView({
  weekStart, tasks, variant, showWeekend,
  accent,
  onOpenTask, onAddTask, onUpdateTask, onDeleteTask, onMoveTask,
  onPrevWeek, onNextWeek, onToday,
  onChangeVariant,
}: WeekViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const visibleDays = showWeekend ? days : days.filter(d => d.getDay() !== 0 && d.getDay() !== 6)
  const weekend = days.filter(d => d.getDay() === 0 || d.getDay() === 6)

  const end = addDays(weekStart, 6)
  const sameMonth = weekStart.getMonth() === end.getMonth()
  const rangeLabel = sameMonth
    ? `${weekStart.getDate()}–${end.getDate()} ${MONTH_PT[weekStart.getMonth()]} ${end.getFullYear()}`
    : `${weekStart.getDate()} ${MONTH_PT[weekStart.getMonth()]} – ${end.getDate()} ${MONTH_PT[end.getMonth()]} ${end.getFullYear()}`

  const overdueTasks = useMemo(() => {
    const out: (Task & { _from: string })[] = []
    Object.entries(tasks).forEach(([k, list]) => {
      if (k.startsWith('__')) return
      const d = new Date(k + 'T00:00:00')
      if (d < weekStart) {
        list.forEach(t => { if (!t.done) out.push({ ...t, _from: k }) })
      }
    })
    return out
  }, [tasks, weekStart])

  function pullAllOverdue() {
    const todayKey = isoDate(TODAY)
    overdueTasks.forEach(t => onMoveTask(t.id, todayKey))
  }

  const isColumns = variant === 'columns'
  const sidePad   = isColumns ? '0 24px 24px' : variant === 'manifesto' ? '0 48px 120px' : '0 32px 120px'

  const dayProps = {
    accent,
    onOpenTask,
    onAddTask,
    onUpdateTask,
    onDeleteTask,
  }

  return (
    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: isColumns ? '24px 24px 16px' : variant === 'manifesto' ? '32px 48px 20px' : '24px 32px 16px',
        flexShrink: 0,
      }}>
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 20, marginBottom: overdueTasks.length > 0 ? 14 : 0,
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--ink-mute)', marginBottom: 5,
            }}>Semana</div>
            {isColumns || variant === 'manifesto' ? (
              <h1 style={{
                margin: 0, fontFamily: 'var(--font-display)',
                fontSize: 32, fontWeight: 400, fontStyle: 'italic',
                letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--ink)',
                whiteSpace: 'nowrap',
              }}>
                {rangeLabel}
              </h1>
            ) : (
              <h1 style={{
                margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em',
                color: 'var(--ink)', whiteSpace: 'nowrap',
              }}>
                {rangeLabel}
              </h1>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className="ghost-btn" onClick={onPrevWeek} title="Semana anterior (←)">
              <IconArrow dir="left"/>
            </button>
            <button className="ghost-btn" onClick={onToday} style={{
              background: 'var(--bg-sunken)', fontWeight: 600, fontSize: 12,
            }}>
              Hoje
            </button>
            <button className="ghost-btn" onClick={onNextWeek} title="Próxima semana (→)">
              <IconArrow dir="right"/>
            </button>
            <span style={{ width: 1, height: 18, background: 'var(--line)', margin: '0 4px' }}/>
            <ViewModeToggle variant={variant} onChange={onChangeVariant}/>
          </div>
        </header>

        {overdueTasks.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 16, padding: '10px 14px',
            background: 'var(--bg-raised)', boxShadow: 'var(--ring)',
            borderRadius: 12,
            borderLeft: '3px solid var(--prio-high)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--prio-high)',
              }}>atrasadas</span>
              <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
                {overdueTasks.length} tarefa{overdueTasks.length > 1 ? 's' : ''}
              </span>
              <span style={{
                fontSize: 12, color: 'var(--ink-mute)', fontStyle: 'italic',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {overdueTasks.slice(0, 2).map(t => t.title).join(' · ')}
                {overdueTasks.length > 2 && ' · …'}
              </span>
            </div>
            <button className="pill-btn" onClick={pullAllOverdue} style={{ fontSize: 12, padding: '7px 14px' }}>
              <IconArrow size={11}/> Puxar pra hoje
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      {isColumns ? (
        <div style={{ flex: 1, minHeight: 0, padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ flex: 1, display: 'flex', gap: 10, minHeight: 0 }}>
            {visibleDays.map(d => {
              const key = isoDate(d)
              return (
                <DayColumn
                  key={key} date={d}
                  tasks={tasks[key] ?? []}
                  isToday={sameDay(d, TODAY)}
                  isWeekend={d.getDay() === 0 || d.getDay() === 6}
                  compact={showWeekend}
                  {...dayProps}
                />
              )
            })}
          </div>
          {!showWeekend && (
            <WeekendColumnsStrip
              days={weekend} tasks={tasks}
              {...dayProps}
            />
          )}
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: sidePad }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: variant === 'quiet' ? 12 : 0 }}>
            {visibleDays.map(d => {
              const key = isoDate(d)
              return (
                <DayRow
                  key={key} date={d}
                  tasks={tasks[key] ?? []}
                  variant={variant}
                  isToday={sameDay(d, TODAY)}
                  isWeekend={d.getDay() === 0 || d.getDay() === 6}
                  {...dayProps}
                />
              )
            })}
          </div>
          {!showWeekend && (
            <WeekendStrip
              days={weekend} tasks={tasks} variant={variant}
              {...dayProps}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ---- ListView (Inbox / Someday) ----

interface ListViewProps {
  title: string
  subtitle: string
  bucket: string
  tasks: TaskMap
  accent: string
  onOpenTask: (task: Task) => void
  onAddTask: (bucketKey: string, title: string) => void
  onUpdateTask: (task: Task) => void
  onDeleteTask: (id: string) => void
}

export function ListView({
  title, subtitle, bucket, tasks, accent,
  onOpenTask, onAddTask, onUpdateTask, onDeleteTask,
}: ListViewProps) {
  const list = tasks[bucket] ?? []
  return (
    <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '36px 48px 120px', maxWidth: 720 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--ink-mute)', marginBottom: 6,
        }}>{subtitle}</div>
        <h1 style={{
          margin: 0, fontFamily: 'var(--font-display)',
          fontSize: 44, fontWeight: 400, fontStyle: 'italic',
          letterSpacing: '-0.02em', lineHeight: 1.0, color: 'var(--ink)',
        }}>{title}</h1>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {list.map(t => (
          <TaskRow key={t.id} task={t} accent={accent}
            onOpen={onOpenTask}
            onChange={onUpdateTask} onDelete={onDeleteTask}/>
        ))}
        <InlineAdd onAdd={title => onAddTask(bucket, title)} autofocus={list.length === 0}/>
      </div>
    </div>
  )
}
