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
    // Since Sarus jumps into connecting directly, 1 connection attempt is made
    // right in the beginning, but none have failed
    expect(sarus.state).toStrictEqual({
      kind: "connecting",
      failedConnectionAttempts: 0,
    });

    // We wait until we are connected, and see a "connected" state
    await server.connected;
    expect(sarus.state.kind).toBe("connected");

    // When the connection drops, the state will be "closed"
    server.close();
    await server.closed;
    expect(sarus.state).toStrictEqual({
      kind: "closed",
    });

    // We wait a while, and the status is "connecting" again
    await delay(1);
    // In the beginning, no connection attempts have been made, since in the
    // case of a closed connection, we wait a bit until we try to connect again.
    expect(sarus.state).toStrictEqual({
      kind: "connecting",
      failedConnectionAttempts: 0,
    });

    // We restart the server and let the Sarus instance reconnect:
    server = new WS(url);

    // When we connect in our mock server, we are "connected" again
    await server.connected;
    expect(sarus.state.kind).toBe("connected");

    // Cleanup
    server.close();
  });

  it("cycles through disconnect() correctly", async () => {
    let server: WS = new WS(url);

    // Same initial state transition as above
    const sarus: Sarus = new Sarus(sarusConfig);
    expect(sarus.state.kind).toBe("connecting");
    await server.connected;
    expect(sarus.state.kind).toBe("connected");

    // The user can disconnect and the state will be "disconnected"
    sarus.disconnect();
    expect(sarus.state.kind).toBe("disconnected");
    await server.closed;

    // The user can now reconnect, and the state will be "connecting", and then
    // "connected" again
    sarus.connect();
    expect(sarus.state.kind).toBe("connecting");
    await server.connected;
    // XXX for some reason the test will fail without waiting 10 ms here
    await delay(10);
    expect(sarus.state.kind).toBe("connected");
    server.close();
  });
});
