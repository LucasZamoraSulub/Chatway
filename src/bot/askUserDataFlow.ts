import { addKeyword, EVENTS } from "@builderbot/bot";
import { UserService } from "~/controllers/userController";
import { intermediaryFlow } from "./intermediaryFlow";
import { detectKeywordIntents } from "~/services/keywordIntentDetector";
import { extractName } from "~/services/nameExtractor";
import { ConversationManager } from "~/services/conversationManager";
import { intentionGeneralFlow } from "./intentionGeneralFlow";
import { sendAndLogMessage } from "~/services/messageHelper";
import { registerUserPromise } from "~/services/serviceUser";

const askUserDataFlow = addKeyword(EVENTS.ACTION)
  // Primer bloque: enviar y registrar el mensaje del bot usando el helper
  .addAction(async (ctx, ctxFn) => {
    const botMessage =
      "👤 Para brindarte una experiencia más personalizada, ¿podrías proporcionarme tu nombre, por favor?";
    await sendAndLogMessage(ctx, ctxFn, "assistant", botMessage);
  })
  // Segundo bloque: capturar y procesar la respuesta del usuario
  .addAction({ capture: true }, async (ctx, ctxFn) => {
    const respuesta = ctx.body.trim();
    // Registrar la respuesta del usuario en la conversación
    await ConversationManager.logInteraction(
      ctx,
      ctxFn.state,
      "user",
      respuesta
    );

    // Intentar extraer el nombre usando extractName
    const extractedName = extractName(respuesta);
    if (extractedName) {
      console.log(`📝 Usuario ${ctx.from} ingresó el nombre: ${extractedName}`);
      await ctxFn.state.update({ name: extractedName });
      // Usar el helper registerUserPromise para registrar el usuario
      try {
        await registerUserPromise(ctx.from, extractedName, "Sin correo");
      } catch (error) {
        console.error("Error registrando usuario:", error);
        // Opcional: podrías redirigir a otro flujo o finalizar con un error
      }
      return ctxFn.gotoFlow(intermediaryFlow);
    }

    // Evaluar si la respuesta indica una negativa para compartir datos
    const lowerRespuesta = respuesta.toLowerCase();
    const detected = detectKeywordIntents(lowerRespuesta);
    if (detected.includes("negativeResponse")) {
      await ctxFn.state.update({ skipRegistration: true });
      console.log(`🔹 Usuario ${ctx.from} optó por no compartir sus datos.`);
      return ctxFn.gotoFlow(intermediaryFlow);
    }

    // Si no se identificó un nombre válido, redirigir a intentionGeneralFlow
    console.log(
      `⚠️ No se identificó un nombre válido para ${ctx.from}. Redirigiendo a intentionGeneralFlow.`
    );
    return ctxFn.gotoFlow(intentionGeneralFlow);
  });

export { askUserDataFlow };
