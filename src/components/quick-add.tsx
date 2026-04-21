import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, Check, ChevronDown, Flag, Tag } from 'lucide-react'
import type { Task, TaskMap, Priority } from '../lib/types'
import { PRIORITY_COLORS, isoDate, addDays, MONTH_PT } from '../lib/constants'
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

type OpenMenu = 'date' | 'priority' | 'tags' | null

interface DateOption {
  label: string
  value: string | null
  meta?: string
}

const TODAY = new Date()
TODAY.setHours(0, 0, 0, 0)

function shortDateLabel(date: Date): string {
  return `${date.getDate()} ${MONTH_PT[date.getMonth()]}`
}

function nextWeekend(today: Date): Date {
  const saturday = 6
  const diff = (saturday - today.getDay() + 7) % 7
  return addDays(today, diff)
}

function buildDateOptions(weekStart: Date): DateOption[] {
  const tomorrow = addDays(TODAY, 1)
  const weekend = nextWeekend(TODAY)
  const nextWeek = addDays(weekStart, 7)

  return [
    { label: 'Hoje', value: isoDate(TODAY), meta: shortDateLabel(TODAY) },
    { label: 'Amanha', value: isoDate(tomorrow), meta: shortDateLabel(tomorrow) },
    { label: 'Este fim de semana', value: isoDate(weekend), meta: shortDateLabel(weekend) },
    { label: 'Proxima semana', value: `weeklist-${isoDate(nextWeek)}`, meta: shortDateLabel(nextWeek) },
    { label: 'Sem prazo', value: null },
  ]
}

const PRIORITY_OPTIONS: Array<{ value: Priority; label: string; color: string }> = [
  { value: 'high', label: 'Alta',  color: PRIORITY_COLORS.high },
  { value: 'med',  label: 'Media', color: PRIORITY_COLORS.med },
  { value: 'low',  label: 'Baixa', color: PRIORITY_COLORS.low },
]

interface SelectTriggerProps {
  label: string
  value: string
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  testId: string
}

function SelectTrigger({ label, value, active, onClick, icon, testId }: SelectTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      style={{
        minHeight: 34,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 10px',
        borderRadius: 8,
        border: `1px solid ${active ? 'var(--line-strong)' : 'var(--line)'}`,
        background: active ? 'var(--bg-raised)' : 'transparent',
        color: active ? 'var(--ink)' : 'var(--ink-soft)',
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', color: active ? 'var(--accent)' : 'var(--ink-mute)' }}>
        {icon}
      </span>
      <span style={{ whiteSpace: 'nowrap' }}>{value || label}</span>
      <ChevronDown size={13} style={{ color: 'var(--ink-mute)' }} />
    </button>
  )
}

function DropdownCard({ children, width = 260 }: { children: React.ReactNode; width?: number }) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        left: 0,
        width,
        maxHeight: 260,
        overflowY: 'auto',
        borderRadius: 10,
        border: '1px solid var(--line-strong)',
        background: 'var(--bg-raised)',
        boxShadow: 'var(--shadow-pop)',
        padding: 6,
        zIndex: 20,
      }}
    >
      {children}
    </div>
  )
}

function formatSelectedDate(value: string | null, options: DateOption[]): string {
  if (!value) return 'Prazo'

  const known = options.find((option) => option.value === value)
  if (known) return known.label

  if (value.startsWith('weeklist-')) return 'Proxima semana'

  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return 'Prazo'
  return shortDateLabel(parsed)
}

