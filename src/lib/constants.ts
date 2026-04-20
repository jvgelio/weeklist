// Tag definitions (colors reference CSS custom properties from tokens.css)
export const TAGS: Record<string, { label: string; color: string }> = {
  work:     { label: 'work',     color: 'var(--tag-work)' },
  personal: { label: 'personal', color: 'var(--tag-personal)' },
  urgent:   { label: 'urgent',   color: 'var(--tag-urgent)' },
  focus:    { label: 'focus',    color: 'var(--tag-focus)' },
  health:   { label: 'health',   color: 'var(--tag-health)' },
  errand:   { label: 'errand',   color: 'var(--tag-errand)' },
}

export const PRIORITY_COLORS: Record<string, string> = {
  high: '#d63b2a',
  med:  '#e88a0a',
  low:  '#7b7b74',
}

export const DAY_NAMES_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export const DAY_NAMES_LONG_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const MONTH_PT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
export const MONTH_PT_LONG = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']

export const DAY_INDEX_PT: Record<string, number> = {
  dom: 0, domingo: 0,
  seg: 1, segunda: 1,
  ter: 2, terça: 2, terca: 2,
  qua: 3, quarta: 3,
  qui: 4, quinta: 4,
  sex: 5, sexta: 5,
  sáb: 6, sab: 6, sábado: 6, sabado: 6,
}

export function startOfWeek(date: Date, weekStart = 1): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = (day - weekStart + 7) % 7
  d.setDate(d.getDate() - diff)
  return d
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function isoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function sameDay(a: Date, b: Date): boolean {
  return isoDate(a) === isoDate(b)
}
