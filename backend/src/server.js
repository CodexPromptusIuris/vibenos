import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Load law database ──────────────────────────────────────────────
const LAWS_DIR = path.join(__dirname, '../frontend/laws');
const DATA_DIR = path.join(__dirname, '../data');

let lawsDatabase = [];

async function loadLaws() {
  console.log('📚 Loading law PDFs...');
  const pdfParse = (await import('pdf-parse')).default;

  const files = fs.readdirSync(LAWS_DIR).filter(f => f.endsWith('.pdf'));
  for (const file of files) {
    try {
      const dataBuffer = fs.readFileSync(path.join(LAWS_DIR, file));
      const data = await pdfParse(dataBuffer);
      const lawName = file.replace('.pdf', '').replace(/\s*\(\d+\)/g, '');
      lawsDatabase.push({
        name: lawName,
        file: file,
        text: data.text.substring(0, 15000),
        pages: data.numpages
      });
      console.log(`  ✅ ${lawName} (${data.numpages} pages)`);
    } catch (err) {
      console.log(`  ⚠️  Error loading ${file}: ${err.message}`);
    }
  }

  // Load privacy policy JSON
  try {
    const politica = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'politica-privacidad.json'), 'utf-8'));
    lawsDatabase.push({
      name: 'Politica de Privacidad Legalize 2026',
      file: 'politica-privacidad.json',
      text: politica.contenido,
      pages: 1
    });
    console.log('  ✅ Politica de Privacidad (JSON)');
  } catch (err) {
    console.log(`  ⚠️  Error loading politica: ${err.message}`);
  }

  console.log(`\n📖 Loaded ${lawsDatabase.length} laws into database`);
}

// ─── API Routes ─────────────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', laws: lawsDatabase.length, version: '1.0.0' });
});

// List all laws
app.get('/api/laws', (req, res) => {
  res.json(lawsDatabase.map(l => ({
    name: l.name,
    file: l.file,
    pages: l.pages
  })));
});

// Download PDF
app.get('/api/laws/:filename', (req, res) => {
  const filePath = path.join(LAWS_DIR, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Law not found' });
  }
});

// AI Agent chat
app.post('/api/chat', async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Build context from relevant laws
    const relevantLaws = findRelevantLaws(message);
    const lawContext = relevantLaws.map(l =>
      `--- ${l.name} ---\n${l.text.substring(0, 3000)}`
    ).join('\n\n');

    const systemPrompt = `Eres el Agente Legal de VibeNORMA — un asistente especializado en derecho chileno, proteccion de datos personales y cumplimiento normativo.

Tienes acceso a las siguientes leyes y documentos chilenos:

${lawContext}

INSTRUCCIONES:
- Responde SOLO basandote en la informacion de las leyes proporcionadas
- Cita siempre el articulo o norma especifica cuando sea posible
- Si no tienes informacion suficiente, di que no puedes responder con certeza
- Usa un lenguaje claro y profesional
- Cuando sea relevante, menciona las sanciones o consecuencias legales
- Si te preguntan sobre un tema no cubierto por las leyes, indica que no tienes informacion al respecto

FORMATO DE RESPUESTA:
- Usa negritas para articulos y normas
- Incluye el nombre completo de la ley cuando la cites
- Si hay multiples articulos relevantes, listalos`;

    const messages = [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages
    });

    const reply = response.content[0].text;
    const sources = relevantLaws.map(l => l.name);

    res.json({ reply, sources });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'Error processing your request' });
  }
});

// Search laws
app.get('/api/search', (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);

  const query = q.toLowerCase();
  const results = lawsDatabase.filter(l =>
    l.name.toLowerCase().includes(query) ||
    l.text.toLowerCase().includes(query)
  ).map(l => ({
    name: l.name,
    file: l.file,
    excerpt: l.text.substring(0, 200) + '...'
  }));

  res.json(results);
});

// ─── Helper: find relevant laws ─────────────────────────────────────
function findRelevantLaws(query) {
  const q = query.toLowerCase();
  const keywords = q.split(/\s+/);

  const scored = lawsDatabase.map(law => {
    let score = 0;
    const text = (law.name + ' ' + law.text).toLowerCase();
    for (const kw of keywords) {
      if (kw.length < 3) continue;
      const matches = text.split(kw).length - 1;
      score += matches;
    }
    return { law, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(s => s.law);
}

// ─── Serve frontend ─────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../../frontend')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// ─── Start ──────────────────────────────────────────────────────────
await loadLaws();

app.listen(PORT, () => {
  console.log(`\n🚀 VibeOS Backend running on http://localhost:${PORT}`);
  console.log(`📖 ${lawsDatabase.length} laws loaded`);
  console.log(`🤖 AI Agent ready`);
});
