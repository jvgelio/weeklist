import React, { useMemo, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { DAY_NAMES_PT, DAY_NAMES_LONG_PT, MONTH_PT, isoDate, sameDay } from '../lib/constants'
import type { Task } from '../lib/types'
import { TaskRow, InlineAdd, LunchDivider, IconSun } from './task-components'

// ---- DayRow (manifesto + quiet variants) ----

interface DayRowProps {
  date: Date
  tasks: Task[]
  variant?: 'quiet'
  isToday: boolean
  isWeekend: boolean
  compact?: boolean
  accent?: string
  onOpenTask: (task: Task) => void
  onAddTask: (bucketKey: string, title: string, slot: 'am' | 'pm') => void
  onUpdateTask: (task: Task) => void
  onDeleteTask: (id: string) => void
}

function DayRowComponent({
  date, tasks, variant = 'quiet', isToday, isWeekend, compact = false,
  accent,
  onOpenTask, onAddTask, onUpdateTask, onDeleteTask,
}: DayRowProps) {
  const key = isoDate(date)
  
  // Separate droppables for AM and PM
  const { setNodeRef: setAmRef, isOver: isOverAm } = useDroppable({ id: `${key}:am` })
  const { setNodeRef: setPmRef, isOver: isOverPm } = useDroppable({ id: `${key}:pm` })

  const dayIdx  = date.getDay()
  const dayName = DAY_NAMES_LONG_PT[dayIdx]
  const dayNum  = date.getDate()

  const amTasks = useMemo(() => tasks.filter((t) => t.slot !== 'pm'), [tasks])
  const pmTasks = useMemo(() => tasks.filter((t) => t.slot === 'pm'), [tasks])
  const completed = useMemo(() => tasks.filter((t) => t.done).length, [tasks])
  const total = tasks.length

  const taskProps = {
    accent,
    onOpen: onOpenTask,
    onChange: onUpdateTask,
    onDelete: onDeleteTask,
  }

  /* ---- Quiet (TeuxDeux) ---- */
  return (
    <section
      style={{
        padding: '14px 16px',
        borderRadius: 14,
        background: isToday ? 'var(--bg-raised)' : 'transparent',
        boxShadow: isToday ? 'var(--ring)' : 'none',
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
        <div ref={setAmRef} style={{ background: isOverAm ? 'var(--accent-soft)' : 'transparent', borderRadius: 8, transition: 'background 120ms' }}>
          <SortableContext items={amTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {amTasks.map(t => <TaskRow key={t.id} task={t} compact {...taskProps}/>)}
              <InlineAdd compact onAdd={title => onAddTask(key, title, 'am')} placeholder={amTasks.length === 0 ? 'Manhã…' : '+'}/>
            </div>
          </SortableContext>
        </div>
        
        <LunchDivider/>
        
        <div ref={setPmRef} style={{ background: isOverPm ? 'var(--accent-soft)' : 'transparent', borderRadius: 8, transition: 'background 120ms' }}>
          <SortableContext items={pmTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {pmTasks.map(t => <TaskRow key={t.id} task={t} compact {...taskProps}/>)}
              <InlineAdd compact onAdd={title => onAddTask(key, title, 'pm')} placeholder={pmTasks.length === 0 ? 'Tarde…' : '+'}/>
            </div>
          </SortableContext>
        </div>
      </div>
    </section>
  )
}

export const DayRow = React.memo(DayRowComponent)

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

function DayColumnComponent({
  date, tasks, isToday, isWeekend = false, compact = false,
  accent,
  onOpenTask, onAddTask, onUpdateTask, onDeleteTask,
}: DayColumnProps) {
  const key = isoDate(date)
  
  // Separate droppables for AM and PM
  const { setNodeRef: setAmRef, isOver: isOverAm } = useDroppable({ id: `${key}:am` })
  const { setNodeRef: setPmRef, isOver: isOverPm } = useDroppable({ id: `${key}:pm` })

  const dayIdx   = date.getDay()
  const dayShort = DAY_NAMES_PT[dayIdx]
  const dayNum   = date.getDate()

  const amTasks = useMemo(() => tasks.filter((t) => t.slot !== 'pm'), [tasks])
  const pmTasks = useMemo(() => tasks.filter((t) => t.slot === 'pm'), [tasks])
  const completed = useMemo(() => tasks.filter((t) => t.done).length, [tasks])
  const total = tasks.length

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
      style={{
        flex: compact ? '0 0 240px' : '1 1 0',
        minWidth: compact ? 240 : 200,
        display: 'flex', flexDirection: 'column',
        background: isToday ? 'var(--bg-sunken)' : 'transparent',
        borderRadius: 0,
        boxShadow: 'none',
        borderRight: '1px dashed var(--line)',
        paddingRight: 16,
        marginRight: 16,
        transition: 'border 120ms ease, background 120ms ease',
        overflow: 'hidden',
        opacity: isWeekend && !isToday ? 0.88 : 1,
      }}
    >
      {/* Column header */}
      <div style={{
        padding: '10px 0px 14px',
        borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'baseline', gap: 8,
        background: 'transparent',
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
        flex: 1, padding: '12px 0 4px',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto', minHeight: 100, gap: 4,
      }}>
        <div ref={setAmRef} style={{ background: isOverAm ? 'var(--accent-soft)' : 'transparent', borderRadius: 8, transition: 'background 120ms', padding: '4px 0' }}>
          <SortableContext items={amTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {amTasks.map(t => <TaskRow key={t.id} task={t} {...taskProps}/>)}
          </SortableContext>
          <InlineAdd compact onAdd={title => onAddTask(key, title, 'am')} placeholder="+ manhã"/>
        </div>

        <div style={{ margin: '4px 4px', height: 1, background: 'var(--line)' }}/>
        
        <div ref={setPmRef} style={{ background: isOverPm ? 'var(--accent-soft)' : 'transparent', borderRadius: 8, transition: 'background 120ms', padding: '4px 0' }}>
          <div style={{
            fontSize: 8, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--ink-faint)',
            padding: '0 4px 3px', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <IconSun size={8}/> tarde
          </div>

          <SortableContext items={pmTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {pmTasks.map(t => <TaskRow key={t.id} task={t} {...taskProps}/>)}
          </SortableContext>
          <InlineAdd compact onAdd={title => onAddTask(key, title, 'pm')} placeholder="+ tarde"/>
        </div>
      </div>
    </section>
  )
}

export const DayColumn = React.memo(DayColumnComponent)

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
      marginTop: 16,
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
  
  // Separate droppables for AM and PM
  const { setNodeRef: setAmRef, isOver: isOverAm } = useDroppable({ id: `${key}:am` })
  const { setNodeRef: setPmRef, isOver: isOverPm } = useDroppable({ id: `${key}:pm` })

  const taskProps = {
    accent,
    compact: true as const,
    onOpen: onOpenTask,
    onChange: onUpdateTask,
    onDelete: onDeleteTask,
  }

  return (
    <div
      style={{
        padding: '14px 16px', borderRadius: 14,
        background: 'var(--bg-sunken)',
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
        <div ref={setAmRef} style={{ background: isOverAm ? 'var(--accent-soft)' : 'transparent', borderRadius: 8, transition: 'background 120ms' }}>
          <SortableContext items={amTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {amTasks.map(t => <TaskRow key={t.id} task={t} {...taskProps}/>)}
              <InlineAdd compact onAdd={title => onAddTask(key, title, 'am')} placeholder="+ manhã"/>
            </div>
          </SortableContext>
        </div>
        
        <LunchDivider/>
        
        <div ref={setPmRef} style={{ background: isOverPm ? 'var(--accent-soft)' : 'transparent', borderRadius: 8, transition: 'background 120ms' }}>
          <SortableContext items={pmTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {pmTasks.map(t => <TaskRow key={t.id} task={t} {...taskProps}/>)}
              <InlineAdd compact onAdd={title => onAddTask(key, title, 'pm')} placeholder="+ tarde"/>
            </div>
          </SortableContext>
        </div>
      </div>
    </div>
  )
}

// ---- Weeklist Components ----

interface WeeklistProps {
  bucketKey: string
  tasks: Task[]
  accent?: string
  onOpenTask: (task: Task) => void
  onAddTask: (bucketKey: string, title: string, slot: 'am' | 'pm') => void
  onUpdateTask: (task: Task) => void
  onDeleteTask: (id: string) => void
}

export function WeeklistStrip({ bucketKey, tasks, accent, onOpenTask, onAddTask, onUpdateTask, onDeleteTask }: WeeklistProps) {
  const { setNodeRef, isOver } = useDroppable({ id: bucketKey })
  const [expanded, setExpanded] = useState(false)
  const taskProps = { accent, compact: true, onOpen: onOpenTask, onChange: onUpdateTask, onDelete: onDeleteTask, showDragHandle: true }

  return (
    <div style={{ borderTop: '1px solid var(--line)', background: 'var(--bg-sunken)' }}>
      <button onClick={() => setExpanded(e => !e)} className="ghost-btn" style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '8px', fontSize: 11, fontWeight: 600, color: 'var(--ink-mute)', gap: 6,
      }}>
        <span>Weeklist</span>
        <span style={{
          background: 'var(--line)', padding: '1px 6px', borderRadius: 999, fontSize: 9,
        }}>{tasks.length}</span>
      </button>
      {expanded && (
        <div ref={setNodeRef} style={{
          padding: '16px 24px 24px', display: 'flex', flexWrap: 'wrap', gap: 16,
          background: isOver ? 'var(--accent-soft)' : 'transparent',
          minHeight: 100, transition: 'background 120ms ease',
        }}>
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map(t => (
              <TaskRow
                key={t.id}
                task={t}
                {...taskProps}
                style={{ flex: '1 1 200px', maxWidth: 300, background: 'var(--bg)', padding: 4, borderRadius: 8, boxShadow: 'var(--ring)' }}
              />
            ))}
          </SortableContext>
          <div style={{ flex: '1 1 200px', maxWidth: 300 }}>
            <InlineAdd compact onAdd={title => onAddTask(bucketKey, title, 'am')} placeholder="Adicionar a weeklist…" />
          </div>
        </div>
      )}
    </div>
  )
}

export function WeeklistPanel({ bucketKey, tasks, accent, onOpenTask, onAddTask, onUpdateTask, onDeleteTask }: WeeklistProps) {
  const { setNodeRef, isOver } = useDroppable({ id: bucketKey })
  const [expanded, setExpanded] = useState(true)
  const taskProps = { accent, compact: true, onOpen: onOpenTask, onChange: onUpdateTask, onDelete: onDeleteTask, showDragHandle: true }

  if (!expanded) {
    return (
      <div style={{ borderLeft: '1px solid var(--line)', background: 'var(--bg-sunken)', width: 40, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16 }}>
        <button onClick={() => setExpanded(true)} className="ghost-btn" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 11, fontWeight: 600, color: 'var(--ink-mute)', gap: 6, padding: '16px 8px' }}>
          Weeklist
          <span style={{ background: 'var(--line)', padding: '2px 6px', borderRadius: 999, fontSize: 9 }}>{tasks.length}</span>
        </button>
      </div>
    )
  }

  return (
    <div style={{
      width: 320, flexShrink: 0, borderLeft: '1px solid var(--line)', background: 'var(--bg-sunken)',
      display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Weeklist</div>
        <button onClick={() => setExpanded(false)} className="ghost-btn" style={{ padding: '4px', color: 'var(--ink-mute)' }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
      </div>
      <div ref={setNodeRef} style={{
        flex: 1, padding: '16px', overflowY: 'auto',
        background: isOver ? 'var(--accent-soft)' : 'transparent',
        transition: 'background 120ms ease',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(t => (
            <TaskRow
              key={t.id}
              task={t}
              {...taskProps}
              style={{ background: 'var(--bg)', padding: 4, borderRadius: 8, boxShadow: 'var(--ring)' }}
            />
          ))}
        </SortableContext>
        <InlineAdd compact onAdd={title => onAddTask(bucketKey, title, 'am')} placeholder="Adicionar a weeklist…" />
      </div>
    </div>
  )
}
