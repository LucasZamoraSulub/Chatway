import { addKeyword, EVENTS } from "@builderbot/bot";
import { UserService } from "~/controllers/userController";
import { askUserDataFlow } from "./askUserDataFlow";
import { areasConfig, AreaConfig } from "~/config/areas.config";
import { genericAreaFlow } from "./areas/genericAreaFlow";

const intermediaryFlow = addKeyword(EVENTS.ACTION).addAction(async (ctx, ctxFn) => {
  // Obtener el área seleccionada del estado
  const selectedFlow: string = await ctxFn.state.get("selectedFlow");

  if (!selectedFlow) {
    console.log(`⚠️ No se encontró área seleccionada para ${ctx.from}.`);
    return ctxFn.endFlow("❌ No se detectó una selección de área. Vuelve al menú principal.");
  }
  console.log(`✅ Área seleccionada por el usuario: ${selectedFlow}`);

  // Obtener datos del usuario desde SQL Server
  const userData = await UserService.fetchUserData(ctx.from);
  console.log(`📌 Datos actuales del usuario ${ctx.from}:`, userData);

  // Revisar la bandera skipRegistration
  const skipRegistration = await ctxFn.state.get("skipRegistration");

  // Si los datos son predefinidos y el usuario no optó por saltar el registro, redirige a askUserDataFlow
  if ((userData.nombre === "Desconocido") && !skipRegistration) {
    console.log(`🔹 Datos predefinidos detectados para ${ctx.from}. Redirigiendo a askUserDataFlow.`);
    return ctxFn.gotoFlow(askUserDataFlow);
  } else {
    await ctxFn.state.update({ name: userData.nombre });
    console.log(`📝 Usuario ${ctx.from} ingresó el nombre: ${userData.nombre}`);
  }

  console.log(`✅ Datos reales confirmados para ${ctx.from}.`);

  // Buscar la configuración del área seleccionada
  const areaConfig: AreaConfig | undefined = areasConfig.find(
    (area) => area.area === selectedFlow
  );
  if (!areaConfig) {
    console.log(`⚠️ No se encontró configuración para el área ${selectedFlow}.`);
    return ctxFn.endFlow("❌ Área no reconocida. Vuelve a intentarlo desde el menú principal.");
  }

  console.log(`✅ Redirigiendo al flujo de atención vía bot: ${selectedFlow}.`);

  // Redirigir al flujo configurado en botFlow para el área seleccionada
  return ctxFn.gotoFlow(genericAreaFlow);
});

export { intermediaryFlow };
