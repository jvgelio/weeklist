import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, rectSortingStrategy } from '@dnd-kit/sortable'
import { DAY_NAMES_PT, DAY_NAMES_LONG_PT, MONTH_PT, sameDay, isPastDay } from '../lib/constants'
import type { Task, SlotPrefs } from '../lib/types'
import { getDisplaySlot } from '../lib/slot-utils'
import { TaskRow, InlineAdd, LunchDivider, IconSun, IconMoon, IconEvening, IconChevron } from './task-components'

// Helper
function isoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

const columnVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.4,
      staggerChildren: 0.05 // Stagger tasks within the column
    }
  }
}

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
  onAddTask: (bucketKey: string, title: string, slot: 'am' | 'pm' | 'eve') => void
  onUpdateTask: (task: Task) => void
  onDeleteTask: (id: string) => void
  slotPrefs: SlotPrefs
  dimPastDays: boolean
}

function DayRowComponent({
  date, tasks, variant = 'quiet', isToday, isWeekend, compact = false,
  accent,
  onOpenTask, onAddTask, onUpdateTask, onDeleteTask, slotPrefs,
  dimPastDays,
}: DayRowProps) {
  const key = isoDate(date)

  const { setNodeRef: setAmRef, isOver: isOverAm } = useDroppable({ id: `${key}:am`, data: { type: 'zone', bucketKey: key, slot: 'am' } })
  const { setNodeRef: setPmRef, isOver: isOverPm } = useDroppable({ id: `${key}:pm`, data: { type: 'zone', bucketKey: key, slot: 'pm' } })
  const { setNodeRef: setEveRef, isOver: isOverEve } = useDroppable({ id: `${key}:eve`, data: { type: 'zone', bucketKey: key, slot: 'eve' } })

  const dayIdx = date.getDay()
  const dayName = DAY_NAMES_LONG_PT[dayIdx]
  const dayNum = date.getDate()

  const amTasks  = useMemo(() => tasks.filter(t => getDisplaySlot(t.slot, slotPrefs) === 'am'),  [tasks, slotPrefs])
  const pmTasks  = useMemo(() => tasks.filter(t => getDisplaySlot(t.slot, slotPrefs) === 'pm'),  [tasks, slotPrefs])
  const eveTasks = useMemo(() => tasks.filter(t => getDisplaySlot(t.slot, slotPrefs) === 'eve'), [tasks, slotPrefs])
  const flatTasks = useMemo(() => !slotPrefs.am && !slotPrefs.pm && !slotPrefs.eve ? tasks : [], [tasks, slotPrefs])
  const completed = useMemo(() => tasks.filter((t) => t.done).length, [tasks])
  const total = tasks.length
  const isPast = useMemo(() => isPastDay(date), [date])
  const shouldDim = dimPastDays && isPast

  const taskProps = {
    accent,
    onOpen: onOpenTask,
    onChange: onUpdateTask,
    onDelete: onDeleteTask,
  }

  /* ---- Quiet (TeuxDeux) ---- */
  return (
    <motion.section
      variants={columnVariants}
      style={{
        padding: '14px 16px',
        borderRadius: 14,
        background: isToday ? 'var(--bg-raised)' : (shouldDim ? 'var(--bg-sunken)' : 'transparent'),
        boxShadow: isToday ? 'var(--ring)' : 'none',
        transition: 'background 120ms ease, border 120ms ease',
      }}
    >
      <div style={{ opacity: shouldDim ? 0.8 : 1, transition: 'opacity 120ms ease' }}>
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
          <span style={{ flex: 1 }} />
          {total > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 500, color: 'var(--ink-mute)',
              fontFamily: 'var(--font-mono)',
            }}>
              {completed}/{total}
            </span>
          )}
        </div>

        <motion.div style={{ display: 'flex', flexDirection: 'column' }}>
          {flatTasks.length > 0 ? (
            <SortableContext items={flatTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {flatTasks.map(t => <TaskRow key={t.id} task={t} compact {...taskProps} />)}
                <InlineAdd compact onAdd={title => onAddTask(key, title, 'am')} placeholder="Adicionar tarefa" />
              </motion.div>
            </SortableContext>
          ) : (
            <motion.div>
              {slotPrefs.am && (
                <div ref={setAmRef} style={{
                  background: isOverAm ? 'var(--accent-soft)' : 'transparent',
                  border: isOverAm ? '1.5px dashed var(--accent)' : '1.5px dashed transparent',
                  borderRadius: 12, transition: 'all 120ms ease', minHeight: 60, padding: isOverAm ? '4px' : 0,
                }}>
                  <SortableContext items={amTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)', padding: '0 4px 3px', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <IconSun size={8} /> manhã
                      </div>
                      {amTasks.map(t => <TaskRow key={t.id} task={t} compact {...taskProps} />)}
                      <InlineAdd compact onAdd={title => onAddTask(key, title, 'am')} placeholder="Adicionar tarefa" />
                    </motion.div>
                  </SortableContext>
                </div>
              )}

              {slotPrefs.am && slotPrefs.pm && <LunchDivider />}
              {slotPrefs.am && !slotPrefs.pm && slotPrefs.eve && <LunchDivider />}

              {slotPrefs.pm && (
                <div ref={setPmRef} style={{
                  background: isOverPm ? 'var(--accent-soft)' : 'transparent',
                  border: isOverPm ? '1.5px dashed var(--accent)' : '1.5px dashed transparent',
                  borderRadius: 12, transition: 'all 120ms ease', minHeight: 60, padding: isOverPm ? '4px' : 0,
                }}>
                  <SortableContext items={pmTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)', padding: '0 4px 3px', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <IconMoon size={8} /> tarde
                      </div>
                      {pmTasks.map(t => <TaskRow key={t.id} task={t} compact {...taskProps} />)}
                      <InlineAdd compact onAdd={title => onAddTask(key, title, 'pm')} placeholder="Adicionar tarefa" />
                    </motion.div>
                  </SortableContext>
                </div>
              )}

              {(slotPrefs.pm || slotPrefs.am) && slotPrefs.eve && <LunchDivider />}

              {slotPrefs.eve && (
                <div ref={setEveRef} style={{
                  background: isOverEve ? 'var(--accent-soft)' : 'transparent',
                  border: isOverEve ? '1.5px dashed var(--accent)' : '1.5px dashed transparent',
                  borderRadius: 12, transition: 'all 120ms ease', minHeight: 60, padding: isOverEve ? '4px' : 0,
                }}>
                  <SortableContext items={eveTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)', padding: '0 4px 3px', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <IconEvening size={8} /> noite
                      </div>
                      {eveTasks.map(t => <TaskRow key={t.id} task={t} compact {...taskProps} />)}
                      <InlineAdd compact onAdd={title => onAddTask(key, title, 'eve')} placeholder="Adicionar tarefa" />
                    </motion.div>
                  </SortableContext>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.section>
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
  onAddTask: (bucketKey: string, title: string, slot: 'am' | 'pm' | 'eve') => void
  onUpdateTask: (task: Task) => void
  onDeleteTask: (id: string) => void
  slotPrefs: SlotPrefs
  dimPastDays: boolean
}

function DayColumnComponent({
  date, tasks, isToday, isWeekend = false, compact = false,
  accent,
  onOpenTask, onAddTask, onUpdateTask, onDeleteTask, slotPrefs,
  dimPastDays,
}: DayColumnProps) {
  const key = isoDate(date)

  const { setNodeRef: setAmRef, isOver: isOverAm } = useDroppable({ id: `${key}:am`, data: { type: 'zone', bucketKey: key, slot: 'am' } })
  const { setNodeRef: setPmRef, isOver: isOverPm } = useDroppable({ id: `${key}:pm`, data: { type: 'zone', bucketKey: key, slot: 'pm' } })
  const { setNodeRef: setEveRef, isOver: isOverEve } = useDroppable({ id: `${key}:eve`, data: { type: 'zone', bucketKey: key, slot: 'eve' } })

  const dayIdx = date.getDay()
  const dayShort = DAY_NAMES_PT[dayIdx]
  const dayNum = date.getDate()

  const amTasks  = useMemo(() => tasks.filter(t => getDisplaySlot(t.slot, slotPrefs) === 'am'),  [tasks, slotPrefs])
  const pmTasks  = useMemo(() => tasks.filter(t => getDisplaySlot(t.slot, slotPrefs) === 'pm'),  [tasks, slotPrefs])
  const eveTasks = useMemo(() => tasks.filter(t => getDisplaySlot(t.slot, slotPrefs) === 'eve'), [tasks, slotPrefs])
  const completed = useMemo(() => tasks.filter((t) => t.done).length, [tasks])
  const total = tasks.length
  const isPast = useMemo(() => isPastDay(date), [date])
  const shouldDim = dimPastDays && isPast

  const pmFlexGrow = slotPrefs.eve ? '0 0 auto' : '1 0 auto'
  const eveFlexGrow = '1 0 auto'

  const taskProps = {
    accent,
    compact: true,
    showDragHandle: false,
    onOpen: onOpenTask,
    onChange: onUpdateTask,
    onDelete: onDeleteTask,
  }

  return (
    <motion.section
      variants={columnVariants}
      style={{
        flex: compact ? '0 0 240px' : '1 1 0',
        minWidth: compact ? 240 : 200,
        display: 'flex', flexDirection: 'column',
        background: shouldDim ? 'var(--bg-sunken)' : 'transparent',
        borderRadius: shouldDim ? 12 : 0,
        boxShadow: 'none',
        borderRight: '1px dashed var(--line)',
        padding: shouldDim ? '0 16px 0 8px' : '0 16px 0 0',
        marginRight: 16,
        transition: 'border 120ms ease, background 120ms ease',
        overflow: 'hidden',
      }}
    >
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        opacity: shouldDim ? 0.8 : (isWeekend && !isToday ? 0.88 : 1),
        transition: 'opacity 120ms ease',
      }}>
        {/* Column header */}
        <div style={{
          padding: '10px 0px 14px',
          borderBottom: isToday ? `2px solid ${accent ?? 'var(--accent)'}` : '1px solid var(--line)',
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
            fontSize: 10, fontWeight: 600,
            color: isToday ? 'var(--accent-ink)' : 'var(--ink-mute)',
            background: isToday ? (accent ?? 'var(--accent)') : 'transparent',
            padding: isToday ? '2px 6px' : '0',
            borderRadius: 999,
            fontFamily: 'var(--font-mono)',
          }}>
            {String(dayNum).padStart(2, '0')}
          </span>
          <span style={{ flex: 1 }} />
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
          flex: 1, padding: '12px 4px 4px',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto', minHeight: 100, gap: 4,
          background: 'transparent',
        }}>
          {slotPrefs.am && (
            <div ref={setAmRef} style={{
              background: isOverAm ? 'var(--accent-soft)' : 'transparent',
              border: isOverAm ? '1.5px dashed var(--accent)' : '1.5px dashed transparent',
              borderRadius: 12, transition: 'all 120ms ease',
              padding: '4px', minHeight: 'calc(50% - 2px)', flex: '0 0 auto',
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--color-am) 70%, var(--ink-soft))', padding: '0 0 3px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <IconSun size={8} /> manhã
              </div>
              <SortableContext items={amTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                  {amTasks.map(t => <TaskRow key={t.id} task={t} {...taskProps} />)}
                </motion.div>
              </SortableContext>
              <InlineAdd compact onAdd={title => onAddTask(key, title, 'am')} placeholder="Adicionar tarefa" />
            </div>
          )}

          {slotPrefs.am && slotPrefs.pm && <div style={{ margin: '8px 4px', borderTop: '1.2px dashed var(--line-strong)', opacity: 0.6 }} />}
          {slotPrefs.am && !slotPrefs.pm && slotPrefs.eve && <div style={{ margin: '8px 4px', borderTop: '1.2px dashed var(--line-strong)', opacity: 0.6 }} />}

          {slotPrefs.pm && (
            <div ref={setPmRef} style={{
              background: isOverPm ? 'var(--accent-soft)' : 'transparent',
              border: isOverPm ? '1.5px dashed var(--accent)' : '1.5px dashed transparent',
              borderRadius: 12, transition: 'all 120ms ease',
              padding: '4px', flex: pmFlexGrow,
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{
                fontSize: 8, fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'color-mix(in srgb, var(--color-pm) 70%, var(--ink-soft))',
                padding: '0 0 3px', display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <IconMoon size={8} /> tarde
              </div>
              <SortableContext items={pmTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                  {pmTasks.map(t => <TaskRow key={t.id} task={t} {...taskProps} />)}
                </motion.div>
              </SortableContext>
              <InlineAdd compact onAdd={title => onAddTask(key, title, 'pm')} placeholder="Adicionar tarefa" />
            </div>
          )}

          {(slotPrefs.pm || slotPrefs.am) && slotPrefs.eve && <div style={{ margin: '8px 4px', borderTop: '1.2px dashed var(--line-strong)', opacity: 0.6 }} />}

          {slotPrefs.eve && (
            <div ref={setEveRef} style={{
              background: isOverEve ? 'var(--accent-soft)' : 'transparent',
              border: isOverEve ? '1.5px dashed var(--accent)' : '1.5px dashed transparent',
              borderRadius: 12, transition: 'all 120ms ease',
              padding: '4px', flex: eveFlexGrow,
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{
                fontSize: 8, fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'var(--ink-faint)',
                padding: '0 0 3px', display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <IconEvening size={8} /> noite
              </div>
              <SortableContext items={eveTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                  {eveTasks.map(t => <TaskRow key={t.id} task={t} {...taskProps} />)}
                </motion.div>
              </SortableContext>
              <InlineAdd compact onAdd={title => onAddTask(key, title, 'eve')} placeholder="Adicionar tarefa" />
            </div>
          )}
        </div>
      </div>
    </motion.section>
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
  onAddTask: (bucketKey: string, title: string, slot: 'am' | 'pm' | 'eve') => void
  onUpdateTask: (task: Task) => void
  onDeleteTask: (id: string) => void
  slotPrefs: SlotPrefs
  dimPastDays: boolean
}

export function WeekendStrip({
  days, tasks, variant, accent,
  onOpenTask, onAddTask, onUpdateTask, onDeleteTask, slotPrefs,
  dimPastDays,
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
            return (
              <WeekendDayCell
                key={key}
                date={d}
                tasks={dayTasks}
                accent={accent}
                onOpenTask={onOpenTask}
                onAddTask={onAddTask}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
                slotPrefs={slotPrefs}
                dimPastDays={dimPastDays}
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
  onAddTask: (bucketKey: string, title: string, slot: 'am' | 'pm' | 'eve') => void
  onUpdateTask: (task: Task) => void
  onDeleteTask: (id: string) => void
  slotPrefs: SlotPrefs
  dimPastDays: boolean
}

export function WeekendColumnsStrip({
  days, tasks, accent,
  onOpenTask, onAddTask, onUpdateTask, onDeleteTask, slotPrefs,
  dimPastDays,
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
              slotPrefs={slotPrefs}
              dimPastDays={dimPastDays}
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
  tasks: Task[]
  accent?: string
  onOpenTask: (task: Task) => void
  onAddTask: (bucketKey: string, title: string, slot: 'am' | 'pm' | 'eve') => void
  onUpdateTask: (task: Task) => void
  onDeleteTask: (id: string) => void
  slotPrefs: SlotPrefs
  dimPastDays: boolean
}

function WeekendDayCell({
  date, tasks, accent,
  onOpenTask, onAddTask, onUpdateTask, onDeleteTask, slotPrefs,
  dimPastDays,
}: WeekendDayCellProps) {
  const key = isoDate(date)

  const { setNodeRef: setAmRef, isOver: isOverAm } = useDroppable({ id: `${key}:am`, data: { type: 'zone', bucketKey: key, slot: 'am' } })
  const { setNodeRef: setPmRef, isOver: isOverPm } = useDroppable({ id: `${key}:pm`, data: { type: 'zone', bucketKey: key, slot: 'pm' } })
  const { setNodeRef: setEveRef, isOver: isOverEve } = useDroppable({ id: `${key}:eve`, data: { type: 'zone', bucketKey: key, slot: 'eve' } })

  const amTasks  = useMemo(() => tasks.filter(t => getDisplaySlot(t.slot, slotPrefs) === 'am'),  [tasks, slotPrefs])
  const pmTasks  = useMemo(() => tasks.filter(t => getDisplaySlot(t.slot, slotPrefs) === 'pm'),  [tasks, slotPrefs])
  const eveTasks = useMemo(() => tasks.filter(t => getDisplaySlot(t.slot, slotPrefs) === 'eve'), [tasks, slotPrefs])
  const flatTasks = useMemo(() => !slotPrefs.am && !slotPrefs.pm && !slotPrefs.eve ? tasks : [], [tasks, slotPrefs])
  const isPast = useMemo(() => isPastDay(date), [date])
  const shouldDim = dimPastDays && isPast

  const taskProps = {
    accent,
    compact: true as const,
    onOpen: onOpenTask,
    onChange: onUpdateTask,
    onDelete: onDeleteTask,
  }

  return (
    <motion.div
      id={`day-${key}`}
      variants={columnVariants}
      style={{
        padding: '14px 16px', borderRadius: 14,
        background: shouldDim ? 'var(--bg-sunken)' : 'var(--bg-sunken)', // Mantém bg-sunken para fds, mas pode mudar se quiser
        opacity: shouldDim ? 0.8 : 1,
        transition: 'background 120ms ease, opacity 120ms ease',
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
        {flatTasks.length > 0 ? (
          <SortableContext items={flatTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {flatTasks.map(t => <TaskRow key={t.id} task={t} {...taskProps} />)}
              <InlineAdd compact onAdd={title => onAddTask(key, title, 'am')} placeholder="Adicionar tarefa" />
            </motion.div>
          </SortableContext>
        ) : (
          <>
            {slotPrefs.am && (
              <div ref={setAmRef} style={{ background: isOverAm ? 'var(--accent-soft)' : 'transparent', borderRadius: 8, transition: 'background 120ms', minHeight: 60 }}>
                <SortableContext items={amTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)', padding: '0 4px 3px', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IconSun size={8} /> manhã
                    </div>
                    {amTasks.map(t => <TaskRow key={t.id} task={t} {...taskProps} />)}
                    <InlineAdd compact onAdd={title => onAddTask(key, title, 'am')} placeholder="Adicionar tarefa" />
                  </motion.div>
                </SortableContext>
              </div>
            )}

            {slotPrefs.am && slotPrefs.pm && <LunchDivider />}
            {slotPrefs.am && !slotPrefs.pm && slotPrefs.eve && <LunchDivider />}

            {slotPrefs.pm && (
              <div ref={setPmRef} style={{ background: isOverPm ? 'var(--accent-soft)' : 'transparent', borderRadius: 8, transition: 'background 120ms', minHeight: 60 }}>
                <SortableContext items={pmTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)', padding: '0 4px 3px', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IconMoon size={8} /> tarde
                    </div>
                    {pmTasks.map(t => <TaskRow key={t.id} task={t} {...taskProps} />)}
                    <InlineAdd compact onAdd={title => onAddTask(key, title, 'pm')} placeholder="Adicionar tarefa" />
                  </motion.div>
                </SortableContext>
              </div>
            )}

            {(slotPrefs.pm || slotPrefs.am) && slotPrefs.eve && <LunchDivider />}

            {slotPrefs.eve && (
              <div ref={setEveRef} style={{ background: isOverEve ? 'var(--accent-soft)' : 'transparent', borderRadius: 8, transition: 'background 120ms', minHeight: 60 }}>
                <SortableContext items={eveTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)', padding: '0 4px 3px', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IconEvening size={8} /> noite
                    </div>
                    {eveTasks.map(t => <TaskRow key={t.id} task={t} {...taskProps} />)}
                    <InlineAdd compact onAdd={title => onAddTask(key, title, 'eve')} placeholder="Adicionar tarefa" />
                  </motion.div>
                </SortableContext>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  )
}

// ---- Weeklist Components ----

interface WeeklistProps {
  bucketKey: string
  tasks: Task[]
  accent?: string
  onOpenTask: (task: Task) => void
  onAddTask: (bucketKey: string, title: string, slot: 'am' | 'pm' | 'eve') => void
  onUpdateTask: (task: Task) => void
  onDeleteTask: (id: string) => void
}

export function WeeklistStrip({ bucketKey, tasks, accent, onOpenTask, onAddTask, onUpdateTask, onDeleteTask }: WeeklistProps) {
  const { setNodeRef, isOver } = useDroppable({ id: bucketKey, data: { type: 'zone', bucketKey, slot: null } })
  const [expanded, setExpanded] = useState(false)
  const taskProps = { accent, compact: true, onOpen: onOpenTask, onChange: onUpdateTask, onDelete: onDeleteTask, showDragHandle: false }

  return (
    <div style={{
      borderTop: '1px solid var(--line)',
      background: 'var(--bg-sunken)',
      transition: 'all 200ms ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px' }}>
        <button
          onClick={() => setExpanded(e => !e)}
          className="ghost-btn"
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '12px', fontSize: 13, fontWeight: 700, color: 'var(--ink-mute)', gap: 8,
            borderRadius: 0,
          }}
        >
          <IconChevron dir={expanded ? 'down' : 'up'} size={14} />
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Weeklist</span>
          <span style={{
            background: 'var(--line-strong)', padding: '1px 8px', borderRadius: 999, fontSize: 10,
            color: 'var(--ink)',
          }}>{tasks.length}</span>
        </button>
      </div>

      {expanded && (
        <div
          ref={setNodeRef}
          style={{
            padding: '0 24px 32px',
            background: isOver ? 'var(--accent-soft)' : 'transparent',
            minHeight: tasks.length === 0 ? 80 : 120,
            transition: 'background 120ms ease',
            display: tasks.length === 0 ? 'flex' : 'grid',
            alignItems: tasks.length === 0 ? 'center' : 'start',
            justifyContent: tasks.length === 0 ? 'center' : 'start',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
            maxHeight: '40vh',
            overflowY: 'auto',
          }}
        >
          {tasks.length === 0 ? (
            <div style={{ color: 'var(--ink-faint)', fontSize: 13, fontStyle: 'italic', textAlign: 'center' }}>
              Nenhuma tarefa na weeklist. Arraste algo para cá!
            </div>
          ) : (
            <SortableContext items={tasks.map(t => t.id)} strategy={rectSortingStrategy}>
              <motion.div style={{
                display: 'grid',
                gridTemplateColumns: 'inherit',
                gap: 'inherit',
                width: '100%',
                gridColumn: '1 / -1'
              }}>
                {tasks.map(t => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    {...taskProps}
                    style={{
                      background: 'var(--bg-raised)',
                      padding: '10px 12px',
                      borderRadius: 12,
                      boxShadow: '0 2px 8px -2px rgba(0,0,0,0.05), var(--ring)',
                      border: '1px solid var(--line)',
                    }}
                  />
                ))}
              </motion.div>
            </SortableContext>
          )}
          <div style={{ display: 'flex', alignItems: 'flex-start', padding: '4px' }}>
            <InlineAdd
              compact
              onAdd={title => onAddTask(bucketKey, title, 'am')}
              placeholder="Adicionar tarefa"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function WeeklistPanel({ bucketKey, tasks, accent, onOpenTask, onAddTask, onUpdateTask, onDeleteTask }: WeeklistProps) {
  const { setNodeRef, isOver } = useDroppable({ id: bucketKey, data: { type: 'zone', bucketKey, slot: null } })
  const [expanded, setExpanded] = useState(true)
  const taskProps = { accent, compact: true, onOpen: onOpenTask, onChange: onUpdateTask, onDelete: onDeleteTask, showDragHandle: false }

  if (!expanded) {
    return (
      <div style={{ borderLeft: '1px solid var(--line)', background: 'var(--bg-sunken)', width: 40, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16 }}>
        <button onClick={() => setExpanded(true)} className="ghost-btn" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 11, fontWeight: 700, color: 'var(--ink-mute)', gap: 8, padding: '16px 8px', letterSpacing: '0.05em' }}>
          WEEKLIST
          <span style={{ background: 'var(--line-strong)', padding: '2px 6px', borderRadius: 999, fontSize: 9, color: 'var(--ink)' }}>{tasks.length}</span>
        </button>
      </div>
    )
  }

  return (
    <div style={{
      width: 320, flexShrink: 0, borderLeft: '1px solid var(--line)', background: 'var(--bg-sunken)',
      display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Weeklist</div>
          <span style={{ background: 'var(--line-strong)', padding: '1px 7px', borderRadius: 999, fontSize: 10, color: 'var(--ink)', fontWeight: 600 }}>{tasks.length}</span>
        </div>
        <button onClick={() => setExpanded(false)} className="ghost-btn" style={{ padding: '5px', color: 'var(--ink-mute)' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
      </div>
      <div ref={setNodeRef} style={{
        flex: 1, padding: '16px', overflowY: 'auto',
        background: isOver ? 'var(--accent-soft)' : 'transparent',
        transition: 'background 120ms ease',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {tasks.length === 0 ? (
          <div style={{ padding: '40px 20px', color: 'var(--ink-faint)', fontSize: 13, fontStyle: 'italic', textAlign: 'center' }}>
            Nenhuma tarefa pendente na weeklist.
          </div>
        ) : (
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tasks.map(t => (
                <TaskRow
                  key={t.id}
                  task={t}
                  {...taskProps}
                  style={{
                    background: 'var(--bg-raised)',
                    padding: '10px 12px',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px -2px rgba(0,0,0,0.05), var(--ring)',
                    border: '1px solid var(--line)',
                  }}
                />
              ))}
            </motion.div>
          </SortableContext>
        )}
        <div style={{ marginTop: 4 }}>
          <InlineAdd compact onAdd={title => onAddTask(bucketKey, title, 'am')} placeholder="Adicionar tarefa" />
        </div>
      </div>
    </div>
  )
}
