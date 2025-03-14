export interface IntentConfig {
  name: string;              // Nombre de la intención (por ejemplo, "VENTAS")
  keywords: string[];        // Palabras clave o frases de entrenamiento
  description?: string;      // Descripción de la intención
  flowName: string;          // Nombre del flujo al que se redirige (vacío si no aplica)
  forRouting: boolean;       // true si la intención se usa para redireccionar a un flujo
  isArea?: boolean;          // true si la intención se asocia a un área específica
}

export const intentsConfig: IntentConfig[] = [
  // Intenciones para redireccionar a flujos (usadas en el enrutamiento por IA)
  {
    name: "VENTAS",
    keywords: ["ventas", "comprar", "precio", "cotización", "oferta", "producto", "tienda"],
    description: "Preguntas sobre productos, precios o cotizaciones.",
    flowName: "selectServiceModeFlow",
    forRouting: true,
    isArea: true,
  },
  {
    name: "SOPORTE",
    keywords: ["soporte", "ayuda", "asistencia", "problema", "error", "fallo", "técnico"],
    description: "Preguntas sobre asistencia técnica o problemas con productos/servicios.",
    flowName: "selectServiceModeFlow",
    forRouting: true,
    isArea: true,
  },
  {
    name: "CENTRAL_MONITOREO",
    keywords: ["central", "monitoreo", "vigilancia", "cámaras", "configuración", "sistema de seguridad"],
    description: "Preguntas sobre sistemas de monitoreo y configuración de dispositivos.",
    flowName: "selectServiceModeFlow",
    forRouting: true,
    isArea: true,
  },
  {
    name: "FAQ_RAPIDA",
    keywords: ["faq rápida", "información rápida", "datos de la empresa"],
    description: "Preguntas rápidas sobre la empresa.",
    flowName: "faqFlow",
    forRouting: true,
  },
  {
    name: "FAQ_MENU",
    keywords: ["faq", "preguntas frecuentes", "dudas generales"],
    description: "Preguntas generales en el menú de FAQ.",
    flowName: "faqMenuFlow",
    forRouting: true,
  },
  {
    name: "MENU_PRINCIPAL",
    keywords: ["menú", "inicio", "principal"],
    description: "Solicitudes de menú o información general del bot.",
    flowName: "mainMenuFlow",
    forRouting: true,
  },
  {
    name: "SALUDO",
    keywords: ["hola", "buenos días", "buenas tardes", "saludos"],
    description: "Intención de saludo.",
    flowName: "greetingFlow",
    forRouting: true,
  },
  {
    name: "NO_DETECTED",
    keywords: [],
    description: "Mensajes que no encajan en ninguna categoría.",
    flowName: "",
    forRouting: true,
  },
  // Intenciones para detección interna (no usadas para enrutar)
  {
    name: "negativeResponse",
    keywords: ["no", "no quiero", "saltar", "prefiero no", "omitir"],
    description: "Intención negativa para rechazar dar datos.",
    flowName: "",
    forRouting: false,
  },
  {
    name: "invalidName",
    keywords: ["grosería1", "grosería2", "palabrota"],
    description: "Palabras que no se permiten en un nombre.",
    flowName: "",
    forRouting: false,
  },
  {
    name: "nameMarker",
    keywords: ["mi nombre es", "soy", "me llamo"],
    description: "Marcadores para extraer el nombre del usuario.",
    flowName: "",
    forRouting: false,
  },
];