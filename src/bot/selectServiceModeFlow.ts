import { addKeyword, EVENTS } from "@builderbot/bot";
import { mainMenuFlow } from "./mainMenuFlow";
import { intermediaryFlow } from "./intermediaryFlow";
import { genericAgentFlow } from "./liveAgents/genericAgentFlow";
import { intentionGeneralFlow } from "./intentionGeneralFlow";
import { AreaConfigService } from "~/services/areaConfigService";
import { ConversationManager } from "~/services/conversationManager";
import { sendAndLogMessage } from "~/services/messageHelper";

const selectServiceModeFlow = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, ctxFn) => {
    // Obtener el área seleccionada desde el state
    const selectedFlow: string = await ctxFn.state.get("selectedFlow");
    if (!selectedFlow) {
      console.log(`⚠️ No se encontró un área válida para ${ctx.from}.`);
      return ctxFn.gotoFlow(mainMenuFlow);
    }

    // Obtener y validar la configuración del área de forma centralizada
    let areaConfig;
    try {
      areaConfig = AreaConfigService.getAreaConfig(selectedFlow);
    } catch (error) {
      console.error(error.message);
      return ctxFn.gotoFlow(mainMenuFlow);
    }

    // Enviar mensaje de bienvenida dinámico utilizando el helper
    const areaMessage = areaConfig.welcomeMessage(areaConfig.waitingTime);
    await sendAndLogMessage(ctx, ctxFn, "assistant", areaMessage);

    // Enviar mensaje de opciones para seleccionar modalidad
    const optionsMessage =
      "\n1️⃣ *Seguir con mi ayuda y obtener información ahora mismo.* 🤖\n" +
      "2️⃣ *Hablar con un asesor y esperar su respuesta.* 👨";
    await sendAndLogMessage(ctx, ctxFn, "assistant", optionsMessage);
  })
  .addAction({ capture: true }, async (ctx, ctxFn) => {
    const userChoice = ctx.body.toLowerCase().trim();
    console.log(`📥 Usuario ${ctx.from} respondió: ${ctx.body}`);

    // Registrar la respuesta del usuario
    const conversationId = await ctxFn.state.get("conversationId");
    if (conversationId) {
      await ConversationManager.logInteraction(
        ctx,
        ctxFn.state,
        "user",
        ctx.body
      );
    }

    // Validar que exista un área seleccionada y obtener la configuración
    const selectedFlow: string = await ctxFn.state.get("selectedFlow");
    if (!selectedFlow) {
      console.log(`⚠️ No se encontró un área válida para ${ctx.from}.`);
      return ctxFn.gotoFlow(mainMenuFlow);
    }
    let areaConfig;
    try {
      areaConfig = AreaConfigService.getAreaConfig(selectedFlow);
    } catch (error) {
      console.error(error.message);
      return ctxFn.gotoFlow(mainMenuFlow);
    }

    // Redirigir según la opción seleccionada
    if (userChoice.includes("1") || userChoice.includes("bot")) {
      console.log(
        `🤖 Usuario ${ctx.from} optó por atención vía bot en ${selectedFlow}.`
      );
      return ctxFn.gotoFlow(intermediaryFlow);
    }
    if (userChoice.includes("2") || userChoice.includes("agente")) {
      console.log(
        `📞 Usuario ${ctx.from} optó por atención en vivo en ${selectedFlow}.`
      );
      return ctxFn.gotoFlow(genericAgentFlow);
    }

    // Si la opción no es válida, redirigir a intentionGeneralFlow
    console.log(
      `⚠️ Usuario ${ctx.from} ingresó una opción no válida. Redirigiendo a intentionGeneralFlow.`
    );
    return ctxFn.gotoFlow(intentionGeneralFlow);
  });

export { selectServiceModeFlow };
