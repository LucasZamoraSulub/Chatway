import { createProvider, addKeyword, EVENTS, createFlow, createBot, MemoryDB } from '@builderbot/bot';
import { MetaProvider } from '@builderbot/provider-meta';
import 'dotenv/config';
import mysql from 'mysql2/promise';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import nlp from 'compromise';

const config = {
    PORT: process.env.PORT ?? 3008,
    jwtToken: process.env.JWT_TOKEN,
    numberId: process.env.NUMBER_ID,
    verifyToken: process.env.VERIFY_TOKEN,
    version: "v20.0",
    Model: process.env.MODEL,
    ApiKey: process.env.API_KEY,
    spreadsheetId: process.env.SPREADSHEET_ID,
    privateKey: process.env.PRIVATE_KEY,
    clientEmail: process.env.CLIENT_EMAIL,
    server: process.env.DB_SERVER,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    dbPort: process.env.DB_PORT,
};

const provider = createProvider(MetaProvider, {
    jwtToken: config.jwtToken,
    numberId: config.numberId,
    verifyToken: config.verifyToken,
    version: config.version,
});

const poolPromise = mysql.createPool({
    host: config.server,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

async function userExists(telefono) {
    try {
        const [rows] = await poolPromise.query("SELECT telefono FROM clientes_potenciales WHERE telefono = ?", [telefono]);
        return rows.length > 0;
    }
    catch (err) {
        console.error("Error verificando existencia de usuario:", err);
        throw err;
    }
}
async function createUser(telefono, nombre, email) {
    try {
        await poolPromise.query("INSERT INTO clientes_potenciales (telefono, nombre, email) VALUES (?, ?, ?)", [telefono, nombre, email]);
    }
    catch (err) {
        console.error("Error creando usuario:", err);
        throw err;
    }
}
async function updateUserInfo(telefono, nombre, email) {
    try {
        await poolPromise.query("UPDATE clientes_potenciales SET nombre = ?, email = ?, updated_at = NOW() WHERE telefono = ?", [nombre, email, telefono]);
    }
    catch (err) {
        console.error("Error actualizando usuario:", err);
        throw err;
    }
}
async function getUserData(telefono) {
    try {
        const [rows] = await poolPromise.query("SELECT nombre, email FROM clientes_potenciales WHERE telefono = ?", [telefono]);
        if (rows.length > 0) {
            return rows[0];
        }
        return null;
    }
    catch (err) {
        console.error("Error obteniendo datos del usuario:", err);
        throw err;
    }
}
async function getUserId(telefono) {
    try {
        const [rows] = await poolPromise.query("SELECT id_cliente FROM clientes_potenciales WHERE telefono = ?", [telefono]);
        if (rows.length > 0) {
            return rows[0].id_cliente;
        }
        return null;
    }
    catch (err) {
        console.error("Error obteniendo id del usuario:", err);
        throw err;
    }
}

class UserService {
    static async existsUser(telefono) {
        try {
            return await userExists(telefono);
        }
        catch (error) {
            console.error("UserService - existsUser error:", error);
            throw error;
        }
    }
    static async registerUser(telefono, nombre, email) {
        try {
            const exists = await userExists(telefono);
            if (!exists) {
                await createUser(telefono, nombre, email);
            }
            else {
                await updateUserInfo(telefono, nombre, email);
            }
        }
        catch (error) {
            console.error("UserService - registerUser error:", error);
            throw error;
        }
    }
    static async fetchUserData(telefono) {
        try {
            return await getUserData(telefono);
        }
        catch (error) {
            console.error("UserService - fetchUserData error:", error);
            throw error;
        }
    }
    static async fetchUserId(telefono) {
        try {
            return await getUserId(telefono);
        }
        catch (error) {
            console.error("UserService - fetchUserId error:", error);
            throw error;
        }
    }
}

const registerFlow = addKeyword(EVENTS.ACTION).addAction(async (ctx, ctxFn) => {
    console.log(`📌 Iniciando registro automático para usuario ${ctx.from}.`);
    await UserService.registerUser(ctx.from, "Desconocido", "Sin correo");
    console.log(`✅ Usuario ${ctx.from} registrado con éxito en Google Sheets.`);
    return ctxFn.gotoFlow(mainFlow);
});

class aiServices {
    static apiKey;
    openAI;
    constructor(apiKey) {
        aiServices.apiKey = apiKey;
        this.openAI = new OpenAI({
            apiKey: aiServices.apiKey,
        });
    }
    async chat(prompt, messages, options) {
        try {
            const limitedMessages = messages.slice(-3);
            const completion = await this.openAI.chat.completions.create({
                model: config.Model,
                messages: [{ role: "system", content: prompt }, ...limitedMessages],
                max_tokens: options?.max_tokens ?? 150,
                temperature: options?.temperature ?? 0.7,
            });
            const anwer = completion.choices[0].message?.content || "No response";
            return anwer;
        }
        catch (err) {
            console.error("Error al conectar con OpenAI", err);
            return "Lo siento, hubo un error al procesar tu solicitud. Por favor, intenta de nuevo.";
        }
    }
}

var aiServices$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    default: aiServices
});

const intentCache = {};
const CACHE_EXPIRATION = 5 * 60 * 1000;
const detectIntent = async (userMessage) => {
    const now = Date.now();
    if (intentCache[userMessage] &&
        now - intentCache[userMessage].timestamp < CACHE_EXPIRATION) {
        console.log("Usando intención cacheada");
        return intentCache[userMessage].intent;
    }
    try {
        const promptPath = path.join(process.cwd(), "assets/Prompts", "prompt_DetectIntention.txt");
        const promptContent = fs.readFileSync(promptPath, "utf8");
        const messages = [
            { role: "system", content: promptContent },
            { role: "user", content: userMessage }
        ];
        const ai = new aiServices(config.ApiKey);
        const response = await ai.chat("", messages, { max_tokens: 50, temperature: 0.5 });
        const intent = response.trim().toUpperCase();
        intentCache[userMessage] = { intent, timestamp: now };
        return intent;
    }
    catch (error) {
        console.error("Error en detectIntent:", error);
        return "NO_DETECTED";
    }
};

