/**
 * Serializes the data for storing in sessionStorage/localStorage
 * @param {*} data - the data that we want to serialize
 * @returns {string} - the serialized data
 */
// Helper: ArrayBuffer/Uint8Array to base64
function bufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper: base64 to ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Helper: Blob to base64 (async, but we use ArrayBuffer for storage)

export const serialize = (
  data: string | object | number | ArrayBuffer | Uint8Array | null | boolean,
) => {
  // If it's an array, serialize each element
  if (Array.isArray(data)) {
    return JSON.stringify(data.map(serializeSingle));
  }
  return JSON.stringify(serializeSingle(data));
};

export function serializeSingle(
  data: string | object | number | ArrayBuffer | Uint8Array | null | boolean,
): object | string | number | boolean | null {
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
      data: bufferToBase64(data.buffer as ArrayBuffer),
    };
  }
  if (typeof Blob !== "undefined" && data instanceof Blob) {
    throw new Error(
      "Blob serialization is not supported synchronously. Convert Blob to ArrayBuffer or Uint8Array before sending.",
    );
  }
  return data;
}

/**
 * Deserializes the data stored in sessionStorage/localStorage
 * @param {string} data - the data that we want to deserialize
 * @returns {*} The deserialized data
 */
export const deserialize = (
  data: string | null,
): unknown[] | unknown | null => {
  if (!data) return null;
  const parsed = JSON.parse(data);
  if (Array.isArray(parsed)) {
    return parsed.map(deserializeSingle);
  }
  return deserializeSingle(parsed);
};

export type Base64EncodedData = {
  __sarus_type: "binary";
  format: "arraybuffer" | "uint8array";
  data: string;
};

type DeserializeSingleParms =
  | string
  | object
  | number
  | Base64EncodedData
  | null
  | boolean;
type DeserializeSingleReturn =
  | string
  | object
  | number
  | ArrayBuffer
  | Uint8Array
  | null
  | boolean;

export function deserializeSingle(
  parsed: DeserializeSingleParms,
): DeserializeSingleReturn {
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    (parsed as Base64EncodedData).__sarus_type === "binary"
  ) {
    const { format, data } = parsed as Base64EncodedData;

    const buffer = base64ToBuffer(data);
    if (format === "arraybuffer") return buffer;
    if (format === "uint8array") return new Uint8Array(buffer);
  }
  return parsed;
}
