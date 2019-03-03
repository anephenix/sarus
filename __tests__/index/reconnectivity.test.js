// File Dependencies
const Sarus = require('../../index');
const { WS } = require('jest-websocket-mock');

const url = 'ws://localhost:1234';

describe('automatic reconnectivity', () => {
  it('should reconnect the WebSocket connection when it is severed', async () => {
    const server = new WS(url);
    const mockConnect = jest.fn();
    const sarus = new Sarus({ url });
    await server.connected;
    sarus.connect = mockConnect;
    server.close();
    expect(sarus.connect).toBeCalled();
  });

  it('should not reconnect if automatic reconnection is disabled', async () => {
    const server = new WS(url);
    const mockConnect = jest.fn();
    const sarus = new Sarus({
      url,
      reconnectAutomatically: false
    });
    await server.connected;
    sarus.connect = mockConnect;
    server.close();
    expect(sarus.connect).toBeCalledTimes(0);
  });
});
