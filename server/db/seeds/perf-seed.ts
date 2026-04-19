import { randomUUID } from 'node:crypto'
import { db } from '../client.js'
import { tasks, subtasks } from '../schema.js'

interface TaskInsert {
  id: string
  title: string
  done: boolean
  bucketKey: string
  slot: 'am' | 'pm'
  priority: 'high' | 'med' | 'low' | null
  recurring: 'daily' | 'weekly' | 'monthly' | null
  tags: string[]
  note: string | null
  position: number
  createdAt: Date
  updatedAt: Date
}

interface SubtaskInsert {
  id: string
  taskId: string
  title: string
  done: boolean
  position: number
}

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = (day + 6) % 7 // Monday as week start
  d.setDate(d.getDate() - diff)
  return d
}

function isoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

async function insertInChunks<T>(rows: T[], chunkSize: number, insertFn: (chunk: T[]) => Promise<void>) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    await insertFn(rows.slice(i, i + chunkSize))
  }
}

async function main() {
  const totalTasks = Number(process.env.PERF_SEED_TASKS ?? 2_000)
  const baseWeekStart = startOfWeek(new Date())
  const dayBuckets = Array.from({ length: 7 }, (_, idx) => {
    const d = new Date(baseWeekStart)
    d.setDate(baseWeekStart.getDate() + idx)
    return isoDate(d)
  })
  const weeklistBucket = `weeklist-${isoDate(baseWeekStart)}`
  const buckets = [...dayBuckets, weeklistBucket, '__inbox', '__someday']

  const positions = new Map<string, number>()
  const nextPosition = (bucketKey: string) => {
    const current = positions.get(bucketKey) ?? 0
    positions.set(bucketKey, current + 1)
    return current
  }

  const taskRows: TaskInsert[] = []
  const subtaskRows: SubtaskInsert[] = []
  const now = new Date()

  for (let i = 0; i < totalTasks; i++) {
    const bucketKey = buckets[i % buckets.length]
    const id = randomUUID()

    taskRows.push({
      id,
      title: `Perf task ${String(i + 1).padStart(4, '0')}`,
      done: i % 5 === 0,
      bucketKey,
      slot: i % 3 === 0 ? 'pm' : 'am',
      priority: i % 11 === 0 ? 'high' : i % 7 === 0 ? 'med' : i % 5 === 0 ? 'low' : null,
      recurring: i % 23 === 0 ? 'weekly' : null,
      tags: i % 4 === 0 ? ['work'] : i % 6 === 0 ? ['personal'] : [],
      note: i % 9 === 0 ? 'Seeded note for performance scenario.' : null,
      position: nextPosition(bucketKey),
      createdAt: now,
      updatedAt: now,
    })

    if (i % 4 === 0) {
      subtaskRows.push(
        {
          id: randomUUID(),
          taskId: id,
          title: `Subtask A for ${i + 1}`,
          done: false,
          position: 0,
        },
        {
          id: randomUUID(),
          taskId: id,
          title: `Subtask B for ${i + 1}`,
          done: i % 8 === 0,
          position: 1,
        },
      )
    }
  }

  await db.transaction(async (tx) => {
    await tx.delete(subtasks)
    await tx.delete(tasks)
  })

  await insertInChunks(taskRows, 250, async (chunk) => {
    await db.insert(tasks).values(chunk)
  })

  await insertInChunks(subtaskRows, 500, async (chunk) => {
    await db.insert(subtasks).values(chunk)
  })

  console.log(`Perf seed complete: ${taskRows.length} tasks, ${subtaskRows.length} subtasks.`)
  console.log(`Week bucket: ${weeklistBucket}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
