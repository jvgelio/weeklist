import { db } from './server/db/client.js'

async function check() {
  try {
    const result = await db.execute(`
      SELECT EXISTS(
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'tags'
      )
    `)
    console.log('Tags table exists:', result.rows[0])
  } catch (err) {
    console.error('Error:', err.message)
  }
  process.exit(0)
}

check()
