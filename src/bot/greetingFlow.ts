import { addKeyword, EVENTS } from "@builderbot/bot";
import { mainMenuFlow } from "./mainMenuFlow";
import { ConversationManager } from "~/services/conversationManager";

const greetingFlow = addKeyword(EVENTS.ACTION).addAction(async (ctx, ctxFn) => {
  console.log(`🎉 Usuario ${ctx.from} ha llegado a greetingFlow.`);
  const welcomeMessage =
    "¡Hola! 👋 Soy Sami Bot, el asistente virtual de Grupo SAOM, y estoy aquí para ayudarte en lo que necesites. 😊\n";

  // Enviar el mensaje de bienvenida
  await ctxFn.flowDynamic(welcomeMessage);

  // Registrar la respuesta del bot en la conversación
  try {
    await ConversationManager.logInteraction(
      ctx,
      ctxFn.state,
      "assistant",
      welcomeMessage
    );
  } catch (error) {
    console.error("No se pudo registrar el mensaje del bot:", error);
  }

  console.log(`📌 Redirigiendo usuario ${ctx.from} a mainMenuFlow.`);
  return ctxFn.gotoFlow(mainMenuFlow);
});

export { greetingFlow };
