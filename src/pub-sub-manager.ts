import { ServerWebSocket } from 'bun';

export type WSData = {
  id: string;
  createdAt: Date;
};

type ChannelContext = {
  subscribers: ServerWebSocket<WSData>[];
  messages: string[];
};

export class PubSubManager {
  private brokerId: Timer;
  private channels: Record<string, ChannelContext>;

  constructor() {
    this.channels = {};
    this.brokerId = setInterval(this.broker, 50);
  }

  subscribe = (channel: string, ws: ServerWebSocket<WSData>) => {
    if (!this.channels[channel]) {
      this.channels[channel] = {
        subscribers: [],
        messages: [],
      };
    }

    if (
      !this.channels[channel].subscribers.find((s) => s.data.id === ws.data.id)
    )
      this.channels[channel].subscribers.push(ws);
  };

  unSubscribe = (channel: string, ws: ServerWebSocket<WSData>) => {
    if (this.channels[channel])
      this.channels[channel].subscribers = this.channels[
        channel
      ].subscribers.filter((s) => s.data.id !== ws.data.id);
  };

  publish = (channel: string, message: string) => {
    this.channels[channel]?.messages.push(message);
  };

  onConnectionClose = (ws: ServerWebSocket<WSData>) => {
    Object.entries(this.channels).forEach(([_, context]) => {
      context.subscribers = context.subscribers.filter(
        (s) => s.data.id !== ws.data.id
      );
    });
  };

  broker = () => {
    Object.entries(this.channels).forEach(([channel, context]) => {
      if (context.messages.length > 0) {
        context.subscribers.forEach((subscriber) => {
          context.messages.forEach((message) => {
            subscriber.send(JSON.stringify({ message, channel }));
          });
        });
        context.messages = [];
      }
    });
  };

  close = () => {
    clearInterval(this.brokerId);
  };
}
