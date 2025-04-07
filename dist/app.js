import { addKeyword, EVENTS, createFlow, createProvider, createBot, MemoryDB } from '@builderbot/bot';
import 'dotenv/config';
import * as mysql from 'mysql';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import nlp from 'compromise';
import https from 'https';
import axios from 'axios';
import { MetaProvider } from '@builderbot/provider-meta';

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
    crmApiUrl: process.env.CRM_API_URL,
};

const poolPromise = mysql.createPool({
    host: config.server,
    user: config.user,
    password: config.password,
    database: config.database,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

function userExists(celular, result) {
    poolPromise.getConnection((err, connection) => {
        if (err) {
            console.error("Error obteniendo una conexión:", err);
            return result(err);
        }
        connection.query("SELECT celular FROM client WHERE celular = ?", [celular], (error, rows) => {
            connection.release();
            if (error) {
                console.error("Error verificando existencia de usuario:", error);
                return result(error);
            }
            result(null, rows.length > 0);
        });
    });
}
function createUser(celular, nombre, email, result) {
    poolPromise.getConnection((err, connection) => {
        if (err) {
            console.error("Error obteniendo una conexión:", err);
            return result(err);
        }
        connection.query("INSERT INTO client (celular, cont, correo) VALUES (?, ?, ?)", [celular, nombre, email], (error, res) => {
            connection.release();
            if (error) {
                console.error("Error creando usuario:", error);
                return result(error);
            }
            result(null, res);
        });
    });
}
function updateUserInfo(celular, nombre, email, result) {
    poolPromise.getConnection((err, connection) => {
        if (err) {
            console.error("Error obteniendo una conexión:", err);
            return result(err);
        }
        connection.query("UPDATE client SET cont = ?, Empresa = ?, correo = ?, updated_at = NOW() WHERE celular = ?", [nombre, nombre, email, celular], (error, res) => {
            connection.release();
            if (error) {
                console.error("Error actualizando usuario:", error);
                return result(error);
            }
            result(null, res);
        });
    });
}
function getUserData(celular, result) {
    poolPromise.getConnection((err, connection) => {
        if (err) {
            console.error("Error obteniendo una conexión:", err);
            return result(err);
        }
        connection.query("SELECT cont AS nombre, correo AS email FROM client WHERE celular = ?", [celular], (error, rows) => {
            connection.release();
            if (error) {
                console.error("Error obteniendo datos del usuario:", error);
                return result(error);
            }
            if (rows.length > 0) {
                result(null, rows[0]);
            }
            else {
                result(null, null);
            }
        });
    });
}
function getUserId(celular, result) {
    poolPromise.getConnection((err, connection) => {
        if (err) {
            console.error("Error obteniendo una conexión:", err);
            return result(err);
        }
        connection.query("SELECT id_Client FROM client WHERE celular = ?", [celular], (error, rows) => {
            connection.release();
            if (error) {
                console.error("Error obteniendo id del usuario:", error);
                return result(error);
            }
            if (rows.length > 0) {
                result(null, rows[0].id_Client);
            }
            else {
                result(null, null);
            }
        });
    });
}
function updateClientContactInfo(celular, email, city, result) {
    poolPromise.getConnection((err, connection) => {
        if (err) {
            console.error("Error obteniendo una conexión:", err);
            return result(err);
        }
        connection.query("UPDATE client SET correo = ?, Cuidad = ?, updated_at = NOW() WHERE celular = ?", [email, city, celular], (error, res) => {
            connection.release();
            if (error) {
                console.error("Error actualizando la info del cliente:", error);
                return result(error);
            }
            result(null, res);
        });
    });
}

class UserService {
    static existsUser(req, res) {
        const { celular } = req.body;
        userExists(celular, (err, exists) => {
            if (err) {
                console.error("Error verificando existencia de usuario:", err);
                return res.status(500).json({ error: err });
            }
            console.log("Resultado de existsUser:", exists);
            res.json({ success: true, exists });
        });
    }
    static registerUser(req, res) {
        const { celular, nombre, email } = req.body;
        userExists(celular, (err, exists) => {
            if (err) {
                console.error("Error verificando usuario:", err);
                return res.status(500).json({ error: err });
            }
            if (!exists) {
                createUser(celular, nombre, email, (err, result) => {
                    if (err) {
                        console.error("Error creando usuario:", err);
                        return res.status(500).json({ error: err });
                    }
                    console.log("Usuario creado:", result);
                    res.json({ success: true, message: "Usuario creado", result });
                });
            }
            else {
                updateUserInfo(celular, nombre, email, (err, result) => {
                    if (err) {
                        console.error("Error actualizando usuario:", err);
                        return res.status(500).json({ error: err });
                    }
                    console.log("Usuario actualizado:", result);
                    res.json({ success: true, message: "Usuario actualizado", result });
                });
            }
        });
    }
    static getUserData(req, res) {
        const { celular } = req.body;
        getUserData(celular, (err, data) => {
            if (err) {
                console.error("Error obteniendo datos del usuario:", err);
                return res.status(500).json({ error: err });
            }
            res.json({ success: true, data });
        });
    }
    static getUserId(req, res) {
        const { celular } = req.body;
        getUserId(celular, (err, id) => {
            if (err) {
                console.error("Error obteniendo id del usuario:", err);
                return res.status(500).json({ error: err });
            }
            res.json({ success: true, id });
        });
    }
    static updateContactInfo(req, res) {
        const { celular, email, city } = req.body;
        updateClientContactInfo(celular, email, city, (err, result) => {
            if (err) {
                console.error("Error actualizando la información de contacto:", err);
                return res.status(500).json({ error: err });
            }
            res.json({
                success: true,
                message: "Información de contacto actualizada",
                result,
            });
        });
    }
}

function existsUserPromise(celular) {
    return new Promise((resolve, reject) => {
        const req = { body: { celular } };
        const res = {
            status: (code) => ({
                json: (data) => reject(new Error(`Error ${code}: ${JSON.stringify(data)}`))
            }),
            json: (data) => resolve(data.exists)
        };
        UserService.existsUser(req, res);
    });
}
function registerUserPromise(celular, nombre, email) {
    return new Promise((resolve, reject) => {
        const req = { body: { celular, nombre, email } };
        const res = {
            status: (code) => ({
                json: (data) => reject(new Error(`Error ${code}: ${JSON.stringify(data)}`))
            }),
            json: (data) => resolve()
        };
        UserService.registerUser(req, res);
    });
}
function fetchUserDataPromise(celular) {
    return new Promise((resolve, reject) => {
        const req = { body: { celular } };
        const res = {
            status: (code) => ({
                json: (data) => reject(new Error(`Error ${code}: ${JSON.stringify(data)}`))
            }),
            json: (data) => resolve(data.data)
        };
        UserService.getUserData(req, res);
    });
}
function fetchUserIdPromise(celular) {
    return new Promise((resolve, reject) => {
        const req = { body: { celular } };
        const res = {
            status: (code) => ({
                json: (data) => reject(new Error(`Error ${code}: ${JSON.stringify(data)}`))
            }),
            json: (data) => resolve(data.id)
        };
        UserService.getUserId(req, res);
    });
}
function updateContactInfoPromise(celular, email, city) {
    return new Promise((resolve, reject) => {
        const req = { body: { celular, email, city } };
        const res = {
            status: (code) => ({
                json: (data) => reject(new Error(`Error ${code}: ${JSON.stringify(data)}`))
            }),
            json: (data) => resolve()
        };
        UserService.updateContactInfo(req, res);
    });
}

const registerFlow = addKeyword(EVENTS.ACTION).addAction(async (ctx, ctxFn) => {
    console.log(`📌 Iniciando registro automático para usuario ${ctx.from}.`);
    try {
        await registerUserPromise(ctx.from, "Desconocido", "Sin correo");
        console.log(`✅ Usuario ${ctx.from} registrado con éxito en la BD SQL Server.`);
    }
    catch (error) {
        console.error("Error registrando usuario:", error);
        return ctxFn.endFlow("Error al registrar usuario.");
    }
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
                max_tokens: options?.max_tokens ?? 350,
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
        keywords: ["ventas", "comprar", "precio", "cotización", "oferta", "producto", "tienda", "recomendación"],
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
        keywords: ["central", "monitoreo", "vigilancia", "configuración", "sistema de seguridad"],
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

function normalizeString(input) {
    return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
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
function detectCity(input, cities) {
    const normalizedInput = normalizeString(input);
    for (const city of cities) {
        if (normalizeString(city) === normalizedInput) {
            return city;
        }
    }
    return null;
}

function createConversation(idCliente, result) {
    poolPromise.getConnection((err, connection) => {
        if (err) {
            console.error("Error obteniendo conexión:", err);
            return result(err);
        }
        connection.query("INSERT INTO conversacion (id_cliente, estado_conversacion) VALUES (?, ?)", [idCliente, 1], (error, res) => {
            connection.release();
            if (error) {
                console.error("Error creando conversación:", error);
                return result(error);
            }
            result(null, res.insertId);
        });
    });
}
function updateConversationStatus(idConversacion, estado, result) {
    poolPromise.getConnection((err, connection) => {
        if (err) {
            console.error("Error obteniendo conexión:", err);
            return result(err);
        }
        connection.query("UPDATE conversacion SET estado = ?, fecha_fin = NOW() WHERE id_conversacion = ?", [estado, idConversacion], (error, res) => {
            connection.release();
            if (error) {
                console.error("Error actualizando estado de conversación:", error);
                return result(error);
            }
            result(null, res);
        });
    });
}
function addConversationMessage(idConversacion, mensajeUsuario, respuesta, options, result) {
    poolPromise.getConnection((err, connection) => {
        if (err) {
            console.error("Error obteniendo conexión:", err);
            return result(err);
        }
        let finalIdUsuario = options?.idUsuario;
        if (!finalIdUsuario) {
            if (!options?.idApartamento) {
                connection.release();
                return result(new Error("idApartamento es requerido para determinar el id del bot por defecto."));
            }
            connection.query("SELECT Id_Usuario FROM usuario WHERE Tipo_Usuario = 1 AND Area_Trabajo_Id_Area = ? LIMIT 1", [options.idApartamento], (error, rows) => {
                if (error) {
                    connection.release();
                    console.error("Error obteniendo id del bot:", error);
                    return result(error);
                }
                if (rows.length === 0) {
                    connection.release();
                    return result(new Error("No se encontró un bot asignado para el área especificada."));
                }
                finalIdUsuario = rows[0].Id_Usuario;
                connection.query("INSERT INTO mensajes (id_conversacion, mensaje_usuario, respuesta, id_usuario, fecha_envio, fecha_respuesta) VALUES (?, ?, ?, ?, NOW(), NOW())", [idConversacion, mensajeUsuario, respuesta, finalIdUsuario], (error, res) => {
                    connection.release();
                    if (error) {
                        console.error("Error insertando mensaje de conversación:", error);
                        return result(error);
                    }
                    result(null, res);
                });
            });
        }
        else {
            connection.query("INSERT INTO mensajes (id_conversacion, mensaje_usuario, respuesta, id_usuario, fecha_envio, fecha_respuesta) VALUES (?, ?, ?, ?, NOW(), NOW())", [idConversacion, mensajeUsuario, respuesta, finalIdUsuario], (error, res) => {
                connection.release();
                if (error) {
                    console.error("Error insertando mensaje de conversación:", error);
                    return result(error);
                }
                result(null, res);
            });
        }
    });
}
function getLastMessages(idConversacion, limit, result) {
    poolPromise.getConnection((err, connection) => {
        if (err) {
            console.error("Error obteniendo conexión:", err);
            return result(err);
        }
        connection.query("SELECT mensaje_usuario, respuesta, fecha_envio, fecha_respuesta FROM mensajes WHERE id_conversacion = ? ORDER BY fecha_envio DESC LIMIT ?", [idConversacion, limit], (error, rows) => {
            connection.release();
            if (error) {
                console.error("Error obteniendo mensajes:", error);
                return result(error);
            }
            result(null, rows.reverse());
        });
    });
}
function getAllMessages(idConversacion, result) {
    poolPromise.getConnection((err, connection) => {
        if (err) {
            console.error("Error obteniendo conexión:", err);
            return result(err);
        }
        connection.query("SELECT mensaje_usuario, respuesta, fecha_envio, fecha_respuesta FROM mensajes WHERE id_conversacion = ? ORDER BY fecha_envio ASC", [idConversacion], (error, rows) => {
            connection.release();
            if (error) {
                console.error("Error obteniendo todos los mensajes:", error);
                return result(error);
            }
            result(null, rows);
        });
    });
}
function getBotForArea(idApartamento, result) {
    poolPromise.getConnection((err, connection) => {
        if (err) {
            console.error("Error obteniendo conexión:", err);
            return result(err);
        }
        connection.query("SELECT Id_Usuario FROM usuario WHERE Tipo_Usuario = 1 AND Area_Trabajo_Id_Area = ? LIMIT 1", [idApartamento], (error, rows) => {
            connection.release();
            if (error) {
                console.error("Error en getBotForArea:", error);
                return result(error);
            }
            if (rows.length === 0) {
                return result(new Error("No se encontró un bot asignado para el área especificada."));
            }
            result(null, rows[0].Id_Usuario);
        });
    });
}
function insertInteraction(idConversacion, role, content, idUsuario, result) {
    poolPromise.getConnection((err, connection) => {
        if (err) {
            console.error("Error obteniendo conexión:", err);
            return result(err);
        }
        if (role === "user") {
            connection.query("INSERT INTO mensajes (id_conversacion, mensaje_usuario, respuesta, id_usuario, fecha_envio, fecha_respuesta) VALUES (?, ?, '', ?, NOW(), NOW())", [idConversacion, content, idUsuario || null], (error, res) => {
                connection.release();
                if (error) {
                    console.error("Error insertando interacción (user):", error);
                    return result(error);
                }
                result(null, res);
            });
        }
        else {
            const botId = idUsuario || 1;
            connection.query("INSERT INTO mensajes (id_conversacion, mensaje_usuario, respuesta, id_usuario, fecha_envio, fecha_respuesta) VALUES (?, '', ?, ?, NOW(), NOW())", [idConversacion, content, botId], (error, res) => {
                connection.release();
                if (error) {
                    console.error("Error insertando interacción (assistant):", error);
                    return result(error);
                }
                result(null, res);
            });
        }
    });
}
function updateConversationState(idConversacion, estado, result) {
    poolPromise.getConnection((err, connection) => {
        if (err) {
            console.error("Error obteniendo conexión:", err);
            return result(err);
        }
        connection.query("UPDATE conversacion SET estado_conversacion = ? WHERE id_conversacion = ?", [estado, idConversacion], (error, res) => {
            connection.release();
            if (error) {
                console.error("Error actualizando estado_conversacion:", error);
                return result(error);
            }
            result(null, res);
        });
    });
}
function updateConversationResult(idConversacion, resultado, result) {
    poolPromise.getConnection((err, connection) => {
        if (err) {
            console.error("Error obteniendo conexión:", err);
            return result(err);
        }
        connection.query("UPDATE conversacion SET resultado_conversacion = ? WHERE id_conversacion = ?", [resultado, idConversacion], (error, res) => {
            connection.release();
            if (error) {
                console.error("Error actualizando resultado_conversacion:", error);
                return result(error);
            }
            result(null, res);
        });
    });
}
function createConversationMetrics(params, result) {
    poolPromise.getConnection((err, connection) => {
        if (err) {
            console.error("Error obteniendo conexión:", err);
            return result(err);
        }
        connection.query(`INSERT INTO conversacion_metricas 
       (resumen, nivel_interes, nivel_conocimiento, productos_servicios_mencionados, 
        interes_prospecto, perfil_cliente, nivel_necesidad, barreras_objeciones, probabilidad_venta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            params.resumen,
            params.nivelInteres || null,
            params.nivelConocimiento || null,
            params.productosServiciosMencionados || null,
            params.interesProspecto || null,
            params.perfilCliente || null,
            params.nivelNecesidad || null,
            params.barrerasObjeciones || null,
            params.probabilidadVenta || null,
        ], (error, res) => {
            connection.release();
            if (error) {
                console.error("Error creando métricas de conversación:", error);
                return result(error);
            }
            result(null, res.insertId);
        });
    });
}
function updateConversationMetrics(conversationId, idMetricas, result) {
    poolPromise.getConnection((err, connection) => {
        if (err) {
            console.error("Error obteniendo conexión:", err);
            return result(err);
        }
        connection.query("UPDATE conversacion SET id_metricas = ? WHERE id_conversacion = ?", [idMetricas, conversationId], (error, res) => {
            connection.release();
            if (error) {
                console.error("Error actualizando métricas en la conversación:", error);
                return result(error);
            }
            result(null, res);
        });
    });
}

class ConversationService {
    static startConversation(idCliente) {
        return new Promise((resolve, reject) => {
            createConversation(idCliente, (err, conversationId) => {
                if (err) {
                    console.error("ConversationService - startConversation error:", err);
                    return reject(err);
                }
                resolve(conversationId);
            });
        });
    }
    static recordMessage(conversationId, mensajeUsuario, respuesta, options) {
        return new Promise((resolve, reject) => {
            addConversationMessage(conversationId, mensajeUsuario, respuesta, options, (err, res) => {
                if (err) {
                    console.error("ConversationService - recordMessage error:", err);
                    return reject(err);
                }
                resolve();
            });
        });
    }
    static getContext(conversationId, limit = 3) {
        return new Promise((resolve, reject) => {
            getLastMessages(conversationId, limit, (err, contextRows) => {
                if (err) {
                    console.error("ConversationService - getContext error:", err);
                    return reject(err);
                }
                const formattedContext = contextRows.reduce((acc, row) => {
                    if (row.mensaje_usuario) {
                        acc.push({ role: "user", content: row.mensaje_usuario });
                    }
                    if (row.respuesta) {
                        acc.push({ role: "assistant", content: row.respuesta });
                    }
                    return acc;
                }, []);
                resolve(formattedContext);
            });
        });
    }
    static closeConversation(conversationId) {
        return new Promise((resolve, reject) => {
            updateConversationStatus(conversationId, "finalizada", (err, res) => {
                if (err) {
                    console.error("ConversationService - closeConversation error:", err);
                    return reject(err);
                }
                resolve();
            });
        });
    }
    static getAllMessages(conversationId) {
        return new Promise((resolve, reject) => {
            getAllMessages(conversationId, (err, messages) => {
                if (err) {
                    console.error("ConversationService - getAllMessages error:", err);
                    return reject(err);
                }
                resolve(messages);
            });
        });
    }
    static getBotForArea(idApartamento) {
        return new Promise((resolve, reject) => {
            getBotForArea(idApartamento, (err, idUsuario) => {
                if (err) {
                    console.error("ConversationService - getBotForArea error:", err);
                    return reject(err);
                }
                resolve(idUsuario);
            });
        });
    }
    static recordInteraction(conversationId, role, content, idUsuario) {
        return new Promise((resolve, reject) => {
            insertInteraction(conversationId, role, content, idUsuario, (err, res) => {
                if (err) {
                    console.error("ConversationService - recordInteraction error:", err);
                    return reject(err);
                }
                resolve();
            });
        });
    }
    static updateState(idConversacion, estado) {
        return new Promise((resolve, reject) => {
            updateConversationState(idConversacion, estado, (err, res) => {
                if (err) {
                    console.error("ConversationService - updateState error:", err);
                    return reject(err);
                }
                console.log(`Estado de conversación actualizado a: ${estado}`);
                resolve();
            });
        });
    }
    static updateResult(idConversacion, resultado) {
        return new Promise((resolve, reject) => {
            updateConversationResult(idConversacion, resultado, (err, res) => {
                if (err) {
                    console.error("ConversationService - updateResult error:", err);
                    return reject(err);
                }
                console.log(`Resultado de conversación actualizado a: ${resultado}`);
                resolve();
            });
        });
    }
    static createConversationMetrics(params) {
        return new Promise((resolve, reject) => {
            createConversationMetrics(params, (err, insertId) => {
                if (err) {
                    console.error("ConversationService - createConversationMetrics error:", err);
                    return reject(err);
                }
                resolve(insertId);
            });
        });
    }
    static updateConversationMetrics(conversationId, idMetricas) {
        return new Promise((resolve, reject) => {
            updateConversationMetrics(conversationId, idMetricas, (err, res) => {
                if (err) {
                    console.error("ConversationService - updateConversationMetrics error:", err);
                    return reject(err);
                }
                resolve();
            });
        });
    }
}

class ConversationManager {
    static async ensureConversation(ctx, state) {
        let conversationId = await state.get("conversationId");
        if (!conversationId) {
            const idCliente = await fetchUserIdPromise(ctx.from);
            if (!idCliente) {
                throw new Error(`No se encontró un cliente con el número ${ctx.from}.`);
            }
            conversationId = await ConversationService.startConversation(idCliente);
            await state.update({ conversationId });
            console.log(`Nueva conversación creada en BD con ID: ${conversationId}`);
        }
        return conversationId;
    }
    static generateMessageHash(content, timestamp) {
        return crypto.createHash("sha256").update(content + timestamp).digest("hex");
    }
    static async logInteraction(ctx, state, role, content, idUsuario) {
        const timestamp = Date.now();
        const currentHash = ConversationManager.generateMessageHash(content, timestamp);
        const lastHash = await state.get("lastMessageHash");
        if (currentHash === lastHash) {
            console.log("Mensaje duplicado detectado, omitiendo registro.");
            return;
        }
        await state.update({ lastMessageHash: currentHash });
        try {
            const conversationId = await state.get("conversationId");
            if (!conversationId) {
                throw new Error("No se encontró conversationId");
            }
            await ConversationService.recordInteraction(conversationId, role, content, idUsuario);
            console.log(`Interacción registrada [${role}]: ${content}`);
        }
        catch (error) {
            console.error("Error registrando interacción:", error);
            throw error;
        }
    }
    static async updateState(ctx, state, newState) {
        try {
            const conversationId = await state.get("conversationId");
            if (!conversationId) {
                throw new Error("No se encontró conversationId para actualizar el estado.");
            }
            await ConversationService.updateState(conversationId, newState);
        }
        catch (error) {
            console.error("Error actualizando el estado de la conversación:", error);
            throw error;
        }
    }
    static async updateResult(ctx, state, newResult) {
        try {
            const conversationId = await state.get("conversationId");
            if (!conversationId) {
                throw new Error("No se encontró conversationId para actualizar el resultado.");
            }
            await ConversationService.updateResult(conversationId, newResult);
        }
        catch (error) {
            console.error("Error actualizando el resultado de la conversación:", error);
            throw error;
        }
    }
}

const flowMap = {
    selectServiceModeFlow: async () => (await Promise.resolve().then(function () { return selectServiceModeFlow$1; })).selectServiceModeFlow,
    faqFlow: async () => (await Promise.resolve().then(function () { return faqFlow$1; })).faqFlow,
    faqMenuFlow: async () => (await Promise.resolve().then(function () { return faqMenuFlow$1; })).faqMenuFlow,
    mainMenuFlow: async () => (await Promise.resolve().then(function () { return mainMenuFlow$1; })).mainMenuFlow,
    greetingFlow: async () => (await Promise.resolve().then(function () { return greetingFlow$1; })).greetingFlow,
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
    const intentConfig = intentsConfig.find((i) => i.name === intent);
    if (intentConfig) {
        if (intentConfig.isArea) {
            await ctxFn.state.update({ selectedFlow: intent });
        }
        console.log(`Redirigiendo usuario ${ctx.from} al flujo: ${intentConfig.flowName}`);
        if (!intentConfig.flowName || !flowMap[intentConfig.flowName]) {
            console.error(`No se encontró un flujo válido para la intención ${intentConfig.name}`);
            const botResponse = "No entendí tu mensaje. Por favor, intenta de nuevo.";
            await ConversationManager.logInteraction(ctx, ctxFn.state, "assistant", botResponse);
            return ctxFn.endFlow(botResponse);
        }
        const targetFlow = await flowMap[intentConfig.flowName]();
        return ctxFn.gotoFlow(targetFlow);
    }
    console.log(`❌ Intención no reconocida para usuario ${ctx.from}.`);
    const botResponse = "No entendí tu mensaje. Por favor, intenta de nuevo.";
    await ConversationManager.logInteraction(ctx, ctxFn.state, "assistant", botResponse);
    return ctxFn.endFlow(botResponse);
});

const mainFlow = addKeyword(EVENTS.WELCOME).addAction(async (ctx, ctxFn) => {
    console.log(`🔹 Usuario ${ctx.from} ha iniciado la conversación.`);
    let isUserRegistered;
    try {
        isUserRegistered = await existsUserPromise(ctx.from);
    }
    catch (error) {
        console.error("Error verificando existencia de usuario:", error);
        return ctxFn.endFlow("Error al verificar usuario.");
    }
    if (!isUserRegistered) {
        console.log(`🔸 Usuario ${ctx.from} NO está registrado. Redirigiendo a registerFlow.`);
        return ctxFn.gotoFlow(registerFlow);
    }
    let conversationId;
    try {
        conversationId = await ConversationManager.ensureConversation(ctx, ctxFn.state);
    }
    catch (error) {
        console.error("Error al asegurar la conversación:", error);
        return ctxFn.endFlow("No se pudo iniciar la conversación.");
    }
    if (ctx.body && ctx.body.trim() !== "") {
        await ConversationManager.logInteraction(ctx, ctxFn.state, "user", ctx.body);
    }
    else {
        await ConversationManager.logInteraction(ctx, ctxFn.state, "user", "Inicio de conversación");
    }
    console.log(`✅ Usuario ${ctx.from} ya registrado. Redirigiendo a intentionGeneralFlow.`);
    return ctxFn.gotoFlow(intentionGeneralFlow);
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
    const conversationId = await ctxFn.state.get("conversationId");
    if (conversationId) {
        await ConversationManager.logInteraction(ctx, ctxFn.state, "assistant", message);
    }
    else {
        console.error("No se encontró conversationId al registrar el mensaje del bot en postFAQFlow.");
    }
})
    .addAction({ capture: true }, async (ctx, ctxFn) => {
    const userInput = ctx.body.trim().toLowerCase();
    console.log(`📥 Usuario ${ctx.from} respondió: ${ctx.body}`);
    const conversationId = await ctxFn.state.get("conversationId");
    if (conversationId) {
        await ConversationManager.logInteraction(ctx, ctxFn.state, "user", ctx.body);
    }
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
        const farewell = "✅ ¡Gracias por tu tiempo! 😊\n" +
            "Espero haber resuelto tus dudas. Recuerda que estoy aquí para ayudarte en cualquier momento, sin esperas y con respuestas rápidas. ¡Vuelve cuando lo necesites! 🌟";
        await ctxFn.flowDynamic(farewell);
        if (conversationId) {
            await ConversationManager.logInteraction(ctx, ctxFn.state, "assistant", farewell);
        }
        return ctxFn.endFlow();
    }
    console.log(`⚠️ Opción no reconocida en postFAQFlow para ${ctx.from}. Redirigiendo a intentionGeneralFlow.`);
    return ctxFn.gotoFlow(intentionGeneralFlow);
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
            postOptions: "Ahora que conoces el proceso, ¿qué prefieres hacer? Puedes seguir conversando para obtener más información o, si lo deseas, te puedo transferir a un asesor para una cotización personalizada.\n\n1️⃣ *Seguir conversando*\n2️⃣ *Atención personalizada*",
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
            postOptions: "Ahora que ya hemos conversado, ¿prefieres seguir conversando o que te transfiera a un especialista? Puedo enviarte a un experto en soporte para resolver tu problema técnico de forma rápida y efectiva.\n\n1️⃣ *Seguir conversando*\n2️⃣ *Atención personalizada*",
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
            postOptions: "Ahora que hemos conversado, ¿prefieres seguir conversando o que te transfiera a un experto en Central de Monitoreo? Puedo asistirte de manera personalizada en la configuración o en la solución de inconvenientes.\n\n1️⃣ *Seguir conversando*\n2️⃣ *Atención personalizada*",
            analysisPromptFile: "prompt_AnalisisConversacion_Central.txt",
        },
        agent: {
            agentMessage: (waitingTime) => `📹 *¡Tu solicitud para Central de Monitoreo ha sido registrada!* Un especialista se pondrá en contacto contigo en aproximadamente ${waitingTime} minutos.`,
            endFlowMessage: "📌 *Gracias por comunicarte con Central de Monitoreo!* Si necesitas más ayuda, aquí estaré para asistirte.",
        },
    },
];

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
    .addAction(async (ctx, ctxFn) => {
    const menuMessage = generateMenuMessage();
    await ctxFn.flowDynamic(menuMessage);
    const conversationId = await ctxFn.state.get("conversationId");
    if (conversationId) {
        await ConversationManager.logInteraction(ctx, ctxFn.state, "assistant", menuMessage);
    }
    else {
        console.error("No se encontró conversationId para registrar el mensaje del bot.");
    }
})
    .addAction({ capture: true }, async (ctx, { state, gotoFlow, fallBack }) => {
    const userSelection = ctx.body.trim().toLowerCase();
    console.log(`📌 Usuario ${ctx.from} seleccionó: ${ctx.body}`);
    const conversationId = await state.get("conversationId");
    if (conversationId) {
        await ConversationManager.logInteraction(ctx, state, "user", ctx.body);
    }
    await ConversationManager.updateState(ctx, state, 2);
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

var mainMenuFlow$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    mainMenuFlow: mainMenuFlow
});

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

async function sendAndLogMessage(ctx, ctxFn, role, message) {
    await ctxFn.flowDynamic(message);
    const conversationId = await ctxFn.state.get("conversationId");
    if (conversationId) {
        await ConversationManager.logInteraction(ctx, ctxFn.state, role, message);
    }
    else {
        console.error("No se encontró conversationId para registrar el mensaje:", message);
    }
}

const askUserDataFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, ctxFn) => {
    const botMessage = "👤 Para brindarte una experiencia más personalizada, ¿podrías proporcionarme tu nombre, por favor?";
    await sendAndLogMessage(ctx, ctxFn, "assistant", botMessage);
})
    .addAction({ capture: true }, async (ctx, ctxFn) => {
    const respuesta = ctx.body.trim();
    await ConversationManager.logInteraction(ctx, ctxFn.state, "user", respuesta);
    const extractedName = extractName(respuesta);
    if (extractedName) {
        console.log(`📝 Usuario ${ctx.from} ingresó el nombre: ${extractedName}`);
        await ctxFn.state.update({ name: extractedName });
        try {
            await registerUserPromise(ctx.from, extractedName, "Sin correo");
        }
        catch (error) {
            console.error("Error registrando usuario:", error);
        }
        return ctxFn.gotoFlow(intermediaryFlow);
    }
    const lowerRespuesta = respuesta.toLowerCase();
    const detected = detectKeywordIntents(lowerRespuesta);
    if (detected.includes("negativeResponse")) {
        await ctxFn.state.update({ skipRegistration: true });
        console.log(`🔹 Usuario ${ctx.from} optó por no compartir sus datos.`);
        return ctxFn.gotoFlow(intermediaryFlow);
    }
    console.log(`⚠️ No se identificó un nombre válido para ${ctx.from}. Redirigiendo a intentionGeneralFlow.`);
    return ctxFn.gotoFlow(intentionGeneralFlow);
});

class AreaConfigService {
    static getAreaConfig(selectedFlow) {
        const areaConfig = areasConfig.find(area => area.area === selectedFlow);
        if (!areaConfig) {
            throw new Error(`No se encontró configuración para el área: ${selectedFlow}`);
        }
        return areaConfig;
    }
    static validateAreaConfig(areaConfig) {
        return !!(areaConfig && areaConfig.conversation && areaConfig.welcomeMessage);
    }
}

class GenericAreaService {
    static async processUserInput(userInput, selectedFlow, ctx, state) {
        console.log(`📥 Procesando consulta en ${selectedFlow}: ${userInput}`);
        const history = await state.get("conversationHistory") || [];
        history.push({ role: "user", content: userInput });
        await ConversationManager.logInteraction(ctx, state, "user", userInput);
        await state.update({ conversationHistory: history });
        const startIndex = history.length > 7 ? history.length - 7 : 0;
        const contextMessages = history.slice(startIndex);
        console.log("🤖 Contexto enviado a IA:", contextMessages);
        let areaConfig;
        try {
            areaConfig = AreaConfigService.getAreaConfig(selectedFlow);
        }
        catch (error) {
            console.error(error.message);
            throw new Error("Área no reconocida");
        }
        const promptPath = path.join(process.cwd(), "assets/Prompts/areas", areaConfig.conversation.promptFile);
        const promptContent = fs.readFileSync(promptPath, "utf8");
        const AI = new aiServices(config.ApiKey);
        let response = await AI.chat(promptContent, contextMessages);
        if (!response || response.includes("No encontré información")) {
            response = areaConfig.conversation.fallbackResponse ||
                "❌ No se encontró información exacta. ¿Podrías darme más detalles?";
        }
        console.log(`🤖 Respuesta de IA para ${selectedFlow}: ${response}`);
        history.push({ role: "assistant", content: response });
        await ConversationManager.logInteraction(ctx, state, "assistant", response);
        await state.update({ conversationHistory: history });
        return response;
    }
}

const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
});
async function sendMessageToCRM(message, numUser, idTicket) {
    try {
        const payload = { numUser, message };
        if (idTicket !== undefined) {
            payload.id_ticket = idTicket;
        }
        const response = await axios.post(`${config.crmApiUrl}/crm/nuevo-mensaje-recibido`, payload, { httpsAgent });
        console.log('Mensaje notificado al CRM correctamente:', response.data);
        return response.data;
    }
    catch (error) {
        console.error('Error enviando mensaje al CRM:', error);
        throw error;
    }
}

function createTicketMetrics(idConversacion, resumen, nivelInteres, nivelConocimiento, productosServiciosMencionados, result) {
    poolPromise.getConnection((err, connection) => {
        if (err) {
            console.error("Error obteniendo una conexión:", err);
            return result(err);
        }
        connection.query("INSERT INTO ticket_metrics (id_conversacion, resumen, nivel_interes, nivel_conocimiento, productos_servicios_mencionados) VALUES (?, ?, ?, ?, ?)", [idConversacion, resumen, nivelInteres, nivelConocimiento, productosServiciosMencionados], (error, res) => {
            connection.release();
            if (error) {
                console.error("Error creando métricas del ticket:", error);
                return result(error);
            }
            result(null, res.insertId);
        });
    });
}
function createTicketNote(contenido, result) {
    poolPromise.getConnection((err, connection) => {
        if (err) {
            console.error("Error obteniendo una conexión:", err);
            return result(err);
        }
        connection.query("INSERT INTO ticket_notes (contenido) VALUES (?)", [contenido], (error, res) => {
            connection.release();
            if (error) {
                console.error("Error creando nota de ticket:", error);
                return result(error);
            }
            result(null, res.insertId);
        });
    });
}
function createTicket(idConversacion, idCliente, idUsuario, idApartamento, estadoSeguimientoTicket, idNota, result) {
    poolPromise.getConnection((err, connection) => {
        if (err) {
            console.error("Error obteniendo una conexión:", err);
            return result(err);
        }
        connection.query(`INSERT INTO tickets 
       (id_conversacion, id_cliente, id_usuario, id_apartamento, estado_ticket, estado_seguimiento_ticket, fecha_creacion, fecha_actualizacion, id_nota)
       VALUES (?, ?, ?, ?, 'abierto', ?, NOW(), NOW(), ?)`, [idConversacion, idCliente, idUsuario, idApartamento, estadoSeguimientoTicket, idNota], (error, res) => {
            connection.release();
            if (error) {
                console.error("Error creando ticket:", error);
                return result(error);
            }
            result(null, res.insertId);
        });
    });
}
function updateTicketStatus(idTicket, nuevoEstado, result) {
    poolPromise.getConnection((err, connection) => {
        if (err) {
            console.error("Error obteniendo una conexión:", err);
            return result(err);
        }
        connection.query("UPDATE tickets SET estado_ticket = ?, fecha_actualizacion = NOW() WHERE id_ticket = ?", [nuevoEstado, idTicket], (error, res) => {
            connection.release();
            if (error) {
                console.error("Error actualizando estado de ticket:", error);
                return result(error);
            }
            result(null, res);
        });
    });
}
function updateTicketSeguimientoTicket(ticketId, nuevoSeguimiento, result) {
    poolPromise.getConnection((err, connection) => {
        if (err) {
            console.error("Error obteniendo una conexión:", err);
            return result(err);
        }
        connection.query("UPDATE tickets SET estado_seguimiento_ticket = ?, fecha_actualizacion = NOW() WHERE id_ticket = ?", [nuevoSeguimiento, ticketId], (error, res) => {
            connection.release();
            if (error) {
                console.error("Error actualizando estado_seguimiento_ticket:", error);
                return result(error);
            }
            result(null, res);
        });
    });
}

class TicketService {
    static generateTicket(req, res) {
        const { idConversacion, idCliente, idUsuario, idApartamento, estadoSeguimientoTicket, resumenMetricas, nivelInteres, nivelConocimiento, productosServiciosMencionados, notaAdicional, } = req.body;
        let idNota = null;
        if (resumenMetricas) {
            createTicketMetrics(idConversacion, resumenMetricas, nivelInteres || null, nivelConocimiento || null, productosServiciosMencionados || null, (err, metricId) => {
                if (err) {
                    console.error("Error creando métricas del ticket:", err);
                    return res.status(500).json({ error: err });
                }
                if (notaAdicional) {
                    createTicketNote(notaAdicional, (err, noteId) => {
                        if (err) {
                            console.error("Error creando nota de ticket:", err);
                            return res.status(500).json({ error: err });
                        }
                        idNota = noteId;
                        TicketService._createTicketAndRespond(idConversacion, idCliente, idUsuario, idApartamento, estadoSeguimientoTicket, idNota, res);
                    });
                }
                else {
                    TicketService._createTicketAndRespond(idConversacion, idCliente, idUsuario, idApartamento, estadoSeguimientoTicket, null, res);
                }
            });
        }
        else {
            if (notaAdicional) {
                createTicketNote(notaAdicional, (err, noteId) => {
                    if (err) {
                        console.error("Error creando nota de ticket:", err);
                        return res.status(500).json({ error: err });
                    }
                    idNota = noteId;
                    TicketService._createTicketAndRespond(idConversacion, idCliente, idUsuario, idApartamento, estadoSeguimientoTicket, idNota, res);
                });
            }
            else {
                TicketService._createTicketAndRespond(idConversacion, idCliente, idUsuario, idApartamento, estadoSeguimientoTicket, null, res);
            }
        }
    }
    static _createTicketAndRespond(idConversacion, idCliente, idUsuario, idApartamento, estadoSeguimientoTicket, idNota, res) {
        const seguimiento = estadoSeguimientoTicket || 1;
        createTicket(idConversacion, idCliente, idUsuario, idApartamento, seguimiento, idNota, (err, ticketId) => {
            if (err) {
                console.error("Error creando ticket:", err);
                return res.status(500).json({ error: err });
            }
            console.log("Ticket generado con ID:", ticketId);
            res.json({ success: true, ticketId });
        });
    }
    static changeTicketStatus(req, res) {
        const { idTicket, nuevoEstado } = req.body;
        updateTicketStatus(idTicket, nuevoEstado, (err, result) => {
            if (err) {
                console.error("Error actualizando estado de ticket:", err);
                return res.status(500).json({ error: err });
            }
            res.json({ success: true, result });
        });
    }
    static changeTicketSeguimiento(req, res) {
        const { ticketId, nuevoSeguimiento } = req.body;
        updateTicketSeguimientoTicket(ticketId, nuevoSeguimiento, (err, result) => {
            if (err) {
                console.error("Error actualizando estado de seguimiento de ticket:", err);
                return res.status(500).json({ error: err });
            }
            res.json({ success: true, result });
        });
    }
}

function generateTicketPromise(params) {
    return new Promise((resolve, reject) => {
        const req = { body: params };
        const res = {
            status: (code) => ({
                json: (data) => reject(new Error(`Error ${code}: ${JSON.stringify(data)}`))
            }),
            json: (data) => {
                if (data && data.ticketId) {
                    resolve(data.ticketId);
                }
                else {
                    reject(new Error("No se obtuvo ticketId en la respuesta"));
                }
            }
        };
        TicketService.generateTicket(req, res);
    });
}
function updateTicketSeguimientoPromise(params) {
    return new Promise((resolve, reject) => {
        const req = { body: params };
        const res = {
            status: (code) => ({
                json: (data) => reject(new Error(`Error ${code}: ${JSON.stringify(data)}`))
            }),
            json: (data) => resolve()
        };
        TicketService.changeTicketSeguimiento(req, res);
    });
}

const genericAgentFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, ctxFn) => {
    const isAgentFlowInitialized = await ctxFn.state.get("isAgentFlowInitialized");
    if (!isAgentFlowInitialized) {
        await ctxFn.state.update({
            isAgentFlowInitialized: true,
            botOffForThisUser: true,
        });
        console.log(`Bot desactivado para el usuario ${ctx.from}.`);
        const ticketId = await ctxFn.state.get("ticketId");
        await updateTicketSeguimientoPromise({
            ticketId,
            nuevoSeguimiento: 6,
        });
        console.log(`Estado del ticket ${ticketId} actualizado a "Pendiente".`);
        const selectedFlow = await ctxFn.state.get("selectedFlow");
        if (selectedFlow) {
            await ConversationManager.updateState(ctx, ctxFn.state, 4);
        }
        if (selectedFlow) {
            const areaConfig = areasConfig.find((area) => area.area === selectedFlow);
            if (areaConfig && areaConfig.agent) {
                const welcomeMessage = areaConfig.agent.agentMessage(areaConfig.waitingTime);
                await ctxFn.flowDynamic(welcomeMessage);
                await ConversationManager.logInteraction(ctx, ctxFn.state, "assistant", welcomeMessage);
            }
        }
    }
})
    .addAction({ capture: true }, async (ctx, { gotoFlow, endFlow, state }) => {
    const botOff = await state.get("botOffForThisUser");
    if (!botOff) {
        console.log(`Bot reactivado para el usuario ${ctx.from}. Saliendo de atención personalizada.`);
        return endFlow("Atención personalizada finalizada. El bot ha sido reactivado.");
    }
    const incomingMessage = ctx.body;
    console.log(`📩 Mensaje recibido de ${ctx.from}: ${incomingMessage}`);
    try {
        await ConversationManager.logInteraction(ctx, state, "user", incomingMessage);
    }
    catch (error) {
        console.error("Error registrando el mensaje del usuario:", error);
    }
    try {
        const ticketId = await state.get("ticketId");
        await sendMessageToCRM(incomingMessage, ctx.from, ticketId);
        console.log(`Mensaje de ${ctx.from} notificado al CRM correctamente.`);
    }
    catch (error) {
        console.error("Error al notificar el mensaje al CRM:", error);
    }
    return gotoFlow(genericAgentFlow);
});

function fixJsonString(jsonStr) {
    jsonStr = jsonStr.replace(/```(json)?/gi, "").trim();
    jsonStr = jsonStr.replace(/,\s*(}|\])/g, "$1");
    if (!jsonStr.trim().endsWith("}")) {
        jsonStr = jsonStr.trim() + "}";
    }
    return jsonStr;
}
class MetricsService {
    static async analyzeConversationAndSave(conversationId, areaConfig) {
        const history = await ConversationService.getAllMessages(conversationId);
        if (!history || history.length === 0) {
            throw new Error("No se pudo analizar la conversación: historial vacío.");
        }
        const formattedHistory = history.reduce((acc, row) => {
            if (row.mensaje_usuario)
                acc.push({ role: "user", content: row.mensaje_usuario });
            if (row.respuesta)
                acc.push({ role: "assistant", content: row.respuesta });
            return acc;
        }, []);
        console.log("📊 Historial para análisis:", formattedHistory.map(m => `${m.role}: ${m.content}`).join("\n"));
        let promptFile = "prompt_AnalisisConversacion.txt";
        if (areaConfig.conversation && areaConfig.conversation.analysisPromptFile) {
            promptFile = areaConfig.conversation.analysisPromptFile;
        }
        const pathPrompt = path.join(process.cwd(), "assets/Prompts/metrics_areas", promptFile);
        const promptContent = fs.readFileSync(pathPrompt, "utf8");
        const AI = new aiServices(config.ApiKey);
        const analysisResult = await AI.chat(promptContent, formattedHistory);
        console.log("📊 Resultado del análisis:", analysisResult);
        const fixedResult = fixJsonString(analysisResult);
        let parsedAnalysis;
        try {
            parsedAnalysis = JSON.parse(fixedResult);
        }
        catch (error) {
            console.error("Error parseando el análisis:", error);
            parsedAnalysis = {
                resumen_intencion: analysisResult,
                probabilidad_compra: "",
                productos_mencionados: [],
                nivel_conocimiento: "",
                interesProspecto: null,
                perfilCliente: null,
                nivelNecesidad: null,
                barrerasObjeciones: null,
            };
        }
        const resumenMetricas = parsedAnalysis.resumen_intencion || "";
        const nivelInteres = parsedAnalysis.probabilidad_compra || "";
        const nivelConocimiento = parsedAnalysis.nivel_conocimiento || "";
        const productosServiciosMencionados = (parsedAnalysis.productos_mencionados || []).join(", ");
        const interesProspecto = typeof parsedAnalysis.interesProspecto === "number" ? parsedAnalysis.interesProspecto : null;
        const perfilCliente = typeof parsedAnalysis.perfilCliente === "number" ? parsedAnalysis.perfilCliente : null;
        const nivelNecesidad = typeof parsedAnalysis.nivelNecesidad === "number" ? parsedAnalysis.nivelNecesidad : null;
        const barrerasObjeciones = typeof parsedAnalysis.barrerasObjeciones === "number" ? parsedAnalysis.barrerasObjeciones : null;
        let probabilidadVenta = null;
        if (interesProspecto !== null && perfilCliente !== null && nivelNecesidad !== null && barrerasObjeciones !== null) {
            probabilidadVenta = interesProspecto * perfilCliente * nivelNecesidad * barrerasObjeciones * 100;
        }
        const idMetricas = await ConversationService.createConversationMetrics({
            resumen: resumenMetricas,
            nivelInteres,
            nivelConocimiento,
            productosServiciosMencionados,
            interesProspecto,
            perfilCliente,
            nivelNecesidad,
            barrerasObjeciones,
            probabilidadVenta,
        });
        console.log(`✅ Métricas guardadas con ID: ${idMetricas}`);
        await ConversationService.updateConversationMetrics(conversationId, idMetricas);
        return idMetricas;
    }
    static async generateTicketForConversation(conversationId, areaConfig, celular) {
        const idCliente = await fetchUserIdPromise(celular);
        if (!idCliente) {
            throw new Error(`No se encontró cliente para el número ${celular}.`);
        }
        const idApartamento = areaConfig.conversation.idApartamento;
        const idUsuario = await ConversationService.getBotForArea(idApartamento);
        const ticketId = await generateTicketPromise({
            idConversacion: conversationId,
            idCliente,
            idUsuario,
            idApartamento,
            resumenMetricas: undefined,
            nivelInteres: undefined,
            nivelConocimiento: undefined,
            productosServiciosMencionados: undefined,
            notaAdicional: "",
        });
        console.log(`✅ Ticket generado con ID: ${ticketId}`);
        return ticketId;
    }
}

const contactInfoValidationFlow = addKeyword(EVENTS.ACTION).addAction({ capture: true }, async (ctx, ctxFn) => {
    const response = ctx.body.toLowerCase().trim();
    await ConversationManager.logInteraction(ctx, ctxFn.state, "user", response);
    if (response.includes("sí") ||
        response.includes("si") ||
        response.includes("1") ||
        response.includes("continuar")) {
        const botMsg = "¡Entendido! Continuamos con el proceso. 😊";
        await ctxFn.flowDynamic(botMsg);
        await ConversationManager.logInteraction(ctx, ctxFn.state, "assistant", botMsg);
        try {
            const conversationId = await ctxFn.state.get("conversationId");
            const selectedFlow = await ctxFn.state.get("selectedFlow");
            const areaConfig = AreaConfigService.getAreaConfig(selectedFlow);
            const metricsId = await MetricsService.analyzeConversationAndSave(conversationId, areaConfig);
            await ctxFn.state.update({ metricsId });
            console.log(`Métricas guardadas con ID: ${metricsId}`);
            const ticketId = await MetricsService.generateTicketForConversation(conversationId, areaConfig, ctx.from);
            await ctxFn.state.update({ ticketId });
            console.log(`Ticket generado con ID: ${ticketId}`);
        }
        catch (error) {
            console.error("Error en análisis de métricas y generación de ticket:", error);
            const errorMsg = "Error al procesar la solicitud. Continuamos sin métricas y ticket.";
            await ctxFn.flowDynamic(errorMsg);
            await ConversationManager.logInteraction(ctx, ctxFn.state, "assistant", errorMsg);
        }
        return ctxFn.gotoFlow(genericAgentFlow);
    }
    else if (response.includes("no") ||
        response.includes("2") ||
        response.includes("finalizar")) {
        const farewell = "¡Proceso finalizado! Muchas gracias por tu tiempo. ¡Que tengas un excelente día! 😊";
        await ctxFn.flowDynamic(farewell);
        await ConversationManager.updateResult(ctx, ctxFn.state, 3);
        await ConversationManager.logInteraction(ctx, ctxFn.state, "assistant", farewell);
        return ctxFn.endFlow();
    }
    else {
        const unclear = "😕 Lo siento, no entendí tu respuesta. Por favor, responde 'sí' o 'no'.";
        await ctxFn.flowDynamic(unclear);
        await ConversationManager.logInteraction(ctx, ctxFn.state, "assistant", unclear);
        await ConversationManager.updateState(ctx, ctxFn.state, 6);
        await ConversationManager.updateResult(ctx, ctxFn.state, 3);
        return ctxFn.gotoFlow(contactInfoValidationFlow);
    }
});

const citiesConfig = [
    { id: 1, name: "cancún" },
    { id: 2, name: "playa del carmen" },
    { id: 3, name: "puerto morelos" },
    { id: 4, name: "tulum" },
    { id: 5, name: "mérida" },
    { id: 6, name: "chetumal" },
    { id: 7, name: "yucatán" },
];

const allowedCityNames = citiesConfig.map((city) => city.name);
const contactInfoFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, ctxFn) => {
    const message = "✉️ Para ofrecerte una atención más personalizada, ¿podrías proporcionarme tu correo electrónico, por favor?";
    await sendAndLogMessage(ctx, ctxFn, "assistant", message);
})
    .addAction({ capture: true }, async (ctx, ctxFn) => {
    const email = ctx.body.trim();
    await ConversationManager.logInteraction(ctx, ctxFn.state, "user", email);
    const detected = detectKeywordIntents(email.toLowerCase());
    if (detected.includes("negativeResponse")) {
        await ctxFn.state.update({ email: null });
        const noEmailMsg = "¡Entendido! No hay problema si prefieres no compartir tu correo, continuamos con el proceso 😊.";
        await sendAndLogMessage(ctx, ctxFn, "assistant", noEmailMsg);
    }
    else if (email !== "") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            const invalidMsg = "¡Ups! El correo ingresado no es válido. Por favor, ingresa un correo correcto o escribe 'no quiero' para omitirlo 😊.";
            await sendAndLogMessage(ctx, ctxFn, "assistant", invalidMsg);
            return ctxFn.gotoFlow(contactInfoFlow);
        }
        await ctxFn.state.update({ email });
        await updateContactInfoPromise(ctx.from, email, null);
    }
    else {
        await ctxFn.state.update({ email: null });
    }
    const promptCity = "🌍 Ahora, ¿puedes indicarme la ciudad desde donde te contactas?";
    await sendAndLogMessage(ctx, ctxFn, "assistant", promptCity);
})
    .addAction({ capture: true }, async (ctx, ctxFn) => {
    const inputCity = ctx.body.trim();
    await ConversationManager.logInteraction(ctx, ctxFn.state, "user", inputCity);
    const detectedCityName = detectCity(inputCity, allowedCityNames);
    if (detectedCityName) {
        const cityObj = citiesConfig.find((city) => normalizeString(city.name) === normalizeString(detectedCityName));
        if (!cityObj) {
            const notFoundMsg = `No se encontró información para la ciudad "${inputCity}".`;
            await sendAndLogMessage(ctx, ctxFn, "assistant", notFoundMsg);
            return ctxFn.gotoFlow(contactInfoValidationFlow);
        }
        await ctxFn.state.update({ city: cityObj.id });
        try {
            const email = await ctxFn.state.get("email");
            await updateContactInfoPromise(ctx.from, email || "", cityObj.id);
        }
        catch (error) {
            console.error("Error actualizando información de contacto:", error);
            await sendAndLogMessage(ctx, ctxFn, "assistant", "Hubo un error al actualizar tu información de contacto, continuamos sin actualizarla.");
        }
        try {
            const conversationId = await ctxFn.state.get("conversationId");
            const selectedFlow = await ctxFn.state.get("selectedFlow");
            const areaConfig = AreaConfigService.getAreaConfig(selectedFlow);
            const metricsId = await MetricsService.analyzeConversationAndSave(conversationId, areaConfig);
            await ctxFn.state.update({ metricsId });
            const ticketId = await MetricsService.generateTicketForConversation(conversationId, areaConfig, ctx.from);
            await ctxFn.state.update({ ticketId });
            const successMsg = "Gracias, tu información ha sido registrada. Continuaremos con el proceso. 😊";
            await sendAndLogMessage(ctx, ctxFn, "assistant", successMsg);
        }
        catch (error) {
            console.error("Error procesando métricas y ticket:", error);
            await sendAndLogMessage(ctx, ctxFn, "assistant", "Se presentó un error al procesar tu solicitud. Continuamos sin métricas y ticket.");
        }
        await ConversationManager.updateState(ctx, ctxFn.state, 4);
        await ConversationManager.updateResult(ctx, ctxFn.state, 1);
        return ctxFn.gotoFlow(genericAgentFlow);
    }
    else {
        const notAllowedMsg = `Okay, actualmente en la ciudad "${inputCity}" no tenemos cobertura para instalación en propiedad 🚫🏢.  
¿Deseas que te ofrezcamos opciones para compra de equipo y envío por paqueterías 📦?  
\n1️⃣ *Si, ver alternativas*\n2️⃣ *No, finalizar proceso*`;
        await sendAndLogMessage(ctx, ctxFn, "assistant", notAllowedMsg);
        return ctxFn.gotoFlow(contactInfoValidationFlow);
    }
});

const postAreaFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, ctxFn) => {
    const selectedFlow = await ctxFn.state.get("selectedFlow");
    const areaConfig = areasConfig.find((area) => area.area === selectedFlow);
    if (!areaConfig || !areaConfig.conversation) {
        console.log(`⚠️ No se encontró configuración para el área ${selectedFlow}.`);
        return ctxFn.endFlow("Área no reconocida. Vuelve al menú principal.");
    }
    await ctxFn.flowDynamic(areaConfig.conversation.postOptions);
    const conversationId = await ctxFn.state.get("conversationId");
    if (conversationId) {
        await ConversationManager.logInteraction(ctx, ctxFn.state, "assistant", areaConfig.conversation.postOptions);
    }
    else {
        console.error("No se encontró conversationId para registrar el mensaje del bot en postAreaFlow.");
    }
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
    const conversationId = await ctxFn.state.get("conversationId");
    if (respuesta.includes("1") || respuesta.includes("seguir") || respuesta.includes("continuar")) {
        console.log(`🔄 Usuario ${ctx.from} optó por seguir conversando en el área ${selectedFlow}.`);
        if (conversationId) {
            await ConversationManager.logInteraction(ctx, ctxFn.state, "user", respuesta);
        }
        return ctxFn.gotoFlow(genericAreaFlow);
    }
    if (respuesta.includes("2") ||
        respuesta.includes("atención") ||
        respuesta.includes("cotizar")) {
        console.log(`📊 Usuario ${ctx.from} optó por atención personalizada en el área ${selectedFlow}.`);
        if (conversationId) {
            await ConversationManager.logInteraction(ctx, ctxFn.state, "user", respuesta);
            await ConversationManager.updateState(ctx, ctxFn.state, 4);
        }
        return ctxFn.gotoFlow(contactInfoFlow);
    }
    console.log(`⚠️ Opción no válida. Guardando mensaje pendiente y redirigiendo a genericAreaFlow.`);
    await ctxFn.state.update({ pendingInput: respuesta });
    return ctxFn.gotoFlow(genericAreaFlow);
});

const validationFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, ctxFn) => {
    let validationCount = (await ctxFn.state.get("validationCount")) || 0;
    if (validationCount >= 3) {
        console.log(`Máximo de validaciones alcanzado para ${ctx.from}. Redirigiendo a postAreaFlow.`);
        return ctxFn.gotoFlow(postAreaFlow);
    }
    validationCount++;
    await ctxFn.state.update({ validationCount });
    const botMessage = `¿Tienes alguna otra duda u otra consulta😊? 
\n1️⃣ *Si, continuar conversando*\n2️⃣ *No, finalizar conversación*`;
    await ctxFn.flowDynamic(botMessage);
    await ConversationManager.logInteraction(ctx, ctxFn.state, "assistant", botMessage);
})
    .addAction({ capture: true }, async (ctx, ctxFn) => {
    const userResponse = ctx.body.toLowerCase().trim();
    console.log(`Respuesta de validación de ${ctx.from}: ${userResponse}`);
    const conversationId = await ctxFn.state.get("conversationId");
    if (userResponse.includes("sí") ||
        userResponse.includes("si") ||
        userResponse.includes("1") ||
        userResponse.includes("continuar")) {
        await ctxFn.state.update({ validationCount: 0 });
        if (conversationId) {
            await ConversationManager.logInteraction(ctx, ctxFn.state, "user", userResponse);
        }
        return ctxFn.gotoFlow(genericAreaFlow);
    }
    if (userResponse.includes("no") ||
        userResponse.includes("2") ||
        userResponse.includes("finalizar")) {
        if (conversationId) {
            await ConversationManager.logInteraction(ctx, ctxFn.state, "user", userResponse);
        }
        return ctxFn.gotoFlow(postAreaFlow);
    }
    console.log(`Respuesta no válida en validación para ${ctx.from}. Se guarda en pendingInput.`);
    await ctxFn.state.update({ pendingInput: ctx.body });
    return ctxFn.gotoFlow(genericAreaFlow);
});

const genericAreaFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, ctxFn) => {
    console.log(`📌 Usuario ${ctx.from} ingresó al flujo genérico de área.`);
    await ConversationManager.updateState(ctx, ctxFn.state, 3);
    const selectedFlow = await ctxFn.state.get("selectedFlow");
    if (!selectedFlow) {
        console.error(`❌ No se encontró área seleccionada para ${ctx.from}.`);
        return ctxFn.endFlow("No se detectó una selección de área. Vuelve al menú principal.");
    }
    let areaConfig;
    try {
        areaConfig = AreaConfigService.getAreaConfig(selectedFlow);
    }
    catch (error) {
        console.error(error.message);
        return ctxFn.endFlow("Área no reconocida. Vuelve al menú principal.");
    }
    const hasSeenWelcome = await ctxFn.state.get("hasSeenWelcome");
    if (!hasSeenWelcome) {
        await ctxFn.state.update({ hasSeenWelcome: true });
        const conversationMessage = areaConfig.conversation.conversationMessage;
        const userName = (await ctxFn.state.get("name")) || "";
        const welcomeMessage = userName && userName !== "Desconocido"
            ? `¡Bienvenido ${userName}! ${conversationMessage}`
            : conversationMessage;
        await sendAndLogMessage(ctx, ctxFn, "assistant", welcomeMessage);
    }
    const pendingInput = await ctxFn.state.get("pendingInput");
    if (pendingInput && pendingInput.trim() !== "") {
        await ctxFn.state.update({ pendingInput: null });
        const response = await GenericAreaService.processUserInput(pendingInput, selectedFlow, ctx, ctxFn.state);
        await ctxFn.flowDynamic(response);
        return ctxFn.gotoFlow(validationFlow);
    }
})
    .addAction({ capture: true }, async (ctx, ctxFn) => {
    let userInput = ctx.body?.toLowerCase().trim();
    if (!userInput || userInput === "") {
        userInput = await ctxFn.state.get("pendingInput");
        await ctxFn.state.update({ pendingInput: null });
    }
    try {
        const selectedFlow = await ctxFn.state.get("selectedFlow");
        const response = await GenericAreaService.processUserInput(userInput, selectedFlow, ctx, ctxFn.state);
        await ctxFn.flowDynamic(response);
        return ctxFn.gotoFlow(validationFlow);
    }
    catch (error) {
        console.error("Error procesando la entrada del usuario:", error);
        return ctxFn.endFlow("Ocurrió un error procesando tu solicitud.");
    }
});

