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
