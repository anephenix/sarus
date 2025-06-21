export declare const serialize: (data: string | object | number | ArrayBuffer | Uint8Array | null | boolean) => string;
export declare function serializeSingle(data: string | object | number | ArrayBuffer | Uint8Array | null | boolean): object | string | number | boolean | null;
/**
 * Deserializes the data stored in sessionStorage/localStorage
 * @param {string} data - the data that we want to deserialize
 * @returns {*} The deserialized data
 */
export declare const deserialize: (data: string | null) => unknown[] | unknown | null;
export type Base64EncodedData = {
    __sarus_type: "binary";
    format: "arraybuffer" | "uint8array";
    data: string;
};
type DeserializeSingleParms = string | object | number | Base64EncodedData | null | boolean;
type DeserializeSingleReturn = string | object | number | ArrayBuffer | Uint8Array | null | boolean;
export declare function deserializeSingle(parsed: DeserializeSingleParms): DeserializeSingleReturn;
export {};
