const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

const CHUNKS_DIR = path.join(__dirname, '..', 'chunks');
const OUTPUT_FILE = path.join(__dirname, '..', 'embeddings.json');
const EMBEDDING_MODEL = "text-embedding-3-small";

async function generarEmbedding(texto) {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      input: texto,
      model: EMBEDDING_MODEL
    })
  });

  const data = await response.json();
  if (data.error) {
    console.error("❌ Error en OpenAI:", data.error);
    return null;
  }

  return data.data[0].embedding;
}

(async () => {
  const archivos = fs.readdirSync(CHUNKS_DIR).filter(file => file.endsWith('.json'));
  const embeddings = [];

  for (const archivo of archivos) {
    const chunkPath = path.join(CHUNKS_DIR, archivo);
    const chunk = JSON.parse(fs.readFileSync(chunkPath, 'utf8'));

    console.log(`🔄 Procesando ${archivo}...`);
    const embedding = await generarEmbedding(chunk.texto);

    if (embedding) {
      embeddings.push({
        clase: chunk.clase,
        bloque: chunk.bloque,
        texto: chunk.texto,
        embedding
      });
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(embeddings, null, 2));
  console.log(`✅ Embeddings guardados en: ${OUTPUT_FILE}`);
})();