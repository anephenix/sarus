import type { PartialEventListenersInterface, EventListenersInterface } from "./lib/validators.js";
import type { GenericFunction } from "./lib/types.js";
import type { LocalStorage } from "node-localstorage";
export interface ExponentialBackoffParams {
    backoffRate: number;
    backoffLimit: number;
}
export declare function calculateRetryDelayFactor(params: ExponentialBackoffParams, initialDelay: number, failedConnectionAttempts: number): number;
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
    messageStore: LocalStorage | unknown[];
    ws: WebSocket;
    state: {
        kind: "connecting";
        failedConnectionAttempts: number;
    } | {
        kind: "connected";
    } | {
        kind: "disconnected";
    } | {
        kind: "closed";
    };
    constructor(props: SarusClassParams);
    /**
     * Fetches the messages from the message queue
     * @returns {array} the messages in the message queue, as an array
     */
    get messages(): unknown[];
    /**
     * Sets the messages to store in the message queue
     * @param {*} data - the data payload to set for the messages in the message queue
     * @returns {void} - set does not return
     */
    set messages(data: unknown[]);
    /**
     * Adds a message to the messages in the message queue that are kept in persistent storage
     * @param {*} data - the message
     * @returns {array} the messages in the message queue
     */
    addMessageToStore(data: unknown): unknown[] | null;
    /**
     * Adds a messge to the message queue
     * @param {*} data - the data payload to put on the message queue
     */
    addMessage(data: unknown): void;
    /**
     * Removes a message from the message queue that is in persistent storage
     * @param {*} messages - the messages in the message queue
     */
    removeMessageFromStore(messages: unknown[]): void;
    /**
     * Removes a message from the message queue
     */
    removeMessage(): unknown;
    /**
     * Audits the eventListeners object parameter with validations, and a prefillMissingEvents step
     * This ensures that the eventListeners object is the right format for binding events to WebSocket clients
     * @param {object} eventListeners - The eventListeners object parameter
     * @returns {object} The eventListeners object parameter, with any missing events prefilled in
     */
    auditEventListeners(eventListeners: PartialEventListenersInterface | undefined): {
        open: GenericFunction[];
        message: GenericFunction[];
        error: GenericFunction[];
        close: GenericFunction[];
    };
    /**
     * Connects the WebSocket client, and attaches event listeners
     */
    connect(): void;
    /**
     * Reconnects the WebSocket client based on the retryConnectionDelay and
     * ExponentialBackoffParam setting.
     */
    reconnect(): void;
    /**
     * Disconnects the WebSocket client from the server, and changes the
     * reconnectAutomatically flag to disable automatic reconnection, unless the
     * developer passes a boolean flag to not do that.
     * @param {boolean} overrideDisableReconnect
     */
    disconnect(overrideDisableReconnect?: boolean): void;
    /**
     * Adds a function to trigger on the occurrence of an event with the specified event name
     * @param {string} eventName - The name of the event in the eventListeners object
     * @param {function} eventFunc - The function to trigger when the event occurs
     */
    on(eventName: string, eventFunc: GenericFunction): void;
    /**
     * Finds a function in a eventListener's event list, by functon or by function name
     * @param {string} eventName - The name of the event in the eventListeners object
     * @param {function|string} eventFuncOrName - Either the function to remove, or the name of the function to remove
     * @returns {function|undefined} The existing function, or nothing
     */
    findFunction(eventName: string, eventFuncOrName: string | GenericFunction): GenericFunction | undefined;
    /**
     * Raises an error if the existing function is not present, and if the client is configured to throw an error
     * @param {function|undefined} existingFunc
     * @param {object} opts - An optional object to pass that contains extra configuration options
     * @param {boolean} opts.doNotThrowError - A boolean flag that indicates whether to not throw an error if the function to remove is not found in the list
     */
    raiseErrorIfFunctionIsMissing(existingFunc: GenericFunction | undefined, opts?: {
        doNotThrowError: boolean;
    } | undefined): void;
    /**
     * Removes a function from an eventListener events list for that event
     * @param {string} eventName - The name of the event in the eventListeners object
     * @param {function|string} eventFuncOrName - Either the function to remove, or the name of the function to remove
     * @param {object} opts - An optional object to pass that contains extra configuration options
     * @param {boolean} opts.doNotThrowError - A boolean flag that indicates whether to not throw an error if the function to remove is not found in the list
     */
    off(eventName: string, eventFuncOrName: GenericFunction | string, opts?: {
        doNotThrowError: boolean;
    } | undefined): void;
    /**
     * Puts data on a message queue, and then processes the message queue to get the data sent to the WebSocket server
     * @param {*} data - The data payload to put the on message queue
     */
    send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
    /**
     * Sends a message over the WebSocket, removes the message from the queue,
     * and calls proces again if there is another message to process.
     * @param {string | ArrayBuffer | Uint8Array} data - The data payload to send over the WebSocket
     */
    processMessage(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
    /**
     * Processes messages that are on the message queue. Handles looping through the list, as well as retrying message
     * dispatch if the WebSocket connection is not open.
     */
    process(): void;
    /**
     * Attaches the event listeners to the WebSocket instance.
     * Also attaches an additional eventListener on the 'close' event to trigger a reconnection
     * of the WebSocket, unless configured not to.
     */
    attachEventListeners(): void;
    /**
     * Removes the event listeners from a closed WebSocket instance, so that
     * they are cleaned up
     */
    removeEventListeners(): void;
    /**
     * Sets the binary type for the WebSocket, if such an option is set
     */
    setBinaryType(): void;
}
