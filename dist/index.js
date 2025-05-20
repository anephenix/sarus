"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateRetryDelayFactor = calculateRetryDelayFactor;
// File Dependencies
var constants_1 = require("./lib/constants");
var dataTransformer_1 = require("./lib/dataTransformer");
var utils_1 = require("./lib/utils");
/**
 * Retrieves the storage API for the browser
 * @param {string} storageType - The storage type (local or session)
 * @returns {Storage} - the storage API
 */
var getStorage = function (storageType) {
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
var getMessagesFromStore = function (_a) {
    var storageType = _a.storageType, storageKey = _a.storageKey;
    if (constants_1.DATA_STORAGE_TYPES.indexOf(storageType) !== -1) {
        var storage = getStorage(storageType);
        var rawData = (storage && storage.getItem(storageKey)) || null;
        return (0, dataTransformer_1.deserialize)(rawData) || [];
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
function calculateRetryDelayFactor(params, initialDelay, failedConnectionAttempts) {
    return Math.min(initialDelay * Math.pow(params.backoffRate, failedConnectionAttempts), params.backoffLimit);
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
var Sarus = /** @class */ (function () {
    function Sarus(props) {
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
        var url = props.url, binaryType = props.binaryType, protocols = props.protocols, eventListeners = props.eventListeners, // = DEFAULT_EVENT_LISTENERS_OBJECT,
        reconnectAutomatically = props.reconnectAutomatically, retryProcessTimePeriod = props.retryProcessTimePeriod, // TODO - write a test case to check this
        retryConnectionDelay = props.retryConnectionDelay, exponentialBackoff = props.exponentialBackoff, _b = props.storageType, storageType = _b === void 0 ? "memory" : _b, _c = props.storageKey, storageKey = _c === void 0 ? "sarus" : _c;
        this.eventListeners = this.auditEventListeners(eventListeners);
        // Sets the WebSocket server url for the client to connect to.
        this.url = (0, utils_1.validateWebSocketUrl)(url);
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
    Object.defineProperty(Sarus.prototype, "messages", {
        /*
          Gets the messages from the message queue.
        */
        /**
         * Fetches the messages from the message queue
         * @returns {array} the messages in the message queue, as an array
         */
        get: function () {
            var _a = this, storageType = _a.storageType, storageKey = _a.storageKey, messageStore = _a.messageStore;
            return getMessagesFromStore({ storageType: storageType, storageKey: storageKey }) || messageStore;
        },
        /**
         * Sets the messages to store in the message queue
         * @param {*} data - the data payload to set for the messages in the message queue
         * @returns {void} - set does not return
         */
        set: function (data) {
            var _a = this, storageType = _a.storageType, storageKey = _a.storageKey;
            if (constants_1.DATA_STORAGE_TYPES.indexOf(storageType) !== -1) {
                var storage = getStorage(storageType);
                if (storage)
                    storage.setItem(storageKey, (0, dataTransformer_1.serialize)(data));
            }
            if (storageType === "memory") {
                this.messageStore = data;
            }
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Adds a message to the messages in the message queue that are kept in persistent storage
     * @param {*} data - the message
     * @returns {array} the messages in the message queue
     */
    Sarus.prototype.addMessageToStore = function (data) {
        var _a = this, messages = _a.messages, storageType = _a.storageType;
        if (constants_1.DATA_STORAGE_TYPES.indexOf(storageType) === -1)
            return null;
        return (this.messages = __spreadArray(__spreadArray([], messages, true), [data], false));
    };
    /**
     * Adds a messge to the message queue
     * @param {*} data - the data payload to put on the message queue
     */
    Sarus.prototype.addMessage = function (data) {
        var messages = this.messages;
        this.addMessageToStore(data) || messages.push(data);
    };
    /**
     * Removes a message from the message queue that is in persistent storage
     * @param {*} messages - the messages in the message queue
     */
    Sarus.prototype.removeMessageFromStore = function (messages) {
        var newArray = __spreadArray([], messages, true);
        newArray.shift();
        this.messages = newArray;
    };
    /**
     * Removes a message from the message queue
     */
    Sarus.prototype.removeMessage = function () {
        var _a = this, messages = _a.messages, storageType = _a.storageType;
        if (constants_1.DATA_STORAGE_TYPES.indexOf(storageType) === -1) {
            return this.messages.shift();
        }
        this.removeMessageFromStore(messages);
    };
    /**
     * Audits the eventListeners object parameter with validations, and a prefillMissingEvents step
     * This ensures that the eventListeners object is the right format for binding events to WebSocket clients
     * @param {object} eventListeners - The eventListeners object parameter
     * @returns {object} The eventListeners object parameter, with any missing events prefilled in
     */
    Sarus.prototype.auditEventListeners = function (eventListeners) {
        return {
            open: (eventListeners === null || eventListeners === void 0 ? void 0 : eventListeners.open) || [],
            message: (eventListeners === null || eventListeners === void 0 ? void 0 : eventListeners.message) || [],
            error: (eventListeners === null || eventListeners === void 0 ? void 0 : eventListeners.error) || [],
            close: (eventListeners === null || eventListeners === void 0 ? void 0 : eventListeners.close) || [],
        };
    };
    /**
     * Connects the WebSocket client, and attaches event listeners
     */
    Sarus.prototype.connect = function () {
        // If we aren't already connecting, we are now
        if (this.state.kind !== "connecting") {
            this.state = { kind: "connecting", failedConnectionAttempts: 0 };
        }
        this.ws = new WebSocket(this.url, this.protocols);
        this.setBinaryType();
        this.attachEventListeners();
        if (this.messages.length > 0)
            this.process();
    };
    /**
     * Reconnects the WebSocket client based on the retryConnectionDelay and
     * ExponentialBackoffParam setting.
     */
    Sarus.prototype.reconnect = function () {
        var self = this;
        var retryConnectionDelay = self.retryConnectionDelay, exponentialBackoff = self.exponentialBackoff;
        // If we are already in a "connecting" state, we need to refer to the
        // current amount of connection attemps to correctly calculate the
        // exponential delay -- if exponential backoff is enabled.
        var failedConnectionAttempts = self.state.kind === "connecting"
            ? self.state.failedConnectionAttempts
            : 0;
        // If no exponential backoff is enabled, retryConnectionDelay will
        // be scaled by a factor of 1 and it will stay the original value.
        var delay = exponentialBackoff
            ? calculateRetryDelayFactor(exponentialBackoff, retryConnectionDelay, failedConnectionAttempts)
            : retryConnectionDelay;
        setTimeout(self.connect, delay);
    };
    /**
     * Disconnects the WebSocket client from the server, and changes the
     * reconnectAutomatically flag to disable automatic reconnection, unless the
     * developer passes a boolean flag to not do that.
     * @param {boolean} overrideDisableReconnect
     */
    Sarus.prototype.disconnect = function (overrideDisableReconnect) {
        this.state = { kind: "disconnected" };
        var self = this;
        // We do this to prevent automatic reconnections;
        if (!overrideDisableReconnect) {
            self.reconnectAutomatically = false;
        }
        if (self.ws)
            self.ws.close();
    };
    /**
     * Adds a function to trigger on the occurrence of an event with the specified event name
     * @param {string} eventName - The name of the event in the eventListeners object
     * @param {function} eventFunc - The function to trigger when the event occurs
     */
    Sarus.prototype.on = function (eventName, eventFunc) {
        var eventFunctions = this.eventListeners[eventName];
        if (eventFunctions && eventFunctions.indexOf(eventFunc) !== -1) {
            throw new Error("".concat(eventFunc.name, " has already been added to this event Listener"));
        }
        if (eventFunctions && eventFunctions instanceof Array) {
            this.eventListeners[eventName].push(eventFunc);
        }
    };
    /**
     * Finds a function in a eventListener's event list, by functon or by function name
     * @param {string} eventName - The name of the event in the eventListeners object
     * @param {function|string} eventFuncOrName - Either the function to remove, or the name of the function to remove
     * @returns {function|undefined} The existing function, or nothing
     */
    Sarus.prototype.findFunction = function (eventName, eventFuncOrName) {
        if (typeof eventFuncOrName === "string") {
            var byName = function (f) { return f.name === eventFuncOrName; };
            return this.eventListeners[eventName].find(byName);
        }
        else {
            if (this.eventListeners[eventName].indexOf(eventFuncOrName) !== -1) {
                return eventFuncOrName;
            }
        }
    };
    /**
     * Raises an error if the existing function is not present, and if the client is configured to throw an error
     * @param {function|undefined} existingFunc
     * @param {object} opts - An optional object to pass that contains extra configuration options
     * @param {boolean} opts.doNotThrowError - A boolean flag that indicates whether to not throw an error if the function to remove is not found in the list
     */
    Sarus.prototype.raiseErrorIfFunctionIsMissing = function (existingFunc, opts) {
        if (!existingFunc) {
            if (!(opts && opts.doNotThrowError)) {
                throw new Error("Function does not exist in eventListener list");
            }
        }
    };
    /**
     * Removes a function from an eventListener events list for that event
     * @param {string} eventName - The name of the event in the eventListeners object
     * @param {function|string} eventFuncOrName - Either the function to remove, or the name of the function to remove
     * @param {object} opts - An optional object to pass that contains extra configuration options
     * @param {boolean} opts.doNotThrowError - A boolean flag that indicates whether to not throw an error if the function to remove is not found in the list
     */
    Sarus.prototype.off = function (eventName, eventFuncOrName, opts) {
        var existingFunc = this.findFunction(eventName, eventFuncOrName);
        if (existingFunc) {
            var index = this.eventListeners[eventName].indexOf(existingFunc);
            this.eventListeners[eventName].splice(index, 1);
        }
        else {
            this.raiseErrorIfFunctionIsMissing(existingFunc, opts);
        }
    };
    /**
     * Puts data on a message queue, and then processes the message queue to get the data sent to the WebSocket server
     * @param {*} data - The data payload to put the on message queue
     */
    Sarus.prototype.send = function (data) {
        var callProcessAfterwards = this.messages.length === 0;
        this.addMessage(data);
        if (callProcessAfterwards)
            this.process();
    };
    /**
     * Sends a message over the WebSocket, removes the message from the queue,
     * and calls proces again if there is another message to process.
     * @param {string | ArrayBuffer | Uint8Array} data - The data payload to send over the WebSocket
     */
    Sarus.prototype.processMessage = function (data) {
        var self = this;
        // If the message is a base64-wrapped object (from legacy or manual insert), decode it
        if (data &&
            typeof data === "object" &&
            data.__sarus_type === "binary" &&
            typeof data.data === "string") {
            // Reuse the deserializer for a single message
            data = require("./lib/dataTransformer").deserialize(JSON.stringify(data));
        }
        self.ws.send(data);
        self.removeMessage();
        if (self.messages.length > 0)
            this.process();
    };
    /**
     * Processes messages that are on the message queue. Handles looping through the list, as well as retrying message
     * dispatch if the WebSocket connection is not open.
     */
    Sarus.prototype.process = function () {
        var messages = this.messages;
        var data = messages[0];
        if (!data && messages.length === 0)
            return;
        if (this.ws && this.ws.readyState === 1) {
            this.processMessage(data);
        }
        else {
            setTimeout(this.process, this.retryProcessTimePeriod);
        }
    };
    /**
     * Attaches the event listeners to the WebSocket instance.
     * Also attaches an additional eventListener on the 'close' event to trigger a reconnection
     * of the WebSocket, unless configured not to.
     */
    Sarus.prototype.attachEventListeners = function () {
        var self = this;
        constants_1.WS_EVENT_NAMES.forEach(function (eventName) {
            self.ws["on".concat(eventName)] = function (e) {
                self.eventListeners[eventName].forEach(function (f) { return f(e); });
                if (eventName === "open") {
                    self.state = { kind: "connected" };
                }
                else if (eventName === "close" && self.reconnectAutomatically) {
                    var state = self.state;
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
                    }
                    else {
                        // If we were in a different state, we assume that our connection
                        // freshly closed and have not made any failed connection attempts.
                        self.state = { kind: "closed" };
                    }
                    self.removeEventListeners();
                    self.reconnect();
                }
            };
        });
    };
    /**
     * Removes the event listeners from a closed WebSocket instance, so that
     * they are cleaned up
     */
    Sarus.prototype.removeEventListeners = function () {
        var self = this;
        constants_1.WS_EVENT_NAMES.forEach(function (eventName) {
            if (self.ws.listeners && self.ws.listeners[eventName]) {
                self.ws.listeners[eventName].forEach(function (iel) {
                    self.ws.removeEventListener(eventName, iel);
                });
            }
        });
    };
    /**
     * Sets the binary type for the WebSocket, if such an option is set
     */
    Sarus.prototype.setBinaryType = function () {
        var binaryType = this.binaryType;
        if (binaryType && this.ws)
            this.ws.binaryType = binaryType;
    };
    return Sarus;
}());
exports.default = Sarus;
