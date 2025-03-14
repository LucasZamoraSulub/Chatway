import { addKeyword, EVENTS } from "@builderbot/bot";
import { areasConfig, AreaConfig } from "~/config/areas.config";

export const genericAgentFlow = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, ctxFn) => {
    console.log(`🛠️ Usuario ${ctx.from} ha ingresado al flujo genérico de atención personalizada.`);
    
    // Obtener el área seleccionada desde el estado
    const selectedFlow: string = await ctxFn.state.get("selectedFlow");
    // Buscar la configuración correspondiente
    const areaConfig: AreaConfig | undefined = areasConfig.find(
      (area) => area.area === selectedFlow
    );
    
    if (!areaConfig || !areaConfig.agent) {
      console.error(`⚠️ No se encontró configuración de agente para el área ${selectedFlow}`);
      return ctxFn.endFlow("No se encontró configuración para atención personalizada. Vuelve al menú principal.");
    }
    
    // Generar el mensaje de atención personalizada usando la función agentMessage y el waitingTime
    const message = areaConfig.agent.agentMessage(areaConfig.waitingTime);
    await ctxFn.flowDynamic(message);
  })
  .addAction(async (ctx, { endFlow, state }) => {
    // Al finalizar, obtener la configuración nuevamente para mostrar el mensaje de cierre
    const selectedFlow: string = await state.get("selectedFlow");
    const areaConfig: AreaConfig | undefined = areasConfig.find(
      (area) => area.area === selectedFlow
    );
    if (!areaConfig || !areaConfig.agent) {
      return endFlow("Atención personalizada finalizada.");
    }
    // console.log para verificar que se está cerrando el flujo
    console.log(`✅ Conversación finalizada después de atención personalizada en ${selectedFlow}.`);
    return endFlow(areaConfig.agent.endFlowMessage);
  });

