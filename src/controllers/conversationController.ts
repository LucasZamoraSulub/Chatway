import * as convRepo from "../model/conversationRepository";

export class ConversationService {
  // Inicia una nueva conversación para un cliente
  static async startConversation(idCliente: number): Promise<number> {
    try {
      const conversationId = await convRepo.createConversation(idCliente);
      return conversationId;
    } catch (error) {
      console.error("ConversationService - startConversation error:", error);
      throw error;
    }
  }

  // Registra una interacción completa (pregunta y respuesta) en la conversación
  static async recordMessage(
    conversationId: number,
    mensajeUsuario: string,
    respuesta: string,
    options?: { idUsuario?: number; idApartamento?: number }
  ): Promise<void> {
    try {
      await convRepo.addConversationMessage(
        conversationId,
        mensajeUsuario,
        respuesta,
        options
      );
    } catch (error) {
      console.error("ConversationService - recordMessage error:", error);
      throw error;
    }
  }

  // Recupera el contexto de la conversación (últimos mensajes) para mantener la continuidad del chat
  static async getContext(
    conversationId: number,
    limit: number = 3
  ): Promise<{ role: string; content: string }[]> {
    try {
      const contextRows = await convRepo.getLastMessages(conversationId, limit);
      // Transformar cada fila en entradas con { role, content }
      const formattedContext = contextRows.reduce(
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
      return formattedContext;
    } catch (error) {
      console.error("ConversationService - getContext error:", error);
      throw error;
    }
  }

  // Finaliza la conversación actual actualizando su estado a 'finalizada'
  static async closeConversation(conversationId: number): Promise<void> {
    try {
      await convRepo.updateConversationStatus(conversationId, "finalizada");
    } catch (error) {
      console.error("ConversationService - closeConversation error:", error);
      throw error;
    }
  }

  // Obtener todos los mensajes de una conversación
  static async getAllMessages(conversationId: number): Promise<any[]> {
    try {
      const messages = await convRepo.getAllMessages(conversationId);
      return messages;
    } catch (error) {
      console.error("ConversationService - getAllMessages error:", error);
      throw error;
    }
  }

  // Obtiene el bot asignado a un área
  static async getBotForArea(idApartamento: number): Promise<number> {
    try {
      const idUsuario = await convRepo.getBotForArea(idApartamento);
      return idUsuario;
    } catch (error) {
      console.error("ConversationService - getBotForArea error:", error);
      throw error;
    }
  }

  // Registra una interacción (mensaje del usuario o respuesta del bot) en la conversación
  static async recordInteraction(
    conversationId: number,
    role: "user" | "assistant",
    content: string,
    idUsuario?: number
  ): Promise<void> {
    try {
      await convRepo.insertInteraction(
        conversationId,
        role,
        content,
        idUsuario
      );
    } catch (error) {
      console.error("ConversationService - recordInteraction error:", error);
      throw error;
    }
  }

  // Actualiza el estado_conversacion de la conversación
  static async updateState(
    idConversacion: number,
    estado: number
  ): Promise<void> {
    try {
      await convRepo.updateConversationState(idConversacion, estado);
      console.log(
        `Estado de conversación (estado_conversacion) actualizado a: ${estado}`
      );
    } catch (error) {
      console.error("ConversationService - updateState error:", error);
      throw error;
    }
  }

  // Actualiza el resultado_conversacion de la conversación
  static async updateResult(
    idConversacion: number,
    resultado: number
  ): Promise<void> {
    try {
      await convRepo.updateConversationResult(idConversacion, resultado);
      console.log(`Resultado de conversación actualizado a: ${resultado}`);
    } catch (error) {
      console.error("ConversationService - updateResult error:", error);
      throw error;
    }
  }

  // Método para crear métricas de conversación
  static async createConversationMetrics(params: {
    resumen: string;
    nivelInteres?: string;
    nivelConocimiento?: string;
    productosServiciosMencionados?: string;
    interesProspecto?: number;
    perfilCliente?: number;
    nivelNecesidad?: number;
    barrerasObjeciones?: number;
    probabilidadVenta?: number;
  }): Promise<number> {
    try {
      const idMetricas = await convRepo.createConversationMetrics(params);
      return idMetricas;
    } catch (error) {
      console.error(
        "ConversationService - createConversationMetrics error:",
        error
      );
      throw error;
    }
  }
  

  // Método para actualizar la conversación asignándole el ID de métricas
  static async updateConversationMetrics(
    conversationId: number,
    idMetricas: number
  ): Promise<void> {
    try {
      await convRepo.updateConversationMetrics(conversationId, idMetricas);
    } catch (error) {
      console.error(
        "ConversationService - updateConversationMetrics error:",
        error
      );
      throw error;
    }
  }
}
