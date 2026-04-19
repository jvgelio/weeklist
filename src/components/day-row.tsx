import React, { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { DAY_NAMES_PT, DAY_NAMES_LONG_PT, MONTH_PT, isoDate, sameDay } from '../lib/constants'
import type { Task } from '../lib/types'
import { TaskRow, InlineAdd, LunchDivider, IconSun } from './task-components'

// ---- DayRow (manifesto + quiet variants) ----

interface DayRowProps {
  date: Date
  tasks: Task[]
  variant?: 'manifesto' | 'quiet'
  isToday: boolean
  isWeekend: boolean
  compact?: boolean
  accent?: string
  onOpenTask: (task: Task) => void
  onAddTask: (bucketKey: string, title: string, slot: 'am' | 'pm') => void
  onUpdateTask: (task: Task) => void
  onDeleteTask: (id: string) => void
}

export function DayRow({
  date, tasks, variant = 'manifesto', isToday, isWeekend, compact = false,
  accent,
  onOpenTask, onAddTask, onUpdateTask, onDeleteTask,
}: DayRowProps) {
  const key = isoDate(date)
  const { setNodeRef, isOver } = useDroppable({ id: key })

  const dayIdx  = date.getDay()
  const dayName = DAY_NAMES_LONG_PT[dayIdx]
  const dayNum  = date.getDate()

  const amTasks = tasks.filter(t => t.slot !== 'pm')
  const pmTasks = tasks.filter(t => t.slot === 'pm')
  const completed = tasks.filter(t => t.done).length
  const total     = tasks.length
  const allDone   = total > 0 && completed === total

  const taskProps = {
    accent,
    onOpen: onOpenTask,
    onChange: onUpdateTask,
    onDelete: onDeleteTask,
  }

  /* ---- Manifesto ---- */
  if (variant === 'manifesto') {
    return (
      <section
        ref={setNodeRef}
        style={{
          display: 'grid',
          gridTemplateColumns: compact ? '140px 1fr' : '180px 1fr',
          gap: compact ? 16 : 32,
          padding: compact ? '20px 0' : '28px 0',
          borderTop: '1px solid var(--line)',
          background: isOver ? 'var(--accent-soft)' : 'transparent',
          borderRadius: isOver ? 12 : 0,
          transition: 'background 120ms ease',
        }}
      >
        {/* Day label */}
        <div style={{ paddingTop: 2 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: compact ? 38 : 52,
            fontWeight: 400, fontStyle: 'italic',
            lineHeight: 0.95, letterSpacing: '-0.015em',
            color: isWeekend && !isToday ? 'var(--ink-mute)' : 'var(--ink)',
          }}>
            {dayName.toLowerCase()}
          </div>
          <div style={{
            marginTop: 10, display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 11, fontWeight: 500, color: 'var(--ink-mute)',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)' }}>
              {String(dayNum).padStart(2, '0')}·{MONTH_PT[date.getMonth()]}
            </span>
            {total > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 500,
                color: allDone ? 'var(--accent)' : 'var(--ink-mute)',
                fontFamily: 'var(--font-mono)',
              }}>
                {completed}/{total}
              </span>
            )}
            {isToday && (
              <span style={{
                fontSize: 9, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.12em',
                color: 'var(--accent)',
                borderTop: '1px solid var(--accent)',
                borderBottom: '1px solid var(--accent)',
                padding: '1px 6px',
              }}>hoje</span>
            )}
          </div>
        </div>

        {/* Tasks (am + lunch divider + pm) */}
        <div style={{ display: 'flex', flexDirection: 'column', paddingRight: 8 }}>
          <SortableContext items={amTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {amTasks.map(t => <TaskRow key={t.id} task={t} {...taskProps}/>)}
              <InlineAdd onAdd={title => onAddTask(key, title, 'am')} placeholder={amTasks.length === 0 ? 'Manhã…' : '+'}/>
            </div>
          </SortableContext>
          <LunchDivider/>
          <SortableContext items={pmTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {pmTasks.map(t => <TaskRow key={t.id} task={t} {...taskProps}/>)}
              <InlineAdd onAdd={title => onAddTask(key, title, 'pm')} placeholder={pmTasks.length === 0 ? 'Tarde…' : '+'}/>
            </div>
          </SortableContext>
        </div>
      </section>
    )
  }

  /* ---- Quiet (TeuxDeux) ---- */
  return (
    <section
      ref={setNodeRef}
      style={{
        padding: '14px 16px',
        borderRadius: 14,
        background: isToday ? 'var(--bg-raised)' : 'transparent',
        boxShadow: isToday ? 'var(--ring)' : 'none',
        border: isOver ? `1.5px solid ${accent}` : '1.5px solid transparent',
        transition: 'background 120ms ease, border 120ms ease',
      }}
    >
      {/* Day header */}
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10,
        paddingBottom: 8, borderBottom: '1px solid var(--line)',
      }}>
        <span style={{
          fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em',
          color: isWeekend && !isToday ? 'var(--ink-mute)' : 'var(--ink)',
        }}>
          {dayName}
        </span>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-mute)' }}>
          {dayNum} {MONTH_PT[date.getMonth()]}
        </span>
        {isToday && (
          <span style={{
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.1em', color: accent,
            borderBottom: `1.5px solid ${accent}`, paddingBottom: 1,
          }}>hoje</span>
        )}
        <span style={{ flex: 1 }}/>
        {total > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 500, color: 'var(--ink-mute)',
            fontFamily: 'var(--font-mono)',
          }}>
            {completed}/{total}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <SortableContext items={amTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {amTasks.map(t => <TaskRow key={t.id} task={t} compact {...taskProps}/>)}
            <InlineAdd compact onAdd={title => onAddTask(key, title, 'am')} placeholder={amTasks.length === 0 ? 'Manhã…' : '+'}/>
          </div>
        </SortableContext>
        <LunchDivider/>
        <SortableContext items={pmTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {pmTasks.map(t => <TaskRow key={t.id} task={t} compact {...taskProps}/>)}
            <InlineAdd compact onAdd={title => onAddTask(key, title, 'pm')} placeholder={pmTasks.length === 0 ? 'Tarde…' : '+'}/>
          </div>
        </SortableContext>
      </div>
    </section>
  )
}

