// File Dependencies
import {
  ALLOWED_PROTOCOLS,
  WS_EVENT_NAMES,
  DATA_STORAGE_TYPES,
  DEFAULT_EVENT_LISTENERS_OBJECT,
} from "./lib/constants";
import { serialize, deserialize } from "./lib/dataTransformer";
import {
  PartialEventListenersInterface,
  EventListenersInterface,
} from "./lib/validators";

interface StorageParams {
  storageType: string;
  storageKey: string;
}

/**
 * Retrieves the storage API for the browser
 * @param {string} storageType - The storage type (local or session)
 * @returns {Storage} - the storage API
 */
const getStorage = (storageType: string) => {
  switch (storageType) {
    case "local":
      return window.localStorage;
    case "session":
      return window.sessionStorage;
  }
};

/**
 * Retrieves the messages in the message queue from one of either
 * sessionStorage or localStorage.
 * @param {Object} param0 - An object containing parameters
 * @param {string} param0.storageKey - The key used for storing the data
 * @param {string} param0.storageType - The type of storage used
 * @returns {*}
 */
const getMessagesFromStore = ({ storageType, storageKey }: StorageParams) => {
  if (DATA_STORAGE_TYPES.indexOf(storageType) !== -1) {
    const storage = getStorage(storageType);
    const rawData: null | string =
      (storage && storage.getItem(storageKey)) || null;
    return deserialize(rawData) || [];
  }
};

const validateWebSocketUrl = (rawUrl: string): URL => {
  let url: URL;
  try {
    // Alternatively, we can also check with URL.canParse(), but since we need
    // the URL object anyway to validate the protocol, we go ahead and parse it
    // here.
    url = new URL(rawUrl);
  } catch (e) {
    // TypeError, as specified by WHATWG URL Standard:
    // https://url.spec.whatwg.org/#url-class (see constructor steps)
    if (!(e instanceof TypeError)) {
      throw e;
    }
    // Untested - our URL mock does not give us an instance of TypeError
    const { message } = e;
    throw new Error(`The WebSocket URL is not valid: ${message}`);
  }
  const { protocol } = url;
  if (!ALLOWED_PROTOCOLS.includes(protocol)) {
    throw new Error(
      `Expected the WebSocket URL to have protocol 'ws:' or 'wss:', got '${protocol}' instead.`,
    );
  }
  return url;
};

export interface ExponentialBackoffParams {
  backoffRate: number;
  backoffLimit: number;
}

/*
 * Calculate the exponential backoff delay for a given number of connection
 * attempts.
 * @param {ExponentialBackoffParams} params - configuration parameters for
 * exponential backoff.
 * @param {number} initialDelay - the initial delay before any backoff is
 * applied
 * @param {number} failedConnectionAttempts - the number of connection attempts
 * that have previously failed
 * @returns {void} - set does not return
 */
export function calculateRetryDelayFactor(
  params: ExponentialBackoffParams,
  initialDelay: number,
  failedConnectionAttempts: number,
): number {
  return Math.min(
    initialDelay * Math.pow(params.backoffRate, failedConnectionAttempts),
    params.backoffLimit,
  );
}

export interface SarusClassParams {
  url: string;
  binaryType?: BinaryType;
  protocols?: string | Array<string>;
  eventListeners?: PartialEventListenersInterface;
  retryProcessTimePeriod?: number;
  reconnectAutomatically?: boolean;
  retryConnectionDelay?: boolean | number;
  exponentialBackoff?: ExponentialBackoffParams;
  storageType?: string;
  storageKey?: string;
}

/**
 * The Sarus client class
 * @constructor
 * @param {Object} param0 - An object containing parameters
 * @param {string} param0.url - The url for the WebSocket client to connect to
 * @param {string} param0.binaryType - The optional type of binary data transmitted over the WebSocket connection
 * @param {string\array} param0.protocols - An optional string or array of strings for the sub-protocols that the WebSocket will use
 * @param {object} param0.eventListeners - An optional object containing event listener functions keyed to websocket events
 * @param {boolean} param0.reconnectAutomatically - An optional boolean flag to indicate whether to reconnect automatically when a websocket connection is severed
 * @param {number} param0.retryProcessTimePeriod - An optional number for how long the time period between retrying to send a messgae to a WebSocket server should be
 * @param {boolean|number} param0.retryConnectionDelay - An optional parameter for whether to delay WebSocket reconnection attempts by a time period. If true, the delay is 1000ms, otherwise it is the number passed. The default value when this parameter is undefined will be interpreted as 1000ms.
 * @param {ExponentialBackoffParams} param0.exponentialBackoff - An optional containing configuration for exponential backoff. If this parameter is undefined, exponential backoff is disabled. The minimum delay is determined by retryConnectionDelay. If retryConnectionDelay is set is false, this setting will not be in effect.
 * @param {string} param0.storageType - An optional string specifying the type of storage to use for persisting messages in the message queue
 * @param {string} param0.storageKey - An optional string specifying the key used to store the messages data against in sessionStorage/localStorage
 * @returns {object} The class instance
 */
