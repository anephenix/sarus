// File Dependencies
import Sarus from "../../src/index";
import { WS } from "jest-websocket-mock";

const url: string = "ws://localhost:1234";

describe("sending websocket messages", () => {
  it("should send a message to the WebSocket server", async () => {
    const server: WS = new WS(url);
    const sarus: Sarus = new Sarus({ url });
    await server.connected;
    sarus.send("Hello server");
    await expect(server).toReceiveMessage("Hello server");
    server.close();
  });
});
