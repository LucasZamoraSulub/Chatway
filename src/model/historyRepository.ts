// src/model/historyService.ts
import poolPromise from "../database/db";

export async function logInteraction(interaction: {
  id_conversacion: number;
  ref?: string;
  keyword?: string;
  role: "user" | "assistant";
  content: string;
  options?: string;
  estado_interaccion?: number;
}): Promise<number> {
  try {
    const [result]: any = await poolPromise.query(
      `INSERT INTO conversation_history 
       (id_conversacion, ref, keyword, role, content, options, estado_interaccion) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        interaction.id_conversacion,
        interaction.ref || null,
        interaction.keyword || null,
        interaction.role,
        interaction.content,
        interaction.options || null,
        interaction.estado_interaccion || null,
      ]
    );
    console.log("Interacción registrada con ID:", result.insertId);
    return result.insertId;
  } catch (error) {
    console.error("Error logging interaction:", error);
    throw error;
  }
}
