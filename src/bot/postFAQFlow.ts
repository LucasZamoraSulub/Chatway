import { addKeyword, EVENTS } from "@builderbot/bot";
import { faqMenuFlow } from "./faqMenuFlow";

export const postFAQFlow = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, ctxFn) => {
    let message =
      "¿Tienes alguna otra duda o pregunta? 😊\n" +
      "Recuerda que conmigo puedes obtener respuestas rápidas sin necesidad de esperar.";
    // Agregar las opciones de modalidad
    message += "\n" + "1️⃣ *Seguir preguntando* ✅\n" + "2️⃣ *No tengo dudas* ❌";
    await ctxFn.flowDynamic(message);
  })
  .addAction({ capture: true }, async (ctx, ctxFn) => {
    const userInput = ctx.body.toLowerCase().trim();

    if (
      userInput.includes("1") ||
      userInput.includes("sí") ||
      userInput.includes("si")
    ) {
      console.log(`📌 Usuario ${ctx.from} quiere seguir preguntando.`);
      return ctxFn.gotoFlow(faqMenuFlow); // Refresca el menú de preguntas frecuentes
    }

    if (
      userInput.includes("2") ||
      userInput.includes("no") ||
      userInput.includes("❌")
    ) {
      console.log(
        `📌 Usuario ${ctx.from} no necesita más ayuda. Finalizando conversación.`
      );
      await ctxFn.flowDynamic(
        "✅ ¡Gracias por tu tiempo! 😊\n" +
          "Espero haber resuelto tus dudas. Recuerda que estoy aquí para ayudarte en cualquier momento, sin esperas y con respuestas rápidas. ¡Vuelve cuando lo necesites! 🌟"
      );
      return ctxFn.endFlow();
    }

    return ctxFn.flowDynamic(
      "❌ Mmm… parece que hubo un pequeño error y no pude entender tu respuesta. No te preocupes, estoy aquí para ayudarte. 😉\n" +
        "Intenta de nuevo escribiendo el número de la opción o formulando tu pregunta de otra manera, ¡y te responderé al instante!"
    );
  });
