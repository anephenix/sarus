import { validateWebSocketUrl } from "../../src/lib/utils";

describe("validateWebsocketUrl", () => {
  describe("when the url is valid", () => {
    it("should return the URL object", () => {
      const url = "ws://example.com";
      expect(validateWebSocketUrl(url)).toEqual(new URL(url));
    });
  });

  describe("when the url is invalid", () => {
    it("should throw an error", () => {
      const scenarios = [
        { url: "invalid-url", message: "Invalid URL: invalid-url" },
        {
          url: "http://websocket.com",
          message:
            "Expected the WebSocket URL to have protocol 'ws:' or 'wss:', got 'http:' instead.",
        },
      ];

      scenarios.forEach(({ url, message }) => {
        expect(() => validateWebSocketUrl(url)).toThrow(message);
      });
    });
  });
});
