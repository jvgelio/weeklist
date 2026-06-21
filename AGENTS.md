# Weeklist - AI Agent Guide

Este arquivo e a fonte unica de instrucoes para assistentes de codigo neste repositorio. `CLAUDE.md` apenas importa este conteudo.

## Produto

Weeklist e um gerenciador semanal de tarefas com agenda por dia e periodo, inbox, tags, recorrencia, drag-and-drop e uma CLI. O frontend React consome uma API Hono; PostgreSQL e Drizzle persistem dados por usuario.

## Antes de alterar codigo

1. Leia o pedido e declare suposicoes relevantes.
2. Inspecione os arquivos envolvidos, seus consumidores, testes e `git status`.
3. Classifique a tarefa conforme [docs/WORKFLOW.md](docs/WORKFLOW.md).
4. Para feature, mudanca de banco, alteracao ampla ou decisao de UX, escreva um plano em `docs/plans/active/` e obtenha aprovacao antes de implementar.
5. Defina criterios de sucesso e comandos de verificacao.

Para detalhes, consulte somente os documentos relacionados a tarefa:

| Assunto | Fonte |
|---|---|
| Arquitetura e ownership | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Fluxo de trabalho | [docs/WORKFLOW.md](docs/WORKFLOW.md) |
| Regras de dominio | [docs/domain/invariants.md](docs/domain/invariants.md) |
| Divida tecnica | [docs/QUALITY_SCORE.md](docs/QUALITY_SCORE.md) |
| Decisoes aprovadas | `docs/specs/` |
| Planos em andamento | `docs/plans/active/` |
| Planos entregues | `docs/plans/completed/` |

## Principios de execucao

### Pense antes de codificar

- Nao esconda duvidas ou tradeoffs.
- Apresente interpretacoes diferentes quando elas mudarem o resultado.
- Prefira a solucao mais simples que atende ao pedido.
- Pare e pergunte quando uma suposicao arriscada nao puder ser confirmada no repositorio.

### Mude apenas o necessario

- Nao refatore codigo adjacente sem necessidade.
- Preserve o estilo local.
- Remova somente os orfaos criados pela sua mudanca.
- Nao reverta alteracoes preexistentes do usuario.

### Verifique o comportamento

- Bugfix: reproduza com teste quando viavel, veja o teste falhar e depois passar.
- Logica pura: cubra casos normais e limites com Vitest.
- API: teste autorizacao, isolamento por usuario, validacao e resposta.
- UI: verifique estados relevantes e comportamento responsivo quando afetados.
- Banco: valide schema, SQL gerado, ordem de migracao e compatibilidade dos consumidores.

## Comandos

```bash
npm run dev               # Vite 5173 + Hono 3000
npm run build             # Build de producao do frontend
npm start                 # Hono serve API e dist/
npm test                  # Suite Vitest
npm run typecheck         # Client e arquivos de configuracao
npm run typecheck:server  # Diagnostico; divida atual registrada como Q-004
npm run verify            # Typecheck + testes + build

npm run db:generate       # Gera SQL a partir do schema Drizzle
npm run db:migrate        # Aplica migrations em DATABASE_URL
npm run db:studio         # Abre Drizzle Studio
npm run db:seed           # Seed de desenvolvimento
npm run db:seed:perf      # Dataset para performance
npm run perf:baseline     # Mede baseline de performance

node cli/index.js <comando>  # login, list, add, done, rm
```

Nao exija `lint` enquanto o projeto nao tiver linter e script configurados.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Vite, React 18, TypeScript |
| API | Hono em Node.js |
| Banco | PostgreSQL no Railway |
| ORM | Drizzle ORM |
| Server state | TanStack Query v5 |
| Drag-and-drop | dnd-kit |
| Animacao | Framer Motion |
| Auth | Google OAuth com sessao em cookie |
| Testes | Vitest 4 e Testing Library |

## Regras criticas

### Tipos e ownership

