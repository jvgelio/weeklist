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
   week list monday   # Próxima segunda
   ```

3. **Adicionar tarefa:**
   ```bash
   week add "Reunião de Vendas" -d monday -s morning
   week add "Academia" -d daily
   ```

4. **Concluir tarefa:**
   ```bash
   week done <id>     # Use o ID curto mostrado no comando list
   ```

5. **Remover tarefa:**
   ```bash
   week rm <id>
   ```

## Para Assistentes de IA

Se você é uma IA ajudando o usuário:
- **Sempre** rode `week list` antes de tentar editar ou remover tarefas para obter os IDs atuais.
- IDs são strings curtas (os primeiros caracteres do UUID real).
- Formatos de data suportados: `today`, `tomorrow`, `monday`...`sunday`, `YYYY-MM-DD`.
- Slots: `am` (manhã), `pm` (tarde), `eve` (noite).
