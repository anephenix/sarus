// File Dependencies
import { WS_EVENT_NAMES } from "./constants";

// Interfaces
// Question - can interfaces be embedded as types within other interfaces?
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
export const validateRetryProcessTimePeriod = (
  retryProcessTimePeriod: number
) => {
  if (!retryProcessTimePeriod) return null;
  if (typeof retryProcessTimePeriod !== "number") {
    throw new Error("retryProcessTimePeriod must be a number");
  }
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
export const validateEvents = (eventListeners: EventListenersInterface) => {
  const eventList = Object.keys(eventListeners);
  eventList.forEach(validateEvent);
};

/**
 * Validates the data structure of the eventListeners object to make sure that it is correct
 * @param {object} eventListeners - The eventListeners object parameter
 */
export const validateEventFunctionLists = (
  eventListeners: EventListenersInterface
) => {
  for (let eventName in eventListeners) {
    if (!(eventListeners[eventName] instanceof Array)) {
      throw new Error(
        `The ${eventName} event listener must be an array of functions`
      );
    }
  }
};

/**
 * Makes sure that any eventListeners object which might miss an event will have them prefilled in
 * @param {object} eventListeners - The eventListeners object parameter
 * @returns {object} The eventListeners object parameter, with any missing events prefilled in
 */
export const prefillMissingEvents = (
  eventListeners: EventListenersInterface
) => {
  WS_EVENT_NAMES.forEach((eventName: string) => {
    if (!eventListeners[eventName]) eventListeners[eventName] = [];
  });
  return eventListeners;
};