const intermediaryFlow = addKeyword(EVENTS.ACTION).addAction(async (ctx, ctxFn) => {
    const selectedFlow = await ctxFn.state.get("selectedFlow");
    if (!selectedFlow) {
        console.log(`⚠️ No se encontró área seleccionada para ${ctx.from}.`);
        return ctxFn.endFlow("❌ No se detectó una selección de área. Vuelve al menú principal.");
    }
    console.log(`✅ Área seleccionada: ${selectedFlow}`);
    const userData = await fetchUserDataPromise(ctx.from);
    if (!userData) {
        console.error(`❌ No se encontraron datos para el usuario ${ctx.from}.`);
        return ctxFn.endFlow("Error al obtener datos del usuario.");
    }
    console.log(`📌 Datos actuales del usuario ${ctx.from}:`, userData);
    const skipRegistration = await ctxFn.state.get("skipRegistration");
    if (userData.nombre === "Desconocido" && !skipRegistration) {
        console.log(`🔹 Datos predefinidos detectados para ${ctx.from}. Redirigiendo a askUserDataFlow.`);
        return ctxFn.gotoFlow(askUserDataFlow);
    }
    else {
        await ctxFn.state.update({ name: userData.nombre });
        console.log(`📝 Nombre actualizado: ${userData.nombre}`);
    }
    console.log(`✅ Datos confirmados para ${ctx.from}.`);
    let areaConfig;
    try {
        areaConfig = AreaConfigService.getAreaConfig(selectedFlow);
    }
    catch (error) {
        console.error(error.message);
        return ctxFn.endFlow("❌ Área no reconocida. Vuelve a intentarlo desde el menú principal.");
    }
    console.log(`✅ Redirigiendo al flujo de atención vía bot para el área ${selectedFlow}.`);
    return ctxFn.gotoFlow(genericAreaFlow);
});

const selectServiceModeFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, ctxFn) => {
    const selectedFlow = await ctxFn.state.get("selectedFlow");
    if (!selectedFlow) {
        console.log(`⚠️ No se encontró un área válida para ${ctx.from}.`);
        return ctxFn.gotoFlow(mainMenuFlow);
    }
    let areaConfig;
    try {
        areaConfig = AreaConfigService.getAreaConfig(selectedFlow);
    }
    catch (error) {
        console.error(error.message);
        return ctxFn.gotoFlow(mainMenuFlow);
    }
    const areaMessage = areaConfig.welcomeMessage(areaConfig.waitingTime);
    await sendAndLogMessage(ctx, ctxFn, "assistant", areaMessage);
    const optionsMessage = "\n1️⃣ *Seguir con mi ayuda y obtener información ahora mismo.* 🤖\n" +
        "2️⃣ *Hablar con un asesor y esperar su respuesta.* 👨";
    await sendAndLogMessage(ctx, ctxFn, "assistant", optionsMessage);
})
    .addAction({ capture: true }, async (ctx, ctxFn) => {
    const userChoice = ctx.body.toLowerCase().trim();
    console.log(`📥 Usuario ${ctx.from} respondió: ${ctx.body}`);
    const conversationId = await ctxFn.state.get("conversationId");
    if (conversationId) {
        await ConversationManager.logInteraction(ctx, ctxFn.state, "user", ctx.body);
    }
    const selectedFlow = await ctxFn.state.get("selectedFlow");
    if (!selectedFlow) {
        console.log(`⚠️ No se encontró un área válida para ${ctx.from}.`);
        return ctxFn.gotoFlow(mainMenuFlow);
    }
    let areaConfig;
    try {
        areaConfig = AreaConfigService.getAreaConfig(selectedFlow);
    }
    catch (error) {
        console.error(error.message);
        return ctxFn.gotoFlow(mainMenuFlow);
    }
    if (userChoice.includes("1") || userChoice.includes("bot")) {
        console.log(`🤖 Usuario ${ctx.from} optó por atención vía bot en ${selectedFlow}.`);
        return ctxFn.gotoFlow(intermediaryFlow);
    }
    if (userChoice.includes("2") || userChoice.includes("agente")) {
        console.log(`📞 Usuario ${ctx.from} optó por atención en vivo en ${selectedFlow}.`);
        return ctxFn.gotoFlow(genericAgentFlow);
    }
    console.log(`⚠️ Usuario ${ctx.from} ingresó una opción no válida. Redirigiendo a intentionGeneralFlow.`);
    return ctxFn.gotoFlow(intentionGeneralFlow);
});