const intentsConfig = [
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

function detectKeywordIntents(input) {
    const lowerInput = input.toLowerCase();
    const detectedIntents = new Set();
    for (const intent of intentsConfig) {
        for (const keyword of intent.keywords) {
            if (lowerInput.includes(keyword.toLowerCase())) {
                detectedIntents.add(intent.name);
            }
        }
    }
    return Array.from(detectedIntents);
}

function extractName(input) {
    const trimmedInput = input.trim();
    const nameMarkerIntent = intentsConfig.find(intent => intent.name === "nameMarker");
    if (nameMarkerIntent) {
        const markers = [...nameMarkerIntent.keywords].sort((a, b) => b.length - a.length);
        const lowerInput = trimmedInput.toLowerCase();
        for (const marker of markers) {
            if (lowerInput.startsWith(marker)) {
                let nameSubstring = trimmedInput.substring(marker.length).trim();
                const words = nameSubstring.split(/\s+/).filter(word => word.length > 0);
                if (words.length > 4) {
                    nameSubstring = words.slice(0, 4).join(" ");
                }
                if (isValidName(nameSubstring)) {
                    return nameSubstring;
                }
            }
            else if (lowerInput.includes(marker)) {
                const index = lowerInput.indexOf(marker);
                let nameSubstring = trimmedInput.substring(index + marker.length).trim();
                const words = nameSubstring.split(/\s+/).filter(word => word.length > 0);
                if (words.length > 4) {
                    nameSubstring = words.slice(0, 4).join(" ");
                }
                if (isValidName(nameSubstring)) {
                    return nameSubstring;
                }
            }
        }
    }
    const directWords = trimmedInput.split(/\s+/).filter(word => word.length > 0);
    let nameDirect = trimmedInput;
    if (directWords.length > 4) {
        nameDirect = directWords.slice(0, 4).join(" ");
    }
    if (isValidName(nameDirect)) {
        return nameDirect;
    }
    const doc = nlp(trimmedInput);
    const people = doc.people().out('array');
    if (people.length > 0) {
        let extractedByCompromise = people[0];
        const compromiseWords = extractedByCompromise.split(/\s+/).filter(word => word.length > 0);
        if (compromiseWords.length > 4) {
            extractedByCompromise = compromiseWords.slice(0, 4).join(" ");
        }
        if (isValidName(extractedByCompromise)) {
            return extractedByCompromise;
        }
    }
    return null;
}
function isValidName(name) {
    const trimmedName = name.trim();
    const negativeResponseIntent = intentsConfig.find(intent => intent.name === "negativeResponse");
    if (negativeResponseIntent) {
        for (const negativeKeyword of negativeResponseIntent.keywords) {
            if (trimmedName.toLowerCase().includes(negativeKeyword.toLowerCase())) {
                return false;
            }
        }
    }
    const wordCount = trimmedName.split(/\s+/).filter(word => word.length > 0).length;
    if (wordCount > 4) {
        return false;
    }
    const nameRegex = /^[a-zA-Záéíóúüñ\s]{2,}$/;
    if (!nameRegex.test(trimmedName)) {
        return false;
    }
    const invalidNameIntent = intentsConfig.find(intent => intent.name === "invalidName");
    if (invalidNameIntent) {
        for (const banned of invalidNameIntent.keywords) {
            if (trimmedName.toLowerCase().includes(banned.toLowerCase())) {
                return false;
            }
        }
    }
    console.log(`Nombre obtenido: ${trimmedName}`);
    return true;
}

const askUserDataFlow = addKeyword(EVENTS.ACTION)
    .addAnswer("👤 Para brindarte una experiencia más personalizada, ¿podrías proporcionarme tu nombre, por favor?", { capture: true }, async (ctx, ctxFn) => {
    const respuesta = ctx.body.trim();
    const extractedName = extractName(respuesta);
    if (extractedName) {
        console.log(`📝 Usuario ${ctx.from} ingresó el nombre: ${extractedName}`);
        await ctxFn.state.update({ name: extractedName });
        await UserService.registerUser(ctx.from, extractedName, "Sin correo");
        return ctxFn.gotoFlow(intermediaryFlow);
    }
    const lowerRespuesta = respuesta.toLowerCase();
    const detected = detectKeywordIntents(lowerRespuesta);
    if (detected.includes("negativeResponse")) {
        await ctxFn.state.update({ skipRegistration: true });
        console.log(`🔹 Usuario ${ctx.from} optó por no compartir sus datos.`);
        return ctxFn.gotoFlow(intermediaryFlow);
    }
    return ctxFn.fallBack("😕 No pude identificar un nombre válido. Por favor, intenta de nuevo ingresando solo tu nombre o responde 'no' si prefieres no compartirlo.");
});

const areasConfig = [
    {
        area: "VENTAS",
        welcomeMessage: (waitingTime) => `¡Genial!, Bienvenido al área de Ventas. Estoy aquí para ayudarte a encontrar la mejor solución en seguridad para tu hogar o negocio. 😃🔐📹

Puedo brindarte información rápida sobre nuestros productos, recomendarte algunas opciones según tus necesidades y explicarte nuestras áreas de cobertura y modalidades de servicio. Además, puedo ayudarte a evaluar si tu hogar o negocio cuenta con la protección necesaria y, con base en eso, ofrecerte la mejor solución *sin tiempos de espera*. 🚀

Pero si lo prefieres, te puedo transferir para hablar con un asesor en tiempo real. 📞
Ten en cuenta que el tiempo de espera aproximado es de ${waitingTime} minutos. ⏳`,
        waitingTime: 15,
        menu: {
            label: "Ventas 🛍️",
            description: "¿Necesitas información sobre productos, precios o cotizaciones? Estoy listo para ayudarte.",
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
            agentMessage: (waitingTime) => `🛍️ *¡Tu solicitud ha sido registrada!* Un asesor revisará tu caso y te contactará en aproximadamente ${waitingTime} minutos.`,
            endFlowMessage: "📌 *Gracias por tu interés en nuestros productos!* Fue un placer ayudarte. Si necesitas más información, aquí estaré para responderte.",
        },
    },
    {
        area: "SOPORTE",
        welcomeMessage: (waitingTime) => `¡Genial!, Bienvenido al área de Soporte. Estoy aquí para ayudarte a resolver cualquier inconveniente o problema técnico con nuestros productos y servicios. 😃🔧💻

Puedo brindarte asistencia rápida, orientarte en la solución de incidencias y explicarte las opciones de soporte disponibles, *sin tiempos de espera*. 🚀

Pero si lo prefieres, te puedo transferir para hablar con un asesor en tiempo real. 📞
Ten en cuenta que el tiempo de espera aproximado es de ${waitingTime} minutos. ⏳`,
        waitingTime: 15,
        menu: {
            label: "Soporte 🔧",
            description: "Si requieres asistencia técnica o tienes problemas con nuestros productos, aquí te brindo soporte.",
            order: 2,
        },
        conversation: {
            conversationMessage: "¿En qué puedo ayudarte con soporte técnico hoy? 🔧",
            promptFile: "prompt_Soporte.txt",
            idApartamento: 3,
            fallbackResponse: "❌ No se encontró información exacta sobre tu problema. ¿Podrías darme más detalles?",
            postOptions: "¿Deseas seguir conversando o ser atendido por un especialista? Puedo transferirte a un experto en soporte para resolver tu problema técnico de forma rápida y efectiva.\n\n1️⃣ *Seguir conversando*\n2️⃣ *Atención personalizada*",
            analysisPromptFile: "prompt_AnalisisConversacion_Soporte.txt",
        },
        agent: {
            agentMessage: (waitingTime) => `🔧 *¡Tu solicitud de soporte ha sido registrada!* Un especialista revisará tu caso y te contactará en aproximadamente ${waitingTime} minutos.`,
            endFlowMessage: "📌 *Gracias por comunicarte con nuestro soporte técnico!* Si necesitas más ayuda, aquí estaré para asistirte.",
        },
    },
    {
        area: "CENTRAL_MONITOREO",
        welcomeMessage: (waitingTime) => `¡Genial!, Bienvenido al área de Central de Monitoreo. Estoy aquí para ayudarte a optimizar la gestión de tu sistema de seguridad. 😃📹🔒
    
Puedo brindarte información rápida sobre la configuración, integración y gestión de dispositivos, además de recomendarte opciones para centralizar la vigilancia de tu hogar o negocio, *sin tiempos de espera*. 🚀

Pero si lo prefieres, te puedo transferir para hablar con un asesor en tiempo real. 📞
Ten en cuenta que el tiempo de espera aproximado es de ${waitingTime} minutos. ⏳`,
        waitingTime: 15,
        menu: {
            label: "Central de Monitoreo 📹",
            description: "Si buscas información sobre la configuración y gestión de sistemas de monitoreo, este es el lugar",
            order: 3,
        },
        conversation: {
            conversationMessage: "¿En qué puedo ayudarte hoy? 📹",
            promptFile: "prompt_CentralMonitoreo.txt",
            idApartamento: 2,
            fallbackResponse: "❌ No se encontró información exacta sobre tu consulta de monitoreo. ¿Podrías darme más detalles?",
            postOptions: "¿Desea seguir conversando o ser atendido por un experto en Central de Monitoreo? Puedo transferirlo para asistencia personalizada en configuración o solución de inconvenientes.\n\n1️⃣ *Seguir conversando*\n2️⃣ *Atención personalizada*",
            analysisPromptFile: "prompt_AnalisisConversacion_Central.txt",
        },
        agent: {
            agentMessage: (waitingTime) => `📹 *¡Tu solicitud para Central de Monitoreo ha sido registrada!* Un especialista se pondrá en contacto contigo en aproximadamente ${waitingTime} minutos.`,
            endFlowMessage: "📌 *Gracias por comunicarte con Central de Monitoreo!* Si necesitas más ayuda, aquí estaré para asistirte.",
        },
    },
];

async function createConversation(idCliente) {
    try {
        const [result] = await poolPromise.query("INSERT INTO conversacion (id_cliente) VALUES (?)", [idCliente]);
        return result.insertId;
    }
    catch (error) {
        console.error("Error creando conversación:", error);
        throw error;
    }
}
async function updateConversationStatus(idConversacion, estado) {
    try {
        await poolPromise.query("UPDATE conversacion SET estado = ?, fecha_fin = NOW() WHERE id_conversacion = ?", [estado, idConversacion]);
    }
    catch (error) {
        console.error("Error actualizando estado de conversación:", error);
        throw error;
    }
}
async function addConversationMessage(idConversacion, mensajeUsuario, respuesta, options) {
    try {
        let finalIdUsuario = options?.idUsuario;
        if (!finalIdUsuario) {
            if (!options?.idApartamento) {
                throw new Error("idApartamento es requerido para determinar el id del bot por defecto.");
            }
            const [rows] = await poolPromise.query("SELECT id_usuario FROM usuarios WHERE id_rol = 1 AND id_apartamento = ? LIMIT 1", [options.idApartamento]);
            if (rows.length === 0) {
                throw new Error("No se encontró un bot asignado para el área especificada.");
            }
            finalIdUsuario = rows[0].id_usuario;
        }
        await poolPromise.query("INSERT INTO mensajes (id_conversacion, mensaje_usuario, respuesta, id_usuario, fecha_envio, fecha_respuesta) VALUES (?, ?, ?, ?, NOW(), NOW())", [idConversacion, mensajeUsuario, respuesta, finalIdUsuario]);
    }
    catch (error) {
        console.error("Error insertando mensaje de conversación:", error);
        throw error;
    }
}
async function getLastMessages(idConversacion, limit = 3) {
    try {
        const [rows] = await poolPromise.query("SELECT mensaje_usuario, respuesta, fecha_envio, fecha_respuesta FROM mensajes WHERE id_conversacion = ? ORDER BY fecha_envio DESC LIMIT ?", [idConversacion, limit]);
        return rows.reverse();
    }
    catch (error) {
        console.error("Error obteniendo mensajes:", error);
        throw error;
    }
}
async function getAllMessages(idConversacion) {
    try {
        const [rows] = await poolPromise.query("SELECT mensaje_usuario, respuesta, fecha_envio, fecha_respuesta FROM mensajes WHERE id_conversacion = ? ORDER BY fecha_envio ASC", [idConversacion]);
        return rows;
    }
    catch (error) {
        console.error("Error obteniendo todos los mensajes:", error);
        throw error;
    }
}
async function getBotForArea(idApartamento) {
    try {
        const [rows] = await poolPromise.query("SELECT id_usuario FROM usuarios WHERE id_rol = 1 AND id_apartamento = ? LIMIT 1", [idApartamento]);
        if (rows.length === 0) {
            throw new Error("No se encontró un bot asignado para el área especificada.");
        }
        return rows[0].id_usuario;
    }
    catch (error) {
        console.error("Error en getBotForArea:", error);
        throw error;
    }
}

class ConversationService {
    static async startConversation(idCliente) {
        try {
            const conversationId = await createConversation(idCliente);
            return conversationId;
        }
        catch (error) {
            console.error("ConversationService - startConversation error:", error);
            throw error;
        }
    }
    static async recordMessage(conversationId, mensajeUsuario, respuesta, options) {
        try {
            await addConversationMessage(conversationId, mensajeUsuario, respuesta, options);
        }
        catch (error) {
            console.error("ConversationService - recordMessage error:", error);
            throw error;
        }
    }
    static async getContext(conversationId, limit = 3) {
        try {
            const contextRows = await getLastMessages(conversationId, limit);
            const formattedContext = contextRows.reduce((acc, row) => {
                if (row.mensaje_usuario) {
                    acc.push({ role: "user", content: row.mensaje_usuario });
                }
                if (row.respuesta) {
                    acc.push({ role: "assistant", content: row.respuesta });
                }
                return acc;
            }, []);
            return formattedContext;
        }
        catch (error) {
            console.error("ConversationService - getContext error:", error);
            throw error;
        }
    }
    static async closeConversation(conversationId) {
        try {
            await updateConversationStatus(conversationId, "finalizada");
        }
        catch (error) {
            console.error("ConversationService - closeConversation error:", error);
            throw error;
        }
    }
    static async getAllMessages(conversationId) {
        try {
            const messages = await getAllMessages(conversationId);
            return messages;
        }
        catch (error) {
            console.error("ConversationService - getAllMessages error:", error);
            throw error;
        }
    }
    static async getBotForArea(idApartamento) {
        try {
            const idUsuario = await getBotForArea(idApartamento);
            return idUsuario;
        }
        catch (error) {
            console.error("UserService - getBotForArea error:", error);
            throw error;
        }
    }
}

const genericAgentFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, ctxFn) => {
    console.log(`🛠️ Usuario ${ctx.from} ha ingresado al flujo genérico de atención personalizada.`);
    const selectedFlow = await ctxFn.state.get("selectedFlow");
    const areaConfig = areasConfig.find((area) => area.area === selectedFlow);
    if (!areaConfig || !areaConfig.agent) {
        console.error(`⚠️ No se encontró configuración de agente para el área ${selectedFlow}`);
        return ctxFn.endFlow("No se encontró configuración para atención personalizada. Vuelve al menú principal.");
    }
    const message = areaConfig.agent.agentMessage(areaConfig.waitingTime);
    await ctxFn.flowDynamic(message);
})
    .addAction(async (ctx, { endFlow, state }) => {
    const selectedFlow = await state.get("selectedFlow");
    const areaConfig = areasConfig.find((area) => area.area === selectedFlow);
    if (!areaConfig || !areaConfig.agent) {
        return endFlow("Atención personalizada finalizada.");
    }
    console.log(`✅ Conversación finalizada después de atención personalizada en ${selectedFlow}.`);
    return endFlow(areaConfig.agent.endFlowMessage);
});

