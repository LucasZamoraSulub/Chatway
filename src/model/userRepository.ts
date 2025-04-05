import poolPromise from "../database/db";

// Verifica si existe un usuario por su celular en la tabla 'client'
export function userExists(celular: string, result: any): void {
  poolPromise.getConnection((err: any, connection: any) => {
    if (err) {
      console.error("Error obteniendo una conexión:", err);
      return result(err);
    }
    connection.query(
      "SELECT celular FROM client WHERE celular = ?",
      [celular],
      (error: any, rows: any) => {
        connection.release();
        if (error) {
          console.error("Error verificando existencia de usuario:", error);
          return result(error);
        }
        result(null, rows.length > 0);
      }
    );
  });
}

// Crea un nuevo usuario en la tabla 'client'
// Se insertan los campos: celular, cont (nombre de contacto) y correo
export function createUser(celular: string, nombre: string, email: string, result: any): void {
  poolPromise.getConnection((err: any, connection: any) => {
    if (err) {
      console.error("Error obteniendo una conexión:", err);
      return result(err);
    }
    connection.query(
      "INSERT INTO client (celular, cont, correo) VALUES (?, ?, ?)",
      [celular, nombre, email],
      (error: any, res: any) => {
        connection.release();
        if (error) {
          console.error("Error creando usuario:", error);
          return result(error);
        }
        result(null, res);
      }
    );
  });
}

// Actualiza la información de un usuario existente en 'client'
export function updateUserInfo(celular: string, nombre: string, email: string, result: any): void {
  poolPromise.getConnection((err: any, connection: any) => {
    if (err) {
      console.error("Error obteniendo una conexión:", err);
      return result(err);
    }
    connection.query(
      "UPDATE client SET cont = ?, Empresa = ?, correo = ?, updated_at = NOW() WHERE celular = ?",
      [nombre, nombre, email, celular],
      (error: any, res: any) => {
        connection.release();
        if (error) {
          console.error("Error actualizando usuario:", error);
          return result(error);
        }
        result(null, res);
      }
    );
  });
}

// Obtiene los datos del usuario por su celular desde 'client'
export function getUserData(celular: string, result: any): void {
  poolPromise.getConnection((err: any, connection: any) => {
    if (err) {
      console.error("Error obteniendo una conexión:", err);
      return result(err);
    }
    connection.query(
      "SELECT cont AS nombre, correo AS email FROM client WHERE celular = ?",
      [celular],
      (error: any, rows: any) => {
        connection.release();
        if (error) {
          console.error("Error obteniendo datos del usuario:", error);
          return result(error);
        }
        if (rows.length > 0) {
          result(null, rows[0]);
        } else {
          result(null, null);
        }
      }
    );
  });
}

// Obtiene el ID del usuario por su celular desde 'client'
export function getUserId(celular: string, result: any): void {
  poolPromise.getConnection((err: any, connection: any) => {
    if (err) {
      console.error("Error obteniendo una conexión:", err);
      return result(err);
    }
    connection.query(
      "SELECT id_Client FROM client WHERE celular = ?",
      [celular],
      (error: any, rows: any) => {
        connection.release();
        if (error) {
          console.error("Error obteniendo id del usuario:", error);
          return result(error);
        }
        if (rows.length > 0) {
          result(null, rows[0].id_Client);
        } else {
          result(null, null);
        }
      }
    );
  });
}

// Función para actualizar la información de contacto del cliente
export function updateClientContactInfo(
  celular: string,
  email: string,
  city: number,
  result: any
): void {
  poolPromise.getConnection((err: any, connection: any) => {
    if (err) {
      console.error("Error obteniendo una conexión:", err);
      return result(err);
    }
    connection.query(
      "UPDATE client SET correo = ?, Cuidad = ?, updated_at = NOW() WHERE celular = ?",
      [email, city, celular],
      (error: any, res: any) => {
        connection.release();
        if (error) {
          console.error("Error actualizando la info del cliente:", error);
          return result(error);
        }
        result(null, res);
      }
    );
  });
}

//CONFIGURACION DE LA BASE DE DATOS MYSQL
// import { database } from "../database/index";

// // Verifica si existe un usuario por su teléfono
// export async function userExists(telefono: string): Promise<boolean> {
//   try {
//     const [rows]: any = await database.db.promise().query(
//       "SELECT telefono FROM clientes_potenciales WHERE telefono = ?",
//       [telefono]
//     );
//     return rows.length > 0;
//   } catch (err) {
//     console.error("Error verificando existencia de usuario:", err);
//     throw err;
//   }
// }

// // Crea un nuevo usuario en clientes_potenciales
// export async function createUser(telefono: string, nombre: string, email: string): Promise<void> {
//   try {
//     await database.db.promise().query(
//       "INSERT INTO clientes_potenciales (telefono, nombre, email) VALUES (?, ?, ?)",
//       [telefono, nombre, email]
//     );
//   } catch (err) {
//     console.error("Error creando usuario:", err);
//     throw err;
//   }
// }

// // Actualiza la información de un usuario existente
// export async function updateUserInfo(telefono: string, nombre: string, email: string): Promise<void> {
//   try {
//     await database.db.promise().query(
//       "UPDATE clientes_potenciales SET nombre = ?, email = ?, updated_at = NOW() WHERE telefono = ?",
//       [nombre, email, telefono]
//     );
//   } catch (err) {
//     console.error("Error actualizando usuario:", err);
//     throw err;
//   }
// }

// // Obtiene los datos del usuario por su teléfono
// export async function getUserData(telefono: string): Promise<{ nombre: string; email: string } | null> {
//   try {
//     const [rows]: any = await database.db.promise().query(
//       "SELECT nombre, email FROM clientes_potenciales WHERE telefono = ?",
//       [telefono]
//     );
//     if (rows.length > 0) {
//       return rows[0];
//     }
//     return null;
//   } catch (err) {
//     console.error("Error obteniendo datos del usuario:", err);
//     throw err;
//   }
// }

// // Obtiene el ID del usuario por su teléfono
// export async function getUserId(telefono: string): Promise<number | null> {
//   try {
//     const [rows]: any = await database.db.promise().query(
//       "SELECT id_cliente FROM clientes_potenciales WHERE telefono = ?",
//       [telefono]
//     );
//     if (rows.length > 0) {
//       return rows[0].id_cliente;
//     }
//     return null;
//   } catch (err) {
//     console.error("Error obteniendo id del usuario:", err);
//     throw err;
//   }
// }