- Tipos de dominio compartilhados vivem em `src/lib/types.ts`.
- Logica pura compartilhada entre client e server vive em `src/lib/` e nao pode depender do DOM.
- Novos recursos de API recebem arquivo proprio em `server/routes/`.
- Toda leitura ou escrita de dados protegidos deve ser limitada ao usuario autenticado.

### Autenticacao

- `server/index.ts` protege `/api/tasks/*`, `/api/tags/*` e `/api/settings/*`.
- O middleware chama `getAuthUser(c)` e salva o resultado com `c.set('user', user)`.
- Rotas protegidas usam `c.get('user')`; nao autenticam novamente.
- Novas familias de rotas privadas devem receber middleware equivalente antes de serem montadas.

### TanStack Query

- Mutations que afetam a UI imediatamente usam optimistic update, snapshot, rollback e invalidacao.
- Use `taskKeys` e `tagKeys`; nao crie chaves paralelas ad hoc.
- Mudancas em tarefas devem considerar todas as formas de cache afetadas: semana, bucket, detalhe, atrasadas e ocupacao.
- `useMoveTask` deve manter consistencia entre caches de semana e bucket.

### Slots e drag-and-drop

- Slots validos: `am`, `pm`, `eve` ou `null`.
- `src/lib/slot-utils.ts` e a fonte da logica de fallback e migracao de slots.
- Alterar preferencias de slot migra tarefas datadas na mesma transacao do update do usuario.
- Existe um unico `DndContext`, em `src/components/app.tsx`, para movimentos entre containers.
- Droppables devem carregar `data.type`, `bucketKey` e `slot`; nao dependa apenas de parsing do ID.

### Banco e migrations

- `server/db/schema.ts` e a fonte de verdade do schema.
- Gere migrations com `npm run db:generate`; nunca edite SQL gerado manualmente.
- Nao aplique migration em producao sem autorizacao explicita.
- Mudancas de schema devem atualizar [docs/domain/invariants.md](docs/domain/invariants.md) quando alterarem relacoes ou regras.
- Operacoes de reordenacao ou migracao com multiplas escritas devem ser transacionais.

### CLI e repositório standalone

- A CLI possui um repositório separado em `https://github.com/jvgelio/weeklist-cli.git`.
- Qualquer modificação realizada no diretório `cli/` do repositório principal deve ser replicada e enviada (push) também para o repositório standalone, de modo a atualizar o pacote independente de instalação.

## Variaveis de ambiente

```text
DATABASE_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
SESSION_SECRET
PORT
```

- Nunca registre segredos, cookies ou URLs com credenciais.
- `.env` e `.env.local` sao locais e ignorados pelo Git.
- Railway injeta `PORT` e pode fornecer `DATABASE_URL`.

## Documentacao e planos

- Specs aprovadas ficam em `docs/specs/`.
- Um plano em execucao fica em `docs/plans/active/`.
- Ao terminar, atualize o plano para refletir o que ocorreu e mova-o para `docs/plans/completed/`.
- Nao crie spec ou plano para mudanca trivial, puramente mecanica e de baixo risco.
- Problemas reais encontrados fora do escopo devem ser registrados ou deduplicados em `docs/QUALITY_SCORE.md`; nao os corrija silenciosamente.
- Atualize este arquivo somente para regras estaveis. Detalhes volateis pertencem aos documentos especializados ou ao codigo.

## Conclusao de uma tarefa

Antes de declarar conclusao:

1. Execute as verificacoes proporcionais ao risco; para mudancas amplas, use `npm run verify`. Mudancas no server tambem executam `npm run typecheck:server` e devem relatar a divida conhecida enquanto Q-004 estiver aberto.
2. Leia o diff completo e confira arquivos inesperados, segredos e mudancas fora do escopo.
3. Atualize plano, invariantes e `QUALITY_SCORE.md` quando os gatilhos se aplicarem.
4. Informe o que mudou, quais verificacoes passaram e qualquer risco residual.
