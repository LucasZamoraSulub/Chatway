import { addKeyword, EVENTS } from "@builderbot/bot";
import { ConversationService } from "~/controllers/conversationController";
import { areasConfig, AreaConfig } from "~/config/areas.config";
import { genericAreaFlow } from "./areas/genericAreaFlow";
import { contactInfoFlow } from "./ContactInfoFlow";
import { ConversationManager } from "~/services/conversationManager";
import { fetchUserIdPromise } from "~/services/serviceUser";
// import { generateTicketPromise } from "~/services/serviceTicket"; // Ya no se usa aquí

const postAreaFlow = addKeyword(EVENTS.ACTION)
  // Primera acción: Mostrar mensaje de opciones según la configuración del área
  .addAction(async (ctx, ctxFn) => {
    const selectedFlow: string = await ctxFn.state.get("selectedFlow");
    const areaConfig: AreaConfig | undefined = areasConfig.find(
      (area) => area.area === selectedFlow
    );
    if (!areaConfig || !areaConfig.conversation) {
      console.log(
        `⚠️ No se encontró configuración para el área ${selectedFlow}.`
      );
      return ctxFn.endFlow("Área no reconocida. Vuelve al menú principal.");
    }
    await ctxFn.flowDynamic(areaConfig.conversation.postOptions);

    // Registrar el mensaje del bot en la BD
    const conversationId = await ctxFn.state.get("conversationId");
    if (conversationId) {
      await ConversationManager.logInteraction(
        ctx,
        ctxFn.state,
        "assistant",
        areaConfig.conversation.postOptions
      );
    } else {
      console.error(
        "No se encontró conversationId para registrar el mensaje del bot en postAreaFlow."
      );
    }
  })
  // Segunda acción: Capturar respuesta y redirigir
  .addAction({ capture: true }, async (ctx, ctxFn) => {
    const respuesta = ctx.body.toLowerCase().trim();
    console.log(`📥 Usuario ${ctx.from} respondió: ${respuesta}`);

    const selectedFlow: string = await ctxFn.state.get("selectedFlow");
    const areaConfig: AreaConfig | undefined = areasConfig.find(
      (area) => area.area === selectedFlow
    );
    if (!areaConfig || !areaConfig.conversation) {
      console.log(
        `⚠️ No se encontró configuración para el área ${selectedFlow}.`
      );
      return ctxFn.endFlow("Área no reconocida. Vuelve al menú principal.");
    }

    // Obtener conversationId (pero sin registrar el mensaje ahora)
    const conversationId = await ctxFn.state.get("conversationId");

    // Opción 1: Seguir conversando
    if (respuesta.includes("1") || respuesta.includes("seguir") || respuesta.includes("continuar")) {
      console.log(
        `🔄 Usuario ${ctx.from} optó por seguir conversando en el área ${selectedFlow}.`
      );
      if (conversationId) {
        await ConversationManager.logInteraction(
          ctx,
          ctxFn.state,
          "user",
          respuesta
        );
      }
      return ctxFn.gotoFlow(genericAreaFlow);
    }

    // Opción 2: Atención personalizada o cotización
    if (
      respuesta.includes("2") ||
      respuesta.includes("atención") ||
      respuesta.includes("cotizar")
    ) {
      console.log(
        `📊 Usuario ${ctx.from} optó por atención personalizada en el área ${selectedFlow}.`
      );
      if (conversationId) {
        await ConversationManager.logInteraction(
          ctx,
          ctxFn.state,
          "user",
          respuesta
        );

        await ConversationManager.updateState(ctx, ctxFn.state, 4);
      }
      // Redirigir a contactInfoFlow para que se solicite información de contacto y se procese el análisis de métricas.
      return ctxFn.gotoFlow(contactInfoFlow);
    }

    // Si la respuesta no es válida, guardar el mensaje pendiente y volver a genericAreaFlow
    console.log(
      `⚠️ Opción no válida. Guardando mensaje pendiente y redirigiendo a genericAreaFlow.`
    );
    await ctxFn.state.update({ pendingInput: respuesta });
    return ctxFn.gotoFlow(genericAreaFlow);
  });

export { postAreaFlow };
