import { addKeyword, EVENTS } from "@builderbot/bot";
import aiServices from "~/services/aiServices";
import { config } from "../config";
import path from "path";
import fs from "fs";
import { faqMenuFlow } from "./faqMenuFlow";
import { ConversationManager } from "~/services/conversationManager";
import { intentionGeneralFlow } from "./intentionGeneralFlow";

// 📌 Cargar el prompt de preguntas rápidas
const pathPrompt = path.join(process.cwd(), "assets/Prompts", "prompt_faq.txt");
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

const faqFlow = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, ctxFn) => {
    try {
      console.log(`📌 Usuario ${ctx.from} ingresó a faqFlow.`);
      const userMessage = ctx.body;
      const AI = new aiServices(config.ApiKey);
      const response = await AI.chat(promptFAQ, [
        { role: "user", content: userMessage },
      ]);
      console.log(`🤖 Respuesta de IA: ${response}`);

      // Registrar la respuesta generada por IA en la conversación
      const conversationId = await ctxFn.state.get("conversationId");
      if (conversationId) {
        await ConversationManager.logInteraction(
          ctx,
          ctxFn.state,
          "assistant",
          response
        );
      } else {
        console.error(
          "No se encontró conversationId para registrar la respuesta de IA."
        );
      }

      // Enviar primero la respuesta generada
      await ctxFn.flowDynamic(response);

      // Mensaje de validación que se enviará luego
      const validationMsg =
        "🤖 ¿Necesitas ayuda con algo más? 😊\n" +
        "Si tienes otra pregunta, dime y con gusto te responderé al instante.\n" +
        "1️⃣ *Seguir preguntando* 📚\n" +
        "2️⃣ *No tengo dudas* ❌";

      // Enviar el mensaje de validación
      await ctxFn.flowDynamic(validationMsg);

      // Registrar el mensaje de validación del bot
      if (conversationId) {
        await ConversationManager.logInteraction(
          ctx,
          ctxFn.state,
          "assistant",
          validationMsg
        );
      }
    } catch (error) {
      console.error("❌ Error en faqFlow:", error);
      await ctxFn.flowDynamic(
        "Hubo un error procesando tu solicitud. Inténtalo de nuevo."
      );
    }
  })
  .addAction({ capture: true }, async (ctx, ctxFn) => {
    try {
      const userInput = ctx.body.toLowerCase().trim();

      // Registrar la respuesta del usuario
      const conversationId = await ctxFn.state.get("conversationId");
      if (conversationId) {
        await ConversationManager.logInteraction(
          ctx,
          ctxFn.state,
          "user",
          ctx.body
        );
      }

      if (
        userInput.includes("1") ||
        MENU_KEYWORDS.some((keyword) => userInput.includes(keyword))
      ) {
        console.log(`📌 Usuario ${ctx.from} quiere ver más opciones en FAQ.`);
        return ctxFn.gotoFlow(faqMenuFlow);
      }

      if (
        userInput.includes("2") ||
        EXIT_KEYWORDS.some((keyword) => userInput.includes(keyword))
      ) {
        console.log(`👋 Usuario ${ctx.from} ha finalizado el flujo de FAQ.`);
        const farewell =
          "✅ ¡Gracias por tu tiempo! 😊\n" +
          "Espero haber resuelto todas tus dudas. Recuerda que siempre puedes volver y preguntarme lo que necesites. ¡Que tengas un excelente día! 🌟";
        await ctxFn.flowDynamic(farewell);
        // Registrar el mensaje de despedida del bot
        if (conversationId) {
          await ConversationManager.logInteraction(
            ctx,
            ctxFn.state,
            "assistant",
            farewell
          );
        }
        return ctxFn.endFlow();
      }

      console.log(`⚠️ Opción no reconocida en FAQ para ${ctx.from}.`);
      // En caso de no reconocer la respuesta, redirigir a intentionGeneralFlow
      return ctxFn.gotoFlow(intentionGeneralFlow);
    } catch (error) {
      console.error("❌ Error capturando respuesta en FAQ:", error);
      await ctxFn.flowDynamic(
        "Hubo un error procesando tu respuesta. Inténtalo de nuevo."
      );
    }
  });

export { faqFlow };