async function createTicketMetrics(idConversacion, resumen, nivelInteres, nivelConocimiento, productosServiciosMencionados) {
    try {
        const [result] = await poolPromise.query("INSERT INTO ticket_metrics (id_conversacion, resumen, nivel_interes, nivel_conocimiento, productos_servicios_mencionados) VALUES (?, ?, ?, ?, ?)", [idConversacion, resumen, nivelInteres || null, nivelConocimiento || null, productosServiciosMencionados || null]);
        return result.insertId;
    }
    catch (error) {
        console.error("Error creando métricas del ticket:", error);
        throw error;
    }
}
async function createTicketNote(contenido) {
    try {
        const [result] = await poolPromise.query("INSERT INTO ticket_notes (contenido) VALUES (?)", [contenido]);
        return result.insertId;
    }
    catch (error) {
        console.error("Error creando nota de ticket:", error);
        throw error;
    }
}
async function createTicket(idConversacion, idCliente, idUsuario, idApartamento, idMetricas, idNota) {
    try {
        const [result] = await poolPromise.query(`INSERT INTO tickets 
       (id_conversacion, id_cliente, id_usuario, id_apartamento, id_metricas, id_nota, estado_ticket, fecha_creacion, fecha_actualizacion)
       VALUES (?, ?, ?, ?, ?, ?, 'abierto', NOW(), NOW())`, [idConversacion, idCliente, idUsuario, idApartamento, idMetricas || null, idNota || null]);
        return result.insertId;
    }
    catch (error) {
        console.error("Error creando ticket:", error);
        throw error;
    }
}
async function updateTicketStatus(idTicket, nuevoEstado) {
    try {
        await poolPromise.query("UPDATE tickets SET estado_ticket = ?, fecha_actualizacion = NOW() WHERE id_ticket = ?", [nuevoEstado, idTicket]);
    }
    catch (error) {
        console.error("Error actualizando estado de ticket:", error);
        throw error;
    }
}

