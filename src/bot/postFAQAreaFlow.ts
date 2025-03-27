import { addKeyword, EVENTS } from "@builderbot/bot";
import { faqMenuFlow } from "./faqMenuFlow";
import { selectServiceModeFlow } from "./selectServiceModeFlow";
import { ConversationManager } from "~/services/conversationManager";
import { intentionGeneralFlow } from "./intentionGeneralFlow";

const postFAQAreaFlow = addKeyword(EVENTS.ACTION)
  // Primer bloque: Enviar el mensaje del bot y registrarlo
  .addAction(async (ctx, ctxFn) => {
    let message =
      "🤖 Ahora que conoces cómo funciona esta área, ¿quieres proceder con este proceso o prefieres hacer otra pregunta?\n" +
      "Recuerda que conmigo puedes obtener respuestas rápidas y sin tiempos de espera. Estoy aquí para ayudarte. 😉";
    // Agregar las opciones de modalidad
    message += "\n" + "1️⃣ *Proceder* 🤖\n" + "2️⃣ *Seguir preguntando* 📚";
    await ctxFn.flowDynamic(message);

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
        "No se encontró conversationId para registrar el mensaje del bot en postFAQAreaFlow."
      );
    }
  })
  // Segundo bloque: Capturar la respuesta del usuario, registrarla y procesar la redirección
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

    // Obtener el área seleccionada del estado
    const selectedFlow = await ctxFn.state.get("selectedFlow");
    if (!selectedFlow) {
      const errorMsg =
        "❌ Parece que hubo un pequeño problema y no pude procesar tu elección. No te preocupes, intentémoslo de nuevo. 😊\n" +
        "Solo dime el número o el nombre de la opción que deseas y te guiaré al instante.";
      console.log(`⚠️ No se encontró área seleccionada para ${ctx.from}.`);
      await ctxFn.flowDynamic(errorMsg);
      // Registrar la respuesta del bot en el error
      if (conversationId) {
        await ConversationManager.logInteraction(
          ctx,
          ctxFn.state,
          "assistant",
          errorMsg
        );
      }
      return;
    }

    // Manejo de la respuesta
    if (
      userInput.includes("1") ||
      userInput.includes("proceder") ||
      userInput.includes("continuar")
    ) {
      console.log(
        `📌 Usuario ${ctx.from} quiere continuar en el área de ${selectedFlow}. Redirigiendo a selectServiceModeFlow.`
      );
      return ctxFn.gotoFlow(selectServiceModeFlow);
    }

    if (
      userInput.includes("2") ||
      userInput.includes("preguntas") ||
      userInput.includes("faq") ||
      userInput.includes("seguir")
    ) {
      console.log(`📌 Usuario ${ctx.from} quiere seguir preguntando.`);
      return ctxFn.gotoFlow(faqMenuFlow);
    }

    // Si la respuesta no coincide con ninguna opción, redirigir directamente a intentionGeneralFlow
    console.log(`⚠️ Opción no reconocida en postFAQAreaFlow para ${ctx.from}. Redirigiendo a intentionGeneralFlow.`);
    return ctxFn.gotoFlow(intentionGeneralFlow);
    });

export { postFAQAreaFlow };
