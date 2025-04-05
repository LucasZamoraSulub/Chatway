import poolPromise from "../database/db";

// Función para insertar las métricas del ticket
export function createTicketMetrics(
  idConversacion: number,
  resumen: string,
  nivelInteres: string | null,
  nivelConocimiento: string | null,
  productosServiciosMencionados: string | null,
  result: any
): void {
  poolPromise.getConnection((err: any, connection: any) => {
    if (err) {
      console.error("Error obteniendo una conexión:", err);
      return result(err);
    }
    connection.query(
      "INSERT INTO ticket_metrics (id_conversacion, resumen, nivel_interes, nivel_conocimiento, productos_servicios_mencionados) VALUES (?, ?, ?, ?, ?)",
      [idConversacion, resumen, nivelInteres, nivelConocimiento, productosServiciosMencionados],
      (error: any, res: any) => {
        connection.release();
        if (error) {
          console.error("Error creando métricas del ticket:", error);
          return result(error);
        }
        result(null, res.insertId);
      }
    );
  });
}

// Función para insertar una nota en ticket_notes
export function createTicketNote(contenido: string, result: any): void {
  poolPromise.getConnection((err: any, connection: any) => {
    if (err) {
      console.error("Error obteniendo una conexión:", err);
      return result(err);
    }
    connection.query(
      "INSERT INTO ticket_notes (contenido) VALUES (?)",
      [contenido],
      (error: any, res: any) => {
        connection.release();
        if (error) {
          console.error("Error creando nota de ticket:", error);
          return result(error);
        }
        result(null, res.insertId);
      }
    );
  });
}

// Función para crear un nuevo ticket, incluyendo el estado de seguimiento
export function createTicket(
  idConversacion: number,
  idCliente: number,
  idUsuario: number,
  idApartamento: number,
  estadoSeguimientoTicket: number,
  idNota: number | null,
  result: any
): void {
  poolPromise.getConnection((err: any, connection: any) => {
    if (err) {
      console.error("Error obteniendo una conexión:", err);
      return result(err);
    }
    connection.query(
      `INSERT INTO tickets 
       (id_conversacion, id_cliente, id_usuario, id_apartamento, estado_ticket, estado_seguimiento_ticket, fecha_creacion, fecha_actualizacion, id_nota)
       VALUES (?, ?, ?, ?, 'abierto', ?, NOW(), NOW(), ?)`,
      [idConversacion, idCliente, idUsuario, idApartamento, estadoSeguimientoTicket, idNota],
      (error: any, res: any) => {
        connection.release();
        if (error) {
          console.error("Error creando ticket:", error);
          return result(error);
        }
        result(null, res.insertId);
      }
    );
  });
}

// Función para actualizar el estado de un ticket
export function updateTicketStatus(
  idTicket: number,
  nuevoEstado: string,
  result: any
): void {
  poolPromise.getConnection((err: any, connection: any) => {
    if (err) {
      console.error("Error obteniendo una conexión:", err);
      return result(err);
    }
    connection.query(
      "UPDATE tickets SET estado_ticket = ?, fecha_actualizacion = NOW() WHERE id_ticket = ?",
      [nuevoEstado, idTicket],
      (error: any, res: any) => {
        connection.release();
        if (error) {
          console.error("Error actualizando estado de ticket:", error);
          return result(error);
        }
        result(null, res);
      }
    );
  });
}

export function updateTicketSeguimientoTicket(
  ticketId: number,
  nuevoSeguimiento: number,
  result: any
): void {
  poolPromise.getConnection((err: any, connection: any) => {
    if (err) {
      console.error("Error obteniendo una conexión:", err);
      return result(err);
    }
    connection.query(
      "UPDATE tickets SET estado_seguimiento_ticket = ?, fecha_actualizacion = NOW() WHERE id_ticket = ?",
      [nuevoSeguimiento, ticketId],
      (error: any, res: any) => {
        connection.release();
        if (error) {
          console.error("Error actualizando estado_seguimiento_ticket:", error);
          return result(error);
        }
        result(null, res);
      }
    );
  });
}
