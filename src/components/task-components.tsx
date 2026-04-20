import React, { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Check, Plus, ChevronRight, Repeat2, Flag, GripVertical,
  Trash2, ArrowRight, Inbox, Clock, CalendarDays, Sun, Moon,
  ExternalLink,
} from 'lucide-react'
import { TAGS } from '../lib/constants'
import type { Task } from '../lib/types'

// ---- Icons (Lucide wrappers keeping same API) ----

interface IconProps { size?: number }
interface ChevronProps extends IconProps { dir?: 'right' | 'down' | 'left' | 'up' }
interface ArrowProps extends IconProps { dir?: 'right' | 'left' | 'up' | 'down' }

export function IconCheck({ size = 12 }: IconProps) {
  return <Check size={size} strokeWidth={2.5}/>
}
export function IconPlus({ size = 14 }: IconProps) {
  return <Plus size={size}/>
}
export function IconChevron({ size = 14, dir = 'right' }: ChevronProps) {
  const r = { right: 0, down: 90, left: 180, up: -90 }[dir]
  return <ChevronRight size={size} style={{ transform: `rotate(${r}deg)`, flexShrink: 0 }}/>
}
export function IconRepeat({ size = 12 }: IconProps) {
  return <Repeat2 size={size}/>
}
export function IconFlag({ size = 12 }: IconProps) {
  return <Flag size={size}/>
}
export function IconDrag({ size = 12 }: IconProps) {
  return <GripVertical size={size}/>
}
export function IconTrash({ size = 12 }: IconProps) {
  return <Trash2 size={size}/>
}
export function IconArrow({ size = 12, dir = 'right' }: ArrowProps) {
  const r = { right: 0, left: 180, up: -90, down: 90 }[dir]
  return <ArrowRight size={size} style={{ transform: `rotate(${r}deg)`, flexShrink: 0 }}/>
}
export function IconInbox({ size = 14 }: IconProps) {
  return <Inbox size={size}/>
}
export function IconSomeday({ size = 14 }: IconProps) {
  return <Clock size={size}/>
}
export function IconWeek({ size = 14 }: IconProps) {
  return <CalendarDays size={size}/>
}
export function IconSun({ size = 13 }: IconProps) {
  return <Sun size={size}/>
}
export function IconMoon({ size = 13 }: IconProps) {
  return <Moon size={size}/>
}

// Namespace object for components that use Icon.X syntax
export const Icon = {
  Check: IconCheck,
  Plus: IconPlus,
  Chevron: IconChevron,
  Repeat: IconRepeat,
  Flag: IconFlag,
  Drag: IconDrag,
  Trash: IconTrash,
  Arrow: IconArrow,
  Inbox: IconInbox,
  Someday: IconSomeday,
  Week: IconWeek,
  Sun: IconSun,
  Moon: IconMoon,
}

// ---- TagChip ----

export function TagChip({ tag }: { tag: string }) {
  const t = TAGS[tag]
  if (!t) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px 2px 6px',
      borderRadius: 9999,
      background: 'var(--bg-sunken)',
      boxShadow: 'inset 0 0 0 1px var(--line)',
      color: 'var(--ink-soft)',
      fontSize: 11, fontWeight: 600,
      letterSpacing: '-0.01em',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 9999, background: t.color, flexShrink: 0 }}/>
      {t.label}
    </span>
  )
}

// ---- TagDot ----

export function TagDot({ tag }: { tag: string }) {
  const t = TAGS[tag]
  if (!t) return null
  return (
    <span
      title={t.label}
      style={{
        display: 'inline-block',
        width: 8, height: 8, borderRadius: 9999,
        background: t.color,
        boxShadow: '0 0 0 1.5px var(--bg)',
      }}
    />
  )
}

// ---- TagHash ----

export function TagHash({ tag }: { tag: string }) {
  const t = TAGS[tag]
  if (!t) return null
  return (
    <span style={{
      fontSize: 11, fontWeight: 600,
      color: t.color,
      letterSpacing: '-0.01em',
    }}>
      #{t.label}
    </span>
  )
}

