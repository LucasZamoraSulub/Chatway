import { addKeyword, EVENTS } from "@builderbot/bot";
import { ConversationManager } from "~/services/conversationManager";
import { AreaConfigService } from "~/services/areaConfigService";
import { sendAndLogMessage } from "~/services/messageHelper";
import { GenericAreaService } from "~/services/genericAreaService";
import { validationFlow } from "../validationFlow";

const genericAreaFlow = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, ctxFn) => {
    console.log(`📌 Usuario ${ctx.from} ingresó al flujo genérico de área.`);

    // Actualizar el estado de la conversación a "Conversando" (estado 3)
    await ConversationManager.updateState(ctx, ctxFn.state, 3);

    // Obtener el área seleccionada desde el state
    const selectedFlow: string = await ctxFn.state.get("selectedFlow");
    if (!selectedFlow) {
      console.error(`❌ No se encontró área seleccionada para ${ctx.from}.`);
      return ctxFn.endFlow("No se detectó una selección de área. Vuelve al menú principal.");
    }

    // Obtener la configuración del área de forma centralizada
    let areaConfig;
    try {
      areaConfig = AreaConfigService.getAreaConfig(selectedFlow);
    } catch (error: any) {
      console.error(error.message);
      return ctxFn.endFlow("Área no reconocida. Vuelve al menú principal.");
    }

    // Enviar mensaje de bienvenida (solo la primera vez)
    const hasSeenWelcome = await ctxFn.state.get("hasSeenWelcome");
    if (!hasSeenWelcome) {
      await ctxFn.state.update({ hasSeenWelcome: true });
      const conversationMessage = areaConfig.conversation.conversationMessage;
      const userName = (await ctxFn.state.get("name")) || "";
      const welcomeMessage = userName && userName !== "Desconocido"
        ? `¡Bienvenido ${userName}! ${conversationMessage}`
        : conversationMessage;
      await sendAndLogMessage(ctx, ctxFn, "assistant", welcomeMessage);
    }

    // Si hay un input pendiente, procesarlo inmediatamente
    const pendingInput = await ctxFn.state.get("pendingInput");
    if (pendingInput && pendingInput.trim() !== "") {
      await ctxFn.state.update({ pendingInput: null });
      const response = await GenericAreaService.processUserInput(pendingInput, selectedFlow, ctx, ctxFn.state);
      await ctxFn.flowDynamic(response);
      return ctxFn.gotoFlow(validationFlow);
    }
  })
  .addAction({ capture: true }, async (ctx, ctxFn) => {
    let userInput = ctx.body?.toLowerCase().trim();
    if (!userInput || userInput === "") {
      userInput = await ctxFn.state.get("pendingInput");
      await ctxFn.state.update({ pendingInput: null });
    }
    try {
      const selectedFlow: string = await ctxFn.state.get("selectedFlow");
      const response = await GenericAreaService.processUserInput(userInput, selectedFlow, ctx, ctxFn.state);
      await ctxFn.flowDynamic(response);
      return ctxFn.gotoFlow(validationFlow);
    } catch (error) {
      console.error("Error procesando la entrada del usuario:", error);
      return ctxFn.endFlow("Ocurrió un error procesando tu solicitud.");
    }
  });

export { genericAreaFlow };
