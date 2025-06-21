// File Dependencies
import Sarus, { type SarusClassParams } from "../../src/index";
import { WS } from "jest-websocket-mock";
import { delay } from "../helpers/delay";

const url: string = "ws://localhost:1234";

describe("message queue", () => {
  //Implement message queue with in-memory as default
  it("should queue messages for delivery", async () => {
    const server: WS = new WS(url);
    const sarus: Sarus = new Sarus({ url });
    await server.connected;
    sarus.send("Hello server");
    await expect(server).toReceiveMessage("Hello server");
    sarus.ws?.close();
    sarus.send("Hello again");
    await delay(1000);
    await server.connected;
    await expect(server).toReceiveMessage("Hello again");
    await server.close();
  });

  it("should queue messages for delivery when server is offline for a bit", async () => {
    const server: WS = new WS(url);
    const sarus: Sarus = new Sarus({ url });
    await server.connected;
    sarus.send("Hello server");
    await expect(server).toReceiveMessage("Hello server");
    await server.close();
    sarus.send("Hello again");
    sarus.send("Here is another message");
    expect(sarus.storageType).toEqual("memory");
    expect(sarus.messages).toEqual(["Hello again", "Here is another message"]);
    const newServer = new WS(url);
    await newServer.connected;
    const messageOne = await newServer.nextMessage;
    const messageTwo = await newServer.nextMessage;
    expect(messageOne).toBe("Hello again");
    expect(messageTwo).toBe("Here is another message");
    expect(sarus.messages).toEqual([]);
    await newServer.close();
  });

  it("should allow the developer to provide a custom retryProcessTimePeriod", () => {
    const sarus: Sarus = new Sarus({ url, retryProcessTimePeriod: 25 });
    expect(sarus.retryProcessTimePeriod).toBe(25);
  });

  const applyStorageTest = async (
    storageType: Storage,
    sarusConfig: SarusClassParams,
  ) => {
    storageType.clear();
    const server: WS = new WS(url);
    const sarus: Sarus = new Sarus(sarusConfig);
    expect(sarus.storageType).toBe(sarusConfig.storageType);
    await server.connected;
    sarus.send("Hello server");
    await expect(server).toReceiveMessage("Hello server");
    await server.close();
    sarus.send("Hello again");
    sarus.send("Here is another message");
    expect(sarus.messages).toEqual(["Hello again", "Here is another message"]);
    const newServer = new WS(url);
    await newServer.connected;
    const messageOne = await newServer.nextMessage;
    const messageTwo = await newServer.nextMessage;
    expect(sarus.messages).toEqual([]);
    expect(messageOne).toBe("Hello again");
    expect(messageTwo).toBe("Here is another message");
    await newServer.close();
  };

  it("should allow the developer to use sessionStorage for storing messages", async () => {
    await applyStorageTest(sessionStorage, { url, storageType: "session" });
  });

  it("should allow the developer to use localStorage for storing messages", async () => {
    await applyStorageTest(localStorage, { url, storageType: "local" });
  });

  it("should allow the developer to use a custom storageKey", () => {
    const sarus: Sarus = new Sarus({
      url,
      storageType: "local",
      storageKey: "sarusWS",
    });
    expect(sarus.storageKey).toBe("sarusWS");
  });

  const retrieveMessagesFromStorage = (sarusConfig: SarusClassParams) => {
    const sarusOne: Sarus = new Sarus(sarusConfig);
    expect(sarusOne.messages).toEqual([]);
    sarusOne.send("Hello world");
    sarusOne.send("Hello again");
    sarusOne.disconnect();
    const sarusTwo: Sarus = new Sarus(sarusConfig);
    expect(sarusTwo.messages).toEqual(["Hello world", "Hello again"]);
    return sarusTwo;
  };

  const processExistingMessagesFromStorage = async (
    sarusConfig: SarusClassParams,
  ) => {
    const sarusTwo = retrieveMessagesFromStorage(sarusConfig);
    const server: WS = new WS(url);
    const messageOne = await server.nextMessage;
    const messageTwo = await server.nextMessage;
    expect(sarusTwo.messages).toEqual([]);
    expect(messageOne).toBe("Hello world");
    expect(messageTwo).toBe("Hello again");
    await server.close();
  };

  it("should load any existing messages from previous sessionStorage on initialization", () => {
    retrieveMessagesFromStorage({ url, storageType: "session" });
    sessionStorage.clear();
  });

  it("should load any existing messages from previous localStorage on initialization", () => {
    retrieveMessagesFromStorage({ url, storageType: "local" });
    localStorage.clear();
  });

  it("should process any existing messages from previous sessionStorage on initialization", async () => {
    await processExistingMessagesFromStorage({
      url,
      storageType: "session",
      reconnectAutomatically: true,
    });
  });

  it("should process any existing messages from previous localStorage on initialization", async () => {
    await processExistingMessagesFromStorage({
      url,
      storageType: "local",
      reconnectAutomatically: true,
    });
  });

  it("should queue and deliver ArrayBuffer messages", async () => {
    const server: WS = new WS(url);
    const sarus: Sarus = new Sarus({ url });
    await server.connected;
    const buffer = new Uint8Array([1, 2, 3, 4]).buffer;
    sarus.send(buffer);
    const received = await server.nextMessage;
    // WebSocket mock returns ArrayBuffer for binary
    expect(received instanceof ArrayBuffer).toBe(true);
    expect(new Uint8Array(received as ArrayBuffer)).toEqual(
      new Uint8Array([1, 2, 3, 4]),
    );
    await server.close();
  });

  it("should queue and deliver Uint8Array messages", async () => {
    const server: WS = new WS(url);
    const sarus: Sarus = new Sarus({ url });
    await server.connected;
    const arr = new Uint8Array([5, 6, 7, 8]);
    sarus.send(arr);
    const received = await server.nextMessage;
    // Always expect ArrayBuffer for binary
    // Just check that it can be wrapped and matches
    expect(new Uint8Array(received as ArrayBuffer)).toEqual(arr);
    await server.close();
  });

  it("should persist and restore ArrayBuffer messages in localStorage", async () => {
    localStorage.clear();
    const sarus: Sarus = new Sarus({ url, storageType: "local" });
    const buffer = new Uint8Array([9, 10, 11]).buffer;
    sarus.send(buffer);
    sarus.disconnect();
    // Simulate page reload
    const sarus2: Sarus = new Sarus({ url, storageType: "local" });
    expect(sarus2.messages.length).toBe(1);
    expect(new Uint8Array(sarus2.messages[0] as ArrayBuffer)).toEqual(
      new Uint8Array([9, 10, 11]),
    );
    localStorage.clear();
  });

  it("should persist and restore Uint8Array messages in sessionStorage", async () => {
    sessionStorage.clear();
    const sarus: Sarus = new Sarus({ url, storageType: "session" });
    const arr = new Uint8Array([12, 13, 14]);
    sarus.send(arr);
    sarus.disconnect();
    // Simulate page reload
    const sarus2: Sarus = new Sarus({ url, storageType: "session" });
    expect(sarus2.messages.length).toBe(1);
    expect(new Uint8Array(sarus2.messages[0] as ArrayBuffer)).toEqual(arr);
    sessionStorage.clear();
  });

  // Ensure mock server is closed between tests to avoid port conflicts
  afterEach(() => {
    WS.clean();
    localStorage.clear();
    sessionStorage.clear();
  });
});
