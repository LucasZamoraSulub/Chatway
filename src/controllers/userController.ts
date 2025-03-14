import {
  userExists,
  createUser,
  updateUserInfo,
  getUserData,
  getUserId,
} from "../model/userRepository";

export class UserService {
  // Verifica si un usuario existe a través de su teléfono
  public static async existsUser(telefono: string): Promise<boolean> {
    try {
      return await userExists(telefono);
    } catch (error) {
      console.error("UserService - existsUser error:", error);
      throw error;
    }
  }

  // Registra un usuario; si ya existe, actualiza su información
  public static async registerUser(
    telefono: string,
    nombre: string,
    email: string
  ): Promise<void> {
    try {
      const exists = await userExists(telefono);
      if (!exists) {
        await createUser(telefono, nombre, email);
      } else {
        // Actualiza la información en caso de que ya exista
        await updateUserInfo(telefono, nombre, email);
      }
    } catch (error) {
      console.error("UserService - registerUser error:", error);
      throw error;
    }
  }

  // Recupera los datos del usuario (nombre y email)
  public static async fetchUserData(
    telefono: string
  ): Promise<{ nombre: string; email: string } | null> {
    try {
      return await getUserData(telefono);
    } catch (error) {
      console.error("UserService - fetchUserData error:", error);
      throw error;
    }
  }

  public static async fetchUserId(telefono: string): Promise<number | null> {
    try {
      return await getUserId(telefono);
    } catch (error) {
      console.error("UserService - fetchUserId error:", error);
      throw error;
    }
  }
}
