export declare const serialize: (data: string | object | number | ArrayBuffer | Uint8Array | null | boolean) => string;
export declare function serializeSingle(data: string | object | number | ArrayBuffer | Uint8Array | null | boolean): object | string | number | boolean | null;
/**
 * Deserializes the data stored in sessionStorage/localStorage
 * @param {string} data - the data that we want to deserialize
 * @returns {*} The deserialized data
 */
export declare const deserialize: (data: string | null) => any;
export declare function deserializeSingle(parsed: any): any;
