import { addKeyword, EVENTS } from "@builderbot/bot";
import { UserService } from "~/controllers/userController";
import { mainFlow } from "./mainFlow";
import { registerUserPromise } from "~/services/serviceUser";

const registerFlow = addKeyword(EVENTS.ACTION).addAction(async (ctx, ctxFn) => {
  console.log(`📌 Iniciando registro automático para usuario ${ctx.from}.`);

  // Registrar automáticamente al usuario en la BD SQL Server
  try {
    await registerUserPromise(ctx.from, "Desconocido", "Sin correo");
    console.log(
      `✅ Usuario ${ctx.from} registrado con éxito en la BD SQL Server.`
    );
  } catch (error) {
    console.error("Error registrando usuario:", error);
    return ctxFn.endFlow("Error al registrar usuario.");
  }

  // ✅ Redirigir de vuelta a `mainFlow.ts` para validar registro y continuar
  return ctxFn.gotoFlow(mainFlow);
});

export { registerFlow };
