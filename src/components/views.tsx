import React, { useMemo, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { MONTH_PT, DAY_NAMES_PT, PRESET_COLORS, isoDate, sameDay, addDays } from '../lib/constants'
import type { Task, TaskMap, Variant, Tag } from '../lib/types'
import {
  DayRow, DayColumn,
  WeekendStrip, WeekendColumnsStrip,
  WeeklistStrip, WeeklistPanel,
} from './day-row'
import { IconArrow, TaskRow, InlineAdd } from './task-components'
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from '../hooks/use-tags'

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
}

export function WeekView({
  weekStart, tasks, variant, showWeekend, dark,
  accent,
  onOpenTask, onAddTask, onUpdateTask, onDeleteTask, onMoveTask,
  onPrevWeek, onNextWeek, onToday,
  onChangeVariant, onToggleWeekend, onToggleDark,
}: WeekViewProps) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const visibleDays = useMemo(
    () => showWeekend ? days : days.filter((d) => d.getDay() !== 0 && d.getDay() !== 6),
    [days, showWeekend],
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
          gap: 20, marginBottom: overdueTasks.length > 0 ? 14 : 0,
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
