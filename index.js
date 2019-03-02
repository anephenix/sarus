/**
 * A definitive list of events for a WebSocket client to listen on
 * @constant
 * @type {array}
 */
const WS_EVENT_NAMES = ['open', 'close', 'message', 'error'];

/**
 * Persistent data storage types
 * @constant
 * @type {array}
 */
const DATA_STORAGE_TYPES = ['session', 'local'];

/**
 * Serializes the data for storing in sessionStorage/localStorage
 * @param {*} data - the data that we want to serialize
 * @returns {string} - the serialized data
 */
const serialize = data => JSON.stringify(data);

/**
 * Deserializes the data stored in sessionStorage/localStorage
 * @param {string} data - the data that we want to deserialize
 * @returns {*} The deserialized data
 */
const deserialize = data => JSON.parse(data);

/**
 * Retrieves the messages in the message queue from one of either
 * sessionStorage or localStorage.
 * @param {Object} param0 - An object containing parameters
 * @param {string} param0.storageKey - The key used for storing the data
 * @param {string} param0.storageType - The type of storage used
 * @returns {*}
 */
const getMessagesFromStore = ({ storageType, storageKey }) => {
  if (DATA_STORAGE_TYPES.indexOf(storageType) !== -1) {
    const rawData = window[`${storageType}Storage`].getItem(storageKey);
    return deserialize(rawData);
  }
};

/**
 * The Sarus client class
 * @constructor
 * @param {Object} param0 - An object containing parameters
 * @param {string} param0.url - The url for the WebSocket client to connect to
 * @param {object} param0.eventListeners - An optional object containing event listener functions keyed to websocket events
 * @param {boolean} param0.reconnectAutomatically - An optional boolean flag to indicate whether to reconnect automatically when a websocket connection is severed
 * @param {number} param0.retryProcessTimePeriod - An optional number for how long the time period between retrying to send a messgae to a WebSocket server should be
 * @param {string} param0.storageType - An optional string specifying the type of storage to use for persisting messages in the message queue
 * @param {string} param0.storageKey - An optional string specifying the key used to store the messages data against in sessionStorage/localStorage
 * @returns {object} The class instance
 */
class Sarus {
  constructor(props) {
    // Extract the properties that are passed to the class
    const {
      url,
      eventListeners,
      reconnectAutomatically,
      retryProcessTimePeriod,
      storageType,
      storageKey
    } = props;

    // Sets the WebSocket server url for the client to connect to.
    this.url = url;

    /*
      When attempting to re-send a message when the WebSocket connection is 
      not open, there is a retry process time period of 50ms. It can be set
      to another value by the developer.
    */
    this.retryProcessTimePeriod =
      this.validateRetryProcessTimePeriod(retryProcessTimePeriod) || 50;
    /*
      This handles attaching event listeners to the WebSocket connection
      at initialization. 
    */
    this.eventListeners =
      this.auditEventListeners(eventListeners) || this.initialEventlisteners();

    /*
      If a WebSocket connection is severed, Sarus is configured to reconnect to
      the WebSocket server url automatically, unless specified otherwise by the
      developer at initialization
    */
    this.reconnectAutomatically = !(reconnectAutomatically === false);

    /*
      Sets the storage type for the messages in the message queue. By default
      it is an in-memory option, but can also be set as 'session' for 
      sessionStorage or 'local' for localStorage data persistence.
    */
    this.storageType = storageType || 'memory';

    /*
      When using 'session' or 'local' as the storageType, the storage key is
      used as the key for calls to sessionStorage/localStorage getItem/setItem.
      
      It can also be configured by the developer during initialization.
    */
    this.storageKey = storageKey || 'sarus';

    /*
      When initializing the client, if we are using sessionStorage/localStorage
      for storing messages in the messageQueue, then we want to retrieve any 
      that might have been persisted there.
      
      Say the user has done a page refresh, we want to make sure that messages 
      that were meant to be sent to the server make their way there.

      If no messages were persisted, or we are using in-memory message storage,
      then we simply set the messages property to an empty array;
    */
    this.messages = this.messages || [];

    // This binds the process function call.
    this.process = this.process.bind(this);
    this.connect();
  }

