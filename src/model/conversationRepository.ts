import poolPromise from "../database/db";

// Función para crear una nueva conversación
export async function createConversation(idCliente: number): Promise<number> {
  try {
    const [result]: any = await poolPromise.query(
      "INSERT INTO conversacion (id_cliente) VALUES (?)",
      [idCliente]
    );
    // result.insertId contiene el ID de la conversación recién creada
    return result.insertId;
  } catch (error) {
    console.error("Error creando conversación:", error);
    throw error;
  }
}

// Función para actualizar el estado de una conversación
export async function updateConversationStatus(idConversacion: number, estado: string): Promise<void> {
  try {
    await poolPromise.query(
      "UPDATE conversacion SET estado = ?, fecha_fin = NOW() WHERE id_conversacion = ?",
      [estado, idConversacion]
    );
  } catch (error) {
    console.error("Error actualizando estado de conversación:", error);
    throw error;
  }
}

// Función para insertar un mensaje en la tabla mensajes
export async function addConversationMessage(
  idConversacion: number,
  mensajeUsuario: string,
  respuesta: string,
  options?: { idUsuario?: number; idApartamento?: number }
): Promise<void> {
  try {
    let finalIdUsuario = options?.idUsuario;

    // Si no se proporciona idUsuario, se obtiene el bot asignado al área (id_apartamento) con id_rol = 1
    if (!finalIdUsuario) {
      if (!options?.idApartamento) {
        throw new Error("idApartamento es requerido para determinar el id del bot por defecto.");
      }
      const [rows]: any = await poolPromise.query(
        "SELECT id_usuario FROM usuarios WHERE id_rol = 1 AND id_apartamento = ? LIMIT 1",
        [options.idApartamento]
      );
      if (rows.length === 0) {
        throw new Error("No se encontró un bot asignado para el área especificada.");
      }
      finalIdUsuario = rows[0].id_usuario;
    }

    await poolPromise.query(
      "INSERT INTO mensajes (id_conversacion, mensaje_usuario, respuesta, id_usuario, fecha_envio, fecha_respuesta) VALUES (?, ?, ?, ?, NOW(), NOW())",
      [idConversacion, mensajeUsuario, respuesta, finalIdUsuario]
    );
  } catch (error) {
    console.error("Error insertando mensaje de conversación:", error);
    throw error;
  }
}

// Función para obtener los últimos mensajes de una conversación
export async function getLastMessages(idConversacion: number, limit: number = 3): Promise<any[]> {
  try {
    const [rows]: any = await poolPromise.query(
      "SELECT mensaje_usuario, respuesta, fecha_envio, fecha_respuesta FROM mensajes WHERE id_conversacion = ? ORDER BY fecha_envio DESC LIMIT ?",
      [idConversacion, limit]
    );
    // Revertir el orden para obtenerlos en secuencia cronológica (del más antiguo al más reciente)
    return rows.reverse();
  } catch (error) {
    console.error("Error obteniendo mensajes:", error);
    throw error;
  }
}

// Función para obtener TODOS los mensajes de una conversación
export async function getAllMessages(idConversacion: number): Promise<any[]> {
  try {
    const [rows]: any = await poolPromise.query(
      "SELECT mensaje_usuario, respuesta, fecha_envio, fecha_respuesta FROM mensajes WHERE id_conversacion = ? ORDER BY fecha_envio ASC",
      [idConversacion]
    );
    return rows;
  } catch (error) {
    console.error("Error obteniendo todos los mensajes:", error);
    throw error;
  }
}

//CONFIGURACION DE LA BASE DE DATOS MYSQL
// import { adapterDB } from "../database/db";

// // Función para crear una nueva conversación y retornar el id insertado
// export async function createConversation(idCliente: number): Promise<number> {
//   try {
//     const [result]: any = await adapterDB.db.query(
//       "INSERT INTO conversacion (id_cliente) VALUES (?)",
//       [idCliente]
//     );
//     return result.insertId;
//   } catch (error) {
//     console.error("Error creando conversación:", error);
//     throw error;
//   }
// }

// // Función para actualizar el estado de una conversación
// export async function updateConversationStatus(idConversacion: number, estado: string): Promise<void> {
//   try {
//     await adapterDB.db.query(
//       "UPDATE conversacion SET estado = ?, fecha_fin = NOW() WHERE id_conversacion = ?",
//       [estado, idConversacion]
//     );
//   } catch (error) {
//     console.error("Error actualizando estado de conversación:", error);
//     throw error;
//   }
// }

// // Función para insertar un mensaje en la tabla mensajes
// export async function addConversationMessage(
//   idConversacion: number,
//   mensajeUsuario: string,
//   respuesta: string,
//   options?: { idUsuario?: number; idApartamento?: number }
// ): Promise<void> {
//   try {
//     let finalIdUsuario = options?.idUsuario;

//     // Para mensajes del usuario, si no se proporciona idUsuario, obtener el ID del bot asignado al área.
//     if (!finalIdUsuario) {
//       if (!options?.idApartamento) {
//         throw new Error("idApartamento es requerido para determinar el id del bot por defecto.");
//       }
//       const [rows]: any = await adapterDB.db.query(
//         "SELECT id_usuario FROM usuarios WHERE id_rol = 1 AND id_apartamento = ? LIMIT 1",
//         [options.idApartamento]
//       );
//       if (rows.length === 0) {
//         throw new Error("No se encontró un bot asignado para el área especificada.");
//       }
//       finalIdUsuario = rows[0].id_usuario;
//     }

//     await adapterDB.db.query(
//       "INSERT INTO mensajes (id_conversacion, mensaje_usuario, respuesta, id_usuario, fecha_envio, fecha_respuesta) VALUES (?, ?, ?, ?, NOW(), NOW())",
//       [idConversacion, mensajeUsuario, respuesta, finalIdUsuario]
//     );
//   } catch (error) {
//     console.error("Error insertando mensaje de conversación:", error);
//     throw error;
//   }
// }

// // Función para obtener los últimos mensajes de una conversación (en orden cronológico)
// export async function getLastMessages(idConversacion: number, limit: number = 3): Promise<any[]> {
//   try {
//     const [rows]: any = await adapterDB.db.query(
//       "SELECT mensaje_usuario, respuesta, fecha_envio, fecha_respuesta FROM mensajes WHERE id_conversacion = ? ORDER BY fecha_envio DESC LIMIT ?",
//       [idConversacion, limit]
//     );
//     // Revertir el orden para obtenerlos de forma cronológica (del más antiguo al más reciente)
//     return rows.reverse();
//   } catch (error) {
//     console.error("Error obteniendo mensajes:", error);
//     throw error;
//   }
// }

// // Función para obtener TODOS los mensajes de una conversación
// export async function getAllMessages(idConversacion: number): Promise<any[]> {
//   try {
//     const [rows]: any = await adapterDB.db.query(
//       "SELECT mensaje_usuario, respuesta, fecha_envio, fecha_respuesta FROM mensajes WHERE id_conversacion = ? ORDER BY fecha_envio ASC",
//       [idConversacion]
//     );
//     return rows;
//   } catch (error) {
//     console.error("Error obteniendo todos los mensajes:", error);
//     throw error;
//   }
// }