export default class Sarus {
  // Constructor params
  url: URL;
  binaryType?: BinaryType;
  protocols?: string | Array<string>;
  eventListeners: EventListenersInterface;
  retryProcessTimePeriod?: number;
  reconnectAutomatically?: boolean;
  retryConnectionDelay: number;
  exponentialBackoff?: ExponentialBackoffParams;
  storageType: string;
  storageKey: string;

  // Internally set
  messageStore: any;
  ws: WebSocket | undefined;
  /*
   * Track the current state of the Sarus object. See the diagram below.
   *
   *                       reconnect()    ┌──────┐
   *      ┌───────────────────────────────│closed│
   *      │                               └──────┘
   *      │                                  ▲
   *      ▼                                  │ this.ws.onclose
   * ┌──────────┐    this.ws.onopen      ┌───┴─────┐
   * │connecting├───────────────────────►│connected│
   * └──────────┘                        └───┬─────┘
   *      ▲                                  │ disconnect()
   *      │                                  ▼
   *      │            reconnect()      ┌────────────┐
   *      └─────────────────────────────┤disconnected│
   *                                    └────────────┘
   *
   * connect(), disconnect() are generally called by the user
   *
   * When disconnected by the WebSocket itself (i.e., this.ws.onclose),
   * this.reconnect() is called automatically if reconnection is enabled.
   * this.reconnect() can also be called by the user, for example if
   * this.disconnect() was purposefully called and reconnection is desired.
   *
   * The current state is specified by the 'kind' property of state
   * Each state can have additional data contained in properties other than
   * 'kind'. Those properties might be unique to one state, or contained in
   * several states. To access a property, it might be necessary to narrow down
   * the 'kind' of state.
   *
   * The initial state is connecting, as a Sarus client tries to connect right
   * after the constructor wraps up.
   */
  state:
    | { kind: "connecting"; failedConnectionAttempts: number }
    | { kind: "connected" }
    | { kind: "disconnected" }
    | { kind: "closed" } = {
    kind: "connecting",
    failedConnectionAttempts: 0,
  };

  constructor(props: SarusClassParams) {
    // Extract the properties that are passed to the class
    const {
      url,
      binaryType,
      protocols,
      eventListeners, // = DEFAULT_EVENT_LISTENERS_OBJECT,
      reconnectAutomatically,
      retryProcessTimePeriod, // TODO - write a test case to check this
      retryConnectionDelay,
      exponentialBackoff,
      storageType = "memory",
      storageKey = "sarus",
    } = props;

    this.eventListeners = this.auditEventListeners(eventListeners);

    // Sets the WebSocket server url for the client to connect to.
    this.url = validateWebSocketUrl(url);

    // Sets the binaryType of the data being sent over the connection
    this.binaryType = binaryType;

    // Sets an optional protocols value, which can be either a string or an array of strings
    this.protocols = protocols;

    /*
      When attempting to re-send a message when the WebSocket connection is
      not open, there is a retry process time period of 50ms. It can be set
      to another value by the developer.
    */
    this.retryProcessTimePeriod = retryProcessTimePeriod || 50;

    /*
      If a WebSocket connection is severed, Sarus is configured to reconnect to
      the WebSocket server url automatically, unless specified otherwise by the
      developer at initialization
    */
    this.reconnectAutomatically = !(reconnectAutomatically === false);

    /*
      This handles whether to add a time delay to reconnecting the WebSocket
      client. If true, a 1000ms delay is added. If a number, that number (as
      miliseconds) is used as the delay. Default is true.
    */
    // Either retryConnectionDelay is
    // undefined => default to 1000
    // true => default to 1000
    // false => default to 1000
    // a number => set it to that number
    this.retryConnectionDelay =
      (typeof retryConnectionDelay === "boolean"
        ? undefined
        : retryConnectionDelay) ?? 1000;

    /*
      When a exponential backoff parameter object is provided, reconnection
      attemptions will be increasingly delayed by an exponential factor.
      This feature is disabled by default.
    */
    this.exponentialBackoff = exponentialBackoff;

    /*
      Sets the storage type for the messages in the message queue. By default
      it is an in-memory option, but can also be set as 'session' for
      sessionStorage or 'local' for localStorage data persistence.
    */
    this.storageType = storageType;

    /*
      When using 'session' or 'local' as the storageType, the storage key is
      used as the key for calls to sessionStorage/localStorage getItem/setItem.

      It can also be configured by the developer during initialization.
    */
    this.storageKey = storageKey;

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
    this.reconnect = this.reconnect.bind(this);
    this.connect = this.connect.bind(this);
    this.process = this.process.bind(this);
    this.connect();
  }

