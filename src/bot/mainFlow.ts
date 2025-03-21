import { addKeyword, EVENTS } from "@builderbot/bot";
import { UserService } from "~/controllers/userController";
import { registerFlow } from "./registerFlow";
import { intentionGeneralFlow } from "./intentionGeneralFlow";

const mainFlow = addKeyword(EVENTS.WELCOME).addAction(async (ctx, ctxFn) => {
  console.log(`🔹 Usuario ${ctx.from} ha iniciado la conversación.`);

  // ✅ Verificar si el usuario ya está registrado en la BD SQL Server
  const isUserRegistered = await UserService.existsUser(ctx.from);

  // const isUserRegistered = await sheetsService.userExists(ctx.from);

  if (!isUserRegistered) {
    console.log(
      `🔸 Usuario ${ctx.from} NO está registrado. Redirigiendo a registerFlow.`
    );
    return ctxFn.gotoFlow(registerFlow);
  }

  console.log(`✅ Usuario ${ctx.from} ya registrado. Redirigiendo a intentionGeneralFlow.`);
  // Almacenar el mensaje inicial en el estado para que no se pierda
  // await ctxFn.state.update({ initialMessage: ctx.body });
  return ctxFn.gotoFlow(intentionGeneralFlow);
});

export { mainFlow };

