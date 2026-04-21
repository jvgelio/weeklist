import React, { useEffect, useMemo, useRef } from 'react'
import type { NLToken, TokenKind } from '../lib/nl-parse'
import { PRIORITY_COLORS } from '../lib/constants'

type HighlightedInputElement = HTMLInputElement | HTMLTextAreaElement

interface HighlightedInputProps {
  value:           string
  tokens:          NLToken[]
  onChange:        (val: string) => void
  onKeyDown?:      (e: React.KeyboardEvent<HighlightedInputElement>) => void
  onBlur?:         (e: React.FocusEvent<HighlightedInputElement>) => void
  onFocus?:        (e: React.FocusEvent<HighlightedInputElement>) => void
  placeholder?:    string
  inputRef?:       React.MutableRefObject<HighlightedInputElement | null>
  inputClassName?: string
  inputStyle?:     React.CSSProperties
  autoFocus?:      boolean
  multiline?:      boolean
  rows?:           number
  autoGrow?:       boolean
  maxHeight?:      number
}

const BASE_TOKEN_BG: Record<TokenKind, string> = {
  date:     'rgba(56,189,248,0.22)',
  slot:     'rgba(56,189,248,0.13)',
  priority: 'rgba(214,59,42,0.18)',
  tag:      'rgba(167,139,250,0.22)',
}

function tokenBg(tok: NLToken): string {
  if (tok.kind === 'priority' && tok.priority) {
    const hex = PRIORITY_COLORS[tok.priority]
    return `${hex}30`
  }
  return BASE_TOKEN_BG[tok.kind]
}

interface Segment {
  text:   string
  token?: NLToken
}

function buildSegments(value: string, tokens: NLToken[]): Segment[] {
  const sorted = [...tokens].sort((a, b) => a.start - b.start)
  const segs: Segment[] = []
  let cursor = 0
  for (const tok of sorted) {
    if (tok.start > cursor) segs.push({ text: value.slice(cursor, tok.start) })
    segs.push({ text: value.slice(tok.start, tok.end), token: tok })
    cursor = tok.end
  }
  if (cursor < value.length) segs.push({ text: value.slice(cursor) })
  return segs
}

export function HighlightedInput({
  value,
  tokens,
  onChange,
  onKeyDown,
  onBlur,
  onFocus,
  placeholder,
  inputRef: externalRef,
  inputClassName,
  inputStyle,
  autoFocus,
  multiline = false,
  rows = 1,
  autoGrow = false,
  maxHeight = 240,
  maxLength,
}: HighlightedInputProps & { maxLength?: number }) {
  const mirrorRef = useRef<HTMLDivElement>(null)
  const internalRef = useRef<HighlightedInputElement | null>(null)
  const inputEl = externalRef ?? internalRef

  const segments = useMemo(() => buildSegments(value, tokens), [value, tokens])

  useEffect(() => {
    if (!multiline || !autoGrow) return

    const el = inputEl.current
    if (!(el instanceof HTMLTextAreaElement)) return

    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [autoGrow, inputEl, maxHeight, multiline, value])

  const sharedStyle: React.CSSProperties = {
    fontFamily:    'inherit',
    fontSize:      'inherit',
    fontWeight:    'inherit',
    lineHeight:    'inherit',
    letterSpacing: 'inherit',
    whiteSpace:    multiline ? 'pre-wrap' : 'pre',
    wordBreak:     'break-word',
    overflowWrap:  'anywhere',
    ...(inputStyle ?? {}),
  }

  function handleScroll(e: React.UIEvent<HighlightedInputElement>) {
    if (mirrorRef.current) {
      mirrorRef.current.scrollLeft = e.currentTarget.scrollLeft
      mirrorRef.current.scrollTop = e.currentTarget.scrollTop
    }
  }

  const mirrorFiller = multiline ? '\n' : ' '
  const assignRef = (node: HighlightedInputElement | null) => {
    inputEl.current = node
  }

  return (
    <div style={{ position: 'relative', display: 'block' }}>
      <div
        ref={mirrorRef}
        aria-hidden
        style={{
          ...sharedStyle,
          position:       'absolute',
          inset:          0,
          pointerEvents:  'none',
          overflow:       multiline ? 'auto' : 'hidden',
          color:          'transparent',
          zIndex:         0,
          userSelect:     'none',
          scrollbarWidth: 'none',
          msOverflowStyle:'none',
        }}
      >
        {segments.map((seg, i) =>
          seg.token ? (
            <mark
              key={i}
              style={{
                background:   tokenBg(seg.token),
                color:        'transparent',
                borderRadius: 3,
                padding:      0,
                display:      'inline',
              }}
            >
              {seg.text}
            </mark>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
        {mirrorFiller}
      </div>

      {multiline ? (
        <textarea
          ref={assignRef}
          className={inputClassName}
          value={value}
          placeholder={placeholder}
          autoFocus={autoFocus}
          maxLength={maxLength}
          rows={rows}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          onFocus={onFocus}
          onScroll={handleScroll}
          style={{
            ...sharedStyle,
            position:   'relative',
            zIndex:     1,
            background: 'transparent',
            caretColor: 'var(--ink)',
            width:      '100%',
            resize:     'none',
          }}
        />
      ) : (
        <input
          ref={assignRef}
          className={inputClassName}
          value={value}
          placeholder={placeholder}
          autoFocus={autoFocus}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          onFocus={onFocus}
          onScroll={handleScroll}
          style={{
            ...sharedStyle,
            position:   'relative',
            zIndex:     1,
            background: 'transparent',
            caretColor: 'var(--ink)',
            width:      '100%',
          }}
        />
      )}
    </div>
  )
}
