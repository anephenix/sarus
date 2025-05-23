# TODO

- [x] Support `reconnectAutomatically` option in `Sarus` initialization
- [x] Pass eventListeners into `Sarus` at initialization
- [x] Find a way to test the onopen event in the tests
- [x] Make sure that the right event listeners are provided at initialization
- [x] Add an event listener after initialization
- [x] Prevent the same function being added multiple times to an event listener
- [x] Remove an event listener function by passing the function
- [x] Remove an event listener function by passing the name
- [x] Throw an error when removing an event listener does not find it
- [x] Support `doNotThrowError: true` when removing an event listener
- [x] Test sending a WebSocket message
- [x] Make sure that adding/removing event listeners after initialization is bound on WebSocket as well
- [x] Implement message queue with in-memory as default
- [x] Make sure test assertion guarantees order of messages being extracted from queue
- [x] Make retryProcessTimePeriod configurable
- [x] Implement message queue with session storage as an option
- [x] Implement message queue with local storage as an option
- [x] Make the storageKey configurable
- [x] Test loading messages stored in sessionStorage
- [x] Test loading messages stored in localStorage
- [x] Implement a way to configure WebSocket client options
- [x] Work out what to do when the message storage limit is reached (technically the browser will throw a QUOTA_EXCEEDED_ERR)
- [x] Work out how to support sending binary data instead of string data
- [x] Think about how to support higher-level use cases of WebSockets (rpc, pubsub) via a plugin architecture.
- [x] TypeScript definitions

## This is a feature for Hub rather than for Sarus

- [ ] Implement a way to retrieve messages from a server, based on a key indicator
