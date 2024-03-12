// File Dependencies
import Sarus from "../../src/index";
import { calculateRetryDelayFactor } from "../../src/index";
import type { ExponentialBackoffParams } from "../../src/index";
import { WS } from "jest-websocket-mock";
import { delay } from "../helpers/delay";

const url: string = "ws://localhost:1234";

describe("automatic reconnectivity", () => {
  it("should reconnect the WebSocket connection when it is severed", async () => {
    const server: WS = new WS(url);
    const mockConnect = jest.fn();
    const sarus: Sarus = new Sarus({ url });
    await server.connected;
    sarus.connect = mockConnect;
    const setTimeout = jest.spyOn(window, "setTimeout");
    server.close();
    await delay(1000);
    expect(sarus.connect).toBeCalled();
    expect(setTimeout).toHaveBeenCalledTimes(2);
  });

  it("should not reconnect if automatic reconnection is disabled", async () => {
    const server: WS = new WS(url);
    const mockConnect = jest.fn();
    const sarus: Sarus = new Sarus({
      url,
      reconnectAutomatically: false,
    });
    await server.connected;
    sarus.connect = mockConnect;
    server.close();
    expect(sarus.connect).toBeCalledTimes(0);
  });

  describe("if a websocket is closed and meant to reconnect automatically", () => {
    it("should remove all eventListeners on the closed websocket before reconnecting", async () => {
      const server: WS = new WS(url);
      const mockReconnect = jest.fn();
      const sarus: Sarus = new Sarus({
        url,
      });
      await server.connected;
      sarus.reconnect = mockReconnect;
      server.close();
      await delay(1000);
      expect(sarus.reconnect).toBeCalled();
      // @ts-ignore
      expect(sarus.ws?.listeners?.open?.length).toBe(0);
      // @ts-ignore
      expect(sarus.ws?.listeners?.message?.length).toBe(0);
      // @ts-ignore
      expect(sarus.ws?.listeners?.error?.length).toBe(0);
      // @ts-ignore
      expect(sarus.ws?.listeners?.close?.length).toBe(0);
    });
  });
});

describe("Exponential backoff", () => {
  describe("binary backoff", () => {
    // The initial delay shall be 1 s
    const initialDelay = 1000;
    const exponentialBackoffParams: ExponentialBackoffParams = {
      backoffRate: 2,
      // We put the ceiling at exactly 8000 ms
      backoffLimit: 8000,
    };
    expect(
      calculateRetryDelayFactor(exponentialBackoffParams, initialDelay, 0),
    ).toBe(1000);
    expect(
      calculateRetryDelayFactor(exponentialBackoffParams, initialDelay, 1),
    ).toBe(2000);
    expect(
      calculateRetryDelayFactor(exponentialBackoffParams, initialDelay, 2),
    ).toBe(4000);
    expect(
      calculateRetryDelayFactor(exponentialBackoffParams, initialDelay, 3),
    ).toBe(8000);
    expect(
      calculateRetryDelayFactor(exponentialBackoffParams, initialDelay, 4),
    ).toBe(8000);
  });
});
