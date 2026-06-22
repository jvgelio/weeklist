import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { parseNL } from '../lib/nl-parse'
import type { ContextualTaskCreateHandler, Slot } from '../lib/types'
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
  onCreate: ContextualTaskCreateHandler
}

const SLOT_LABEL: Record<Slot, string> = {
  am: 'manha',
  pm: 'tarde',
  eve: 'noite',
}

const EASING = [0.25, 1, 0.5, 1] as const
const ERROR_MESSAGE = 'Nao foi possivel criar a tarefa. Tente novamente.'

function startOfToday(): Date {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

function formatDestination(bucketKey: string, slot: Slot): string {
  const date = new Date(`${bucketKey}T12:00:00`)
  const dateLabel = Number.isNaN(date.getTime())
    ? bucketKey
    : new Intl.DateTimeFormat('pt-BR', {
      weekday: 'short',
      day: '2-digit',
    }).format(date)

  return `${dateLabel} · ${SLOT_LABEL[slot]}`
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
  const [optimisticallyHidden, setOptimisticallyHidden] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hintVisible, setHintVisible] = useState(false)
  const [parserToday, setParserToday] = useState(startOfToday)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const pendingStatusRef = useRef<HTMLDivElement | null>(null)
  const openRef = useRef(open)
  const currentTargetRef = useRef(`${bucketKey}:${slot}`)
  const reduceMotion = useReducedMotion()
  openRef.current = open
  currentTargetRef.current = `${bucketKey}:${slot}`
  const parsed = useMemo(
    () => parseNL(value, parserToday, weekStart),
    [parserToday, value, weekStart]
  )
  const resolvedBucketKey = parsed.date ?? bucketKey
  const resolvedSlot = parsed.slot ?? slot

  useEffect(() => {
    if (open) {
      setParserToday(startOfToday())
      if (optimisticallyHidden) {
        pendingStatusRef.current?.focus()
      } else {
        inputRef.current?.focus()
      }
    }
  }, [open, optimisticallyHidden])

  async function submit() {
    const freshParsed = parseNL(value, startOfToday(), weekStart)
    const title = freshParsed.cleanTitle || value.trim()
    if (!title || submitting) return
    const submittedTarget = `${bucketKey}:${slot}`

    setSubmitting(true)
    setError(null)
    try {
      await onCreate(
        {
          title,
          bucketKey: freshParsed.date ?? bucketKey,
          slot: freshParsed.slot ?? slot,
          priority: freshParsed.priority,
          recurring: freshParsed.recurring,
          tags: freshParsed.tags,
        },
        { onOptimistic: () => setOptimisticallyHidden(true) }
      )
      setValue('')
      setOptimisticallyHidden(false)
      if (openRef.current && currentTargetRef.current === submittedTarget) onClose()
    } catch {
      setOptimisticallyHidden(false)
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
    <AnimatePresence initial={false}>
      {optimisticallyHidden ? (
        <motion.div
          key="pending"
          {...enterExit}
          transition={{ duration: reduceMotion ? 0.14 : 0.18, ease: EASING }}
        >
          <div
            ref={pendingStatusRef}
            role="status"
            aria-label="Criando tarefa"
            aria-live="polite"
            tabIndex={-1}
            style={{
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              padding: '6px 8px',
              color: 'var(--ink-mute)',
              fontSize: 12,
            }}
          >
            Criando tarefa...
          </div>
        </motion.div>
      ) : open ? (
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
                inputRef={inputRef}
                value={value}
                tokens={parsed.tokens}
                onChange={(nextValue) => {
                  setValue(nextValue)
                  setError(null)
                }}
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
            {formatDestination(resolvedBucketKey, resolvedSlot)}
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
          variants={{
            rest: {
              opacity: 1,
              backgroundColor: 'rgba(0, 0, 0, 0)',
              borderColor: 'rgba(0, 0, 0, 0)',
            },
            discover: {
              opacity: 1,
              backgroundColor: 'rgba(184, 100, 60, 0.08)',
              borderColor: 'rgba(184, 100, 60, 0.22)',
            },
          }}
          initial="rest"
          animate="rest"
          exit="rest"
          whileHover="discover"
          whileFocus="discover"
          transition={{ duration: reduceMotion ? 0 : 0.14, ease: EASING }}
          style={{
            minHeight: 44,
            flex: 1,
            width: '100%',
            position: 'relative',
            border: '1px solid transparent',
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
              Clique para criar
            </motion.span>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  )
}
