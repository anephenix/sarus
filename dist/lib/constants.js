"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DATA_STORAGE_TYPES = exports.WS_EVENT_NAMES = void 0;
/**
 * A definitive list of events for a WebSocket client to listen on
 * @constant
 * @type {array}
 */
exports.WS_EVENT_NAMES = [
    "open",
    "close",
    "message",
    "error"
];
/**
 * Persistent data storage types
 * @constant
 * @type {array}
 */
exports.DATA_STORAGE_TYPES = ["session", "local"];
