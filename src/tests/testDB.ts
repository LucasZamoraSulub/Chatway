import { poolPromise } from "../database/db";

// Funcion para seleccionar todos los apartamentos
async function selectDepartamentos() {
  let pool;
  try {
    pool = await poolPromise;
    const result = await pool.request().query("SELECT * FROM apartamentos");
    console.log("Resultado de la consulta:", result.recordset);
  } catch (error) {
    console.error("Error durante la prueba:", error);
  } finally {
    if (pool) {
      pool.close();
    }
  }
}
// Ejemplo de uso:
selectDepartamentos();

// Funcion para seleccionar un departamento por su id
// export async function selectDepartamento(id: number): Promise<any> {
//   try {
//     const pool = await connectDB();
//     const result = await pool
//       .request()
//       .input("id", sql.Int, id)
//       .query("SELECT * FROM apartamentos WHERE id_apartamento = @id");
//     return result.recordset[0] || null;
//   } catch (error) {
//     console.error("Error seleccionando departamento:", error);
//     throw error;
//   } finally {
//     sql.close();
//   }
// }
// // Ejemplo de uso:
// (async () => {
//   const departamento = await selectDepartamento(1);
//   console.log(departamento);
// })();

// Funcion para insertar un nuevo departamento
// export async function insertDepartamento(nombre: string, descripcion: string): Promise<void> {
//     try {
//       const pool = await connectDB();
//       await pool.request()
//         .input('nombre', sql.VarChar(100), nombre)
//         .input('descripcion', sql.Text, descripcion)
//         .query('INSERT INTO apartamentos (nombre, descripcion) VALUES (@nombre, @descripcion)');
//       console.log('Departamento insertado correctamente');
//     } catch (error) {
//       console.error('Error insertando departamento:', error);
//     } finally {
//       sql.close();
//     }
//   }

//   // Ejemplo de uso:
//   insertDepartamento('central', 'Departamento encargado de la gestión de centrales');

// Funcion para actualizar un departamento
// export async function updateDepartamento(
//   id: number,
//   nombre: string,
//   descripcion: string
// ): Promise<void> {
//   try {
//     const pool = await connectDB();
//     await pool
//       .request()
//       .input("id", sql.Int, id)
//       .input("nombre", sql.VarChar(100), nombre)
//       .input("descripcion", sql.Text, descripcion)
//       .query(
//         "UPDATE apartamentos SET nombre = @nombre, descripcion = @descripcion WHERE id_apartamento = @id"
//       );
//     console.log("Departamento actualizado correctamente");
//   } catch (error) {
//     console.error("Error actualizando departamento:", error);
//     throw error;
//   } finally {
//     sql.close();
//   }
// }

// // Ejemplo de uso:
// updateDepartamento(
//   3,
//   "central de monitoreio",
//   "Departamento para la central de monitoreo de la empresa"
// );

// Funcion para eliminar un departamento
// export async function deleteDepartamento(id: number): Promise<void> {
//     try {
//       const pool = await connectDB();
//       await pool.request()
//         .input('id', sql.Int, id)
//         .query('DELETE FROM apartamentos WHERE id_apartamento = @id');
//       console.log('Departamento eliminado correctamente');
//     } catch (error) {
//       console.error('Error eliminando departamento:', error);
//       throw error;
//     } finally {
//       sql.close();
//     }
//   }
  
//   // Ejemplo de uso:
// deleteDepartamento(1);