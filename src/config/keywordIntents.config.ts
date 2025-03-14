// export interface KeywordIntent {
//     name: string;
//     keywords: string[];
//     description?: string;
//   }
  
//   export const keywordIntents: KeywordIntent[] = [
//     // Intenciones para redireccionar a flujos específicos
//     {
//       name: "SALUDO",
//       keywords: ["hola", "buenos días", "buenas tardes", "saludos"],
//       description: "Intención de saludo",
//     },
//     {
//       name: "VENTAS",
//       keywords: ["ventas", "comprar", "precio", "cotización", "oferta", "producto", "tienda"],
//       description: "Intención para preguntas sobre productos, precios o cotizaciones",
//     },
//     {
//       name: "SOPORTE",
//       keywords: ["soporte", "ayuda", "asistencia", "problema", "error", "fallo", "técnico"],
//       description: "Intención para preguntas sobre asistencia técnica o problemas con productos/servicios",
//     },
//     {
//       name: "CENTRAL_MONITOREO",
//       keywords: ["central", "monitoreo", "vigilancia", "cámaras", "configuración", "sistema de seguridad"],
//       description: "Intención para preguntas sobre sistemas de monitoreo y configuración de dispositivos",
//     },
//     {
//       name: "FAQ_RAPIDA",
//       keywords: ["faq rápida", "información rápida", "datos de la empresa"],
//       description: "Intención para preguntas rápidas sobre la empresa",
//     },
//     {
//       name: "FAQ_MENU",
//       keywords: ["faq", "preguntas frecuentes", "dudas generales"],
//       description: "Intención para preguntas generales en el menú de FAQ",
//     },
//     {
//       name: "MENU_PRINCIPAL",
//       keywords: ["menú", "inicio", "principal"],
//       description: "Intención para solicitudes de menú o información general del bot",
//     },
//     // Intenciones generales para detectar la intención del usuario
//     {
//       name: "negativeResponse",
//       keywords: ["no", "no quiero", "saltar", "prefiero no", "omitir"],
//       description: "Intención negativa para rechazar dar datos",
//     },
//     {
//       name: "invalidName",
//       keywords: ["grosería1", "grosería2", "palabrota"],
//       description: "Palabras que no se permiten en un nombre",
//     },
//     {
//       name: "nameMarker",
//       keywords: ["mi nombre es", "soy", "llamo", "me llamo"],
//       description: "Marcadores para extraer el nombre del usuario",
//     },
//   ];