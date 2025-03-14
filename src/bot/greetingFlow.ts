import { addKeyword, EVENTS } from "@builderbot/bot";
import { mainMenuFlow } from "./mainMenuFlow";

const greetingFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, ctxFn) => {
        console.log(`🎉 Usuario ${ctx.from} ha llegado a greetingFlow.`);
        
        await ctxFn.flowDynamic(
            "¡Hola! 👋 Soy Sami Bot, el asistente virtual de Grupo SAOM, y estoy aquí para ayudarte en lo que necesites. 😊\n"
        );
        
        console.log(`📌 Redirigiendo usuario ${ctx.from} a mainMenuFlow.`);
        return ctxFn.gotoFlow(mainMenuFlow);
    });

export { greetingFlow };
