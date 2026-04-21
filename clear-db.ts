import { Pool } from 'pg'

async function clearData() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    await pool.query('TRUNCATE tasks, tags, subtasks CASCADE;')
    console.log('Database cleared.')
  } catch (err) {
    console.error('Error clearing data:', err)
  } finally {
    await pool.end()
  }
}

clearData()
