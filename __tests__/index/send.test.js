// File Dependencies
const Sarus = require('../../index');
const { WS } = require('jest-websocket-mock');

const url = 'ws://localhost:1234';

describe('sending websocket messages', () => {
  it('should send a message to the WebSocket server', async () => {
    const server = new WS(url);
    const sarus = new Sarus({ url });
    await server.connected;
    sarus.send('Hello server');
    await expect(server).toReceiveMessage('Hello server');
    server.close();
  });
});
