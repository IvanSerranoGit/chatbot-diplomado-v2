require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { buscarChunksRelevantes } = require('../chatbot-rag/scripts/searchEmbeddings');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// Ruta base opcional para probar conexión
app.get('/', (req, res) => {
  res.send('✅ Backend del chatbot activo');
});

// Obtener la próxima clase
function obtenerProximaClase() {
  const calendario = JSON.parse(fs.readFileSync(path.join(__dirname, 'calendario.json'), 'utf8'));

  // Normaliza la fecha actual sin hora
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const proximas = calendario
    .map(clase => {
      const fechaObj = new Date(clase.fecha);
      fechaObj.setHours(0, 0, 0, 0); // normaliza la fecha del calendario
      return { ...clase, fechaObj };
    })
    .filter(clase => clase.fechaObj >= hoy)
    .sort((a, b) => a.fechaObj - b.fechaObj);

  return proximas.length > 0 ? proximas[0] : null;
}

app.post('/chat', async (req, res) => {
  const { mensaje } = req.body;

  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("API Key de OpenAI no configurada");
    }

    console.log("🔍 Pregunta recibida:", mensaje);

    const contexto = await buscarChunksRelevantes(mensaje, 4);
    console.log("📚 Fragmentos enviados:", contexto);

    const proxima = obtenerProximaClase();
    const textoProximaClase = proxima
      ? `- ${new Date(proxima.fecha).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} – ${proxima.ponente} – *${proxima.tema}*`
      : "- No hay más clases programadas.";

    const systemPrompt = `
Eres un asistente institucional del ISSSTE. Tu función es orientar sobre el diplomado “Salud, Seguridad Social y Derechos Sociales para un Estado de Bienestar”. Brinda respuestas claras y respetuosas. Solo debes usar la información que se encuentra a continuación. Si no tienes la respuesta, di: “Lo siento, esa información no está disponible en el programa del diplomado”.

PROXIMA CLASE DIPLOMADO:
${textoProximaClase}

📚 Fragmentos relevantes:
${contexto.join('\n---\n')}

❗Si no sabes la respuesta, responde: “Lo siento, esa información no está en el programa del diplomado.”
`;

    const respuesta = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: mensaje }
        ]
      })
    });

    const data = await respuesta.json();

    if (!data.choices || !data.choices[0]) {
      console.error("❌ Respuesta inesperada de OpenAI:", data);
      return res.status(500).json({ error: "Respuesta inválida de OpenAI" });
    }

    res.json({
      respuesta: data.choices[0].message.content.trim()
    });

  } catch (error) {
    console.error("❌ Error al conectar con OpenAI:", error);
    res.status(500).json({
      error: "Error al conectar con el chatbot: " + error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});