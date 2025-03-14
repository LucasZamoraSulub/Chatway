import sql, { poolPromise } from "../database/db";

export async function getUserData(
  telefono: string
): Promise<{ nombre: string; email: string } | null> {
  try {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input("telefono", sql.VarChar, telefono)
      .query(
        "SELECT nombre, email FROM clientes_potenciales WHERE telefono = @telefono"
      );
    if (result.recordset.length > 0) {
      return result.recordset[0];
    }
    return null;
  } catch (err) {
    console.error("Error obteniendo datos del usuario:", err);
    throw err;
  }
}

// ejemplo de uso de la función getUserData
const telefono = "9982492334";
getUserData(telefono)
  .then((userData) => {
    if (userData) {
      console.log(`Datos del usuario con teléfono ${telefono}:`, userData);
    } else {
      console.log(
        `No se encontraron datos para el usuario con teléfono ${telefono}`
      );
    }
  })
  .catch((err) => {
    console.error("Error obteniendo datos del usuario:", err);
  });
