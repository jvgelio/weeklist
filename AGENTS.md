# Weeklist — AGENTS.md

## Behavioral Guidelines

### 1. Think Before Coding

Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

### 3. Surgical Changes

Touch only what you must. Clean up only your own mess.

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

### 4. Goal-Driven Execution

Define success criteria. Loop until verified.

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Vite + React 18 + TypeScript |
| API | Hono (Node.js) |
| Banco | PostgreSQL (Railway) |
| ORM | Drizzle ORM |
| Server state | TanStack Query v5 |
| Drag-and-drop | @dnd-kit/core + @dnd-kit/sortable |
| Auth | Google OAuth (sessions via cookie) |
| Testes | Vitest 4.x |
| Deploy | Railway |

## Estrutura de Diretórios

```
src/
  components/
    app.tsx               # Raiz: DndContext, QueryClient, slotPrefs, auth gate
    sidebar.tsx           # Sidebar com mini-calendário e nav de views
    views.tsx             # WeekView, ListView, TagsView, ViewModeToggle
    day-row.tsx           # DayRow, DayColumn, WeekendStrip, WeekendColumnsStrip
    task-components.tsx   # Icon, TaskRow (useSortable), InlineAdd, Checkbox, etc.
    task-editor.tsx       # Modal de edição de tarefa
    settings-modal.tsx    # Modal de configurações (slots am/pm/eve)
    login.tsx             # Tela de login (Google OAuth)
    quick-add.tsx         # Componente de entrada rápida
    highlighted-input.tsx # Input com highlight de NL tokens
  hooks/
    use-tasks.ts   # useWeekTasks, useBucketTasks, useCreateTask, useMoveTask, useAuth, useUpdateSlotPrefs, etc.
    use-tags.ts    # useUserTags, useCreateTag, useDeleteTag, etc.
  lib/
    types.ts         # Task, Subtask, Tag, TaskMap, View, Variant, Slot, SlotPrefs, etc.
    api.ts           # fetch wrappers para /api/*
    constants.ts     # PRIORITY_COLORS, helpers de data
    query-client.ts  # QueryClient singleton
    slot-utils.ts    # firstEnabledSlot, migrateSlot, getDisplaySlot (lógica pura)
    nl-parse.ts      # Parser de linguagem natural para inputs de tarefa
    __tests__/
      slot-utils.test.ts  # Testes unitários para slot-utils
server/
  index.ts           # Hono app: monta rotas, auth middleware, serve dist/
  routes/
    auth.ts          # GET /api/auth/me, /google, /callback, /logout
    tasks.ts         # GET /api/tasks, POST, PATCH /:id, PATCH /:id/move, DELETE /:id
    tags.ts          # GET /api/tags, POST, PATCH /:id, DELETE /:id
    settings.ts      # PATCH /api/settings/slots
  db/
    schema.ts        # Drizzle schema: users, sessions, tags, tasks, subtasks
    client.ts        # Pool Postgres
    migrations/      # SQL gerado pelo drizzle-kit
styles/
  tokens.css         # Design tokens CSS
```

## Comandos

```bash
npm run dev          # Vite (5173) + Hono (3000) em paralelo
npm run build        # Vite build → dist/
npm start            # Produção: Hono serve dist/ + API

# --- CLI Weeklist ---
# Localização: ./cli/index.js
# Uso: node cli/index.js <comando> (ou 'week' se instalado globalmente)
# Comandos: login, list, add, done, rm
# Exemplo: node cli/index.js list tomorrow

npm run db:generate  # drizzle-kit generate → gera SQL em server/db/migrations/
npm run db:migrate   # drizzle-kit migrate  → aplica migrations no banco
npm run db:studio    # drizzle-kit studio   → GUI do banco no browser

npm test             # vitest run --reporter verbose
```

## Variáveis de Ambiente

```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
SESSION_SECRET=...          # segredo para assinar cookies de sessão
PORT=3000                   # Usado pelo Hono em produção (Railway injeta automaticamente)
```

Em dev, crie `.env` na raiz.

## Deploy no Railway

