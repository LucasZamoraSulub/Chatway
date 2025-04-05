// src/services/conversationManager.ts
import { ConversationService } from "~/controllers/conversationController";
import { UserService } from "~/controllers/userController";
import { fetchUserIdPromise } from "~/services/serviceUser";
import crypto from "crypto";

export class ConversationManager {
  /**
   * Asegura que exista una conversación para el usuario.
   * Si no existe, la crea y la almacena en el estado.
   * Devuelve el conversationId.
   */
  static async ensureConversation(ctx: any, state: any): Promise<number> {
    let conversationId = await state.get("conversationId");
    if (!conversationId) {
      const idCliente = await fetchUserIdPromise(ctx.from);
      if (!idCliente) {
        throw new Error(`No se encontró un cliente con el número ${ctx.from}.`);
      }
      conversationId = await ConversationService.startConversation(idCliente);
      await state.update({ conversationId });
      console.log(`Nueva conversación creada en BD con ID: ${conversationId}`);
    }
    return conversationId;
  }

  static generateMessageHash(content: string, timestamp: number): string {
    return crypto.createHash("sha256").update(content + timestamp).digest("hex");
  }

  // Método unificado para registrar interacciones
  static async logInteraction(ctx: any, state: any, role: "user" | "assistant", content: string, idUsuario?: number): Promise<void> {
    // Ejemplo de verificación opcional:
    const timestamp = Date.now();
    const currentHash = ConversationManager.generateMessageHash(content, timestamp);
    const lastHash = await state.get("lastMessageHash");
    if (currentHash === lastHash) {
      console.log("Mensaje duplicado detectado, omitiendo registro.");
      return;
    }
    await state.update({ lastMessageHash: currentHash });

    try {
      const conversationId = await state.get("conversationId");
      if (!conversationId) {
        throw new Error("No se encontró conversationId");
      }
      await ConversationService.recordInteraction(conversationId, role, content, idUsuario);
      console.log(`Interacción registrada [${role}]: ${content}`);
    } catch (error) {
      console.error("Error registrando interacción:", error);
      throw error;
    }
  }

  /**
   * Actualiza el estado_conversacion de la conversación.
   */
  static async updateState(ctx: any, state: any, newState: number): Promise<void> {
    try {
      const conversationId = await state.get("conversationId");
      if (!conversationId) {
        throw new Error("No se encontró conversationId para actualizar el estado.");
      }
      await ConversationService.updateState(conversationId, newState);
    } catch (error) {
      console.error("Error actualizando el estado de la conversación:", error);
      throw error;
    }
  }

  /**
   * Actualiza el resultado_conversacion de la conversación.
   */
  static async updateResult(ctx: any, state: any, newResult: number): Promise<void> {
    try {
      const conversationId = await state.get("conversationId");
      if (!conversationId) {
        throw new Error("No se encontró conversationId para actualizar el resultado.");
      }
      await ConversationService.updateResult(conversationId, newResult);
    } catch (error) {
      console.error("Error actualizando el resultado de la conversación:", error);
      throw error;
    }
  }
}