class TicketService {
    static async generateTicket(params) {
        try {
            let idMetricas;
            let idNota;
            if (params.resumenMetricas) {
                idMetricas = await createTicketMetrics(params.idConversacion, params.resumenMetricas, params.nivelInteres, params.nivelConocimiento, params.productosServiciosMencionados);
            }
            if (params.notaAdicional) {
                idNota = await createTicketNote(params.notaAdicional);
            }
            const ticketId = await createTicket(params.idConversacion, params.idCliente, params.idUsuario, params.idApartamento, idMetricas, idNota);
            return ticketId;
        }
        catch (error) {
            console.error("TicketService - generateTicket error:", error);
            throw error;
        }
    }
    static async changeTicketStatus(idTicket, nuevoEstado) {
        try {
            await updateTicketStatus(idTicket, nuevoEstado);
        }
        catch (error) {
            console.error("TicketService - changeTicketStatus error:", error);
            throw error;
        }
    }
}

async function analyzeConversation(ctxFn, areaConfig) {
    const conversationId = await ctxFn.state.get("conversationId");
    if (!conversationId) {
        console.log("❌ No se encontró una conversación activa en la BD.");
        return "No se pudo analizar la conversación debido a datos insuficientes.";
    }
    const history = await ConversationService.getAllMessages(conversationId);
    if (!history || history.length === 0) {
        console.log("❌ No se puede analizar la conversación. No hay mensajes disponibles.");
        return "No se pudo analizar la conversación debido a datos insuficientes.";
    }
    const formattedHistory = history.reduce((acc, row) => {
        if (row.mensaje_usuario) {
            acc.push({ role: "user", content: row.mensaje_usuario });
        }
        if (row.respuesta) {
            acc.push({ role: "assistant", content: row.respuesta });
        }
        return acc;
    }, []);
    console.log("📊 CONTEXTO OBTENIDO DE LA BD:");
    console.log(formattedHistory.map((msg) => `${msg.role}: ${msg.content}`).join("\n"));
    let promptFile = "prompt_AnalisisConversacion.txt";
    if (areaConfig.conversation && areaConfig.conversation.analysisPromptFile) {
        promptFile = areaConfig.conversation.analysisPromptFile;
    }
    const pathPromptAnalisis = path.join(process.cwd(), "assets/Prompts/metrics_areas", promptFile);
    const promptAnalisis = fs.readFileSync(pathPromptAnalisis, "utf8");
    const AI = new (await Promise.resolve().then(function () { return aiServices$1; })).default(config.ApiKey);
    const analysisResult = await AI.chat(promptAnalisis, formattedHistory);
    console.log("📊 RESULTADO DEL ANÁLISIS:", analysisResult);
    return analysisResult;
}
const postAreaFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, ctxFn) => {
    const selectedFlow = await ctxFn.state.get("selectedFlow");
    const areaConfig = areasConfig.find((area) => area.area === selectedFlow);
    if (!areaConfig || !areaConfig.conversation) {
        console.log(`⚠️ No se encontró configuración para el área ${selectedFlow}.`);
        return ctxFn.endFlow("Área no reconocida. Vuelve al menú principal.");
    }
    await ctxFn.flowDynamic(areaConfig.conversation.postOptions);
})
    .addAction({ capture: true }, async (ctx, ctxFn) => {
    const respuesta = ctx.body.toLowerCase().trim();
    console.log(`📥 Usuario ${ctx.from} respondió: ${respuesta}`);
    const selectedFlow = await ctxFn.state.get("selectedFlow");
    const areaConfig = areasConfig.find((area) => area.area === selectedFlow);
    if (!areaConfig || !areaConfig.conversation) {
        console.log(`⚠️ No se encontró configuración para el área ${selectedFlow}.`);
        return ctxFn.endFlow("Área no reconocida. Vuelve al menú principal.");
    }
    if (respuesta.includes("1") || respuesta.includes("seguir")) {
        console.log(`🔄 Usuario ${ctx.from} optó por seguir conversando en el área ${selectedFlow}.`);
        return ctxFn.gotoFlow(genericAreaFlow);
    }
    if (respuesta.includes("2") ||
        respuesta.includes("atención") ||
        respuesta.includes("cotizar")) {
        console.log(`📊 Procesando solicitud de atención personalizada en el área ${selectedFlow}...`);
        const analysisResult = await analyzeConversation(ctxFn, areaConfig);
        console.log("📊 Resumen generado:", analysisResult);
        let parsedAnalysis;
        try {
            parsedAnalysis = JSON.parse(analysisResult);
        }
        catch (error) {
            console.error("Error parseando el resultado del análisis:", error);
            parsedAnalysis = {
                nivel_conocimiento: "",
                probabilidad_compra: "",
                productos_mencionados: [],
                resumen_intencion: analysisResult,
            };
        }
        const resumenMetricas = parsedAnalysis.resumen_intencion;
        const nivelInteres = parsedAnalysis.probabilidad_compra;
        const nivelConocimiento = parsedAnalysis.nivel_conocimiento;
        const productosServiciosMencionados = (parsedAnalysis.productos_mencionados || []).join(", ");
        const conversationId = await ctxFn.state.get("conversationId");
        if (!conversationId) {
            console.error("❌ No se encontró conversationId para generar el ticket.");
            return ctxFn.endFlow("Error al generar el ticket. Intenta de nuevo.");
        }
        const idCliente = await UserService.fetchUserId(ctx.from);
        if (!idCliente) {
            console.error(`❌ No se encontró cliente para el número ${ctx.from}.`);
            return ctxFn.endFlow("Error al generar el ticket: cliente no registrado.");
        }
        const idApartamento = areaConfig.conversation.idApartamento;
        let idUsuario;
        try {
            idUsuario = await ConversationService.getBotForArea(idApartamento);
        }
        catch (error) {
            console.error("Error obteniendo idUsuario desde UserService:", error);
            return ctxFn.endFlow("Error al asignar agente para el ticket.");
        }
        try {
            const ticketId = await TicketService.generateTicket({
                idConversacion: conversationId,
                idCliente,
                idUsuario,
                idApartamento,
                resumenMetricas,
                nivelInteres,
                nivelConocimiento,
                productosServiciosMencionados
            });
            console.log(`✅ Ticket generado con ID: ${ticketId}`);
        }
        catch (error) {
            console.error("Error generando ticket:", error);
            return ctxFn.endFlow("Error al generar el ticket. Intenta de nuevo.");
        }
        await ConversationService.closeConversation(conversationId);
        await ctxFn.state.update({ conversationId: null, hasSeenWelcome: false });
        return ctxFn.gotoFlow(genericAgentFlow);
    }
    console.log(`ℹ️ Respuesta directa no categorizada. Guardando mensaje y enviando a flujo genérico de área.`);
    await ctxFn.state.update({ pendingInput: respuesta });
    return ctxFn.gotoFlow(genericAreaFlow);
});

