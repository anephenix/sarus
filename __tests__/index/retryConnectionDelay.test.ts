// File Dependencies
import Sarus from "../../src/index";
import { WS } from "jest-websocket-mock";

const url = "ws://localhost:1234";

const delay = (duration: number) =>
  new Promise(resolve => setTimeout(resolve, duration));
const condition = (func: Function) => {
  return new Promise(resolve => {
    let check: Function;
    check = () => {
      if (func()) return resolve();
      setTimeout(check, 10);
    };
    check();
  });
};

describe("retry connection delay", () => {
  describe("when passed as true", () => {
    it("should delay the reconnection attempt by 1 second", async () => {
      const server = new WS(url);
      const sarus = new Sarus({ url, retryConnectionDelay: true });
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
      expect(timeNow - timeThen).toBeGreaterThan(1000);
      expect(timeNow - timeThen).toBeLessThan(3000);
      newServer.close();
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
        expect(timeNow - timeThen).toBeGreaterThan(400);
        expect(timeNow - timeThen).toBeLessThan(1000);
        newServer.close();
      });
    });
  });
});
