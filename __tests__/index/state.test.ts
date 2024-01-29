// File Dependencies
import Sarus from "../../src/index";
import { WS } from "jest-websocket-mock";
import { delay } from "../helpers/delay";

const url: string = "ws://localhost:1234";
const sarusConfig = {
  url,
  retryConnectionDelay: 1,
};

describe("state machine", () => {
  it("cycles through a closed connection correctly", async () => {
    let server: WS = new WS(url);

    // In the beginning, the state is "connecting"
    const sarus: Sarus = new Sarus(sarusConfig);
    expect(sarus.state).toBe("connecting");

    // We wait until we are connected, and see a "connected" state
    await server.connected;
    expect(sarus.state).toBe("connected");

    // When the connection drops, the state will be "closed"
    server.close();
    await server.closed;
    expect(sarus.state).toBe("closed");

    // Restart server
    server = new WS(url);

    // We wait a while, and the status is "connecting" again
    await delay(1);
    expect(sarus.state).toBe("connecting");

    // When we connect in our mock server, we are "connected" again
    await server.connected;
    expect(sarus.state).toBe("connected");

    // Cleanup
    server.close();
  });

  it("cycles through disconnect() correctly", async () => {
    let server: WS = new WS(url);

    // Same initial state transition as above
    const sarus: Sarus = new Sarus(sarusConfig);
    expect(sarus.state).toBe("connecting");
    await server.connected;
    expect(sarus.state).toBe("connected");

    // The user can disconnect and the state will be "disconnected"
    sarus.disconnect();
    expect(sarus.state).toBe("disconnected");
    await server.closed;

    // The user can now reconnect, and the state will be "connecting", and then
    // "connected" again
    sarus.connect();
    expect(sarus.state).toBe("connecting");
    await server.connected;
    // XXX for some reason the test will fail without waiting 10 ms here
    await delay(10);
    expect(sarus.state).toBe("connected");
    server.close();
  });
});
