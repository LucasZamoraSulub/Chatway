export interface FAQItem {
  question: string;
  type: "general" | "area";
  keywords: string[];
  answer: string;
  area?: string;
}

export const faqItems: FAQItem[] = [
  {
    question: "¿Qué servicios ofrecen?",
    type: "general",
    keywords: ["servicios", "qué ofrecen"],
    answer: `🔹 ¡Claro! En Grupo SAOM ofrecemos soluciones tecnológicas diseñadas para proteger, optimizar y mejorar tu negocio:
- 🔒 Integración de sistemas de seguridad electrónica.
- 💻 Diseño de software personalizado.
- 🏢 Consultoría en IT y tecnología.
- 🛠️ Instalación de sistemas de seguridad.
- 🛍️ Comercialización de productos de seguridad.
- 📡 Servicios de telecomunicaciones.`,
  },
  {
    question: "¿Dónde están ubicados?",
    type: "general",
    keywords: ["ubicados", "dónde están"],
    answer: `📍 Nos encontramos en Cancún, Quintana Roo, México. 
Pero no te preocupes si no estás cerca, podemos brindarte asesoría y soluciones tecnológicas a distancia. 😉`,
  },
  {
    question: "¿Cuántos años de experiencia tienen?",
    type: "general",
    keywords: ["experiencia", "años"],
    answer: `🕰️ En Grupo SAOM contamos con más de 21 años de experiencia en el sector (desde 2003).
Nuestra trayectoria nos ha permitido ayudar a muchas empresas con soluciones tecnológicas innovadoras. 🚀`,
  },
  {
    question: "¿Cómo funciona el área de Ventas?",
    type: "area",
    keywords: ["ventas", "funciona ventas", "cómo funciona ventas"],
    answer: `🛒 *Cómo funciona el área de Ventas:*
🛒 ¡Es muy sencillo!
📞 Puedes preguntarme sobre productos, precios y cotizaciones.
💳 Si deseas comprar, puedes recibir atención personalizada por un asesor o hacerlo directamente con mi ayuda.
📦 También puedo recomendarte los mejores productos según tus necesidades.\n
¿Te gustaría proceder con el área de ventas o necesitas más información?`,
    area: "VENTAS",
  },
  {
    question: "¿Cómo funciona el área de Soporte?",
    type: "area",
    keywords: ["soporte", "funciona soporte", "cómo funciona soporte"],
    answer: `🔧 *Cómo funciona el área de Soporte:*
🔧 Nuestro equipo de soporte está preparado para ayudarte a resolver cualquier problema técnico o incidencia con nuestros productos y servicios.
📞 Puedes consultarme sobre errores, configuraciones o problemas operativos, y te brindaré la información o solución necesaria.\n
¿Te gustaría proceder con el área de soporte o necesitas más información?`,
    area: "SOPORTE",
  },
  {
    question: "¿Cómo funciona el área de Central de Monitoreo?",
    type: "area",
    keywords: ["central", "monitoreo", "funciona central"],
    answer: `📹 *Cómo funciona el área de Central de Monitoreo:*
📹 Aquí te explico cómo puedes centralizar y gestionar la vigilancia de tus dispositivos de seguridad.  
🔒 Puedes consultarme sobre configuraciones, integración y opciones de monitoreo 24/7, y te proporcionaré la información necesaria.\n
¿Te gustaría proceder con el área de central de monitoreo o necesitas más información?`,
    area: "CENTRAL_MONITOREO",
  },
];
