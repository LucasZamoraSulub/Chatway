import { addKeyword, EVENTS } from "@builderbot/bot";
import { faqMenuFlow } from "./faqMenuFlow";
import { selectServiceModeFlow } from "./selectServiceModeFlow";

export const postFAQAreaFlow = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, ctxFn) => {
    let message =
      "🤖 Ahora que conoces cómo funciona esta área, ¿quieres proceder con este proceso o prefieres hacer otra pregunta?\n" +
      "Recuerda que conmigo puedes obtener respuestas rápidas y sin tiempos de espera. Estoy aquí para ayudarte. 😉";
    // Agregar las opciones de modalidad
    message += "\n" +
      "1️⃣ *Proceder* 🤖\n" +
      "2️⃣ *Seguir preguntando* 📚";
    await ctxFn.flowDynamic(message);
  })
  .addAction({ capture: true }, async (ctx, ctxFn) => {
    const userInput = ctx.body.trim().toLowerCase();
    console.log(`📥 Usuario ${ctx.from} seleccionó: ${ctx.body}`);

    // Obtener el área seleccionada del estado
    const selectedFlow = await ctxFn.state.get("selectedFlow");
    if (!selectedFlow) {
      console.log(`⚠️ No se encontró área seleccionada para ${ctx.from}.`);
      return ctxFn.flowDynamic(
        "❌ Parece que hubo un pequeño problema y no pude procesar tu elección. No te preocupes, intentémoslo de nuevo. 😊\n" +
        "Solo dime el número o el nombre de la opción que deseas y te guiaré al instante."
      );
    }

    // Manejo de la respuesta
    if (userInput.includes("1") || userInput.includes("proceder") || userInput.includes("continuar")) {
      console.log(`📌 Usuario ${ctx.from} quiere continuar en el área de ${selectedFlow}. Redirigiendo a selectServiceModeFlow.`);
      return ctxFn.gotoFlow(selectServiceModeFlow);
    }

    if (userInput.includes("2") || userInput.includes("preguntas") || userInput.includes("faq") || userInput.includes("seguir")) {
      console.log(`📌 Usuario ${ctx.from} quiere seguir preguntando.`);
      return ctxFn.gotoFlow(faqMenuFlow);
    }

    console.log(`⚠️ Usuario ${ctx.from} ingresó una opción no válida.`);
    return ctxFn.fallBack(
      "❌ Mmm… no logré entender tu respuesta. Intenta de nuevo eligiendo una de las opciones disponibles:\n" +
      "1️⃣ *Proceder* 🤖\n" +
      "2️⃣ *Seguir preguntando* 📚\n" +
      "Si necesitas ayuda, dime y con gusto te guiaré. 😉"
    );
  });