  /*
    Gets the messages from the message queue.
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
   * @returns {void} - set does not return
   */
  set messages(data: any) {
    const { storageType, storageKey } = this;
    if (DATA_STORAGE_TYPES.indexOf(storageType) !== -1) {
      const storage = getStorage(storageType);
      if (storage) storage.setItem(storageKey, serialize(data));
    }
    if (storageType === "memory") {
      this.messageStore = data;
    }
  }

  /**
   * Adds a message to the messages in the message queue that are kept in persistent storage
   * @param {*} data - the message
   * @returns {array} the messages in the message queue
   */
  addMessageToStore(data: any) {
    const { messages, storageType } = this;
    if (DATA_STORAGE_TYPES.indexOf(storageType) === -1) return null;
    return (this.messages = [...messages, data]);
  }

  /**
   * Adds a messge to the message queue
   * @param {*} data - the data payload to put on the message queue
   */
  addMessage(data: any) {
    const { messages } = this;
    this.addMessageToStore(data) || messages.push(data);
  }

  /**
   * Removes a message from the message queue that is in persistent storage
   * @param {*} messages - the messages in the message queue
   */
  removeMessageFromStore(messages: any) {
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
   * Audits the eventListeners object parameter with validations, and a prefillMissingEvents step
   * This ensures that the eventListeners object is the right format for binding events to WebSocket clients
   * @param {object} eventListeners - The eventListeners object parameter
   * @returns {object} The eventListeners object parameter, with any missing events prefilled in
   */
  auditEventListeners(
    eventListeners: PartialEventListenersInterface | undefined,
  ) {
    return {
      open: eventListeners?.open || [],
      message: eventListeners?.message || [],
      error: eventListeners?.error || [],
      close: eventListeners?.close || [],
    };
  }

  /**
   * Connects the WebSocket client, and attaches event listeners
   */
  connect() {
    // If we aren't already connecting, we are now
    if (this.state.kind !== "connecting") {
      this.state = { kind: "connecting", failedConnectionAttempts: 0 };
    }
    this.ws = new WebSocket(this.url, this.protocols);
    this.setBinaryType();
    this.attachEventListeners();
    if (this.messages.length > 0) this.process();
  }

  /**
   * Reconnects the WebSocket client based on the retryConnectionDelay and
   * ExponentialBackoffParam setting.
   */
  reconnect() {
    const self = this;
    const { retryConnectionDelay, exponentialBackoff } = self;
    // If we are already in a "connecting" state, we need to refer to the
    // current amount of connection attemps to correctly calculate the
    // exponential delay -- if exponential backoff is enabled.
    const failedConnectionAttempts =
      self.state.kind === "connecting"
        ? self.state.failedConnectionAttempts
        : 0;

    // If no exponential backoff is enabled, retryConnectionDelay will
    // be scaled by a factor of 1 and it will stay the original value.
    const delay = exponentialBackoff
      ? calculateRetryDelayFactor(
          exponentialBackoff,
          retryConnectionDelay,
          failedConnectionAttempts,
        )
      : retryConnectionDelay;

    setTimeout(self.connect, delay);
  }

  /**
   * Disconnects the WebSocket client from the server, and changes the
   * reconnectAutomatically flag to disable automatic reconnection, unless the
   * developer passes a boolean flag to not do that.
   * @param {boolean} overrideDisableReconnect
   */
  disconnect(overrideDisableReconnect?: boolean) {
    this.state = { kind: "disconnected" };
    const self = this;
    // We do this to prevent automatic reconnections;
    if (!overrideDisableReconnect) {
      self.reconnectAutomatically = false;
    }
    if (self.ws) self.ws.close();
  }

  /**
   * Adds a function to trigger on the occurrence of an event with the specified event name
   * @param {string} eventName - The name of the event in the eventListeners object
   * @param {function} eventFunc - The function to trigger when the event occurs
   */
  on(eventName: string, eventFunc: Function) {
    const eventFunctions = this.eventListeners[eventName];
    if (eventFunctions && eventFunctions.indexOf(eventFunc) !== -1) {
      throw new Error(
        `${eventFunc.name} has already been added to this event Listener`,
      );
    }
    if (eventFunctions && eventFunctions instanceof Array) {
      this.eventListeners[eventName].push(eventFunc);
    }
  }

  /**
   * Finds a function in a eventListener's event list, by functon or by function name
   * @param {string} eventName - The name of the event in the eventListeners object
   * @param {function|string} eventFuncOrName - Either the function to remove, or the name of the function to remove
   * @returns {function|undefined} The existing function, or nothing
   */
  findFunction(eventName: string, eventFuncOrName: string | Function) {
    if (typeof eventFuncOrName === "string") {
      const byName = (f: Function) => f.name === eventFuncOrName;
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
  raiseErrorIfFunctionIsMissing(
    existingFunc: Function | undefined,
    opts?:
      | {
          doNotThrowError: boolean;
        }
      | undefined,
  ) {
    if (!existingFunc) {
      if (!(opts && opts.doNotThrowError)) {
        throw new Error("Function does not exist in eventListener list");
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
  off(
    eventName: string,
    eventFuncOrName: Function | string,
    opts?: { doNotThrowError: boolean } | undefined,
  ) {
    const existingFunc = this.findFunction(eventName, eventFuncOrName);
    if (existingFunc) {
      const index = this.eventListeners[eventName].indexOf(existingFunc);
      this.eventListeners[eventName].splice(index, 1);
    } else {
      this.raiseErrorIfFunctionIsMissing(existingFunc, opts);
    }
  }

  /**
   * Puts data on a message queue, and then processes the message queue to get the data sent to the WebSocket server
   * @param {*} data - The data payload to put the on message queue
   */
  send(data: unknown) {
    const callProcessAfterwards = this.messages.length === 0;
    this.addMessage(data);
    if (callProcessAfterwards) this.process();
  }

  /**
   * Sends a message over the WebSocket, removes the message from the queue,
   * and calls proces again if there is another message to process.
   * @param {unknown} data - The data payload to send over the WebSocket
   */
  processMessage(data: unknown) {
    const self: any = this;
    self.ws.send(data);
    self.removeMessage();
    if (self.messages.length > 0) this.process();
  }

  /**
   * Processes messages that are on the message queue. Handles looping through the list, as well as retrying message
   * dispatch if the WebSocket connection is not open.
   */
  process() {
    const { messages } = this;
    const data = messages[0];
    if (!data && messages.length === 0) return;
    if (this.ws && this.ws.readyState === 1) {
      this.processMessage(data);
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
    const self: any = this;
    WS_EVENT_NAMES.forEach((eventName) => {
      self.ws[`on${eventName}`] = (e: Event | CloseEvent | MessageEvent) => {
        self.eventListeners[eventName].forEach((f: Function) => f(e));
        if (eventName === "open") {
          self.state = { kind: "connected" };
        } else if (eventName === "close" && self.reconnectAutomatically) {
          const { state } = self;
          // If we have previously been "connecting", we carry over the amount
          // of failed connection attempts and add 1, since the current
          // connection attempt failed. We stay "connecting" instead of
          // "closed", since we've never been fully "connected" in the first
          // place.
          if (state.kind === "connecting") {
            self.state = {
              kind: "connecting",
              failedConnectionAttempts: state.failedConnectionAttempts + 1,
            };
          } else {
            // If we were in a different state, we assume that our connection
            // freshly closed and have not made any failed connection attempts.
            self.state = { kind: "closed" };
          }
          self.removeEventListeners();
          self.reconnect();
        }
      };
    });
  }

  /**
   * Removes the event listeners from a closed WebSocket instance, so that
   * they are cleaned up
   */
  removeEventListeners() {
    const self: any = this;
    WS_EVENT_NAMES.forEach((eventName) => {
      if (self.ws.listeners && self.ws.listeners[eventName]) {
        self.ws.listeners[eventName].forEach((iel: Function) => {
          self.ws.removeEventListener(eventName, iel);
        });
      }
    });
  }

  /**
   * Sets the binary type for the WebSocket, if such an option is set
   */
  setBinaryType() {
    const { binaryType } = this;
    if (binaryType && this.ws) this.ws.binaryType = binaryType;
  }
}
