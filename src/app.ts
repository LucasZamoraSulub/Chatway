import { createBot } from "@builderbot/bot";
import { MemoryDB as Database } from "@builderbot/bot";
import { provider } from "./provider";
import { config } from "./config";
import bot from "./bot";

const PORT = config.PORT;

const main = async () => {
    const { handleCtx, httpServer } = await createBot({
        flow: bot,
        provider: provider,
        database: new Database(),
    });

    httpServer(+PORT)
};

main();