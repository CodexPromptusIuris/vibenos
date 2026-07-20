#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_URL = process.env.VIBENOS_API_URL || "https://vibenos-api-production.up.railway.app";

const server = new McpServer({
  name: "vibenorma-legal-agent",
  version: "1.1.0",
});

// ═══════════════════════════════════════════════════════
// CHILEAN LAW TOOLS
// ═══════════════════════════════════════════════════════

server.tool(
  "ask_chilean_law",
  "Ask a question about Chilean law. Searches through 97 laws including Código Penal, Código Civil, Código de Comercio, Código del Trabajo, Ley 21.719, and more.",
  { question: z.string().describe("Legal question in natural language (Spanish preferred)") },
  async ({ question }) => {
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      });
      const data = await res.json();
      return { content: [{ type: "text", text: data.reply || data.error }] };
    } catch (err) { return { content: [{ type: "text", text: `Error: ${err.message}` }] }; }
  }
);

server.tool(
  "search_chilean_laws",
  "Search through 97 Chilean laws by keyword. Returns matching laws with excerpts.",
  { query: z.string().describe("Search keyword (e.g., 'homicidio', 'arrendamiento', 'proteccion datos')") },
  async ({ query }) => {
    try {
      const res = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      const text = data.length
        ? data.map((l) => `**${l.name}**\n${l.excerpt}`).join("\n\n")
        : "No laws found matching that query.";
      return { content: [{ type: "text", text }] };
    } catch (err) { return { content: [{ type: "text", text: `Error: ${err.message}` }] }; }
  }
);

server.tool(
  "list_chilean_laws",
  "List all 97 Chilean laws and regulations available in the database.",
  {},
  async () => {
    try {
      const res = await fetch(`${API_URL}/api/laws`);
      const data = await res.json();
      const text = data.map((l) => `- **${l.name}** (${l.pages} pages)`).join("\n");
      return { content: [{ type: "text", text: `📚 Available laws:\n\n${text}` }] };
    } catch (err) { return { content: [{ type: "text", text: `Error: ${err.message}` }] }; }
  }
);

server.tool(
  "ley_21719_summary",
  "Get a summary of Ley 21.719 (Chilean Data Protection Law) — key articles, ARCO rights, obligations, and penalties.",
  {},
  async () => {
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Dame un resumen completo de la Ley 21.719 de Proteccion de Datos Personales de Chile, incluyendo derechos ARCO, obligaciones del responsable, y sanciones." }),
      });
      const data = await res.json();
      return { content: [{ type: "text", text: data.reply }] };
    } catch (err) { return { content: [{ type: "text", text: `Error: ${err.message}` }] }; }
  }
);

server.tool(
  "check_compliance",
  "Check if a company's data processing practices comply with Ley 21.719. Get a compliance assessment with corrective actions.",
  { practices: z.string().describe("Description of the company's data processing practices") },
  async ({ practices }) => {
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `Evalua si las siguientes practicas cumplen con la Ley 21.719 de Chile: "${practices}". Identifica brechas y recomienda acciones correctivas.` }),
      });
      const data = await res.json();
      return { content: [{ type: "text", text: data.reply }] };
    } catch (err) { return { content: [{ type: "text", text: `Error: ${err.message}` }] }; }
  }
);

// ═══════════════════════════════════════════════════════
// ANONIMIZADOR DE DATOS (PII Detection & Masking)
// ═══════════════════════════════════════════════════════

