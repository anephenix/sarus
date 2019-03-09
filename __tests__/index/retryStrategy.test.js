// File Dependencies
const Sarus = require('../../index');
const { WS } = require('jest-websocket-mock');

const url = 'ws://localhost:1234';

const delay = duration => new Promise(resolve => setTimeout(resolve, duration));
const condition = func => {
  return new Promise(resolve => {
    let check;
    check = () => {
      if (func()) return resolve();
      setTimeout(check, 10);
    };
    check();
  });
};

describe('retry strategy', () => {
  describe('when set to "fixed"', () => {
    it('should delay the reconnection attempt by 1 second', async () => {
      const server = new WS(url);
      const sarus = new Sarus({ url, retryStrategy: 'fixed' });
      await server.connected;
      server.close();
      await condition(() => {
        return sarus.ws.readyState === 3;
      });
      const timeThen = new Date();
      const newServer = new WS(url);
      await newServer.connected;
      expect(sarus.ws.readyState).toBe(1);
      const timeNow = new Date();
      expect(timeNow - timeThen).toBeGreaterThan(1000);
      expect(timeNow - timeThen).toBeLessThan(3000);
    });
  });
});
