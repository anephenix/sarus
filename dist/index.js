"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
// File Dependencies
var constants_1 = require("./lib/constants");
var dataTransformer_1 = require("./lib/dataTransformer");
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
var validateWebSocketUrl = function (rawUrl) {
    var url;
    try {
        // Alternatively, we can also check with URL.canParse(), but since we need
        // the URL object anyway to validate the protocol, we go ahead and parse it
        // here.
        url = new URL(rawUrl);
    }
    catch (e) {
        // TypeError, as specified by WHATWG URL Standard:
        // https://url.spec.whatwg.org/#url-class (see constructor steps)
        if (!(e instanceof TypeError)) {
            throw e;
        }
        // Untested - our URL mock does not give us an instance of TypeError
        var message = e.message;
        throw new Error("The WebSocket URL is not valid: ".concat(message));
    }
    var protocol = url.protocol;
    if (!constants_1.ALLOWED_PROTOCOLS.includes(protocol)) {
        throw new Error("Expected the WebSocket URL to have protocol 'ws:' or 'wss:', got '".concat(protocol, "' instead."));
    }
    return url;
};
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
 * @param {number} param0.retryConnectionDelay - A parameter for the amount of time to delay a reconnection attempt by, in miliseconds.
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
         * this.reconnect() is called internally when automatic reconnection is
         * enabled, but can also be called by the user
         */
        this.state = "connecting";
        // Extract the properties that are passed to the class
        var url = props.url, binaryType = props.binaryType, protocols = props.protocols, _b = props.eventListeners, eventListeners = _b === void 0 ? constants_1.DEFAULT_EVENT_LISTENERS_OBJECT : _b, reconnectAutomatically = props.reconnectAutomatically, retryProcessTimePeriod = props.retryProcessTimePeriod, // TODO - write a test case to check this
        retryConnectionDelay = props.retryConnectionDelay, _c = props.storageType, storageType = _c === void 0 ? "memory" : _c, _d = props.storageKey, storageKey = _d === void 0 ? "sarus" : _d;
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
        var defaultEventListeners = {
            open: [],
            message: [],
            error: [],
            close: [],
        };
        var mergedEventListeners = __assign(__assign({}, defaultEventListeners), eventListeners); // Type assertion added here
        return mergedEventListeners;
    };
    /**
     * Connects the WebSocket client, and attaches event listeners
     */
    Sarus.prototype.connect = function () {
        this.state = "connecting";
        this.ws = new WebSocket(this.url, this.protocols);
        this.setBinaryType();
        this.attachEventListeners();
        if (this.messages.length > 0)
            this.process();
    };
    /**
     * Reconnects the WebSocket client based on the retryConnectionDelay setting.
     */
    Sarus.prototype.reconnect = function () {
        var self = this;
        var retryConnectionDelay = self.retryConnectionDelay;
        setTimeout(self.connect, retryConnectionDelay);
    };
    /**
     * Disconnects the WebSocket client from the server, and changes the
     * reconnectAutomatically flag to disable automatic reconnection, unless the
     * developer passes a boolean flag to not do that.
     * @param {boolean} overrideDisableReconnect
     */
    Sarus.prototype.disconnect = function (overrideDisableReconnect) {
        this.state = "disconnected";
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
     * @param {unknown} data - The data payload to send over the WebSocket
     */
    Sarus.prototype.processMessage = function (data) {
        var self = this;
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
                    self.state = "connected";
                }
                else if (eventName === "close" && self.reconnectAutomatically) {
                    self.state = "closed";
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
