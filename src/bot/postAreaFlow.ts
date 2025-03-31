import { addKeyword, EVENTS } from "@builderbot/bot";
import { ConversationService } from "~/controllers/conversationController";
import { config } from "../config";
import fs from "fs";
import path from "path";
import { areasConfig, AreaConfig } from "~/config/areas.config";
import { genericAreaFlow } from "./areas/genericAreaFlow";
import { genericAgentFlow } from "./liveAgents/genericAgentFlow";
import { TicketService } from "~/controllers/ticketController";
import { UserService } from "~/controllers/userController";
import { ConversationManager } from "~/services/conversationManager";

// Función para preprocesar la cadena JSON y corregir errores comunes (como comas finales)
function fixJsonString(jsonStr: string): string {
  // Elimina comas finales antes de un cierre de llave o corchete
  jsonStr = jsonStr.replace(/,\s*(}|\])/g, "$1");
  // Asegura que la cadena termine con "}" (si se espera un objeto)
  if (!jsonStr.trim().endsWith("}")) {
    jsonStr = jsonStr.trim() + "}";
  }
  return jsonStr;
}
// Función para analizar la conversación utilizando el prompt de análisis específico
async function analyzeConversation(
  ctxFn: any,
  areaConfig: AreaConfig
): Promise<string> {
  const conversationId = await ctxFn.state.get("conversationId");
  if (!conversationId) {
    console.log("❌ No se encontró una conversación activa en la BD.");
    return "No se pudo analizar la conversación debido a datos insuficientes.";
  }

  const history = await ConversationService.getAllMessages(conversationId);
  if (!history || history.length === 0) {
    console.log(
      "❌ No se puede analizar la conversación. No hay mensajes disponibles."
    );
    return "No se pudo analizar la conversación debido a datos insuficientes.";
  }

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
  console.log(
    formattedHistory.map((msg) => `${msg.role}: ${msg.content}`).join("\n")
  );

  let promptFile = "prompt_AnalisisConversacion.txt"; // default
  if (areaConfig.conversation && areaConfig.conversation.analysisPromptFile) {
    promptFile = areaConfig.conversation.analysisPromptFile;
  }
  const pathPromptAnalisis = path.join(
    process.cwd(),
    "assets/Prompts/metrics_areas",
    promptFile
  );
  const promptAnalisis = fs.readFileSync(pathPromptAnalisis, "utf8");

  const AI = new (await import("~/services/aiServices")).default(config.ApiKey);
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

    // Obtener conversationId (pero NO registrar de inmediato)
    const conversationId = await ctxFn.state.get("conversationId");

    // Opción 1: Seguir conversando
    if (respuesta.includes("1") || respuesta.includes("seguir")) {
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

    // Opción 2: Atención personalizada o cotizar
    if (
      respuesta.includes("2") ||
      respuesta.includes("atención") ||
      respuesta.includes("cotizar")
    ) {
      console.log(
        `📊 Procesando solicitud de atención personalizada en el área ${selectedFlow}...`
      );

      if (conversationId) {
        await ConversationManager.logInteraction(
          ctx,
          ctxFn.state,
          "user",
          respuesta
        );
      }

      const analysisResult = await analyzeConversation(ctxFn, areaConfig);
      console.log("📊 Resumen generado:", analysisResult);

      // Preprocesar la cadena JSON para evitar errores comunes (ej. comas finales)
      const fixedResult = fixJsonString(analysisResult);

      // Parsear el resultado JSON del análisis con manejo de errores y valores por defecto
      let parsedAnalysis: {
        nivel_conocimiento: string;
        probabilidad_compra: string;
        productos_mencionados: string[];
        resumen_intencion: string;
        interesProspecto?: number;
        perfilCliente?: number;
        nivelNecesidad?: number;
        barrerasObjeciones?: number;
      } = {
        nivel_conocimiento: "",
        probabilidad_compra: "",
        productos_mencionados: [],
        resumen_intencion: "",
      };
      try {
        parsedAnalysis = JSON.parse(fixedResult);
      } catch (error) {
        console.error("Error parseando el resultado del análisis:", error);
        parsedAnalysis = {
          nivel_conocimiento: "",
          probabilidad_compra: "",
          productos_mencionados: [],
          resumen_intencion: analysisResult,
          interesProspecto: null,
          perfilCliente: null,
          nivelNecesidad: null,
          barrerasObjeciones: null,
        };
      }

      // Extraer datos para las métricas, usando valores por defecto si no están presentes
      const resumenMetricas = parsedAnalysis.resumen_intencion || "";
      const nivelInteres = parsedAnalysis.probabilidad_compra || "";
      const nivelConocimiento = parsedAnalysis.nivel_conocimiento || "";
      const productosServiciosMencionados = (parsedAnalysis.productos_mencionados || []).join(", ");

      const interesProspecto =
        typeof parsedAnalysis.interesProspecto === "number"
          ? parsedAnalysis.interesProspecto
          : null;
      const perfilCliente =
        typeof parsedAnalysis.perfilCliente === "number"
          ? parsedAnalysis.perfilCliente
          : null;
      const nivelNecesidad =
        typeof parsedAnalysis.nivelNecesidad === "number"
          ? parsedAnalysis.nivelNecesidad
          : null;
      const barrerasObjeciones =
        typeof parsedAnalysis.barrerasObjeciones === "number"
          ? parsedAnalysis.barrerasObjeciones
          : null;

      // Calcular la probabilidad de venta usando la fórmula:
      // (interesProspecto x perfilCliente x nivelNecesidad x barrerasObjeciones) x 100
      let probabilidadVenta = null;
      if (
        interesProspecto !== null &&
        perfilCliente !== null &&
        nivelNecesidad !== null &&
        barrerasObjeciones !== null
      ) {
        probabilidadVenta = (interesProspecto * perfilCliente * nivelNecesidad * barrerasObjeciones) * 100;
      }

      // Crear registro de métricas en la tabla conversacion_metricas
      const idMetricas = await ConversationService.createConversationMetrics({
        resumen: resumenMetricas,
        nivelInteres,
        nivelConocimiento,
        productosServiciosMencionados,
        interesProspecto,
        perfilCliente,
        nivelNecesidad,
        barrerasObjeciones,
        probabilidadVenta, // calculado localmente
      });
      console.log(`✅ Métricas guardadas con ID: ${idMetricas}`);

      // Actualizar la conversación con el ID de métricas
      await ConversationService.updateConversationMetrics(conversationId, idMetricas);

      // Recopilar datos para la generación del ticket (manteniendo la creación de ticket sin métricas)
      const idCliente = await UserService.fetchUserId(ctx.from);
      if (!idCliente) {
        console.error(`❌ No se encontró cliente para el número ${ctx.from}.`);
        return ctxFn.endFlow("Error al generar el ticket: cliente no registrado.");
      }
      const idApartamento = areaConfig.conversation.idApartamento;
      let idUsuario: number;
      try {
        idUsuario = await ConversationService.getBotForArea(idApartamento);
      } catch (error) {
        console.error("Error obteniendo idUsuario desde UserService:", error);
        return ctxFn.endFlow("Error al asignar agente para el ticket.");
      }
      let ticketId: number;
      // Generar el ticket sin incluir la referencia de métricas
      try {
        ticketId = await TicketService.generateTicket({
          idConversacion: conversationId,
          idCliente,
          idUsuario,
          idApartamento,
          resumenMetricas: undefined,
          nivelInteres: undefined,
          nivelConocimiento: undefined,
          productosServiciosMencionados: undefined,
          notaAdicional: "",
        });
        console.log(`✅ Ticket generado con ID: ${ticketId}`);
        await ctxFn.state.update({ ticketId });
      } catch (error) {
        console.error("Error generando ticket:", error);
        return ctxFn.endFlow("Error al generar el ticket. Intenta de nuevo.");
      }

      // Finalizar la conversación y limpiar el estado
      await ConversationService.closeConversation(conversationId);
      await ctxFn.state.update({
        hasSeenWelcome: false,
        conversationHistory: null,
      });

      return ctxFn.gotoFlow(genericAgentFlow);
    }

    console.log(
      `ℹ️ Respuesta directa no categorizada. Guardando mensaje y enviando a flujo genérico de área.`
    );
    await ctxFn.state.update({ pendingInput: respuesta });

    return ctxFn.gotoFlow(genericAreaFlow);
  });
