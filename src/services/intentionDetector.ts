import aiServices from "./aiServices";
import { config } from "../config";
import fs from "fs";
import path from "path";

// Cache simple en memoria: clave es el mensaje del usuario y valor la intención y el timestamp
const intentCache: Record<string, { intent: string; timestamp: number }> = {};

// Tiempo de expiración para el cache en milisegundos (por ejemplo, 5 minutos)
const CACHE_EXPIRATION = 5 * 60 * 1000;

export const detectIntent = async (userMessage: string): Promise<string> => {
  const now = Date.now();
  
  if (
    intentCache[userMessage] &&
    now - intentCache[userMessage].timestamp < CACHE_EXPIRATION
  ) {
    console.log("Usando intención cacheada");
    return intentCache[userMessage].intent;
  }

  try {
    const promptPath = path.join(
      process.cwd(),
      "assets/Prompts",
      "prompt_DetectIntention.txt"
    );
    const promptContent = fs.readFileSync(promptPath, "utf8");

    const messages = [
      { role: "system", content: promptContent },
      { role: "user", content: userMessage }
    ];

    const ai = new aiServices(config.ApiKey);
    const response = await ai.chat("", messages, { max_tokens: 50, temperature: 0.5 });
    const intent = response.trim().toUpperCase();

    // Guardar la intención en el cache junto con el timestamp actual
    intentCache[userMessage] = { intent, timestamp: now };
    return intent;
  } catch (error) {
    console.error("Error en detectIntent:", error);
    // En caso de error, se devuelve NO_DETECTED para manejarlo de forma segura
    return "NO_DETECTED";
  }
};
