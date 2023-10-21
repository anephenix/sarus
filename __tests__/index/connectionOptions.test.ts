// File Dependencies
import Sarus from "../../src/index";
import { WS } from "jest-websocket-mock";

const url: string = "ws://localhost:1234";
const stringProtocol: string = "hybi-00";
const arrayOfProtocols: Array<string> = ["hybi-07", "hybi-00"];
const binaryTypes: Array<BinaryType> = ["blob", "arraybuffer"];

describe("connection options", () => {
  let server: WS;

  beforeAll(() => {
    server = new WS(url);
  });

  afterAll(() => {
    server.close();
  });

  it("should correctly validate invalid WebSocket URLs", () => {
    // Testing with jest-websocket-mock will not give us a TypeError here.
    // We re-throw the error therefore. Testing it in a browser we can
    // see that a TypeError is handled correctly.
    expect(() => {
      new Sarus({ url: "invalid-url" });
    }).toThrow("invalid");

    expect(() => {
      new Sarus({ url: "http://wrong-protocol" });
    }).toThrow("have protocol");

    expect(() => {
      new Sarus({ url: "https://also-wrong-protocol" });
    }).toThrow("have protocol");

    new Sarus({ url: "ws://this-will-pass" });
    new Sarus({ url: "wss://this-too-shall-pass" });
  });

  it("should set the WebSocket protocols value to an empty string if nothing is passed", async () => {
    const sarus: Sarus = new Sarus({ url });
    await server.connected;
    expect(sarus.ws?.protocol).toBe("");
  });

  it("should set the WebSocket protocols value to a string if a string is passed", async () => {
    const sarus: Sarus = new Sarus({ url, protocols: stringProtocol });
    await server.connected;
    expect(sarus.ws?.protocol).toBe(stringProtocol);
  });

  it("should set the WebSocket protocols value to the first value in an array if an array is passed", async () => {
    const sarus: Sarus = new Sarus({ url, protocols: arrayOfProtocols });
    await server.connected;
    expect(sarus.ws?.protocol).toBe(arrayOfProtocols[0]);
  });

  it("should set the binaryType of the WebSocket, if passed as an option", async () => {
    const sarus: Sarus = new Sarus({ url, binaryType: binaryTypes[0] });
    await server.connected;
    expect(sarus.ws?.binaryType).toBe(binaryTypes[0]);
  });
});
