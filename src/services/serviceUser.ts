// src/services/serviceUser.ts
import { UserService } from "~/controllers/userController";

/**
 * Envuelve al método existsUser del UserService (que usa callbacks) en una Promesa.
 * @param celular Número de teléfono del usuario.
 * @returns Promesa que resuelve a true o false según la existencia del usuario.
 */
export function existsUserPromise(celular: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // Simulamos un objeto req con el celular en body
    const req = { body: { celular } };
    // Creamos un objeto res que implemente status y json para capturar la respuesta
    const res = {
      status: (code: number) => ({
        json: (data: any) => reject(new Error(`Error ${code}: ${JSON.stringify(data)}`))
      }),
      json: (data: any) => resolve(data.exists)
    };
    UserService.existsUser(req, res);
  });
}

/**
 * Registra un usuario utilizando el método registerUser basado en callbacks.
 * Envuelve la llamada en una Promesa para poder usar async/await.
 * @param celular Número del usuario.
 * @param nombre Nombre del usuario.
 * @param email Email del usuario.
 * @returns Una Promesa que se resuelve si el registro es exitoso.
 */
export function registerUserPromise(celular: string, nombre: string, email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = { body: { celular, nombre, email } };
    const res = {
      status: (code: number) => ({
        json: (data: any) => reject(new Error(`Error ${code}: ${JSON.stringify(data)}`))
      }),
      json: (data: any) => resolve()
    };
    UserService.registerUser(req, res);
  });
}

/**
 * Envuelve al método getUserData en una Promesa para usar async/await.
 * @param celular Número del usuario.
 * @returns Una promesa que se resuelve con los datos del usuario o null.
 */
export function fetchUserDataPromise(celular: string): Promise<{ nombre: string; email: string } | null> {
  return new Promise((resolve, reject) => {
    const req = { body: { celular } };
    const res = {
      status: (code: number) => ({
        json: (data: any) => reject(new Error(`Error ${code}: ${JSON.stringify(data)}`))
      }),
      json: (data: any) => resolve(data.data)
    };
    UserService.getUserData(req, res);
  });
}

/**
 * Envuelve el método getUserId en una Promesa para poder usar async/await.
 * @param celular Número de teléfono del usuario.
 * @returns Promesa que se resuelve con el ID del usuario o null.
 */
export function fetchUserIdPromise(celular: string): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const req = { body: { celular } };
    const res = {
      status: (code: number) => ({
        json: (data: any) => reject(new Error(`Error ${code}: ${JSON.stringify(data)}`))
      }),
      json: (data: any) => resolve(data.id)
    };
    UserService.getUserId(req, res);
  });
}

/**
 * Envuelve al método updateContactInfo en una Promesa para poder usar async/await.
 * @param celular Número del usuario.
 * @param email Email del usuario.
 * @param city Ciudad del usuario.
 * @returns Una Promesa que se resuelve si la actualización es exitosa.
 */
export function updateContactInfoPromise(celular: string, email: string, city: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = { body: { celular, email, city } };
    const res = {
      status: (code: number) => ({
        json: (data: any) => reject(new Error(`Error ${code}: ${JSON.stringify(data)}`))
      }),
      json: (data: any) => resolve()
    };
    UserService.updateContactInfo(req, res);
  });
}