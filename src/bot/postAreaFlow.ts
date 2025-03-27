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
        await ConversationManager.logInteraction(ctx, ctxFn.state, "user", respuesta);
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
        await ConversationManager.logInteraction(ctx, ctxFn.state, "user", respuesta);
      }

      const analysisResult = await analyzeConversation(ctxFn, areaConfig);
      console.log("📊 Resumen generado:", analysisResult);

      // Parsear el resultado JSON del análisis
      let parsedAnalysis: {
        nivel_conocimiento: string;
        probabilidad_compra: string;
        productos_mencionados: string[];
        resumen_intencion: string;
      };
      try {
        parsedAnalysis = JSON.parse(analysisResult);
      } catch (error) {
        console.error("Error parseando el resultado del análisis:", error);
        // Si falla el parseo, usar el resultado completo como resumen y dejar los demás campos vacíos
        parsedAnalysis = {
          nivel_conocimiento: "",
          probabilidad_compra: "",
          productos_mencionados: [],
          resumen_intencion: analysisResult,
        };
      }

      // Ahora se extraen los datos para almacenar en columnas separadas:
      const resumenMetricas = parsedAnalysis.resumen_intencion;
      const nivelInteres = parsedAnalysis.probabilidad_compra;
      const nivelConocimiento = parsedAnalysis.nivel_conocimiento;
      const productosServiciosMencionados = (
        parsedAnalysis.productos_mencionados || []
      ).join(", ");

      // Recopilar datos para la generación del ticket
      // const conversationId = await ctxFn.state.get("conversationId");
      // if (!conversationId) {
      //   console.error(
      //     "❌ No se encontró conversationId para generar el ticket."
      //   );
      //   return ctxFn.endFlow("Error al generar el ticket. Intenta de nuevo.");
      // }

      const idCliente = await UserService.fetchUserId(ctx.from);
      if (!idCliente) {
        console.error(`❌ No se encontró cliente para el número ${ctx.from}.`);
        return ctxFn.endFlow(
          "Error al generar el ticket: cliente no registrado."
        );
      }

      const idApartamento = areaConfig.conversation.idApartamento;

      // Obtener el idUsuario del bot asignado para el área a través de UserService
      let idUsuario: number;
      try {
        idUsuario = await ConversationService.getBotForArea(idApartamento);
      } catch (error) {
        console.error("Error obteniendo idUsuario desde UserService:", error);
        return ctxFn.endFlow("Error al asignar agente para el ticket.");
      }

      let ticketId: number;
      // Generar el ticket
      try {
        ticketId = await TicketService.generateTicket({
          idConversacion: conversationId,
          idCliente,
          idUsuario,
          idApartamento,
          resumenMetricas,
          nivelInteres,
          nivelConocimiento,
          productosServiciosMencionados,
        });
        console.log(`✅ Ticket generado con ID: ${ticketId}`);
        // Almacenar el ticket en el estado para usarlo más adelante
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

      // Redirigir al flujo de atención personalizada
      return ctxFn.gotoFlow(genericAgentFlow);
    }

    console.log(
      `ℹ️ Respuesta directa no categorizada. Guardando mensaje y enviando a flujo genérico de área.`
    );
    await ctxFn.state.update({ pendingInput: respuesta });

    return ctxFn.gotoFlow(genericAreaFlow);
  });
