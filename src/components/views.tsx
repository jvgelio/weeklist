import React, { useMemo, useState } from 'react'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { MONTH_PT, DAY_NAMES_PT, isoDate, sameDay, addDays } from '../lib/constants'
import type { Task, TaskMap, Variant } from '../lib/types'
import {
  DayRow, DayColumn,
  WeekendStrip, WeekendColumnsStrip,
  WeeklistStrip, WeeklistPanel,
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
    { id: 'quiet',   label: 'Lista'   },
    { id: 'columns', label: 'Colunas' },
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

function formatOverdueDate(bucketKey: string): string {
  const d = new Date(bucketKey + 'T00:00:00')
  return `${DAY_NAMES_PT[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`
}

interface OverdueDraggableTaskProps {
  task: Task
  onPullOne: (id: string) => void
}

function OverdueDraggableTask({ task, onPullOne }: OverdueDraggableTaskProps) {
  const { listeners, attributes, setNodeRef, transform, isDragging } = useDraggable({
    id: `overdue:${task.id}`,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 14px', fontSize: 13,
        borderBottom: '1px solid rgba(20,20,17,0.06)',
        background: isDragging ? 'rgba(20,20,17,0.04)' : undefined,
        opacity: isDragging ? 0.45 : 1,
        cursor: 'default',
        transform: transform
          ? `translate3d(${transform.x}px,${transform.y}px,0)`
          : undefined,
      }}
    >
      <span
        {...listeners}
        {...attributes}
        style={{
          color: 'var(--ink-faint)', fontSize: 11,
          cursor: 'grab', userSelect: 'none', flexShrink: 0,
        }}
      >
        ⋮⋮
      </span>
      <div style={{
        width: 14, height: 14, borderRadius: 4, flexShrink: 0,
        border: '1.5px solid rgba(20,20,17,0.2)',
      }} />
      <span style={{ flex: 1, color: 'var(--ink)' }}>{task.title}</span>
      <span style={{
        fontSize: 10, color: 'var(--prio-high)',
        background: 'rgba(214,59,42,0.08)',
        borderRadius: 4, padding: '1px 5px',
        flexShrink: 0,
      }}>
        {formatOverdueDate(task.bucketKey)}
      </span>
      <button
        onClick={() => onPullOne(task.id)}
        style={{
          fontSize: 10, fontWeight: 600, padding: '3px 8px',
          borderRadius: 6, background: 'rgba(20,20,17,0.08)',
          color: 'var(--ink-soft)', border: 'none', cursor: 'pointer',
          marginLeft: 4, flexShrink: 0, fontFamily: 'var(--font-body)',
        }}
      >
        ↑ hoje
      </button>
    </div>
  )
}

interface OverdueBannerProps {
  tasks: Task[]
  onPullOne: (id: string) => void
  onPullAll: () => void
}

