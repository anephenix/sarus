"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateWebSocketUrl = validateWebSocketUrl;
var constants_1 = require("./constants");
function validateWebSocketUrl(rawUrl) {
    var url;
    try {
        // Alternatively, we can also check with URL.canParse(), but since we need
        // the URL object anyway to validate the protocol, we go ahead and parse it
        // here.
        url = new URL(rawUrl);
    }
    catch (e) {
        // TypeError, as specified by WHATWG URL Standard:
        // https://url.spec.whatwg.org/#url-class (see constructor steps)
        throw e;
    }
    var protocol = url.protocol;
    if (!constants_1.ALLOWED_PROTOCOLS.includes(protocol)) {
        throw new Error("Expected the WebSocket URL to have protocol 'ws:' or 'wss:', got '".concat(protocol, "' instead."));
    }
    return url;
}
;
