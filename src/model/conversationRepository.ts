import poolPromise from "../database/db";

// Función para crear una nueva conversación
// Se establece por defecto el estado de la conversación como "Chat Iniciado" (id 1 en la tabla estado_conversación)
export function createConversation(idCliente: number, result: any): void {
  poolPromise.getConnection((err: any, connection: any) => {
    if (err) {
      console.error("Error obteniendo conexión:", err);
      return result(err);
    }
    connection.query(
      "INSERT INTO conversacion (id_cliente, estado_conversacion) VALUES (?, ?)",
      [idCliente, 1],
      (error: any, res: any) => {
        connection.release();
        if (error) {
          console.error("Error creando conversación:", error);
          return result(error);
        }
        result(null, res.insertId);
      }
    );
  });
}

// Función para actualizar el estado de una conversación
// Se actualiza la columna "estado" y se fija la fecha de finalización
export function updateConversationStatus(idConversacion: number, estado: string, result: any): void {
  poolPromise.getConnection((err: any, connection: any) => {
    if (err) {
      console.error("Error obteniendo conexión:", err);
      return result(err);
    }
    connection.query(
      "UPDATE conversacion SET estado = ?, fecha_fin = NOW() WHERE id_conversacion = ?",
      [estado, idConversacion],
      (error: any, res: any) => {
        connection.release();
        if (error) {
          console.error("Error actualizando estado de conversación:", error);
          return result(error);
        }
        result(null, res);
      }
    );
  });
}

// Función para insertar un mensaje en la tabla mensajes
export function addConversationMessage(
  idConversacion: number,
  mensajeUsuario: string,
  respuesta: string,
  options: { idUsuario?: number; idApartamento?: number } | undefined,
  result: any
): void {
  poolPromise.getConnection((err: any, connection: any) => {
    if (err) {
      console.error("Error obteniendo conexión:", err);
      return result(err);
    }
    let finalIdUsuario = options?.idUsuario;
    if (!finalIdUsuario) {
      if (!options?.idApartamento) {
        connection.release();
        return result(new Error("idApartamento es requerido para determinar el id del bot por defecto."));
      }
      connection.query(
        "SELECT Id_Usuario FROM usuario WHERE Tipo_Usuario = 1 AND Area_Trabajo_Id_Area = ? LIMIT 1",
        [options.idApartamento],
        (error: any, rows: any) => {
          if (error) {
            connection.release();
            console.error("Error obteniendo id del bot:", error);
            return result(error);
          }
          if (rows.length === 0) {
            connection.release();
            return result(new Error("No se encontró un bot asignado para el área especificada."));
          }
          finalIdUsuario = rows[0].Id_Usuario;
          connection.query(
            "INSERT INTO mensajes (id_conversacion, mensaje_usuario, respuesta, id_usuario, fecha_envio, fecha_respuesta) VALUES (?, ?, ?, ?, NOW(), NOW())",
            [idConversacion, mensajeUsuario, respuesta, finalIdUsuario],
            (error: any, res: any) => {
              connection.release();
              if (error) {
                console.error("Error insertando mensaje de conversación:", error);
                return result(error);
              }
              result(null, res);
            }
          );
        }
      );
    } else {
      connection.query(
        "INSERT INTO mensajes (id_conversacion, mensaje_usuario, respuesta, id_usuario, fecha_envio, fecha_respuesta) VALUES (?, ?, ?, ?, NOW(), NOW())",
        [idConversacion, mensajeUsuario, respuesta, finalIdUsuario],
        (error: any, res: any) => {
          connection.release();
          if (error) {
            console.error("Error insertando mensaje de conversación:", error);
            return result(error);
          }
          result(null, res);
        }
      );
    }
  });
}

// Función para obtener los últimos mensajes de una conversación
export function getLastMessages(idConversacion: number, limit: number, result: any): void {
  poolPromise.getConnection((err: any, connection: any) => {
    if (err) {
      console.error("Error obteniendo conexión:", err);
      return result(err);
    }
    connection.query(
      "SELECT mensaje_usuario, respuesta, fecha_envio, fecha_respuesta FROM mensajes WHERE id_conversacion = ? ORDER BY fecha_envio DESC LIMIT ?",
      [idConversacion, limit],
      (error: any, rows: any) => {
        connection.release();
        if (error) {
          console.error("Error obteniendo mensajes:", error);
          return result(error);
        }
        result(null, rows.reverse()); // Invertir el orden para cronología ascendente
      }
    );
  });
}

// Función para obtener TODOS los mensajes de una conversación
export function getAllMessages(idConversacion: number, result: any): void {
  poolPromise.getConnection((err: any, connection: any) => {
    if (err) {
      console.error("Error obteniendo conexión:", err);
      return result(err);
    }
    connection.query(
      "SELECT mensaje_usuario, respuesta, fecha_envio, fecha_respuesta FROM mensajes WHERE id_conversacion = ? ORDER BY fecha_envio ASC",
      [idConversacion],
      (error: any, rows: any) => {
        connection.release();
        if (error) {
          console.error("Error obteniendo todos los mensajes:", error);
          return result(error);
        }
        result(null, rows);
      }
    );
  });
}