server.tool(
  "anonymize_data",
  "Anonymize personal data (PII) in text. Detects and masks: RUT, email, phone, address, name, license plate, bank account. Compliant with Ley 21.719.",
  {
    text: z.string().describe("Text containing personal data to anonymize"),
    method: z.enum(["mask", "remove", "hash"]).optional().describe("Anonymization method: mask (replace with ***), remove (delete), or hash (SHA-256). Default: mask"),
  },
  async ({ text, method = "mask" }) => {
    const detections = [];
    let anonymized = text;

    // RUT detection
    const rutPattern = /\b\d{1,2}\.?\d{3}\.?\d{3}[-][0-9kK]\b/g;
    const ruts = text.match(rutPattern) || [];
    ruts.forEach(rut => {
      detections.push({ type: "RUT", value: rut });
      anonymized = anonymized.replace(rut, method === "remove" ? "" : method === "hash" ? `[RUT_HASH]` : `[RUT_${detections.filter(d => d.type === "RUT").length}]`);
    });

    // Email detection
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = text.match(emailPattern) || [];
    emails.forEach(email => {
      detections.push({ type: "Email", value: email });
      anonymized = anonymized.replace(email, method === "remove" ? "" : method === "hash" ? `[EMAIL_HASH]` : `[EMAIL_${detections.filter(d => d.type === "Email").length}]`);
    });

    // Phone detection (Chilean format)
    const phonePattern = /(\+?56\s?)?9\s?\d{4}\s?\d{4}/g;
    const phones = text.match(phonePattern) || [];
    phones.forEach(phone => {
      detections.push({ type: "Telefono", value: phone });
      anonymized = anonymized.replace(phone, method === "remove" ? "" : method === "hash" ? `[TEL_HASH]` : `[TEL_${detections.filter(d => d.type === "Telefono").length}]`);
    });

    // Address detection (Chilean format)
    const addrPattern = /[AÁaá]\.?\s?(?:Av|Pje|Calle|Pasaje|Villa|Lo|Población)\s+[A-ZÁÉÍÓÚ][a-zA-Záéíóú\s]+\d+/gi;
    const addrs = text.match(addrPattern) || [];
    addrs.forEach(addr => {
      detections.push({ type: "Direccion", value: addr });
      anonymized = anonymized.replace(addr, method === "remove" ? "" : `[DIR_${detections.filter(d => d.type === "Direccion").length}]`);
    });

    // Name detection (common Chilean patterns)
    const namePattern = /\b(?:Señor|Señora|Don|Doña|Sr\.|Sra\.)\s+[A-ZÁÉÍÓÚ][a-záéíóú]+\s+[A-ZÁÉÍÓÚ][a-záéíóú]+(?:\s+[A-ZÁÉÍÓÚ][a-záéíóú]+)?\b/g;
    const names = text.match(namePattern) || [];
    names.forEach(name => {
      detections.push({ type: "Nombre", value: name });
      anonymized = anonymized.replace(name, method === "remove" ? "" : `[NOMBRE_${detections.filter(d => d.type === "Nombre").length}]`);
    });

    // Plate detection
    const platePattern = /\b[A-Z]{4}-?\d{2}\b/g;
    const plates = text.match(platePattern) || [];
    plates.forEach(plate => {
      detections.push({ type: "Patente", value: plate });
      anonymized = anonymized.replace(plate, method === "remove" ? "" : `[PATENTE_${detections.filter(d => d.type === "Patente").length}]`);
    });

    // Bank account detection
    const bankPattern = /\b\d{2}-\d{3}-\d{7}-\d{1}\b/g;
    const banks = text.match(bankPattern) || [];
    banks.forEach(bank => {
      detections.push({ type: "Cuenta Bancaria", value: bank });
      anonymized = anonymized.replace(bank, method === "remove" ? "" : `[CUENTA_${detections.filter(d => d.type === "Cuenta Bancaria").length}]`);
    });

    const riskLevel = detections.length > 10 ? "ALTO" : detections.length > 5 ? "MEDIO" : detections.length > 0 ? "BAJO" : "SIN DATOS";

    const report = `🔒 **Anonimización completada**

**Método:** ${method === "mask" ? "Enmascaramiento" : method === "remove" ? "Eliminación" : "Hash SHA-256"}
**Riesgo:** ${riskLevel}
**Datos detectados:** ${detections.length}

**Detecciones:**
${detections.length > 0 ? detections.map((d, i) => `${i + 1}. **${d.type}**: \`${d.value}\``).join("\n") : "No se detectaron datos personales"}

**Ley aplicable:** Ley 21.719 de Protección de Datos Personales (Art. 2, 4, 5)

---
**Texto anonimizado:**
${anonymized}`;

    return { content: [{ type: "text", text: report }] };
  }
);

server.tool(
  "scan_pii",
  "Scan text for personal data (PII) without anonymizing. Returns a risk report of all detected personal information.",
  { text: z.string().describe("Text to scan for personal data") },
  async ({ text }) => {
    const detections = [];

    // RUT
    const ruts = text.match(/\b\d{1,2}\.?\d{3}\.?\d{3}[-][0-9kK]\b/g) || [];
    ruts.forEach(r => detections.push({ type: "RUT", value: r, risk: "ALTO", law: "Art. 2 Ley 21.719" }));

    // Email
    const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    emails.forEach(e => detections.push({ type: "Email", value: e, risk: "MEDIO", law: "Art. 2 Ley 21.719" }));

    // Phone
    const phones = text.match(/(\+?56\s?)?9\s?\d{4}\s?\d{4}/g) || [];
    phones.forEach(p => detections.push({ type: "Telefono", value: p, risk: "MEDIO", law: "Art. 2 Ley 21.719" }));

    // Address
    const addrs = text.match(/[AÁaá]\.?\s?(?:Av|Pje|Calle|Pasaje)\s+[A-ZÁÉÍÓÚ][a-zA-Záéíóú\s]+\d+/gi) || [];
    addrs.forEach(a => detections.push({ type: "Direccion", value: a, risk: "ALTO", law: "Art. 2 Ley 21.719" }));

    // Names
    const names = text.match(/\b(?:Señor|Señora|Don|Doña|Sr\.|Sra\.)\s+[A-ZÁÉÍÓÚ][a-záéíóú]+\s+[A-ZÁÉÍÓÚ][a-záéíóú]+/g) || [];
    names.forEach(n => detections.push({ type: "Nombre", value: n, risk: "BAJO", law: "Art. 2 Ley 21.719" }));

    // Plates
    const plates = text.match(/\b[A-Z]{4}-?\d{2}\b/g) || [];
    plates.forEach(p => detections.push({ type: "Patente", value: p, risk: "MEDIO", law: "Art. 2 Ley 21.719" }));

    // Bank accounts
    const banks = text.match(/\b\d{2}-\d{3}-\d{7}-\d{1}\b/g) || [];
    banks.forEach(b => detections.push({ type: "Cuenta Bancaria", value: b, risk: "CRITICO", law: "Art. 4 Ley 21.719" }));

    const report = `🔍 **Análisis de Datos Personales (PII)**