export function QuickAdd({ weekStart, onClose, onCreate }: QuickAddProps) {
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [priority, setPriority] = useState<Priority | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null)

  const [manualDate, setManualDate] = useState(false)
  const [manualPriority, setManualPriority] = useState(false)
  const [manualTags, setManualTags] = useState<Set<string>>(new Set())

  const titleRef = useRef<HTMLTextAreaElement | null>(null)
  const detailsRef = useRef<HTMLTextAreaElement | null>(null)

  const [pulseDate, setPulseDate] = useState(false)
  const [pulsePriority, setPulsePriority] = useState(false)
  const [pulseTags, setPulseTags] = useState<Set<string>>(new Set())

  const { data: allTags = [] } = useTags()
  const dateOptions = useMemo(() => buildDateOptions(weekStart), [weekStart])
  const titleParsed = useMemo(() => parseNL(title, TODAY, weekStart), [title, weekStart])
  const detailsParsed = useMemo(() => parseNL(details, TODAY, weekStart), [details, weekStart])
  const resolvedDate = detailsParsed.date ?? titleParsed.date
  const resolvedPriority = detailsParsed.priority ?? titleParsed.priority
  const resolvedTags = useMemo(
    () => [...new Set([...titleParsed.tags, ...detailsParsed.tags])],
    [detailsParsed.tags, titleParsed.tags],
  )
  const cleanedTitle = titleParsed.cleanTitle || title.trim()
  const canSubmit = cleanedTitle.length > 0

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  useEffect(() => {
    if (manualDate) return
    const nlDate = resolvedDate ?? null
    if (nlDate !== selectedDate) {
      setSelectedDate(nlDate)
      if (nlDate !== null) {
        setPulseDate(true)
        const t = setTimeout(() => setPulseDate(false), 600)
        return () => clearTimeout(t)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualDate, resolvedDate])

  useEffect(() => {
    if (manualPriority) return
    if (resolvedPriority !== priority) {
      setPriority(resolvedPriority)
      if (resolvedPriority !== null) {
        setPulsePriority(true)
        const t = setTimeout(() => setPulsePriority(false), 600)
        return () => clearTimeout(t)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualPriority, resolvedPriority])

  useEffect(() => {
    const nlTags = resolvedTags
    const newPulse = new Set<string>()
    setTags((prev) => {
      const manual = prev.filter((tag) => manualTags.has(tag))
      const merged = [...new Set([...manual, ...nlTags])]
      nlTags.forEach((tag) => {
        if (!manualTags.has(tag)) newPulse.add(tag)
      })
      return merged
    })
    if (newPulse.size > 0) {
      setPulseTags(newPulse)
      const t = setTimeout(() => setPulseTags(new Set()), 600)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTags.join(',')])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSubmit() {
    if (!canSubmit) return
    onCreate({
      title: cleanedTitle,
      bucketKey: selectedDate ?? '__inbox',
      priority,
      tags,
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function toggleTag(key: string) {
    setManualTags((prev) => {
      const next = new Set(prev)
      if (tags.includes(key)) next.delete(key)
      else next.add(key)
      return next
    })
    setTags((prev) => prev.includes(key) ? prev.filter((tag) => tag !== key) : [...prev, key])
  }

  function selectDate(value: string | null) {
    setManualDate(true)
    setSelectedDate(value)
    setOpenMenu(null)
  }

  function selectPriority(value: Priority | null) {
    setManualPriority(true)
    setPriority(value)
    setOpenMenu(null)
  }

  const selectedPriorityLabel = PRIORITY_OPTIONS.find((option) => option.value === priority)?.label ?? 'Prioridade'
  const selectedTagsLabel = tags.length === 0
    ? 'Tags'
    : tags.length === 1
      ? `#${allTags.find((tag) => tag.id === tags[0])?.name ?? tags[0]}`
      : `${tags.length} tags`

  const titleStyle: React.CSSProperties = {
    width: '100%',
    minHeight: 34,
    border: 'none',
    outline: 'none',
    resize: 'none',
    overflow: 'hidden',
    background: 'transparent',
    color: 'var(--ink)',
    fontSize: 18,
    fontWeight: 600,
    lineHeight: 1.35,
    padding: 0,
  }

  const detailsStyle: React.CSSProperties = {
    width: '100%',
    minHeight: 20,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: 'var(--ink-soft)',
    fontSize: 13,
    lineHeight: 1.45,
    padding: 0,
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(20,20,17,0.58)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <motion.div
        onClick={(e) => {
          e.stopPropagation()
          setOpenMenu(null)
        }}
        initial={{ opacity: 0, y: 14, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        style={{
          width: '100%',
          maxWidth: 720,
          borderRadius: 14,
          border: '1px solid var(--line-strong)',
          background: 'var(--bg-raised)',
          boxShadow: 'var(--shadow-pop)',
          overflow: 'visible',
        }}
      >
        <div style={{ padding: '18px 18px 14px' }}>
          <HighlightedInput
            value={title}
            tokens={titleParsed.tokens}
            onChange={setTitle}
            onKeyDown={handleKeyDown}
            placeholder="Nome da tarefa"
            inputRef={titleRef}
            inputStyle={titleStyle}
            multiline={true}
            rows={1}
            autoGrow={true}
            maxHeight={80}
          />

          <div style={{ marginTop: 8 }}>
            <HighlightedInput
              inputRef={detailsRef}
              value={details}
              tokens={detailsParsed.tokens}
              onChange={setDetails}
              onKeyDown={handleKeyDown}
              placeholder="Descricao"
              inputStyle={detailsStyle}
              multiline={true}
              rows={1}
              autoGrow={true}
              maxHeight={120}
            />
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap', position: 'relative' }}
          >
            <div style={{ position: 'relative' }}>
              <SelectTrigger
                label="Prazo"
                value={formatSelectedDate(selectedDate, dateOptions)}
                active={selectedDate !== null || pulseDate}
                onClick={() => setOpenMenu((menu) => menu === 'date' ? null : 'date')}
                icon={<CalendarDays size={14} />}
                testId="quick-add-date-trigger"
              />

              {openMenu === 'date' && (
                <DropdownCard width={290}>
                  {dateOptions.map((option) => {
                    const active = selectedDate === option.value
                    return (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => selectDate(option.value)}
                        style={{
                          width: '100%',
                          minHeight: 40,
                          border: 'none',
                          background: active ? 'var(--bg)' : 'transparent',
                          color: active ? 'var(--ink)' : 'var(--ink-soft)',
                          borderRadius: 8,
                          padding: '0 10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          fontSize: 13,
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ color: 'var(--accent)', display: 'inline-flex' }}>
                            <CalendarDays size={14} />
                          </span>
                          <span>{option.label}</span>
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--ink-mute)' }}>
                          {option.meta ?? ''}
                        </span>
                      </button>
                    )
                  })}
                </DropdownCard>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <SelectTrigger
                label="Prioridade"
                value={selectedPriorityLabel}
                active={priority !== null || pulsePriority}
                onClick={() => setOpenMenu((menu) => menu === 'priority' ? null : 'priority')}
                icon={<Flag size={14} />}
                testId="quick-add-priority-trigger"
              />

              {openMenu === 'priority' && (
                <DropdownCard width={220}>
                  {PRIORITY_OPTIONS.map((option) => {
                    const active = priority === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => selectPriority(option.value)}
                        style={{
                          width: '100%',
                          minHeight: 38,
                          border: 'none',
                          background: active ? `${option.color}12` : 'transparent',
                          color: active ? option.color : 'var(--ink-soft)',
                          borderRadius: 8,
                          padding: '0 10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: 13,
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <Flag size={14} />
                          {option.label}
                        </span>
                        {active ? <Check size={14} /> : null}
                      </button>
                    )
                  })}
                </DropdownCard>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <SelectTrigger
                label="Tags"
                value={selectedTagsLabel}
                active={tags.length > 0 || pulseTags.size > 0}
                onClick={() => setOpenMenu((menu) => menu === 'tags' ? null : 'tags')}
                icon={<Tag size={14} />}
                testId="quick-add-tags-trigger"
              />

              {openMenu === 'tags' && (
                <DropdownCard width={240}>
                  {allTags.map((tag) => {
                    const active = tags.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        style={{
                          width: '100%',
                          minHeight: 38,
                          border: 'none',
                          background: active ? `${tag.color}12` : 'transparent',
                          color: active ? tag.color : 'var(--ink-soft)',
                          borderRadius: 8,
                          padding: '0 10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: 13,
                          textAlign: 'left',
                          boxShadow: pulseTags.has(tag.id) && active ? `0 0 0 1px ${tag.color}33 inset` : 'none',
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            background: tag.color,
                            flexShrink: 0,
                          }} />
                          #{tag.name}
                        </span>
                        {active ? <Check size={14} /> : null}
                      </button>
                    )
                  })}
                </DropdownCard>
              )}
            </div>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid var(--line)',
          padding: '12px 18px',
          background: 'var(--bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 12,
          flexWrap: 'wrap',
          borderBottomLeftRadius: 14,
          borderBottomRightRadius: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                minHeight: 38,
                padding: '0 14px',
                borderRadius: 8,
                border: '1px solid var(--line)',
                background: 'var(--bg-raised)',
                color: 'var(--ink-soft)',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              aria-label="Adicionar tarefa"
              style={{
                minHeight: 38,
                padding: '0 16px',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                background: canSubmit ? 'var(--accent-2)' : 'var(--bg-sunken)',
                color: canSubmit ? 'var(--accent-2-ink)' : 'var(--ink-mute)',
                opacity: canSubmit ? 1 : 0.72,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
              }}
            >
              Adicionar tarefa
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