function OverdueBanner({ tasks, onPullOne, onPullAll }: OverdueBannerProps) {
  const [expanded, setExpanded] = useState(false)

  if (tasks.length === 0) return null

  const preview = tasks.slice(0, 2).map(t => t.title).join(' · ') +
    (tasks.length > 2 ? ' · …' : '')

  return (
    <div style={{ marginBottom: 14 }}>
      {!expanded ? (
        // Estado colapsado
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, padding: '10px 14px',
          background: 'var(--bg-raised)', boxShadow: 'var(--ring)',
          borderRadius: 10, borderLeft: '3px solid var(--prio-high)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--prio-high)',
              flexShrink: 0,
            }}>
              atrasadas
            </span>
            <span style={{ fontSize: 13, fontWeight: 500, flexShrink: 0 }}>
              {tasks.length} tarefa{tasks.length > 1 ? 's' : ''}
            </span>
            <span style={{
              fontSize: 12, color: 'var(--ink-mute)', fontStyle: 'italic',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {preview}
            </span>
          </div>
          <button
            className="ghost-btn"
            onClick={() => setExpanded(true)}
            style={{ fontSize: 11, flexShrink: 0 }}
          >
            ▾ ver
          </button>
          <button className="pill-btn" onClick={onPullAll} style={{ fontSize: 11, padding: '6px 13px', flexShrink: 0 }}>
            ↑ Puxar todas
          </button>
        </div>
      ) : (
        // Estado expandido
        <div style={{
          background: 'var(--bg-raised)', boxShadow: 'var(--ring)',
          borderRadius: 10, borderLeft: '3px solid var(--prio-high)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px',
            borderBottom: '1px solid rgba(20,20,17,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--prio-high)',
              }}>
                atrasadas
              </span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>
                {tasks.length} tarefa{tasks.length > 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="ghost-btn"
                onClick={() => setExpanded(false)}
                style={{ fontSize: 11 }}
              >
                ▴ fechar
              </button>
              <button className="pill-btn" onClick={onPullAll} style={{ fontSize: 11, padding: '6px 13px' }}>
                ↑ Puxar todas
              </button>
            </div>
          </div>
          {tasks.map(task => (
            <OverdueDraggableTask key={task.id} task={task} onPullOne={onPullOne} />
          ))}
        </div>
      )}
    </div>
  )
}

interface WeekViewProps {
  weekStart: Date
  tasks: TaskMap
  variant: Variant
  showWeekend: boolean
  dark: boolean
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
  onToggleWeekend: () => void
  onToggleDark: () => void
  overdueTasks: Task[]
  onPullOneOverdue: (id: string) => void
  onPullAllOverdue: () => void
}

export function WeekView({
  weekStart, tasks, variant, showWeekend, dark,
  accent,
  onOpenTask, onAddTask, onUpdateTask, onDeleteTask, onMoveTask,
  onPrevWeek, onNextWeek, onToday,
  onChangeVariant, onToggleWeekend, onToggleDark,
  overdueTasks, onPullOneOverdue, onPullAllOverdue,
}: WeekViewProps) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const visibleDays = useMemo(
    () => days.filter((d) => d.getDay() !== 0 && d.getDay() !== 6),
    [days],
  )
  const weekend = useMemo(
    () => days.filter((d) => d.getDay() === 0 || d.getDay() === 6),
    [days],
  )

  const end = addDays(weekStart, 6)
  const sameMonth = weekStart.getMonth() === end.getMonth()
  const rangeLabel = sameMonth
    ? `${weekStart.getDate()}–${end.getDate()} ${MONTH_PT[weekStart.getMonth()]} ${end.getFullYear()}`
    : `${weekStart.getDate()} ${MONTH_PT[weekStart.getMonth()]} – ${end.getDate()} ${MONTH_PT[end.getMonth()]} ${end.getFullYear()}`

  const isColumns = variant === 'columns'
  const sidePad   = isColumns ? '0 24px 24px' : '0 32px 120px'

  const weeklistKey = `weeklist-${isoDate(weekStart)}`
  const weeklistTasks = useMemo(() => tasks[weeklistKey] ?? [], [tasks, weeklistKey])

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
        padding: isColumns ? '24px 24px 16px' : '24px 32px 16px',
        flexShrink: 0,
      }}>
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 20, marginBottom: 0,
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--ink-mute)', marginBottom: 5,
            }}>Semana</div>
            {isColumns ? (
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
            <button className="ghost-btn" onClick={onToggleWeekend} style={{ fontSize: 11, fontWeight: 600 }}>
              {showWeekend ? 'Ocultar FDS' : 'Mostrar FDS'}
            </button>
            <button className="ghost-btn" onClick={onToggleDark} style={{ fontSize: 11, fontWeight: 600 }}>
              {dark ? 'Claro' : 'Escuro'}
            </button>
            <span style={{ width: 1, height: 18, background: 'var(--line)', margin: '0 4px' }}/>
            <ViewModeToggle variant={variant} onChange={onChangeVariant}/>
          </div>
        </header>

        <OverdueBanner
          tasks={overdueTasks}
          onPullOne={onPullOneOverdue}
          onPullAll={onPullAllOverdue}
        />
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
                  isWeekend={false}
                  compact={false}
                  {...dayProps}
                />
              )
            })}
          </div>
          {showWeekend && (
            <WeekendColumnsStrip
              days={weekend} tasks={tasks}
              {...dayProps}
            />
          )}
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
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
                    isWeekend={false}
                    {...dayProps}
                  />
                )
              })}
            </div>
            {showWeekend && (
              <WeekendStrip
                days={weekend} tasks={tasks} variant={variant}
                {...dayProps}
              />
            )}
          </div>
          <WeeklistPanel bucketKey={weeklistKey} tasks={weeklistTasks} {...dayProps} />
        </div>
      )}
      {isColumns && (
        <WeeklistStrip bucketKey={weeklistKey} tasks={weeklistTasks} {...dayProps} />
      )}
    </div>
  )
}

