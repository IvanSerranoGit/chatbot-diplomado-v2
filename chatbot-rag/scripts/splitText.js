const fs = require('fs');
const path = require('path');

// CONFIGURACIÓN
const inputDir = path.join(__dirname, '..', 'transcripciones');
const outputDir = path.join(__dirname, '..', 'chunks');
const maxWordsPerChunk = 300;

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

function splitTextIntoChunks(text, maxWords) {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += maxWords) {
    const chunkWords = words.slice(i, i + maxWords);
    chunks.push(chunkWords.join(' '));
  }
  return chunks;
}

fs.readdirSync(inputDir).forEach((filename) => {
  if (!filename.endsWith('.txt')) return;

  const filePath = path.join(inputDir, filename);
  const rawText = fs.readFileSync(filePath, 'utf8');
  const chunks = splitTextIntoChunks(rawText, maxWordsPerChunk);

  const clase = path.basename(filename, '.txt');

  chunks.forEach((chunk, index) => {
    const chunkData = {
      clase,
      bloque: index + 1,
      texto: chunk.trim()
    };

    const outputFilename = `${clase}_chunk${index + 1}.json`;
    fs.writeFileSync(
      path.join(outputDir, outputFilename),
      JSON.stringify(chunkData, null, 2),
      'utf8'
    );
  });

  console.log(`✅ ${filename} dividido en ${chunks.length} bloques.`);
});