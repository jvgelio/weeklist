import React, { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TAGS } from '../lib/constants'
import type { Task } from '../lib/types'

// ---- Icons ----

interface IconProps { size?: number }
interface ChevronProps extends IconProps { dir?: 'right' | 'down' | 'left' | 'up' }
interface ArrowProps extends IconProps { dir?: 'right' | 'left' | 'up' | 'down' }

export function IconCheck({ size = 12 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconPlus({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export function IconChevron({ size = 14, dir = 'right' }: ChevronProps) {
  const r = { right: 0, down: 90, left: 180, up: -90 }[dir]
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ transform: `rotate(${r}deg)` }}>
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconRepeat({ size = 12 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3 6l2-2h6a2 2 0 012 2v1M13 10l-2 2H5a2 2 0 01-2-2V9"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconFlag({ size = 12 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M4 2v12M4 3h7l-1.5 2.5L11 8H4"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconDrag({ size = 12 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="4" r="1.2" fill="currentColor"/>
      <circle cx="10" cy="4" r="1.2" fill="currentColor"/>
      <circle cx="6" cy="8" r="1.2" fill="currentColor"/>
      <circle cx="10" cy="8" r="1.2" fill="currentColor"/>
      <circle cx="6" cy="12" r="1.2" fill="currentColor"/>
      <circle cx="10" cy="12" r="1.2" fill="currentColor"/>
    </svg>
  )
}

export function IconTrash({ size = 12 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3 4h10M6 4V2.5h4V4M5 4l.5 9a1.5 1.5 0 001.5 1.4h2a1.5 1.5 0 001.5-1.4L11 4"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconArrow({ size = 12, dir = 'right' }: ArrowProps) {
  const r = { right: 0, left: 180, up: -90, down: 90 }[dir]
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ transform: `rotate(${r}deg)` }}>
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconInbox({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M2 9l2-5h8l2 5v4H2V9zM2 9h4l1 1h2l1-1h4"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconSomeday({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 5v3l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}

export function IconWeek({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3.5" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M2 6.5h12M5.5 2v2.5M10.5 2v2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}

export function IconSun({ size = 13 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M3.5 12.5l1.4-1.4M11.1 4.9l1.4-1.4"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}

export function IconMoon({ size = 13 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M13 10A6 6 0 016 3a6 6 0 100 10 6 6 0 007-3z"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
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

// ---- Checkbox ----

interface CheckboxProps {
  checked: boolean
  onChange: (v: boolean) => void
  accent?: string
}

export function Checkbox({ checked, onChange, accent }: CheckboxProps) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange(!checked) }}
      aria-pressed={checked}
      style={{
        width: 18, height: 18, flexShrink: 0,
        borderRadius: 5,
        border: '1.5px solid var(--line-strong)',
        background: checked ? (accent ?? 'var(--accent)') : 'transparent',
        color: checked ? '#fff' : 'transparent',
        display: 'grid', placeItems: 'center',
        padding: 0,
        transition: 'all 120ms ease',
        cursor: 'pointer',
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
  const [expanded, setExpanded] = useState(false)
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

  function commit() {
    const v = draft.trim()
    if (v) onChange({ ...task, title: v })
    setEditing(false)
  }

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
        accent={accent}
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
          }} onClick={() => setEditing(true)}>
            {task.title}
          </div>
        )}

        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4,
          alignItems: 'center',
        }}>
          {task.priority && <PriorityFlag priority={task.priority}/>}
          {task.recurring && (
            <span style={{ color: 'var(--ink-mute)', fontSize: 10 }}>
              <IconRepeat size={10}/> {task.recurring}
            </span>
          )}
          {subTotal > 0 && (
            <span style={{ color: 'var(--ink-mute)', fontSize: 10, fontWeight: 600 }}>
              {subDone}/{subTotal}
            </span>
          )}
          {task.tags.map(t => <TagDot key={t} tag={t}/>)}
        </div>
      </div>

      <div className="row-actions" style={{
        display: 'flex', gap: 4, opacity: 0, transition: 'opacity 120ms ease',
      }}>
        {onOpen && (
          <button onClick={() => onOpen(task)} className="ghost-btn" style={{ padding: '4px 8px' }}>
            <IconChevron size={14}/>
          </button>
        )}
        <button onClick={() => onDelete(task.id)} className="ghost-btn" style={{ padding: '4px 8px' }}>
          <IconTrash size={14}/>
        </button>
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
        className="ghost-btn"
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', gap: 8,
          padding: compact ? '4px 8px' : '8px 12px',
          fontSize: 13, color: 'var(--ink-mute)',
          textAlign: 'left',
          borderRadius: 8,
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
