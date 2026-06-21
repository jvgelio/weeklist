# Criacao contextual de tarefas

**Data:** 2026-06-21  
**Status:** Aprovado  
**Superficie principal:** visualizacao semanal em colunas

## Contexto

A visualizacao em colunas repete o acionador `Adicionar tarefa` em cada dia e periodo. Embora o destino da tarefa fique explicito, o padrao cria ruido visual, exige clicar em um alvo textual pequeno e nao comunica continuidade entre acionar e preencher.

O produto ja possui um compositor global completo, aberto por `Alt+Q`. A nova experiencia deve manter essa rota para captura sem contexto e tornar a criacao contextual mais direta.

## Premissas

- A visualizacao em colunas e a superficie prioritaria desta mudanca.
- O usuario alterna entre dois ritmos: captura rapida no periodo em foco e criacao global com mais detalhes.
- A entrega deve ter qualidade de producao para um fluxo central, sem redesenhar tarefas, colunas ou o compositor global inteiro.
- Os periodos habilitados continuam sendo definidos por `slotPrefs`.

## Objetivo

Substituir os acionadores inline repetidos das colunas por zonas contextuais amplas, com motion que preserve a continuidade espacial, mantendo uma rota global de criacao.

## Fora de escopo

- Alterar o modelo de dados ou a API de tarefas.
- Redesenhar o editor de tarefas existente.
- Mudar regras de slots, recorrencia ou linguagem natural.
- Aplicar o novo padrao a Inbox, Weeklist ou visualizacao em lista nesta entrega.
- Alterar a interacao de drag-and-drop alem do necessario para evitar conflito com a criacao.

## Decisao de UX

### 1. Estado de repouso

Cada periodo habilitado da coluna e uma zona de criacao, mas nao exibe permanentemente o texto `Adicionar tarefa`.

- Tarefas existentes mantem sua posicao e seus controles.
- O espaco livre do periodo permanece visualmente limpo.
- O rotulo do periodo, como `manha` ou `tarde`, continua identificando o destino.
- A zona deve ocupar o espaco livre disponivel, nao apenas uma linha no fim da lista.

### 2. Estado de descoberta

No desktop, hover sobre o espaco livre ou foco por teclado revela a affordance contextual.

- A zona recebe um fundo sutil e contorno de baixo contraste.
- Surge o convite `Clique para criar`, acompanhado do periodo quando isso reduzir ambiguidade.
- A area interativa cobre o espaco livre do periodo.
- O feedback nao aparece sobre uma tarefa nem intercepta seus controles.

No touch, nao existe estado dependente de hover. Um toque no espaco livre abre diretamente o compositor contextual.

### 3. Estado de criacao

Ao acionar a zona, ela se transforma no compositor inline no mesmo local.

- Data e slot sao herdados da coluna e do periodo.
- O campo recebe foco automaticamente.
- `Enter` cria a tarefa quando o titulo e valido.
- `Escape` cancela e devolve a zona ao repouso.
- Clique fora cancela apenas quando o campo estiver vazio. Com conteudo digitado, o compositor permanece aberto para evitar perda acidental.
- Apenas um compositor contextual pode ficar aberto por vez.

O compositor contextual preserva o parsing de linguagem natural do `InlineAdd`. Se o texto informar uma data ou slot diferente, o valor explicito digitado prevalece sobre o contexto herdado e a interface deve refletir o destino resolvido antes do envio.

### 4. Confirmacao

Depois da criacao otimista, o compositor e substituido pela nova tarefa na mesma posicao.

- A transicao usa crossfade curto entre campo e tarefa.
- Em erro, o texto digitado e preservado e uma mensagem recuperavel aparece junto ao campo.
- O usuario pode corrigir e tentar novamente sem reabrir o compositor.

### 5. Criacao global

O compositor `QuickAdd` continua sendo a rota para captura sem contexto.

- `Alt+Q` permanece disponivel em qualquer visualizacao.
- A visualizacao semanal ganha um acionador global visivel no cabecalho, com rotulo `Nova tarefa`.
- O acionador abre o `QuickAdd` existente, sem herdar coluna ou periodo em hover.
- A rota global nao substitui nem duplica visualmente as zonas contextuais.

## Motion

- Descoberta: fundo e contorno entram em 140 a 180 ms.
- Abertura: o compositor revela conteudo dentro da zona em 180 a 220 ms, usando opacidade e transformacao. Nao animar propriedades de layout quadro a quadro.
- Confirmacao: campo e tarefa fazem crossfade em 140 a 180 ms.
- Fechamento: movimento mais curto que a abertura, entre 120 e 160 ms.
- Curva: `ease-out-quart` ou equivalente ja usado no produto.
- `prefers-reduced-motion`: remover deslocamento e usar apenas troca imediata ou fade curto.

