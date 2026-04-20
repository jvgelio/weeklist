import { addDays, isoDate, startOfWeek, MONTH_PT, MONTH_PT_LONG, DAY_INDEX_PT } from './constants'

export type TokenKind = 'date' | 'slot' | 'priority' | 'tag'

export interface NLToken {
  kind:      TokenKind
  start:     number
  end:       number
  raw:       string
  date?:     string
  slot?:     'am' | 'pm'
  priority?: 'high' | 'med' | 'low'
  tag?:      string
  label:     string
}

export interface NLParseResult {
  cleanTitle: string
  tokens:     NLToken[]
  date:       string | null
  slot:       'am' | 'pm' | null
  priority:   'high' | 'med' | 'low' | null
  tags:       string[]
}

export interface NLParsedData {
  priority: 'high' | 'med' | 'low' | null
  tags:     string[]
  slot:     'am' | 'pm' | null
  date:     string | null
}

// Build alternation strings from month arrays
const SHORT_MONTHS = MONTH_PT.join('|')
const LONG_MONTHS = MONTH_PT_LONG.join('|')
const ALL_MONTHS = `${LONG_MONTHS}|${SHORT_MONTHS}`

// Build weekday alternation from DAY_INDEX_PT keys (longest first to avoid partial matches)
const WEEKDAY_KEYS = Object.keys(DAY_INDEX_PT).sort((a, b) => b.length - a.length)
const WEEKDAY_ALT = WEEKDAY_KEYS.join('|')

function normalizeDayName(raw: string): number | null {
  const key = raw.toLowerCase()
    .replace(/á/g, 'a').replace(/ã/g, 'a').replace(/ç/g, 'c')
    .replace(/-feira$/, '')
    .trim()
  if (key in DAY_INDEX_PT) return DAY_INDEX_PT[key]
  // Try without accent normalization too
  const lower = raw.toLowerCase().replace(/-feira$/, '').trim()
  if (lower in DAY_INDEX_PT) return DAY_INDEX_PT[lower]
  return null
}

function resolveWeekday(dayIndex: number, hasPróximo: boolean, today: Date): Date {
  const diff = (dayIndex - today.getDay() + 7) % 7
  const daysToNearest = diff === 0 ? 7 : diff
  return addDays(today, hasPróximo ? daysToNearest + 7 : daysToNearest)
}

function monthIndexFromName(name: string): number {
  const lower = name.toLowerCase()
  const shortIdx = MONTH_PT.indexOf(lower)
  if (shortIdx !== -1) return shortIdx
  const longIdx = MONTH_PT_LONG.indexOf(lower)
  if (longIdx !== -1) return longIdx
  return -1
}

