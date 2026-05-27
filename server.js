const express = require('express');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Mensaje vacío' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY no configurada' });

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 700,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: message }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: 'Error en la API de Groq', detail: err });
    }

    const data  = await response.json();
    const reply = data.choices?.[0]?.message?.content || '';
    res.json({ reply });

  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n💕 Love Assistance corriendo en http://localhost:${PORT}\n`);
});