O motion deve explicar que a tarefa nasce naquele periodo. Ele nao deve coreografar a coluna inteira nem atrasar a entrada de texto.

## Drag-and-drop e precedencia de eventos

- Tarefas, handles e controles internos tem precedencia sobre a zona contextual.
- Iniciar drag nao pode abrir o compositor.
- A zona continua sendo droppable durante o repouso e o hover.
- Durante um drag ativo, a affordance de criacao fica oculta e o feedback de drop existente prevalece.
- Com o compositor aberto, sua area nao inicia drag nem recebe drop.

## Acessibilidade

- Cada zona deve ser alcancavel por teclado e ter nome acessivel, por exemplo `Adicionar tarefa na terca-feira de manha`.
- `Enter` abre o compositor; `Escape` fecha.
- O foco visivel deve atender WCAG AA e nao depender apenas de cor.
- O campo contextual deve manter label acessivel mesmo quando o placeholder estiver vazio.
- Estados de erro devem ser anunciados e manter o foco em uma acao recuperavel.
- Alvos touch devem ter ao menos 44 por 44 px.
- A ordem de Tab segue dia e periodo, da esquerda para a direita e de cima para baixo.

## Responsividade

Na visualizacao em colunas, a zona usa o espaco livre de cada periodo. Isso vale tambem para dispositivos touch com largura suficiente para manter as colunas. Em larguras onde o produto troca para a variante `quiet`, a entrega nao deve forcar cinco colunas comprimidas nem alterar o padrao inline dessa variante.

No mobile:

- a variante `quiet` e seus acionadores inline permanecem inalterados nesta entrega;
- o acionador global deve permanecer acessivel sem cobrir a barra de navegacao mobile.

## Estados obrigatorios

- Repouso com periodo vazio.
- Repouso com uma ou mais tarefas.
- Hover e foco por teclado.
- Compositor vazio e preenchido.
- Envio em andamento.
- Confirmacao otimista.
- Erro recuperavel com texto preservado.
- Cancelamento.
- Drag ativo.
- Tema claro e escuro.
- Movimento reduzido.

## Componentes afetados

- `src/components/day-row.tsx`: substituir `InlineAdd` dentro de `DayColumn` pelas zonas contextuais.
- `src/components/task-components.tsx`: adaptar ou extrair o comportamento de criacao contextual sem quebrar consumidores existentes de `InlineAdd`.
- `src/components/views.tsx`: expor o acionador global no cabecalho semanal.
- `src/components/app.tsx`: fornecer a acao que abre o `QuickAdd` ao cabecalho.
- Testes relacionados a `DayColumn`, criacao inline, `QuickAdd` e atalhos globais.

## Criterios de sucesso

1. Nenhum texto `Adicionar tarefa` fica repetido permanentemente nos periodos da visualizacao em colunas.
2. Clicar ou tocar no espaco livre de um periodo abre o compositor com data e slot corretos.
3. Tarefas e drag-and-drop continuam funcionando sem acionamentos acidentais.
4. A transicao mantem continuidade espacial entre zona, campo e nova tarefa.
5. A criacao global continua disponivel por botao e `Alt+Q`.
6. Quando as colunas estiverem renderizadas, o fluxo funciona por mouse, touch e teclado, inclusive com movimento reduzido.
7. Erros de criacao preservam o texto digitado e permitem nova tentativa.

## Verificacao esperada

- Testes de componente para repouso, foco, abertura, envio, cancelamento e erro.
- Testes que comprovem data e slot herdados e a precedencia do parsing explicito.
- Teste de regressao para impedir abertura durante drag ou clique em tarefa.
- Verificacao visual da visualizacao em colunas nos temas claro e escuro.
- Verificacao desktop e mobile, incluindo alvo touch e ausencia de overflow.
- Verificacao com `prefers-reduced-motion`.
- `npm run typecheck`
- `npm test`
- `npm run build`

## Riscos

- Uma zona cobrindo todo o periodo pode interceptar tarefas ou o droppable. A implementacao deve separar claramente camadas e precedencia de eventos.
- Muitos pontos no fluxo de Tab podem tornar a semana cansativa. As zonas devem entrar na ordem de foco sem criar controles duplicados ou invisiveis.
- A coexistencia entre contexto herdado e parsing de linguagem natural precisa de feedback visivel para evitar criar no destino errado.
- Animar altura diretamente pode causar jank em cinco colunas. O plano deve escolher uma estrategia de reveal que preserve layout e desempenho.
