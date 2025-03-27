import {
  userExists,
  createUser,
  updateUserInfo,
  getUserData,
  getUserId,
} from "../model/userRepository";

export class UserService {
  // Verifica si un usuario existe a través de su celular
  public static async existsUser(celular: string): Promise<boolean> {
    try {
      return await userExists(celular);
    } catch (error) {
      console.error("UserService - existsUser error:", error);
      throw error;
    }
  }

  // Registra un usuario; si ya existe, actualiza su información
  public static async registerUser(
    celular: string,
    nombre: string,
    email: string
  ): Promise<void> {
    try {
      const exists = await userExists(celular);
      if (!exists) {
        await createUser(celular, nombre, email);
      } else {
        // Actualiza la información en caso de que ya exista
        await updateUserInfo(celular, nombre, email);
      }
    } catch (error) {
      console.error("UserService - registerUser error:", error);
      throw error;
    }
  }

  // Recupera los datos del usuario (nombre y email)
  public static async fetchUserData(
    celular: string
  ): Promise<{ nombre: string; email: string } | null> {
    try {
      return await getUserData(celular);
    } catch (error) {
      console.error("UserService - fetchUserData error:", error);
      throw error;
    }
  }

  // Obtiene el ID del usuario a partir de su celular
  public static async fetchUserId(celular: string): Promise<number | null> {
    try {
      return await getUserId(celular);
    } catch (error) {
      console.error("UserService - fetchUserId error:", error);
      throw error;
    }
  }
}
