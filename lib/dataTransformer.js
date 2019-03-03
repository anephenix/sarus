/**
 * Serializes the data for storing in sessionStorage/localStorage
 * @param {*} data - the data that we want to serialize
 * @returns {string} - the serialized data
 */
const serialize = data => JSON.stringify(data);

/**
 * Deserializes the data stored in sessionStorage/localStorage
 * @param {string} data - the data that we want to deserialize
 * @returns {*} The deserialized data
 */
const deserialize = data => JSON.parse(data);

module.exports = { serialize, deserialize };
