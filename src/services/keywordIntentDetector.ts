import { intentsConfig } from "~/config/intents.config";

// Función para normalizar cadenas: remueve acentos y convierte a minúsculas.
export function normalizeString(input: string): string {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Detecta la intención de una cadena de texto basada en palabras clave, pero puede generar falsos positivos, por lo que se recomuienda usar expresiones regulares o coincidencias exactas para una detección más precisa.
export function detectKeywordIntents(input: string): string[] {
  const lowerInput = input.toLowerCase();
  const detectedIntents: Set<string> = new Set();
  for (const intent of intentsConfig) {
    for (const keyword of intent.keywords) {
      if (lowerInput.includes(keyword.toLowerCase())) {
        detectedIntents.add(intent.name);
      }
    }
  }
  return Array.from(detectedIntents);
}

// Nueva función para detectar ciudad a partir de una lista de nombres
export function detectCity(input: string, cities: string[]): string | null {
  const normalizedInput = normalizeString(input);
  for (const city of cities) {
    if (normalizeString(city) === normalizedInput) {
      return city;
    }
  }
  return null;
}