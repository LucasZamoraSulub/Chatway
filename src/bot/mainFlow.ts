import { addKeyword, EVENTS } from "@builderbot/bot";
import { UserService } from "~/controllers/userController";
import { registerFlow } from "./registerFlow";
import { intentionGeneralFlow } from "./intentionGeneralFlow";
import { ConversationManager } from "~/services/conversationManager";

const mainFlow = addKeyword(EVENTS.WELCOME).addAction(async (ctx, ctxFn) => {
  console.log(`🔹 Usuario ${ctx.from} ha iniciado la conversación.`);

  // Verificar si el usuario ya está registrado
  const isUserRegistered = await UserService.existsUser(ctx.from);
  if (!isUserRegistered) {
    console.log(`🔸 Usuario ${ctx.from} NO está registrado. Redirigiendo a registerFlow.`);
    return ctxFn.gotoFlow(registerFlow);
  }

  // Aseguramos que exista una conversación; si no, se crea
  let conversationId: number;
  try {
    conversationId = await ConversationManager.ensureConversation(ctx, ctxFn.state);
  } catch (error) {
    console.error("Error al asegurar la conversación:", error);
    return ctxFn.endFlow("No se pudo iniciar la conversación.");
  }
  
  // Registrar el mensaje del usuario
  if (ctx.body && ctx.body.trim() !== "") {
    await ConversationManager.logInteraction(ctx, ctxFn.state, "user", ctx.body);
  } else {
    await ConversationManager.logInteraction(ctx, ctxFn.state, "user", "Inicio de conversación");
  }

  console.log(`✅ Usuario ${ctx.from} ya registrado. Redirigiendo a intentionGeneralFlow.`);
  return ctxFn.gotoFlow(intentionGeneralFlow);
});

export { mainFlow };
