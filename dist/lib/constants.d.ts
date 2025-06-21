import type { EventListenersInterface } from "./validators";
export declare const ALLOWED_PROTOCOLS: Array<string>;
/**
 * A definitive list of events for a WebSocket client to listen on
 * @constant
 * @type {array}
 */
export declare const WS_EVENT_NAMES: readonly ["open", "close", "message", "error"];
export type WsEventName = typeof WS_EVENT_NAMES[number];
/**
 * Persistent data storage types
 * @constant
 * @type {array}
 */
export declare const DATA_STORAGE_TYPES: Array<string>;
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
export declare const DEFAULT_EVENT_LISTENERS_OBJECT: EventListenersInterface;