1. Crie um serviço conectado ao repositório
2. Adicione um addon PostgreSQL — Railway injeta `DATABASE_URL` automaticamente
3. Configure Build Command: `npm run build`
4. Configure Start Command: `npm start`
5. Rode as migrations uma vez: `npm run db:migrate` (no Railway shell ou localmente apontando para o banco de produção)

## Convenções

### Tipos
Todos os tipos de domínio ficam em `src/lib/types.ts`. Nunca redefina `Task`, `Subtask`, `Tag`, `TaskMap` em outros arquivos. `SlotPrefs` vive em `slot-utils.ts` e é re-exportado por `types.ts`.

### API Routes
Cada recurso tem seu arquivo em `server/routes/`. Novos recursos ganham novos arquivos — não adicione rotas em `tasks.ts` para outros recursos.

### Autenticação
- `index.ts` registra middleware de auth para `/api/tasks/*`, `/api/tags/*`, `/api/settings/*`
- O middleware chama `getAuthUser(c)` e faz `c.set('user', user)` — rotas protegidas usam `c.get('user')` diretamente (não precisam chamar `getAuthUser` de novo)
- `getAuthUser` lê o cookie de sessão e retorna o `User` do DB ou `null`

### Slot System
- `Task.slot`: `'am' | 'pm' | 'eve' | null`
- `SlotPrefs = { am: boolean; pm: boolean; eve: boolean }` — salvo como colunas `slot_am/slot_pm/slot_eve` na tabela `users`
- `slot-utils.ts` — lógica pura, importável no server e no client
  - `firstEnabledSlot(prefs)` — prioridade: am → pm → eve
  - `migrateSlot(slot, prefs)` — move slot desabilitado para o primeiro habilitado
  - `getDisplaySlot(slot, prefs)` — slot de exibição (tarefas órfãs caem no primeiro habilitado)
- Ao alterar SlotPrefs via `PATCH /api/settings/slots`, o server migra tarefas de date-buckets em transação

### Mutations — sempre com optimistic update
```typescript
// Padrão obrigatório para mutations que afetam a UI imediatamente:
const mutation = useMutation({
  mutationFn: api.someAction,
  onMutate: async (vars) => {
    await qc.cancelQueries({ queryKey: ['tasks'] })
    const snapshot = qc.getQueriesData({ queryKey: ['tasks'] })
    // atualiza cache localmente
    return { snapshot }
  },
  onError: (_err, _vars, ctx) => {
    // rollback
    for (const [key, data] of ctx.snapshot) qc.setQueryData(key, data)
  },
  onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
})
```

### Drag-and-drop
- `TaskRow` usa `useSortable({ id: task.id })` de `@dnd-kit/sortable`
- Day containers usam `useDroppable({ id: bucketKey })` de `@dnd-kit/core`
- Slot zones usam `useDroppable({ id: '${bucketKey}:am' | ':pm' | ':eve' })`
- `DndContext` fica em `app.tsx` — um único contexto para cross-container drags
- `handleDragEnd` distingue bucket keys (regex ISO date ou prefixo `__`) de task IDs

### Migrations
```bash
# 1. Edite server/db/schema.ts
# 2. Gere o SQL:
npm run db:generate
# 3. Aplique:
npm run db:migrate
```
Nunca edite os arquivos `.sql` em `server/db/migrations/` manualmente.

### Cache shapes do TanStack Query
- `['auth', 'me']` → `{ user: User }` — dados do usuário autenticado (inclui `slotAm/slotPm/slotEve`)
- `['tasks', 'week']` → `TaskMap` (devido ao `select: groupByBucket`)
- `['tasks', bucketKey]` → `Task[]`
- `useMoveTask.onMutate` atualiza **ambas** as shapes — não quebre essa lógica

## Bucket Keys

- `2026-04-18` → tarefa agendada para esta data
- `__inbox` → inbox (sem data)
- `__someday` → alguma hora (sem comprometimento)

## DB Schema (tabelas principais)

- `users` — id, googleId, email, name, avatarUrl, createdAt, slotAm, slotPm, slotEve
- `sessions` — id, userId, expiresAt
- `tags` — id (slug), userId, name, color
- `tasks` — id, userId, title, done, bucketKey, slot, priority, recurring, tags (array), note, position, createdAt, updatedAt
- `subtasks` — id, taskId, title, done, position
