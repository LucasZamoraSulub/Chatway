import poolPromise from "../database/db";

// Función para insertar las métricas del ticket
export async function createTicketMetrics(
  idConversacion: number,
  resumen: string,
  nivelInteres?: string,
  nivelConocimiento?: string,
  productosServiciosMencionados?: string
): Promise<number> {
  try {
    const [result]: any = await poolPromise.query(
      "INSERT INTO ticket_metrics (id_conversacion, resumen, nivel_interes, nivel_conocimiento, productos_servicios_mencionados) VALUES (?, ?, ?, ?, ?)",
      [idConversacion, resumen, nivelInteres || null, nivelConocimiento || null, productosServiciosMencionados || null]
    );
    return result.insertId;
  } catch (error) {
    console.error("Error creando métricas del ticket:", error);
    throw error;
  }
}

// Función para insertar una nota en ticket_notes
export async function createTicketNote(contenido: string): Promise<number> {
  try {
    const [result]: any = await poolPromise.query(
      "INSERT INTO ticket_notes (contenido) VALUES (?)",
      [contenido]
    );
    return result.insertId;
  } catch (error) {
    console.error("Error creando nota de ticket:", error);
    throw error;
  }
}

// Función para crear un nuevo ticket, ahora incluyendo el estado de seguimiento (estado_seguimiento_ticket)
export async function createTicket(
  idConversacion: number,
  idCliente: number,
  idUsuario: number,
  idApartamento: number,
  estadoSeguimientoTicket: number,
  idMetricas?: number,
  idNota?: number
): Promise<number> {
  try {
    const [result]: any = await poolPromise.query(
      `INSERT INTO tickets 
       (id_conversacion, id_cliente, id_usuario, id_apartamento, estado_ticket, estado_seguimiento_ticket, fecha_creacion, fecha_actualizacion, id_metricas, id_nota)
       VALUES (?, ?, ?, ?, 'abierto', ?, NOW(), NOW(), ?, ?)`,
      [idConversacion, idCliente, idUsuario, idApartamento, estadoSeguimientoTicket, idMetricas || null, idNota || null]
    );
    return result.insertId;
  } catch (error) {
    console.error("Error creando ticket:", error);
    throw error;
  }
}

// Función para actualizar el estado de un ticket
export async function updateTicketStatus(
  idTicket: number,
  nuevoEstado: string
): Promise<void> {
  try {
    await poolPromise.query(
      "UPDATE tickets SET estado_ticket = ?, fecha_actualizacion = NOW() WHERE id_ticket = ?",
      [nuevoEstado, idTicket]
    );
  } catch (error) {
    console.error("Error actualizando estado de ticket:", error);
    throw error;
  }
}