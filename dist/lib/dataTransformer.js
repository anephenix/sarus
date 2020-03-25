"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Serializes the data for storing in sessionStorage/localStorage
 * @param {*} data - the data that we want to serialize
 * @returns {string} - the serialized data
 */
exports.serialize = (data) => JSON.stringify(data);
/**
 * Deserializes the data stored in sessionStorage/localStorage
 * @param {string} data - the data that we want to deserialize
 * @returns {*} The deserialized data
 */
exports.deserialize = (data) => {
    if (!data)
        return null;
    return JSON.parse(data);
};
