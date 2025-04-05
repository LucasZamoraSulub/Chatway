import { addKeyword, EVENTS } from "@builderbot/bot";
import { genericAgentFlow } from "./liveAgents/genericAgentFlow";
import { MetricsService } from "~/services/metricsService";
import { AreaConfigService } from "~/services/areaConfigService";
import { ConversationManager } from "~/services/conversationManager";

const contactInfoValidationFlow = addKeyword(EVENTS.ACTION).addAction(
  { capture: true },
  async (ctx, ctxFn) => {
    const response = ctx.body.toLowerCase().trim();

    // Registrar la respuesta del usuario en la BD
    await ConversationManager.logInteraction(
      ctx,
      ctxFn.state,
      "user",
      response
    );

    if (
      response.includes("sí") ||
      response.includes("si") ||
      response.includes("1") ||
      response.includes("continuar")
    ) {
      const botMsg = "¡Entendido! Continuamos con el proceso. 😊";
      await ctxFn.flowDynamic(botMsg);
      await ConversationManager.logInteraction(
        ctx,
        ctxFn.state,
        "assistant",
        botMsg
      );

      try {
        // Obtener el ID de conversación y la configuración del área
        const conversationId = await ctxFn.state.get("conversationId");
        const selectedFlow: string = await ctxFn.state.get("selectedFlow");
        const areaConfig = AreaConfigService.getAreaConfig(selectedFlow);

        // Analizar la conversación y guardar métricas en la BD
        const metricsId = await MetricsService.analyzeConversationAndSave(
          conversationId,
          areaConfig
        );
        await ctxFn.state.update({ metricsId });
        console.log(`Métricas guardadas con ID: ${metricsId}`);

        // Generar el ticket para la conversación
        const ticketId = await MetricsService.generateTicketForConversation(
          conversationId,
          areaConfig,
          ctx.from
        );
        await ctxFn.state.update({ ticketId });
        console.log(`Ticket generado con ID: ${ticketId}`);
      } catch (error) {
        console.error(
          "Error en análisis de métricas y generación de ticket:",
          error
        );
        const errorMsg =
          "Error al procesar la solicitud. Continuamos sin métricas y ticket.";
        await ctxFn.flowDynamic(errorMsg);
        await ConversationManager.logInteraction(
          ctx,
          ctxFn.state,
          "assistant",
          errorMsg
        );
      }

      return ctxFn.gotoFlow(genericAgentFlow);
    } else if (
      response.includes("no") ||
      response.includes("2") ||
      response.includes("finalizar")
    ) {
      const farewell =
        "¡Proceso finalizado! Muchas gracias por tu tiempo. ¡Que tengas un excelente día! 😊";
      await ctxFn.flowDynamic(farewell);
      // Actualizar resultado_conversacion a 1 para la opción 2
      await ConversationManager.updateResult(ctx, ctxFn.state, 3);
      await ConversationManager.logInteraction(
        ctx,
        ctxFn.state,
        "assistant",
        farewell
      );
      return ctxFn.endFlow();
    } else {
      const unclear =
        "😕 Lo siento, no entendí tu respuesta. Por favor, responde 'sí' o 'no'.";
      await ctxFn.flowDynamic(unclear);
      await ConversationManager.logInteraction(
        ctx,
        ctxFn.state,
        "assistant",
        unclear
      );

      await ConversationManager.updateState(ctx, ctxFn.state, 6);

      await ConversationManager.updateResult(ctx, ctxFn.state, 3);

      return ctxFn.gotoFlow(contactInfoValidationFlow);
    }
  }
);

export { contactInfoValidationFlow };
