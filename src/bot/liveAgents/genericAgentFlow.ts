import { addKeyword, EVENTS } from "@builderbot/bot";
import { areasConfig, AreaConfig } from "~/config/areas.config";
import { sendMessageToCRM } from "~/services/crmService";
import { ConversationManager } from "~/services/conversationManager";
import { updateTicketSeguimientoPromise } from "~/services/serviceTicket";

export const genericAgentFlow = addKeyword(EVENTS.ACTION)
  // Acción de inicialización (se ejecuta solo la primera vez que se ingresa al flujo)
  .addAction(async (ctx, ctxFn) => {
    const isAgentFlowInitialized = await ctxFn.state.get(
      "isAgentFlowInitialized"
    );
    if (!isAgentFlowInitialized) {
      // Marcar que se ha inicializado el flujo de atención personalizada y desactivar el bot
      await ctxFn.state.update({
        isAgentFlowInitialized: true,
        botOffForThisUser: true,
      });
      console.log(`Bot desactivado para el usuario ${ctx.from}.`);

      // Obtener el id del ticket desde el estado
      const ticketId = await ctxFn.state.get("ticketId");
      // Actualizar el estado del ticket a "En atención personalizada"
      await updateTicketSeguimientoPromise({
        ticketId,
        nuevoSeguimiento: 6, // Estado "En atención personalizada"
      });
      console.log(`Estado del ticket ${ticketId} actualizado a "Pendiente".`);

      // Si hay área seleccionada, actualizar el estado de la conversación (solo una vez)
      const selectedFlow: string = await ctxFn.state.get("selectedFlow");
      if (selectedFlow) {
        await ConversationManager.updateState(ctx, ctxFn.state, 4); // Estado "Atención personalizada"
      }

      // Enviar el mensaje de bienvenida de atención personalizada directamente
      if (selectedFlow) {
        const areaConfig: AreaConfig | undefined = areasConfig.find(
          (area) => area.area === selectedFlow
        );
        if (areaConfig && areaConfig.agent) {
          const welcomeMessage = areaConfig.agent.agentMessage(
            areaConfig.waitingTime
          );
          await ctxFn.flowDynamic(welcomeMessage);
          await ConversationManager.logInteraction(
            ctx,
            ctxFn.state,
            "assistant",
            welcomeMessage
          );
        }
      }
    }
  })
  // Acción para capturar los mensajes entrantes, registrarlos y notificar al CRM
  .addAction({ capture: true }, async (ctx, { gotoFlow, endFlow, state }) => {
    // Verificar si el bot sigue desactivado para este usuario
    const botOff = await state.get<boolean>("botOffForThisUser");
    if (!botOff) {
      console.log(
        `Bot reactivado para el usuario ${ctx.from}. Saliendo de atención personalizada.`
      );
      return endFlow(
        "Atención personalizada finalizada. El bot ha sido reactivado."
      );
    }

    const incomingMessage = ctx.body;
    console.log(`📩 Mensaje recibido de ${ctx.from}: ${incomingMessage}`);

    // Registrar el mensaje del usuario en la conversación
    try {
      await ConversationManager.logInteraction(
        ctx,
        state,
        "user",
        incomingMessage
      );
    } catch (error) {
      console.error("Error registrando el mensaje del usuario:", error);
    }

    try {
      // Obtener el id del ticket desde el estado
      const ticketId = await state.get("ticketId");
      // Notificar el mensaje al CRM usando el servicio sendMessageToCRM con los parámetros actualizados
      await sendMessageToCRM(incomingMessage, ctx.from, ticketId);
      console.log(`Mensaje de ${ctx.from} notificado al CRM correctamente.`);
    } catch (error) {
      console.error("Error al notificar el mensaje al CRM:", error);
    }

    // Permanece en el flujo de atención personalizada para seguir capturando mensajes
    return gotoFlow(genericAgentFlow);
  });