function resolveDate(year: number, month: number, day: number): string {
  return isoDate(new Date(year, month, day))
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

interface RuleMatch {
  start:  number
  end:    number
  raw:    string
  token:  Omit<NLToken, 'start' | 'end' | 'raw'>
}

type Rule = (input: string, today: Date, weekStart: Date) => RuleMatch[]

function makeRule(regex: RegExp, handler: (m: RegExpExecArray, today: Date, weekStart: Date) => Omit<NLToken, 'start' | 'end' | 'raw'> | null): Rule {
  return (input, today, weekStart) => {
    const results: RuleMatch[] = []
    const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g')
    let m: RegExpExecArray | null
    while ((m = re.exec(input)) !== null) {
      const token = handler(m, today, weekStart)
      if (token) {
        results.push({ start: m.index, end: m.index + m[0].length, raw: m[0], token })
      }
    }
    return results
  }
}

// Rules ordered by priority (highest specificity first)
const RULES: Rule[] = [
  // 1. Explicit date with year: 27/01/2025, 2025-01-27, 27.01.2025
  makeRule(
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})|(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/gi,
    (m, today) => {
      let year: number, month: number, day: number
      if (m[1]) {
        year = parseInt(m[1]); month = parseInt(m[2]) - 1; day = parseInt(m[3])
      } else {
        day = parseInt(m[4]); month = parseInt(m[5]) - 1; year = parseInt(m[6])
      }
      if (month < 0 || month > 11 || day < 1 || day > 31) return null
      const iso = resolveDate(year, month, day)
      return { kind: 'date', date: iso, label: iso }
    }
  ),

  // 2. Date with month name: "27 jan", "27 janeiro", "3 fevereiro"
  makeRule(
    new RegExp(`(\\d{1,2})\\s+(${ALL_MONTHS})(?:\\s+(\\d{4}))?`, 'gi'),
    (m, today) => {
      const day = parseInt(m[1])
      const monthIdx = monthIndexFromName(m[2])
      if (monthIdx === -1 || day < 1 || day > 31) return null
      const year = m[3] ? parseInt(m[3]) : today.getFullYear()
      const iso = resolveDate(year, monthIdx, day)
      return { kind: 'date', date: iso, label: `${day} ${MONTH_PT[monthIdx]}` }
    }
  ),

  // 3. Short date: 27/01 or 27/1 (no year)
  makeRule(
    /(\d{1,2})\/(\d{1,2})(?!\d)/gi,
    (m, today) => {
      const day = parseInt(m[1]); const month = parseInt(m[2]) - 1
      if (month < 0 || month > 11 || day < 1 || day > 31) return null
      let year = today.getFullYear()
      const candidate = new Date(year, month, day)
      if (candidate < today) year++
      const iso = resolveDate(year, month, day)
      return { kind: 'date', date: iso, label: `${day}/${m[2]}` }
    }
  ),

  // 4. "dia N" → Nth day of current month
  makeRule(
    /\bdia\s+(\d{1,2})\b/gi,
    (m, today) => {
      const day = parseInt(m[1])
      if (day < 1 || day > 31) return null
      let year = today.getFullYear(); let month = today.getMonth()
      if (day < today.getDate()) { month++; if (month > 11) { month = 0; year++ } }
      const iso = resolveDate(year, month, day)
      return { kind: 'date', date: iso, label: `dia ${day}` }
    }
  ),

  // 5. "em N dias" / "em N semanas"
  makeRule(
    /\bem\s+(\d+)\s+(dias?|semanas?)\b/gi,
    (m, today) => {
      const n = parseInt(m[1])
      const unit = m[2].toLowerCase()
      const days = unit.startsWith('semana') ? n * 7 : n
      const iso = isoDate(addDays(today, days))
      return { kind: 'date', date: iso, label: `+${n}${unit.startsWith('semana') ? 'sem' : 'd'}` }
    }
  ),

  // 6. "+N dias" / "+N semanas"
  makeRule(
    /\+(\d+)\s*(dias?|semanas?)/gi,
    (m, today) => {
      const n = parseInt(m[1])
      const unit = m[2].toLowerCase()
      const days = unit.startsWith('semana') ? n * 7 : n
      const iso = isoDate(addDays(today, days))
      return { kind: 'date', date: iso, label: `+${n}${unit.startsWith('semana') ? 'sem' : 'd'}` }
    }
  ),

  // 7. "próxima semana" → weeklist bucket for next week
  makeRule(
    /\bpr[oó]xima?\s+semana\b/gi,
    (m, _today, weekStart) => {
      const nextWeek = addDays(weekStart, 7)
      const iso = `weeklist-${isoDate(startOfWeek(nextWeek, 1))}`
      return { kind: 'date', date: iso, label: 'próx. semana' }
    }
  ),

  // 8. "próximo mês"
  makeRule(
    /\bpr[oó]ximo?\s+m[eê]s\b/gi,
    (m, today) => {
      let month = today.getMonth() + 1; let year = today.getFullYear()
      if (month > 11) { month = 0; year++ }
      const iso = resolveDate(year, month, today.getDate())
      return { kind: 'date', date: iso, label: 'próx. mês' }
    }
  ),

  // 9. "final do mês"
  makeRule(
    /\bfinal\s+do\s+m[eê]s\b/gi,
    (m, today) => {
      const last = lastDayOfMonth(today.getFullYear(), today.getMonth())
      const iso = resolveDate(today.getFullYear(), today.getMonth(), last)
      return { kind: 'date', date: iso, label: 'final do mês' }
    }
  ),

  // 10. "este fim de semana" → next Saturday / "próximo fim de semana" → Saturday+7
  makeRule(
    /\b(este|pr[oó]ximo)\s+fim\s+de\s+semana\b/gi,
    (m, today) => {
      const isPróximo = /pr[oó]ximo/.test(m[1])
      const saturdayIdx = 6
      const diff = (saturdayIdx - today.getDay() + 7) % 7 || 7
      const days = isPróximo ? diff + 7 : diff
      const iso = isoDate(addDays(today, days))
      return { kind: 'date', date: iso, label: isPróximo ? 'próx. fds' : 'este fds' }
    }
  ),

  // 11. Named weekday with optional "próximo/próxima" prefix
  makeRule(
    new RegExp(`\\b(pr[oó]xim[ao]\\s+)?(${WEEKDAY_ALT})(?:-feira)?\\b`, 'gi'),
    (m, today) => {
      const hasPróximo = !!m[1]
      // m[2] is the captured day name (without -feira suffix handled by optional group above)
      const rawDay = m[0].replace(/^pr[oó]xim[ao]\s+/i, '').replace(/-feira$/i, '').trim()
      const dayIdx = normalizeDayName(rawDay)
      if (dayIdx === null) return null
      const resolved = resolveWeekday(dayIdx, hasPróximo, today)
      const iso = isoDate(resolved)
      return { kind: 'date', date: iso, label: rawDay.toLowerCase() }
    }
  ),

  // 12. hoje / tod
  makeRule(
    /\b(hoje|tod)\b/gi,
    (m, today) => ({ kind: 'date', date: isoDate(today), label: 'hoje' })
  ),

  // 13. amanhã / amanhan / tom
  makeRule(
    /\b(amanh[ãa]|tom)\b/gi,
    (m, today) => ({ kind: 'date', date: isoDate(addDays(today, 1)), label: 'amanhã' })
  ),

  // 14. "de manhã" → AM slot
  makeRule(
    /\bde\s+manh[ãa]\b/gi,
    () => ({ kind: 'slot', slot: 'am', label: 'manhã' })
  ),

  // 15. "de tarde" / "de noite" → PM slot
  makeRule(
    /\bde\s+(tarde|noite)\b/gi,
    () => ({ kind: 'slot', slot: 'pm', label: 'tarde' })
  ),

  // 16. p1/p2/p3 → priority (not inside a word, not preceded by # or letters)
  makeRule(
    /(?<![#\w])p([123])(?!\w)/gi,
    (m) => {
      const map: Record<string, 'high' | 'med' | 'low'> = { '1': 'high', '2': 'med', '3': 'low' }
      const p = map[m[1]]
      return { kind: 'priority', priority: p, label: `p${m[1]}` }
    }
  ),

  // 17. #tag
  makeRule(
    /#([\w\u00C0-\u024F]+)/gi,
    (m) => ({ kind: 'tag', tag: m[1].toLowerCase(), label: `#${m[1].toLowerCase()}` })
  ),
]

export function parseNL(input: string, today: Date, weekStart: Date): NLParseResult {
  if (!input.trim()) {
    return { cleanTitle: '', tokens: [], date: null, slot: null, priority: null, tags: [] }
  }

  const consumed = new Array(input.length).fill(false)
  const tokens: NLToken[] = []

  for (const rule of RULES) {
    const matches = rule(input, today, weekStart)
    for (const { start, end, raw, token } of matches) {
      // Skip if any position already consumed
      let overlap = false
      for (let i = start; i < end; i++) {
        if (consumed[i]) { overlap = true; break }
      }
      if (overlap) continue
      for (let i = start; i < end; i++) consumed[i] = true
      tokens.push({ ...token, start, end, raw })
    }
  }

  // Sort tokens by start position
  tokens.sort((a, b) => a.start - b.start)

  // Build cleanTitle: join non-consumed segments
  let cleanTitle = ''
  let i = 0
  while (i < input.length) {
    if (!consumed[i]) {
      cleanTitle += input[i]
      i++
    } else {
      // Skip the consumed token span
      const tok = tokens.find(t => t.start === i)
      if (tok) i = tok.end
      else i++
    }
  }
  cleanTitle = cleanTitle.replace(/\s{2,}/g, ' ').trim()

  // Assemble resolved fields (last wins for date/priority/slot)
  let date: string | null = null
  let slot: 'am' | 'pm' | null = null
  let priority: 'high' | 'med' | 'low' | null = null
  const tags: string[] = []

  for (const tok of tokens) {
    if (tok.kind === 'date' && tok.date) date = tok.date
    if (tok.kind === 'slot' && tok.slot) slot = tok.slot
    if (tok.kind === 'priority' && tok.priority) priority = tok.priority
    if (tok.kind === 'tag' && tok.tag && !tags.includes(tok.tag)) tags.push(tok.tag)
  }

  return { cleanTitle, tokens, date, slot, priority, tags }
}
