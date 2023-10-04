import { PubSubManager, WSData } from "./pub-sub-manager";

type WsMessage =
  | {
      type: "subscribe";
      channel: string;
    }
  | {
      type: "unsubscribe";
      channel: string;
    }
  | {
      type: "publish";
      channel: string;
      message: string;
    };

const host = "0.0.0.0";
const port = 1337;

const manager = new PubSubManager();

Bun.serve<WSData>({
  hostname: host,
  port: port,
  fetch: (req, server) => {
    const clientId = crypto.randomUUID();
    server.upgrade(req, {
      data: {
        id: clientId,
        createdAt: Date(),
      },
    });
    return new Response("Upgrade Failed", { status: 500 });
  },
  websocket: {
    open(ws) {
      console.debug(`Client connected: ${ws.data.id}`);
    },
    message: (ws, message) => {
      const payload = JSON.parse(message as string) as WsMessage;

      switch (payload.type) {
        case "subscribe":
          manager.subscribe(payload.channel, ws);
          break;
        case "unsubscribe":
          manager.unSubscribe(payload.channel, ws);
          break;
        case "publish":
          manager.publish(payload.channel, payload.message);
          break;
      }
    },
    close(ws) {
      console.debug(`Closing connection with client: ${ws.data.id}`);
      manager.onConnectionClose(ws);
    },
  },
});

process.on("beforeExit", () => {
  manager.close();
});

console.debug(`Listening on ws://${host}:${port}`);
