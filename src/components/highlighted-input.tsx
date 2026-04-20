import React, { useRef } from 'react'
import type { NLToken, TokenKind } from '../lib/nl-parse'
import { PRIORITY_COLORS } from '../lib/constants'

interface HighlightedInputProps {
  value:           string
  tokens:          NLToken[]
  onChange:        (val: string) => void
  onKeyDown?:      (e: React.KeyboardEvent<HTMLInputElement>) => void
  onBlur?:         () => void
  placeholder?:    string
  inputRef?:       React.RefObject<HTMLInputElement>
  inputClassName?: string
  inputStyle?:     React.CSSProperties
  autoFocus?:      boolean
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
  placeholder,
  inputRef: externalRef,
  inputClassName,
  inputStyle,
  autoFocus,
}: HighlightedInputProps) {
  const mirrorRef = useRef<HTMLDivElement>(null)
  const internalRef = useRef<HTMLInputElement>(null)
  const inputEl = externalRef ?? internalRef

  const segments = buildSegments(value, tokens)

  const sharedStyle: React.CSSProperties = {
    fontFamily:    'inherit',
    fontSize:      'inherit',
    fontWeight:    'inherit',
    lineHeight:    'inherit',
    letterSpacing: 'inherit',
    whiteSpace:    'pre',
    wordBreak:     'break-word',
    ...(inputStyle ?? {}),
  }

  function handleScroll(e: React.UIEvent<HTMLInputElement>) {
    if (mirrorRef.current) {
      mirrorRef.current.scrollLeft = e.currentTarget.scrollLeft
    }
  }

  return (
    <div style={{ position: 'relative', display: 'block' }}>
      {/* Mirror div — visual highlights only */}
      <div
        ref={mirrorRef}
        aria-hidden
        style={{
          ...sharedStyle,
          position:      'absolute',
          inset:         0,
          pointerEvents: 'none',
          overflow:      'hidden',
          color:         'transparent',
          zIndex:        0,
          userSelect:    'none',
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
        {/* Trailing space prevents last-char highlight clipping */}
        {' '}
      </div>

      {/* Real input on top */}
      <input
        ref={inputEl}
        className={inputClassName}
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
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
    </div>
  )
}