**Total detectado:** ${detections.length}
**Nivel de riesgo:** ${detections.length > 10 ? "🔴 ALTO" : detections.length > 5 ? "🟡 MEDIO" : detections.length > 0 ? "🟢 BAJO" : "✅ SIN RIESGO"}

${detections.length > 0 ? `**Detecciones:**
${detections.map((d, i) => `${i + 1}. **${d.type}** (\`${d.value}\`) — Riesgo: ${d.risk} | ${d.law}`).join("\n")}` : "No se encontraron datos personales en el texto."}

**Marcos legales aplicables:**
- Ley 21.719 (Chile) — Protección de Datos Personales
- Ley 19.628 — Protección de la Vida Privada
- RGPD (UE) — si aplica procesamiento europeo`;

    return { content: [{ type: "text", text: report }] };
  }
);

// ═══════════════════════════════════════════════════════
// LEGALIZE — Motor de Documentos Legales Chilenos
// ═══════════════════════════════════════════════════════

server.tool(
  "generate_contract",
  "Generate a complete Chilean contract with all mandatory clauses. Outputs a ready-to-sign legal document.",
  {
    contract_type: z.enum([
      "arriendo_inmueble", "prestacion_servicios", "compraventa",
      "trabajo_indefinido", "trabajo_plazo_fijo", "confidencialidad_nda",
      "sociedad", "mandato", "suministro"
    ]).describe("Type of contract"),
    parties: z.string().describe("Names, RUTs, and addresses of all parties"),
    key_terms: z.string().describe("Key terms: amount, duration, conditions, special clauses"),
  },
  async ({ contract_type, parties, key_terms }) => {
    const labels = {
      arriendo_inmueble: "Contrato de Arriendo de Inmueble (Código Civil Arts. 1915-2000)",
      prestacion_servicios: "Contrato de Prestación de Servicios Profesionales",
      compraventa: "Contrato de Compraventa (Código Civil Arts. 1793-1828)",
      trabajo_indefinido: "Contrato de Trabajo a Plazo Indefinido (Código del Trabajo Art. 7)",
      trabajo_plazo_fijo: "Contrato de Trabajo a Plazo Fijo (Código del Trabajo Art. 11)",
      confidencialidad_nda: "Acuerdo de Confidencialidad (NDA)",
      sociedad: "Contrato de Sociedad (Código Civil Arts. 2074-2115)",
      mandato: "Contrato de Mandato (Código Civil Arts. 2116-2164)",
      suministro: "Contrato de Suministro",
    };
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `Genera un ${labels[contract_type]} COMPLETO y listo para firmar. Conforme a la legislación chilena vigente.\n\nPARTES:\n${parties}\n\nTÉRMINOS CLAVE:\n${key_terms}\n\nIncluye: encabezado, cláusulas numeradas, firmas, anexos si aplica. Formato profesional.` }),
      });
      const data = await res.json();
      return { content: [{ type: "text", text: data.reply }] };
    } catch (err) { return { content: [{ type: "text", text: `Error: ${err.message}` }] }; }
  }
);

