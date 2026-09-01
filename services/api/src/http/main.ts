import { createHttpServer } from "./server";

/**
 * Local-first entrypoint. Boots the in-memory/local adapter stack (createApp)
 * behind the HTTP layer. Set PORT to override (default 8788). Production swaps
 * the adapters behind the ports — this entrypoint does not change.
 */
const port = Number(process.env.PORT ?? 8788);
const server = createHttpServer();

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`MediKey API + owner console → http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`Scanner emergency page → http://localhost:${port}/e/<opaque-id>`);
});
