import { addKeyword, EVENTS } from "@builderbot/bot";
import { genericAreaFlow } from "./areas/genericAreaFlow";
import { postAreaFlow } from "./postAreaFlow";
import { ConversationManager } from "~/services/conversationManager";

const validationFlow = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, ctxFn) => {
    // Opcional: Obtener contador y controlar el número máximo de validaciones
    let validationCount: number =
      (await ctxFn.state.get("validationCount")) || 0;
    if (validationCount >= 3) {
      console.log(
        `Máximo de validaciones alcanzado para ${ctx.from}. Redirigiendo a postAreaFlow.`
      );
      return ctxFn.gotoFlow(postAreaFlow);
    }
    validationCount++;
    await ctxFn.state.update({ validationCount });

    // Enviar mensaje de validación
    const botMessage = `¿Tienes alguna otra duda u otra consulta😊? 
\n1️⃣ *Si, continuar conversando*\n2️⃣ *No, finalizar conversación*`;
    await ctxFn.flowDynamic(botMessage);
    // Registrar el mensaje del bot en la BD
    await ConversationManager.logInteraction(
      ctx,
      ctxFn.state,
      "assistant",
      botMessage
    );
  })
  .addAction({ capture: true }, async (ctx, ctxFn) => {
    const userResponse = ctx.body.toLowerCase().trim();
    console.log(`Respuesta de validación de ${ctx.from}: ${userResponse}`);

    // Obtener conversationId (pero sin registrar el mensaje ahora)
    const conversationId = await ctxFn.state.get("conversationId");

    if (
      userResponse.includes("sí") ||
      userResponse.includes("si") ||
      userResponse.includes("1") ||
      userResponse.includes("continuar")
    ) {
      // Reiniciar contador y redirigir a genericAreaFlow para continuar la conversación
      await ctxFn.state.update({ validationCount: 0 });
      if (conversationId) {
        await ConversationManager.logInteraction(
          ctx,
          ctxFn.state,
          "user",
          userResponse
        );
      }
      return ctxFn.gotoFlow(genericAreaFlow);
    }
    if (
      userResponse.includes("no") ||
      userResponse.includes("2") ||
      userResponse.includes("finalizar")
    ) {
      if (conversationId) {
        await ConversationManager.logInteraction(
          ctx,
          ctxFn.state,
          "user",
          userResponse
        );
      }
      // Redirigir a postAreaFlow para la siguiente etapa
      return ctxFn.gotoFlow(postAreaFlow);
    }
    // Si la respuesta no es clara, guardar el input en pendingInput para procesarlo en genericAreaFlow
    console.log(
      `Respuesta no válida en validación para ${ctx.from}. Se guarda en pendingInput.`
    );
    await ctxFn.state.update({ pendingInput: ctx.body });
    return ctxFn.gotoFlow(genericAreaFlow);
  });

export { validationFlow };