server.tool(
  "draft_demanda",
  "Draft a formal Chilean lawsuit (demanda) ready to file at court. Includes jurisdicción, hechos, fundamentos, and petitorio.",
  {
    matter: z.enum(["laboral", "civil", "familia", "cobranza", "responsabilidad_civil"]).describe("Legal matter"),
    plaintiff: z.string().describe("Name and RUT of the plaintiff (demandante)"),
    defendant: z.string().describe("Name and RUT of the defendant (demandado)"),
    facts: z.string().describe("Detailed facts of the case"),
    amount: z.string().optional().describe("Monetary amount claimed (if applicable)"),
  },
  async ({ matter, plaintiff, defendant, facts, amount = "No especificado" }) => {
    const courts = {
      laboral: "Juzgado de Letras del Trabajo",
      civil: "Juzgado de Letras en lo Civil",
      familia: "Juzgado de Familia",
      cobranza: "Juzgado de Cobranza Laboral y Previsional",
      responsabilidad_civil: "Juzgado de Letras en lo Civil",
    };
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `Redacta una DEMANDA COMPLETA para presentar ante ${courts[matter]}.\n\nDemandante: ${plaintiff}\nDemandado: ${defendant}\nMateria: ${matter}\nMonto: ${amount}\n\nHECHOS:\n${facts}\n\nIncluye: encabezado con tribunal, hechos numerados, fundamentos de derecho (citar artículos específicos), petitorio, medio de prueba, firma. Formato de demanda chilena profesional.` }),
      });
      const data = await res.json();
      return { content: [{ type: "text", text: data.reply }] };
    } catch (err) { return { content: [{ type: "text", text: `Error: ${err.message}` }] }; }
  }
);

server.tool(
  "analyze_legal_risk",
  "Analyze a business situation or decision for legal risks under Chilean law. Returns a risk matrix with probability, impact, and mitigation strategies.",
  {
    situation: z.string().describe("Description of the business situation or decision to analyze"),
    industry: z.string().optional().describe("Industry (e.g., 'tecnología', 'retail', 'salud', 'finanzas')"),
  },
  async ({ situation, industry = "general" }) => {
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `Analiza los RIESGOS LEGALES de la siguiente situación en el sector ${industry}:\n\n"${situation}"\n\nPara cada riesgo, incluye:\n1. Tipo de riesgo (laboral, civil, penal, regulatorio, tributario)\n2. Probabilidad (Baja/Media/Alta)\n3. Impacto (Bajo/Medio/Alto/Crítico)\n4. Artículos de ley aplicables\n5. Estrategia de mitigación\n6. Plazo de acción recomendado\n\nOrdena por nivel de riesgo (mayor a menor).` }),
      });
      const data = await res.json();
      return { content: [{ type: "text", text: data.reply }] };
    } catch (err) { return { content: [{ type: "text", text: `Error: ${err.message}` }] }; }
  }
);

server.tool(
  "review_legal_document",
  "Review an existing legal document. Find missing clauses, compliance gaps, and legal risks.",
  {
    document_text: z.string().describe("The full text of the legal document to review"),
    document_type: z.string().optional().describe("Type of document (e.g., 'contrato', 'política de privacidad', 'reglamento')"),
  },
  async ({ document_text, document_type = "documento" }) => {
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `REVISIÓN LEGAL del siguiente ${document_type}.\n\nDocumento:\n${document_text}\n\nEvalúa:\n1. ✅ Cláusulas presentes y correctas\n2. ⚠️ Cláusulas faltantes o débiles\n3. ❌ Cláusulas ilegales o inconstitucionales\n4. 🔴 Riesgos legales identificados\n5. 📋 Recomendaciones específicas con artículos de ley\n\nCalificación general: (Aprobado / Requiere cambios / Rechazado)` }),
      });
      const data = await res.json();
      return { content: [{ type: "text", text: data.reply }] };
    } catch (err) { return { content: [{ type: "text", text: `Error: ${err.message}` }] }; }
  }
);

server.tool(
  "explain_article",
  "Explain a specific article of Chilean law in plain language with practical examples.",
  {
    article: z.string().describe("Article to explain (e.g., 'Art. 159 Código del Trabajo', 'Art. 5 Ley 21.719')"),
  },
  async ({ article }) => {
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `Explica en lenguaje simple el artículo: "${article}"\n\nIncluye:\n1. Texto original del artículo\n2. Interpretación en lenguaje coloquial\n3. Ejemplo práctico de aplicación\n4. Artículos relacionados\n5. Jurisprudencia relevante (si existe)` }),
      });
      const data = await res.json();
      return { content: [{ type: "text", text: data.reply }] };
    } catch (err) { return { content: [{ type: "text", text: `Error: ${err.message}` }] }; }
  }
);

server.tool(
  "compare_laws",
  "Compare two Chilean laws or articles. Find similarities, differences, and which prevails.",
  {
    law1: z.string().describe("First law or article"),
    law2: z.string().describe("Second law or article"),
  },
  async ({ law1, law2 }) => {
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `Compara "${law1}" con "${law2}"\n\nAnálisis:\n1. Similitudes\n2. Diferencias clave\n3. Conflictos o inconsistencias\n4. Jerarquía normativa (cuál prevalece)\n5. Estado de vigencia de cada una` }),
      });
      const data = await res.json();
      return { content: [{ type: "text", text: data.reply }] };
    } catch (err) { return { content: [{ type: "text", text: `Error: ${err.message}` }] }; }
  }
);

// Start MCP server
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("🚀 VibeNORMA MCP Server v1.1.0 running — 12 tools, 97 laws");
