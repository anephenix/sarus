// File Dependencies
import Sarus from "../../src/index";
import { WS } from "jest-websocket-mock";

const url = "ws://localhost:1234";

describe("disconnecting the WebSocket connection", () => {
  it("should disconnect from the WebSocket server, and disable automatic reconnections", async () => {
    const server: WS = new WS(url);
    const sarus: Sarus = new Sarus({ url, reconnectAutomatically: true });
    const mockReconnect = jest.fn();
    sarus.reconnect = mockReconnect;
    await server.connected;
    sarus.disconnect();
    expect(sarus.reconnectAutomatically).toBe(false);
    await server.closed;
    expect(sarus.ws?.readyState).toBe(3);
    expect(sarus.reconnect).toHaveBeenCalledTimes(0);
    server.close();
  });

  it("should allow the developer to override disabling automatica reconnections", async () => {
    const server: WS = new WS(url);
    const sarus: Sarus = new Sarus({ url, reconnectAutomatically: true });
    const mockReconnect = jest.fn();
    sarus.reconnect = mockReconnect;
    await server.connected;
    sarus.disconnect(true);
    expect(sarus.reconnectAutomatically).toBe(true);
    await server.closed;
    expect(sarus.reconnect).toHaveBeenCalledTimes(1);
    server.close();
  });
});
