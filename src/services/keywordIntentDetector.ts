import { intentsConfig } from "~/config/intents.config";


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