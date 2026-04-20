import React, { useState, useEffect, useRef } from 'react'
import type { Task, TaskMap, Priority } from '../lib/types'
import { TAGS, PRIORITY_COLORS, DAY_NAMES_PT, isoDate, addDays } from '../lib/constants'

export interface QuickAddCreateParams {
  title: string
  bucketKey: string
  priority: Priority | null
  tags: string[]
}

interface QuickAddProps {
  weekStart: Date
  weekTasks: TaskMap
  inboxTasks: Task[]
  onClose: () => void
  onCreate: (params: QuickAddCreateParams) => void
}

const TODAY = new Date()
TODAY.setHours(0, 0, 0, 0)

function buildDateChips(weekStart: Date): Array<{ label: string; value: string | null }> {
  const chips: Array<{ label: string; value: string | null }> = [
    { label: '📥 inbox', value: null },
  ]

  const tomorrow = addDays(TODAY, 1)
  chips.push({ label: 'hoje', value: isoDate(TODAY) })
  chips.push({ label: 'amanhã', value: isoDate(tomorrow) })

  // Remaining days of current week, skip today and tomorrow, skip past days
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i)
    const key = isoDate(day)
    if (key === isoDate(TODAY) || key === isoDate(tomorrow)) continue
    if (day < TODAY) continue
    chips.push({ label: DAY_NAMES_PT[day.getDay()], value: key })
  }

  return chips
}

const PRIORITY_OPTIONS: Array<{ value: Priority; label: string; color: string }> = [
  { value: 'high', label: '🔴 alta',  color: PRIORITY_COLORS.high },
  { value: 'med',  label: '🟡 média', color: PRIORITY_COLORS.med },
  { value: 'low',  label: '🟢 baixa', color: PRIORITY_COLORS.low },
]

export function QuickAdd({ weekStart, onClose, onCreate }: QuickAddProps) {
  const [title, setTitle] = useState('')
  const [selectedDate, setSelectedDate] = useState<string | null>(null) // null = inbox
  const [priority, setPriority] = useState<Priority | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const dateChips = buildDateChips(weekStart)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSubmit() {
    const trimmed = title.trim()
    if (!trimmed) return
    onCreate({
      title: trimmed,
      bucketKey: selectedDate ?? '__inbox',
      priority,
      tags,
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  function toggleTag(key: string) {
    setTags((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    )
  }

  function togglePriority(value: Priority) {
    setPriority((prev) => (prev === value ? null : value))
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20,20,17,0.55)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-raised)',
          border: '1px solid var(--line-strong)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-pop)',
          width: '100%',
          maxWidth: 520,
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {/* Title input */}
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tarefa..."
          style={{
            background: 'none',
            border: 'none',
            outline: 'none',
            fontSize: 17,
            color: 'var(--ink)',
            width: '100%',
            padding: 0,
          }}
        />

        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Date chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {dateChips.map((chip) => {
              const active = selectedDate === chip.value
              return (
                <button
                  key={chip.value ?? '__inbox'}
                  onClick={() => setSelectedDate(chip.value)}
                  style={{
                    background: active ? 'var(--line-strong)' : 'var(--bg-sunken)',
                    border: active ? '1px solid var(--line-strong)' : '1px solid var(--line)',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 12,
                    color: active ? 'var(--ink)' : 'var(--ink-soft)',
                    cursor: 'pointer',
                  }}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>

          {/* Priority chips */}
          <div style={{ display: 'flex', gap: 6 }}>
            {PRIORITY_OPTIONS.map((opt) => {
              const active = priority === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => togglePriority(opt.value)}
                  style={{
                    background: active ? `${opt.color}22` : 'var(--bg-sunken)',
                    border: active ? `1px solid ${opt.color}66` : '1px solid var(--line)',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 12,
                    color: active ? opt.color : 'var(--ink-soft)',
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>

          {/* Tag chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.entries(TAGS).map(([key, tag]) => {
              const active = tags.includes(key)
              return (
                <button
                  key={key}
                  onClick={() => toggleTag(key)}
                  style={{
                    background: active ? `${tag.color}22` : 'var(--bg-sunken)',
                    border: active ? `1px solid ${tag.color}66` : '1px solid var(--line)',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 12,
                    color: active ? tag.color : 'var(--ink-soft)',
                    cursor: 'pointer',
                  }}
                >
                  # {tag.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer hint */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 11, color: 'var(--ink-mute)', opacity: 0.5 }}>
            ↵ criar · Esc fechar
          </span>
        </div>
      </div>
    </div>
  )
}
