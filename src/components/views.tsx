import React, { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { MONTH_PT, DAY_NAMES_PT, PRESET_COLORS, isoDate, sameDay, addDays, startOfWeek } from '../lib/constants'
import type { Task, TaskMap, Variant, Tag, SlotPrefs } from '../lib/types'
import {
  DayRow, DayColumn,
  WeekendStrip, WeekendColumnsStrip,
  WeeklistStrip, WeeklistPanel,
} from './day-row'
import { IconArrow, TaskRow, InlineAdd } from './task-components'
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from '../hooks/use-tags'

const TODAY = new Date()

// ---- DayNavBar ----

interface DayNavBarProps {
  days: Date[]
  showWeekend: boolean
  accent: string
}

function DayNavBar({ days, showWeekend, accent }: DayNavBarProps) {
  const visible = showWeekend ? days : days.filter(d => d.getDay() !== 0 && d.getDay() !== 6)
  
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 16,
      borderBottom: '1px solid var(--line)', paddingBottom: 12, marginBottom: 32,
      overflowX: 'auto', scrollbarWidth: 'none',
      position: 'sticky', top: 0, zIndex: 10,
      background: 'var(--bg)', paddingTop: 12,
    }}>
      {visible.map(d => {
        const isToday = sameDay(d, TODAY)
        return (
          <button
            key={isoDate(d)}
            onClick={() => {
              const el = document.getElementById(`day-${isoDate(d)}`)
              if (el) {
                // Smooth scroll to the element
                el.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 8px',
              minWidth: 44, borderRadius: 8,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-sunken)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: isToday ? accent : 'var(--ink-mute)',
            }}>
              {DAY_NAMES_PT[d.getDay()]}
            </span>
            <span style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: '50%',
              fontSize: 14, fontWeight: isToday ? 700 : 500,
              background: isToday ? accent : 'transparent',
              color: isToday ? '#fff' : 'var(--ink)',
            }}>
              {d.getDate()}
            </span>
          </button>
        )
      })}
    </div>
  )
}


// ---- ViewModeToggle ----

interface ViewModeToggleProps {
  variant: Variant
  onChange: (v: Variant) => void
}

export function ViewModeToggle({ variant, onChange }: ViewModeToggleProps) {
  const opts: { id: Variant; label: string }[] = [
    { id: 'columns', label: 'Colunas' },
    { id: 'quiet', label: 'Lista' },
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

const layoutVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.1 // Stagger columns
    }
  }
}

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
  dimPastDays: boolean
  dark: boolean
  accent: string
  onOpenTask: (task: Task) => void
  onAddTask: (bucketKey: string, title: string, slot: 'am' | 'pm' | 'eve') => void
  slotPrefs: SlotPrefs
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
  isMobile?: boolean
}