// ---- Checkbox ----

interface CheckboxProps {
  checked: boolean
  onChange: (v: boolean) => void
  accent?: string
}

export function Checkbox({ checked, onChange, accent }: CheckboxProps) {
  const color = accent ?? 'var(--accent)'
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange(!checked) }}
      aria-pressed={checked}
      style={{
        width: 18, height: 18, flexShrink: 0,
        borderRadius: 5,
        border: `1.5px solid ${checked ? color : color === 'var(--accent)' ? 'var(--line-strong)' : color}`,
        background: checked ? color : 'transparent',
        color: checked ? '#fff' : 'transparent',
        display: 'grid', placeItems: 'center',
        padding: 0,
        transition: 'all 120ms ease',
        cursor: 'pointer',
        opacity: checked ? 1 : 0.7,
      }}
    >
      <IconCheck size={11}/>
    </button>
  )
}

// ---- PriorityFlag ----

export function PriorityFlag({ priority }: { priority: Task['priority'] }) {
  if (!priority) return null
  const color = priority === 'high' ? 'var(--prio-high)'
              : priority === 'med'  ? 'var(--prio-med)' : 'var(--prio-low)'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      color, fontSize: 10, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      <IconFlag size={10}/>
      {priority === 'high' ? 'P1' : priority === 'med' ? 'P2' : 'P3'}
    </span>
  )
}

// ---- NoteSnippet ----

function NoteSnippet({ note }: { note: string | null }) {
  if (!note?.trim()) return null
  const firstLine = note.split('\n').find(l => l.trim()) ?? ''
  const trimmed = firstLine.trim()
  const isUrl = /^https?:\/\//i.test(trimmed)

  if (isUrl) {
    // href = full URL; display text truncated via CSS so link stays functional
    return (
      <a
        href={trimmed}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        title={trimmed}
        style={{
          fontSize: 12, color: 'var(--accent)',
          display: 'flex', alignItems: 'center', gap: 3,
          marginTop: 2,
          textDecoration: 'none',
          minWidth: 0,
        }}
      >
        <ExternalLink size={10} style={{ flexShrink: 0 }}/>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {trimmed}
        </span>
      </a>
    )
  }
  return (
    <div style={{
      fontSize: 12, color: 'var(--ink-mute)',
      marginTop: 2,
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    }}>
      {trimmed}
    </div>
  )
}

// ---- TaskRow ----

interface TaskRowProps {
  task: Task
  onChange: (t: Task) => void
  onDelete: (id: string) => void
  onOpen?: (t: Task) => void
  accent?: string
  compact?: boolean
  showDragHandle?: boolean
  className?: string
  style?: React.CSSProperties
  isOverlay?: boolean
}

