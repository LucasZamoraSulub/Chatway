// src/services/nameExtractor.ts
import nlp from 'compromise';
import { intentsConfig } from '~/config/intents.config';

/**
 * Extrae el nombre del usuario.
 * Primero, busca si el mensaje contiene alguno de los marcadores definidos en "nameMarker".
 * Si se encuentra, extrae todo lo que viene después del marcador y lo limita a un máximo de 4 palabras.
 * Si no se detecta ningún marcador, se asume que el usuario escribió directamente su nombre (también limitado a 4 palabras).
 * Como fallback, se utiliza compromise para intentar extraer un nombre.
 */
export function extractName(input: string): string | null {
  const trimmedInput = input.trim();
  
  // Buscar el marcador "nameMarker" en intents.config.ts
  const nameMarkerIntent = intentsConfig.find(intent => intent.name === "nameMarker");
  if (nameMarkerIntent) {
    // Ordenamos los marcadores de mayor a menor longitud para evitar coincidencias parciales
    const markers = [...nameMarkerIntent.keywords].sort((a, b) => b.length - a.length);
    const lowerInput = trimmedInput.toLowerCase();
    for (const marker of markers) {
      if (lowerInput.startsWith(marker)) {
        // Si el mensaje empieza con el marcador, extraer lo que sigue.
        let nameSubstring = trimmedInput.substring(marker.length).trim();
        // Limitar a un máximo de 4 palabras
        const words = nameSubstring.split(/\s+/).filter(word => word.length > 0);
        if (words.length > 4) {
          nameSubstring = words.slice(0, 4).join(" ");
        }
        if (isValidName(nameSubstring)) {
          return nameSubstring;
        }
      } else if (lowerInput.includes(marker)) {
        // Si el marcador aparece en otra parte del texto, extraer lo que sigue al marcador
        const index = lowerInput.indexOf(marker);
        let nameSubstring = trimmedInput.substring(index + marker.length).trim();
        const words = nameSubstring.split(/\s+/).filter(word => word.length > 0);
        if (words.length > 4) {
          nameSubstring = words.slice(0, 4).join(" ");
        }
        if (isValidName(nameSubstring)) {
          return nameSubstring;
        }
      }
    }
  }
  
  // Si no se detecta ningún marcador, se asume que el input es el nombre directo
  const directWords = trimmedInput.split(/\s+/).filter(word => word.length > 0);
  let nameDirect = trimmedInput;
  if (directWords.length > 4) {
    nameDirect = directWords.slice(0, 4).join(" ");
  }
  if (isValidName(nameDirect)) {
    return nameDirect;
  }
  
  // Fallback: usar compromise para extraer el nombre
  const doc = nlp(trimmedInput);
  const people = doc.people().out('array');
  if (people.length > 0) {
    let extractedByCompromise = people[0];
    const compromiseWords = extractedByCompromise.split(/\s+/).filter(word => word.length > 0);
    if (compromiseWords.length > 4) {
      extractedByCompromise = compromiseWords.slice(0, 4).join(" ");
    }
    if (isValidName(extractedByCompromise)) {
      return extractedByCompromise;
    }
  }
  
  return null;
}

/**
 * Valida que el nombre:
 * - No incluya palabras negativas definidas en la intención "negativeResponse".
 * - Contenga solo letras y espacios.
 * - Tenga al menos 2 caracteres.
 * - No exceda un máximo de 4 palabras.
 * - No contenga palabras prohibidas definidas en la intención "invalidName".
 */
export function isValidName(name: string): boolean {
  const trimmedName = name.trim();

  // Verificar si el nombre incluye alguna respuesta negativa
  const negativeResponseIntent = intentsConfig.find(intent => intent.name === "negativeResponse");
  if (negativeResponseIntent) {
    for (const negativeKeyword of negativeResponseIntent.keywords) {
      if (trimmedName.toLowerCase().includes(negativeKeyword.toLowerCase())) {
        return false;
      }
    }
  }

  // Verificar que el nombre tenga máximo 4 palabras
  const wordCount = trimmedName.split(/\s+/).filter(word => word.length > 0).length;
  if (wordCount > 4) {
    return false;
  }
  
  // Validar que el nombre contenga solo letras y espacios, y al menos 2 caracteres
  const nameRegex = /^[a-zA-Záéíóúüñ\s]{2,}$/;
  if (!nameRegex.test(trimmedName)) {
    return false;
  }
  
  // Buscar la intención "invalidName" para palabras prohibidas
  const invalidNameIntent = intentsConfig.find(intent => intent.name === "invalidName");
  if (invalidNameIntent) {
    for (const banned of invalidNameIntent.keywords) {
      if (trimmedName.toLowerCase().includes(banned.toLowerCase())) {
        return false;
      }
    }
  }
  
  console.log(`Nombre obtenido: ${trimmedName}`);
  return true;
}
