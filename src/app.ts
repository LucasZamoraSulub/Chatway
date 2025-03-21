import { createBot } from "@builderbot/bot";
import { MemoryDB as Database } from "@builderbot/bot";
import { provider } from "./provider";
import { config } from "./config";
import bot from "./bot";

const PORT = config.PORT ?? 3008;

const main = async () => {
  const adapterFlow = bot;
  const adapterProvider = provider;
  const adapterDatabase = new Database();

  const { handleCtx, httpServer } = await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDatabase,
  });

  adapterProvider.server.post(
    '/v1/messages',
    handleCtx(async (bot, req, res) => {
      try {
        const { number, message, urlMedia } = req.body;
        // Se recomienda formatear el número de manera internacional (ejemplo para México: "5219981345236")
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
  

  adapterProvider.server.post(
    "/v1/register",
    handleCtx(async (bot, req, res) => {
      const { number, name } = req.body;
      await bot.dispatch("REGISTER_FLOW", { from: number, name });
      return res.end("trigger");
    })
  );

  adapterProvider.server.post(
    "/v1/samples",
    handleCtx(async (bot, req, res) => {
      const { number, name } = req.body;
      await bot.dispatch("SAMPLES", { from: number, name });
      return res.end("trigger");
    })
  );

  adapterProvider.server.post(
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
  adapterProvider.server.get(
    "/v1/test",
    handleCtx(async (bot, req, res) => {
      return res.end("Test endpoint funcionando correctamente");
    })
  );

  httpServer(+PORT);
};

main();
