import { google } from "googleapis";
import { sheets_v4 } from "googleapis/build/src/apis/sheets";
import { config } from "../config";
import { content } from "googleapis/build/src/apis/content";

class SheetManager {
  private sheets: sheets_v4.Sheets;
  private spreadsheetId: string;

  constructor(spreadsheetId: string, privateKey: string, clientEmail: string) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        private_key: privateKey,
        client_email: clientEmail,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    // spreadsheetId.sheets = google.sheets({ version: "v4", auth });
    this.sheets = google.sheets({ version: "v4", auth });
    this.spreadsheetId = spreadsheetId;
  }

  // Funcion para verificar si un usuario existe
  async userExists(number: string): Promise<boolean> {
    try {
      const result = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: "Users!A:A", // Asumiendo que los numeros de telefono estan en la columna A
      });

      const rows = result.data.values;
      if (rows) {
        const numbers = rows.map((row) => row[0]);
        return numbers.includes(number);
      }
      return false;
    } catch (error) {
      console.error("Error al verificar si el usuario existe:", error);
      return false;
    }
  }

  // Agregar esta nueva función en sheetsService.ts
  async updateUserInfo(
    number: string,
    name: string,
    mail: string
  ): Promise<void> {
    try {
      // Verificar si el usuario ya existe en la pestaña "Users"
      const result = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: "Users!A:C",
      });

      const rows = result.data.values;
      if (!rows) {
        console.error(`❌ No se encontraron datos en la hoja Users.`);
        return;
      }

      // Buscar la fila donde está el número de usuario
      const rowIndex = rows.findIndex((row) => row[0] === number);
      if (rowIndex === -1) {
        console.error(
          `❌ No se encontró el número ${number} en la hoja Users.`
        );
        return;
      }

      // Actualizar solo los campos de nombre y correo
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `Users!B${rowIndex + 1}:C${rowIndex + 1}`, // Se actualizan solo las columnas B y C
        valueInputOption: "RAW",
        requestBody: {
          values: [[name, mail]],
        },
      });

      console.log(
        `✅ Datos de ${number} actualizados en Users: Nombre=${name}, Email=${mail}`
      );
    } catch (error) {
      console.error(
        `❌ Error al actualizar los datos del usuario en Sheets:`,
        error
      );
    }
  }

  // Funcion para crear un usuario y una nueva pestaña
  async createUser(number: string, name: string, mail: string): Promise<void> {
    try {
      const userExists = await this.userExists(number);

      if (!userExists) {
        // Agregar el usuario a la pestaña 'Users'
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: "Users!A:C",
          valueInputOption: "RAW",
          requestBody: {
            values: [[number, name, mail]],
          },
        });

        // Crear una nueva pestaña con el numero de telefono del usuario
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: number,
                  },
                },
              },
            ],
          },
        });
        console.log(`✅ Usuario ${number} registrado con nueva hoja.`);
      } else {
        console.log(
          `⚠️ Usuario ${number} ya existe en Sheets. Solo se actualizarán los datos.`
        );
        await this.updateUserInfo(number, name, mail);
      }
    } catch (error) {
      console.error("❌ Error al crear usuario o actualizar datos:", error);
    }
  }

  //Funcion para obtener las preguntas/respuestas invertidas
  async getUserConv(number: string): Promise<any[]> {
    try {
      const result = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${number}!A:B`, // Asumiendo que las preguntas estan en la columna A y las respuestas en la B
      });

      const rows = result.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      // Tomar las ultimas preguntas/respuestas (hasta un maximo de 3) y revertir el orden
      const lastConversations = rows.slice(-3).reverse();

      // Formatear las respuestas en el formato solicitado
      const formattedConversations = [];
      for (let i = 0; i < lastConversations.length; i++) {
        const [userQuestion, assistantAnswer] = lastConversations[i];
        formattedConversations.push(
          { role: "user", content: userQuestion },
          { role: "assistant", content: assistantAnswer }
        );
      }

      return formattedConversations;
    } catch (error) {
      console.error("Error al obtener la conversacion del usuario:", error);
      return [];
    }
  }

  // Funcion para agregar una conversacion al inicio de la pestaña del usuario
  async addConverToUser(
    number: string,
    conversation: { role: string; content: string }[]
  ): Promise<void> {
    try {
      const question = conversation.find((c) => c.role === "user")?.content;
      let answer = conversation.find(
        (c) => c.role === "assistant" || c.role === "system"
      )?.content;

      // ✅ Si falta la respuesta, asignar un mensaje del sistema
      if (!answer) {
        console.warn(
          `⚠️ No se encontró una respuesta para la pregunta. Asignando mensaje de sistema.`
        );
        answer = "El usuario ha solicitado asistencia de un agente.";
      }

      // ✅ Si aún falta la pregunta, evitar guardar la conversación
      if (!question) {
        console.error(
          `❌ No se puede registrar la conversación. Falta la pregunta.`
        );
        return;
      }

      const date = new Date().toISOString(); // Fecha en formato UTC

      // Leer las filas actuales para empujarlas hacia abajo
      const sheetData = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${number}!A:C`,
      });

      const rows = sheetData.data.values || [];

      // Agregar la nueva conversación en la primera fila
      rows.unshift([question, answer, date]);

      // Escribir las filas de nuevo en la hoja
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${number}!A:C`,
        valueInputOption: "RAW",
        requestBody: {
          values: rows,
        },
      });

      console.log(`✅ Conversación guardada para el usuario ${number}`);
    } catch (error) {
      console.error("❌ Error al agregar la conversación:", error);
    }
  }

  // función para obtener los datos del usuario desde Sheets
  async getUserData(number: string): Promise<{ name: string; email: string }> {
    try {
      const result = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: "Users!A:C", // Asumiendo que los datos están en A (teléfono), B (nombre), C (correo)
      });

      const rows = result.data.values;
      if (!rows) {
        console.error(`❌ No se encontraron datos en la hoja Users.`);
        return { name: "Desconocido", email: "Sin correo" }; // Retornar valores predefinidos
      }

      const userRow = rows.find((row) => row[0] === number);
      if (!userRow) {
        console.error(
          `❌ No se encontró el número ${number} en la hoja Users.`
        );
        return { name: "Desconocido", email: "Sin correo" };
      }

      return {
        name: userRow[1] || "Desconocido",
        email: userRow[2] || "Sin correo",
      };
    } catch (error) {
      console.error(`❌ Error al obtener los datos del usuario:`, error);
      return { name: "Desconocido", email: "Sin correo" };
    }
  }
}

export default new SheetManager(
  config.spreadsheetId,
  config.privateKey,
  config.clientEmail
);