  /* 
    Gets the messages from the message queue.

    This tool TODO - got here
  */

  /**
   * Fetches the messages from the message queue
   * @returns {array} the messages in the message queue, as an array
   */
  get messages() {
    const { storageType, storageKey, messageStore } = this;
    return getMessagesFromStore({ storageType, storageKey }) || messageStore;
  }

  /**
   * Sets the messages to store in the message queue
   * @param {*} data - the data payload to set for the messages in the message queue
   * @returns {*} the data payload
   */
  set messages(data) {
    const { storageType, storageKey } = this;
    if (DATA_STORAGE_TYPES.indexOf(storageType) !== -1) {
      window[`${storageType}Storage`].setItem(storageKey, serialize(data));
    }
    if (storageType === 'memory') {
      this.messageStore = data;
    }
    return data;
  }

  /**
   * Adds a message to the messages in the message queue that are kept in persistent storage
   * @param {*} data - the message
   * @returns {array} the messages in the message queue
   */
  addMessageToStore(data) {
    const { messages, storageType } = this;
    if (DATA_STORAGE_TYPES.indexOf(storageType) === -1) return null;
    return (this.messages = [...messages, data]);
  }

  /**
   * Adds a messge to the message queue
   * @param {*} data - the data payload to put on the message queue
   */
  addMessage(data) {
    const { messages } = this;
    this.addMessageToStore(data) || messages.push(data);
  }

  /**
   * Removes a message from the message queue that is in persistent storage
   * @param {*} messages - the messages in the message queue
   */
  removeMessageFromStore(messages) {
    const newArray = [...messages];
    newArray.shift();
    this.messages = newArray;
  }

  /**
   * Removes a message from the message queue
   */
  removeMessage() {
    const { messages, storageType } = this;
    if (DATA_STORAGE_TYPES.indexOf(storageType) === -1) {
      return this.messages.shift();
    }
    this.removeMessageFromStore(messages);
  }

  /**
   * Validates the retryProcessTimePeriod parameter
   * @param {number} retryProcessTimePeriod - How long the time period between retrying to send a messgae to a WebSocket server should be
   * @returns {number} The number in miliseconds for the retryProcessTimePeriod
   */
  validateRetryProcessTimePeriod(retryProcessTimePeriod) {
    if (!retryProcessTimePeriod) return null;
    if (typeof retryProcessTimePeriod !== 'number') {
      throw new Error('retryProcessTimePeriod must be a number');
    }
    return retryProcessTimePeriod;
  }

  /**
   * Validates that the event passed in is a valid eventListener event
   * @param {string} event - the event name
   */
  validateEvent(event) {
    if (WS_EVENT_NAMES.indexOf(event) === -1) {
      throw new Error(`${event} is not a valid eventListener event`);
    }
  }

  /**
   * Loops through a list of events in the eventListeners object to validate them
   * @param {object} eventListeners
   */
  validateEvents(eventListeners) {
    const eventList = Object.keys(eventListeners);
    eventList.forEach(this.validateEvent);
  }

  /**
   * Validates the data structure of the eventListeners object to make sure that it is correct
   * @param {object} eventListeners - The eventListeners object parameter
   */
  validateEventFunctionLists(eventListeners) {
    for (let eventName in eventListeners) {
      if (!(eventListeners[eventName] instanceof Array)) {
        throw new Error(
          `The ${eventName} event listener must be an array of functions`
        );
      }
    }
  }

  /**
   * Makes sure that any eventListeners object which might miss an event will have them prefilled in
   * @param {object} eventListeners - The eventListeners object parameter
   * @returns {object} The eventListeners object parameter, with any missing events prefilled in
   */
  prefillMissingEvents(eventListeners) {
    WS_EVENT_NAMES.forEach(eventName => {
      if (!eventListeners[eventName]) eventListeners[eventName] = [];
    });
    return eventListeners;
  }

  /**
   * Audits the eventListeners object parameter with validations, and a prefillMissingEvents step
   * This ensures that the eventListeners object is the right format for binding events to WebSocket clients
   * @param {object} eventListeners - The eventListeners object parameter
   * @returns {object} The eventListeners object parameter, with any missing events prefilled in
   */
  auditEventListeners(eventListeners) {
    if (!eventListeners) return false;
    this.validateEvents(eventListeners);
    this.validateEventFunctionLists(eventListeners);
    return this.prefillMissingEvents(eventListeners);
  }

