import { addKeyword, EVENTS } from "@builderbot/bot";
import { selectServiceModeFlow } from "./selectServiceModeFlow";
import { faqMenuFlow } from "./faqMenuFlow";
import { areasConfig } from "~/config/areas.config";
import { intentionGeneralFlow } from "./intentionGeneralFlow";
import { ConversationManager } from "~/services/conversationManager";

const generateMenuMessage = (): string => {
  // Ordena las áreas según el campo 'order' definido en la subpropiedad menu
  const sortedAreas = [...areasConfig].sort(
    (a, b) => (a.menu?.order || 0) - (b.menu?.order || 0)
  );
  let menuText = "Para brindarte una mejor atención, dime con qué área necesitas comunicarte:\n\n";

  // Generar opciones para cada área usando la configuración del menú
  sortedAreas.forEach((area, index) => {
    // Asegurarse de que la propiedad 'menu' esté definida
    if (area.menu) {
      menuText += `${index + 1}. *${area.menu.label}* - ${area.menu.description}\n`;
    }
  });

  // Agregar opción para Preguntas Frecuentes
  menuText += `${sortedAreas.length + 1}. *Preguntas Frecuentes* ❓ - ¿Tienes dudas generales? Encuentra respuestas al instante.\n\n`;
  menuText += "Si no estás seguro de a qué área dirigirte, no te preocupes. 🤖✨ Puedo orientarte y encontrar la mejor opción para resolver tu duda. Solo dime el número o el nombre de la opción que deseas elegir.";
  
  return menuText;
};

const mainMenuFlow = addKeyword(EVENTS.ACTION)
  // Primer paso: enviar el mensaje del menú y registrar el mensaje del bot
  .addAction(async (ctx, ctxFn) => {
    const menuMessage = generateMenuMessage();
    // Enviar el mensaje del menú
    await ctxFn.flowDynamic(menuMessage);
    // Registrar el mensaje del bot
    const conversationId = await ctxFn.state.get("conversationId");
    if (conversationId) {
      await ConversationManager.logInteraction(ctx, ctxFn.state, "assistant", menuMessage);
    } else {
      console.error("No se encontró conversationId para registrar el mensaje del bot.");
    }
  })
  // Segundo paso: capturar y registrar la respuesta del usuario, actualizar estado y redirigir
  .addAction({ capture: true }, async (ctx, { state, gotoFlow, fallBack }) => {
    const userSelection = ctx.body.trim().toLowerCase();
    console.log(`📌 Usuario ${ctx.from} seleccionó: ${ctx.body}`);

    // Registrar la respuesta del usuario
    const conversationId = await state.get("conversationId");
    if (conversationId) {
      await ConversationManager.logInteraction(ctx, state, "user", ctx.body);
    }

    // Actualizar el estado de la conversación a 2 (por ejemplo, "Navegando")
    await ConversationManager.updateState(ctx, state, 2);

    // Construir el mapa de áreas a partir de la configuración
    const sortedAreas = [...areasConfig].sort(
      (a, b) => (a.menu?.order || 0) - (b.menu?.order || 0)
    );
    const areaMap: Record<string, string> = {};
    sortedAreas.forEach((area, index) => {
      if (area.menu) {
        const key = (index + 1).toString();
        areaMap[key] = area.area;
        areaMap[area.area.toLowerCase()] = area.area;
      }
    });
    // Agregar la opción de FAQ
    const faqKey = (sortedAreas.length + 1).toString();
    areaMap[faqKey] = "FAQ";
    areaMap["preguntas frecuentes"] = "FAQ";
    areaMap["faq"] = "FAQ";

    const selectedOption = areaMap[userSelection];
    if (!selectedOption) {
      console.log(`⚠️ No se encontró opción válida para ${ctx.from}.`);
      return gotoFlow(intentionGeneralFlow);
    }

    if (selectedOption === "FAQ") {
      console.log(`🔸 Redirigiendo a faqMenuFlow.`);
      return gotoFlow(faqMenuFlow);
    } else {
      console.log(`🔸 Redirigiendo a selectServiceModeFlow con área ${selectedOption}.`);
      await state.update({ selectedFlow: selectedOption });
      return gotoFlow(selectServiceModeFlow);
    }
  });

export { mainMenuFlow };