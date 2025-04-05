// src/services/areaConfigService.ts
import { areasConfig, AreaConfig } from "~/config/areas.config";

export class AreaConfigService {
  /**
   * Retorna la configuración del área basado en el valor seleccionado.
   * Lanza un error si no se encuentra la configuración.
   */
  static getAreaConfig(selectedFlow: string): AreaConfig {
    const areaConfig = areasConfig.find(area => area.area === selectedFlow);
    if (!areaConfig) {
      throw new Error(`No se encontró configuración para el área: ${selectedFlow}`);
    }
    return areaConfig;
  }

  /**
   * Valida que la configuración del área tenga los parámetros mínimos requeridos.
   */
  static validateAreaConfig(areaConfig: AreaConfig): boolean {
    // Ejemplo: se espera que la configuración tenga un mensaje de bienvenida
    return !!(areaConfig && areaConfig.conversation && areaConfig.welcomeMessage);
  }
}
