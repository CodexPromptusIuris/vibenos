# VibeNORMA MCP Server

**Chilean Legal AI Agent — 97 laws, decrees, and regulations integrated**

An MCP (Model Context Protocol) server that gives your AI assistant access to the complete Chilean legal database including:

- **Ley 21.719** — Protección de Datos Personales
- **Código Civil** — Derecho civil chileno
- **Código Penal** — Derecho penal chileno
- **Código de Comercio** — Derecho comercial
- **Código del Trabajo** — Legislación laboral
- **Código Orgánico de Tribunales** — Organización judicial
- **Ley 21.459** — Delitos Informáticos
- **60+ decretos, DFLs y resoluciones** — Normativa actualizada

## Install

```bash
npm install vibenos-mcp
```

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "vibenos-legal": {
      "command": "npx",
      "args": ["vibenos-mcp"]
    }
  }
}
```

## Tools

### `ask_chilean_law`
Ask any question about Chilean law. The agent searches through 36+ laws and provides cited answers.

```
ask_chilean_law(question="¿Qué dice la Ley 21.719 sobre derechos ARCO?")
```

### `search_chilean_laws`
Search laws by keyword. Returns matching laws with excerpts.

```
search_chilean_laws(query="proteccion datos")
```

### `list_chilean_laws`
List all available laws in the database.

### `ley_21719_summary`
Get a comprehensive summary of Ley 21.719 (Chilean Data Protection Law).

### `check_compliance`
Check if a company's data processing practices comply with Ley 21.719.

```
check_compliance(practices="We collect RUT, email, and phone numbers for marketing without explicit consent")
```

## Environment Variables

```bash
VIBENOS_API_URL=https://vibenos-api-production.up.railway.app  # Backend API (default)
```

## License

Apache 2.0 — VibeCodingChile SpA
