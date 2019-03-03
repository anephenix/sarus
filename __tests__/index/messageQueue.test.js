// File Dependencies
const Sarus = require('../../index');
const { WS } = require('jest-websocket-mock');

const url = 'ws://localhost:1234';

describe('message queue', () => {
  //Implement message queue with in-memory as default
  it('should queue messages for delivery', async () => {
    const server = new WS(url);
    const sarus = new Sarus({ url });
    await server.connected;
    sarus.send('Hello server');
    await expect(server).toReceiveMessage('Hello server');
    sarus.ws.close();
    sarus.send('Hello again');
    await server.connected;
    await expect(server).toReceiveMessage('Hello again');
    server.close();
  });

  it('should queue messages for delivery when server is offline for a bit', async () => {
    const server = new WS(url);
    const sarus = new Sarus({ url });
    await server.connected;
    sarus.send('Hello server');
    await expect(server).toReceiveMessage('Hello server');
    server.close();
    sarus.send('Hello again');
    sarus.send('Here is another message');
    expect(sarus.messages).toEqual(['Hello again', 'Here is another message']);
    const newServer = new WS(url);
    const messageOne = await server.nextMessage;
    const messageTwo = await server.nextMessage;
    expect(messageOne).toBe('Hello again');
    expect(messageTwo).toBe('Here is another message');
    expect(sarus.messages).toEqual([]);
    newServer.close();
  });

  it('should allow the developer to provide a custom retryProcessTimePeriod', () => {
    const sarus = new Sarus({ url, retryProcessTimePeriod: 25 });
    expect(sarus.retryProcessTimePeriod).toBe(25);
  });

  it('should throw an error if the retryProcessTimePeriod is not a number', () => {
    const initializeBadConfig = () => {
      return new Sarus({ url, retryProcessTimePeriod: '10' });
    };
    expect(initializeBadConfig).toThrowError();
  });

  it('should allow the developer to use sessionStorage for storing messages', async () => {
    sessionStorage.clear();
    const server = new WS(url);
    const sarus = new Sarus({ url, storageType: 'session' });
    expect(sarus.storageType).toBe('session');
    await server.connected;
    sarus.send('Hello server');
    await expect(server).toReceiveMessage('Hello server');
    server.close();
    sarus.send('Hello again');
    sarus.send('Here is another message');
    expect(sarus.messages).toEqual(['Hello again', 'Here is another message']);
    const newServer = new WS(url);
    const messageOne = await server.nextMessage;
    const messageTwo = await server.nextMessage;
    expect(sarus.messages).toEqual([]);
    expect(messageOne).toBe('Hello again');
    expect(messageTwo).toBe('Here is another message');
    newServer.close();
  });

  it('should allow the developer to use localStorage for storing messages', async () => {
    localStorage.clear();
    const server = new WS(url);
    const sarus = new Sarus({ url, storageType: 'local' });
    expect(sarus.storageType).toBe('local');
    await server.connected;
    sarus.send('Hello server');
    await expect(server).toReceiveMessage('Hello server');
    server.close();
    sarus.send('Hello again');
    sarus.send('Here is another message');
    expect(sarus.messages).toEqual(['Hello again', 'Here is another message']);
    const newServer = new WS(url);
    const messageOne = await server.nextMessage;
    const messageTwo = await server.nextMessage;
    expect(sarus.messages).toEqual([]);
    expect(messageOne).toBe('Hello again');
    expect(messageTwo).toBe('Here is another message');
    newServer.close();
  });

  it('should allow the developer to use a custom storageKey', () => {
    const sarus = new Sarus({
      url,
      storageType: 'local',
      storageKey: 'sarusWS'
    });
    expect(sarus.storageKey).toBe('sarusWS');
  });

  it('should load any existing messages from previous sessionStorage on initialization', () => {
    let sarusOne = new Sarus({ url, storageType: 'session' });
    sarusOne.send('Hello world');
    sarusOne.send('Hello again');
    sarusOne.__proto__ = null;
    sarusOne = null;
    const sarusTwo = new Sarus({ url, storageType: 'session' });
    expect(sarusTwo.messages).toEqual(['Hello world', 'Hello again']);
  });

  it('should load any existing messages from previous localStorage on initialization', () => {
    let sarusOne = new Sarus({ url, storageType: 'local' });
    sarusOne.send('Hello world');
    sarusOne.send('Hello again');
    sarusOne.__proto__ = null;
    sarusOne = null;
    const sarusTwo = new Sarus({ url, storageType: 'local' });
    expect(sarusTwo.messages).toEqual(['Hello world', 'Hello again']);
  });
});
