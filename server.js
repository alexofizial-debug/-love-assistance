// ─────────────────────────────────────────────
//  LOVE ASSISTANCE — server.js
//  Servidor Express que actúa como proxy seguro
//  para la API de Anthropic (Claude)
// ─────────────────────────────────────────────

const express = require('express');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── SYSTEM PROMPT ─────────────────────────────
const SYSTEM_PROMPT = `Eres "Love Assistance", un asistente experto en comunicación romántica y social.
Tu trabajo es ayudar al usuario a ligar / conectar con otra persona en tiempo real.

Cuando el usuario te cuente lo que dijo la otra persona (o te dé contexto), responde SOLO con un JSON válido con esta estructura:
{
  "analisis": {
    "tono": "string corto (ej: Cálido, Neutro, Distante, Coqueto, Nervioso)",
    "interes": "string corto (ej: Alto, Medio, Bajo, Muy alto)",
    "senal": "emoji + palabra (ej: 🟢 Positivo, 🟡 Neutro, 🔴 Precaución)"
  },
  "frases": ["frase1", "frase2", "frase3"],
  "tema": "string: un tema de conversación recomendado ahora",
  "consejo": "string: 1 consejo corto y directo (máximo 25 palabras)"
}

Las frases deben ser naturales, auténticas, no cursis. Adaptadas al tono de la otra persona.
Responde SOLO el JSON, sin texto extra, sin markdown, sin comillas de código.`;

// ── API ROUTE ─────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Mensaje vacío' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada en Secrets' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':         'application/json',
        'x-api-key':             apiKey,
        'anthropic-version':    '2023-06-01'
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 700,
        system:     SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: message }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return res.status(502).json({ error: 'Error en la API de Anthropic', detail: err });
    }

    const data  = await response.json();
    const reply = data.content?.[0]?.text || '';
    res.json({ reply });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── Catch-all → index.html ────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── START ─────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n💕 Love Assistance corriendo en http://localhost:${PORT}\n`);
});