var selectServiceModeFlow$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    selectServiceModeFlow: selectServiceModeFlow
});

const postFAQAreaFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, ctxFn) => {
    let message = "🤖 Ahora que conoces cómo funciona esta área, ¿quieres proceder con este proceso o prefieres hacer otra pregunta?\n" +
        "Recuerda que conmigo puedes obtener respuestas rápidas y sin tiempos de espera. Estoy aquí para ayudarte. 😉";
    message += "\n" + "1️⃣ *Proceder* 🤖\n" + "2️⃣ *Seguir preguntando* 📚";
    await ctxFn.flowDynamic(message);
    const conversationId = await ctxFn.state.get("conversationId");
    if (conversationId) {
        await ConversationManager.logInteraction(ctx, ctxFn.state, "assistant", message);
    }
    else {
        console.error("No se encontró conversationId para registrar el mensaje del bot en postFAQAreaFlow.");
    }
})
    .addAction({ capture: true }, async (ctx, ctxFn) => {
    const userInput = ctx.body.trim().toLowerCase();
    console.log(`📥 Usuario ${ctx.from} respondió: ${ctx.body}`);
    const conversationId = await ctxFn.state.get("conversationId");
    if (conversationId) {
        await ConversationManager.logInteraction(ctx, ctxFn.state, "user", ctx.body);
    }
    const selectedFlow = await ctxFn.state.get("selectedFlow");
    if (!selectedFlow) {
        const errorMsg = "❌ Parece que hubo un pequeño problema y no pude procesar tu elección. No te preocupes, intentémoslo de nuevo. 😊\n" +
            "Solo dime el número o el nombre de la opción que deseas y te guiaré al instante.";
        console.log(`⚠️ No se encontró área seleccionada para ${ctx.from}.`);
        await ctxFn.flowDynamic(errorMsg);
        if (conversationId) {
            await ConversationManager.logInteraction(ctx, ctxFn.state, "assistant", errorMsg);
        }
        return;
    }
    if (userInput.includes("1") ||
        userInput.includes("proceder") ||
        userInput.includes("continuar")) {
        console.log(`📌 Usuario ${ctx.from} quiere continuar en el área de ${selectedFlow}. Redirigiendo a selectServiceModeFlow.`);
        return ctxFn.gotoFlow(selectServiceModeFlow);
    }
    if (userInput.includes("2") ||
        userInput.includes("preguntas") ||
        userInput.includes("faq") ||
        userInput.includes("seguir")) {
        console.log(`📌 Usuario ${ctx.from} quiere seguir preguntando.`);
        return ctxFn.gotoFlow(faqMenuFlow);
    }
    console.log(`⚠️ Opción no reconocida en postFAQAreaFlow para ${ctx.from}. Redirigiendo a intentionGeneralFlow.`);
    return ctxFn.gotoFlow(intentionGeneralFlow);
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
const faqMenuFlow = addKeyword(EVENTS.ACTION)
    .addAction(async (ctx, ctxFn) => {
    const menuMessage = generateFAQMenu();
    await ctxFn.flowDynamic(menuMessage);
    const conversationId = await ctxFn.state.get("conversationId");
    if (conversationId) {
        await ConversationManager.logInteraction(ctx, ctxFn.state, "assistant", menuMessage);
    }
    else {
        console.error("No se encontró conversationId para registrar el mensaje del bot.");
    }
    await ConversationManager.updateState(ctx, ctxFn.state, 2);
})
    .addAction({ capture: true }, async (ctx, { state, gotoFlow, fallBack, flowDynamic }) => {
    const userInput = ctx.body.trim().toLowerCase();
    console.log(`📥 Usuario ${ctx.from} seleccionó: ${ctx.body}`);
    const conversationId = await state.get("conversationId");
    if (conversationId) {
        await ConversationManager.logInteraction(ctx, state, "user", ctx.body);
    }
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
        return gotoFlow(intentionGeneralFlow);
    }
    await flowDynamic(selectedFAQ.answer);
    if (conversationId) {
        await ConversationManager.logInteraction(ctx, state, "assistant", selectedFAQ.answer);
    }
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

var faqMenuFlow$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    faqMenuFlow: faqMenuFlow
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
        const response = await AI.chat(promptFAQ, [
            { role: "user", content: userMessage },
        ]);
        console.log(`🤖 Respuesta de IA: ${response}`);
        const conversationId = await ctxFn.state.get("conversationId");
        if (conversationId) {
            await ConversationManager.logInteraction(ctx, ctxFn.state, "assistant", response);
        }
        else {
            console.error("No se encontró conversationId para registrar la respuesta de IA.");
        }
        await ctxFn.flowDynamic(response);
        const validationMsg = "🤖 ¿Necesitas ayuda con algo más? 😊\n" +
            "Si tienes otra pregunta, dime y con gusto te responderé al instante.\n" +
            "1️⃣ *Seguir preguntando* 📚\n" +
            "2️⃣ *No tengo dudas* ❌";
        await ctxFn.flowDynamic(validationMsg);
        if (conversationId) {
            await ConversationManager.logInteraction(ctx, ctxFn.state, "assistant", validationMsg);
        }
    }
    catch (error) {
        console.error("❌ Error en faqFlow:", error);
        await ctxFn.flowDynamic("Hubo un error procesando tu solicitud. Inténtalo de nuevo.");
    }
})
    .addAction({ capture: true }, async (ctx, ctxFn) => {
    try {
        const userInput = ctx.body.toLowerCase().trim();
        const conversationId = await ctxFn.state.get("conversationId");
        if (conversationId) {
            await ConversationManager.logInteraction(ctx, ctxFn.state, "user", ctx.body);
        }
        if (userInput.includes("1") ||
            MENU_KEYWORDS.some((keyword) => userInput.includes(keyword))) {
            console.log(`📌 Usuario ${ctx.from} quiere ver más opciones en FAQ.`);
            return ctxFn.gotoFlow(faqMenuFlow);
        }
        if (userInput.includes("2") ||
            EXIT_KEYWORDS.some((keyword) => userInput.includes(keyword))) {
            console.log(`👋 Usuario ${ctx.from} ha finalizado el flujo de FAQ.`);
            const farewell = "✅ ¡Gracias por tu tiempo! 😊\n" +
                "Espero haber resuelto todas tus dudas. Recuerda que siempre puedes volver y preguntarme lo que necesites. ¡Que tengas un excelente día! 🌟";
            await ctxFn.flowDynamic(farewell);
            if (conversationId) {
                await ConversationManager.logInteraction(ctx, ctxFn.state, "assistant", farewell);
            }
            return ctxFn.endFlow();
        }
        console.log(`⚠️ Opción no reconocida en FAQ para ${ctx.from}.`);
        return ctxFn.gotoFlow(intentionGeneralFlow);
    }
    catch (error) {
        console.error("❌ Error capturando respuesta en FAQ:", error);
        await ctxFn.flowDynamic("Hubo un error procesando tu respuesta. Inténtalo de nuevo.");
    }
});

