import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { users, sessions } from '../db/schema.js'

export const authRouter = new Hono()

const clientId = process.env.GOOGLE_CLIENT_ID!
const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
// Em dev, o frontend Vite roda na 5173 e o backend na 3000
// O PUBLIC_URL deve apontar para onde o browser faz o redirecionamento
const redirectUri = `${process.env.PUBLIC_URL || 'http://localhost:5173'}/api/auth/google/callback`

authRouter.get('/google', (c) => {
  const cliPort = c.req.query('cli_port')
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('access_type', 'online')
  
  if (cliPort) {
    url.searchParams.set('state', JSON.stringify({ cli_port: cliPort }))
  }
  
  return c.redirect(url.toString())
})

authRouter.get('/google/callback', async (c) => {
  const code = c.req.query('code')
  const stateStr = c.req.query('state')
  let cliPort: string | null = null

  if (stateStr) {
    try {
      const state = JSON.parse(stateStr)
      cliPort = state.cli_port
    } catch (e) {}
  }

  if (!code) return c.json({ error: 'No code provided' }, 400)

  // 1. Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    console.error('Token error:', err)
    return c.json({ error: 'Failed to exchange token' }, 400)
  }

  const { access_token } = await tokenRes.json()

  // 2. Fetch user info
  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  })

  if (!userRes.ok) {
    return c.json({ error: 'Failed to fetch user info' }, 400)
  }

  const userInfo = await userRes.json()
  const googleId = userInfo.id
  const email = userInfo.email
  const name = userInfo.name
  const avatarUrl = userInfo.picture

  // 3. Upsert user
  let [user] = await db.select().from(users).where(eq(users.googleId, googleId))

  if (!user) {
    const id = randomUUID()
    const [newUser] = await db.insert(users).values({
      id,
      googleId,
      email,
      name,
      avatarUrl,
    }).returning()
    user = newUser
  }

  // 4. Create session
  const sessionId = randomUUID()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30) // 30 days

  await db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    expiresAt,
  })

  // 5. Set cookie
  setCookie(c, 'session_id', sessionId, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    expires: expiresAt,
  })

  if (cliPort) {
    return c.redirect(`http://localhost:${cliPort}?session_id=${sessionId}`)
  }

  // Redirect to app
  return c.redirect('/')
})

authRouter.get('/me', async (c) => {
  const sessionId = getCookie(c, 'session_id')
  if (!sessionId) return c.json({ user: null })

  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId))
  if (!session || session.expiresAt < new Date()) {
    return c.json({ user: null })
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.userId))
  if (!user) return c.json({ user: null })

  return c.json({ user })
})

authRouter.post('/logout', async (c) => {
  const sessionId = getCookie(c, 'session_id')
  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId))
    deleteCookie(c, 'session_id', { path: '/' })
  }
  return c.json({ success: true })
})

// Middleware helper
export async function getAuthUser(c: any) {
  const sessionId = getCookie(c, 'session_id')
  if (!sessionId) return null

  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId))
  if (!session || session.expiresAt < new Date()) return null

  const [user] = await db.select().from(users).where(eq(users.id, session.userId))
  return user || null
}
