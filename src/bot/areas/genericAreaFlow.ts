import { addKeyword, EVENTS } from "@builderbot/bot";
import { UserService } from "~/controllers/userController";
import { ConversationService } from "~/controllers/conversationController";
import { config } from "../../config";
import fs from "fs";
import path from "path";
import aiServices from "~/services/aiServices";
import { areasConfig, AreaConfig } from "~/config/areas.config";
import { postAreaFlow } from "../postAreaFlow";
import { ConversationManager } from "~/services/conversationManager";

async function processUserInput(
  userInput: string,
  ctx: any,
  ctxFn: any
): Promise<any> {
  const selectedFlow: string = await ctxFn.state.get("selectedFlow");
  console.log(`📥 Procesando consulta en ${selectedFlow}: ${userInput}`);

  // Recuperar el historial de la conversación desde el state (iniciado con el primer mensaje del usuario)
  let history: { role: string; content: string }[] = await ctxFn.state.get(
    "conversationHistory"
  );
  if (!history) {
    history = [];
  }

  // Agregar el mensaje del usuario al historial y registrarlo en la BD
  history.push({ role: "user", content: userInput });
  await ConversationManager.logInteraction(ctx, ctxFn.state, "user", userInput);
  await ctxFn.state.update({ conversationHistory: history });

  // Formar el contexto para la IA: tomar los últimos 6 elementos (3 pares) o el total disponible y 1 extra para el ultimo mensaje del usuario
  // Si el historial tiene de 7 mensajes, tomamos los últimos 6 (3 pares) y el último mensaje del usuario
  const startIndex = history.length > 7 ? history.length - 7 : 0;
  const context = history.slice(startIndex);
  console.log("🤖 Contexto enviado a IA:", context);

  // Buscar la configuración del área
  const areaConfig: AreaConfig | undefined = areasConfig.find(
    (area) => area.area === selectedFlow
  );
  if (!areaConfig || !areaConfig.conversation) {
    console.error(
      `❌ No se encontró configuración para el área ${selectedFlow}.`
    );
    return ctxFn.endFlow("Área no reconocida. Vuelve al menú principal.");
  }

  // Cargar el prompt especializado
  const promptPath = path.join(
    process.cwd(),
    "assets/Prompts/areas",
    areaConfig.conversation.promptFile
  );
  const promptContent = fs.readFileSync(promptPath, "utf8");

  const AI = new aiServices(config.ApiKey);
  let response = await AI.chat(promptContent, context);
  if (!response || response.includes("No encontré información")) {
    response =
      areaConfig.conversation.fallbackResponse ||
      "❌ No se encontró información exacta. ¿Podrías darme más detalles?";
  }
  console.log(`🤖 Respuesta de IA para ${selectedFlow}: ${response}`);

  // Registrar la respuesta del bot en el historial y en la BD
  history.push({ role: "assistant", content: response });
  await ConversationManager.logInteraction(
    ctx,
    ctxFn.state,
    "assistant",
    response
  );
  await ctxFn.state.update({ conversationHistory: history });

  await ctxFn.flowDynamic(response);
  return ctxFn.gotoFlow(postAreaFlow);
}

const genericAreaFlow = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, ctxFn) => {
    console.log(`📌 Usuario ${ctx.from} ingresó al flujo genérico de área.`);

    // Actualizar el estado de la conversación a 3 ("Conversando")
    await ConversationManager.updateState(ctx, ctxFn.state, 3);

    // Obtener el área seleccionada del state
    const selectedFlow: string = await ctxFn.state.get("selectedFlow");

    if (!selectedFlow) {
      console.error(`❌ No se encontró área seleccionada para ${ctx.from}.`);
      return ctxFn.endFlow(
        "No se detectó una selección de área. Vuelve al menú principal."
      );
    }

    // Buscar la configuración correspondiente al área
    const areaConfig: AreaConfig | undefined = areasConfig.find(
      (area) => area.area === selectedFlow
    );
    if (!areaConfig || !areaConfig.conversation) {
      console.error(
        `❌ No se encontró configuración para el área ${selectedFlow}.`
      );
      return ctxFn.endFlow(
        "Área no reconocida. Vuelve a intentarlo desde el menú principal."
      );
    }

    // Enviar mensaje de bienvenida a la conversación (solo la primera vez)
    const hasSeenWelcome = await ctxFn.state.get("hasSeenWelcome");
    if (!hasSeenWelcome) {
      await ctxFn.state.update({ hasSeenWelcome: true });
      const conversationMessage = areaConfig.conversation.conversationMessage;
      const userName = (await ctxFn.state.get("name")) || "";
      const welcomeMessage =
        userName && userName !== "Desconocido"
          ? `¡Bienvenido ${userName}! ${conversationMessage}`
          : conversationMessage;
      await ctxFn.flowDynamic(welcomeMessage);
      // Registrar el mensaje de bienvenida en la BD (aunque NO se añade al historial en el state)
      await ConversationManager.logInteraction(
        ctx,
        ctxFn.state,
        "assistant",
        welcomeMessage
      );
    }

    // Si existe un input pendiente en el state, procesarlo inmediatamente
    const pendingInput = await ctxFn.state.get("pendingInput");
    if (pendingInput && pendingInput.trim() !== "") {
      await ctxFn.state.update({ pendingInput: null });
      return processUserInput(pendingInput, ctx, ctxFn);
    }
  })
  .addAction({ capture: true }, async (ctx, ctxFn) => {
    let userInput = ctx.body?.toLowerCase().trim();
    if (!userInput || userInput === "") {
      userInput = await ctxFn.state.get("pendingInput");
      await ctxFn.state.update({ pendingInput: null });
    }
    return processUserInput(userInput, ctx, ctxFn);
  });

export { genericAreaFlow };
