# Quality Score

Registro de problemas concretos encontrados fora do escopo imediato. Este arquivo nao substitui issues nem autoriza corrigir itens sem planejamento proporcional ao risco.

## Resumo

| Severidade | Ativos |
|---|---:|
| Alta | 1 |
| Media | 2 |
| Baixa | 1 |

## Registro ativo

| ID | Severidade | Area | Evidencia | Impacto | Correcao esperada | Status |
|---|---|---|---|---|---|---|
| Q-001 | Media | CI | Nao existe workflow em `.github/workflows/` | Mudancas podem chegar ao branch principal sem executar a verificacao padrao | Adicionar CI com instalacao reproduzivel e `npm run verify` | Aberto |
| Q-002 | Baixa | Qualidade estatica | `package.json` nao possui linter nem script `lint` | Parte dos problemas de consistencia e regras React nao e detectada automaticamente | Avaliar e configurar ESLint sem introduzir churn de formatacao | Aberto |
| Q-003 | Alta | Dependencias | `npm audit --omit=dev` reporta vulnerabilidades de severidade alta em `drizzle-orm` e `hono` | Versoes de runtime possuem advisories de injecao, validacao, cache e path traversal; a atualizacao do Drizzle indicada pelo npm e breaking | Planejar upgrades separados, revisar advisories aplicaveis, executar testes de API/migrations e repetir o audit | Aberto |
| Q-004 | Media | TypeScript server | `npm run typecheck:server` falha em tipos Hono, respostas OAuth, testes e seeds | O server e scripts de dados nao possuem um baseline de typecheck utilizavel; regresssoes podem ficar ocultas | Tipar o ambiente Hono compartilhado, validar respostas externas e alinhar seeds ao schema ate o comando passar | Aberto |

## Resolvidos

| ID | Resolvido em | Area | Evidencia | Resultado |
|---|---|---|---|---|
| Q-R001 | 2026-06-21 | Documentacao | `CLAUDE.md` e `AGENTS.md` duplicavam instrucoes e citavam `settings-modal.tsx`, ja removido | `AGENTS.md` tornou-se a fonte unica e a arquitetura volatil foi movida para docs especializadas |
| Q-R002 | 2026-06-21 | Verificacao | Nao havia scripts dedicados de typecheck ou verificacao agregada | Client/config entram no gate agregado; o diagnostico separado do server ficou rastreado em Q-004 |

## Processo de manutencao

### Quando registrar

- O problema e reproduzivel ou possui evidencia objetiva.
- O impacto e real, mas a correcao esta fora do escopo autorizado.
- Nao existe item ativo equivalente.

Nao registre preferencias subjetivas, ideias de produto, tarefas ja planejadas ou observacoes sem impacto explicavel.

### Campos obrigatorios

- **ID:** sequencial no formato `Q-NNN`.
- **Severidade:** Alta, Media ou Baixa.
- **Area:** modulo ou tipo de qualidade afetado.
- **Evidencia:** caminho, linha, comando ou comportamento observavel.
- **Impacto:** o que pode falhar ou ficar mais caro.
- **Correcao esperada:** resultado verificavel, nao uma solucao vaga.
- **Status:** Aberto, Planejado ou Bloqueado.

### Ao resolver

1. Confirme que a verificacao relacionada passa.
2. Remova o item do registro ativo.
3. Adicione-o em Resolvidos com data e resultado.
4. Recalcule o resumo.
5. Inclua o commit quando ele existir.
