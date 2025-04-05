import { addKeyword, EVENTS } from "@builderbot/bot";
import { UserService } from "~/controllers/userController";
import { askUserDataFlow } from "./askUserDataFlow";
import { genericAreaFlow } from "./areas/genericAreaFlow";
import { AreaConfigService } from "~/services/areaConfigService";
import { fetchUserDataPromise } from "~/services/serviceUser";

const intermediaryFlow = addKeyword(EVENTS.ACTION).addAction(async (ctx, ctxFn) => {
  // Obtener el área seleccionada desde el state
  const selectedFlow: string = await ctxFn.state.get("selectedFlow");
  if (!selectedFlow) {
    console.log(`⚠️ No se encontró área seleccionada para ${ctx.from}.`);
    return ctxFn.endFlow("❌ No se detectó una selección de área. Vuelve al menú principal.");
  }
  console.log(`✅ Área seleccionada: ${selectedFlow}`);

// Obtener datos del usuario desde la base de datos
const userData = await fetchUserDataPromise(ctx.from);
if (!userData) {
  console.error(`❌ No se encontraron datos para el usuario ${ctx.from}.`);
  return ctxFn.endFlow("Error al obtener datos del usuario.");
}
console.log(`📌 Datos actuales del usuario ${ctx.from}:`, userData);

  // Revisar la bandera skipRegistration
  const skipRegistration = await ctxFn.state.get("skipRegistration");
  if (userData.nombre === "Desconocido" && !skipRegistration) {
    console.log(`🔹 Datos predefinidos detectados para ${ctx.from}. Redirigiendo a askUserDataFlow.`);
    return ctxFn.gotoFlow(askUserDataFlow);
  } else {
    await ctxFn.state.update({ name: userData.nombre });
    console.log(`📝 Nombre actualizado: ${userData.nombre}`);
  }

  console.log(`✅ Datos confirmados para ${ctx.from}.`);

  // Obtener la configuración del área utilizando el service centralizado
  let areaConfig;
  try {
    areaConfig = AreaConfigService.getAreaConfig(selectedFlow);
  } catch (error: any) {
    console.error(error.message);
    return ctxFn.endFlow("❌ Área no reconocida. Vuelve a intentarlo desde el menú principal.");
  }

  console.log(`✅ Redirigiendo al flujo de atención vía bot para el área ${selectedFlow}.`);
  return ctxFn.gotoFlow(genericAreaFlow);
});

export { intermediaryFlow };