  /**
   * Creates an initial eventListeners object with all of the required events, in the right format
   * @returns {object} The eventListeners object
   */
  initialEventlisteners() {
    const eventListeners = {};
    WS_EVENT_NAMES.forEach(e => (eventListeners[e] = []));
    return eventListeners;
  }

  /**
   * Connects the WebSocket client, and attaches event listeners
   */
  connect() {
    this.ws = new WebSocket(this.url);
    this.attachEventListeners();
  }

  /**
   * Adds a function to trigger on the occurrence of an event with the specified event name
   * @param {string} eventName - The name of the event in the eventListeners object
   * @param {function} eventFunc - The function to trigger when the event occurs
   */
  on(eventName, eventFunc) {
    if (this.eventListeners[eventName].indexOf(eventFunc) !== -1) {
      throw new Error(
        `${eventFunc.name} has already been added to this event Listener`
      );
    }
    this.eventListeners[eventName].push(eventFunc);
  }

  /**
   * Finds a function in a eventListener's event list, by functon or by function name
   * @param {string} eventName - The name of the event in the eventListeners object
   * @param {function|string} eventFuncOrName - Either the function to remove, or the name of the function to remove
   * @returns {function|undefined} The existing function, or nothing
   */
  findFunction(eventName, eventFuncOrName) {
    if (typeof eventFuncOrName === 'string') {
      const byName = f => f.name === eventFuncOrName;
      return this.eventListeners[eventName].find(byName);
    } else {
      if (this.eventListeners[eventName].indexOf(eventFuncOrName) !== -1) {
        return eventFuncOrName;
      }
    }
  }

  /**
   * Raises an error if the existing function is not present, and if the client is configured to throw an error
   * @param {function|undefined} existingFunc
   * @param {object} opts - An optional object to pass that contains extra configuration options
   * @param {boolean} opts.doNotThrowError - A boolean flag that indicates whether to not throw an error if the function to remove is not found in the list
   */
  raiseErrorIfFunctionIsMissing(existingFunc, opts) {
    if (!existingFunc) {
      if (!(opts && opts.doNotThrowError)) {
        throw new Error('Function does not exist in eventListener list');
      }
    }
  }

  /**
   * Removes a function from an eventListener events list for that event
   * @param {string} eventName - The name of the event in the eventListeners object
   * @param {function|string} eventFuncOrName - Either the function to remove, or the name of the function to remove
   * @param {object} opts - An optional object to pass that contains extra configuration options
   * @param {boolean} opts.doNotThrowError - A boolean flag that indicates whether to not throw an error if the function to remove is not found in the list
   */
  off(eventName, eventFuncOrName, opts) {
    const existingFunc = this.findFunction(eventName, eventFuncOrName);
    this.raiseErrorIfFunctionIsMissing(existingFunc, opts);
    const index = this.eventListeners[eventName].indexOf(existingFunc);
    this.eventListeners[eventName].splice(index, 1);
  }

  /**
   * Puts data on a message queue, and then processes the message queue to get the data sent to the WebSocket server
   * @param {*} data - The data payload to put the on message queue
   */
  send(data) {
    const callProcessAfterwards = this.messages.length === 0;
    this.addMessage(data);
    if (callProcessAfterwards) this.process();
  }

  /**
   * Processes messages that are on the message queue. Handles looping through the list, as well as retrying message
   * dispatch if the WebSocket connection is not open.
   */
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

  /**
   * Attaches the event listeners to the WebSocket instance.
   * Also attaches an additional eventListener on the 'close' event to trigger a reconnection
   * of the WebSocket, unless configured not to.
   */
  attachEventListeners() {
    const self = this;
    WS_EVENT_NAMES.forEach(eventName => {
      self.ws[`on${eventName}`] = e => {
        self.eventListeners[eventName].forEach(f => f(e));
        if (eventName === 'close' && self.reconnectAutomatically) {
          self.connect();
        }
      };
    });
  }
}

/**
 * Export the Sarus class as a commonjs module
 */
module.exports = Sarus;
