import poolPromise from "../database/db";

// Función para crear una nueva conversación
// Se establece por defecto el estado de la conversación como "Chat Iniciado" (id 1 en la tabla estado_conversación)
export async function createConversation(idCliente: number): Promise<number> {
  try {
    const [result]: any = await poolPromise.query(
      "INSERT INTO conversacion (id_cliente, estado_conversacion) VALUES (?, ?)",
      [idCliente, 1]
    );
    return result.insertId;
  } catch (error) {
    console.error("Error creando conversación:", error);
    throw error;
  }
}

// Función para actualizar el estado de una conversación
// Se actualiza la columna "estado" (que acepta 'activa', 'finalizada' o 'cancelada') y se fija la fecha de finalización
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

    // Si no se proporciona idUsuario, se obtiene el bot asignado al área (usando id_apartamento) con Tipo_Usuario = 1
    if (!finalIdUsuario) {
      if (!options?.idApartamento) {
        throw new Error("idApartamento es requerido para determinar el id del bot por defecto.");
      }
      const [rows]: any = await poolPromise.query(
        "SELECT Id_Usuario FROM usuario WHERE Tipo_Usuario = 1 AND Area_Trabajo_Id_Area = ? LIMIT 1",
        [options.idApartamento]
      );
      if (rows.length === 0) {
        throw new Error("No se encontró un bot asignado para el área especificada.");
      }
      finalIdUsuario = rows[0].Id_Usuario;
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

// Función para obtener el bot asignado a un área
export async function getBotForArea(idApartamento: number): Promise<number> {
  try {
    const [rows]: any = await poolPromise.query(
      "SELECT Id_Usuario FROM usuario WHERE Tipo_Usuario = 1 AND Area_Trabajo_Id_Area = ? LIMIT 1",
      [idApartamento]
    );
    if (rows.length === 0) {
      throw new Error("No se encontró un bot asignado para el área especificada.");
    }
    return rows[0].Id_Usuario;
  } catch (error) {
    console.error("Error en getBotForArea:", error);
    throw error;
  }
}

// Método unificado para registrar una interacción en la tabla "mensajes"
export async function insertInteraction(
  idConversacion: number,
  role: "user" | "assistant",
  content: string,
  idUsuario?: number
): Promise<void> {
  try {
    if (role === "user") {
      // Para mensajes del usuario: se guarda el contenido en "mensaje_usuario" y "respuesta" queda vacío.
      await poolPromise.query(
        "INSERT INTO mensajes (id_conversacion, mensaje_usuario, respuesta, id_usuario, fecha_envio, fecha_respuesta) VALUES (?, ?, '', ?, NOW(), NOW())",
        [idConversacion, content, idUsuario || null]
      );
    } else {
      // Para mensajes del bot (assistant): se guarda el contenido en "respuesta" y "mensaje_usuario" queda vacío.
      // Si no se proporciona idUsuario, usamos un id de bot por defecto (por ejemplo, 1)
      const botId = idUsuario || 1;
      await poolPromise.query(
        "INSERT INTO mensajes (id_conversacion, mensaje_usuario, respuesta, id_usuario, fecha_envio, fecha_respuesta) VALUES (?, '', ?, ?, NOW(), NOW())",
        [idConversacion, content, botId]
      );
    }
  } catch (error) {
    console.error("Error inserting interaction:", error);
    throw error;
  }
}

// Actualiza el campo estado_conversacion en la tabla conversacion
export async function updateConversationState(idConversacion: number, estado: number): Promise<void> {
  try {
    await poolPromise.query(
      "UPDATE conversacion SET estado_conversacion = ? WHERE id_conversacion = ?",
      [estado, idConversacion]
    );
  } catch (error) {
    console.error("Error actualizando estado_conversacion:", error);
    throw error;
  }
}

// Actualiza el campo resultado_conversacion en la tabla conversacion
export async function updateConversationResult(idConversacion: number, resultado: number): Promise<void> {
  try {
    await poolPromise.query(
      "UPDATE conversacion SET resultado_conversacion = ? WHERE id_conversacion = ?",
      [resultado, idConversacion]
    );
  } catch (error) {
    console.error("Error actualizando resultado_conversacion:", error);
    throw error;
  }
}

//CONFIGURACION DE LA BASE DE DATOS MYSQL
// import { database } from "../database/index";

// // Función para crear una nueva conversación
// export async function createConversation(idCliente: number): Promise<number> {
//   try {
//     const [result]: any = await database.db.promise().query(
//       "INSERT INTO conversacion (id_cliente) VALUES (?)",
//       [idCliente]
//     );
//     // result.insertId contiene el ID de la conversación recién creada
//     return result.insertId;
//   } catch (error) {
//     console.error("Error creando conversación:", error);
//     throw error;
//   }
// }

// // Función para actualizar el estado de una conversación
// export async function updateConversationStatus(idConversacion: number, estado: string): Promise<void> {
//   try {
//     await database.db.promise().query(
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

//     // Si no se proporciona idUsuario, se obtiene el bot asignado al área (id_apartamento) con id_rol = 1
//     if (!finalIdUsuario) {
//       if (!options?.idApartamento) {
//         throw new Error("idApartamento es requerido para determinar el id del bot por defecto.");
//       }
//       const [rows]: any = await database.db.promise().query(
//         "SELECT id_usuario FROM usuarios WHERE id_rol = 1 AND id_apartamento = ? LIMIT 1",
//         [options.idApartamento]
//       );
//       if (rows.length === 0) {
//         throw new Error("No se encontró un bot asignado para el área especificada.");
//       }
//       finalIdUsuario = rows[0].id_usuario;
//     }

//     await database.db.promise().query(
//       "INSERT INTO mensajes (id_conversacion, mensaje_usuario, respuesta, id_usuario, fecha_envio, fecha_respuesta) VALUES (?, ?, ?, ?, NOW(), NOW())",
//       [idConversacion, mensajeUsuario, respuesta, finalIdUsuario]
//     );
//   } catch (error) {
//     console.error("Error insertando mensaje de conversación:", error);
//     throw error;
//   }
// }

// // Función para obtener los últimos mensajes de una conversación
// export async function getLastMessages(idConversacion: number, limit: number = 3): Promise<any[]> {
//   try {
//     const [rows]: any = await database.db.promise().query(
//       "SELECT mensaje_usuario, respuesta, fecha_envio, fecha_respuesta FROM mensajes WHERE id_conversacion = ? ORDER BY fecha_envio DESC LIMIT ?",
//       [idConversacion, limit]
//     );
//     // Revertir el orden para obtenerlos en secuencia cronológica (del más antiguo al más reciente)
//     return rows.reverse();
//   } catch (error) {
//     console.error("Error obteniendo mensajes:", error);
//     throw error;
//   }
// }

// // Función para obtener TODOS los mensajes de una conversación
// export async function getAllMessages(idConversacion: number): Promise<any[]> {
//   try {
//     const [rows]: any = await database.db.promise().query(
//       "SELECT mensaje_usuario, respuesta, fecha_envio, fecha_respuesta FROM mensajes WHERE id_conversacion = ? ORDER BY fecha_envio ASC",
//       [idConversacion]
//     );
//     return rows;
//   } catch (error) {
//     console.error("Error obteniendo todos los mensajes:", error);
//     throw error;
//   }
// }

// export async function getBotForArea(idApartamento: number): Promise<number> {
//   try {
//     const [rows]: any = await database.db.promise().query(
//       "SELECT id_usuario FROM usuarios WHERE id_rol = 1 AND id_apartamento = ? LIMIT 1",
//       [idApartamento]
//     );
//     if (rows.length === 0) {
//       throw new Error("No se encontró un bot asignado para el área especificada.");
//     }
//     return rows[0].id_usuario;
//   } catch (error) {
//     console.error("Error en getBotForArea:", error);
//     throw error;
//   }
// }
