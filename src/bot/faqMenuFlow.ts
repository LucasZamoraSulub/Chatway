import { addKeyword, EVENTS } from "@builderbot/bot";
import { faqItems } from "~/config/faq.config";
import { postFAQFlow } from "./postFAQFlow";
import { postFAQAreaFlow } from "./postFAQAreaFlow";
import { intentionGeneralFlow } from "./intentionGeneralFlow";
import { ConversationManager } from "~/services/conversationManager";

const generateFAQMenu = (): string => {
  let menuText =
    "📌 *Preguntas Frecuentes (FAQ)*\n" +
    "Encuentra respuestas rápidas a las dudas más comunes sin necesidad de esperar. 😉\n";

  faqItems.forEach((faq, index) => {
    menuText += `${index + 1}. ${faq.question}\n`;
  });

  menuText +=
    "\n✍️ Escribe el número o el texto de la opción que deseas saber, y te responderé al instante.";
  return menuText;
};

const faqMenuFlow = addKeyword(EVENTS.ACTION)
  // Primer bloque: enviar el menú y registrar el mensaje del bot, luego actualizar el estado a 2
  .addAction(async (ctx, ctxFn) => {
    const menuMessage = generateFAQMenu();
    // Enviar el menú FAQ
    await ctxFn.flowDynamic(menuMessage);
    // Registrar el mensaje del bot
    const conversationId = await ctxFn.state.get("conversationId");
    if (conversationId) {
      await ConversationManager.logInteraction(ctx, ctxFn.state, "assistant", menuMessage);
    } else {
      console.error("No se encontró conversationId para registrar el mensaje del bot.");
    }
    // Actualizar el estado de la conversación a 2 ("Navegando")
    await ConversationManager.updateState(ctx, ctxFn.state, 2);
  })
  // Segundo bloque: capturar la respuesta del usuario, registrar y procesar la selección
  .addAction({ capture: true }, async (ctx, { state, gotoFlow, fallBack, flowDynamic }) => {
    const userInput = ctx.body.trim().toLowerCase();
    console.log(`📥 Usuario ${ctx.from} seleccionó: ${ctx.body}`);

    // Registrar la respuesta del usuario
    const conversationId = await state.get("conversationId");
    if (conversationId) {
      await ConversationManager.logInteraction(ctx, state, "user", ctx.body);
    }

    // Construir el mapa de áreas
    const sortedAreas = [...faqItems].sort((a, b) => 0); // En este caso, el orden lo define faqItems
    let selectedFAQ;
    // Intentar interpretar el input como número
    const faqIndex = parseInt(userInput);
    if (!isNaN(faqIndex) && faqIndex > 0 && faqIndex <= faqItems.length) {
      selectedFAQ = faqItems[faqIndex - 1];
    } else {
      // Si no es un número, buscar coincidencia con las keywords de cada FAQ
      selectedFAQ = faqItems.find((faq) =>
        faq.keywords.some((keyword) => userInput.includes(keyword))
      );
    }

    if (!selectedFAQ) {
      console.log(`⚠️ No se encontró opción válida para ${ctx.from}.`);
      return gotoFlow(intentionGeneralFlow);
    }

    // Mostrar la respuesta de la FAQ seleccionada
    await flowDynamic(selectedFAQ.answer);
    // Registrar la respuesta del bot (la FAQ) en la conversación
    if (conversationId) {
      await ConversationManager.logInteraction(ctx, state, "assistant", selectedFAQ.answer);
    }

    // Redirigir según el tipo de pregunta:
    if (selectedFAQ.type === "general") {
      return gotoFlow(postFAQFlow);
    } else if (selectedFAQ.type === "area" && selectedFAQ.area) {
      await state.update({ selectedFlow: selectedFAQ.area });
      return gotoFlow(postFAQAreaFlow);
    } else {
      return fallBack("❌ No entendí tu selección. Por favor, intenta de nuevo.");
    }
  });

export { faqMenuFlow };