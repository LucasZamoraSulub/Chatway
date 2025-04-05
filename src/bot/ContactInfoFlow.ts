import { addKeyword, EVENTS } from "@builderbot/bot";
import { genericAgentFlow } from "./liveAgents/genericAgentFlow";
import { contactInfoValidationFlow } from "./contactInfoValidationFlow";
import { MetricsService } from "~/services/metricsService";
import { AreaConfigService } from "~/services/areaConfigService";
import { sendAndLogMessage } from "~/services/messageHelper";
import { ConversationManager } from "~/services/conversationManager";
import {
  detectKeywordIntents,
  detectCity,
  normalizeString,
} from "~/services/keywordIntentDetector";
import { updateContactInfoPromise } from "~/services/serviceUser";
import { citiesConfig, CityConfig } from "~/config/cities.config";

// Extraer la lista de nombres de ciudades (sin acentos, en minúsculas) desde citiesConfig
const allowedCityNames = citiesConfig.map((city) => city.name);

const contactInfoFlow = addKeyword(EVENTS.ACTION)
  // Paso 1: Pedir el correo electrónico (opcional)
  .addAction(async (ctx, ctxFn) => {
    const message =
      "✉️ Para ofrecerte una atención más personalizada, ¿podrías proporcionarme tu correo electrónico, por favor?";
    await sendAndLogMessage(ctx, ctxFn, "assistant", message);
  })
  // Paso 2: Capturar y validar el correo electrónico, y actualizarlo en BD (sin ciudad)
  .addAction({ capture: true }, async (ctx, ctxFn) => {
    const email = ctx.body.trim();
    // Registrar la respuesta del usuario
    await ConversationManager.logInteraction(ctx, ctxFn.state, "user", email);

    // Si el usuario rechaza proporcionar el correo
    const detected = detectKeywordIntents(email.toLowerCase());
    if (detected.includes("negativeResponse")) {
      await ctxFn.state.update({ email: null });
      const noEmailMsg =
        "¡Entendido! No hay problema si prefieres no compartir tu correo, continuamos con el proceso 😊.";
      await sendAndLogMessage(ctx, ctxFn, "assistant", noEmailMsg);
    } else if (email !== "") {
      // Validar formato del correo
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        const invalidMsg =
          "¡Ups! El correo ingresado no es válido. Por favor, ingresa un correo correcto o escribe 'no quiero' para omitirlo 😊.";
        await sendAndLogMessage(ctx, ctxFn, "assistant", invalidMsg);
        return ctxFn.gotoFlow(contactInfoFlow);
      }
      await ctxFn.state.update({ email });
      // Actualizar en la BD solo el correo (deja la ciudad como null)
      await updateContactInfoPromise(ctx.from, email, null);
    } else {
      await ctxFn.state.update({ email: null });
    }
    const promptCity =
      "🌍 Ahora, ¿puedes indicarme la ciudad desde donde te contactas?";
    await sendAndLogMessage(ctx, ctxFn, "assistant", promptCity);
  })
  // Paso 3: Capturar y validar la ciudad, actualizar información de contacto (correo y ciudad), obtener métricas y generar el ticket
  .addAction({ capture: true }, async (ctx, ctxFn) => {
    const inputCity = ctx.body.trim();
    // Registrar la respuesta del usuario
    await ConversationManager.logInteraction(
      ctx,
      ctxFn.state,
      "user",
      inputCity
    );

    // Utilizar detectCity (normaliza la cadena para eliminar acentos y mayúsculas)
    const detectedCityName = detectCity(inputCity, allowedCityNames);
    if (detectedCityName) {
      // Buscar el objeto de ciudad en citiesConfig
      const cityObj: CityConfig | undefined = citiesConfig.find(
        (city) =>
          normalizeString(city.name) === normalizeString(detectedCityName)
      );
      if (!cityObj) {
        const notFoundMsg = `No se encontró información para la ciudad "${inputCity}".`;
        await sendAndLogMessage(ctx, ctxFn, "assistant", notFoundMsg);
        return ctxFn.gotoFlow(contactInfoValidationFlow);
      }
      // Guardar el id de la ciudad en el state
      await ctxFn.state.update({ city: cityObj.id });
      try {
        // Obtener el email desde el state y actualizar la información completa en la BD (correo y ciudad)
        const email = await ctxFn.state.get("email");
        await updateContactInfoPromise(ctx.from, email || "", cityObj.id);
      } catch (error) {
        console.error("Error actualizando información de contacto:", error);
        await sendAndLogMessage(
          ctx,
          ctxFn,
          "assistant",
          "Hubo un error al actualizar tu información de contacto, continuamos sin actualizarla."
        );
      }
      try {
        // Obtener conversationId y la configuración del área para análisis de métricas y generación de ticket
        const conversationId = await ctxFn.state.get("conversationId");
        const selectedFlow: string = await ctxFn.state.get("selectedFlow");
        const areaConfig = AreaConfigService.getAreaConfig(selectedFlow);
        // Analizar la conversación, guardar métricas y actualizar la conversación en la BD
        const metricsId = await MetricsService.analyzeConversationAndSave(
          conversationId,
          areaConfig
        );
        await ctxFn.state.update({ metricsId });
        // Generar el ticket para la conversación
        const ticketId = await MetricsService.generateTicketForConversation(
          conversationId,
          areaConfig,
          ctx.from
        );
        await ctxFn.state.update({ ticketId });
        const successMsg =
          "Gracias, tu información ha sido registrada. Continuaremos con el proceso. 😊";
        await sendAndLogMessage(ctx, ctxFn, "assistant", successMsg);
      } catch (error) {
        console.error("Error procesando métricas y ticket:", error);
        await sendAndLogMessage(
          ctx,
          ctxFn,
          "assistant",
          "Se presentó un error al procesar tu solicitud. Continuamos sin métricas y ticket."
        );
      }
      // Actualizar el estado de la conversación a "Conversando" (estado 3)
      await ConversationManager.updateState(ctx, ctxFn.state, 4);
      // Actualizar resultado_conversacion a 1 para la opción 2
      await ConversationManager.updateResult(ctx, ctxFn.state, 1);
      return ctxFn.gotoFlow(genericAgentFlow);
    } else {
      const notAllowedMsg = `Okay, actualmente en la ciudad "${inputCity}" no tenemos cobertura para instalación en propiedad 🚫🏢.  
¿Deseas que te ofrezcamos opciones para compra de equipo y envío por paqueterías 📦?  
\n1️⃣ *Si, ver alternativas*\n2️⃣ *No, finalizar proceso*`;
      await sendAndLogMessage(ctx, ctxFn, "assistant", notAllowedMsg);
      return ctxFn.gotoFlow(contactInfoValidationFlow);
    }
  });

export { contactInfoFlow };
