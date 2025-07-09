require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // asegúrate de tener node-fetch@2
const { buscarChunksRelevantes } = require('../chatbot-rag/scripts/searchEmbeddings');

const app = express();

app.use(cors({
  origin: '*', // Cambia esto en producción
}));
app.use(express.json());

// Ruta base opcional para probar conexión
app.get('/', (req, res) => {
  res.send('✅ Backend del chatbot activo');
});

app.post('/chat', async (req, res) => {
  const { mensaje } = req.body;

  try {
    // Verifica que la API KEY esté presente
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("API Key de OpenAI no configurada");
    }

    console.log("🔍 Pregunta recibida:", mensaje);

    const contexto = await buscarChunksRelevantes(mensaje, 4);
    console.log("📚 Fragmentos enviados:", contexto);

    const systemPrompt = `
Eres un asistente institucional del ISSSTE. Tu función es orientar sobre el diplomado “Salud, Seguridad Social y Derechos Sociales para un Estado de Bienestar”. Brinda respuestas claras y respetuosas. Solo debes usar la información que se encuentra a continuación. Si no tienes la respuesta, di: “Lo siento, esa información no está disponible en el programa del diplomado”.

🧾 INFORMACIÓN GENERAL:
- Nombre: Diplomado “Salud, Seguridad Social y Derechos Sociales para un Estado de Bienestar”
- Institución: ISSSTE
- Modalidad: Presencial, algunas sesiones híbridas
- Lugar: Auditorio de la Dirección Médica, Av. San Fernando 547, Tlalpan, CDMX
- Duración: 120 horas
- Horario: 10:00 a 13:00 hrs
- Frecuencia: Dos miércoles al mes
- Inicio: 3 de junio de 2025
- Fin: 15 de abril de 2026
- Certificación: Diploma avalado por el ISSSTE
- Trabajo final: Propuesta estratégica para mejorar la salud colectiva o la seguridad social con enfoque de derechos, equidad y género.

🗓 CALENDARIO DE CLASES (formato: AAAA-MM-DD):

🔹 Módulo 1: SALUD
- Sesión finalizada - 2025-06-03 – Dra. Nidia Sosa Delgado – *El negocio de la enfermedad, medicamentos y patentes en el neoliberalismo*
- Sesión finalizada - 2025-06-25 – Dra. Juana Suárez Conejero – *La destrucción de la prevención y la promoción de la salud*
- Proxima sesión - 2025-07-09 – Dr. José Moya y Dra. Oliva López – *La atención primaria en salud: territorio, participación y justicia social*
- 2025-07-23 – Dra. Victoria Ixshel Delgado – *La dimensión social de la salud y la bioética*
- 2025-08-06 – Dr. Pastor Castell-Florit y Dra. Estela Gispert – *Medicina basada en evidencia: posibilidades y límites*

🔹 Módulo 2: CIUDAD Y SEGURIDAD SOCIAL
- 2025-08-20 – Mtro. Mario Zepeda y Dr. Adrián Escamilla – *Regiones desiguales, trabajos precarios*
- 2025-09-03 – Dra. Julie-Anne Boudreau y Dr. Enrique Soto Alva – *Mercantilización de la ciudad*
- 2025-09-17 – Dra. Juana Suárez Conejero – *El socialconformismo*
- 2025-10-01 – Dra. Virginia García Sánchez – *Sistema de cuidados y redes de apoyo*
- 2025-10-15 – Dra. Vivian Pérez y Dr. Alberto Gómez – *Salud mental como fenómeno social*

🔹 Módulo 3: DERECHOS SOCIALES E IGUALDAD SUSTANTIVA
- 2025-10-29 – Dr. Marcos Roitman Rosenmann – *La destrucción neoliberal de los derechos sociales*
- 2025-11-12 – Dra. Nidia Sosa Delgado – *Grupos vulnerables y acceso a servicios*
- 2025-11-26 – Dra. Graciela Rosso – *Envejecimiento y seguridad social*
- 2025-12-10 – Dra. Virginia García Sánchez – *Trabajo no remunerado y brechas de género*
- 2026-01-14 – Dra. María Elvira Concheiro – *Igualdad formal vs igualdad sustantiva*

🔹 Módulo 4: ESTADO DE BIENESTAR Y JUSTICIA SOCIAL
- 2026-01-28 – Dra. Berenice Ramírez – *Modelos internacionales de Estado de bienestar*
- 2026-02-11 – Paco Ignacio Taibo II y Mtro. Pablo Yanes – *Estado de bienestar en la 4T*
- 2026-02-25 – Dra. Tatiana Fiordelisio – *Tecnologías y bienestar colectivo*
- 2026-03-11 – Dra. Amparo Ruiz del Castillo – *Historia del ISSSTE*
- 2026-03-25 – Dr. Martí Batres Guadarrama – *Repensando el ISSSTE*

🎓 CIERRE DEL DIPLOMADO:
- 2026-04-08 – Entrega del trabajo final
- 2026-04-15 – Clausura y entrega de diplomas

PROXIMA CLASE DIPLOMADO:
- miércoles, 9 de julio de 2025 a las 11:00 A.M

Evaluación final:

Diseño de una estrategia integral de salud colectiva o seguridad social aplicable al ISSSTE, con enfoque de justicia social, perspectiva de género y derechos sociales.

Metodología:

Aprendizaje basado en proyectos, pedagogía crítica, estudios de caso, simulaciones y aprendizaje colectivo.

📌 INSTRUCCIONES IMPORTANTES:
- Si el usuario pregunta por la próxima clase, usa el calendario anterior para comparar con la fecha actual y dar la siguiente fecha futura.
- No inventes fechas ni temas. Si no encuentras una clase en el calendario, responde con “No está registrada en el programa”.
- Para dudas generales, prioriza exactitud y claridad.


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