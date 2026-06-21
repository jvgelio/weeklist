# Agent Instructions and Workflow Plan

**Goal:** Consolidar as instrucoes de agentes, organizar a documentacao operacional e estabelecer verificacao e registro de qualidade sustentaveis.

**Scope:** Documentacao do repositorio, classificacao dos planos existentes e scripts npm de typecheck/verificacao. As correcoes de recorrencia e logout ficaram limitadas aos defeitos revelados pelo novo gate; a divida ampla de typecheck do server permanece fora de escopo e registrada em Q-004.

## Tasks

- [x] Inventariar `AGENTS.md`, `CLAUDE.md`, documentos existentes e praticas do Hub47.
- [x] Aprovar `AGENTS.md` como fonte unica e `CLAUDE.md` como import.
- [x] Migrar specs para `docs/specs/`.
- [x] Migrar planos entregues para `docs/plans/completed/`.
- [x] Criar arquitetura, workflow, invariantes e quality score.
- [x] Reescrever as instrucoes do repositorio com referencias progressivas.
- [x] Adicionar scripts de typecheck e `verify`.
- [x] Executar `npm run verify` e revisar o diff completo.
- [x] Atualizar este plano e move-lo para `docs/plans/completed/`.

## Verification

```bash
npm run verify
git diff --check
git status --short
```

Tambem verificar que nao restam referencias a `docs/superpowers/` nem a `settings-modal.tsx` nas instrucoes ativas.

## Result

- `npm run verify`: passou em 2026-06-21 com 37 testes, typecheck de client/config e build Vite.
- `npm run typecheck:server`: executado como diagnostico; baseline preexistente registrado em Q-004.
- `npm audit --omit=dev`: vulnerabilidades de runtime registradas em Q-003.
