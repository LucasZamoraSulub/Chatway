import { createBot } from "@builderbot/bot";
import { MemoryDB as Database } from "@builderbot/bot";
import { flow } from "./bot/index";
import  poolPromise from "./database/db";
import { provider } from "./provider/index";
// import { aiServices } from "./services/aiServices";
import { config } from "./config";
import logger from "./logger";

const PORT = config.PORT ?? 3008;

const main = async () => {
  const { handleCtx, httpServer } = await createBot({
    flow: flow,
    provider: provider,
    database: new Database(),
    // database: adapterDatabase,
  });

  // Función para manejar errores en el contexto
  // provider.server.use((req, res, next) => {
  //   logger.debug(`[${req.method}] ${req.url} - Body: ${JSON.stringify(req.body)}`);
  //   next();
  // });

  httpServer(+PORT);
};

main();
