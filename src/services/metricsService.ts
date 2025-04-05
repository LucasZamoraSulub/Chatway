import fs from "fs";
import path from "path";
import aiServices from "~/services/aiServices";
import { config } from "../config";
import { ConversationService } from "~/controllers/conversationController";
import { AreaConfig } from "~/config/areas.config";
import { fetchUserIdPromise } from "~/services/serviceUser";
import { generateTicketPromise } from "~/services/serviceTicket";

// Función para preprocesar la cadena JSON y corregir errores comunes (como comas finales)
function fixJsonString(jsonStr: string): string {
  // Eliminar delimitadores de bloque de código, por ejemplo ``` o ```json
  jsonStr = jsonStr.replace(/```(json)?/gi, "").trim();
  // Eliminar comas finales antes de un cierre de llave o corchete
  jsonStr = jsonStr.replace(/,\s*(}|\])/g, "$1");
  // Asegurar que la cadena termine con "}" si se espera un objeto
  if (!jsonStr.trim().endsWith("}")) {
    jsonStr = jsonStr.trim() + "}";
  }
  return jsonStr;
}

export class MetricsService {
  /**
   * Analiza la conversación utilizando la IA, guarda las métricas en la BD y actualiza la conversación.
   * @param conversationId ID de la conversación.
   * @param areaConfig Configuración del área.
   * @returns El ID de las métricas registradas.
   */
  static async analyzeConversationAndSave(
    conversationId: number,
    areaConfig: AreaConfig
  ): Promise<number> {
    // Obtener todo el historial
    const history = await ConversationService.getAllMessages(conversationId);
    if (!history || history.length === 0) {
      throw new Error("No se pudo analizar la conversación: historial vacío.");
    }

    // Formatear el historial
    const formattedHistory = history.reduce((acc: { role: string; content: string }[], row: any) => {
      if (row.mensaje_usuario) acc.push({ role: "user", content: row.mensaje_usuario });
      if (row.respuesta) acc.push({ role: "assistant", content: row.respuesta });
      return acc;
    }, []);
    console.log("📊 Historial para análisis:", formattedHistory.map(m => `${m.role}: ${m.content}`).join("\n"));

    // Cargar el prompt de análisis
    let promptFile = "prompt_AnalisisConversacion.txt";
    if (areaConfig.conversation && areaConfig.conversation.analysisPromptFile) {
      promptFile = areaConfig.conversation.analysisPromptFile;
    }
    const pathPrompt = path.join(process.cwd(), "assets/Prompts/metrics_areas", promptFile);
    const promptContent = fs.readFileSync(pathPrompt, "utf8");

    // Invocar a la IA
    const AI = new aiServices(config.ApiKey);
    const analysisResult = await AI.chat(promptContent, formattedHistory);
    console.log("📊 Resultado del análisis:", analysisResult);

    // Limpiar y parsear la respuesta
    const fixedResult = fixJsonString(analysisResult);
    let parsedAnalysis: any;
    try {
      parsedAnalysis = JSON.parse(fixedResult);
    } catch (error) {
      console.error("Error parseando el análisis:", error);
      parsedAnalysis = {
        resumen_intencion: analysisResult,
        probabilidad_compra: "",
        productos_mencionados: [],
        nivel_conocimiento: "",
        interesProspecto: null,
        perfilCliente: null,
        nivelNecesidad: null,
        barrerasObjeciones: null,
      };
    }

    // Extraer métricas
    const resumenMetricas = parsedAnalysis.resumen_intencion || "";
    const nivelInteres = parsedAnalysis.probabilidad_compra || "";
    const nivelConocimiento = parsedAnalysis.nivel_conocimiento || "";
    const productosServiciosMencionados = (parsedAnalysis.productos_mencionados || []).join(", ");
    const interesProspecto = typeof parsedAnalysis.interesProspecto === "number" ? parsedAnalysis.interesProspecto : null;
    const perfilCliente = typeof parsedAnalysis.perfilCliente === "number" ? parsedAnalysis.perfilCliente : null;
    const nivelNecesidad = typeof parsedAnalysis.nivelNecesidad === "number" ? parsedAnalysis.nivelNecesidad : null;
    const barrerasObjeciones = typeof parsedAnalysis.barrerasObjeciones === "number" ? parsedAnalysis.barrerasObjeciones : null;
    let probabilidadVenta = null;
    if (interesProspecto !== null && perfilCliente !== null && nivelNecesidad !== null && barrerasObjeciones !== null) {
      probabilidadVenta = interesProspecto * perfilCliente * nivelNecesidad * barrerasObjeciones * 100;
    }

    // Crear registro de métricas en la BD
    const idMetricas = await ConversationService.createConversationMetrics({
      resumen: resumenMetricas,
      nivelInteres,
      nivelConocimiento,
      productosServiciosMencionados,
      interesProspecto,
      perfilCliente,
      nivelNecesidad,
      barrerasObjeciones,
      probabilidadVenta,
    });
    console.log(`✅ Métricas guardadas con ID: ${idMetricas}`);

    // Actualizar la conversación con el ID de métricas
    await ConversationService.updateConversationMetrics(conversationId, idMetricas);
    return idMetricas;
  }

  /**
   * Genera un ticket para la conversación.
   * @param conversationId ID de la conversación.
   * @param areaConfig Configuración del área.
   * @param celular Celular del usuario.
   * @returns El ID del ticket generado.
   */
  static async generateTicketForConversation(
    conversationId: number,
    areaConfig: AreaConfig,
    celular: string
  ): Promise<number> {
    const idCliente = await fetchUserIdPromise(celular);
    if (!idCliente) {
      throw new Error(`No se encontró cliente para el número ${celular}.`);
    }
    const idApartamento = areaConfig.conversation.idApartamento;
    const idUsuario = await ConversationService.getBotForArea(idApartamento);
    const ticketId = await generateTicketPromise({
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
    return ticketId;
  }
}