function TaskRowComponent({
  task, onChange, onDelete, onOpen,
  accent, compact = false, showDragHandle = true,
  className, style: customStyle,
  isOverlay = false,
}: TaskRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.title)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'task', bucketKey: task.bucketKey, slot: task.slot ?? null },
    disabled: isOverlay,
  })

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus()
  }, [editing])

  // keep draft in sync if task title changes externally
  useEffect(() => { setDraft(task.title) }, [task.title])

  const subDone  = task.subtasks.filter(s => s.done).length
  const subTotal = task.subtasks.length

  const priorityAccent =
    task.priority === 'high' ? 'var(--prio-high)' :
    task.priority === 'med'  ? 'var(--prio-med)'  :
    task.priority === 'low'  ? 'var(--prio-low)'  :
    undefined

  function commit() {
    const v = draft.trim()
    if (v) onChange({ ...task, title: v })
    setEditing(false)
  }

  const hasBody = !!(task.note?.trim() || task.recurring || subTotal > 0 || task.tags.length > 0)

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...(isOverlay ? {} : (!showDragHandle ? listeners : {}))}
      className={`task-row ${className || ''}`}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: compact ? '7px 10px' : '10px 12px',
        borderRadius: 10,
        opacity: isDragging ? 0 : 1,
        background: 'transparent',
        position: 'relative',
        cursor: isOverlay ? 'grabbing' : (editing ? 'text' : (!showDragHandle ? 'grab' : 'default')),
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition,
        touchAction: (isOverlay || !showDragHandle) ? 'none' : undefined,
        ...customStyle,
      }}
    >
      {showDragHandle && (
        <span
          {...listeners}
          className="drag-handle"
          style={{
            alignSelf: 'center',
            color: 'var(--ink-faint)',
            opacity: 0,
            cursor: 'grab',
            touchAction: 'none',
          }}
        >
          <IconDrag size={16}/>
        </span>
      )}

      <Checkbox
        checked={task.done}
        onChange={(v) => onChange({ ...task, done: v })}
        accent={priorityAccent ?? accent}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            ref={inputRef}
            className="task-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') { setDraft(task.title); setEditing(false) }
            }}
          />
        ) : (
          <div style={{
            fontSize: 14, fontWeight: 500,
            color: task.done ? 'var(--ink-mute)' : 'var(--ink)',
            textDecoration: task.done ? 'line-through' : 'none',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            cursor: 'text',
          }} onClick={(e) => { e.stopPropagation(); setEditing(true) }}>
            {task.title}
          </div>
        )}

        {hasBody && (
          <div
            onClick={() => onOpen?.(task)}
            style={{ cursor: onOpen ? 'pointer' : undefined }}
          >
            <NoteSnippet note={task.note}/>

            {(task.recurring || subTotal > 0 || task.tags.length > 0) && (
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4,
                alignItems: 'center',
              }}>
                {task.recurring && (
                  <span style={{ color: 'var(--ink-mute)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <IconRepeat size={11}/>{task.recurring}
                  </span>
                )}
                {subTotal > 0 && (
                  <span style={{ color: 'var(--ink-mute)', fontSize: 11, fontWeight: 600 }}>
                    {subDone}/{subTotal}
                  </span>
                )}
                {task.tags.map(t => <TagHash key={t} tag={t}/>)}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="row-actions" style={{ display: 'flex', gap: 4 }}>
        {onOpen && (
          <button onClick={(e) => { e.stopPropagation(); onOpen(task) }} className="ghost-btn" style={{ padding: '4px 8px' }}>
            <IconChevron size={14}/>
          </button>
        )}
      </div>
    </div>
  )
}

export const TaskRow = React.memo(TaskRowComponent)

// ---- InlineAdd ----

interface InlineAddProps {
  onAdd: (title: string) => void
  placeholder?: string
  compact?: boolean
}

export function InlineAdd({ onAdd, placeholder = 'Adicionar tarefa...', compact }: InlineAddProps) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus()
  }, [editing])

  function commit() {
    const v = val.trim()
    if (v) onAdd(v)
    setVal('')
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="add-row"
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', gap: 8,
          padding: compact ? '4px 8px' : '8px 12px',
          fontSize: 13, color: 'var(--ink-mute)',
          textAlign: 'left',
          borderRadius: 8,
          border: 'none',
          background: 'transparent',
          transition: 'all 120ms ease',
        }}
      >
        <IconPlus size={14}/>
        {placeholder}
      </button>
    )
  }

  return (
    <div style={{ padding: '0 4px' }}>
      <input
        ref={inputRef}
        className="task-input"
        placeholder="O que precisa ser feito?"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { setVal(''); setEditing(false) }
        }}
        style={{
          width: '100%',
          padding: '6px 10px',
          borderRadius: 8,
          border: '1.5px solid var(--accent)',
          background: 'var(--bg)',
          fontSize: 14,
        }}
      />
    </div>
  )
}

// ---- LunchDivider ----

export function LunchDivider() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, margin: '8px 4px',
      opacity: 0.5,
    }}>
      <div style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
      <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>almoço</span>
      <div style={{ flex: 1, height: 1, background: 'var(--line)' }}/>
    </div>
  )
}
