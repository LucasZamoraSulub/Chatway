import { addKeyword, EVENTS } from "@builderbot/bot";
import { faqItems } from "~/config/faq.config";
import { postFAQFlow } from "./postFAQFlow";
import { postFAQAreaFlow } from "./postFAQAreaFlow";

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

export const faqMenuFlow = addKeyword(EVENTS.ACTION).addAnswer(
  generateFAQMenu(),
  { capture: true },
  async (ctx, { state, gotoFlow, fallBack, flowDynamic }) => {
    const userInput = ctx.body.trim().toLowerCase();
    console.log(`📥 Usuario ${ctx.from} seleccionó: ${ctx.body}`);

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
      return fallBack(
        "❌ Ups… parece que no entendí bien tu pregunta. Pero no te preocupes, estoy aquí para ayudarte. 😊\n" +
        "Puedes escribirme el número de la opción que deseas o hacerme una pregunta sobre nuestros servicios, ¡y con gusto te responderé al instante!"
      );
    }

    // Mostrar la respuesta de la FAQ seleccionada
    await flowDynamic(selectedFAQ.answer);

    // Redirigir según el tipo de pregunta:
    // Si es "general", se dirige a postFAQFlow.
    // Si es "area", se actualiza el estado con el área y se dirige a postFAQAreaFlow.
    if (selectedFAQ.type === "general") {
      return gotoFlow(postFAQFlow);
    } else if (selectedFAQ.type === "area" && selectedFAQ.area) {
      await state.update({ selectedFlow: selectedFAQ.area });
      return gotoFlow(postFAQAreaFlow);
    } else {
      return fallBack(
        "❌ No entendí tu selección. Por favor, intenta de nuevo."
      );
    }
  }
);
