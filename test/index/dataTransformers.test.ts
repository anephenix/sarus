// File Dependencies
import {
  serialize,
  deserialize,
  serializeSingle,
  deserializeSingle,
} from "../../src/lib/dataTransformer";

describe("#serialize", () => {
  describe("when passed a javascript variable", () => {
    it("should serialize the javascript variable into a JSON string", () => {
      const payload: object = { name: "Paul Jensen" };
      const serializedPayload: string = serialize(payload);
      expect(serializedPayload).toEqual(JSON.stringify(payload));
    });
  });

  describe("when passed an ArrayBuffer", () => {
    it("should serialize the ArrayBuffer into a base64-encoded string", () => {
      const buffer: ArrayBuffer = new ArrayBuffer(8);
      const serializedBuffer: string = serialize(buffer);
      expect(serializedBuffer).toEqual(
        JSON.stringify({
          __sarus_type: "binary",
          format: "arraybuffer",
          data: btoa(String.fromCharCode(...new Uint8Array(buffer))),
        }),
      );
    });
  });

  describe("when passed a Uint8Array", () => {
    it("should serialize the Uint8Array into a base64-encoded string", () => {
      const uint8Array: Uint8Array = new Uint8Array([1, 2, 3, 4, 5]);
      const serializedUint8Array: string = serialize(uint8Array);
      expect(serializedUint8Array).toEqual(
        JSON.stringify({
          __sarus_type: "binary",
          format: "uint8array",
          data: btoa(String.fromCharCode(...uint8Array)),
        }),
      );
    });
  });

  describe("when passed a Blob", () => {
    it("should throw an error", () => {
      const blob: Blob = new Blob(["Hello, world!"], { type: "text/plain" });
      expect(() => serialize(blob)).toThrow(
        "Blob serialization is not supported synchronously. Convert Blob to ArrayBuffer or Uint8Array before sending.",
      );
    });
  });

  describe("when passed null", () => {
    it("should return null", () => {
      expect(serialize(null)).toEqual("null");
    });
  });

  describe("when passed an array", () => {
    it("should serialize each element in the array", () => {
      const payload: Array<object> = [
        { name: "Paul Jensen" },
        { name: "Jane Doe" },
      ];
      const serializedPayload: string = serialize(payload);
      expect(serializedPayload).toEqual(
        JSON.stringify([{ name: "Paul Jensen" }, { name: "Jane Doe" }]),
      );
    });
  });

  describe("when passed a number", () => {
    it("should return the number as a string", () => {
      const payload: number = 42;
      const serializedPayload: string = serialize(payload);
      expect(serializedPayload).toEqual(JSON.stringify(payload));
    });
  });

  describe("when passed a boolean", () => {
    it("should return the boolean as a string", () => {
      const payload: boolean = true;
      const serializedPayload: string = serialize(payload);
      expect(serializedPayload).toEqual(JSON.stringify(payload));
    });
  });
});

describe("#deserialize", () => {
  describe("when passed a JSON-stringified piece of data", () => {
    it("should return the deserialized data", () => {
      const payload: object = { name: "Paul Jensen" };
      const serialisedPayload: string = serialize(payload);
      expect(deserialize(serialisedPayload)).toEqual(payload);
    });
  });
  describe("when passed null", () => {
    it("should return null", () => {
      expect(deserialize(null)).toEqual(null);
    });
  });

  describe("when passed a base64-encoded ArrayBuffer", () => {
    it("should return the ArrayBuffer", () => {
      const buffer: ArrayBuffer = new ArrayBuffer(8);
      const serializedBuffer: string = serialize(buffer);
      expect(deserialize(serializedBuffer)).toEqual(buffer);
    });
  });

  describe("when passed a base64-encoded Uint8Array", () => {
    it("should return the Uint8Array", () => {
      const uint8Array: Uint8Array = new Uint8Array([1, 2, 3, 4, 5]);
      const serializedUint8Array: string = serialize(uint8Array);
      expect(deserialize(serializedUint8Array)).toEqual(uint8Array);
    });
  });

  describe("#serializeSingle", () => {
    describe("when passed an ArrayBuffer", () => {
      it("should return an object with __sarus_type, format, and data properties", () => {
        const buffer: ArrayBuffer = new ArrayBuffer(8);
        const result = serializeSingle(buffer);
        expect(result).toEqual({
          __sarus_type: "binary",
          format: "arraybuffer",
          data: btoa(String.fromCharCode(...new Uint8Array(buffer))),
        });
      });
    });

    describe("when passed a Uint8Array", () => {
      it("should return an object with __sarus_type, format, and data properties", () => {
        const uint8Array: Uint8Array = new Uint8Array([1, 2, 3, 4, 5]);
        const result = serializeSingle(uint8Array);
        expect(result).toEqual({
          __sarus_type: "binary",
          format: "uint8array",
          data: btoa(String.fromCharCode(...uint8Array)),
        });
      });
    });
  });

  describe("#deserializeSingle", () => {
    describe("when passed a serialized ArrayBuffer", () => {
      it("should return the ArrayBuffer", () => {
        const buffer: ArrayBuffer = new ArrayBuffer(8);
        const serializedBuffer = serializeSingle(buffer);
        expect(deserializeSingle(serializedBuffer)).toEqual(buffer);
      });
    });

    describe("when passed a serialized Uint8Array", () => {
      it("should return the Uint8Array", () => {
        const uint8Array: Uint8Array = new Uint8Array([1, 2, 3, 4, 5]);
        const serializedUint8Array = serializeSingle(uint8Array);
        expect(deserializeSingle(serializedUint8Array)).toEqual(uint8Array);
      });
    });
  });
});
