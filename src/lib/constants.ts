/**
 * A definitive list of events for a WebSocket client to listen on
 * @constant
 * @type {array}
 */
export const WS_EVENT_NAMES: Array<string> = [
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
export const DATA_STORAGE_TYPES: Array<string> = ["session", "local"];
