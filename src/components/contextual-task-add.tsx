import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { parseNL } from '../lib/nl-parse'
import type { ContextualTaskCreateParams, Slot } from '../lib/types'
import { HighlightedInput } from './highlighted-input'

interface ContextualTaskAddProps {
  bucketKey: string
  slot: Slot
  weekStart: Date
  accessibleLabel: string
  open: boolean
  disabled: boolean
  onOpen: () => void
  onClose: () => void
  onCreate: (params: ContextualTaskCreateParams) => Promise<void>
}

const SLOT_LABELS: Record<Slot, string> = {
  am: 'Manha',
  pm: 'Tarde',
  eve: 'Noite',
}

const EASING = [0.25, 1, 0.5, 1] as const
const ERROR_MESSAGE = 'Nao foi possivel criar a tarefa. Tente novamente.'

function destinationLabel(bucketKey: string, slot: Slot): string {
  const date = new Date(`${bucketKey}T12:00:00`)
  const dateLabel = Number.isNaN(date.getTime())
    ? bucketKey
    : new Intl.DateTimeFormat('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      }).format(date)

  return `${dateLabel} - ${SLOT_LABELS[slot]}`
}

export function ContextualTaskAdd({
  bucketKey,
  slot,
  weekStart,
  accessibleLabel,
  open,
  disabled,
  onOpen,
  onClose,
  onCreate,
}: ContextualTaskAddProps) {
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hintVisible, setHintVisible] = useState(false)
  const reduceMotion = useReducedMotion()
  const today = useMemo(() => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date
  }, [])
  const parsed = useMemo(() => parseNL(value, today, weekStart), [today, value, weekStart])
  const resolvedBucketKey = parsed.date ?? bucketKey
  const resolvedSlot = parsed.slot ?? slot

  async function submit() {
    const title = parsed.cleanTitle || value.trim()
    if (!title || submitting) return

    setSubmitting(true)
    setError(null)
    try {
      await onCreate({
        title,
        bucketKey: resolvedBucketKey,
        slot: resolvedSlot,
        priority: parsed.priority,
        recurring: parsed.recurring,
        tags: parsed.tags,
      })
      setValue('')
      onClose()
    } catch {
      setError(ERROR_MESSAGE)
    } finally {
      setSubmitting(false)
    }
  }

  function clearAndClose() {
    setValue('')
    setError(null)
    onClose()
  }

  const enterExit = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 4 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -2 },
      }

  return (
    <AnimatePresence initial={false} mode="wait">
      {open ? (
        <motion.form
          key="composer"
          {...enterExit}
          transition={{ duration: reduceMotion ? 0.14 : 0.18, ease: EASING }}
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
          aria-busy={submitting}
          style={{
            padding: '6px 8px 8px',
            borderRadius: 10,
            border: '1px solid var(--line)',
            background: 'var(--bg)',
          }}
        >
          <fieldset disabled={submitting || disabled} style={{ margin: 0, padding: 0, border: 0 }}>
            <label>
              <span
                style={{
                  position: 'absolute',
                  width: 1,
                  height: 1,
                  padding: 0,
                  margin: -1,
                  overflow: 'hidden',
                  clip: 'rect(0, 0, 0, 0)',
                  whiteSpace: 'nowrap',
                  border: 0,
                }}
              >
                Titulo da nova tarefa
              </span>
              <HighlightedInput
                value={value}
                tokens={parsed.tokens}
                onChange={(nextValue) => {
                  setValue(nextValue)
                  setError(null)
                }}
                autoFocus
                maxLength={255}
                placeholder="O que precisa ser feito?"
                inputClassName="task-input"
                inputStyle={{
                  padding: '7px 9px',
                  borderRadius: 8,
                  border: '1.5px solid var(--accent)',
                  color: 'var(--ink)',
                  outline: 'none',
                }}
                onBlur={() => {
                  if (!value.trim()) onClose()
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void submit()
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    clearAndClose()
                  }
                }}
              />
            </label>
          </fieldset>

          <div
            aria-label="Destino da tarefa"
            style={{
              display: 'inline-flex',
              marginTop: 6,
              padding: '2px 7px',
              borderRadius: 999,
              background: 'var(--bg-soft)',
              color: 'var(--ink-mute)',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {destinationLabel(resolvedBucketKey, resolvedSlot)}
          </div>

          {error && (
            <div role="alert" style={{ marginTop: 5, color: 'var(--danger)', fontSize: 12 }}>
              {error}
            </div>
          )}
        </motion.form>
      ) : (
        <motion.button
          key="idle"
          type="button"
          aria-label={accessibleLabel}
          disabled={disabled}
          onClick={() => {
            setHintVisible(false)
            onOpen()
          }}
          onMouseEnter={() => setHintVisible(true)}
          onMouseLeave={() => setHintVisible(false)}
          onFocus={() => setHintVisible(true)}
          onBlur={() => setHintVisible(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          whileHover={{ opacity: disabled ? 1 : 0.78 }}
          whileFocus={{ opacity: disabled ? 1 : 0.78 }}
          transition={{ duration: 0.14, ease: EASING }}
          style={{
            minHeight: 44,
            flex: 1,
            width: '100%',
            position: 'relative',
            border: 0,
            borderRadius: 8,
            background: 'transparent',
            color: 'var(--ink-faint)',
            cursor: disabled ? 'default' : 'pointer',
          }}
        >
          {hintVisible && !disabled && (
            <motion.span
              aria-hidden
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 2 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={{ duration: 0.14, ease: EASING }}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                fontSize: 12,
              }}
            >
              Adicionar tarefa
            </motion.span>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  )
}
