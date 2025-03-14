import { addKeyword, EVENTS } from "@builderbot/bot";
import { mainMenuFlow } from "./mainMenuFlow";
import { intermediaryFlow } from "./intermediaryFlow";
import { genericAgentFlow } from "./liveAgents/genericAgentFlow";
import { areasConfig, AreaConfig } from "~/config/areas.config";

const selectServiceModeFlow = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, ctxFn) => {
    // Obtener el área seleccionada del estado
    const selectedFlow: string = await ctxFn.state.get("selectedFlow");

    // Buscar la configuración del área en areasConfig
    const config: AreaConfig | undefined = areasConfig.find(
      (area) => area.area === selectedFlow
    );

    // Validación: Si no hay un área seleccionada o no existe la configuración, redirige al menú principal
    if (!selectedFlow) {
      console.log(`⚠️ No se encontró un área válida para ${ctx.from}.`);
      return ctxFn.gotoFlow(mainMenuFlow);
    }
    if (!config) {
      console.log(`⚠️ No se encontró configuración para el área ${selectedFlow}.`);
      return ctxFn.gotoFlow(mainMenuFlow);
    }

    // Enviar mensaje de bienvenida dinámico (incluye el tiempo de espera) para el área
    const areaMessage = config.welcomeMessage(config.waitingTime);
    await ctxFn.flowDynamic(areaMessage);

    // Enviar mensaje aparte con las opciones de modalidad
    const optionsMessage =
      "\n1️⃣ *Seguir con mi ayuda y obtener información ahora mismo.* 🤖\n" +
      "2️⃣ *Hablar con un asesor y esperar su respuesta.* 👨";
    await ctxFn.flowDynamic(optionsMessage);
  })
  .addAction({ capture: true }, async (ctx, ctxFn) => {
    const userChoice = ctx.body.toLowerCase().trim();
    const selectedFlow: string = await ctxFn.state.get("selectedFlow");

    // Validar que el área seleccionada existe
    if (!selectedFlow) {
      console.log(`⚠️ No se encontró un área válida para ${ctx.from}.`);
      return ctxFn.gotoFlow(mainMenuFlow);
    }
    const config: AreaConfig | undefined = areasConfig.find(
      (area) => area.area === selectedFlow
    );
    if (!config) {
      console.log(`⚠️ No se encontró configuración para el área ${selectedFlow}.`);
      return ctxFn.gotoFlow(mainMenuFlow);
    }

    // Opción Bot: redirige a intermediaryFlow (atención vía bot)
    if (userChoice.includes("1") || userChoice.includes("bot")) {
      console.log(`🤖 Usuario ${ctx.from} optó por atención vía bot en ${selectedFlow}.`);
      return ctxFn.gotoFlow(intermediaryFlow);
    }

    // Opción Agente: redirige al flujo configurado para atención en vivo en función del área
    if (userChoice.includes("2") || userChoice.includes("agente")) {
      console.log(`📞 Usuario ${ctx.from} optó por ser atendido por un agente en ${selectedFlow}.`);
      return ctxFn.gotoFlow(genericAgentFlow);
    }

    console.log(`⚠️ Usuario ${ctx.from} ingresó una opción no válida.`);
    return ctxFn.fallBack(
      "❌ Opción no válida. Por favor, responde con *1️⃣ Por el bot* o *2️⃣ Por un agente*."
    );
  });

export { selectServiceModeFlow };
