// src/bot/askUserDataFlow.ts
import { addKeyword, EVENTS } from "@builderbot/bot";
import { UserService } from "~/controllers/userController";
import { intermediaryFlow } from "./intermediaryFlow";
import { detectKeywordIntents } from "~/services/keywordIntentDetector";
import { extractName } from "~/services/nameExtractor";

const askUserDataFlow = addKeyword(EVENTS.ACTION)
  .addAnswer(
    "👤 Para brindarte una experiencia más personalizada, ¿podrías proporcionarme tu nombre, por favor?",
    { capture: true },
    async (ctx, ctxFn) => {
      const respuesta = ctx.body.trim();
      
      // Primero se intenta extraer el nombre usando extractName
      const extractedName = extractName(respuesta);
      
      if (extractedName) {
        console.log(`📝 Usuario ${ctx.from} ingresó el nombre: ${extractedName}`);
        await ctxFn.state.update({ name: extractedName });
        await UserService.registerUser(ctx.from, extractedName, "Sin correo");
        // await ctxFn.flowDynamic(`¡Genial, ${extractedName}! Gracias por compartir tus datos. Continuemos con la experiencia personalizada.`);
        return ctxFn.gotoFlow(intermediaryFlow);
      }
      
      // Si no se pudo extraer un nombre válido, se evalúa si se trata de una respuesta negativa.
      const lowerRespuesta = respuesta.toLowerCase();
      const detected = detectKeywordIntents(lowerRespuesta);
      if (detected.includes("negativeResponse")) {
        await ctxFn.state.update({ skipRegistration: true });
        console.log(`🔹 Usuario ${ctx.from} optó por no compartir sus datos.`);
        // await ctxFn.flowDynamic("Entendido, continuaremos sin personalización. ¡Gracias por tu respuesta!");
        return ctxFn.gotoFlow(intermediaryFlow);
      }
      
      return ctxFn.fallBack("😕 No pude identificar un nombre válido. Por favor, intenta de nuevo ingresando solo tu nombre o responde 'no' si prefieres no compartirlo.");
    }
  );

export { askUserDataFlow };
