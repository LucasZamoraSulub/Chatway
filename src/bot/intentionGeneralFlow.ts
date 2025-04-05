import { addKeyword, EVENTS } from "@builderbot/bot";
import { detectIntent } from "~/services/intentionDetector";
import { detectKeywordIntents } from "~/services/keywordIntentDetector";
import { intentsConfig } from "~/config/intents.config";
import { ConversationManager } from "~/services/conversationManager";

// Definir el mapa de flujos usando importaciones dinámicas
const flowMap: Record<string, () => Promise<any>> = {
  selectServiceModeFlow: async () =>
    (await import("./selectServiceModeFlow.js")).selectServiceModeFlow,
  faqFlow: async () => (await import("./faqFlow.js")).faqFlow,
  faqMenuFlow: async () => (await import("./faqMenuFlow.js")).faqMenuFlow,
  mainMenuFlow: async () => (await import("./mainMenuFlow.js")).mainMenuFlow,
  greetingFlow: async () => (await import("./greetingFlow.js")).greetingFlow,
};

export const intentionGeneralFlow = addKeyword(EVENTS.ACTION).addAction(
  async (ctx, ctxFn) => {

    // Obtenemos el mensaje inicial: si hay un valor en "initialMessage" en el estado, lo usamos; de lo contrario, el cuerpo de la request
    let userMessage: string | undefined = await ctxFn.state.get(
      "initialMessage"
    );
    if (!userMessage) {
      userMessage = ctx.body;
    }

    // Primero, intentar detectar la intención mediante palabras clave (retornando un arreglo)
    const detectedKeywords = detectKeywordIntents(userMessage);
    console.log(
      `Intenciones detectadas por palabras clave: ${detectedKeywords.join(
        ", "
      )}`
    );

    // Si se detecta exactamente una intención, la usamos; en caso contrario, usamos el detector de IA
    let intent: string | null = null;
    if (detectedKeywords.length === 1) {
      intent = detectedKeywords[0];
      console.log("Utilizando intención detectada por palabras clave.");
    } else {
      intent = await detectIntent(userMessage);
      console.log("Utilizando intención detectada por IA.");
    }

    // Actualizar el estado con la intención detectada y limpiar el mensaje inicial
    // await ctxFn.state.update({ intention: intent });
    // await ctxFn.state.update({ initialMessage: null });

    // Buscar en la configuración la intención detectada
    const intentConfig = intentsConfig.find((i) => i.name === intent);
    if (intentConfig) {
      if (intentConfig.isArea) {
        await ctxFn.state.update({ selectedFlow: intent });
      }
      console.log(
        `Redirigiendo usuario ${ctx.from} al flujo: ${intentConfig.flowName}`
      );
      // Validar que se haya definido un flujo en la intención
      if (!intentConfig.flowName || !flowMap[intentConfig.flowName]) {
        console.error(
          `No se encontró un flujo válido para la intención ${intentConfig.name}`
        );
        const botResponse =
          "No entendí tu mensaje. Por favor, intenta de nuevo.";
        await ConversationManager.logInteraction(
          ctx,
          ctxFn.state,
          "assistant",
          botResponse
        );
        return ctxFn.endFlow(botResponse);
      }

      // Cargar dinámicamente el flujo correspondiente
      const targetFlow = await flowMap[intentConfig.flowName]();
      return ctxFn.gotoFlow(targetFlow);
    }

    console.log(`❌ Intención no reconocida para usuario ${ctx.from}.`);
    const botResponse = "No entendí tu mensaje. Por favor, intenta de nuevo.";
    await ConversationManager.logInteraction(ctx, ctxFn.state, "assistant", botResponse);
    return ctxFn.endFlow(botResponse);
  }
);