// Función para obtener el bot asignado a un área
export function getBotForArea(idApartamento: number, result: any): void {
  poolPromise.getConnection((err: any, connection: any) => {
    if (err) {
      console.error("Error obteniendo conexión:", err);
      return result(err);
    }
    connection.query(
      "SELECT Id_Usuario FROM usuario WHERE Tipo_Usuario = 1 AND Area_Trabajo_Id_Area = ? LIMIT 1",
      [idApartamento],
      (error: any, rows: any) => {
        connection.release();
        if (error) {
          console.error("Error en getBotForArea:", error);
          return result(error);
        }
        if (rows.length === 0) {
          return result(new Error("No se encontró un bot asignado para el área especificada."));
        }
        result(null, rows[0].Id_Usuario);
      }
    );
  });
}

// Método unificado para registrar una interacción en la tabla "mensajes"
export function insertInteraction(
  idConversacion: number,
  role: "user" | "assistant",
  content: string,
  idUsuario: number | undefined,
  result: any
): void {
  poolPromise.getConnection((err: any, connection: any) => {
    if (err) {
      console.error("Error obteniendo conexión:", err);
      return result(err);
    }
    if (role === "user") {
      connection.query(
        "INSERT INTO mensajes (id_conversacion, mensaje_usuario, respuesta, id_usuario, fecha_envio, fecha_respuesta) VALUES (?, ?, '', ?, NOW(), NOW())",
        [idConversacion, content, idUsuario || null],
        (error: any, res: any) => {
          connection.release();
          if (error) {
            console.error("Error insertando interacción (user):", error);
            return result(error);
          }
          result(null, res);
        }
      );
    } else {
      const botId = idUsuario || 1;
      connection.query(
        "INSERT INTO mensajes (id_conversacion, mensaje_usuario, respuesta, id_usuario, fecha_envio, fecha_respuesta) VALUES (?, '', ?, ?, NOW(), NOW())",
        [idConversacion, content, botId],
        (error: any, res: any) => {
          connection.release();
          if (error) {
            console.error("Error insertando interacción (assistant):", error);
            return result(error);
          }
          result(null, res);
        }
      );
    }
  });
}

// Actualiza el campo estado_conversacion en la tabla conversacion
export function updateConversationState(idConversacion: number, estado: number, result: any): void {
  poolPromise.getConnection((err: any, connection: any) => {
    if (err) {
      console.error("Error obteniendo conexión:", err);
      return result(err);
    }
    connection.query(
      "UPDATE conversacion SET estado_conversacion = ? WHERE id_conversacion = ?",
      [estado, idConversacion],
      (error: any, res: any) => {
        connection.release();
        if (error) {
          console.error("Error actualizando estado_conversacion:", error);
          return result(error);
        }
        result(null, res);
      }
    );
  });
}

// Actualiza el campo resultado_conversacion en la tabla conversacion
export function updateConversationResult(idConversacion: number, resultado: number, result: any): void {
  poolPromise.getConnection((err: any, connection: any) => {
    if (err) {
      console.error("Error obteniendo conexión:", err);
      return result(err);
    }
    connection.query(
      "UPDATE conversacion SET resultado_conversacion = ? WHERE id_conversacion = ?",
      [resultado, idConversacion],
      (error: any, res: any) => {
        connection.release();
        if (error) {
          console.error("Error actualizando resultado_conversacion:", error);
          return result(error);
        }
        result(null, res);
      }
    );
  });
}

// Función para crear el registro de métricas en la tabla conversacion_metricas
export function createConversationMetrics(
  params: {
    resumen: string;
    nivelInteres?: string;
    nivelConocimiento?: string;
    productosServiciosMencionados?: string;
    interesProspecto?: number;
    perfilCliente?: number;
    nivelNecesidad?: number;
    barrerasObjeciones?: number;
    probabilidadVenta?: number;
  },
  result: any
): void {
  poolPromise.getConnection((err: any, connection: any) => {
    if (err) {
      console.error("Error obteniendo conexión:", err);
      return result(err);
    }
    connection.query(
      `INSERT INTO conversacion_metricas 
       (resumen, nivel_interes, nivel_conocimiento, productos_servicios_mencionados, 
        interes_prospecto, perfil_cliente, nivel_necesidad, barreras_objeciones, probabilidad_venta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        params.resumen,
        params.nivelInteres || null,
        params.nivelConocimiento || null,
        params.productosServiciosMencionados || null,
        params.interesProspecto || null,
        params.perfilCliente || null,
        params.nivelNecesidad || null,
        params.barrerasObjeciones || null,
        params.probabilidadVenta || null,
      ],
      (error: any, res: any) => {
        connection.release();
        if (error) {
          console.error("Error creando métricas de conversación:", error);
          return result(error);
        }
        result(null, res.insertId);
      }
    );
  });
}

// Función para actualizar la conversación asignándole el ID de métricas
export function updateConversationMetrics(
  conversationId: number,
  idMetricas: number,
  result: any
): void {
  poolPromise.getConnection((err: any, connection: any) => {
    if (err) {
      console.error("Error obteniendo conexión:", err);
      return result(err);
    }
    connection.query(
      "UPDATE conversacion SET id_metricas = ? WHERE id_conversacion = ?",
      [idMetricas, conversationId],
      (error: any, res: any) => {
        connection.release();
        if (error) {
          console.error("Error actualizando métricas en la conversación:", error);
          return result(error);
        }
        result(null, res);
      }
    );
  });
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
