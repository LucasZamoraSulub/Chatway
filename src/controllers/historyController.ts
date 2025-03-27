// src/controllers/historyController.ts
import { logInteraction } from "../model/historyRepository";

export class HistoryController {
  static async registerInteraction(interactionData: {
    id_conversacion: number;
    ref?: string;
    keyword?: string;
    role: "user" | "assistant";
    content: string;
    options?: string;
    estado_interaccion?: number;
  }): Promise<number> {
    try {
      return await logInteraction(interactionData);
    } catch (error) {
      console.error("HistoryController - registerInteraction error:", error);
      throw error;
    }
  }
}
