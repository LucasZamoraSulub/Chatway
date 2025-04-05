import poolPromise from "../database/db";

export function logInteraction(
  interaction: {
    id_conversacion: number;
    ref?: string;
    keyword?: string;
    role: "user" | "assistant";
    content: string;
    options?: string;
    estado_interaccion?: number;
  },
  result: any
): void {
  poolPromise.getConnection((err: any, connection: any) => {
    if (err) {
      console.error("Error obteniendo una conexión:", err);
      return result(err);
    }
    connection.query(
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
      ],
      (error: any, res: any) => {
        connection.release();
        if (error) {
          console.error("Error logging interaction:", error);
          return result(error);
        }
        console.log("Interacción registrada con ID:", res.insertId);
        result(null, res.insertId);
      }
    );
  });
}
