// File Dependencies
import Sarus from "../../src/index";
import { WS } from "jest-websocket-mock";

const url = "ws://localhost:1234";

describe("eventListeners", () => {
  it("should bind eventListeners that are passed during initialization", async () => {
    const server: WS = new WS("ws://localhost:1234");
    const mockOpen = jest.fn();
    const mockParseMessage = jest.fn();
    const mockClose = jest.fn();
    const mockError = jest.fn();
    new Sarus({
      url,
      eventListeners: {
        open: [mockOpen],
        message: [mockParseMessage],
        close: [mockClose],
        error: [mockError],
      },
    });
    await server.connected;
    expect(mockOpen).toHaveBeenCalledTimes(1);
    server.send("hello world");
    expect(mockParseMessage).toHaveBeenCalledTimes(1);
    server.error();
    expect(mockError).toHaveBeenCalledTimes(1);
    server.close();
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("should prefill any missing eventListener events during initialization", () => {
    const myFunc: () => void = () => {};
    const sarus: Sarus = new Sarus({
      url,
      eventListeners: {
        open: [],
        error: [],
        close: [],
        message: [myFunc],
      },
    });
    expect(sarus.eventListeners.open).toEqual([]);
    expect(sarus.eventListeners.message).toEqual([myFunc]);
    expect(sarus.eventListeners.close).toEqual([]);
    expect(sarus.eventListeners.error).toEqual([]);
  });

  it("should allow an eventListener object to pass in some events but omit others", () => {
    const myFunc: () => void = () => {};
    const sarus: Sarus = new Sarus({
      url,
      eventListeners: {
        message: [myFunc],
      },
    });
    expect(sarus.eventListeners.open).toEqual([]);
    expect(sarus.eventListeners.message).toEqual([myFunc]);
    expect(sarus.eventListeners.close).toEqual([]);
    expect(sarus.eventListeners.error).toEqual([]);
  });

  it("should prevent an event being added multiple times to an event listener", () => {
    const myFunc = () => {};
    const sarus = new Sarus({
      url,
      eventListeners: {
        open: [],
        error: [],
        close: [],
        message: [myFunc],
      },
    });

    const addAnExistingListener = () => {
      sarus.on("message", myFunc);
    };
    expect(addAnExistingListener).toThrow();
  });

  it("should allow an event listener to be added after initialization", () => {
    const myFunc: () => void = () => {};
    const anotherFunc: () => void = () => {};
    const sarus: Sarus = new Sarus({
      url,
      eventListeners: {
        open: [],
        error: [],
        close: [],
        message: [myFunc],
      },
    });

    sarus.on("message", anotherFunc);
    expect(sarus.eventListeners.message).toEqual([myFunc, anotherFunc]);
  });

  it("should bind any added event listeners after initialization to the WebSocket", async () => {
    const server: WS = new WS(url);
    const myFunc = jest.fn();
    const anotherFunc = jest.fn();
    const sarus: Sarus = new Sarus({
      url,
      eventListeners: {
        open: [],
        error: [],
        close: [],
        message: [myFunc],
      },
    });
    await server.connected;
    server.send("hello world");
    expect(myFunc).toHaveBeenCalledTimes(1);
    sarus.on("message", anotherFunc);
    expect(sarus.eventListeners.message).toEqual([myFunc, anotherFunc]);
    server.send("hello world");
    expect(myFunc).toHaveBeenCalledTimes(2);
    expect(anotherFunc).toHaveBeenCalledTimes(1);
    server.close();
  });

  it("should allow an event listener to be removed by passing the function name", () => {
    const myFunc: () => void = () => {};
    const sarus: Sarus = new Sarus({
      url,
      eventListeners: {
        open: [],
        error: [],
        close: [],
        message: [myFunc],
      },
    });

    sarus.off("message", myFunc.name);
    expect(sarus.eventListeners.message).toEqual([]);
  });

  it("should allow an event listener to be removed by passing the function", () => {
    const myFunc: () => void = () => {};
    const sarus: Sarus = new Sarus({
      url,
      eventListeners: {
        open: [],
        error: [],
        close: [],
        message: [myFunc],
      },
    });

    sarus.off("message", myFunc);
    expect(sarus.eventListeners.message).toEqual([]);
  });

  it("should throw an error if a function cannot be found when trying to remove it from an event listener", () => {
    const myFunc: () => void = () => {};
    const anotherFunc: () => void = () => {};
    const sarus: Sarus = new Sarus({
      url,
      eventListeners: {
        open: [],
        error: [],
        close: [],
        message: [myFunc],
      },
    });

    const removeANonExistentListener = () => {
      sarus.off("message", anotherFunc);
    };
    expect(removeANonExistentListener).toThrow();
  });

  it("should throw an error if a function name cannot be found when trying to remove it from an event listener", () => {
    const myFunc: () => void = () => {};
    const anotherFunc: () => void = () => {};
    const sarus: Sarus = new Sarus({
      url,
      eventListeners: {
        open: [],
        error: [],
        close: [],
        message: [myFunc],
      },
    });

    const removeANonExistentListener = () => {
      sarus.off("message", anotherFunc.name);
    };
    expect(removeANonExistentListener).toThrow();
  });

  it("should not throw an error, if a function cannot be found when trying to remove it from an event listener, and additional doNotThrowError is passed", () => {
    const myFunc: () => void = () => {};
    const anotherFunc: () => void = () => {};
    const sarus: Sarus = new Sarus({
      url,
      eventListeners: {
        open: [],
        error: [],
        close: [],
        message: [myFunc],
      },
    });

    sarus.off("message", anotherFunc, { doNotThrowError: true });
  });
});
