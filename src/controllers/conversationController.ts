import * as convRepo from "../model/conversationRepository";

export class ConversationService {
  // Inicia una nueva conversación para un cliente
  static startConversation(idCliente: number): Promise<number> {
    return new Promise((resolve, reject) => {
      convRepo.createConversation(idCliente, (err: any, conversationId: number) => {
        if (err) {
          console.error("ConversationService - startConversation error:", err);
          return reject(err);
        }
        resolve(conversationId);
      });
    });
  }

  // Registra un mensaje en la conversación
  static recordMessage(
    conversationId: number,
    mensajeUsuario: string,
    respuesta: string,
    options?: { idUsuario?: number; idApartamento?: number }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      convRepo.addConversationMessage(
        conversationId,
        mensajeUsuario,
        respuesta,
        options,
        (err: any, res: any) => {
          if (err) {
            console.error("ConversationService - recordMessage error:", err);
            return reject(err);
          }
          resolve();
        }
      );
    });
  }

  // Recupera el contexto de la conversación (últimos mensajes) para mantener la continuidad del chat
  static getContext(
    conversationId: number,
    limit: number = 3
  ): Promise<{ role: string; content: string }[]> {
    return new Promise((resolve, reject) => {
      convRepo.getLastMessages(conversationId, limit, (err: any, contextRows: any[]) => {
        if (err) {
          console.error("ConversationService - getContext error:", err);
          return reject(err);
        }
        const formattedContext = contextRows.reduce((acc: { role: string; content: string }[], row: any) => {
          if (row.mensaje_usuario) {
            acc.push({ role: "user", content: row.mensaje_usuario });
          }
          if (row.respuesta) {
            acc.push({ role: "assistant", content: row.respuesta });
          }
          return acc;
        }, []);
        resolve(formattedContext);
      });
    });
  }

  // Finaliza la conversación actual actualizando su estado a 'finalizada'
  static closeConversation(conversationId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      convRepo.updateConversationStatus(conversationId, "finalizada", (err: any, res: any) => {
        if (err) {
          console.error("ConversationService - closeConversation error:", err);
          return reject(err);
        }
        resolve();
      });
    });
  }

  // Obtiene todos los mensajes de una conversación
  static getAllMessages(conversationId: number): Promise<any[]> {
    return new Promise((resolve, reject) => {
      convRepo.getAllMessages(conversationId, (err: any, messages: any[]) => {
        if (err) {
          console.error("ConversationService - getAllMessages error:", err);
          return reject(err);
        }
        resolve(messages);
      });
    });
  }

  // Obtiene el bot asignado a un área
  static getBotForArea(idApartamento: number): Promise<number> {
    return new Promise((resolve, reject) => {
      convRepo.getBotForArea(idApartamento, (err: any, idUsuario: number) => {
        if (err) {
          console.error("ConversationService - getBotForArea error:", err);
          return reject(err);
        }
        resolve(idUsuario);
      });
    });
  }

  // Registra una interacción en la conversación
  static recordInteraction(
    conversationId: number,
    role: "user" | "assistant",
    content: string,
    idUsuario?: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      convRepo.insertInteraction(conversationId, role, content, idUsuario, (err: any, res: any) => {
        if (err) {
          console.error("ConversationService - recordInteraction error:", err);
          return reject(err);
        }
        resolve();
      });
    });
  }

  // Actualiza el estado_conversacion de la conversación
  static updateState(idConversacion: number, estado: number): Promise<void> {
    return new Promise((resolve, reject) => {
      convRepo.updateConversationState(idConversacion, estado, (err: any, res: any) => {
        if (err) {
          console.error("ConversationService - updateState error:", err);
          return reject(err);
        }
        console.log(`Estado de conversación actualizado a: ${estado}`);
        resolve();
      });
    });
  }

  // Actualiza el resultado_conversacion de la conversación
  static updateResult(idConversacion: number, resultado: number): Promise<void> {
    return new Promise((resolve, reject) => {
      convRepo.updateConversationResult(idConversacion, resultado, (err: any, res: any) => {
        if (err) {
          console.error("ConversationService - updateResult error:", err);
          return reject(err);
        }
        console.log(`Resultado de conversación actualizado a: ${resultado}`);
        resolve();
      });
    });
  }

  // Crea métricas de conversación
  static createConversationMetrics(params: {
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
    return new Promise((resolve, reject) => {
      convRepo.createConversationMetrics(params, (err: any, insertId: number) => {
        if (err) {
          console.error("ConversationService - createConversationMetrics error:", err);
          return reject(err);
        }
        resolve(insertId);
      });
    });
  }

  // Actualiza la conversación asignándole el ID de métricas
  static updateConversationMetrics(conversationId: number, idMetricas: number): Promise<void> {
    return new Promise((resolve, reject) => {
      convRepo.updateConversationMetrics(conversationId, idMetricas, (err: any, res: any) => {
        if (err) {
          console.error("ConversationService - updateConversationMetrics error:", err);
          return reject(err);
        }
        resolve();
      });
    });
  }
}