async function processUserInput(userInput, ctx, ctxFn) {
    const selectedFlow = await ctxFn.state.get("selectedFlow");
    console.log(`📥 Procesando consulta en ${selectedFlow}: ${userInput}`);
    const conversationId = await ctxFn.state.get("conversationId");
    const history = (await ConversationService.getContext(conversationId, 3)) || [];
    history.push({ role: "user", content: userInput });
    console.log("🤖 Contexto enviado a IA:", history);
    const areaConfig = areasConfig.find((area) => area.area === selectedFlow);
    if (!areaConfig || !areaConfig.conversation) {
        console.error(`❌ No se encontró configuración para el área ${selectedFlow}.`);
        return ctxFn.endFlow("Área no reconocida. Vuelve al menú principal.");
    }
    const promptPath = path.join(process.cwd(), "assets/Prompts/areas", areaConfig.conversation.promptFile);
    const promptContent = fs.readFileSync(promptPath, "utf8");
    const AI = new aiServices(config.ApiKey);
    let response = await AI.chat(promptContent, history);
    if (!response || response.includes("No encontré información")) {
        response =
            areaConfig.conversation.fallbackResponse ||
                "❌ No se encontró información exacta. ¿Podrías darme más detalles?";
    }
    console.log(`🤖 Respuesta de IA para ${selectedFlow}: ${response}`);
    await ConversationService.recordMessage(conversationId, userInput, response, { idApartamento: areaConfig.conversation.idApartamento });
    await ctxFn.flowDynamic(response);
    return ctxFn.gotoFlow(postAreaFlow);
}
const genericAreaFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, ctxFn) => {
    console.log(`📌 Usuario ${ctx.from} ingresó al flujo genérico de área.`);
    const selectedFlow = await ctxFn.state.get("selectedFlow");
    if (!selectedFlow) {
        console.error(`❌ No se encontró área seleccionada para ${ctx.from}.`);
        return ctxFn.endFlow("No se detectó una selección de área. Vuelve al menú principal.");
    }
    const areaConfig = areasConfig.find((area) => area.area === selectedFlow);
    if (!areaConfig || !areaConfig.conversation) {
        console.error(`❌ No se encontró configuración para el área ${selectedFlow}.`);
        return ctxFn.endFlow("Área no reconocida. Vuelve a intentarlo desde el menú principal.");
    }
    let conversationId = await ctxFn.state.get("conversationId");
    if (!conversationId) {
        const idCliente = await UserService.fetchUserId(ctx.from);
        if (!idCliente) {
            console.error(`❌ No se encontró un cliente con el número ${ctx.from}.`);
            return ctxFn.endFlow("No se pudo iniciar la conversación: cliente no registrado.");
        }
        conversationId = await ConversationService.startConversation(idCliente);
        await ctxFn.state.update({ conversationId });
        console.log(`Nueva conversación creada en BD con ID: ${conversationId}`);
    }
    const hasSeenWelcome = await ctxFn.state.get("hasSeenWelcome");
    if (!hasSeenWelcome) {
        await ctxFn.state.update({ hasSeenWelcome: true });
        const conversationMessage = areaConfig.conversation.conversationMessage;
        const userName = (await ctxFn.state.get("name")) || "";
        const welcomeMessage = (userName && userName !== "Desconocido")
            ? `¡Bienvenido ${userName}! ${conversationMessage}`
            : conversationMessage;
        await ctxFn.flowDynamic(welcomeMessage);
    }
    const pendingInput = await ctxFn.state.get("pendingInput");
    if (pendingInput && pendingInput.trim() !== "") {
        await ctxFn.state.update({ pendingInput: null });
        return processUserInput(pendingInput, ctx, ctxFn);
    }
})
    .addAction({ capture: true }, async (ctx, ctxFn) => {
    let userInput = ctx.body?.toLowerCase().trim();
    if (!userInput || userInput === "") {
        userInput = await ctxFn.state.get("pendingInput");
        await ctxFn.state.update({ pendingInput: null });
    }
    return processUserInput(userInput, ctx, ctxFn);
});

