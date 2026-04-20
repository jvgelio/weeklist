import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { tasksRouter } from './routes/tasks.js'
import { tagsRouter } from './routes/tags.js'

const app = new Hono()

app.use('/api/*', async (c, next) => {
  const startedAt = performance.now()
  await next()
  const durationMs = performance.now() - startedAt
  c.header('Server-Timing', `app;dur=${durationMs.toFixed(1)}`)
})

// API routes
app.route('/api/tasks', tasksRouter)
app.route('/api/tags', tagsRouter)

// Static files (production — Vite build output)
app.use('/*', serveStatic({ root: './dist' }))

// SPA fallback — serve index.html for any unmatched route
app.use('/*', serveStatic({ path: './dist/index.html' }))

const port = Number(process.env.PORT ?? 3000)
console.log(`Weeklist server running on port ${port}`)

serve({ fetch: app.fetch, port })
