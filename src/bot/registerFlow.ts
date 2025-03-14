import { addKeyword, EVENTS } from "@builderbot/bot";
import { UserService } from "~/controllers/userController";
import { mainFlow } from "./mainFlow";

const registerFlow = addKeyword(EVENTS.ACTION).addAction(async (ctx, ctxFn) => {
  console.log(`📌 Iniciando registro automático para usuario ${ctx.from}.`);

  // ✅ Registrar automáticamente al usuario en la BD SQL Server
  await UserService.registerUser(ctx.from, "Desconocido", "Sin correo");

  // await sheetsService.createUser(ctx.from, "Desconocido", "Sin correo");

  console.log(`✅ Usuario ${ctx.from} registrado con éxito en Google Sheets.`);

  // ✅ Redirigir de vuelta a `mainFlow.ts` para validar registro y continuar
  return ctxFn.gotoFlow(mainFlow);
});

export { registerFlow };
