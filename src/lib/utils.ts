import { ALLOWED_PROTOCOLS } from "./constants";

function validateWebSocketUrl(rawUrl: string) {
  let url: URL;
  try {
    // Alternatively, we can also check with URL.canParse(), but since we need
    // the URL object anyway to validate the protocol, we go ahead and parse it
    // here.
    url = new URL(rawUrl);
  } catch (e) {
    // TypeError, as specified by WHATWG URL Standard:
    // https://url.spec.whatwg.org/#url-class (see constructor steps)
    throw e;
  }
  const { protocol } = url;
  if (!ALLOWED_PROTOCOLS.includes(protocol)) {
    throw new Error(
      `Expected the WebSocket URL to have protocol 'ws:' or 'wss:', got '${protocol}' instead.`,
    );
  }
  return url;
}

export { validateWebSocketUrl };
