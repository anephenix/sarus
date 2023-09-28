// Dependencies
import { EventListenersInterface } from "./validators";

/**
 * A definitive list of events for a WebSocket client to listen on
 * @constant
 * @type {array}
 */
export const WS_EVENT_NAMES: Array<string> = [
  "open",
  "close",
  "message",
  "error",
];

/**
 * Persistent data storage types
 * @constant
 * @type {array}
 */
export const DATA_STORAGE_TYPES: Array<string> = ["session", "local"];

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
export const DEFAULT_EVENT_LISTENERS_OBJECT: EventListenersInterface = {
  open: [],
  message: [],
  error: [],
  close: [],
};
