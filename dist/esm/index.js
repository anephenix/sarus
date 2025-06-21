// File Dependencies
import { DATA_STORAGE_TYPES } from "./lib/constants.js";
import { serialize, deserialize } from "./lib/dataTransformer.js";
import { validateWebSocketUrl } from "./lib/utils.js";
/**
 * Retrieves the storage API for the browser
 * @param {string} storageType - The storage type (local or session)
 * @returns {Storage} - the storage API
 */
const getStorage = (storageType) => {
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
const getMessagesFromStore = ({ storageType, storageKey, }) => {
    if (DATA_STORAGE_TYPES.indexOf(storageType) !== -1) {
        const storage = getStorage(storageType);
        const rawData = (storage === null || storage === void 0 ? void 0 : storage.getItem(storageKey)) || null;
        const result = deserialize(rawData);
        return Array.isArray(result) ? result : [];
    }
};
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
export function calculateRetryDelayFactor(params, initialDelay, failedConnectionAttempts) {
    return Math.min(initialDelay * params.backoffRate ** failedConnectionAttempts, params.backoffLimit);
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
    constructor(props) {
        var _a;
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
        this.state = {
            kind: "connecting",
            failedConnectionAttempts: 0,
        };
        // Extract the properties that are passed to the class
        const { url, binaryType, protocols, eventListeners, // = DEFAULT_EVENT_LISTENERS_OBJECT,
        reconnectAutomatically, retryProcessTimePeriod, // TODO - write a test case to check this
        retryConnectionDelay, exponentialBackoff, storageType = "memory", storageKey = "sarus", } = props;
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
            (_a = (typeof retryConnectionDelay === "boolean"
                ? undefined
                : retryConnectionDelay)) !== null && _a !== void 0 ? _a : 1000;
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
        var _a;
        const { storageType, storageKey, messageStore } = this;
        return ((_a = getMessagesFromStore({ storageType, storageKey })) !== null && _a !== void 0 ? _a : messageStore);
    }
    /**
     * Sets the messages to store in the message queue
     * @param {*} data - the data payload to set for the messages in the message queue
     * @returns {void} - set does not return
     */
    set messages(data) {
        const { storageType, storageKey } = this;
        if (DATA_STORAGE_TYPES.indexOf(storageType) !== -1) {
            const storage = getStorage(storageType);
            if (storage)
                storage.setItem(storageKey, serialize(data));
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
    addMessageToStore(data) {
        const { messages, storageType } = this;
        if (DATA_STORAGE_TYPES.indexOf(storageType) === -1)
            return null;
        this.messages = [...messages, data];
        return this.messages;
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
     * Audits the eventListeners object parameter with validations, and a prefillMissingEvents step
     * This ensures that the eventListeners object is the right format for binding events to WebSocket clients
     * @param {object} eventListeners - The eventListeners object parameter
     * @returns {object} The eventListeners object parameter, with any missing events prefilled in
     */
    auditEventListeners(eventListeners) {
        return {
            open: (eventListeners === null || eventListeners === void 0 ? void 0 : eventListeners.open) || [],
            message: (eventListeners === null || eventListeners === void 0 ? void 0 : eventListeners.message) || [],
            error: (eventListeners === null || eventListeners === void 0 ? void 0 : eventListeners.error) || [],
            close: (eventListeners === null || eventListeners === void 0 ? void 0 : eventListeners.close) || [],
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
        if (this.messages.length > 0)
            this.process();
    }
    /**
     * Reconnects the WebSocket client based on the retryConnectionDelay and
     * ExponentialBackoffParam setting.
     */
    reconnect() {
        const { retryConnectionDelay, exponentialBackoff } = this;
        // If we are already in a "connecting" state, we need to refer to the
        // current amount of connection attemps to correctly calculate the
        // exponential delay -- if exponential backoff is enabled.
        const failedConnectionAttempts = this.state.kind === "connecting"
            ? this.state.failedConnectionAttempts
            : 0;
        // If no exponential backoff is enabled, retryConnectionDelay will
        // be scaled by a factor of 1 and it will stay the original value.
        const delay = exponentialBackoff
            ? calculateRetryDelayFactor(exponentialBackoff, retryConnectionDelay, failedConnectionAttempts)
            : retryConnectionDelay;
        setTimeout(this.connect, delay);
    }
    /**
     * Disconnects the WebSocket client from the server, and changes the
     * reconnectAutomatically flag to disable automatic reconnection, unless the
     * developer passes a boolean flag to not do that.
     * @param {boolean} overrideDisableReconnect
     */
    disconnect(overrideDisableReconnect) {
        var _a;
        this.state = { kind: "disconnected" };
        // We do this to prevent automatic reconnections;
        if (!overrideDisableReconnect) {
            this.reconnectAutomatically = false;
        }
        (_a = this.ws) === null || _a === void 0 ? void 0 : _a.close();
    }
    /**
     * Adds a function to trigger on the occurrence of an event with the specified event name
     * @param {string} eventName - The name of the event in the eventListeners object
     * @param {function} eventFunc - The function to trigger when the event occurs
     */
    on(eventName, eventFunc) {
        const eventFunctions = this.eventListeners[eventName];
        if (eventFunctions && eventFunctions.indexOf(eventFunc) !== -1) {
            throw new Error(`${eventFunc.name} has already been added to this event Listener`);
        }
        if (eventFunctions && Array.isArray(eventFunctions)) {
            this.eventListeners[eventName].push(eventFunc);
        }
    }
    /**
     * Finds a function in a eventListener's event list, by functon or by function name
     * @param {string} eventName - The name of the event in the eventListeners object
     * @param {function|string} eventFuncOrName - Either the function to remove, or the name of the function to remove
     * @returns {function|undefined} The existing function, or nothing
     */
    findFunction(eventName, eventFuncOrName) {
        if (typeof eventFuncOrName === "string") {
            const byName = (f) => f.name === eventFuncOrName;
            return this.eventListeners[eventName].find(byName);
        }
        if (this.eventListeners[eventName].indexOf(eventFuncOrName) !== -1) {
            return eventFuncOrName;
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
            if (!(opts === null || opts === void 0 ? void 0 : opts.doNotThrowError)) {
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
    off(eventName, eventFuncOrName, opts) {
        const existingFunc = this.findFunction(eventName, eventFuncOrName);
        if (existingFunc) {
            const index = this.eventListeners[eventName].indexOf(existingFunc);
            this.eventListeners[eventName].splice(index, 1);
        }
        else {
            this.raiseErrorIfFunctionIsMissing(existingFunc, opts);
        }
    }
    /**
     * Puts data on a message queue, and then processes the message queue to get the data sent to the WebSocket server
     * @param {*} data - The data payload to put the on message queue
     */
    send(data) {
        const callProcessAfterwards = this.messages.length === 0;
        this.addMessage(data);
        if (callProcessAfterwards)
            this.process();
    }
    /**
     * Sends a message over the WebSocket, removes the message from the queue,
     * and calls proces again if there is another message to process.
     * @param {string | ArrayBuffer | Uint8Array} data - The data payload to send over the WebSocket
     */
    processMessage(data) {
        var _a;
        // If the message is a base64-wrapped object (from legacy or manual insert), decode it
        (_a = this.ws) === null || _a === void 0 ? void 0 : _a.send(data);
        this.removeMessage();
        if (this.messages.length > 0)
            this.process();
    }
    /**
     * Processes messages that are on the message queue. Handles looping through the list, as well as retrying message
     * dispatch if the WebSocket connection is not open.
     */
    process() {
        const { messages } = this;
        const data = messages[0];
        if (!data && messages.length === 0)
            return;
        if (this.ws && this.ws.readyState === 1) {
            this.processMessage(data);
        }
        else {
            setTimeout(this.process, this.retryProcessTimePeriod);
        }
    }
    /**
     * Attaches the event listeners to the WebSocket instance.
     * Also attaches an additional eventListener on the 'close' event to trigger a reconnection
     * of the WebSocket, unless configured not to.
     */
    attachEventListeners() {
        this.ws.onopen = (e) => {
            for (const f of this.eventListeners.open) {
                f(e);
            }
            this.state = { kind: "connected" };
        };
        this.ws.onmessage = (e) => {
            for (const f of this.eventListeners.message) {
                f(e);
            }
        };
        this.ws.onerror = (e) => {
            for (const f of this.eventListeners.error) {
                f(e);
            }
        };
        this.ws.onclose = (e) => {
            for (const f of this.eventListeners.close) {
                f(e);
            }
            if (this.reconnectAutomatically) {
                // If we have previously been "connecting", we carry over the amount
                // of failed connection attempts and add 1, since the current
                // connection attempt failed. We stay "connecting" instead of
                // "closed", since we've never been fully "connected" in the first
                // place.
                if (this.state.kind === "connecting") {
                    this.state = {
                        kind: "connecting",
                        failedConnectionAttempts: this.state.failedConnectionAttempts + 1,
                    };
                }
                else {
                    // If we were in a different state, we assume that our connection
                    // freshly closed and have not made any failed connection attempts.
                    this.state = { kind: "closed" };
                }
                this.removeEventListeners();
                this.reconnect();
            }
        };
    }
    /**
     * Removes the event listeners from a closed WebSocket instance, so that
     * they are cleaned up
     */
    removeEventListeners() {
        this.ws.onopen = null;
        this.ws.onclose = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
    }
    /**
     * Sets the binary type for the WebSocket, if such an option is set
     */
    setBinaryType() {
        const { binaryType } = this;
        if (binaryType && this.ws)
            this.ws.binaryType = binaryType;
    }
}
