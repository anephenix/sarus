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

module.exports = { WS_EVENT_NAMES, DATA_STORAGE_TYPES };
