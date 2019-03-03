// File Dependencies
const Sarus = require('../../index');
const { WS } = require('jest-websocket-mock');

const url = 'ws://localhost:1234';

describe('eventListeners', () => {
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
});
