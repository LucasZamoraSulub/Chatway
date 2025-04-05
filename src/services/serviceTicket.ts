// src/services/serviceTicket.ts
import { TicketService } from "~/controllers/ticketController";

/**
 * Envuelve al método generateTicket de TicketService en una Promesa.
 * Permite usar async/await para generar un ticket.
 * @param params Objeto con los parámetros necesarios para generar el ticket.
 * @returns Promesa que se resuelve con el ticketId generado.
 */
export function generateTicketPromise(params: {
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
  return new Promise((resolve, reject) => {
    // Simulamos un objeto req con los parámetros en req.body
    const req = { body: params };
    // Creamos un objeto res que implemente status y json para capturar la respuesta
    const res = {
      status: (code: number) => ({
        json: (data: any) => reject(new Error(`Error ${code}: ${JSON.stringify(data)}`))
      }),
      json: (data: any) => {
        // Se espera que TicketService.generateTicket devuelva un objeto con ticketId
        if (data && data.ticketId) {
          resolve(data.ticketId);
        } else {
          reject(new Error("No se obtuvo ticketId en la respuesta"));
        }
      }
    };

    // Llamamos al método generateTicket del TicketService
    TicketService.generateTicket(req, res);
  });
}

/**
 * Envuelve el método changeTicketSeguimiento de TicketService en una Promesa.
 * Permite usar async/await para actualizar el estado de seguimiento del ticket.
 * @param params Objeto con ticketId y nuevoSeguimiento.
 * @returns Promesa que se resuelve cuando la actualización es exitosa.
 */
export function updateTicketSeguimientoPromise(params: { ticketId: number; nuevoSeguimiento: number }): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = { body: params };
    const res = {
      status: (code: number) => ({
        json: (data: any) => reject(new Error(`Error ${code}: ${JSON.stringify(data)}`))
      }),
      json: (data: any) => resolve()
    };
    TicketService.changeTicketSeguimiento(req, res);
  });
}