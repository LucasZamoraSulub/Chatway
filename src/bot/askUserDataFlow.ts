// src/bot/askUserDataFlow.ts
import { addKeyword, EVENTS } from "@builderbot/bot";
import { UserService } from "~/controllers/userController";
import { intermediaryFlow } from "./intermediaryFlow";
import { detectKeywordIntents } from "~/services/keywordIntentDetector";
import { extractName } from "~/services/nameExtractor";
import { ConversationManager } from "~/services/conversationManager";
import { intentionGeneralFlow } from "./intentionGeneralFlow";

const askUserDataFlow = addKeyword(EVENTS.ACTION)
  // Primer bloque: enviar y registrar el mensaje del bot
  .addAction(async (ctx, ctxFn) => {
    const botMessage = "👤 Para brindarte una experiencia más personalizada, ¿podrías proporcionarme tu nombre, por favor?";
    await ctxFn.flowDynamic(botMessage);
    const conversationId = await ctxFn.state.get("conversationId");
    if (conversationId) {
      await ConversationManager.logInteraction(ctx, ctxFn.state, "assistant", botMessage);
    } else {
      console.error("No se encontró conversationId para registrar el mensaje del bot en askUserDataFlow.");
    }
  })
  // Segundo bloque: capturar y procesar la respuesta del usuario
  .addAction({ capture: true }, async (ctx, ctxFn) => {
    const respuesta = ctx.body.trim();
    // Registrar la respuesta del usuario
    const conversationId = await ctxFn.state.get("conversationId");
    if (conversationId) {
      await ConversationManager.logInteraction(ctx, ctxFn.state, "user", respuesta);
    }
    
    // Intentar extraer el nombre usando extractName
    const extractedName = extractName(respuesta);
    if (extractedName) {
      console.log(`📝 Usuario ${ctx.from} ingresó el nombre: ${extractedName}`);
      await ctxFn.state.update({ name: extractedName });
      await UserService.registerUser(ctx.from, extractedName, "Sin correo");
      return ctxFn.gotoFlow(intermediaryFlow);
    }
    
    // Si no se pudo extraer un nombre válido, evaluar si es una respuesta negativa
    const lowerRespuesta = respuesta.toLowerCase();
    const detected = detectKeywordIntents(lowerRespuesta);
    if (detected.includes("negativeResponse")) {
      await ctxFn.state.update({ skipRegistration: true });
      console.log(`🔹 Usuario ${ctx.from} optó por no compartir sus datos.`);
      return ctxFn.gotoFlow(intermediaryFlow);
    }
    
    // Si la opción no es válida, redirigir a intentionGeneralFlow
    console.log(`⚠️ No se identificó un nombre válido para ${ctx.from}. Redirigiendo a intentionGeneralFlow.`);
    return ctxFn.gotoFlow(intentionGeneralFlow);
  });

export { askUserDataFlow };