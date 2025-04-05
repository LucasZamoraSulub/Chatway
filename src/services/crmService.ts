import https from 'https';
import axios from 'axios';
import { config } from '../config';

export async function sendTicketToCRM(ticketId: number): Promise<any> {
  try {
    const response = await axios.post(`${config.crmApiUrl}/notify`, {
      ticketId,
      event: 'redirectToLiveAgent'
      // Puedes incluir otros detalles si es necesario
    });
    console.log('Notificación al CRM enviada correctamente:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error enviando ticket al CRM:', error);
    throw error;
  }
}

const httpsAgent = new https.Agent({  
  rejectUnauthorized: false, // Deshabilita la verificación de certificados
});

export async function sendMessageToCRM(message: string, numUser: string, idTicket?: number): Promise<any> {
  try {
    const payload: any = { numUser, message };
    if (idTicket !== undefined) {
      payload.id_ticket = idTicket;
    }
    const response = await axios.post(`${config.crmApiUrl}/crm/nuevo-mensaje-recibido`, payload, { httpsAgent });
    console.log('Mensaje notificado al CRM correctamente:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error enviando mensaje al CRM:', error);
    throw error;
  }
}