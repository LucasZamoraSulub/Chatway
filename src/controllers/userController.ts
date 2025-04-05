import * as userRepo from "../model/userRepository";

export class UserService {
  // Verifica si existe un usuario a partir de su celular
  static existsUser(req: any, res: any): void {
    const { celular } = req.body;
    userRepo.userExists(celular, (err: any, exists: boolean) => {
      if (err) {
        console.error("Error verificando existencia de usuario:", err);
        return res.status(500).json({ error: err });
      }
      console.log("Resultado de existsUser:", exists);
      res.json({ success: true, exists });
    });
  }

  // Registra un usuario o actualiza su información si ya existe
  static registerUser(req: any, res: any): void {
    const { celular, nombre, email } = req.body;
    userRepo.userExists(celular, (err: any, exists: boolean) => {
      if (err) {
        console.error("Error verificando usuario:", err);
        return res.status(500).json({ error: err });
      }
      if (!exists) {
        userRepo.createUser(celular, nombre, email, (err: any, result: any) => {
          if (err) {
            console.error("Error creando usuario:", err);
            return res.status(500).json({ error: err });
          }
          console.log("Usuario creado:", result);
          res.json({ success: true, message: "Usuario creado", result });
        });
      } else {
        userRepo.updateUserInfo(
          celular,
          nombre,
          email,
          (err: any, result: any) => {
            if (err) {
              console.error("Error actualizando usuario:", err);
              return res.status(500).json({ error: err });
            }
            console.log("Usuario actualizado:", result);
            res.json({ success: true, message: "Usuario actualizado", result });
          }
        );
      }
    });
  }

  // Obtiene los datos del usuario (nombre y email)
  static getUserData(req: any, res: any): void {
    const { celular } = req.body;
    userRepo.getUserData(
      celular,
      (err: any, data: { nombre: string; email: string } | null) => {
        if (err) {
          console.error("Error obteniendo datos del usuario:", err);
          return res.status(500).json({ error: err });
        }
        res.json({ success: true, data });
      }
    );
  }

  // Obtiene el ID del usuario a partir de su celular
  static getUserId(req: any, res: any): void {
    const { celular } = req.body;
    userRepo.getUserId(celular, (err: any, id: number | null) => {
      if (err) {
        console.error("Error obteniendo id del usuario:", err);
        return res.status(500).json({ error: err });
      }
      res.json({ success: true, id });
    });
  }

  // Actualiza el email y la ciudad del cliente en la tabla client
  static updateContactInfo(req: any, res: any): void {
    const { celular, email, city } = req.body;
    userRepo.updateClientContactInfo(
      celular,
      email,
      city,
      (err: any, result: any) => {
        if (err) {
          console.error("Error actualizando la información de contacto:", err);
          return res.status(500).json({ error: err });
        }
        res.json({
          success: true,
          message: "Información de contacto actualizada",
          result,
        });
      }
    );
  }
}
