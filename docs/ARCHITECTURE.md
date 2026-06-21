# Weeklist Architecture

## Visao geral

Weeklist tem quatro superficies executaveis:

1. O frontend Vite/React, iniciado em `src/main.tsx` e composto em `src/components/app.tsx`.
2. A API Hono, iniciada em `server/index.ts`.
3. O PostgreSQL, acessado pelo Drizzle por `server/db/client.ts` e modelado em `server/db/schema.ts`.
4. A CLI Node em `cli/index.js`, que consome a API.

Em producao, o Hono tambem serve os arquivos gerados em `dist/`.

## Mapa de ownership

| Area | Responsabilidade |
|---|---|
| `src/components/` | UI, interacoes, drag-and-drop e composicao das views |
| `src/hooks/` | Queries, mutations, optimistic updates e cache |
| `src/lib/api.ts` | Contrato HTTP usado pelo frontend |
| `src/lib/types.ts` | Tipos de dominio compartilhados no client |
| `src/lib/slot-utils.ts` | Regras puras de slots usadas no client e server |
| `server/routes/` | Validacao HTTP, autorizacao e casos de uso por recurso |
| `server/db/schema.ts` | Fonte de verdade do schema relacional |
| `server/db/migrations/` | SQL gerado pelo Drizzle Kit |
| `styles/tokens.css` | Tokens visuais globais |

## Fluxo HTTP e autenticacao

`server/index.ts` monta `/api/auth` publicamente e protege as familias privadas antes de montar seus routers. O middleware resolve a sessao com `getAuthUser(c)` e disponibiliza o usuario no contexto Hono.

Cada rota protegida deve:

- obter o usuario com `c.get('user')`;
- limitar queries e mutations pelo `user.id`;
- validar que IDs recebidos pertencem ao mesmo usuario antes de alterar dados relacionados.

## Fluxo de tarefas

1. A view chama um hook de `src/hooks/use-tasks.ts`.
2. O hook usa `src/lib/api.ts` para chamar a API.
3. Mutations atualizam caches afetados de forma otimista e guardam snapshot para rollback.
4. A rota Hono valida a entrada e o ownership.
5. Drizzle executa a operacao, usando transacao quando ha reordenacao ou multiplas escritas.
6. A mutation invalida caches derivados para reconciliar o estado do servidor.

As chaves canonicas estao em `taskKeys`. Os principais formatos sao semana, bucket, detalhe, atrasadas e ocupacao. Nao assuma que atualizar apenas `['tasks', 'week']` e suficiente.

## Drag-and-drop

`src/components/app.tsx` possui o unico `DndContext`. Tasks usam `useSortable`; dias, slots e paineis usam `useDroppable`. O metadata do item ou zona informa `type`, `bucketKey` e `slot`, permitindo movimentos entre containers sem depender somente do formato do ID.

O handler calcula a posicao de destino e delega persistencia a `useMoveTask`, que sincroniza as diferentes formas de cache.

## Persistencia e migrations

O schema fica em `server/db/schema.ts`. Toda mudanca segue esta ordem:

1. alterar o schema;
2. gerar SQL com `npm run db:generate`;
3. revisar o SQL gerado;
4. atualizar invariantes afetados;
5. testar em banco nao produtivo;
6. aplicar em producao somente com autorizacao explicita.

Arquivos SQL gerados nao sao editados manualmente.

## Deploy

Railway executa `npm run build` e inicia o servidor com `npm start`. Migrations sao uma operacao separada e nao devem ser pressupostas como parte do deploy.
