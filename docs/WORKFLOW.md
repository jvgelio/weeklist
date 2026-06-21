# Weeklist Workflow

## 1. Classifique a tarefa

| Tipo | Planejamento | Verificacao minima |
|---|---|---|
| Trivial/documental | Nota curta, sem plano persistido | Diff e links/comandos citados |
| Bug | Reproducao e causa raiz | Teste de regressao, testes relacionados e typecheck |
| Feature | Spec quando houver decisao de produto/UX; plano aprovado | Testes relacionados, typecheck e build |
| UI/UX | Spec ou referencia visual quando a decisao nao estiver fechada | Testes, desktop/mobile e build |
| API/autorizacao | Plano se alterar contrato ou ownership | Testes de rota, isolamento por usuario e typecheck |
| Banco/migration | Plano e aprovacao obrigatorios | SQL revisado, teste em banco seguro, testes e build |
| Refactor amplo | Plano com comportamento preservado | Baseline antes/depois e `npm run verify` |

Mudancas pequenas nao precisam de cerimonia artificial. A necessidade de plano cresce com ambiguidade, risco e blast radius.

## 2. Investigue antes de propor

1. Leia os arquivos diretamente envolvidos.
2. Trace consumidores e contratos compartilhados.
3. Procure testes e documentacao relacionada.
4. Confira `git status` e preserve mudancas preexistentes.
5. Declare suposicoes que nao puderem ser verificadas.

Para bugs, encontre a causa raiz antes de editar. Para mudancas de banco, busque todos os leitores e escritores do campo ou tabela afetada.

## 3. Defina sucesso

Transforme o pedido em resultados observaveis. Exemplos:

- "corrigir movimento" vira um teste que reproduz origem, destino, slot e posicao;
- "adicionar endpoint" vira contrato de entrada, resposta, autorizacao e ownership;
- "alterar schema" vira schema, migration gerada, compatibilidade e rollback operacional;
- "melhorar UI" vira estados, breakpoints e interacoes que devem ser conferidos.

## 4. Planeje e obtenha aprovacao

Planos ficam em `docs/plans/active/YYYY-MM-DD-<slug>.md` e devem conter:

- objetivo e fora de escopo;
- arquivos afetados;
- passos executaveis;
- verificacao por etapa;
- riscos de dados, autorizacao ou compatibilidade.

Features, migrations, refactors amplos e decisoes de UX exigem aprovacao antes da implementacao. Correcoes pequenas e inequivocas podem seguir com um plano curto na conversa.

## 5. Implemente em ciclos verificaveis

- Para bugfix e logica nova, prefira teste falhando, implementacao minima e teste passando.
- Mantenha o diff focado.
- Rode testes relacionados durante o trabalho, nao apenas no fim.
- Nao misture limpeza adjacente com a entrega.
- Ao encontrar problema real fora do escopo, registre-o em `docs/QUALITY_SCORE.md`.

## 6. Matriz de verificacao

```bash
npm run typecheck:client
npm run typecheck:server
npm test
npm run build
npm run verify
```

- Documentacao: confira caminhos, comandos e ausencia de referencias obsoletas.
- UI: alem dos comandos, valide visualmente os estados e viewports afetados.
- API: rode os testes de rota relevantes e cubra acesso de outro usuario.
- Migration: revise o SQL e teste contra banco nao produtivo antes de aplicar.
- Mudanca ampla: use `npm run verify`.

`npm run typecheck:server` e atualmente um diagnostico fora do gate agregado devido aos erros catalogados em Q-004. Mudancas no server devem executa-lo e relatar se adicionaram erros; ele so entra em `npm run typecheck` depois que o baseline for corrigido.

O projeto ainda nao possui linter. Nao declare lint limpo nem torne lint um gate ate existir configuracao real.

## 7. Feche o trabalho

1. Leia o diff completo.
2. Execute a verificacao final fresca.
3. Atualize os checkboxes e desvios do plano.
4. Mova o plano de `active/` para `completed/`.
5. Atualize specs ou invariantes que deixaram de representar o sistema.
6. Mova itens corrigidos do `QUALITY_SCORE.md` para a secao de resolvidos.
7. Relate mudancas, verificacoes e riscos residuais.
