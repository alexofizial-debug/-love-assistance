// ─────────────────────────────────────────────
//  LOVE ASSISTANCE — app.js
//  Usa: Anthropic API (via proxy en server.js)
//       Web Speech API (reconocimiento de voz)
// ─────────────────────────────────────────────

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

// ── DOM ──────────────────────────────────────
const chatArea       = document.getElementById('chatArea');
const userInput      = document.getElementById('userInput');
const sendBtn        = document.getElementById('sendBtn');
const micBtn         = document.getElementById('micBtn');
const micHint        = document.getElementById('micHint');
const statusDot      = document.getElementById('statusDot');
const analysisPanel  = document.getElementById('analysisPanel');
const suggestionsRow = document.getElementById('suggestionsRow');
const sugChips       = document.getElementById('sugChips');
const toneVal        = document.getElementById('toneVal');
const interestVal    = document.getElementById('interestVal');
const signalVal      = document.getElementById('signalVal');
const contextLabel   = document.getElementById('contextLabel');
const ctxBtn         = document.getElementById('ctxBtn');
const modalOverlay   = document.getElementById('modalOverlay');
const modalCancel    = document.getElementById('modalCancel');
const modalSave      = document.getElementById('modalSave');
const contextInput   = document.getElementById('contextInput');

// ── STATE ─────────────────────────────────────
let userContext = '';
let isLoading   = false;
let recognition = null;
let isRecording = false;

// ── AUTO-RESIZE TEXTAREA ──────────────────────
userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 100) + 'px';
});

// ── SEND ON ENTER (no shift) ──────────────────
userInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
});
sendBtn.addEventListener('click', handleSend);

// ── CONTEXT MODAL ─────────────────────────────
ctxBtn.addEventListener('click', () => {
  contextInput.value = userContext;
  modalOverlay.style.display = 'flex';
});
modalCancel.addEventListener('click', () => { modalOverlay.style.display = 'none'; });
modalSave.addEventListener('click', () => {
  userContext = contextInput.value.trim();
  contextLabel.textContent = userContext
    ? '📌 ' + (userContext.length > 55 ? userContext.slice(0, 55) + '…' : userContext)
    : 'Sin contexto activo';
  modalOverlay.style.display = 'none';
});
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) modalOverlay.style.display = 'none';
});

// ── WEB SPEECH API ────────────────────────────
function initSpeech() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { micBtn.title = 'Tu navegador no soporta micrófono'; micBtn.style.opacity = '0.4'; return; }

  recognition = new SR();
  recognition.lang = 'es-ES';
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart = () => {
    isRecording = true;
    micBtn.classList.add('recording');
    micHint.textContent = '🎙 Escuchando…';
  };
  recognition.onresult = e => {
    let interim = '', final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) final += e.results[i][0].transcript;
      else interim += e.results[i][0].transcript;
    }
    userInput.value = final || interim;
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 100) + 'px';
    if (final) stopRecording();
  };
  recognition.onerror = () => stopRecording();
  recognition.onend   = () => stopRecording();
}

function stopRecording() {
  isRecording = false;
  micBtn.classList.remove('recording');
  micHint.textContent = '';
}

micBtn.addEventListener('click', () => {
  if (!recognition) return;
  if (isRecording) { recognition.stop(); stopRecording(); return; }
  try { recognition.start(); } catch(e) { /* already started */ }
});

// ── CHAT HELPERS ──────────────────────────────
function addBubble(text, type) {
  const div = document.createElement('div');
  div.className = `bubble ${type}`;
  if (type === 'them') {
    div.textContent = text;
  } else if (type === 'assistant') {
    div.innerHTML = `<div class="bubble-header">Love Assistance</div>${text}`;
  }
  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
  return div;
}

function addTyping() {
  const div = document.createElement('div');
  div.className = 'bubble typing';
  div.id = 'typingBubble';
  div.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;
  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function removeTyping() {
  const t = document.getElementById('typingBubble');
  if (t) t.remove();
}

// ── REMOVE WELCOME CARD ───────────────────────
function removeWelcome() {
  const w = chatArea.querySelector('.welcome-card');
  if (w) w.remove();
}

// ── RENDER RESPONSE ───────────────────────────
function renderResponse(data) {
  // Analysis pills
  if (data.analisis) {
    toneVal.textContent     = data.analisis.tono     || '—';
    interestVal.textContent = data.analisis.interes  || '—';
    signalVal.textContent   = data.analisis.senal    || '—';
    analysisPanel.style.display = 'block';
  }

  // Main bubble content
  let html = '';
  if (data.consejo) {
    html += `<p style="margin-bottom:8px;font-size:13.5px">${data.consejo}</p>`;
  }
  if (data.tema) {
    html += `<p style="font-size:12px;opacity:0.8">💡 Tema: <em>${data.tema}</em></p>`;
  }
  addBubble(html, 'assistant');

  // Suggestion chips
  if (data.frases && data.frases.length) {
    sugChips.innerHTML = '';
    data.frases.forEach(frase => {
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.textContent = frase;
      chip.addEventListener('click', () => {
        userInput.value = frase;
        userInput.style.height = 'auto';
        userInput.style.height = Math.min(userInput.scrollHeight, 100) + 'px';
        userInput.focus();
      });
      sugChips.appendChild(chip);
    });
    suggestionsRow.style.display = 'block';
  }
}

// ── MAIN SEND HANDLER ─────────────────────────
async function handleSend() {
  const text = userInput.value.trim();
  if (!text || isLoading) return;

  removeWelcome();
  isLoading = true;
  statusDot.className = 'status-dot loading';
  sendBtn.disabled = true;

  addBubble(text, 'them');
  userInput.value = '';
  userInput.style.height = 'auto';
  addTyping();

  const contextBlock = userContext
    ? `\n\nContexto proporcionado por el usuario:\n"${userContext}"`
    : '';

  const prompt = `${contextBlock}\n\nElla/Él dijo: "${text}"\n\nAnaliza y responde en JSON.`;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt })
    });

    if (!res.ok) throw new Error('Error del servidor');

    const json = await res.json();
    removeTyping();

    let raw = json.reply || '';
    raw = raw.replace(/```json|```/g, '').trim();

    let data;
    try { data = JSON.parse(raw); }
    catch { data = { consejo: raw, frases: [] }; }

    renderResponse(data);
    statusDot.className = 'status-dot active';

  } catch (err) {
    removeTyping();
    addBubble('⚠️ Error al conectar con el asistente. Revisa tu API key en el servidor.', 'assistant');
    statusDot.className = 'status-dot';
    console.error(err);
  }

  isLoading = false;
  sendBtn.disabled = false;
}

// ── INIT ──────────────────────────────────────
initSpeech();
