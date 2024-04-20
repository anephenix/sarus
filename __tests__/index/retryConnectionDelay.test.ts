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
    const exponentialBackoff: ExponentialBackoffParams = {
      backoffRate: 2,
      // We put the ceiling at exactly 8000 ms
      backoffLimit: 8000,
    };
    const attempts: [number, number][] = [
      [1000, 0],
      [2000, 1],
      [4000, 2],
      [8000, 3],
      [8000, 4],
    ];
    it("will never be more than 8000 ms with rate set to 2", () => {
      attempts.forEach(([delay, failedAttempts]) => {
        expect(
          calculateRetryDelayFactor(
            exponentialBackoff,
            initialDelay,
            failedAttempts,
          ),
        ).toBe(delay);
      });
    });

    it("should delay reconnection attempts exponentially", async () => {
      // Somehow we need to convincen typescript here that "WebSocket" is
      // totally valid. Could be because it doesn't assume WebSocket is part of
      // global / the index key is missing
      const webSocketSpy = jest.spyOn(global, "WebSocket" as any);
      webSocketSpy.mockImplementation(() => {});
      const setTimeoutSpy = jest.spyOn(global, "setTimeout");
      const sarus = new Sarus({ url, exponentialBackoff });
      expect(sarus.state).toStrictEqual({
        kind: "connecting",
        failedConnectionAttempts: 0,
      });
      let instance: WebSocket;
      // Get the first WebSocket instance, and ...
      [instance] = webSocketSpy.mock.instances;
      if (!instance.onopen) {
        throw new Error();
      }
      // tell the sarus instance that it is open, and ...
      instance.onopen(new Event("open"));
      if (!instance.onclose) {
        throw new Error();
      }
      // close it immediately
      instance.onclose(new CloseEvent("close"));
      expect(sarus.state).toStrictEqual({
        kind: "closed",
        failedConnectionAttempts: 0,
      });

      let cb: Sarus["connect"];
      // We iteratively call sarus.connect() and let it fail, seeing
      // if it reaches 8000 as a delay and stays there
      attempts.forEach(([delay, failedAttempts]) => {
        const call =
          setTimeoutSpy.mock.calls[setTimeoutSpy.mock.calls.length - 1];
        if (!call) {
          throw new Error();
        }
        // Make sure that setTimeout was called with the correct delay
        expect(call[1]).toBe(delay);
        cb = call[0];
        cb();
        // Get the most recent WebSocket instance
        instance =
          webSocketSpy.mock.instances[webSocketSpy.mock.instances.length - 1];
        if (!instance.onclose) {
          throw new Error();
        }
        instance.onclose(new CloseEvent("close"));
        expect(sarus.state).toStrictEqual({
          kind: "connecting",
          failedConnectionAttempts: failedAttempts + 1,
        });
      });
    });
  });
});
