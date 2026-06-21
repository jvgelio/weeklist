# Weeklist CLI (`week`)

Interface de linha de comando para gerenciar sua semana no Weeklist.

## Instalação

```bash
# Instale globalmente
npm install -g .
```

Ou use sem instalar:
```bash
npx . list
```

## Guia Rápido

1. **Login:**
   ```bash
   week login
   ```
   *Isso abrirá seu navegador para autenticar com o Google.*

2. **Listar tarefas:**
   ```bash
   week list          # Hoje
   week list tomorrow # Amanhã
   week list --all    # Todas as tarefas
   week list --week   # Semana completa
   week list --overdue # Atrasadas
   ```

3. **Adicionar tarefa:**
   ```bash
   week add "Reunião de Vendas" -d monday -s pm -t trabalho -n "Levar relatórios"
   ```

4. **Editar tarefa:**
   ```bash
   week edit <id> --title "Novo Título" --slot eve --done
   ```

5. **Concluir tarefa:**
   ```bash
   week done <id>     # Use o ID curto mostrado no comando list
   ```

6. **Remover tarefa:**
   ```bash
   week rm <id>
   ```

7. **Gerenciar Tags:**
   ```bash
   week tag list
   week tag add "Urgente"
   week tag rm urgente
   ```

## Para Assistentes de IA

Se você é uma IA ajudando o usuário:
- **Use `--json` em todos os comandos** para obter respostas estruturadas e previsíveis.
- O comando `week list --json` ou `week list --all --json` ajuda a obter o estado de tarefas atual com seus IDs (UUIDs completos).
- A CLI aceita tanto o ID curto quanto o UUID longo nas operações de `edit`, `done` e `rm`.
- Ao criar tarefas com `add` ou alterar com `edit`, você pode passar a flag `--json` para receber o payload do objeto criado/editado em JSON e extrair seu ID.
- Formatos de data suportados: `today`, `tomorrow`, `monday`...`sunday`, `YYYY-MM-DD`.
- Slots válidos: `am` (manhã), `pm` (tarde), `eve` (noite).
- Tags inexistentes passadas em `--tags` são criadas automaticamente com cores aleatórias pela CLI.
- Tratamento de erro: se a CLI falhar, o erro virá no `stderr` como `{ "error": "motivo", "code": "CODE" }` se a flag `--json` estiver ativa, com exit codes do processo variando de 1 a 3 conforme o tipo de falha.

