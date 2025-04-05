//import mysql from "mysql2/promise";
import { config } from "../config";
import * as mysql from 'mysql';

const poolPromise = mysql.createPool({
  host: config.server,
  user: config.user,
  password: config.password,
  database: config.database,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default poolPromise;


// import sql from "mssql";
// import { config } from "../config";

// const db = {
//   server: config.server,  
//   database: config.database, 
//   user: config.user,
//   password: config.password, 
//   options: {
//     encrypt: true,
//     trustServerCertificate: true,
//   },
//   pool: {
//     max: 10,
//     min: 0,
//     idleTimeoutMillis: 30000
//   }
// };

// // Creamos un pool de conexión y lo exportamos para ser reutilizado en el repository
// export const poolPromise = new sql.ConnectionPool(db)
//   .connect()
//   .then((pool) => {
//     console.log("Conectado a SQL Server");
//     return pool;
//   })
//   .catch((err) => {
//     console.error("Error en la conexión a la BD:", err);
//     throw err;
//   });

// export default sql;

