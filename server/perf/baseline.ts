function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = (day + 6) % 7 // Monday
  d.setDate(d.getDate() - diff)
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function isoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function percentile(samples: number[], p: number): number {
  if (samples.length === 0) return 0
  const sorted = [...samples].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[idx]
}

function parseServerTimingDuration(headerValue: string | null): number | null {
  if (!headerValue) return null
  const match = headerValue.match(/dur=([\d.]+)/)
  if (!match) return null
  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? parsed : null
}

async function main() {
  const baseUrl = process.env.PERF_BASE_URL ?? 'http://localhost:3000'
  const samples = Number(process.env.PERF_SAMPLES ?? 40)

  const weekStart = startOfWeek(new Date())
  const from = isoDate(weekStart)
  const to = isoDate(addDays(weekStart, 6))

  const endpoint = `${baseUrl}/api/tasks?from=${from}&to=${to}&includeSubtasks=false`

  const clientDurations: number[] = []
  const serverDurations: number[] = []
  let payloadBytes = 0

  for (let i = 0; i < samples; i++) {
    const startedAt = performance.now()
    const res = await fetch(endpoint)
    const body = await res.text()
    const elapsed = performance.now() - startedAt
    if (!res.ok) {
      throw new Error(`Request failed (${res.status}): ${body}`)
    }

    const serverDuration = parseServerTimingDuration(res.headers.get('Server-Timing'))
    if (serverDuration !== null) serverDurations.push(serverDuration)
    clientDurations.push(elapsed)
    payloadBytes = body.length
  }

  console.log(`Endpoint: ${endpoint}`)
  console.log(`Samples: ${samples}`)
  console.log(`Payload bytes: ${payloadBytes}`)
  console.log(`Client p50: ${percentile(clientDurations, 50).toFixed(1)}ms`)
  console.log(`Client p95: ${percentile(clientDurations, 95).toFixed(1)}ms`)

  if (serverDurations.length > 0) {
    console.log(`Server p50: ${percentile(serverDurations, 50).toFixed(1)}ms`)
    console.log(`Server p95: ${percentile(serverDurations, 95).toFixed(1)}ms`)
  } else {
    console.log('Server timing header was not present in responses.')
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
