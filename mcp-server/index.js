#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_URL = process.env.VIBENOS_API_URL || "https://vibenos-api-production.up.railway.app";

const server = new McpServer({
  name: "vibenos-legal-agent",
  version: "1.0.0",
});

// Tool: Ask a legal question about Chilean law
server.tool(
  "ask_chilean_law",
  "Ask a question about Chilean law. The agent searches through 36+ laws and regulations including Ley 21.719 (data protection), Código Civil, Código Tributario, and more.",
  {
    question: z.string().describe("The legal question in natural language (Spanish preferred)"),
  },
  async ({ question }) => {
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      });
      const data = await res.json();
      return {
        content: [{ type: "text", text: data.reply || data.error }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err.message}` }],
      };
    }
  }
);

// Tool: Search Chilean laws by keyword
server.tool(
  "search_chilean_laws",
  "Search through 36+ Chilean laws and regulations by keyword. Returns matching laws with excerpts.",
  {
    query: z.string().describe("Search keyword (e.g., 'proteccion datos', 'tributario', 'laboral')"),
  },
  async ({ query }) => {
    try {
      const res = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      const text = data.length
        ? data.map((l) => `**${l.name}**\n${l.excerpt}`).join("\n\n")
        : "No laws found matching that query.";
      return {
        content: [{ type: "text", text }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err.message}` }],
      };
    }
  }
);

// Tool: List all available Chilean laws
server.tool(
  "list_chilean_laws",
  "List all 36+ Chilean laws and regulations available in the database.",
  {},
  async () => {
    try {
      const res = await fetch(`${API_URL}/api/laws`);
      const data = await res.json();
      const text = data.map((l) => `- **${l.name}** (${l.pages} pages) — ${l.file}`).join("\n");
      return {
        content: [{ type: "text", text: `📚 Available laws:\n\n${text}` }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err.message}` }],
      };
    }
  }
);

// Tool: Get Ley 21.719 summary (most requested)
server.tool(
  "ley_21719_summary",
  "Get a summary of Ley 21.719 (Chilean Data Protection Law) including key articles, rights, and obligations.",
  {},
  async () => {
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Dame un resumen completo de la Ley 21.719 de Proteccion de Datos Personales de Chile, incluyendo derechos ARCO, obligaciones del responsable, y sanciones.",
        }),
      });
      const data = await res.json();
      return {
        content: [{ type: "text", text: data.reply }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err.message}` }],
      };
    }
  }
);

// Tool: Check compliance status
server.tool(
  "check_compliance",
  "Check if a company's data processing practices comply with Ley 21.719. Describe the practices and get a compliance assessment.",
  {
    practices: z.string().describe("Description of the company's data processing practices"),
  },
  async ({ practices }) => {
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Evalua si las siguientes practicas de tratamiento de datos cumplen con la Ley 21.719 de Chile: "${practices}". Identifica brechas de cumplimiento y recomienda acciones correctivas.`,
        }),
      });
      const data = await res.json();
      return {
        content: [{ type: "text", text: data.reply }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err.message}` }],
      };
    }
  }
);

// Start MCP server
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("🚀 VibeNORMA MCP Server running");
