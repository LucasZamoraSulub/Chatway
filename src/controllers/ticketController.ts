import {
  createTicket,
  createTicketMetrics,
  createTicketNote,
  updateTicketStatus,
} from "../model/ticketRepository";

export class TicketService {
  // Crea un ticket con toda la información disponible, ahora con campos separados para métricas
  static async generateTicket(params: {
    idConversacion: number;
    idCliente: number;
    idUsuario: number;
    idApartamento: number;
    estadoSeguimientoTicket?: number;
    resumenMetricas?: string;
    nivelInteres?: string;
    nivelConocimiento?: string;
    productosServiciosMencionados?: string;
    notaAdicional?: string;
  }): Promise<number> {
    try {
      let idMetricas: number | undefined;
      let idNota: number | undefined;

      // Si se proporciona análisis de métricas, crear registro en ticket_metrics
      if (params.resumenMetricas) {
        idMetricas = await createTicketMetrics(
          params.idConversacion,
          params.resumenMetricas,
          params.nivelInteres,
          params.nivelConocimiento,
          params.productosServiciosMencionados
        );
      }

      // Si hay nota adicional, crear registro en ticket_notes
      if (params.notaAdicional) {
        idNota = await createTicketNote(params.notaAdicional);
      }

      // Obtener el estado de seguimiento; si no se proporciona, se asigna el valor por defecto 1 (Pendiente)
      const estadoSeguimientoTicket = params.estadoSeguimientoTicket || 1;

      // Crear el ticket utilizando los IDs obtenidos (si existen)
      const ticketId = await createTicket(
        params.idConversacion,
        params.idCliente,
        params.idUsuario,
        params.idApartamento,
        estadoSeguimientoTicket,
        idMetricas,
        idNota
      );
      return ticketId;
    } catch (error) {
      console.error("TicketService - generateTicket error:", error);
      throw error;
    }
  }

  // Método para actualizar el estado del ticket
  static async changeTicketStatus(
    idTicket: number,
    nuevoEstado: string
  ): Promise<void> {
    try {
      await updateTicketStatus(idTicket, nuevoEstado);
    } catch (error) {
      console.error("TicketService - changeTicketStatus error:", error);
      throw error;
    }
  }
}
