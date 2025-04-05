// src/controllers/historyController.ts
import * as histRepo from "../model/historyRepository";

export class HistoryController {
  static registerInteraction(interactionData: {
    id_conversacion: number;
    ref?: string;
    keyword?: string;
    role: "user" | "assistant";
    content: string;
    options?: string;
    estado_interaccion?: number;
  }): Promise<number> {
    return new Promise((resolve, reject) => {
      histRepo.logInteraction(interactionData, (err: any, insertId: number) => {
        if (err) {
          console.error("HistoryController - registerInteraction error:", err);
          return reject(err);
        }
        resolve(insertId);
      });
    });
  }
}