const intermediaryFlow = addKeyword(EVENTS.ACTION).addAction(async (ctx, ctxFn) => {
    const selectedFlow = await ctxFn.state.get("selectedFlow");
    if (!selectedFlow) {
        console.log(`⚠️ No se encontró área seleccionada para ${ctx.from}.`);
        return ctxFn.endFlow("❌ No se detectó una selección de área. Vuelve al menú principal.");
    }
    console.log(`✅ Área seleccionada por el usuario: ${selectedFlow}`);
    const userData = await UserService.fetchUserData(ctx.from);
    console.log(`📌 Datos actuales del usuario ${ctx.from}:`, userData);
    const skipRegistration = await ctxFn.state.get("skipRegistration");
    if ((userData.nombre === "Desconocido") && !skipRegistration) {
        console.log(`🔹 Datos predefinidos detectados para ${ctx.from}. Redirigiendo a askUserDataFlow.`);
        return ctxFn.gotoFlow(askUserDataFlow);
    }
    else {
        await ctxFn.state.update({ name: userData.nombre });
        console.log(`📝 Usuario ${ctx.from} ingresó el nombre: ${userData.nombre}`);
    }
    console.log(`✅ Datos reales confirmados para ${ctx.from}.`);
    const areaConfig = areasConfig.find((area) => area.area === selectedFlow);
    if (!areaConfig) {
        console.log(`⚠️ No se encontró configuración para el área ${selectedFlow}.`);
        return ctxFn.endFlow("❌ Área no reconocida. Vuelve a intentarlo desde el menú principal.");
    }
    console.log(`✅ Redirigiendo al flujo de atención vía bot: ${selectedFlow}.`);
    return ctxFn.gotoFlow(genericAreaFlow);
});

const selectServiceModeFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, ctxFn) => {
    const selectedFlow = await ctxFn.state.get("selectedFlow");
    const config = areasConfig.find((area) => area.area === selectedFlow);
    if (!selectedFlow) {
        console.log(`⚠️ No se encontró un área válida para ${ctx.from}.`);
        return ctxFn.gotoFlow(mainMenuFlow);
    }
    if (!config) {
        console.log(`⚠️ No se encontró configuración para el área ${selectedFlow}.`);
        return ctxFn.gotoFlow(mainMenuFlow);
    }
    const areaMessage = config.welcomeMessage(config.waitingTime);
    await ctxFn.flowDynamic(areaMessage);
    const optionsMessage = "\n1️⃣ *Seguir con mi ayuda y obtener información ahora mismo.* 🤖\n" +
        "2️⃣ *Hablar con un asesor y esperar su respuesta.* 👨";
    await ctxFn.flowDynamic(optionsMessage);
})
    .addAction({ capture: true }, async (ctx, ctxFn) => {
    const userChoice = ctx.body.toLowerCase().trim();
    const selectedFlow = await ctxFn.state.get("selectedFlow");
    if (!selectedFlow) {
        console.log(`⚠️ No se encontró un área válida para ${ctx.from}.`);
        return ctxFn.gotoFlow(mainMenuFlow);
    }
    const config = areasConfig.find((area) => area.area === selectedFlow);
    if (!config) {
        console.log(`⚠️ No se encontró configuración para el área ${selectedFlow}.`);
        return ctxFn.gotoFlow(mainMenuFlow);
    }
    if (userChoice.includes("1") || userChoice.includes("bot")) {
        console.log(`🤖 Usuario ${ctx.from} optó por atención vía bot en ${selectedFlow}.`);
        return ctxFn.gotoFlow(intermediaryFlow);
    }
    if (userChoice.includes("2") || userChoice.includes("agente")) {
        console.log(`📞 Usuario ${ctx.from} optó por ser atendido por un agente en ${selectedFlow}.`);
        return ctxFn.gotoFlow(genericAgentFlow);
    }
    console.log(`⚠️ Usuario ${ctx.from} ingresó una opción no válida.`);
    return ctxFn.fallBack("❌ Opción no válida. Por favor, responde con *1️⃣ Por el bot* o *2️⃣ Por un agente*.");
});

