export interface EventListenersInterface {
    open?: Array<Function>;
    message?: Array<Function>;
    error?: Array<Function>;
    close?: Array<Function>;
    [key: string]: Array<Function>;
}
/**
 * Validates the retryProcessTimePeriod parameter
 * @param {number} retryProcessTimePeriod - How long the time period between retrying to send a messgae to a WebSocket server should be
 * @returns {number} The number in miliseconds for the retryProcessTimePeriod
 */
export declare const validateRetryProcessTimePeriod: (retryProcessTimePeriod: number) => number;
/**
 * Validates that the event passed in is a valid eventListener event
 * @param {string} event - the event name
 */
export declare const validateEvent: (event: string) => void;
/**
 * Loops through a list of events in the eventListeners object to validate them
 * @param {object} eventListeners
 */
export declare const validateEvents: (eventListeners: EventListenersInterface) => void;
/**
 * Validates the data structure of the eventListeners object to make sure that it is correct
 * @param {object} eventListeners - The eventListeners object parameter
 */
export declare const validateEventFunctionLists: (eventListeners: EventListenersInterface) => void;
/**
 * Makes sure that any eventListeners object which might miss an event will have them prefilled in
 * @param {object} eventListeners - The eventListeners object parameter
 * @returns {object} The eventListeners object parameter, with any missing events prefilled in
 */
export declare const prefillMissingEvents: (eventListeners: EventListenersInterface) => EventListenersInterface;
