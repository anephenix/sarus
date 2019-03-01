// File Dependencies
const Sarus = require('../index');
const { WS } = require('jest-websocket-mock');

const url = 'ws://localhost:1234';

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

it('should bind eventListeners that are passed during initialization', async () => {
  const server = new WS('ws://localhost:1234');
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
      error: [mockError]
    }
  });
  await server.connected;
  expect(mockOpen).toBeCalledTimes(1);
  server.send('hello world');
  expect(mockParseMessage).toBeCalledTimes(1);
  server.error();
  expect(mockError).toBeCalledTimes(1);
  server.close();
  expect(mockClose).toBeCalledTimes(1);
});

it('should prevent invalid eventListener names being passed during initialization', () => {
  const initializeBadConfig = () => {
    return new Sarus({
      url,
      eventListeners: {
        // There isn't a connect event on a WebSocket client, so an error should be thrown
        connect: []
      }
    });
  };
  expect(initializeBadConfig).toThrowError();
});

it('should prevent invalid eventListener lists being passed during initialization', () => {
  const initializeBadConfig = () => {
    return new Sarus({
      url,
      eventListeners: {
        // should be an array of functions, but is a function, so an error should be thrown
        message: () => {}
      }
    });
  };
  expect(initializeBadConfig).toThrowError();
});

it('should prefill any missing eventListener events during initialization', () => {
  const myFunc = () => {};
  const sarus = new Sarus({
    url,
    eventListeners: {
      message: [myFunc]
    }
  });
  expect(sarus.eventListeners.open).toEqual([]);
  expect(sarus.eventListeners.message).toEqual([myFunc]);
  expect(sarus.eventListeners.close).toEqual([]);
  expect(sarus.eventListeners.error).toEqual([]);
});

it('should prevent an event being added multiple times to an event listener', () => {
  const myFunc = () => {};
  const sarus = new Sarus({
    url,
    eventListeners: {
      message: [myFunc]
    }
  });

  const addAnExistingListener = () => {
    sarus.on('message', myFunc);
  };
  expect(addAnExistingListener).toThrowError();
});

it('should allow an event listener to be added after initialization', () => {
  const myFunc = () => {};
  const anotherFunc = () => {};
  const sarus = new Sarus({
    url,
    eventListeners: {
      message: [myFunc]
    }
  });

  sarus.on('message', anotherFunc);
  expect(sarus.eventListeners.message).toEqual([myFunc, anotherFunc]);
});

it('should bind any added event listeners after initialization to the WebSocket', async () => {
  const server = new WS(url);
  const myFunc = jest.fn();
  const anotherFunc = jest.fn();
  const sarus = new Sarus({
    url,
    eventListeners: {
      message: [myFunc]
    }
  });
  await server.connected;
  server.send('hello world');
  expect(myFunc).toBeCalledTimes(1);
  sarus.on('message', anotherFunc);
  expect(sarus.eventListeners.message).toEqual([myFunc, anotherFunc]);
  server.send('hello world');
  expect(myFunc).toBeCalledTimes(2);
  expect(anotherFunc).toBeCalledTimes(1);
  server.close();
});

it('should allow an event listener to be removed by passing the function name', () => {
  const myFunc = () => {};
  const sarus = new Sarus({
    url,
    eventListeners: {
      message: [myFunc]
    }
  });

  sarus.off('message', myFunc.name);
  expect(sarus.eventListeners.message).toEqual([]);
});

it('should allow an event listener to be removed by passing the function', () => {
  const myFunc = () => {};
  const sarus = new Sarus({
    url,
    eventListeners: {
      message: [myFunc]
    }
  });

  sarus.off('message', myFunc);
  expect(sarus.eventListeners.message).toEqual([]);
});

it('should throw an error if a function cannot be found when trying to remove it from an event listener', () => {
  const myFunc = () => {};
  const anotherFunc = () => {};
  const sarus = new Sarus({
    url,
    eventListeners: {
      message: [myFunc]
    }
  });

  const removeANonExistentListener = () => {
    sarus.off('message', anotherFunc);
  };
  expect(removeANonExistentListener).toThrowError();
});

it('should throw an error if a function name cannot be found when trying to remove it from an event listener', () => {
  const myFunc = () => {};
  const anotherFunc = () => {};
  const sarus = new Sarus({
    url,
    eventListeners: {
      message: [myFunc]
    }
  });

  const removeANonExistentListener = () => {
    sarus.off('message', anotherFunc.name);
  };
  expect(removeANonExistentListener).toThrowError();
});

it('should not throw an error, if a function cannot be found when trying to remove it from an event listener, and additional doNotThrowError is passed', () => {
  const myFunc = () => {};
  const anotherFunc = () => {};
  const sarus = new Sarus({
    url,
    eventListeners: {
      message: [myFunc]
    }
  });

  sarus.off('message', anotherFunc, { doNotThrowError: true });
});

it('should send a message to the WebSocket server', async () => {
  const server = new WS(url);
  await server.connected;
  const sarus = new Sarus({
    url
  });
  sarus.send('Hello server');
  await expect(server).toReceiveMessage('Hello server');
  server.close();
});

// Seems to be the case that when you do enough tests, it blows up

const delay = duration => new Promise(resolve => setTimeout(resolve, duration));

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
  const sarus = new Sarus({ url, storageType: 'local', storageKey: 'sarusWS' });
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
