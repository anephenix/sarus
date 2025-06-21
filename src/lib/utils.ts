import { ALLOWED_PROTOCOLS } from "./constants.js";

function validateWebSocketUrl(rawUrl: string) {
  // Alternatively, we can also check with URL.canParse(), but since we need
  // the URL object anyway to validate the protocol, we go ahead and parse it
  // here.
  const url: URL = new URL(rawUrl);
  // TypeError, as specified by WHATWG URL Standard:
  // https://url.spec.whatwg.org/#url-class (see constructor steps)
  const { protocol } = url;
  if (!ALLOWED_PROTOCOLS.includes(protocol)) {
    throw new Error(
      `Expected the WebSocket URL to have protocol 'ws:' or 'wss:', got '${protocol}' instead.`,
    );
  }
  return url;
}

export { validateWebSocketUrl };
