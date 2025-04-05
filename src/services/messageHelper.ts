import { ConversationManager } from "~/services/conversationManager";

/**
 * Envía un mensaje al usuario y lo registra en la conversación.
 * @param ctx - Contexto del flujo.
 * @param ctxFn - Funciones del flujo (para actualizar el estado, enviar mensajes, etc.).
 * @param role - Rol que envía el mensaje ("assistant" o "user").
 * @param message - El mensaje a enviar y registrar.
 */
export async function sendAndLogMessage(ctx: any, ctxFn: any, role: "assistant" | "user", message: string): Promise<void> {
  // Enviar el mensaje al usuario
  await ctxFn.flowDynamic(message);
  
  // Obtener el conversationId del estado
  const conversationId = await ctxFn.state.get("conversationId");
  if (conversationId) {
    // Registrar el mensaje en la conversación
    await ConversationManager.logInteraction(ctx, ctxFn.state, role, message);
  } else {
    console.error("No se encontró conversationId para registrar el mensaje:", message);
  }
}
