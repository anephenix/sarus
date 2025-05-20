export declare const serialize: (data: unknown) => string;
/**
 * Deserializes the data stored in sessionStorage/localStorage
 * @param {string} data - the data that we want to deserialize
 * @returns {*} The deserialized data
 */
export declare const deserialize: (data: string | null) => any;
