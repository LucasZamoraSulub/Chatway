import { addKeyword, EVENTS } from "@builderbot/bot";
import { areasConfig, AreaConfig } from "~/config/areas.config";
import { sendTicketToCRM } from "~/services/crmService";
import { ConversationManager } from "~/services/conversationManager";

export const genericAgentFlow = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, ctxFn) => {
    console.log(
      `🛠️ Usuario ${ctx.from} ha ingresado al flujo genérico de atención personalizada.`
    );

    // Notificar al CRM enviando el ticket generado
    // const ticketId = await ctxFn.state.get("ticketId");
    // if (ticketId) {
    //   try {
    //     await sendTicketToCRM(ticketId);
    //     console.log(`Ticket ${ticketId} notificado al CRM correctamente.`);
    //   } catch (error) {
    //     console.error("Error al notificar al CRM:", error);
    //   }
    // } else {
    //   console.warn(
    //     "No se encontró ticketId en el estado para notificar al CRM."
    //   );
    // }

    // Obtener el área seleccionada desde el estado
    const selectedFlow: string = await ctxFn.state.get("selectedFlow");
    // Buscar la configuración correspondiente
    const areaConfig: AreaConfig | undefined = areasConfig.find(
      (area) => area.area === selectedFlow
    );

    if (!areaConfig || !areaConfig.agent) {
      console.error(
        `⚠️ No se encontró configuración de agente para el área ${selectedFlow}`
      );
      return ctxFn.endFlow(
        "No se encontró configuración para atención personalizada. Vuelve al menú principal."
      );
    }

    // Actualizar el estado de la conversación a 4 ("Atención personalizada")
    await ConversationManager.updateState(ctx, ctxFn.state, 4);

    // Generar el mensaje de atención personalizada usando la función agentMessage y el waitingTime
    const message = areaConfig.agent.agentMessage(areaConfig.waitingTime);
    await ctxFn.flowDynamic(message);
    // Registrar el mensaje del bot en la BD
    const convId = await ctxFn.state.get("conversationId");
    if (convId) {
      await ConversationManager.logInteraction(
        ctx,
        ctxFn.state,
        "assistant",
        message
      );
    } else {
      console.error(
        "No se encontró conversationId para registrar el mensaje del bot en genericAgentFlow."
      );
    }
  })
  .addAction(async (ctx, { endFlow, state }) => {
    const selectedFlow: string = await state.get("selectedFlow");
    const areaConfig: AreaConfig | undefined = areasConfig.find(
      (area) => area.area === selectedFlow
    );
    let finalMessage = "Atención personalizada finalizada.";
    if (areaConfig && areaConfig.agent) {
      finalMessage = areaConfig.agent.endFlowMessage;
    }
    // Registrar el mensaje final del bot en la BD
    const conversationId = await state.get("conversationId");
    if (conversationId) {
      await ConversationManager.logInteraction(ctx, state, "assistant", finalMessage);
    }
    console.log(`✅ Conversación finalizada después de atención personalizada en ${selectedFlow}.`);
    return endFlow(finalMessage);
  });
  
