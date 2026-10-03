import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { scanOnce, getAgentSnapshot } from "@/engine/agent";
import type { WsFeedEvent } from "@/types";

const port = Number(process.env.NEXT_PUBLIC_WS_PORT ?? 8787);
const intervalMs = Number(process.env.SCAN_INTERVAL_MS ?? 15_000);

const httpServer = createServer();
const wss = new WebSocketServer({ server: httpServer });

function broadcast(event: WsFeedEvent): void {
  const encoded = JSON.stringify(event);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(encoded);
    }
  }
}

function send(socket: WebSocket, event: WsFeedEvent): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(event));
  }
}

wss.on("connection", (socket) => {
  send(socket, {
    type: "snapshot",
    payload: getAgentSnapshot(),
    ts: Date.now(),
  });
});

async function tick(): Promise<void> {
  try {
    const snapshot = await scanOnce();
    broadcast({
      type: "scan",
      payload: snapshot.opportunities,
      ts: Date.now(),
    });
    broadcast({
      type: "snapshot",
      payload: snapshot,
      ts: Date.now(),
    });
  } catch (error) {
    broadcast({
      type: "halt",
      payload: { reason: error instanceof Error ? error.message : String(error) },
      ts: Date.now(),
    });
  }
}

setInterval(() => {
  broadcast({ type: "heartbeat", payload: getAgentSnapshot(), ts: Date.now() });
}, 5_000);

void tick();
setInterval(() => {
  void tick();
}, intervalMs);

httpServer.listen(port, () => {
  console.info(`[vivaclaw] yield feed listening on ws://localhost:${port}`);
});
