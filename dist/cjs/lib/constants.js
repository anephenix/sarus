"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_EVENT_LISTENERS_OBJECT = exports.DATA_STORAGE_TYPES = exports.WS_EVENT_NAMES = exports.ALLOWED_PROTOCOLS = void 0;
exports.ALLOWED_PROTOCOLS = ["ws:", "wss:"];
/**
 * A definitive list of events for a WebSocket client to listen on
 * @constant
 * @type {array}
 */
exports.WS_EVENT_NAMES = ["open", "close", "message", "error"];
/**
 * Persistent data storage types
 * @constant
 * @type {array}
 */
exports.DATA_STORAGE_TYPES = ["session", "local"];
/**
 * Default event listeners object in case none is passed to the class
 * @constant
 * @type {object}
 * @property {array} open - An array of functions to be called when the WebSocket opens
 * @property {array} message - An array of functions to be called when the WebSocket receives a message
 * @property {array} error - An array of functions to be called when the WebSocket encounters an error
 * @property {array} close - An array of functions to be called when the WebSocket closes
 * @property {array} [key] - An array of functions to be called when the WebSocket emits an event with the name of the key
 */
exports.DEFAULT_EVENT_LISTENERS_OBJECT = {
    open: [],
    message: [],
    error: [],
    close: [],
};
//# sourceMappingURL=constants.js.map