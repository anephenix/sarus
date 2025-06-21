"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateWebSocketUrl = validateWebSocketUrl;
const constants_js_1 = require("./constants.js");
function validateWebSocketUrl(rawUrl) {
    // Alternatively, we can also check with URL.canParse(), but since we need
    // the URL object anyway to validate the protocol, we go ahead and parse it
    // here.
    const url = new URL(rawUrl);
    // TypeError, as specified by WHATWG URL Standard:
    // https://url.spec.whatwg.org/#url-class (see constructor steps)
    const { protocol } = url;
    if (!constants_js_1.ALLOWED_PROTOCOLS.includes(protocol)) {
        throw new Error(`Expected the WebSocket URL to have protocol 'ws:' or 'wss:', got '${protocol}' instead.`);
    }
    return url;
}
//# sourceMappingURL=utils.js.map