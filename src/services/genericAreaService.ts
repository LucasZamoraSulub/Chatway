// src/services/genericAreaService.ts
import fs from "fs";
import path from "path";
import aiServices from "~/services/aiServices";
import { config } from "../config";
import { ConversationManager } from "~/services/conversationManager";
import { AreaConfigService } from "~/services/areaConfigService";
import { AreaConfig } from "~/config/areas.config";

export class GenericAreaService {
  /**
   * Procesa la entrada del usuario para el flujo genérico de área:
   * - Actualiza el historial de la conversación.
   * - Prepara el contexto para la IA.
   * - Carga el prompt especializado y obtiene la respuesta.
   * - Registra la interacción y actualiza el historial.
   *
   * @param userInput Mensaje del usuario.
   * @param selectedFlow Área seleccionada.
   * @param ctx Contexto del flujo.
   * @param state Estado del flujo.
   * @returns La respuesta generada por la IA.
   */
  static async processUserInput(
    userInput: string,
    selectedFlow: string,
    ctx: any,
    state: any
  ): Promise<string> {
    console.log(`📥 Procesando consulta en ${selectedFlow}: ${userInput}`);

    // Obtener o inicializar el historial de conversación
    const history: { role: string; content: string }[] = await state.get("conversationHistory") || [];
    
    // Agregar el mensaje del usuario y registrar la interacción
    history.push({ role: "user", content: userInput });
    await ConversationManager.logInteraction(ctx, state, "user", userInput);
    await state.update({ conversationHistory: history });

    // Preparar el contexto para la IA (por ejemplo, usar los últimos 7 mensajes)
    const startIndex = history.length > 7 ? history.length - 7 : 0;
    const contextMessages = history.slice(startIndex);
    console.log("🤖 Contexto enviado a IA:", contextMessages);

    // Obtener la configuración del área utilizando el service centralizado
    let areaConfig: AreaConfig;
    try {
      areaConfig = AreaConfigService.getAreaConfig(selectedFlow);
    } catch (error: any) {
      console.error(error.message);
      throw new Error("Área no reconocida");
    }

    // Cargar el prompt especializado
    const promptPath = path.join(
      process.cwd(),
      "assets/Prompts/areas",
      areaConfig.conversation.promptFile
    );
    const promptContent = fs.readFileSync(promptPath, "utf8");

    // Instanciar la IA y obtener la respuesta usando el prompt y el contexto
    const AI = new aiServices(config.ApiKey);
    let response = await AI.chat(promptContent, contextMessages);
    if (!response || response.includes("No encontré información")) {
      response = areaConfig.conversation.fallbackResponse ||
        "❌ No se encontró información exacta. ¿Podrías darme más detalles?";
    }
    console.log(`🤖 Respuesta de IA para ${selectedFlow}: ${response}`);

    // Registrar la respuesta de la IA y actualizar el historial
    history.push({ role: "assistant", content: response });
    await ConversationManager.logInteraction(ctx, state, "assistant", response);
    await state.update({ conversationHistory: history });

    return response;
  }
}
