import OpenAI from "openai";
import { config } from "~/config";

class aiServices {
  private static apiKey: string;
  private openAI: OpenAI;

  constructor(apiKey: any) {
    aiServices.apiKey = apiKey;
    this.openAI = new OpenAI({
      apiKey: aiServices.apiKey,
    });
  }

  async chat(prompt: string, messages: any[], options?: { max_tokens?: number; temperature?: number }): Promise<string> {
    try {
      // Limitar el historial de mensajes para reducir el uso de tokens
      const limitedMessages = messages.slice(-3); // Solo mantener los últimos 3 mensajes
      const completion = await this.openAI.chat.completions.create({
        model: config.Model,
        messages: [{ role: "system", content: prompt }, ...limitedMessages],
        max_tokens: options?.max_tokens ?? 350,      // Usa el valor proporcionado o el default. Limitar la respuesta a 10 tokens temporalmente, modificar a 150 en producción
        temperature: options?.temperature ?? 0.7,     // Usa el valor proporcionado o el default. Opcional: Controlar la creatividad de la respuesta
        // max_tokens: 50, 
        // temperature: 0.7,
      });

      const anwer = completion.choices[0].message?.content || "No response";
      return anwer;
    } catch (err) {
      console.error("Error al conectar con OpenAI", err);
      return "Lo siento, hubo un error al procesar tu solicitud. Por favor, intenta de nuevo.";
    }
  }
}

export default aiServices;