export function WeekView({
  weekStart, tasks, variant, showWeekend, dimPastDays, dark,
  accent,
  onOpenTask, onAddTask, onUpdateTask, onDeleteTask, onMoveTask,
  onPrevWeek, onNextWeek, onToday,
  onChangeVariant, onToggleWeekend, onToggleDark,
  overdueTasks, onPullOneOverdue, onPullAllOverdue,
  slotPrefs,
  isMobile = false,
}: WeekViewProps) {
  // Auto-scroll to today
  useEffect(() => {
    if (variant === 'quiet') {
      const todayEl = document.getElementById(`day-${isoDate(TODAY)}`)
      if (todayEl) {
        // Use a slight timeout to ensure render is complete
        setTimeout(() => {
          todayEl.scrollIntoView({ behavior: 'auto', block: 'start' })
        }, 50)
      }
    }
  }, [variant, weekStart])

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
  const sidePad = isMobile ? '0 16px 80px' : (isColumns ? '0 24px 24px' : '0 32px 120px')

  const weeklistKey = `weeklist-${isoDate(weekStart)}`
  const weeklistTasks = useMemo(() => tasks[weeklistKey] ?? [], [tasks, weeklistKey])

  const isCurrentWeek = sameDay(weekStart, startOfWeek(TODAY, 1))

  const dayProps = {
    accent,
    slotPrefs,
    dimPastDays,
    onOpenTask,
    onAddTask,
    onUpdateTask,
    onDeleteTask,
  }

  const renderHeader = () => (
    <div style={{
      padding: isMobile ? '64px 16px 12px' : (isColumns ? '24px 24px 16px' : '24px 32px 16px'),
      flexShrink: 0,
    }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 20, marginBottom: 0,
        flexWrap: 'nowrap',
      }}>
        {/* Title Area */}
        <div style={isMobile ? { flex: 1 } : (isColumns ? { flex: 1 } : { flex: 1, paddingLeft: 'max(0px, calc(50% - 400px))' })}>
          <div>
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--ink-mute)', marginBottom: 5,
            }}>Semana</div>
            <h1 style={{
              margin: 0,
              fontFamily: (isColumns && !isMobile) ? 'var(--font-display)' : 'inherit',
              fontSize: isMobile ? 18 : (isColumns ? 32 : 22),
              fontWeight: isMobile ? 600 : (isColumns ? 400 : 600),
              fontStyle: (isColumns && !isMobile) ? 'italic' : 'normal',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              color: 'var(--ink)',
              whiteSpace: 'nowrap',
            }}>
              {rangeLabel}
            </h1>
          </div>
        </div>

        {/* Toggles Area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button className="ghost-btn" onClick={onPrevWeek} title="Semana anterior (←)">
            <IconArrow dir="left" />
          </button>
          <button className="ghost-btn" onClick={onToday} style={{
            background: 'var(--bg-sunken)', fontWeight: 600, fontSize: 12,
          }}>
            Hoje
          </button>
          <button className="ghost-btn" onClick={onNextWeek} title="Próxima semana (→)">
            <IconArrow dir="right" />
          </button>
          {!isMobile && (
            <>
              <span style={{ width: 1, height: 18, background: 'var(--line)', margin: '0 4px' }} />
              <button className="ghost-btn" onClick={onToggleWeekend} style={{ fontSize: 11, fontWeight: 600 }}>
                {showWeekend ? 'Ocultar FDS' : 'Mostrar FDS'}
              </button>
              <span style={{ width: 1, height: 18, background: 'var(--line)', margin: '0 4px' }} />
              <ViewModeToggle variant={variant} onChange={onChangeVariant} />
            </>
          )}
        </div>
      </header>

      {isCurrentWeek && (
        <div style={isColumns ? {} : { width: '100%', maxWidth: 800, margin: '14px auto 0' }}>
          <OverdueBanner
            tasks={overdueTasks}
            onPullOne={onPullOneOverdue}
            onPullAll={onPullAllOverdue}
          />
        </div>
      )}
    </div>
  )

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={layoutVariants}
      style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      {isColumns ? (
        <>
          {renderHeader()}
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
          <WeeklistStrip bucketKey={weeklistKey} tasks={weeklistTasks} {...dayProps} />
        </>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {renderHeader()}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: sidePad }} id="list-scroll-container">
              <DayNavBar days={days} showWeekend={showWeekend} accent={accent} />
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: variant === 'quiet' ? 12 : 0,
                maxWidth: 800,
                margin: '0 auto',
              }}>
                
                {visibleDays.map(d => {
                  const key = isoDate(d)
                  return (
                    <div key={key} id={`day-${key}`} style={{ scrollMarginTop: 80 }}>
                      <DayRow
                        date={d}
                        tasks={tasks[key] ?? []}
                        variant={variant}
                        isToday={sameDay(d, TODAY)}
                        isWeekend={false}
                        {...dayProps}
                      />
                    </div>
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
          </div>
          <WeeklistPanel bucketKey={weeklistKey} tasks={weeklistTasks} {...dayProps} />
        </div>
      )}
    </motion.div>
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
    <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '36px 48px 120px', maxWidth: 800, margin: '0 auto' }}>
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
              onChange={onUpdateTask} onDelete={onDeleteTask} />
          ))}
        </SortableContext>
        <InlineAdd onAdd={t => onAddTask(bucket, t)} placeholder="Adicionar tarefa" />
      </div>
    </div>
  )
}

// ---- TagsView ----

function ColorDot({ color, selected, onClick }: { color: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 20, height: 20, borderRadius: '50%',
        background: color, border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
        boxShadow: selected ? `0 0 0 2px var(--bg-raised), 0 0 0 4px ${color}` : 'none',
        transition: 'box-shadow 120ms ease',
      }}
    />
  )
}

function TagRowIdle({ tag, onEdit, onDelete }: { tag: Tag; onEdit: () => void; onDelete: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 0', borderBottom: '1px solid var(--line)',
    }}>
      <span style={{ width: 12, height: 12, borderRadius: '50%', background: tag.color, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 14, color: 'var(--ink)' }}>{tag.name}</span>
      <span style={{ fontSize: 12, color: 'var(--ink-mute)', marginRight: 4 }}>
        {tag.task_count > 0 ? `${tag.task_count} tarefa${tag.task_count !== 1 ? 's' : ''}` : ''}
      </span>
      <button className="ghost-btn" onClick={onEdit} style={{ fontSize: 12, padding: '3px 8px' }}>Editar</button>
      <button className="ghost-btn" onClick={onDelete} style={{ fontSize: 12, padding: '3px 8px', color: 'var(--prio-high)' }}>Excluir</button>
    </div>
  )
}

function TagRowEditing({ tag, onDone }: { tag: Tag; onDone: () => void }) {
  const [name, setName] = useState(tag.name)
  const [color, setColor] = useState(tag.color)
  const updateTag = useUpdateTag()

  function save() {
    if (!name.trim()) return
    updateTag.mutate({ id: tag.id, data: { name: name.trim(), color } })
    onDone()
  }

  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onDone() }}
          style={{
            flex: 1, border: '1px solid var(--line-strong)', borderRadius: 6,
            padding: '4px 8px', fontSize: 14, background: 'var(--bg-sunken)',
            color: 'var(--ink)', outline: 'none',
          }}
        />
        <button className="pill-btn" onClick={save} style={{ fontSize: 12, padding: '4px 12px' }}>Salvar</button>
        <button className="ghost-btn" onClick={onDone} style={{ fontSize: 12 }}>Cancelar</button>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingLeft: 20 }}>
        {PRESET_COLORS.map((c) => (
          <ColorDot key={c} color={c} selected={color === c} onClick={() => setColor(c)} />
        ))}
      </div>
    </div>
  )
}

function TagRowDelete({ tag, onCancel }: { tag: Tag; onCancel: () => void }) {
  const deleteTag = useDeleteTag()
  return (
    <div style={{
      padding: '10px 12px', borderBottom: '1px solid var(--line)',
      background: 'rgba(239,68,68,0.06)', borderRadius: 8,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}>
        Excluir <strong>{tag.name}</strong>?
        {tag.task_count > 0 && (
          <span style={{ color: 'var(--ink-mute)' }}>
            {' '}Tag removida de {tag.task_count} tarefa{tag.task_count !== 1 ? 's' : ''}.
          </span>
        )}
      </span>
      <button
        className="ghost-btn"
        onClick={() => { deleteTag.mutate(tag.id); onCancel() }}
        style={{ fontSize: 12, color: 'var(--prio-high)', padding: '3px 8px' }}
      >
        Confirmar
      </button>
      <button className="ghost-btn" onClick={onCancel} style={{ fontSize: 12, padding: '3px 8px' }}>Cancelar</button>
    </div>
  )
}

function NewTagRow({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const createTag = useCreateTag()

  function save() {
    if (!name.trim()) return
    createTag.mutate({ name: name.trim(), color })
    onDone()
  }

  return (
    <div style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <input
          autoFocus
          value={name}
          placeholder="Nome da tag..."
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onDone() }}
          style={{
            flex: 1, border: '1px solid var(--line-strong)', borderRadius: 6,
            padding: '4px 8px', fontSize: 14, background: 'var(--bg-sunken)',
            color: 'var(--ink)', outline: 'none',
          }}
        />
        <button className="pill-btn" onClick={save} style={{ fontSize: 12, padding: '4px 12px' }}>Criar</button>
        <button className="ghost-btn" onClick={onDone} style={{ fontSize: 12 }}>Cancelar</button>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingLeft: 20 }}>
        {PRESET_COLORS.map((c) => (
          <ColorDot key={c} color={c} selected={color === c} onClick={() => setColor(c)} />
        ))}
      </div>
    </div>
  )
}

export function TagsView() {
  const { data: allTags = [] } = useTags()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  return (
    <div style={{ padding: '32px 24px', maxWidth: 560, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 400, color: 'var(--ink)' }}>
          Tags
        </h2>
        {!adding && (
          <button className="pill-btn" onClick={() => { setAdding(true); setEditingId(null); setDeletingId(null) }} style={{ fontSize: 13 }}>
            + Nova tag
          </button>
        )}
      </div>

      {adding && <NewTagRow onDone={() => setAdding(false)} />}

      {allTags.map((tag) => {
        if (deletingId === tag.id) {
          return <TagRowDelete key={tag.id} tag={tag} onCancel={() => setDeletingId(null)} />
        }
        if (editingId === tag.id) {
          return <TagRowEditing key={tag.id} tag={tag} onDone={() => setEditingId(null)} />
        }
        return (
          <TagRowIdle
            key={tag.id}
            tag={tag}
            onEdit={() => { setEditingId(tag.id); setDeletingId(null); setAdding(false) }}
            onDelete={() => { setDeletingId(tag.id); setEditingId(null); setAdding(false) }}
          />
        )
      })}

      {allTags.length === 0 && !adding && (
        <p style={{ color: 'var(--ink-mute)', fontSize: 14, textAlign: 'center', marginTop: 48 }}>
          Nenhuma tag ainda.
        </p>
      )}
    </div>
  )
}

// ---- SettingsView ----

interface SettingsViewProps {
  user: any
  dark: boolean
  showWeekend: boolean
  dimPastDays: boolean
  slotPrefs: SlotPrefs
  onToggleDark: () => void
  onToggleWeekend: () => void
  onToggleDimPastDays: () => void
}

export function SettingsView({
  user, dark, showWeekend, dimPastDays, slotPrefs,
  onToggleDark, onToggleWeekend, onToggleDimPastDays
}: SettingsViewProps) {
  return (
    <div style={{ padding: '32px 24px', maxWidth: 560, margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 24px', fontSize: 22, fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 400, color: 'var(--ink)' }}>
        Configurações
      </h2>
      <p style={{ color: 'var(--ink-mute)' }}>Placeholder para configurações.</p>
    </div>
  )
}
