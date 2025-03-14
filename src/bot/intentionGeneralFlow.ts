import { addKeyword, EVENTS } from "@builderbot/bot";
import { detectIntent } from "~/services/intentionDetector";
import { detectKeywordIntents } from "~/services/keywordIntentDetector";
import { intentsConfig } from "~/config/intents.config";
import { greetingFlow } from "./greetingFlow";
import { mainMenuFlow } from "./mainMenuFlow";
import { selectServiceModeFlow } from "./selectServiceModeFlow";
import { faqFlow } from "./faqFlow";
import { faqMenuFlow } from "./faqMenuFlow";

// Mapa para relacionar nombres de flujo con su referencia
const flowMap: Record<string, any> = {
  selectServiceModeFlow,
  faqFlow,
  faqMenuFlow,
  mainMenuFlow,
  greetingFlow,
};

export const intentionGeneralFlow = addKeyword(EVENTS.ACTION).addAction(
  async (ctx, ctxFn) => {
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
    await ctxFn.state.update({ intention: intent });
    await ctxFn.state.update({ initialMessage: null });

    // Buscar en la configuración la intención detectada
    const intentConfig = intentsConfig.find((i) => i.name === intent);
    if (intentConfig) {
      if (intentConfig.isArea) {
        await ctxFn.state.update({ selectedFlow: intent });
      }
      console.log(
        `Redirigiendo usuario ${ctx.from} al flujo: ${intentConfig.flowName}`
      );
      return ctxFn.gotoFlow(flowMap[intentConfig.flowName]);
    }

    console.log(`❌ Intención no reconocida para usuario ${ctx.from}.`);
    return ctxFn.endFlow("No entendí tu mensaje. Por favor, intenta de nuevo.");
  }
);
