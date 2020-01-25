// File Dependencies
import { WS_EVENT_NAMES } from "./constants";

// Interfaces
// Question - can interfaces be embedded as types within other interfaces?
export interface EventListenersInterface {
  open: Array<Function>;
  message: Array<Function>;
  error: Array<Function>;
  close: Array<Function>;
  [key: string]: Array<Function>;
}

/**
 * Validates the retryProcessTimePeriod parameter
 * @param {number} retryProcessTimePeriod - How long the time period between retrying to send a messgae to a WebSocket server should be
 * @returns {number} The number in miliseconds for the retryProcessTimePeriod
 */
export const validateRetryProcessTimePeriod = (
  retryProcessTimePeriod: number
) => {
  if (!retryProcessTimePeriod) return null;
  return retryProcessTimePeriod;
};

/**
 * Validates that the event passed in is a valid eventListener event
 * @param {string} event - the event name
 */
export const validateEvent = (event: string) => {
  if (WS_EVENT_NAMES.indexOf(event) === -1) {
    throw new Error(`${event} is not a valid eventListener event`);
  }
};

/**
 * Loops through a list of events in the eventListeners object to validate them
 * @param {object} eventListeners
 */
export const validateEvents = (eventListeners: object) => {
  const eventList = Object.keys(eventListeners);
  eventList.forEach(validateEvent);
};

/**
 * Makes sure that any eventListeners object which might miss an event will have them prefilled in
 * @param {object} eventListeners - The eventListeners object parameter
 * @returns {object} The eventListeners object parameter, with any missing events prefilled in
 */
export const prefillMissingEvents = (
  eventListeners: EventListenersInterface = {
    open: [],
    close: [],
    error: [],
    message: []
  }
) => {
  WS_EVENT_NAMES.forEach((eventName: string) => {
    if (!eventListeners[eventName]) eventListeners[eventName] = [];
  });
  return eventListeners;
};
