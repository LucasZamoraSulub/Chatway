import { addKeyword, EVENTS } from "@builderbot/bot";
import { ConversationService } from "~/controllers/conversationController";
import aiServices from "~/services/aiServices";
import { config } from "../config";
import fs from "fs";
import path from "path";
import { areasConfig, AreaConfig } from "~/config/areas.config";
import { genericAreaFlow } from "./areas/genericAreaFlow";
import { genericAgentFlow } from "./liveAgents/genericAgentFlow";

// Función para analizar la conversación utilizando el prompt de análisis específico
async function analyzeConversation(ctxFn: any, areaConfig: AreaConfig): Promise<string> {
  // Obtener el conversationId almacenado en el estado
  const conversationId = await ctxFn.state.get("conversationId");
  if (!conversationId) {
    console.log("❌ No se encontró una conversación activa en la BD.");
    return "No se pudo analizar la conversación debido a datos insuficientes.";
  }

  // Recuperar TODOS los mensajes de la conversación desde la BD
  const history = await ConversationService.getAllMessages(conversationId);
  if (!history || history.length === 0) {
    console.log("❌ No se puede analizar la conversación. No hay mensajes disponibles.");
    return "No se pudo analizar la conversación debido a datos insuficientes.";
  }

  // Formatear el contexto: si hay 'mensaje_usuario' y 'respuesta', agregarlos como entradas separadas
  const formattedHistory = history.reduce(
    (acc: { role: string; content: string }[], row: any) => {
      if (row.mensaje_usuario) {
        acc.push({ role: "user", content: row.mensaje_usuario });
      }
      if (row.respuesta) {
        acc.push({ role: "assistant", content: row.respuesta });
      }
      return acc;
    },
    []
  );

  console.log("📊 CONTEXTO OBTENIDO DE LA BD:");
  console.log(formattedHistory.map((msg) => `${msg.role}: ${msg.content}`).join("\n"));

  // Seleccionar el prompt de análisis: se utiliza el prompt definido en analysisPromptFile si existe, o un valor por defecto
  let promptFile = "prompt_AnalisisConversacion.txt"; // default
  if (areaConfig.conversation && areaConfig.conversation.analysisPromptFile) {
    promptFile = areaConfig.conversation.analysisPromptFile;
  }
  const pathPromptAnalisis = path.join(process.cwd(), "assets/Prompts/metrics_areas", promptFile);
  const promptAnalisis = fs.readFileSync(pathPromptAnalisis, "utf8");

  const AI = new aiServices(config.ApiKey);
  const analysisResult = await AI.chat(promptAnalisis, formattedHistory);
  console.log("📊 RESULTADO DEL ANÁLISIS:", analysisResult);

  return analysisResult;
}

export const postAreaFlow = addKeyword(EVENTS.ACTION)
  // Primera acción: Mostrar mensaje de opciones según la configuración del área
  .addAction(async (ctx, ctxFn) => {
    const selectedFlow: string = await ctxFn.state.get("selectedFlow");
    const areaConfig: AreaConfig | undefined = areasConfig.find(
      (area) => area.area === selectedFlow
    );
    if (!areaConfig || !areaConfig.conversation) {
      console.log(`⚠️ No se encontró configuración para el área ${selectedFlow}.`);
      return ctxFn.endFlow("Área no reconocida. Vuelve al menú principal.");
    }
    // Enviar el mensaje de opciones definido en conversation.postOptions
    await ctxFn.flowDynamic(areaConfig.conversation.postOptions);
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
      console.log(`⚠️ No se encontró configuración para el área ${selectedFlow}.`);
      return ctxFn.endFlow("Área no reconocida. Vuelve al menú principal.");
    }
    
    // Opción 1: Seguir conversando (por ejemplo, si el usuario responde "1" o "seguir")
    if (respuesta.includes("1") || respuesta.includes("seguir")) {
      console.log(`🔄 Usuario ${ctx.from} optó por seguir conversando en el área ${selectedFlow}.`);
      return ctxFn.gotoFlow(genericAreaFlow);
    }
    
    // Opción 2: Atención personalizada o cotizar (si la respuesta incluye "2", "atención" o "cotizar")
    if (respuesta.includes("2") || respuesta.includes("atención") || respuesta.includes("cotizar")) {
      console.log(`📊 Procesando solicitud de atención personalizada en el área ${selectedFlow}...`);
      // Analizar la conversación y obtener un resumen usando el prompt de análisis
      const resumen = await analyzeConversation(ctxFn, areaConfig);
      console.log("📊 Resumen generado:", resumen);
      
      // Finalizar la conversación: cerrar el conversationId y reiniciar el estado
      const conversationId = await ctxFn.state.get("conversationId");
      if (conversationId) {
        await ConversationService.closeConversation(conversationId);
        await ctxFn.state.update({ conversationId: null, hasSeenWelcome: false });
      }
      
      // Redirigir al flujo genérico de atención personalizada (genericAgentFlow)
      return ctxFn.gotoFlow(genericAgentFlow);
    }
    
    console.log(`❌ Respuesta no reconocida. Se solicita reintentar.`);
    return ctxFn.fallBack("⚠️ Por favor, responde con *1️⃣ Seguir conversando* o *2️⃣ Atención personalizada*.");
  });

