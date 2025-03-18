export interface AreaConfig {
  // DATOS DE CONFIGURACIÓN DE ÁREAS
  area: string;
  welcomeMessage: (waitingTime: number) => string;
  waitingTime: number;
  //DATOS DE CONFIGURACIÓN DEL MENU PRINCIPAL
  menu?: {
    label: string;
    description: string;
    order: number;
  };
  //DATOS DEL AREA DENTRO DE LA CONVERSACIÓN
  conversation?: {
    conversationMessage?: string;
    promptFile: string;
    idApartamento: number;
    fallbackResponse?: string;
    postOptions: string;
    analysisPromptFile?: string;
  };
  //DATOS DEL FLUJO DE AGENTE EN VIVO
  agent?: {
    agentMessage: (waitingTime: number) => string;
    endFlowMessage: string;
  };
}

export const areasConfig: AreaConfig[] = [
  {
    area: "VENTAS",
    welcomeMessage: (waitingTime: number) =>
      `¡Genial!, Bienvenido al área de Ventas. Estoy aquí para ayudarte a encontrar la mejor solución en seguridad para tu hogar o negocio. 😃🔐📹

Puedo brindarte información rápida sobre nuestros productos, recomendarte algunas opciones según tus necesidades y explicarte nuestras áreas de cobertura y modalidades de servicio. Además, puedo ayudarte a evaluar si tu hogar o negocio cuenta con la protección necesaria y, con base en eso, ofrecerte la mejor solución *sin tiempos de espera*. 🚀

Pero si lo prefieres, te puedo transferir para hablar con un asesor en tiempo real. 📞
Ten en cuenta que el tiempo de espera aproximado es de ${waitingTime} minutos. ⏳`,
    waitingTime: 15,
    menu: {
      label: "Ventas 🛍️",
      description:
        "¿Necesitas información sobre productos, precios o cotizaciones? Estoy listo para ayudarte.",
      order: 1,
    },
    conversation: {
      conversationMessage: "¿En qué puedo ayudarte hoy?🛒",
      promptFile: "prompt_Universal.txt",
      idApartamento: 1,
      fallbackResponse: `❌ No encontré información exacta, pero puedo ayudarte a encontrar la mejor opción. ¿Qué necesitas en términos de seguridad?`,
      postOptions: "¿Deseas seguir conversando o ser atendido por un asesor? Puedo transferirte a un asesor para una cotización personalizada o para brindarte más información.\n\n1️⃣ *Seguir conversando*\n2️⃣ *Atención personalizada*",
      analysisPromptFile: "prompt_AnalisisConversacion_Ventas.txt",
    },
    agent: {
      agentMessage: (waitingTime: number) =>
        `🛍️ *¡Tu solicitud ha sido registrada!* Un asesor revisará tu caso y te contactará en aproximadamente ${waitingTime} minutos.`,
      endFlowMessage:
        "📌 *Gracias por tu interés en nuestros productos!* Fue un placer ayudarte. Si necesitas más información, aquí estaré para responderte.",
    },
  },
  {
    area: "SOPORTE",
    welcomeMessage: (waitingTime: number) =>
      `¡Genial!, Bienvenido al área de Soporte. Estoy aquí para ayudarte a resolver cualquier inconveniente o problema técnico con nuestros productos y servicios. 😃🔧💻

Puedo brindarte asistencia rápida, orientarte en la solución de incidencias y explicarte las opciones de soporte disponibles, *sin tiempos de espera*. 🚀

Pero si lo prefieres, te puedo transferir para hablar con un asesor en tiempo real. 📞
Ten en cuenta que el tiempo de espera aproximado es de ${waitingTime} minutos. ⏳`,
    waitingTime: 15,
    menu: {
      label: "Soporte 🔧",
      description:
        "Si requieres asistencia técnica o tienes problemas con nuestros productos, aquí te brindo soporte.",
      order: 2,
    },
    conversation: {
      conversationMessage: "¿En qué puedo ayudarte con soporte técnico hoy? 🔧",
      promptFile: "prompt_Soporte.txt",
      idApartamento: 3,
      fallbackResponse:
        "❌ No se encontró información exacta sobre tu problema. ¿Podrías darme más detalles?",
        postOptions: "¿Deseas seguir conversando o ser atendido por un especialista? Puedo transferirte a un experto en soporte para resolver tu problema técnico de forma rápida y efectiva.\n\n1️⃣ *Seguir conversando*\n2️⃣ *Atención personalizada*",
      analysisPromptFile: "prompt_AnalisisConversacion_Soporte.txt",
    },
    agent: {
      agentMessage: (waitingTime: number) =>
        `🔧 *¡Tu solicitud de soporte ha sido registrada!* Un especialista revisará tu caso y te contactará en aproximadamente ${waitingTime} minutos.`,
      endFlowMessage:
        "📌 *Gracias por comunicarte con nuestro soporte técnico!* Si necesitas más ayuda, aquí estaré para asistirte.",
    },
  },
  {
    area: "CENTRAL_MONITOREO",
    welcomeMessage: (waitingTime: number) =>
      `¡Genial!, Bienvenido al área de Central de Monitoreo. Estoy aquí para ayudarte a optimizar la gestión de tu sistema de seguridad. 😃📹🔒
    
Puedo brindarte información rápida sobre la configuración, integración y gestión de dispositivos, además de recomendarte opciones para centralizar la vigilancia de tu hogar o negocio, *sin tiempos de espera*. 🚀

Pero si lo prefieres, te puedo transferir para hablar con un asesor en tiempo real. 📞
Ten en cuenta que el tiempo de espera aproximado es de ${waitingTime} minutos. ⏳`,
    waitingTime: 15,
    menu: {
      label: "Central de Monitoreo 📹",
      description:
        "Si buscas información sobre la configuración y gestión de sistemas de monitoreo, este es el lugar",
      order: 3,
    },
    conversation: {
      conversationMessage: "¿En qué puedo ayudarte hoy? 📹",
      promptFile: "prompt_CentralMonitoreo.txt",
      idApartamento: 2,
      fallbackResponse:
        "❌ No se encontró información exacta sobre tu consulta de monitoreo. ¿Podrías darme más detalles?",
        postOptions: "¿Desea seguir conversando o ser atendido por un experto en Central de Monitoreo? Puedo transferirlo para asistencia personalizada en configuración o solución de inconvenientes.\n\n1️⃣ *Seguir conversando*\n2️⃣ *Atención personalizada*",
      analysisPromptFile: "prompt_AnalisisConversacion_Central.txt",
    },
    agent: {
      agentMessage: (waitingTime: number) =>
        `📹 *¡Tu solicitud para Central de Monitoreo ha sido registrada!* Un especialista se pondrá en contacto contigo en aproximadamente ${waitingTime} minutos.`,
      endFlowMessage:
        "📌 *Gracias por comunicarte con Central de Monitoreo!* Si necesitas más ayuda, aquí estaré para asistirte.",
    },
  },
];
