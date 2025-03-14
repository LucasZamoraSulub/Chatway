import {
  createConversation,
  updateConversationStatus,
  addConversationMessage,
  getLastMessages,
  getAllMessages,
} from "../model/conversationRepository";

export class ConversationService {
  // Inicia una nueva conversación para un cliente
  static async startConversation(idCliente: number): Promise<number> {
    try {
      const conversationId = await createConversation(idCliente);
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
      await addConversationMessage(
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
  static async getContext(conversationId: number, limit: number = 3): Promise<any[]> {
    try {
      const contextRows = await getLastMessages(conversationId, limit);
      // Transformar cada fila en entradas con { role, content }
      const formattedContext = contextRows.reduce((acc: { role: string; content: string }[], row: any) => {
        if (row.mensaje_usuario) {
          acc.push({ role: "user", content: row.mensaje_usuario });
        }
        if (row.respuesta) {
          acc.push({ role: "assistant", content: row.respuesta });
        }
        return acc;
      }, []);
      return formattedContext;
    } catch (error) {
      console.error("ConversationService - getContext error:", error);
      throw error;
    }
  }

  // Finaliza la conversación actual actualizando su estado a 'finalizada
  static async closeConversation(conversationId: number): Promise<void> {
    try {
      await updateConversationStatus(conversationId, "finalizada");
    } catch (error) {
      console.error("ConversationService - closeConversation error:", error);
      throw error;
    }
  }

  // Obtener todos los mensajes de una conversación
  static async getAllMessages(conversationId: number): Promise<any[]> {
    try {
      const messages = await getAllMessages(conversationId);
      return messages;
    } catch (error) {
      console.error("ConversationService - getAllMessages error:", error);
      throw error;
    }
  }
}
