import { db } from './client.js'
import { tags } from './schema.js'

const SEED_TAGS = [
  { id: 'work',     name: 'work',     color: 'oklch(0.82 0.13 90)' },
  { id: 'personal', name: 'personal', color: 'oklch(0.82 0.13 150)' },
  { id: 'urgent',   name: 'urgent',   color: 'oklch(0.82 0.13 30)' },
  { id: 'focus',    name: 'focus',    color: 'oklch(0.82 0.13 260)' },
  { id: 'health',   name: 'health',   color: 'oklch(0.82 0.13 200)' },
  { id: 'errand',   name: 'errand',   color: 'oklch(0.82 0.13 340)' },
]

await db.insert(tags).values(SEED_TAGS).onConflictDoNothing()
console.log('Seeded', SEED_TAGS.length, 'tags')
process.exit(0)
