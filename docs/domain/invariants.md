# Domain Invariants

## Usuarios e sessoes

- Dados de tasks e tags pertencem a exatamente um usuario.
- Rotas protegidas recebem o usuario autenticado do middleware Hono.
- IDs enviados pelo cliente nunca substituem o `user.id` como criterio de ownership.
- Sessoes pertencem a um usuario e sao removidas em cascata quando ele e excluido.

## Bucket keys

- Uma data agendada usa ISO local no formato `YYYY-MM-DD`.
- `__inbox` representa tarefa sem data definida.
- `__someday` representa tarefa sem compromisso de data.
- Chaves iniciadas por `__` nao sao tratadas como datas.
- Filtros de atrasadas e ocupacao operam somente sobre bucket keys com formato de data.

## Posicao

- `position` define a ordem dentro do bucket do usuario.
- Movimentos entre buckets atualizam origem e destino de forma transacional.
- Reordenacoes devem manter posicoes deterministicas e nao podem alterar tarefas de outro usuario.

## Slots

- `Task.slot` aceita `am`, `pm`, `eve` ou `null`.
- Preferencias do usuario sao armazenadas em `slot_am`, `slot_pm` e `slot_eve`.
- A prioridade de fallback e `am`, depois `pm`, depois `eve`.
- `firstEnabledSlot`, `migrateSlot` e `getDisplaySlot` vivem em `src/lib/slot-utils.ts`.
- Ao desabilitar um slot, tarefas com bucket de data sao migradas na mesma transacao da preferencia.
- Buckets especiais nao sao migrados pela alteracao de preferencias.

## Tags

- O cadastro de tags e limitado ao usuario autenticado.
- Tasks armazenam IDs de tags em um array; alteracoes no cadastro devem considerar referencias existentes nas tasks.
- Mutations de tags invalidam tanto o cache de tags quanto caches de tasks quando a exibicao pode mudar.

## Subtasks

- Subtasks pertencem a uma task e herdam seu ownership.
- Qualquer operacao direta por ID deve confirmar o ownership atraves da task pai.
- A ordem e definida por `position` dentro da task.

## Cache do frontend

- `taskKeys` e `tagKeys` sao as fabricas canonicas de query keys.
- Optimistic updates guardam snapshot antes da alteracao e restauram no erro.
- Mudancas em tasks podem afetar semana, bucket, detalhe, atrasadas e ocupacao.
- Atualizar slots tambem atualiza `['auth', 'me']` e invalida listas de tasks afetadas.

## Schema e migrations

- `server/db/schema.ts` e a fonte de verdade.
- SQL em `server/db/migrations/` e gerado pelo Drizzle Kit.
- Migrations aplicadas nao sao reescritas.
- Mudancas destrutivas exigem estrategia explicita para consumidores e dados existentes.
- Migrations de producao exigem autorizacao explicita e nao fazem parte automatica do deploy.
