// File Dependencies
import Sarus from "../../src/index";
import { WS } from "jest-websocket-mock";
import { calculateRetryDelayFactor } from "../../src/index";
import type { ExponentialBackoffParams } from "../../src/index";

const url = "ws://localhost:1234";

const condition = (func: Function) => {
  return new Promise<void>((resolve) => {
    let check: Function;
    check = () => {
      if (func()) return resolve();
      setTimeout(check, 10);
    };
    check();
  });
};

describe("retry connection delay", () => {
  describe("by default", () => {
    it("should delay the reconnection attempt by 1 second", async () => {
      const server = new WS(url);
      const sarus = new Sarus({ url });
      await server.connected;
      server.close();
      await condition(() => {
        return sarus.ws?.readyState === 3;
      });
      const timeThen: any = new Date();
      const newServer = new WS(url);
      await newServer.connected;
      await condition(() => {
        return sarus.ws?.readyState === 1;
      });
      const timeNow: any = new Date();
      expect(timeNow - timeThen).toBeGreaterThanOrEqual(1000);
      expect(timeNow - timeThen).toBeLessThan(3000);
      return newServer.close();
    });

    describe("when passed as a number", () => {
      it("should delay the reconnection attempt by that number", async () => {
        const server = new WS(url);
        const sarus = new Sarus({ url, retryConnectionDelay: 500 });
        await server.connected;
        server.close();
        await condition(() => {
          return sarus.ws?.readyState === 3;
        });
        const timeThen: any = new Date();
        const newServer = new WS(url);
        await newServer.connected;
        await condition(() => {
          return sarus.ws?.readyState === 1;
        });
        expect(sarus.ws?.readyState).toBe(1);
        const timeNow: any = new Date();
        expect(timeNow - timeThen).toBeGreaterThanOrEqual(400);
        expect(timeNow - timeThen).toBeLessThan(1000);
        return newServer.close();
      });
    });
  });
});

describe("Exponential backoff delay", () => {
  describe("with rate 2, backoffLimit 8000 ms", () => {
    // The initial delay shall be 1 s
    const initialDelay = 1000;
    const exponentialBackoffParams: ExponentialBackoffParams = {
      backoffRate: 2,
      // We put the ceiling at exactly 8000 ms
      backoffLimit: 8000,
    };
    it("will never be more than 8000 ms with rate set to 2", () => {
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

    it("should delay reconnection attempts exponentially", async () => {
      const webSocketSpy = jest.spyOn(global, "WebSocket" as any);
      webSocketSpy.mockImplementation(() => {});
      const setTimeoutSpy = jest.spyOn(global, "setTimeout");
      const sarus = new Sarus({
        url,
        exponentialBackoff: exponentialBackoffParams,
      });
      expect(sarus.state).toStrictEqual({
        kind: "connecting",
        failedConnectionAttempts: 0,
      });
      let instance: WebSocket;
      [instance] = webSocketSpy.mock.instances;
      if (!instance.onopen) {
        throw new Error();
      }
      instance.onopen(new Event("open"));
      if (!instance.onclose) {
        throw new Error();
      }
      instance.onclose(new CloseEvent("close"));

      let cb: Sarus["connect"];
      // We iteratively call sarus.connect() and let it fail, seeing
      // if it reaches 8000 as a delay and stays there
      const attempts: [number, number][] = [
        [1000, 1],
        [2000, 2],
        [4000, 3],
        [8000, 4],
        [8000, 5],
      ];
      attempts.forEach(([delay, failedAttempts]: [number, number]) => {
        const call =
          setTimeoutSpy.mock.calls[setTimeoutSpy.mock.calls.length - 1];
        if (!call) {
          throw new Error();
        }
        expect(call[1]).toBe(delay);
        cb = call[0];
        cb();
        instance =
          webSocketSpy.mock.instances[webSocketSpy.mock.instances.length - 1];
        if (!instance.onclose) {
          throw new Error();
        }
        instance.onclose(new CloseEvent("close"));
        expect(sarus.state).toStrictEqual({
          kind: "connecting",
          failedConnectionAttempts: failedAttempts,
        });
      });
    });
  });
});