const faqItems = [
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

const postFAQFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, ctxFn) => {
    let message = "¿Tienes alguna otra duda o pregunta? 😊\n" +
        "Recuerda que conmigo puedes obtener respuestas rápidas sin necesidad de esperar.";
    message += "\n" + "1️⃣ *Seguir preguntando* ✅\n" + "2️⃣ *No tengo dudas* ❌";
    await ctxFn.flowDynamic(message);
})
    .addAction({ capture: true }, async (ctx, ctxFn) => {
    const userInput = ctx.body.toLowerCase().trim();
    if (userInput.includes("1") ||
        userInput.includes("sí") ||
        userInput.includes("si")) {
        console.log(`📌 Usuario ${ctx.from} quiere seguir preguntando.`);
        return ctxFn.gotoFlow(faqMenuFlow);
    }
    if (userInput.includes("2") ||
        userInput.includes("no") ||
        userInput.includes("❌")) {
        console.log(`📌 Usuario ${ctx.from} no necesita más ayuda. Finalizando conversación.`);
        await ctxFn.flowDynamic("✅ ¡Gracias por tu tiempo! 😊\n" +
            "Espero haber resuelto tus dudas. Recuerda que estoy aquí para ayudarte en cualquier momento, sin esperas y con respuestas rápidas. ¡Vuelve cuando lo necesites! 🌟");
        return ctxFn.endFlow();
    }
    return ctxFn.flowDynamic("❌ Mmm… parece que hubo un pequeño error y no pude entender tu respuesta. No te preocupes, estoy aquí para ayudarte. 😉\n" +
        "Intenta de nuevo escribiendo el número de la opción o formulando tu pregunta de otra manera, ¡y te responderé al instante!");
});

const postFAQAreaFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, ctxFn) => {
    let message = "🤖 Ahora que conoces cómo funciona esta área, ¿quieres proceder con este proceso o prefieres hacer otra pregunta?\n" +
        "Recuerda que conmigo puedes obtener respuestas rápidas y sin tiempos de espera. Estoy aquí para ayudarte. 😉";
    message += "\n" +
        "1️⃣ *Proceder* 🤖\n" +
        "2️⃣ *Seguir preguntando* 📚";
    await ctxFn.flowDynamic(message);
})
    .addAction({ capture: true }, async (ctx, ctxFn) => {
    const userInput = ctx.body.trim().toLowerCase();
    console.log(`📥 Usuario ${ctx.from} seleccionó: ${ctx.body}`);
    const selectedFlow = await ctxFn.state.get("selectedFlow");
    if (!selectedFlow) {
        console.log(`⚠️ No se encontró área seleccionada para ${ctx.from}.`);
        return ctxFn.flowDynamic("❌ Parece que hubo un pequeño problema y no pude procesar tu elección. No te preocupes, intentémoslo de nuevo. 😊\n" +
            "Solo dime el número o el nombre de la opción que deseas y te guiaré al instante.");
    }
    if (userInput.includes("1") || userInput.includes("proceder") || userInput.includes("continuar")) {
        console.log(`📌 Usuario ${ctx.from} quiere continuar en el área de ${selectedFlow}. Redirigiendo a selectServiceModeFlow.`);
        return ctxFn.gotoFlow(selectServiceModeFlow);
    }
    if (userInput.includes("2") || userInput.includes("preguntas") || userInput.includes("faq") || userInput.includes("seguir")) {
        console.log(`📌 Usuario ${ctx.from} quiere seguir preguntando.`);
        return ctxFn.gotoFlow(faqMenuFlow);
    }
    console.log(`⚠️ Usuario ${ctx.from} ingresó una opción no válida.`);
    return ctxFn.fallBack("❌ Mmm… no logré entender tu respuesta. Intenta de nuevo eligiendo una de las opciones disponibles:\n" +
        "1️⃣ *Proceder* 🤖\n" +
        "2️⃣ *Seguir preguntando* 📚\n" +
        "Si necesitas ayuda, dime y con gusto te guiaré. 😉");
});

const generateFAQMenu = () => {
    let menuText = "📌 *Preguntas Frecuentes (FAQ)*\n" +
        "Encuentra respuestas rápidas a las dudas más comunes sin necesidad de esperar. 😉\n";
    faqItems.forEach((faq, index) => {
        menuText += `${index + 1}. ${faq.question}\n`;
    });
    menuText +=
        "\n✍️ Escribe el número o el texto de la opción que deseas saber, y te responderé al instante.";
    return menuText;
};
const faqMenuFlow = addKeyword(EVENTS.ACTION).addAnswer(generateFAQMenu(), { capture: true }, async (ctx, { state, gotoFlow, fallBack, flowDynamic }) => {
    const userInput = ctx.body.trim().toLowerCase();
    console.log(`📥 Usuario ${ctx.from} seleccionó: ${ctx.body}`);
    let selectedFAQ;
    const faqIndex = parseInt(userInput);
    if (!isNaN(faqIndex) && faqIndex > 0 && faqIndex <= faqItems.length) {
        selectedFAQ = faqItems[faqIndex - 1];
    }
    else {
        selectedFAQ = faqItems.find((faq) => faq.keywords.some((keyword) => userInput.includes(keyword)));
    }
    if (!selectedFAQ) {
        console.log(`⚠️ No se encontró opción válida para ${ctx.from}.`);
        return fallBack("❌ Ups… parece que no entendí bien tu pregunta. Pero no te preocupes, estoy aquí para ayudarte. 😊\n" +
            "Puedes escribirme el número de la opción que deseas o hacerme una pregunta sobre nuestros servicios, ¡y con gusto te responderé al instante!");
    }
    await flowDynamic(selectedFAQ.answer);
    if (selectedFAQ.type === "general") {
        return gotoFlow(postFAQFlow);
    }
    else if (selectedFAQ.type === "area" && selectedFAQ.area) {
        await state.update({ selectedFlow: selectedFAQ.area });
        return gotoFlow(postFAQAreaFlow);
    }
    else {
        return fallBack("❌ No entendí tu selección. Por favor, intenta de nuevo.");
    }
});

const generateMenuMessage = () => {
    const sortedAreas = [...areasConfig].sort((a, b) => (a.menu?.order || 0) - (b.menu?.order || 0));
    let menuText = "Para brindarte una mejor atención, dime con qué área necesitas comunicarte:\n\n";
    sortedAreas.forEach((area, index) => {
        if (area.menu) {
            menuText += `${index + 1}. *${area.menu.label}* - ${area.menu.description}\n`;
        }
    });
    menuText += `${sortedAreas.length + 1}. *Preguntas Frecuentes* ❓ - ¿Tienes dudas generales? Encuentra respuestas al instante.\n\n`;
    menuText += "Si no estás seguro de a qué área dirigirte, no te preocupes. 🤖✨ Puedo orientarte y encontrar la mejor opción para resolver tu duda. Solo dime el número o el nombre de la opción que deseas elegir.";
    return menuText;
};
const mainMenuFlow = addKeyword(EVENTS.ACTION)
    .addAnswer(generateMenuMessage(), { capture: true }, async (ctx, { state, gotoFlow, fallBack }) => {
    const userSelection = ctx.body.trim().toLowerCase();
    console.log(`📌 Usuario ${ctx.from} seleccionó: ${ctx.body}`);
    const sortedAreas = [...areasConfig].sort((a, b) => (a.menu?.order || 0) - (b.menu?.order || 0));
    const areaMap = {};
    sortedAreas.forEach((area, index) => {
        if (area.menu) {
            const key = (index + 1).toString();
            areaMap[key] = area.area;
            areaMap[area.area.toLowerCase()] = area.area;
        }
    });
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
    }
    else {
        console.log(`🔸 Redirigiendo a selectServiceModeFlow con área ${selectedOption}.`);
        await state.update({ selectedFlow: selectedOption });
        return gotoFlow(selectServiceModeFlow);
    }
});

const greetingFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, ctxFn) => {
    console.log(`🎉 Usuario ${ctx.from} ha llegado a greetingFlow.`);
    await ctxFn.flowDynamic("¡Hola! 👋 Soy Sami Bot, el asistente virtual de Grupo SAOM, y estoy aquí para ayudarte en lo que necesites. 😊\n");
    console.log(`📌 Redirigiendo usuario ${ctx.from} a mainMenuFlow.`);
    return ctxFn.gotoFlow(mainMenuFlow);
});

const pathPrompt = path.join(process.cwd(), "assets/Prompts", "prompt_faq.txt");
const promptFAQ = fs.readFileSync(pathPrompt, "utf8");
const EXIT_KEYWORDS = [
    "gracias",
    "finalizar",
    "salir",
    "adiós",
    "no, eso es todo",
    "ya no necesito ayuda",
];
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
        const response = await AI.chat(promptFAQ, [{ role: "user", content: userMessage }]);
        console.log(`🤖 Respuesta de IA: ${response}`);
        await ctxFn.flowDynamic(response);
        await ctxFn.flowDynamic("🤖 ¿Necesitas ayuda con algo más? 😊\n" +
            "Si tienes otra pregunta, dime y con gusto te responderé al instante.\n" +
            "1️⃣ *Seguir preguntando* 📚\n" +
            "2️⃣ *No tengo dudas* ❌");
    }
    catch (error) {
        console.error("❌ Error en faqFlow:", error);
        await ctxFn.flowDynamic("Hubo un error procesando tu solicitud. Inténtalo de nuevo.");
    }
})
    .addAction({ capture: true }, async (ctx, ctxFn) => {
    try {
        const userInput = ctx.body.toLowerCase().trim();
        if (userInput.includes("2") ||
            EXIT_KEYWORDS.some((keyword) => userInput.includes(keyword))) {
            console.log(`👋 Usuario ${ctx.from} ha finalizado el flujo de FAQ.`);
            await ctxFn.flowDynamic("✅ ¡Gracias por tu tiempo! 😊\n" +
                "Espero haber resuelto todas tus dudas. Recuerda que siempre puedes volver y preguntarme lo que necesites. ¡Que tengas un excelente día! 🌟");
            return ctxFn.endFlow();
        }
        if (userInput.includes("1") ||
            MENU_KEYWORDS.some((keyword) => userInput.includes(keyword))) {
            console.log(`📌 Usuario ${ctx.from} quiere ver más opciones en FAQ.`);
            return ctxFn.gotoFlow(faqMenuFlow);
        }
        console.log(`⚠️ Opción no reconocida en FAQ para ${ctx.from}.`);
        return ctxFn.flowDynamic("❌ No entendí tu respuesta. Por favor, responde con '1' para seguir preguntando o '2' para finalizar.");
    }
    catch (error) {
        console.error("❌ Error capturando respuesta en FAQ:", error);
        return ctxFn.flowDynamic("Hubo un error procesando tu respuesta. Inténtalo de nuevo.");
    }
});

const flowMap = {
    selectServiceModeFlow,
    faqFlow,
    faqMenuFlow,
    mainMenuFlow,
    greetingFlow,
};
const intentionGeneralFlow = addKeyword(EVENTS.ACTION).addAction(async (ctx, ctxFn) => {
    let userMessage = await ctxFn.state.get("initialMessage");
    if (!userMessage) {
        userMessage = ctx.body;
    }
    const detectedKeywords = detectKeywordIntents(userMessage);
    console.log(`Intenciones detectadas por palabras clave: ${detectedKeywords.join(", ")}`);
    let intent = null;
    if (detectedKeywords.length === 1) {
        intent = detectedKeywords[0];
        console.log("Utilizando intención detectada por palabras clave.");
    }
    else {
        intent = await detectIntent(userMessage);
        console.log("Utilizando intención detectada por IA.");
    }
    await ctxFn.state.update({ intention: intent });
    await ctxFn.state.update({ initialMessage: null });
    const intentConfig = intentsConfig.find((i) => i.name === intent);
    if (intentConfig) {
        if (intentConfig.isArea) {
            await ctxFn.state.update({ selectedFlow: intent });
        }
        console.log(`Redirigiendo usuario ${ctx.from} al flujo: ${intentConfig.flowName}`);
        return ctxFn.gotoFlow(flowMap[intentConfig.flowName]);
    }
    console.log(`❌ Intención no reconocida para usuario ${ctx.from}.`);
    return ctxFn.endFlow("No entendí tu mensaje. Por favor, intenta de nuevo.");
});

const mainFlow = addKeyword(EVENTS.WELCOME).addAction(async (ctx, ctxFn) => {
    console.log(`🔹 Usuario ${ctx.from} ha iniciado la conversación.`);
    const isUserRegistered = await UserService.existsUser(ctx.from);
    if (!isUserRegistered) {
        console.log(`🔸 Usuario ${ctx.from} NO está registrado. Redirigiendo a registerFlow.`);
        return ctxFn.gotoFlow(registerFlow);
    }
    console.log(`✅ Usuario ${ctx.from} ya registrado. Redirigiendo a intentionGeneralFlow.`);
    await ctxFn.state.update({ initialMessage: ctx.body });
    return ctxFn.gotoFlow(intentionGeneralFlow);
});

var bot = createFlow([
    mainFlow,
    registerFlow,
    intentionGeneralFlow,
    faqFlow,
    faqMenuFlow,
    greetingFlow,
    mainMenuFlow,
    selectServiceModeFlow,
    genericAgentFlow,
    intermediaryFlow,
    askUserDataFlow,
    genericAreaFlow,
    postAreaFlow,
    postFAQFlow,
    postFAQAreaFlow,
]);

const PORT = config.PORT;
const main = async () => {
    const { handleCtx, httpServer } = await createBot({
        flow: bot,
        provider: provider,
        database: new MemoryDB(),
    });
    httpServer(+PORT);
};
main();
