import poolPromise from "../database/db";

// Verifica si existe un usuario por su celular en la tabla 'client'
export async function userExists(celular: string): Promise<boolean> {
  try {
    const [rows]: any = await poolPromise.query(
      "SELECT celular FROM client WHERE celular = ?",
      [celular]
    );
    return rows.length > 0;
  } catch (err) {
    console.error("Error verificando existencia de usuario:", err);
    throw err;
  }
}

// Crea un nuevo usuario en la tabla 'client'
// Se insertan los campos: celular, cont (nombre de contacto) y correo
export async function createUser(celular: string, nombre: string, email: string): Promise<void> {
  try {
    await poolPromise.query(
      "INSERT INTO client (celular, cont, correo) VALUES (?, ?, ?)",
      [celular, nombre, email]
    );
  } catch (err) {
    console.error("Error creando usuario:", err);
    throw err;
  }
}

// Actualiza la información de un usuario existente en 'client'
export async function updateUserInfo(celular: string, nombre: string, email: string): Promise<void> {
  try {
    await poolPromise.query(
      "UPDATE client SET cont = ?, correo = ?, updated_at = NOW() WHERE celular = ?",
      [nombre, email, celular]
    );
  } catch (err) {
    console.error("Error actualizando usuario:", err);
    throw err;
  }
}

// Obtiene los datos del usuario por su celular desde 'client'
export async function getUserData(celular: string): Promise<{ nombre: string; email: string } | null> {
  try {
    const [rows]: any = await poolPromise.query(
      "SELECT cont AS nombre, correo AS email FROM client WHERE celular = ?",
      [celular]
    );
    if (rows.length > 0) {
      return rows[0];
    }
    return null;
  } catch (err) {
    console.error("Error obteniendo datos del usuario:", err);
    throw err;
  }
}

// Obtiene el ID del usuario por su celular desde 'client'
export async function getUserId(celular: string): Promise<number | null> {
  try {
    const [rows]: any = await poolPromise.query(
      "SELECT id_Client FROM client WHERE celular = ?",
      [celular]
    );
    if (rows.length > 0) {
      return rows[0].id_Client;
    }
    return null;
  } catch (err) {
    console.error("Error obteniendo id del usuario:", err);
    throw err;
  }
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