var faqFlow$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    faqFlow: faqFlow
});

const greetingFlow = addKeyword(EVENTS.ACTION).addAction(async (ctx, ctxFn) => {
    console.log(`🎉 Usuario ${ctx.from} ha llegado a greetingFlow.`);
    const welcomeMessage = "¡Hola! 👋 Soy Sami Bot, el asistente virtual de Grupo SAOM, y estoy aquí para ayudarte en lo que necesites. 😊\n";
    await ctxFn.flowDynamic(welcomeMessage);
    try {
        await ConversationManager.logInteraction(ctx, ctxFn.state, "assistant", welcomeMessage);
    }
    catch (error) {
        console.error("No se pudo registrar el mensaje del bot:", error);
    }
    console.log(`📌 Redirigiendo usuario ${ctx.from} a mainMenuFlow.`);
    return ctxFn.gotoFlow(mainMenuFlow);
});

var greetingFlow$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    greetingFlow: greetingFlow
});

const flow = createFlow([
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
    validationFlow,
    contactInfoFlow,
    contactInfoValidationFlow,
]);

const provider = createProvider(MetaProvider, {
    jwtToken: config.jwtToken,
    numberId: config.numberId,
    verifyToken: config.verifyToken,
    version: config.version,
});

const PORT = config.PORT ?? 3008;
const main = async () => {
    const { handleCtx, httpServer } = await createBot({
        flow: flow,
        provider: provider,
        database: new MemoryDB(),
    });
    httpServer(+PORT);
};
main();
