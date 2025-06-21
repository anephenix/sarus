"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deserialize = exports.serialize = void 0;
exports.serializeSingle = serializeSingle;
exports.deserializeSingle = deserializeSingle;
/**
 * Serializes the data for storing in sessionStorage/localStorage
 * @param {*} data - the data that we want to serialize
 * @returns {string} - the serialized data
 */
// Helper: ArrayBuffer/Uint8Array to base64
function bufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
// Helper: base64 to ArrayBuffer
function base64ToBuffer(base64) {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}
// Helper: Blob to base64 (async, but we use ArrayBuffer for storage)
const serialize = (data) => {
    // If it's an array, serialize each element
    if (Array.isArray(data)) {
        return JSON.stringify(data.map(serializeSingle));
    }
    return JSON.stringify(serializeSingle(data));
};
exports.serialize = serialize;
function serializeSingle(data) {
    if (data instanceof ArrayBuffer) {
        return {
            __sarus_type: "binary",
            format: "arraybuffer",
            data: bufferToBase64(data),
        };
    }
    if (data instanceof Uint8Array) {
        return {
            __sarus_type: "binary",
            format: "uint8array",
            data: bufferToBase64(data.buffer),
        };
    }
    if (typeof Blob !== "undefined" && data instanceof Blob) {
        throw new Error("Blob serialization is not supported synchronously. Convert Blob to ArrayBuffer or Uint8Array before sending.");
    }
    return data;
}
/**
 * Deserializes the data stored in sessionStorage/localStorage
 * @param {string} data - the data that we want to deserialize
 * @returns {*} The deserialized data
 */
const deserialize = (data) => {
    if (!data)
        return null;
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
        return parsed.map(deserializeSingle);
    }
    return deserializeSingle(parsed);
};
exports.deserialize = deserialize;
function deserializeSingle(parsed) {
    if (typeof parsed === "object" &&
        parsed !== null &&
        parsed.__sarus_type === "binary") {
        const { format, data } = parsed;
        const buffer = base64ToBuffer(data);
        if (format === "arraybuffer")
            return buffer;
        if (format === "uint8array")
            return new Uint8Array(buffer);
    }
    return parsed;
}
//# sourceMappingURL=dataTransformer.js.map