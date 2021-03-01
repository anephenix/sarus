"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deserialize = exports.serialize = void 0;
/**
 * Serializes the data for storing in sessionStorage/localStorage
 * @param {*} data - the data that we want to serialize
 * @returns {string} - the serialized data
 */
var serialize = function (data) { return JSON.stringify(data); };
exports.serialize = serialize;
/**
 * Deserializes the data stored in sessionStorage/localStorage
 * @param {string} data - the data that we want to deserialize
 * @returns {*} The deserialized data
 */
var deserialize = function (data) {
    if (!data)
        return null;
    return JSON.parse(data);
};
exports.deserialize = deserialize;
