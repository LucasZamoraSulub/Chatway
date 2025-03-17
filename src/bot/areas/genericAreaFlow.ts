import { addKeyword, EVENTS } from "@builderbot/bot";
import { UserService } from "~/controllers/userController";
import { ConversationService } from "~/controllers/conversationController";
import { config } from "../../config";
import fs from "fs";
import path from "path";
import aiServices from "~/services/aiServices";
import { areasConfig, AreaConfig } from "~/config/areas.config";
import { postAreaFlow } from "../postAreaFlow";

async function processUserInput(userInput: string, ctx: any, ctxFn: any): Promise<any> {
  const selectedFlow: string = await ctxFn.state.get("selectedFlow");
  console.log(`📥 Procesando consulta en ${selectedFlow}: ${userInput}`);

  // Obtener el ID de la conversación y el contexto (últimos 3 mensajes)
  const conversationId = await ctxFn.state.get("conversationId");
  const history = (await ConversationService.getContext(conversationId, 3)) || [];
  history.push({ role: "user", content: userInput });
  console.log("🤖 Contexto enviado a IA:", history);

  // Buscar la configuración del área
  const areaConfig: AreaConfig | undefined = areasConfig.find(
    (area) => area.area === selectedFlow
  );
  if (!areaConfig || !areaConfig.conversation) {
    console.error(`❌ No se encontró configuración para el área ${selectedFlow}.`);
    return ctxFn.endFlow("Área no reconocida. Vuelve al menú principal.");
  }

  // Cargar el prompt especializado usando la propiedad conversation.promptFile
  const promptPath = path.join(
    process.cwd(),
    "assets/Prompts/areas",
    areaConfig.conversation.promptFile
  );
  const promptContent = fs.readFileSync(promptPath, "utf8");

  const AI = new aiServices(config.ApiKey);
  let response = await AI.chat(promptContent, history);
  if (!response || response.includes("No encontré información")) {
    response =
      areaConfig.conversation.fallbackResponse ||
      "❌ No se encontró información exacta. ¿Podrías darme más detalles?";
  }
  console.log(`🤖 Respuesta de IA para ${selectedFlow}: ${response}`);

  // Registrar la interacción en la BD usando el idApartamento configurado
  await ConversationService.recordMessage(
    conversationId,
    userInput,
    response,
    { idApartamento: areaConfig.conversation.idApartamento }
  );

  await ctxFn.flowDynamic(response);
  // Redirigir al flujo postAreaFlow para continuar con el proceso (por ejemplo, análisis de métricas, generación de ticket, etc.)
  return ctxFn.gotoFlow(postAreaFlow);
}

export const genericAreaFlow = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, ctxFn) => {
    console.log(`📌 Usuario ${ctx.from} ingresó al flujo genérico de área.`);

    // Obtener el área seleccionada del state
    const selectedFlow: string = await ctxFn.state.get("selectedFlow");
    if (!selectedFlow) {
      console.error(`❌ No se encontró área seleccionada para ${ctx.from}.`);
      return ctxFn.endFlow("No se detectó una selección de área. Vuelve al menú principal.");
    }

    // Buscar la configuración correspondiente al área
    const areaConfig: AreaConfig | undefined = areasConfig.find(
      (area) => area.area === selectedFlow
    );
    if (!areaConfig || !areaConfig.conversation) {
      console.error(`❌ No se encontró configuración para el área ${selectedFlow}.`);
      return ctxFn.endFlow("Área no reconocida. Vuelve a intentarlo desde el menú principal.");
    }

    // Verificar si ya existe una conversación en la BD
    let conversationId = await ctxFn.state.get("conversationId");
    if (!conversationId) {
      const idCliente = await UserService.fetchUserId(ctx.from);
      if (!idCliente) {
        console.error(`❌ No se encontró un cliente con el número ${ctx.from}.`);
        return ctxFn.endFlow("No se pudo iniciar la conversación: cliente no registrado.");
      }
      conversationId = await ConversationService.startConversation(idCliente);
      await ctxFn.state.update({ conversationId });
      console.log(`Nueva conversación creada en BD con ID: ${conversationId}`);
    }

    // Enviar mensaje de bienvenida a la conversación (solo la primera vez)
    const hasSeenWelcome = await ctxFn.state.get("hasSeenWelcome");
    if (!hasSeenWelcome) {
      await ctxFn.state.update({ hasSeenWelcome: true });
      const conversationMessage = areaConfig.conversation.conversationMessage;
      const userName = (await ctxFn.state.get("name")) || "";
      const welcomeMessage = (userName && userName !== "Desconocido")
        ? `¡Bienvenido ${userName}! ${conversationMessage}`
        : conversationMessage;
      await ctxFn.flowDynamic(welcomeMessage);
    }

    // Si existe un input pendiente en el estado, procesarlo inmediatamente
    const pendingInput = await ctxFn.state.get("pendingInput");
    if (pendingInput && pendingInput.trim() !== "") {
      // Limpiar la variable y procesar el input
      await ctxFn.state.update({ pendingInput: null });
      return processUserInput(pendingInput, ctx, ctxFn);
    }
  })
  .addAction({ capture: true }, async (ctx, ctxFn) => {
    // En esta acción, se procesa el input normal
    let userInput = ctx.body?.toLowerCase().trim();
    if (!userInput || userInput === "") {
      userInput = await ctxFn.state.get("pendingInput");
      await ctxFn.state.update({ pendingInput: null });
    }
    return processUserInput(userInput, ctx, ctxFn);
  });
