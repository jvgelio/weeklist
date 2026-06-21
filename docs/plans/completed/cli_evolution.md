# Plano Entregue - Evolução da Weeklist CLI (`week`)

Evolução da CLI do Weeklist para permitir operações complexas de criação, edição e consulta de tarefas, além do gerenciamento de tags. A CLI foi otimizada para ser consumida tanto por humanos quanto por agentes de IA (como Gemini CLI, Claude Code e Cursor).

## O que foi entregue

1. **Opção Global `--json`**:
   - Adicionada a flag `-j, --json` no Commander que suprime Chalk e logs de progresso e imprime apenas o JSON correspondente a cada comando de sucesso.
   - Tratamento de erro padronizado em JSON no canal `stderr` caso `--json` esteja ativo.

2. **Visualizações e Filtros Avançados no `week list`**:
   - `--all`: Lista todas as tarefas do usuário autenticado.
   - `--week`: Calcula o intervalo da semana da data de referência e exibe todas as tarefas.
   - `--overdue`: Filtra apenas tarefas atrasadas pendentes.
   - Outros filtros combinados: `--pending`, `--done`, `--priority`, `--tag`, `--slot`, `--search`.
   - Visualização textual formatada e agrupada por data para múltiplos dias.

3. **Criação de Tarefas com Notas**:
   - Como o endpoint de criação POST ignora o campo `note`, a CLI agora cria a tarefa via `POST /api/tasks` e depois executa um `PATCH` se o parâmetro `--note` foi passado, garantindo consistência.

4. **Novo Comando `week edit <id>`**:
   - Permite editar título, data (chamando a API de move), slot, prioridade, recorrência, nota e tags (incluindo adição/remoção incremental).

5. **Novo Comando `week tag <list/add/rm>`**:
   - Permite listar tags e suas contagens, criar novas tags (com cores auto-geradas) e remover tags.

6. **Exit Codes Padronizados**:
   - `0`: Sucesso.
   - `1`: Argumento inválido / dados não encontrados.
   - `2`: Erro de autenticação / sessão.
   - `3`: Erro de conexão com a API.

## Replicação no Standalone

As alterações da pasta `cli/` foram copiadas, validadas e enviadas para o repositório standalone `https://github.com/jvgelio/weeklist-cli.git` no branch `main` com sucesso.

## Verificação e Testes

Todos os comandos foram testados com sucesso via terminal local apontando para a base de produção do usuário autenticado:
- Status de autenticação: OK.
- Listagem agrupada e listagem JSON: OK.
- Adição com tags/notas e verificação de persistência: OK.
- Edição de prioridade, slot, tags e data de agendamento: OK.
- Exclusão com retorno de ID curto/longo: OK.