// ---- DayColumn (columns/kanban variant) ----

interface DayColumnProps {
  date: Date
  tasks: Task[]
  isToday: boolean
  isWeekend?: boolean
  compact?: boolean
  accent?: string
  onOpenTask: (task: Task) => void
  onAddTask: (bucketKey: string, title: string, slot: 'am' | 'pm') => void
  onUpdateTask: (task: Task) => void
  onDeleteTask: (id: string) => void
}

export function DayColumn({
  date, tasks, isToday, isWeekend = false, compact = false,
  accent,
  onOpenTask, onAddTask, onUpdateTask, onDeleteTask,
}: DayColumnProps) {
  const key = isoDate(date)
  const { setNodeRef, isOver } = useDroppable({ id: key })

  const dayIdx   = date.getDay()
  const dayShort = DAY_NAMES_PT[dayIdx]
  const dayNum   = date.getDate()

  const amTasks = tasks.filter(t => t.slot !== 'pm')
  const pmTasks = tasks.filter(t => t.slot === 'pm')
  const completed = tasks.filter(t => t.done).length
  const total     = tasks.length

  const taskProps = {
    accent,
    compact: true,
    showDragHandle: false,
    onOpen: onOpenTask,
    onChange: onUpdateTask,
    onDelete: onDeleteTask,
  }

  return (
    <section
      ref={setNodeRef}
      style={{
        flex: compact ? '0 0 200px' : '1 1 0',
        minWidth: compact ? 200 : 170,
        display: 'flex', flexDirection: 'column',
        background: isToday ? 'var(--bg-raised)' : 'var(--bg-sunken)',
        borderRadius: 14,
        boxShadow: isToday ? 'var(--ring-strong)' : 'var(--ring)',
        border: isOver ? `1.5px solid ${accent}` : '1.5px solid transparent',
        transition: 'border 120ms ease',
        overflow: 'hidden',
        opacity: isWeekend && !isToday ? 0.88 : 1,
      }}
    >
      {/* Column header */}
      <div style={{
        padding: '10px 12px 8px',
        borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'baseline', gap: 8,
        background: isToday ? 'var(--bg-raised)' : 'transparent',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18, fontWeight: 400, fontStyle: 'italic',
          letterSpacing: '-0.01em',
          color: isToday ? (accent ?? 'var(--accent)') : 'var(--ink)',
        }}>
          {dayShort.toLowerCase()}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 500, color: 'var(--ink-mute)',
          fontFamily: 'var(--font-mono)',
        }}>
          {String(dayNum).padStart(2, '0')}
        </span>
        <span style={{ flex: 1 }}/>
        {total > 0 && (
          <span style={{
            fontSize: 9, fontWeight: 500,
            color: completed === total ? (accent ?? 'var(--accent)') : 'var(--ink-mute)',
            fontFamily: 'var(--font-mono)',
          }}>
            {completed}/{total}
          </span>
        )}
      </div>

      {/* Column content */}
      <div style={{
        flex: 1, padding: '6px 6px 4px',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto', minHeight: 100,
      }}>
        <SortableContext items={amTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {amTasks.map(t => (
            <div key={t.id} style={{ background: 'var(--bg)', borderRadius: 8, padding: 1, boxShadow: 'var(--ring)', marginBottom: 3 }}>
              <TaskRow task={t} {...taskProps}/>
            </div>
          ))}
        </SortableContext>
        <InlineAdd compact onAdd={title => onAddTask(key, title, 'am')} placeholder="+ manhã"/>

        <div style={{ margin: '4px 4px', height: 1, background: 'var(--line)' }}/>
        <div style={{
          fontSize: 8, fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--ink-faint)',
          padding: '0 4px 3px', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <IconSun size={8}/> tarde
        </div>

        <SortableContext items={pmTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {pmTasks.map(t => (
            <div key={t.id} style={{ background: 'var(--bg)', borderRadius: 8, padding: 1, boxShadow: 'var(--ring)', marginBottom: 3 }}>
              <TaskRow task={t} {...taskProps}/>
            </div>
          ))}
        </SortableContext>
        <InlineAdd compact onAdd={title => onAddTask(key, title, 'pm')} placeholder="+ tarde"/>
      </div>
    </section>
  )
}

// ---- WeekendStrip (row variants) ----

interface WeekendStripProps {
  days: Date[]
  tasks: Record<string, Task[]>
  variant: 'manifesto' | 'quiet'
  accent?: string
  onOpenTask: (task: Task) => void
  onAddTask: (bucketKey: string, title: string, slot: 'am' | 'pm') => void
  onUpdateTask: (task: Task) => void
  onDeleteTask: (id: string) => void
}

export function WeekendStrip({
  days, tasks, variant, accent,
  onOpenTask, onAddTask, onUpdateTask, onDeleteTask,
}: WeekendStripProps) {
  const [expanded, setExpanded] = useState(false)
  const totalTasks = days.reduce((sum, d) => sum + (tasks[isoDate(d)]?.length ?? 0), 0)

  return (
    <div style={{
      marginTop: variant === 'manifesto' ? 32 : 16,
      borderTop: '1px dashed var(--line-strong)',
      paddingTop: 16,
    }}>
      <button onClick={() => setExpanded(e => !e)} className="ghost-btn" style={{
        fontSize: 12, fontWeight: 600, color: 'var(--ink-mute)',
        padding: '4px 10px', marginBottom: 12,
      }}>
        ▸ Fim de semana · {totalTasks} {totalTasks === 1 ? 'tarefa' : 'tarefas'}
      </button>
      {expanded && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {days.map(d => {
            const key = isoDate(d)
            const dayTasks = tasks[key] ?? []
            const amTasks = dayTasks.filter(t => t.slot !== 'pm')
            const pmTasks = dayTasks.filter(t => t.slot === 'pm')
            return (
              <WeekendDayCell
                key={key}
                date={d}
                amTasks={amTasks}
                pmTasks={pmTasks}
                accent={accent}
                onOpenTask={onOpenTask}
                onAddTask={onAddTask}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---- WeekendColumnsStrip (columns variant) ----

interface WeekendColumnsStripProps {
  days: Date[]
  tasks: Record<string, Task[]>
  accent?: string
  onOpenTask: (task: Task) => void
  onAddTask: (bucketKey: string, title: string, slot: 'am' | 'pm') => void
  onUpdateTask: (task: Task) => void
  onDeleteTask: (id: string) => void
}

export function WeekendColumnsStrip({
  days, tasks, accent,
  onOpenTask, onAddTask, onUpdateTask, onDeleteTask,
}: WeekendColumnsStripProps) {
  const [expanded, setExpanded] = useState(false)
  const totalTasks = days.reduce((sum, d) => sum + (tasks[isoDate(d)]?.length ?? 0), 0)

  return (
    <div style={{ flexShrink: 0 }}>
      <button onClick={() => setExpanded(e => !e)} className="ghost-btn"
        style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-mute)', padding: '4px 10px', marginBottom: 6 }}>
        ▸ Fim de semana · {totalTasks} {totalTasks === 1 ? 'tarefa' : 'tarefas'}
      </button>
      {expanded && (
        <div style={{ display: 'flex', gap: 10, height: 200 }}>
          {days.map(d => (
            <DayColumn
              key={isoDate(d)}
              date={d}
              tasks={tasks[isoDate(d)] ?? []}
              isToday={sameDay(d, new Date())}
              isWeekend
              compact
              accent={accent}
              onOpenTask={onOpenTask}
              onAddTask={onAddTask}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ---- WeekendDayCell (internal, used by WeekendStrip) ----

interface WeekendDayCellProps {
  date: Date
  amTasks: Task[]
  pmTasks: Task[]
  accent?: string
  onOpenTask: (task: Task) => void
  onAddTask: (bucketKey: string, title: string, slot: 'am' | 'pm') => void
  onUpdateTask: (task: Task) => void
  onDeleteTask: (id: string) => void
}

function WeekendDayCell({
  date, amTasks, pmTasks, accent,
  onOpenTask, onAddTask, onUpdateTask, onDeleteTask,
}: WeekendDayCellProps) {
  const key = isoDate(date)
  const { setNodeRef, isOver } = useDroppable({ id: key })

  const taskProps = {
    accent,
    compact: true as const,
    onOpen: onOpenTask,
    onChange: onUpdateTask,
    onDelete: onDeleteTask,
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        padding: '14px 16px', borderRadius: 14,
        background: isOver ? 'var(--accent-soft)' : 'var(--bg-sunken)',
        transition: 'background 120ms ease',
      }}
    >
      <div style={{
        fontSize: 14, fontWeight: 600, color: 'var(--ink-soft)',
        marginBottom: 8, display: 'flex', alignItems: 'baseline', gap: 8,
      }}>
        {DAY_NAMES_LONG_PT[date.getDay()]}
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-mute)' }}>
          {date.getDate()} {MONTH_PT[date.getMonth()]}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <SortableContext items={amTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {amTasks.map(t => <TaskRow key={t.id} task={t} {...taskProps}/>)}
            <InlineAdd compact onAdd={title => onAddTask(key, title, 'am')} placeholder="+ manhã"/>
          </div>
        </SortableContext>
        <LunchDivider/>
        <SortableContext items={pmTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {pmTasks.map(t => <TaskRow key={t.id} task={t} {...taskProps}/>)}
            <InlineAdd compact onAdd={title => onAddTask(key, title, 'pm')} placeholder="+ tarde"/>
          </div>
        </SortableContext>
      </div>
    </div>
  )
}
