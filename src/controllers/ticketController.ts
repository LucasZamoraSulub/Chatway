import * as ticketRepo from "../model/ticketRepository";

export class TicketService {
  // Crea un ticket con la información disponible y registra métricas y nota (si aplica)
  static generateTicket(req: any, res: any): void {
    // Extraer parámetros desde req.body
    const {
      idConversacion,
      idCliente,
      idUsuario,
      idApartamento,
      estadoSeguimientoTicket,
      resumenMetricas,
      nivelInteres,
      nivelConocimiento,
      productosServiciosMencionados,
      notaAdicional,
    } = req.body;

    // Inicializamos variables para los IDs de métricas y nota
    let idMetricas: number | null = null;
    let idNota: number | null = null;

    // Si se proporciona análisis de métricas, crear registro en ticket_metrics
    if (resumenMetricas) {
      ticketRepo.createTicketMetrics(
        idConversacion,
        resumenMetricas,
        nivelInteres || null,
        nivelConocimiento || null,
        productosServiciosMencionados || null,
        (err: any, metricId: number) => {
          if (err) {
            console.error("Error creando métricas del ticket:", err);
            return res.status(500).json({ error: err });
          }
          idMetricas = metricId;
          // Si hay nota adicional, crear registro en ticket_notes
          if (notaAdicional) {
            ticketRepo.createTicketNote(notaAdicional, (err: any, noteId: number) => {
              if (err) {
                console.error("Error creando nota de ticket:", err);
                return res.status(500).json({ error: err });
              }
              idNota = noteId;
              // Finalmente, crear el ticket
              TicketService._createTicketAndRespond(
                idConversacion,
                idCliente,
                idUsuario,
                idApartamento,
                estadoSeguimientoTicket,
                idNota,
                res
              );
            });
          } else {
            // No hay nota adicional, crear ticket
            TicketService._createTicketAndRespond(
              idConversacion,
              idCliente,
              idUsuario,
              idApartamento,
              estadoSeguimientoTicket,
              null,
              res
            );
          }
        }
      );
    } else {
      // No hay métricas
      if (notaAdicional) {
        ticketRepo.createTicketNote(notaAdicional, (err: any, noteId: number) => {
          if (err) {
            console.error("Error creando nota de ticket:", err);
            return res.status(500).json({ error: err });
          }
          idNota = noteId;
          TicketService._createTicketAndRespond(
            idConversacion,
            idCliente,
            idUsuario,
            idApartamento,
            estadoSeguimientoTicket,
            idNota,
            res
          );
        });
      } else {
        // Sin métricas ni nota
        TicketService._createTicketAndRespond(
          idConversacion,
          idCliente,
          idUsuario,
          idApartamento,
          estadoSeguimientoTicket,
          null,
          res
        );
      }
    }
  }

  // Función interna para crear el ticket y enviar la respuesta
  private static _createTicketAndRespond(
    idConversacion: number,
    idCliente: number,
    idUsuario: number,
    idApartamento: number,
    estadoSeguimientoTicket: number | undefined,
    idNota: number | null,
    res: any
  ): void {
    // Asignar valor por defecto 1 a estadoSeguimientoTicket si no se proporciona
    const seguimiento = estadoSeguimientoTicket || 1;
    ticketRepo.createTicket(
      idConversacion,
      idCliente,
      idUsuario,
      idApartamento,
      seguimiento,
      idNota,
      (err: any, ticketId: number) => {
        if (err) {
          console.error("Error creando ticket:", err);
          return res.status(500).json({ error: err });
        }
        console.log("Ticket generado con ID:", ticketId);
        res.json({ success: true, ticketId });
      }
    );
  }

  // Método para actualizar el estado del ticket
  static changeTicketStatus(req: any, res: any): void {
    const { idTicket, nuevoEstado } = req.body;
    ticketRepo.updateTicketStatus(idTicket, nuevoEstado, (err: any, result: any) => {
      if (err) {
        console.error("Error actualizando estado de ticket:", err);
        return res.status(500).json({ error: err });
      }
      res.json({ success: true, result });
    });
  }
  
  // Método para actualizar el estado de seguimiento del ticket
  static changeTicketSeguimiento(req: any, res: any): void {
    const { ticketId, nuevoSeguimiento } = req.body;
    ticketRepo.updateTicketSeguimientoTicket(ticketId, nuevoSeguimiento, (err: any, result: any) => {
      if (err) {
        console.error("Error actualizando estado de seguimiento de ticket:", err);
        return res.status(500).json({ error: err });
      }
      res.json({ success: true, result });
    });
  }
}

