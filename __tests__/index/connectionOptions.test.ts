// File Dependencies
import Sarus from "../../src/index";
import { WS } from "jest-websocket-mock";

const url = "ws://localhost:1234";
const stringProtocol = "hybi-00";
const arrayOfProtocols = ["hybi-07", "hybi-00"];

describe("connection options", () => {
  let server: WebSocket;

  beforeAll(() => {
    server = new WS(url);
  });

  afterAll(() => {
    server.close();
  });

  it("should set the WebSocket protocols value to an empty string if nothing is passed", async () => {
    const sarus = new Sarus({ url });
    await server.connected;
    expect(sarus.ws.protocols).toBe(undefined);
  });

  it("should set the WebSocket protocols value to a string if a string is passed", async () => {
    const sarus = new Sarus({ url, protocols: stringProtocol });
    await server.connected;
    expect(sarus.ws.protocol).toBe(stringProtocol);
  });

  it("should set the WebSocket protocols value to the first value in an array if an array is passed", async () => {
    const sarus = new Sarus({ url, protocols: arrayOfProtocols });
    await server.connected;
    expect(sarus.ws.protocol).toBe(arrayOfProtocols[0]);
  });
});