// ---- WeekDayDropStrip (faixa de dias para inbox → semana) ----

interface WeekDayDropStripProps {
  weekStart: Date
}

function WeekDayDropStripDay({ date }: { date: Date }) {
  const key = isoDate(date)
  const { setNodeRef, isOver } = useDroppable({
    id: key,
    data: { type: 'zone', bucketKey: key, slot: 'am' },
  })
  const isToday = sameDay(date, new Date())
  const dayIdx = date.getDay()
  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '10px 8px',
        borderRadius: 10,
        background: isOver ? 'var(--accent-soft)' : 'var(--bg-sunken)',
        border: isOver ? '1.5px dashed var(--accent)' : '1.5px dashed transparent',
        transition: 'all 120ms ease',
        cursor: 'copy',
        minHeight: 60,
      }}
    >
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: isToday ? 'var(--accent)' : (isOver ? 'var(--accent)' : 'var(--ink-mute)'),
        marginBottom: 2,
      }}>
        {DAY_NAMES_PT[dayIdx]}
      </span>
      <span style={{
        fontSize: 13, fontWeight: 600,
        color: isToday ? 'var(--accent)' : 'var(--ink)',
      }}>
        {date.getDate()}
      </span>
    </div>
  )
}

function WeekDayDropStrip({ weekStart }: WeekDayDropStripProps) {
  const days = useMemo(
    () => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )
  return (
    <div style={{
      display: 'flex', gap: 6,
      padding: '12px 0 16px',
      borderBottom: '1px solid var(--line)',
      marginBottom: 16,
    }}>
      {days.map(d => <WeekDayDropStripDay key={isoDate(d)} date={d} />)}
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
  draggingTask?: Task | null
  weekStart?: Date
  onOpenTask: (task: Task) => void
  onAddTask: (bucketKey: string, title: string) => void
  onUpdateTask: (task: Task) => void
  onDeleteTask: (id: string) => void
}

export function ListView({
  title, subtitle, bucket, tasks, accent,
  draggingTask, weekStart,
  onOpenTask, onAddTask, onUpdateTask, onDeleteTask,
}: ListViewProps) {
  const list = useMemo(() => tasks[bucket] ?? [], [tasks, bucket])
  const { setNodeRef, isOver } = useDroppable({
    id: bucket,
    data: { type: 'zone', bucketKey: bucket, slot: null },
  })

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

      {/* Faixa de dias para arrastar inbox → semana */}
      {draggingTask && weekStart && (
        <WeekDayDropStrip weekStart={weekStart} />
      )}

      <div
        ref={setNodeRef}
        style={{
          display: 'flex', flexDirection: 'column', gap: 2,
          minHeight: 80,
          background: isOver ? 'var(--accent-soft)' : 'transparent',
          borderRadius: 12,
          transition: 'background 120ms ease',
          padding: isOver ? '4px' : 0,
        }}
      >
        <SortableContext items={list.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {list.map(t => (
            <TaskRow key={t.id} task={t} accent={accent}
              showDragHandle
              onOpen={onOpenTask}
              onChange={onUpdateTask} onDelete={onDeleteTask}/>
          ))}
        </SortableContext>
        <InlineAdd onAdd={t => onAddTask(bucket, t)} placeholder="Adicionar tarefa" />
      </div>
    </div>
  )
}
