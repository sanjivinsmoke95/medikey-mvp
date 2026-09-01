import { createHttpServer } from "./server";
import { createServerApp } from "../app/assemble";

/**
 * Entrypoint. Boots the env-driven adapter stack (Postgres/Redis when
 * DATABASE_URL/REDIS_URL are set, otherwise in-memory) behind the HTTP layer.
 * Set PORT to override (default 8788).
 */
const port = Number(process.env.PORT ?? 8788);

const app = await createServerApp();
const server = createHttpServer(app);

server.listen(port, () => {
  const store = process.env.DATABASE_URL ? "postgres" : "in-memory";
  const cache = process.env.REDIS_URL ? "redis" : "in-memory";
  // eslint-disable-next-line no-console
  console.log(`MediKey API + owner console → http://localhost:${port}  (store: ${store}, cache: ${cache})`);
  // eslint-disable-next-line no-console
  console.log(`Scanner emergency page → http://localhost:${port}/e/<opaque-id>`);
});
