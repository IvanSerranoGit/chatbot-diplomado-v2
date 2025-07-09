const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDINGS_FILE = path.join(__dirname, '..', 'doc-embedding.json'); // ✅ Ruta corregida

// Función para generar embedding de la pregunta del usuario
async function generarEmbeddingDePregunta(pregunta) {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      input: pregunta,
      model: EMBEDDING_MODEL
    })
  });

  const data = await response.json();

  if (data.error) {
    console.error("❌ Error al generar embedding:", data.error);
    return null;
  }

  return data.data[0].embedding;
}

// Función para calcular la similitud coseno entre dos vectores
function cosineSimilarity(a, b) {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (normA * normB);
}

// Función principal para obtener los chunks más relevantes
async function buscarChunksRelevantes(pregunta, topK = 3) {
  const embeddingPregunta = await generarEmbeddingDePregunta(pregunta);
  if (!embeddingPregunta) return [];

  const todosLosChunks = JSON.parse(fs.readFileSync(EMBEDDINGS_FILE, 'utf8'));

  const resultados = todosLosChunks.map((chunk) => {
    const similitud = cosineSimilarity(embeddingPregunta, chunk.embedding);
    return {
      ...chunk,
      similitud
    };
  });

  resultados.sort((a, b) => b.similitud - a.similitud);

  return resultados.slice(0, topK).map((chunk) => {
    return `📚 [${chunk.clase} - bloque ${chunk.bloque}]\n${chunk.texto}`;
  });
}

module.exports = { buscarChunksRelevantes };