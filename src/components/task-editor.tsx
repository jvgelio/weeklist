import React, { useState, useRef, useEffect, useCallback } from 'react'
import { TAGS } from '../lib/constants'
import type { Task, Subtask } from '../lib/types'
import { IconPlus, IconTrash, Checkbox } from './task-components'

interface EditorSectionProps {
  label: string
  children: React.ReactNode
}

function EditorSection({ label, children }: EditorSectionProps) {
  return (
    <div>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--ink-mute)',
        marginBottom: 10,
      }}>{label}</div>
      {children}
    </div>
  )
}

interface EditorFieldProps {
  label: string
  children: React.ReactNode
}

function EditorField({ label, children }: EditorFieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>{label}</span>
      {children}
    </div>
  )
}

type TextPatch = Partial<Pick<Task, 'title' | 'note'>>

// TaskEditor
export interface TaskEditorProps {
  task: Task
  accent: string
  onChange: (task: Task) => void
  onTextChange: (taskId: string, patch: TextPatch) => void
  onFlushText: (taskId: string) => void
  onDelete: (id: string) => void
  onClose: () => void
  onMoveTask: (id: string, bucketKey: string) => void
}

export function TaskEditor({
  task,
  accent,
  onChange,
  onTextChange,
  onFlushText,
  onDelete,
  onClose,
  onMoveTask,
}: TaskEditorProps) {
  const [draft, setDraft] = useState<Task>(task)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (titleRef.current) titleRef.current.focus()
  }, [])

  useEffect(() => {
    setDraft((current) => {
      if (current.id !== task.id) return task
      if (current.subtasks.length === 0 && task.subtasks.length > 0) {
        return { ...current, subtasks: task.subtasks }
      }
      return current
    })
  }, [task])

  const dateValue = draft.bucketKey.startsWith('__') ? '' : draft.bucketKey

  const flushText = useCallback(() => {
    onFlushText(draft.id)
  }, [draft.id, onFlushText])

  function updateImmediate(patch: Partial<Task>) {
    const next = { ...draft, ...patch }
    setDraft(next)
    onChange(next)
  }

  function updateText(patch: TextPatch) {
    const next = { ...draft, ...patch }
    setDraft(next)
    onTextChange(draft.id, patch)
  }

  function toggleTag(tag: string) {
    const has = draft.tags.includes(tag)
    updateImmediate({ tags: has ? draft.tags.filter((t) => t !== tag) : [...draft.tags, tag] })
  }

  function addSubtask() {
    const newSub: Subtask = {
      id: crypto.randomUUID(),
      taskId: draft.id,
      title: '',
      done: false,
      position: draft.subtasks.length,
    }
    updateImmediate({ subtasks: [...draft.subtasks, newSub] })
  }

  function updateSub(sid: string, patch: Partial<Subtask>) {
    updateImmediate({ subtasks: draft.subtasks.map((s) => s.id === sid ? { ...s, ...patch } : s) })
  }

  function removeSub(sid: string) {
    updateImmediate({ subtasks: draft.subtasks.filter((s) => s.id !== sid) })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      flushText()
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flushText, onClose])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(20,20,17,0.32)',
        display: 'grid', placeItems: 'center',
        padding: 24,
      }}
      onClick={() => { flushText(); onClose() }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 580,
          background: 'var(--bg-raised)',
          borderRadius: 22,
          boxShadow: 'var(--shadow-pop)',
          padding: 28,
          maxHeight: '90vh', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ marginTop: 7, flexShrink: 0 }}>
            <Checkbox checked={draft.done} onChange={(v) => updateImmediate({ done: v })} accent={accent} />
          </span>
          <input
            ref={titleRef}
            value={draft.title}
            onChange={(e) => updateText({ title: e.target.value })}
            onBlur={flushText}
            maxLength={255}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              flushText()
              onClose()
            }}
            placeholder="Nome da tarefa"
            style={{
              flex: 1, border: 'none', outline: 'none',
              background: 'transparent', color: 'var(--ink)',
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
              fontSize: 28, fontWeight: 400, letterSpacing: '-0.01em',
              lineHeight: 1.15,
              textDecoration: draft.done ? 'line-through' : 'none',
              textDecorationColor: 'var(--ink-faint)',
              padding: 0,
            }}
          />
          <button className="ghost-btn" onClick={() => { flushText(); onClose() }} style={{ padding: '4px 9px', fontSize: 18, lineHeight: 1 }}>x</button>
        </div>

        <EditorSection label="Data e periodo">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <EditorField label="Data">
              <input
                type="date"
                value={dateValue}
                onChange={(e) => {
                  const val = e.target.value
                  if (!val) return
                  setDraft((current) => ({ ...current, bucketKey: val }))
                  onMoveTask(draft.id, val)
                }}
                style={{
                  border: '1px solid var(--line-strong)',
                  borderRadius: 8, padding: '5px 10px',
                  background: 'var(--bg-sunken)', color: 'var(--ink)',
                  fontSize: 13, fontFamily: 'var(--font-body)',
                  outline: 'none',
                }}
              />
            </EditorField>
            <EditorField label="Periodo">
              <div style={{ display: 'flex', gap: 4 }}>
                {([['am', 'Manha'], ['pm', 'Tarde']] as [string, string][]).map(([v, label]) => {
                  const active = draft.slot === v
                  return (
                    <button key={v} onClick={() => updateImmediate({ slot: v as 'am' | 'pm' })} style={{
                      padding: '5px 12px', borderRadius: 9999,
                      border: 'none', fontSize: 12, fontWeight: 600,
                      background: active ? (accent || 'var(--accent)') : 'var(--bg-sunken)',
                      color: active ? '#fff' : 'var(--ink-soft)',
                      cursor: 'pointer',
                    }}>{label}</button>
                  )
                })}
              </div>
            </EditorField>
          </div>
        </EditorSection>

        <EditorSection label="Propriedades">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <EditorField label="Prioridade">
              <div style={{ display: 'flex', gap: 4 }}>
                {([
                  [null, '-'],
                  ['high', 'P1'],
                  ['med', 'P2'],
                  ['low', 'P3'],
                ] as [string | null, string][]).map(([v, label]) => {
                  const color = v === 'high' ? 'var(--prio-high)' : v === 'med' ? 'var(--prio-med)' : v === 'low' ? 'var(--prio-low)' : 'var(--ink-mute)'
                  const active = draft.priority === v
                  return (
                    <button key={String(v)} onClick={() => updateImmediate({ priority: v as Task['priority'] })} style={{
                      padding: '5px 10px', borderRadius: 9999,
                      border: 'none', fontSize: 11, fontWeight: 700,
                      background: active ? color : 'var(--bg-sunken)',
                      color: active ? '#fff' : 'var(--ink-soft)',
                      cursor: 'pointer', letterSpacing: '0.04em',
                    }}>{label}</button>
                  )
                })}
              </div>
            </EditorField>
            <EditorField label="Recorrencia">
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {([
                  [null, 'Nenhuma'],
                  ['daily', 'Diaria'],
                  ['weekly', 'Semanal'],
                  ['monthly', 'Mensal'],
                ] as [string | null, string][]).map(([v, label]) => {
                  const active = draft.recurring === v
                  return (
                    <button key={String(v)} onClick={() => updateImmediate({ recurring: v as Task['recurring'] })} style={{
                      padding: '5px 10px', borderRadius: 9999,
                      border: 'none', fontSize: 11, fontWeight: 600,
                      background: active ? 'var(--ink)' : 'var(--bg-sunken)',
                      color: active ? 'var(--bg-raised)' : 'var(--ink-soft)',
                      cursor: 'pointer',
                    }}>{label}</button>
                  )
                })}
              </div>
            </EditorField>
          </div>
        </EditorSection>

        <EditorSection label="Tags">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.entries(TAGS).map(([key, tag]) => {
              const active = draft.tags.includes(key)
              return (
                <button key={key} onClick={() => toggleTag(key)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 9999,
                  border: active ? '1.5px solid var(--ink)' : '1.5px solid var(--line-strong)',
                  background: active ? 'var(--bg-sunken)' : 'transparent',
                  color: 'var(--ink)', fontSize: 12, fontWeight: 500,
                  letterSpacing: '-0.01em', cursor: 'pointer',
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: 9999, background: tag.color, flexShrink: 0 }} />
                  {tag.label}
                </button>
              )
            })}
          </div>
        </EditorSection>

        <EditorSection label={`Subtarefas${draft.subtasks.length > 0 ? ` · ${draft.subtasks.filter((s) => s.done).length}/${draft.subtasks.length}` : ''}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {draft.subtasks.map((s) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Checkbox checked={s.done} onChange={(v) => updateSub(s.id, { done: v })} accent={accent} />
                <input
                  value={s.title}
                  onChange={(e) => updateSub(s.id, { title: e.target.value })}
                  placeholder="Subtarefa..."
                  style={{
                    flex: 1, border: 'none', outline: 'none', background: 'transparent',
                    fontSize: 14, color: 'var(--ink)',
                    textDecoration: s.done ? 'line-through' : 'none',
                    textDecorationColor: 'var(--ink-faint)',
                    padding: '4px 0',
                  }}
                />
                <button className="ghost-btn" onClick={() => removeSub(s.id)} style={{ padding: '3px 6px' }}>
                  <IconTrash />
                </button>
              </div>
            ))}
            <button onClick={addSubtask} className="ghost-btn" style={{
              padding: '6px 8px', fontSize: 12, justifyContent: 'flex-start',
              color: 'var(--ink-mute)',
            }}>
              <IconPlus size={12} /> Adicionar subtarefa
            </button>
          </div>
        </EditorSection>

        <EditorSection label="Notas">
          <textarea
            value={draft.note || ''}
            onChange={(e) => updateText({ note: e.target.value })}
            onBlur={flushText}
            placeholder="Contexto, links, detalhes..."
            rows={3}
            style={{
              width: '100%', resize: 'vertical',
              border: '1px solid var(--line-strong)',
              borderRadius: 10, padding: '10px 12px',
              background: 'var(--bg-sunken)', color: 'var(--ink)',
              fontSize: 13, lineHeight: 1.6, fontFamily: 'var(--font-body)',
              outline: 'none',
            }}
          />
        </EditorSection>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          paddingTop: 12, borderTop: '1px solid var(--line)',
        }}>
          <button
            onClick={() => { onDelete(task.id); onClose() }}
            className="ghost-btn"
            style={{ color: 'var(--prio-high)', fontSize: 12 }}
          >
            <IconTrash /> Excluir
          </button>
          <button onClick={() => { flushText(); onClose() }} className="pill-btn" style={{ fontSize: 13, background: accent || 'var(--accent)' }}>
            Pronto
          </button>
        </div>
      </div>
    </div>
  )
}
