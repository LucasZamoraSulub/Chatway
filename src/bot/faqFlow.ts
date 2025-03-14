import { addKeyword, EVENTS } from "@builderbot/bot";
import aiServices from "~/services/aiServices";
import { config } from "../config";
import path from "path";
import fs from "fs";
import { faqMenuFlow } from "./faqMenuFlow";

// 📌 Cargar el prompt de preguntas rápidas
const pathPrompt = path.join(
  process.cwd(),
  "assets/Prompts",
  "prompt_faq.txt"
);
const promptFAQ = fs.readFileSync(pathPrompt, "utf8");

// 🚪 Palabras clave para finalizar la conversación
const EXIT_KEYWORDS = [
  "gracias",
  "finalizar",
  "salir",
  "adiós",
  "no, eso es todo",
  "ya no necesito ayuda",
];

// 🏛️ Palabras clave que deberían ser redirigidas al menú FAQ
const MENU_KEYWORDS = [
  "más preguntas",
  "otra pregunta",
  "quiero saber más",
  "ver opciones",
];

export const faqFlow = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, ctxFn) => {
    try {
      console.log(`📌 Usuario ${ctx.from} ingresó a faqFlow.`);
      const userMessage = ctx.body;
      const AI = new aiServices(config.ApiKey);
      const response = await AI.chat(promptFAQ, [{ role: "user", content: userMessage }]);
      console.log(`🤖 Respuesta de IA: ${response}`);

      // Enviar primero la respuesta generada
      await ctxFn.flowDynamic(response);

      // Luego, enviar el mensaje de validación separado
      await ctxFn.flowDynamic(
        "🤖 ¿Necesitas ayuda con algo más? 😊\n" +
          "Si tienes otra pregunta, dime y con gusto te responderé al instante.\n" +
          "1️⃣ *Seguir preguntando* 📚\n" +
          "2️⃣ *No tengo dudas* ❌"
      );
    } catch (error) {
      console.error("❌ Error en faqFlow:", error);
      await ctxFn.flowDynamic("Hubo un error procesando tu solicitud. Inténtalo de nuevo.");
    }
  })
  .addAction({ capture: true }, async (ctx, ctxFn) => {
    try {
      const userInput = ctx.body.toLowerCase().trim();
      if (
        userInput.includes("2") ||
        EXIT_KEYWORDS.some((keyword) => userInput.includes(keyword))
      ) {
        console.log(`👋 Usuario ${ctx.from} ha finalizado el flujo de FAQ.`);
        await ctxFn.flowDynamic(
          "✅ ¡Gracias por tu tiempo! 😊\n" +
            "Espero haber resuelto todas tus dudas. Recuerda que siempre puedes volver y preguntarme lo que necesites. ¡Que tengas un excelente día! 🌟"
        );
        return ctxFn.endFlow();
      }

      if (
        userInput.includes("1") ||
        MENU_KEYWORDS.some((keyword) => userInput.includes(keyword))
      ) {
        console.log(`📌 Usuario ${ctx.from} quiere ver más opciones en FAQ.`);
        return ctxFn.gotoFlow(faqMenuFlow);
      }

      console.log(`⚠️ Opción no reconocida en FAQ para ${ctx.from}.`);
      return ctxFn.flowDynamic("❌ No entendí tu respuesta. Por favor, responde con '1' para seguir preguntando o '2' para finalizar.");
    } catch (error) {
      console.error("❌ Error capturando respuesta en FAQ:", error);
      return ctxFn.flowDynamic("Hubo un error procesando tu respuesta. Inténtalo de nuevo.");
    }
  });