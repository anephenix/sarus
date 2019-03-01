const eventNames = ['open', 'close', 'message', 'error'];
const serialize = data => JSON.stringify(data);
const deserialize = data => JSON.parse(data);

class Sarus {
  constructor(props) {
    const {
      url,
      eventListeners,
      reconnectAutomatically,
      retryProcessTimePeriod,
      storageType,
      storageKey
    } = props;
    this.url = url;
    this.retryProcessTimePeriod =
      this.validateRetryProcessTimePeriod(retryProcessTimePeriod) || 50;
    this.eventListeners =
      this.auditEventListeners(eventListeners) || this.initialEventlisteners();
    this.reconnectAutomatically = !(reconnectAutomatically === false);
    this.connect();
    this.storageType = storageType || 'memory';
    this.storageKey = storageKey || 'sarus';
    this.messages = []; // TODO - if using session or local storage, retrieve existing state
    this.process = this.process.bind(this);
  }

  get messages() {
    const { storageType, storageKey, messageStore } = this;
    if (['session', 'local'].indexOf(storageType) !== -1) {
      const rawData = window[`${storageType}Storage`].getItem(storageKey);
      return deserialize(rawData);
    }
    return messageStore;
  }

  set messages(data) {
    const { storageType, storageKey } = this;
    if (['session', 'local'].indexOf(storageType) !== -1) {
      window[`${storageType}Storage`].setItem(storageKey, serialize(data));
    }
    if (storageType === 'memory') {
      this.messageStore = data;
    }
    return data;
  }

  addMessage(data) {
    const { messages, storageType } = this;
    if (['session', 'local'].indexOf(storageType) !== -1) {
      this.messages = [...messages, data];
    } else {
      messages.push(data);
    }
  }

  removeMessage() {
    const { messages, storageType } = this;
    if (['session', 'local'].indexOf(storageType) !== -1) {
      const newArray = [...messages];
      newArray.shift();
      this.messages = newArray;
    } else {
      this.messages.shift();
    }
  }

  validateRetryProcessTimePeriod(retryProcessTimePeriod) {
    if (!retryProcessTimePeriod) return null;
    if (typeof retryProcessTimePeriod !== 'number') {
      throw new Error('retryProcessTimePeriod must be a number');
    }
    return retryProcessTimePeriod;
  }

  validateEvent(event) {
    if (eventNames.indexOf(event) === -1) {
      throw new Error(`${event} is not a valid eventListener event`);
    }
  }

  validateEvents(eventListeners) {
    const eventList = Object.keys(eventListeners);
    eventList.forEach(this.validateEvent);
  }

  validateEventFunctionLists(eventListeners) {
    for (let eventName in eventListeners) {
      if (!(eventListeners[eventName] instanceof Array)) {
        throw new Error(
          `The ${eventName} event listener must be an array of functions`
        );
      }
    }
  }

  prefillMissingEvents(eventListeners) {
    eventNames.forEach(eventName => {
      if (!eventListeners[eventName]) eventListeners[eventName] = [];
    });
    return eventListeners;
  }

  auditEventListeners(eventListeners) {
    if (!eventListeners) return false;
    this.validateEvents(eventListeners);
    this.validateEventFunctionLists(eventListeners);
    return this.prefillMissingEvents(eventListeners);
  }

  initialEventlisteners() {
    const eventListeners = {};
    eventNames.forEach(e => (eventListeners[e] = []));
    return eventListeners;
  }

  connect() {
    this.ws = new WebSocket(this.url);
    this.attachEventListeners();
  }

  on(eventName, eventFunc) {
    if (this.eventListeners[eventName].indexOf(eventFunc) !== -1) {
      throw new Error(
        `${eventFunc.name} has already been added to this event Listener`
      );
    }
    this.eventListeners[eventName].push(eventFunc);
  }

  off(eventName, eventFuncOrName, opts) {
    let existingFunc;
    if (typeof eventFuncOrName === 'string') {
      const byName = f => f.name === eventFuncOrName;
      existingFunc = this.eventListeners[eventName].find(byName);
    } else {
      if (this.eventListeners[eventName].indexOf(eventFuncOrName) !== -1) {
        existingFunc = eventFuncOrName;
      }
    }
    if (!existingFunc) {
      if (!(opts && opts.doNotThrowError)) {
        throw new Error('Function does not exist in eventListener list');
      }
    } else {
      const index = this.eventListeners[eventName].indexOf(existingFunc);
      this.eventListeners[eventName].splice(index, 1);
    }
  }

  send(data) {
    const callProcessAfterwards = this.messages.length === 0;
    this.addMessage(data);
    if (callProcessAfterwards) this.process();
  }

  process() {
    const { messages } = this;
    const data = messages[0];
    if (this.ws.readyState === 1) {
      this.ws.send(data);
      this.removeMessage();
      if (this.messages.length > 0) this.process();
    } else {
      setTimeout(this.process, this.retryProcessTimePeriod);
    }
  }

  attachEventListeners() {
    const self = this;
    eventNames.forEach(eventName => {
      self.ws[`on${eventName}`] = e => {
        self.eventListeners[eventName].forEach(f => f(e));
        if (eventName === 'close' && self.reconnectAutomatically) {
          self.connect();
        }
      };
    });
  }
}
module.exports = Sarus;
