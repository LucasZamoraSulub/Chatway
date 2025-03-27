import { addKeyword, EVENTS } from "@builderbot/bot";
import { faqMenuFlow } from "./faqMenuFlow";
import { ConversationManager } from "~/services/conversationManager";
import { intentionGeneralFlow } from "./intentionGeneralFlow";

const postFAQFlow = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, ctxFn) => {
    let message =
      "¿Tienes alguna otra duda o pregunta? 😊\n" +
      "Recuerda que conmigo puedes obtener respuestas rápidas sin necesidad de esperar.";
    // Agregar las opciones de modalidad
    message += "\n" + "1️⃣ *Seguir preguntando* ✅\n" + "2️⃣ *No tengo dudas* ❌";
    await ctxFn.flowDynamic(message);

    // Registrar el mensaje del bot en la conversación
    const conversationId = await ctxFn.state.get("conversationId");
    if (conversationId) {
      await ConversationManager.logInteraction(
        ctx,
        ctxFn.state,
        "assistant",
        message
      );
    } else {
      console.error(
        "No se encontró conversationId al registrar el mensaje del bot en postFAQFlow."
      );
    }
  })
  // Segundo bloque: Capturar la respuesta del usuario, registrarla y procesarla
  .addAction({ capture: true }, async (ctx, ctxFn) => {
    const userInput = ctx.body.trim().toLowerCase();
    console.log(`📥 Usuario ${ctx.from} respondió: ${ctx.body}`);

    // Registrar la respuesta del usuario
    const conversationId = await ctxFn.state.get("conversationId");
    if (conversationId) {
      await ConversationManager.logInteraction(
        ctx,
        ctxFn.state,
        "user",
        ctx.body
      );
    }

    if (
      userInput.includes("1") ||
      userInput.includes("sí") ||
      userInput.includes("si")
    ) {
      console.log(`📌 Usuario ${ctx.from} quiere seguir preguntando.`);
      return ctxFn.gotoFlow(faqMenuFlow); // Redirige a refrescar el menú FAQ
    }

    if (
      userInput.includes("2") ||
      userInput.includes("no") ||
      userInput.includes("❌")
    ) {
      console.log(
        `📌 Usuario ${ctx.from} no necesita más ayuda. Finalizando conversación.`
      );
      const farewell =
        "✅ ¡Gracias por tu tiempo! 😊\n" +
        "Espero haber resuelto tus dudas. Recuerda que estoy aquí para ayudarte en cualquier momento, sin esperas y con respuestas rápidas. ¡Vuelve cuando lo necesites! 🌟";

      await ctxFn.flowDynamic(farewell);
      // Registrar la respuesta del bot (mensaje de despedida)
      if (conversationId) {
        await ConversationManager.logInteraction(
          ctx,
          ctxFn.state,
          "assistant",
          farewell
        );
      }
      return ctxFn.endFlow();
    }

    // Si la respuesta no coincide con ninguna opción, redirigir directamente a intentionGeneralFlow
    console.log(`⚠️ Opción no reconocida en postFAQFlow para ${ctx.from}. Redirigiendo a intentionGeneralFlow.`);
    return ctxFn.gotoFlow(intentionGeneralFlow);
  });

export { postFAQFlow };
