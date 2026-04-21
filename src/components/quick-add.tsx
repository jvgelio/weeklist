import React, { useState, useEffect, useRef, useMemo } from 'react'
import type { Task, TaskMap, Priority } from '../lib/types'
import { PRIORITY_COLORS, DAY_NAMES_PT, isoDate, addDays } from '../lib/constants'
import { useTags } from '../hooks/use-tags'
import { parseNL } from '../lib/nl-parse'
import { HighlightedInput } from './highlighted-input'

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
  const [title, setTitle]               = useState('')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [priority, setPriority]         = useState<Priority | null>(null)
  const [tags, setTags]                 = useState<string[]>([])

  // Track which fields were manually set by chip click (manual wins over NL)
  const [manualDate, setManualDate]         = useState(false)
  const [manualPriority, setManualPriority] = useState(false)
  const [manualTags, setManualTags]         = useState<Set<string>>(new Set())

  // NL pulse: briefly highlight chips that were auto-selected
  const [pulseDate, setPulseDate]         = useState(false)
  const [pulsePriority, setPulsePriority] = useState(false)
  const [pulseTags, setPulseTags]         = useState<Set<string>>(new Set())

  const { data: allTags = [] } = useTags()
  const inputRef  = useRef<HTMLInputElement>(null)
  const dateChips = buildDateChips(weekStart)

  const parsed = useMemo(() => parseNL(title, TODAY, weekStart), [title, weekStart])

  // Sync NL-detected date to selectedDate when no manual override
  useEffect(() => {
    if (manualDate) return
    const nlDate = parsed.date ?? null
    if (nlDate !== selectedDate) {
      setSelectedDate(nlDate)
      if (nlDate !== null) {
        setPulseDate(true)
        const t = setTimeout(() => setPulseDate(false), 600)
        return () => clearTimeout(t)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed.date, manualDate])

  // Sync NL-detected priority
  useEffect(() => {
    if (manualPriority) return
    if (parsed.priority !== priority) {
      setPriority(parsed.priority)
      if (parsed.priority !== null) {
        setPulsePriority(true)
        const t = setTimeout(() => setPulsePriority(false), 600)
        return () => clearTimeout(t)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed.priority, manualPriority])

  // Sync NL-detected tags (merge with manual tags)
  useEffect(() => {
    const nlTags   = parsed.tags
    const newPulse = new Set<string>()
    setTags((prev) => {
      const manual = prev.filter((t) => manualTags.has(t))
      const merged = [...new Set([...manual, ...nlTags])]
      nlTags.forEach((t) => { if (!manualTags.has(t)) newPulse.add(t) })
      return merged
    })
    if (newPulse.size > 0) {
      setPulseTags(newPulse)
      const t = setTimeout(() => setPulseTags(new Set()), 600)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed.tags.join(',')])

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSubmit() {
    const trimmed = parsed.cleanTitle || title.trim()
    if (!trimmed) return
    onCreate({ title: trimmed, bucketKey: selectedDate ?? '__inbox', priority, tags })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit() }
  }

  function toggleTag(key: string) {
    setManualTags((prev) => {
      const next = new Set(prev)
      if (tags.includes(key)) { next.delete(key) } else { next.add(key) }
      return next
    })
    setTags((prev) => prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key])
  }

  function togglePriority(value: Priority) {
    setManualPriority(true)
    setPriority((prev) => (prev === value ? null : value))
  }

  function selectDate(value: string | null) {
    setManualDate(true)
    setSelectedDate(value)
  }

  const inputStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    outline: 'none',
    fontSize: 17,
    color: 'var(--ink)',
    width: '100%',
    padding: 0,
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
        {/* Title input with NL syntax highlighting */}
        <HighlightedInput
          inputRef={inputRef}
          value={title}
          tokens={parsed.tokens}
          onChange={setTitle}
          onKeyDown={handleKeyDown}
          placeholder="Tarefa..."
          inputStyle={inputStyle}
        />

        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Date chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {dateChips.map((chip) => {
              const active = selectedDate === chip.value
              return (
                <button
                  key={chip.value ?? '__inbox'}
                  onClick={() => selectDate(chip.value)}
                  style={{
                    background: active ? 'var(--line-strong)' : 'var(--bg-sunken)',
                    border: active ? '1px solid var(--line-strong)' : '1px solid var(--line)',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 12,
                    color: active ? 'var(--ink)' : 'var(--ink-soft)',
                    cursor: 'pointer',
                    boxShadow: pulseDate && active ? '0 0 0 2px var(--accent)' : 'none',
                    transition: 'box-shadow 150ms ease',
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
                    boxShadow: pulsePriority && active ? `0 0 0 2px ${opt.color}` : 'none',
                    transition: 'box-shadow 150ms ease',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>

          {/* Tag chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {allTags.map((tag) => {
              const active = tags.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  style={{
                    background: active ? `${tag.color}22` : 'var(--bg-sunken)',
                    border: active ? `1px solid ${tag.color}66` : '1px solid var(--line)',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 12,
                    color: active ? tag.color : 'var(--ink-soft)',
                    cursor: 'pointer',
                    boxShadow: pulseTags.has(tag.id) && active ? `0 0 0 2px ${tag.color}` : 'none',
                    transition: 'box-shadow 150ms ease',
                  }}
                >
                  # {tag.name}
                </button>
              )
            })}
            {/* NL-detected tags not in known tag list */}
            {parsed.tags
              .filter((t) => !allTags.some((tag) => tag.id === t))
              .map((t) => (
                <span
                  key={t}
                  style={{
                    background: 'rgba(167,139,250,0.15)',
                    border: '1px solid rgba(167,139,250,0.4)',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 12,
                    color: '#a78bfa',
                  }}
                >
                  # {t}
                </span>
              ))}
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
