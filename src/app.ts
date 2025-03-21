import { createBot } from "@builderbot/bot";
import { MemoryDB as Database } from "@builderbot/bot";
import { flow } from "./bot/index";
import { poolPromise  } from "./database/db"; 
import { provider } from "./provider/index";
// import { aiServices } from "./services/aiServices";
import { config } from "./config";

// Función para verificar si un mensaje ya fue procesado
async function isMessageProcessed(ref: string, phone: string): Promise<boolean> {
  try {
    const [rows]: any = await poolPromise.query(
      "SELECT id FROM history WHERE ref = ? AND phone = ? LIMIT 1",
      [ref, phone]
    );
    return rows.length > 0;
  } catch (error) {
    console.error("Error verificando el historial:", error);
    // En caso de error, procesamos el mensaje para no bloquear la operación
    return false;
  }
}

const PORT = config.PORT ?? 3008;

const main = async () => {
  const { handleCtx, httpServer } = await createBot({
    flow: flow,
    provider: provider,
    database: new Database(),
    // database: adapterDatabase,
  });

  provider.server.post(
    '/v1/messages',
    handleCtx(async (bot, req, res) => {
      try {
        // Se espera que el request incluya un identificador único "ref"
        const { number, message, urlMedia, ref } = req.body;
        if (!ref) {
          console.error("Falta el campo 'ref' en el payload.");
          res.statusCode = 400;
          return res.end("Campo 'ref' es requerido.");
        }
        // Verificar si el mensaje ya fue procesado
        if (await isMessageProcessed(ref, number)) {
          console.log(`Mensaje con ref ${ref} para ${number} ya fue procesado, se ignora.`);
          return res.end('Mensaje duplicado, ignorado');
        }
        console.log(`Enviando mensaje a: ${number}`);
        await bot.sendMessage(number, message, { media: urlMedia || null });
        return res.end('sended');
      } catch (error) {
        console.error("Error enviando mensaje:", error);
        res.statusCode = 500;
        return res.end('error');
      }
    })
  );  

  provider.server.post(
    "/v1/register",
    handleCtx(async (bot, req, res) => {
      const { number, name } = req.body;
      await bot.dispatch("REGISTER_FLOW", { from: number, name });
      return res.end("trigger");
    })
  );

  provider.server.post(
    "/v1/samples",
    handleCtx(async (bot, req, res) => {
      const { number, name } = req.body;
      await bot.dispatch("SAMPLES", { from: number, name });
      return res.end("trigger");
    })
  );

  provider.server.post(
    "/v1/blacklist",
    handleCtx(async (bot, req, res) => {
      const { number, intent } = req.body;
      if (intent === "remove") bot.blacklist.remove(number);
      if (intent === "add") bot.blacklist.add(number);

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ status: "ok", number, intent }));
    })
  );

  // Endpoint de prueba: GET /v1/test
  provider.server.get(
    "/v1/test",
    handleCtx(async (bot, req, res) => {
      return res.end("Test endpoint funcionando correctamente");
    })
  );

  httpServer(+PORT);
};

main();
